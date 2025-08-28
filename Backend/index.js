import express from "express";
import dotenv from "dotenv";
import { createServer } from "http";
import { sequelize } from "./models/index.js";
import { initializePinecone } from "./util/pineconeService.js";
import { voiceWebSocketService } from "./util/voiceWebSocketService.js";
import userRouter from "./routes/user.js";
import agentRouter from "./routes/agent.js";
import sessionRouter from "./routes/session.js";
import messageRouter from "./routes/message.js";
import cors from "cors";
import { errorHandler } from "./middleware/errorHandler.js";

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const port = process.env.PORT || 5000;

const corsOption = {
  origin: true,
  credentials: true,
};

app.use(express.json());
app.use(cors(corsOption));

// Serve static files
app.use("/storage", express.static("storage"));

app.get("/", (req, res) => {
  console.log("server listening on port", port);
  return res.sendStatus(200);
});

// API Routes
app.use("/api/users", userRouter);
app.use("/api/agents", agentRouter);
app.use("/api/sessions", sessionRouter);
app.use("/api/messages", messageRouter);

app.use(errorHandler);

// Initialize WebSocket service
voiceWebSocketService.initialize(server);
voiceWebSocketService.startCleanupTimer();

// Start the HTTP server
server.listen(port, () => {
  console.log("HTTP Server listening on port", port);
  console.log("API available at http://localhost:" + port);
  console.log("WebSocket available at ws://localhost:" + port);
});

// Initialize services
const initializeServices = async () => {
  try {
    // Initialize database connection
    await sequelize.authenticate();
    console.log("Database connection has been established successfully.");

    // Initialize Pinecone
    await initializePinecone();
    console.log("All services initialized successfully.");
  } catch (error) {
    console.error("Error initializing services:", error);
    process.exit(1);
  }
};

// Initialize services on startup
initializeServices();
