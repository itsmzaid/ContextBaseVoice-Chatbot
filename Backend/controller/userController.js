import Joi from "joi";
import {
  createUser,
  getUserById,
  getAllUsers,
} from "../service/userService.js";
import { ApiResponse } from "../util/ApiResponse.js";
import { ApiError } from "../util/ApiError.js";
import { asyncHandler } from "../util/asyncHandler.js";
import validator from "../util/validator.js";

export const createUserHandler = asyncHandler(async (req, res) => {
  const userSchema = Joi.object({
    name: Joi.string().required().max(100),
    email: Joi.string().email().required().max(100),
  });

  const error = await validator(userSchema, req.body);
  if (error) {
    throw new ApiError(400, error);
  }

  const user = await createUser(req.body);
  return res
    .status(201)
    .json(new ApiResponse(200, user, "User created successfully"));
});

export const getUserByIdHandler = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await getUserById(userId);
  return res
    .status(200)
    .json(new ApiResponse(200, user, "User fetched successfully"));
});

export const getAllUsersHandler = asyncHandler(async (req, res) => {
  const users = await getAllUsers();
  return res
    .status(200)
    .json(new ApiResponse(200, users, "Users fetched successfully"));
});
