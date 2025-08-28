import Joi from "joi";
import {
  createAgent,
  getAgentById,
  getUserAgents,
} from "../service/agentService.js";
import { ApiResponse } from "../util/ApiResponse.js";
import { ApiError } from "../util/ApiError.js";
import { asyncHandler } from "../util/asyncHandler.js";
import validator from "../util/validator.js";

export const createAgentHandler = asyncHandler(async (req, res) => {
  const agentSchema = Joi.object({
    user_id: Joi.string().uuid().required(),
    name: Joi.string().required().max(100),
    prompt: Joi.string().optional(),
    api_key: Joi.string().optional(),
  });

  const error = await validator(agentSchema, req.body);
  if (error) {
    throw new ApiError(400, error);
  }

  const files = req.files?.documents || [];
  const agent = await createAgent(req.body, files);

  return res
    .status(200)
    .json(new ApiResponse(200, agent, "Agent created successfully"));
});

export const getAgentByIdHandler = asyncHandler(async (req, res) => {
  const { agentId } = req.params;

  const agent = await getAgentById(agentId);
  return res
    .status(200)
    .json(new ApiResponse(200, agent, "Agent fetched successfully"));
});

export const getUserAgentsHandler = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const agents = await getUserAgents(userId);
  return res
    .status(200)
    .json(new ApiResponse(200, agents, "User agents fetched successfully"));
});
