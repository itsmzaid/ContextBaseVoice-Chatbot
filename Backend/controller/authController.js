import Joi from "joi";
import { ApiResponse } from "../util/ApiResponse.js";
import { ApiError } from "../util/ApiError.js";
import { asyncHandler } from "../util/asyncHandler.js";
import { registerUser, loginUser, logoutUser } from "../service/authService.js";
import validator from "../util/validator.js";

export const register = asyncHandler(async (req, res) => {
  const registerSchema = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    confirmPassword: Joi.valid(Joi.ref("password")).required().messages({
      "any.only": "Passwords do not match",
    }),
  });

  const error = await validator(registerSchema, req.body);
  if (error) {
    throw new ApiError(400, error);
  }

  const result = await registerUser(req.body);
  return res
    .status(201)
    .json(new ApiResponse(200, result, "User registered successfully"));
});

export const login = asyncHandler(async (req, res) => {
  const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    attempt: Joi.number().default(0),
  });

  const error = await validator(loginSchema, req.body);
  if (error) {
    throw new ApiError(400, error);
  }

  const result = await loginUser(req.body);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "User logged in successfully"));
});

export const logout = asyncHandler(async (req, res) => {
  await logoutUser(req.token);
  return res
    .status(200)
    .json(new ApiResponse(200, null, "User logged out successfully"));
});
