import Joi from "joi";
import {
  startSession,
  endSession,
  getSessionById,
} from "../service/sessionService.js";
import { ApiResponse } from "../util/ApiResponse.js";
import { ApiError } from "../util/ApiError.js";
import { asyncHandler } from "../util/asyncHandler.js";
import validator from "../util/validator.js";

export const startSessionHandler = asyncHandler(async (req, res) => {
  const sessionSchema = Joi.object({
    agent_id: Joi.string().uuid().required(),
  });

  const error = await validator(sessionSchema, req.body);
  if (error) {
    throw new ApiError(400, error);
  }

  const session = await startSession(req.body.agent_id);
  return res
    .status(201)
    .json(new ApiResponse(200, session, "Session started successfully"));
});

export const endSessionHandler = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = await endSession(sessionId);
  return res
    .status(200)
    .json(new ApiResponse(200, session, "Session ended successfully"));
});

export const getSessionByIdHandler = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = await getSessionById(sessionId);
  return res
    .status(200)
    .json(new ApiResponse(200, session, "Session fetched successfully"));
});
