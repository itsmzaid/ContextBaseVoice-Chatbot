import express from "express";
import {
  createMessageHandler,
  getSessionMessagesHandler,
  getMessageByIdHandler,
} from "../controller/messageController.js";
import uploadFiles from "../util/uploadFiles.js";

const router = express.Router();

// POST /messages - Create a new message
router.post("/", uploadFiles, createMessageHandler);

// GET /messages/session/:sessionId - Get all messages for a session
router.get("/session/:sessionId", getSessionMessagesHandler);

// GET /messages/:messageId - Get message by ID
router.get("/:messageId", getMessageByIdHandler);

export default router;
