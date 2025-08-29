import Joi from "joi";
import {
  createMessage,
  getSessionMessages,
  getMessageById,
} from "../service/messageService.js";
import { ApiResponse } from "../util/ApiResponse.js";
import { ApiError } from "../util/ApiError.js";
import { asyncHandler } from "../util/asyncHandler.js";
import validator from "../util/validator.js";

export const createMessageHandler = asyncHandler(async (req, res) => {
  const messageSchema = Joi.object({
    session_id: Joi.string().uuid().required(),
    role: Joi.string().valid("user", "bot").required(),
    text: Joi.string().required(),
  });

  const error = await validator(messageSchema, req.body);
  if (error) {
    throw new ApiError(400, error);
  }

  const audioFile = req.files?.audio?.[0] || null;
  const result = await createMessage(req.body, audioFile);

  return res
    .status(201)
    .json(new ApiResponse(200, result, "Message created successfully"));
});

export const getSessionMessagesHandler = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const messages = await getSessionMessages(sessionId);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        messages,
        messages.length > 0
          ? "Session messages fetched successfully"
          : "No messages found for this session"
      )
    );
});

export const getMessageByIdHandler = asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  const message = await getMessageById(messageId);
  return res
    .status(200)
    .json(new ApiResponse(200, message, "Message fetched successfully"));
});
