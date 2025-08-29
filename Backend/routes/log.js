import express from "express";
import {
  getSessionLogs,
  getAllLogs,
  getCurrentSessionStats,
} from "../controller/logController.js";

const router = express.Router();

// Get logs for a specific session
router.get("/session/:sessionId", getSessionLogs);

// Get all logs
router.get("/all", getAllLogs);

// Get current session stats
router.get("/stats", getCurrentSessionStats);

export default router;
