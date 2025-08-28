import express from "express";
import {
  createAgentHandler,
  getAgentByIdHandler,
  getUserAgentsHandler,
} from "../controller/agentController.js";
import uploadFiles from "../util/uploadFiles.js";

const router = express.Router();

// POST /agents - Create a new agent with documents
router.post("/", uploadFiles, createAgentHandler);

// GET /agents/:agentId - Get agent by ID
router.get("/:agentId", getAgentByIdHandler);

// GET /agents/user/:userId - Get all agents for a user
router.get("/user/:userId", getUserAgentsHandler);

export default router;
