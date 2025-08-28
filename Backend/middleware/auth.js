import jwt from "jsonwebtoken";
import { sequelize } from "../models/index.js";
import { ApiError } from "../util/ApiError.js";
import { asyncHandler } from "../util/asyncHandler.js";
import dotenv from "dotenv";
dotenv.config();
if (!process.env.JWT_SECRET_KEY) {
  throw new Error("JWT_SECRET_KEY environment variable not set");
}

export const auth = asyncHandler(async (req, _, next) => {
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return next(new ApiError(401, "Unauthorized: No token provided"));
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(new ApiError(401, "Access token expired"));
    } else if (error.name === "JsonWebTokenError") {
      return next(new ApiError(401, "Invalid token signature"));
    } else {
      return next(new ApiError(401, error.message || "Invalid access token"));
    }
  }

  const auth_token = await sequelize.models.auth_token.findOne({
    where: { token },
    include: [
      {
        as: "user",
        model: sequelize.models.user,
        attributes: { exclude: ["password"] },
      },
    ],
  });

  if (!auth_token || !auth_token.user) {
    return next(new ApiError(401, "Invalid token or user not found"));
  }

  req.user = auth_token.user;
  req.token = token;
  next();
});
