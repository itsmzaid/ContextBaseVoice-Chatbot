import express from "express";
import {
  createUserHandler,
  getUserByIdHandler,
  getAllUsersHandler,
} from "../controller/userController.js";

const router = express.Router();

// POST /users - Create a new user
router.post("/", createUserHandler);

// GET /users/:userId - Get user by ID
router.get("/:userId", getUserByIdHandler);

// GET /users - Get all users
router.get("/", getAllUsersHandler);

export default router;
