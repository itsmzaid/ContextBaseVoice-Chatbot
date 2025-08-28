import express from "express";
import {
  startSessionHandler,
  endSessionHandler,
  getSessionByIdHandler,
} from "../controller/sessionController.js";

const router = express.Router();

// POST /sessions/start - Start a new session
router.post("/start", startSessionHandler);

// PATCH /sessions/:sessionId/end - End a session
router.patch("/:sessionId/end", endSessionHandler);

// GET /sessions/:sessionId - Get session by ID
router.get("/:sessionId", getSessionByIdHandler);

export default router;
