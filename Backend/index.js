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
import logRouter from "./routes/log.js";
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

// Test endpoint for logging system
app.get("/test-logging", async (req, res) => {
  try {
    const loggingService = await import("./util/loggingService.js");
    const service = loggingService.default;

    // Start a test session
    service.startSession("test-session", "test-user", "test-agent");

    // Log some test usage
    service.logModelUsage("llm", "gpt-4o-mini", 100, 50, 0.0001, {
      test: true,
    });
    service.logModelUsage("stt", "whisper-1", 1, 0, 0.0001, { test: true });
    service.logModelUsage("tts", "tts-1-hd", 200, 0, 0.0001, { test: true });

    // Log a test message
    service.logMessage("test-message", "Hello", "Hi there!", 1000);

    res.json({
      success: true,
      message: "Test logging completed",
      logs: service.getAllLogs(),
    });
  } catch (error) {
    console.error("Test logging error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API Routes
app.use("/api/users", userRouter);
app.use("/api/agents", agentRouter);
app.use("/api/sessions", sessionRouter);
app.use("/api/messages", messageRouter);
app.use("/api/logs", logRouter);

app.use(errorHandler);

// Initialize WebSocket service
voiceWebSocketService.initialize(server);
voiceWebSocketService.startCleanupTimer();

// Start the HTTP server
server.listen(port, () => {
  console.log("HTTP Server listening on port", port);
  console.log("WebSocket available at ws://localhost:" + port);
});

// Initialize services
const initializeServices = async () => {
  try {
    // Initialize database connection
    await sequelize.authenticate();

    // Initialize Pinecone
    await initializePinecone();
  } catch (error) {
    console.error("Error initializing services:", error);
    process.exit(1);
  }
};

// Initialize services on startup
initializeServices();
