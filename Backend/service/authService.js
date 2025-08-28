import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import moment from "moment";
import { sequelize } from "../models/index.js";
import { ApiError } from "../util/ApiError.js";
import dotenv from "dotenv";
dotenv.config();
const sanitizeUser = (user) => {
  const { password, ...cleanUser } = user.get({ plain: true });
  return cleanUser;
};

export const registerUser = async ({ name, email, password }) => {
  const existingUser = await sequelize.models.user.findOne({
    where: { email },
  });

  if (existingUser) {
    throw new ApiError(400, "Email already in use");
  }

  const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync(10));

  const newUser = await sequelize.models.user.create({
    name,
    email,
    password: hashedPassword,
  });

  const token = jwt.sign({ id: newUser.id }, process.env.JWT_SECRET_KEY, {
    expiresIn: "40d",
  });

  await sequelize.models.auth_token.create({
    userId: newUser.id,
    token,
  });

  return { user: sanitizeUser(newUser), token };
};

export const loginUser = async ({ email, password, attempt }) => {
  const user = await sequelize.models.user.findOne({ where: { email } });

  if (!user) {
    throw new ApiError(400, "Invalid credentials");
  }

  if (attempt > 5) {
    await sequelize.models.user.update(
      {
        status: "block",
        blockUntil: moment().add(24, "hours").toDate(),
      },
      { where: { email } }
    );
    throw new ApiError(403, "You are blocked for 24 hours. Try again later.");
  }

  if (user.status === "block") {
    throw new ApiError(403, "You are currently blocked");
  }

  const isMatch = bcrypt.compareSync(password, user.password);
  if (!isMatch) {
    throw new ApiError(400, "Invalid credentials");
  }

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET_KEY, {
    expiresIn: "40d",
  });

  await sequelize.models.auth_token.create({
    userId: user.id,
    token,
  });

  return { token, user: sanitizeUser(user) };
};

export const logoutUser = async (token) => {
  await sequelize.models.auth_token.destroy({ where: { token } });
};
