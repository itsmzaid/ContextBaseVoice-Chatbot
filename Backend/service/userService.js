import { sequelize } from "../models/index.js";
import { ApiError } from "../util/ApiError.js";

export const createUser = async (userData) => {
  const { name, email } = userData;

  // Check if user already exists
  const existingUser = await sequelize.models.User.findOne({
    where: { email },
  });

  if (existingUser) {
    throw new ApiError(400, "User with this email already exists");
  }

  // Create new user
  const user = await sequelize.models.User.create({
    name,
    email,
  });

  return user;
};

export const getUserById = async (userId) => {
  const user = await sequelize.models.User.findByPk(userId, {
    include: [
      {
        model: sequelize.models.Agent,
        as: "agents",
        include: [
          {
            model: sequelize.models.Document,
            as: "documents",
          },
        ],
      },
    ],
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return user;
};

export const getAllUsers = async () => {
  const users = await sequelize.models.User.findAll({
    include: [
      {
        model: sequelize.models.Agent,
        as: "agents",
      },
    ],
  });

  return users;
};
