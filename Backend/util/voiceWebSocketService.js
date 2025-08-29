import { WebSocketServer } from "ws";
import {
  speechToTextStream,
  textToSpeech,
  textToSpeechDynamic,
} from "./audioService.js";
import { generateBotResponse, generateUltraFastResponse } from "./aiService.js";
import { sequelize } from "../models/index.js";
import { ApiError } from "./ApiError.js";
import loggingService from "./loggingService.js";

class VoiceWebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // Map to store client connections and their data
    this.silenceTimeout = 0; // 0 seconds - no automatic silence detection, only manual stop
    this.performanceStats = {
      totalRequests: 0,
      responseTimes: [],
      fastestResponse: Infinity,
      slowestResponse: 0,
      averageResponseTime: 0,
    };
  }

  initialize(server) {
    this.wss = new WebSocketServer({ server });

    this.wss.on("connection", (ws, req) => {
      // Initialize client data
      const clientId = this.generateClientId();
      this.clients.set(clientId, {
        ws,
        sessionId: null,
        audioChunks: [],
        textBuffer: "",
        silenceTimer: null,
        isRecording: false,
        lastActivity: Date.now(),
      });

      // Send connection confirmation
      ws.send(
        JSON.stringify({
          type: "connection_established",
          clientId,
          message: "Voice connection ready",
        })
      );

      ws.on("message", async (data) => {
        try {
          const message = JSON.parse(data);
          await this.handleMessage(clientId, message);
        } catch (error) {
          console.error("Error handling WebSocket message:", error);
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Error processing message",
            })
          );
        }
      });

      ws.on("close", (code, reason) => {
        console.log(`WebSocket connection closed: ${code} - ${reason}`);
        this.cleanupClient(clientId);
      });

      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
        // Don't immediately cleanup on error, let the close event handle it
      });
    });

    console.log("Voice WebSocket service initialized");
  }

  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  async handleMessage(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastActivity = Date.now();

    switch (message.type) {
      case "start_session":
        await this.handleStartSession(clientId, message);
        break;

      case "audio_chunk":
        await this.handleAudioChunk(clientId, message);
        break;

      case "stop_recording":
        await this.handleStopRecording(clientId);
        break;

      case "ping":
        client.ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
        break;

      default:
        console.log("Unknown message type:", message.type);
    }
  }

  async handleStartSession(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const { sessionId } = message;

      // Verify session exists and is active
      const session = await sequelize.models.Session.findByPk(sessionId, {
        include: [
          {
            model: sequelize.models.Agent,
            as: "agent",
          },
        ],
      });
      if (!session) {
        throw new Error("Session not found");
      }
      if (session.ended_at) {
        throw new Error("Session is already ended");
      }
      if (!session.agent) {
        throw new Error("Session agent not found");
      }

      client.sessionId = sessionId;
      client.isRecording = true;
      client.audioChunks = [];
      client.textBuffer = "";

      // Start logging session
      console.log("Session data:", {
        sessionId: session.id,
        agentId: session.agent_id,
        userId: session.agent.user_id,
      });

      // Start logging session with proper error handling
      try {
        loggingService.startSession(
          sessionId,
          session.agent.user_id,
          session.agent_id
        );
        console.log("✅ Logging session started successfully");
      } catch (error) {
        console.error("❌ Error starting logging session:", error);
      }

      client.ws.send(
        JSON.stringify({
          type: "session_started",
          sessionId,
          message: "Voice session started successfully",
        })
      );
    } catch (error) {
      console.error("Error starting voice session:", error);
      client.ws.send(
        JSON.stringify({
          type: "error",
          message: `Failed to start session: ${error.message}`,
        })
      );
    }
  }

  async handleAudioChunk(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client || !client.isRecording) return;

    // Check if WebSocket is still connected
    if (client.ws.readyState !== 1) {
      // 1 = WebSocket.OPEN
      console.log("WebSocket not connected, skipping audio chunk");
      return;
    }

    try {
      // Add audio chunk to buffer
      const audioData = message.audioData; // Base64 encoded audio data
      const audioBuffer = Buffer.from(audioData, "base64");
      client.audioChunks.push(audioBuffer);

      // Save audio chunk to file for debugging
      await this.saveAudioChunk(
        clientId,
        audioBuffer,
        client.audioChunks.length
      );

      // DISABLED: No silence timer reset - only manual stop will process audio
      // this.resetSilenceTimer(clientId);

      // Send acknowledgment
      client.ws.send(
        JSON.stringify({
          type: "audio_received",
          chunkIndex: client.audioChunks.length,
        })
      );
    } catch (error) {
      console.error("Error handling audio chunk:", error);
      client.ws.send(
        JSON.stringify({
          type: "error",
          message: "Error processing audio chunk",
        })
      );
    }
  }

  async saveAudioChunk(clientId, audioBuffer, chunkIndex) {
    try {
      const fs = await import("fs");
      const path = await import("path");

      // Get client data
      const client = this.clients.get(clientId);
      if (!client) {
        console.error("Client not found for audio chunk save");
        return;
      }

      // Create debug audio directory
      const debugDir = path.join(process.cwd(), "storage", "debug_audio");
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }

      // Create client-specific directory
      const clientDir = path.join(debugDir, clientId);
      if (!fs.existsSync(clientDir)) {
        fs.mkdirSync(clientDir, { recursive: true });
      }

      // Save individual chunk
      const chunkFileName = `chunk_${chunkIndex}_${Date.now()}.webm`;
      const chunkPath = path.join(clientDir, chunkFileName);
      fs.writeFileSync(chunkPath, audioBuffer);

      // Save combined audio (all chunks so far) - for testing
      const combinedFileName = `complete_audio_${Date.now()}.webm`;
      const combinedPath = path.join(clientDir, combinedFileName);

      // Combine all chunks
      const combinedBuffer = Buffer.concat(client.audioChunks);
      fs.writeFileSync(combinedPath, combinedBuffer);

      // Also save a final complete audio when recording stops
      if (chunkIndex >= 3) {
        // Save after 3+ chunks for testing
        const finalFileName = `final_complete_${Date.now()}.webm`;
        const finalPath = path.join(clientDir, finalFileName);
        fs.writeFileSync(finalPath, combinedBuffer);
      }
    } catch (error) {
      console.error("Error saving audio chunk:", error);
    }
  }

  async handleStopRecording(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.isRecording = false;
    this.clearSilenceTimer(clientId);

    // Save final complete audio for testing
    await this.saveFinalCompleteAudio(clientId);

    // Process accumulated audio immediately
    await this.processAccumulatedAudio(clientId);
  }

  async saveFinalCompleteAudio(clientId) {
    const client = this.clients.get(clientId);
    if (!client || client.audioChunks.length === 0) return;

    try {
      const fs = await import("fs");
      const path = await import("path");

      const debugDir = path.join(process.cwd(), "storage", "debug_audio");
      const clientDir = path.join(debugDir, clientId);

      // Save final complete audio
      const finalFileName = `FINAL_COMPLETE_AUDIO_${Date.now()}.webm`;
      const finalPath = path.join(clientDir, finalFileName);

      // Combine all chunks
      const combinedBuffer = Buffer.concat(client.audioChunks);
      fs.writeFileSync(finalPath, combinedBuffer);
    } catch (error) {
      console.error("Error saving final complete audio:", error);
    }
  }

  resetSilenceTimer(clientId) {
    // DISABLED: Silence detection completely disabled
    // Only manual stop_recording will process audio
    return;

    // const client = this.clients.get(clientId);
    // if (!client) return;

    // // Clear existing timer
    // this.clearSilenceTimer(clientId);

    // // Set new timer
    // client.silenceTimer = setTimeout(async () => {
    //   console.log(
    //     `Silence detected for client ${clientId}, processing accumulated audio`
    //   );
    //   await this.processAccumulatedAudio(clientId);
    // }, this.silenceTimeout);
  }

  clearSilenceTimer(clientId) {
    const client = this.clients.get(clientId);
    if (client && client.silenceTimer) {
      clearTimeout(client.silenceTimer);
      client.silenceTimer = null;
    }
  }

  async processAccumulatedAudio(clientId) {
    const client = this.clients.get(clientId);
    if (!client || client.audioChunks.length === 0) return;

    // Validate session exists before processing
    if (!client.sessionId) {
      console.error("❌ No session ID found for client:", clientId);
      client.ws.send(
        JSON.stringify({
          type: "error",
          message: "No active session found. Please start a new session.",
        })
      );
      return;
    }

    try {
      // Send processing status
      client.ws.send(
        JSON.stringify({
          type: "processing_audio",
          message: "Processing your voice input...",
        })
      );

      // NEW: Start STT and prepare for LLM simultaneously
      const startTime = Date.now();

      // Start STT processing
      const sttPromise = speechToTextStream(client.audioChunks);

      // Prepare session data for LLM (non-blocking)
      const sessionPromise = sequelize.models.Session.findByPk(
        client.sessionId,
        {
          include: [
            {
              model: sequelize.models.Agent,
              as: "agent",
            },
          ],
        }
      );

      // Wait for STT to complete
      const transcribedText = await sttPromise;
      const sttTime = Date.now() - startTime;

      if (!transcribedText || transcribedText.trim() === "") {
        client.ws.send(
          JSON.stringify({
            type: "no_speech_detected",
            message: "No speech detected in the audio",
          })
        );
        return;
      }

      console.log(`Transcribed text: "${transcribedText}"`);

      // Add to text buffer
      client.textBuffer += transcribedText + " ";

      // Send transcription confirmation
      client.ws.send(
        JSON.stringify({
          type: "transcription_complete",
          text: transcribedText,
          fullText: client.textBuffer.trim(),
        })
      );

      // NEW: Generate AI response with ultra-fast parallel processing
      const responseStartTime = Date.now();
      await this.generateAndSendResponseOptimized(
        clientId,
        transcribedText,
        await sessionPromise
      );

      // Track performance
      const totalResponseTime = Date.now() - responseStartTime;
      this.trackPerformance(totalResponseTime);

      // Clear audio chunks for next recording
      client.audioChunks = [];
    } catch (error) {
      console.error("Error processing accumulated audio:", error);
      client.ws.send(
        JSON.stringify({
          type: "error",
          message: `Error processing audio: ${error.message}`,
        })
      );
    }
  }

  async generateAndSendResponse(clientId, userText) {
    const client = this.clients.get(clientId);
    if (!client || !client.sessionId) return;

    try {
      console.log(`Generating AI response for: "${userText}"`);

      // Send processing status
      client.ws.send(
        JSON.stringify({
          type: "generating_response",
          message: "Generating response...",
        })
      );

      // Generate bot response using ultra-fast AI service
      const botResponse = await generateUltraFastResponse(
        client.sessionId,
        userText
      );

      console.log(`Bot response: "${botResponse}"`);

      // Save user message to database
      const userMessage = await sequelize.models.Message.create({
        session_id: client.sessionId,
        role: "user",
        text: userText,
        audio_url: null, // We don't save individual chunks
      });

      // Convert bot response to speech using dynamic parallel TTS
      let audioBuffer, audioFilePath, processingTime, chunkCount;

      try {
        const result = await textToSpeechDynamic(botResponse);
        audioBuffer = result.audioBuffer;
        audioFilePath = result.audioFilePath;
        processingTime = result.processingTime;
        chunkCount = result.chunkCount;
        console.log(
          `Dynamic TTS completed in ${processingTime}ms with ${chunkCount} chunks`
        );
      } catch (error) {
        const fallbackResult = await textToSpeech(botResponse);
        audioBuffer = fallbackResult.audioBuffer;
        audioFilePath = fallbackResult.audioFilePath;
        processingTime = "fallback";
        chunkCount = 1;
      }

      // Save bot message to database
      const botMessage = await sequelize.models.Message.create({
        session_id: client.sessionId,
        role: "bot",
        text: botResponse,
        audio_url: audioFilePath,
      });

      // Log complete message with all model usage
      loggingService.logMessage(
        botMessage.id,
        userText,
        botResponse,
        processingTime
      );

      // Send bot response as audio
      const audioBase64 = audioBuffer.toString("base64");

      // Check if WebSocket is still connected before sending
      if (client.ws.readyState === 1) {
        // WebSocket.OPEN
        client.ws.send(
          JSON.stringify({
            type: "bot_response",
            text: botResponse,
            audioData: audioBase64,
            audioUrl: audioFilePath,
            messageId: botMessage.id,
          })
        );
      } else {
        console.error("WebSocket not connected, cannot send bot response");
      }
    } catch (error) {
      console.error("Error generating bot response:", error);

      // Send fallback response
      const fallbackResponse =
        "I'm sorry, I'm having trouble processing your request right now. Please try again.";
      client.ws.send(
        JSON.stringify({
          type: "error",
          message: fallbackResponse,
        })
      );
    }
  }

  // NEW: Ultra-optimized response generation
  async generateAndSendResponseOptimized(clientId, userText, preloadedSession) {
    const client = this.clients.get(clientId);
    if (!client || !client.sessionId) return;

    try {
      const startTime = Date.now();

      // Send processing status
      client.ws.send(
        JSON.stringify({
          type: "generating_response",
          message: "Generating response...",
        })
      );

      // NEW: Sequential processing - LLM first, then TTS preparation
      const botResponse = await generateUltraFastResponse(
        client.sessionId,
        userText
      );
      const ttsPreparation = await this.prepareTTSOptimization(botResponse);

      const llmTime = Date.now() - startTime;

      // NEW: Parallel database operations + TTS
      const [userMessage, audioResult] = await Promise.all([
        // Save user message to database
        sequelize.models.Message.create({
          session_id: client.sessionId,
          role: "user",
          text: userText,
          audio_url: null,
        }),
        // Convert bot response to speech using optimized TTS
        this.generateOptimizedTTS(botResponse, ttsPreparation),
      ]);

      // Save bot message to database
      const botMessage = await sequelize.models.Message.create({
        session_id: client.sessionId,
        role: "bot",
        text: botResponse,
        audio_url: audioResult.audioFilePath,
      });

      // Log complete message with all model usage
      try {
        loggingService.logMessage(
          botMessage.id,
          userText,
          botResponse,
          audioResult.processingTime
        );
        console.log("✅ Message logged successfully");
      } catch (error) {
        console.error("❌ Error logging message:", error);
      }

      // Send bot response as audio
      const audioBase64 = audioResult.audioBuffer.toString("base64");

      // Check if WebSocket is still connected before sending
      if (client.ws.readyState === 1) {
        // WebSocket.OPEN
        client.ws.send(
          JSON.stringify({
            type: "bot_response",
            text: botResponse,
            audioData: audioBase64,
            audioUrl: audioResult.audioFilePath,
            messageId: botMessage.id,
          })
        );
      } else {
        console.error("WebSocket not connected, cannot send bot response");
      }

      const totalTime = Date.now() - startTime;
      console.log(
        `Performance: LLM=${llmTime}ms, TTS=${audioResult.processingTime}ms`
      );
    } catch (error) {
      console.error("Error in ultra-fast response generation:", error);

      // Fallback to original method
      await this.generateAndSendResponse(clientId, userText);
    }
  }

  // NEW: Prepare TTS optimization
  async prepareTTSOptimization(text) {
    try {
      const wordCount = text.split(/\s+/).length;
      const optimalChunks = Math.max(1, Math.ceil(wordCount / 10));
      console.log(
        `TTS Preparation: ${wordCount} words, ${optimalChunks} chunks`
      );
      return { wordCount, optimalChunks };
    } catch (error) {
      console.error("Error in TTS preparation:", error);
      return { wordCount: 0, optimalChunks: 1 };
    }
  }

  // NEW: Generate optimized TTS
  async generateOptimizedTTS(text, preparation) {
    try {
      const result = await textToSpeechDynamic(text);
      return result;
    } catch (error) {
      console.error("TTS Error details:", error);
      const fallbackResult = await textToSpeech(text);
      return fallbackResult;
    }
  }

  // NEW: Track performance statistics
  trackPerformance(responseTime) {
    this.performanceStats.totalRequests++;
    this.performanceStats.responseTimes.push(responseTime);

    // Update fastest and slowest
    if (responseTime < this.performanceStats.fastestResponse) {
      this.performanceStats.fastestResponse = responseTime;
    }
    if (responseTime > this.performanceStats.slowestResponse) {
      this.performanceStats.slowestResponse = responseTime;
    }

    // Calculate average
    const total = this.performanceStats.responseTimes.reduce(
      (sum, time) => sum + time,
      0
    );
    this.performanceStats.averageResponseTime =
      total / this.performanceStats.responseTimes.length;

    // Log performance stats every 10 requests
    if (this.performanceStats.totalRequests % 10 === 0) {
      console.log("Performance Stats:", {
        totalRequests: this.performanceStats.totalRequests,
        averageResponseTime: `${this.performanceStats.averageResponseTime.toFixed(
          0
        )}ms`,
        fastestResponse: `${this.performanceStats.fastestResponse}ms`,
        slowestResponse: `${this.performanceStats.slowestResponse}ms`,
        last10Average:
          this.performanceStats.responseTimes
            .slice(-10)
            .reduce((sum, time) => sum + time, 0) / 10,
      });
    }
  }

  cleanupClient(clientId) {
    const client = this.clients.get(clientId);
    if (client) {
      this.clearSilenceTimer(clientId);

      // Clear logging session if this was the last client
      if (this.clients.size === 1) {
        try {
          // Force save any pending logs before clearing session
          if (loggingService.saveTimeout) {
            clearTimeout(loggingService.saveTimeout);
            loggingService.saveLogs();
          }
          loggingService.currentSession = null;
          console.log("🧹 Logging session cleared");
        } catch (error) {
          console.error("Error clearing logging session:", error);
        }
      }

      this.clients.delete(clientId);
    }
  }

  // Cleanup inactive clients periodically
  startCleanupTimer() {
    setInterval(() => {
      const now = Date.now();
      const inactiveTimeout = 5 * 60 * 1000; // 5 minutes

      for (const [clientId, client] of this.clients.entries()) {
        if (now - client.lastActivity > inactiveTimeout) {
          client.ws.close();
          this.cleanupClient(clientId);
        }
      }
    }, 60000); // Check every minute
  }
}

export const voiceWebSocketService = new VoiceWebSocketService();
