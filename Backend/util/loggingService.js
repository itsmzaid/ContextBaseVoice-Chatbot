import fs from "fs";
import path from "path";

// Token costs per 1K tokens (as of 2024)
const TOKEN_COSTS = {
  "gpt-3.5-turbo": {
    input: 0.0015, // $0.0015 per 1K input tokens
    output: 0.002, // $0.002 per 1K output tokens
  },
  "gpt-4o-mini": {
    input: 0.00015, // $0.00015 per 1K input tokens
    output: 0.0006, // $0.0006 per 1K output tokens
  },
  "whisper-1": {
    input: 0.006, // $0.006 per minute
    output: 0, // No output tokens for STT
  },
  "tts-1-hd": {
    input: 0.015, // $0.015 per 1K input characters
    output: 0, // No output tokens for TTS
  },
};

class LoggingService {
  constructor() {
    this.logs = [];
    this.currentSession = null;
    this.saveTimeout = null;
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    const logDir = path.join(process.cwd(), "storage", "logs");
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  startSession(sessionId, userId, agentId) {
    // Clear any existing session data
    this.logs = [];

    this.currentSession = {
      sessionId,
      userId,
      agentId,
      startTime: new Date(),
      messages: [],
      totalCost: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
    };
    console.log(`📊 Logging session started: ${sessionId}`);
  }

  logModelUsage(
    modelType,
    modelName,
    inputTokens = 0,
    outputTokens = 0,
    cost = 0,
    metadata = {}
  ) {
    if (!this.currentSession) {
      console.warn(
        "⚠️ No active session for logging - model usage will not be tracked"
      );
      return;
    }

    const logEntry = {
      timestamp: new Date(),
      sessionId: this.currentSession.sessionId,
      modelType, // 'stt', 'llm', 'tts'
      modelName,
      inputTokens,
      outputTokens,
      cost,
      metadata,
    };

    this.currentSession.messages.push(logEntry);
    this.currentSession.totalCost += cost;
    this.currentSession.totalInputTokens += inputTokens;
    this.currentSession.totalOutputTokens += outputTokens;

    // Also save to logs array for file storage
    this.logs.push(logEntry);

    console.log(`📊 Model Usage: ${modelType.toUpperCase()} - ${modelName}`);
    console.log(
      `   Input: ${inputTokens} tokens, Output: ${outputTokens} tokens`
    );
    console.log(`   Cost: $${cost.toFixed(6)}`);
  }

  logMessage(messageId, userText, botResponse, audioDuration = 0) {
    if (!this.currentSession) {
      console.warn(
        "⚠️ No active session for logging - message will not be tracked"
      );
      return;
    }

    const messageLog = {
      messageId,
      sessionId: this.currentSession.sessionId,
      timestamp: new Date(),
      userText,
      botResponse,
      audioDuration,
      sessionStats: {
        totalCost: this.currentSession.totalCost,
        totalInputTokens: this.currentSession.totalInputTokens,
        totalOutputTokens: this.currentSession.totalOutputTokens,
      },
    };

    this.logs.push(messageLog);
    this.scheduleSaveLogs();
  }

  calculateCost(modelName, inputTokens, outputTokens) {
    const costs = TOKEN_COSTS[modelName];
    if (!costs) {
      console.warn(`⚠️ Unknown model: ${modelName}`);
      return 0;
    }

    let inputCost, outputCost;

    if (modelName === "tts-1-hd") {
      // TTS cost is based on input characters, not tokens
      inputCost = (inputTokens / 1000) * costs.input;
      outputCost = 0;
    } else if (modelName === "whisper-1") {
      // Whisper cost is based on minutes of audio
      inputCost = (inputTokens / 60) * costs.input; // inputTokens is actually minutes
      outputCost = 0;
    } else {
      // LLM models use token-based pricing
      inputCost = (inputTokens / 1000) * costs.input;
      outputCost = (outputTokens / 1000) * costs.output;
    }

    return inputCost + outputCost;
  }

  scheduleSaveLogs() {
    // Clear any existing timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    // Schedule save after 5 seconds of inactivity
    this.saveTimeout = setTimeout(() => {
      this.saveLogs();
    }, 5000);
  }

  saveLogs() {
    try {
      const logDir = path.join(process.cwd(), "storage", "logs");
      const logFile = path.join(
        logDir,
        `${new Date().toISOString().split("T")[0]}.json`
      );

      let existingLogs = [];
      if (fs.existsSync(logFile)) {
        const fileContent = fs.readFileSync(logFile, "utf8");
        existingLogs = JSON.parse(fileContent);
      }

      existingLogs.push(...this.logs);
      fs.writeFileSync(logFile, JSON.stringify(existingLogs, null, 2));

      // Clear current logs after saving
      this.logs = [];
      this.saveTimeout = null;
    } catch (error) {
      console.error("Error saving logs:", error);
    }
  }

  // Force save logs immediately
  forceSaveLogs() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveLogs();
  }

  getSessionLogs(sessionId) {
    try {
      const logDir = path.join(process.cwd(), "storage", "logs");
      const logFile = path.join(
        logDir,
        `${new Date().toISOString().split("T")[0]}.json`
      );

      if (!fs.existsSync(logFile)) {
        return [];
      }

      const fileContent = fs.readFileSync(logFile, "utf8");
      const allLogs = JSON.parse(fileContent);

      return allLogs.filter((log) => log.sessionId === sessionId);
    } catch (error) {
      console.error("Error reading session logs:", error);
      return [];
    }
  }

  getAllLogs() {
    try {
      const logDir = path.join(process.cwd(), "storage", "logs");
      const logFile = path.join(
        logDir,
        `${new Date().toISOString().split("T")[0]}.json`
      );

      if (!fs.existsSync(logFile)) {
        return [];
      }

      const fileContent = fs.readFileSync(logFile, "utf8");
      return JSON.parse(fileContent);
    } catch (error) {
      console.error("Error reading all logs:", error);
      return [];
    }
  }

  getCurrentSessionStats() {
    if (!this.currentSession) {
      return null;
    }

    return {
      sessionId: this.currentSession.sessionId,
      startTime: this.currentSession.startTime,
      totalCost: this.currentSession.totalCost,
      totalInputTokens: this.currentSession.totalInputTokens,
      totalOutputTokens: this.currentSession.totalOutputTokens,
      messageCount: this.currentSession.messages.length,
    };
  }
}

// Create singleton instance
const loggingService = new LoggingService();

// Save logs on process exit
process.on("SIGINT", () => {
  loggingService.forceSaveLogs();
  process.exit(0);
});

process.on("SIGTERM", () => {
  loggingService.forceSaveLogs();
  process.exit(0);
});

export default loggingService;
