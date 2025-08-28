import { sequelize } from "../models/index.js";
import { ApiError } from "../util/ApiError.js";
import { generateBotResponse } from "../util/aiService.js";
import { textToSpeech, speechToText } from "../util/audioService.js";

export const createMessage = async (messageData, audioFile = null) => {
  const { session_id, role, text } = messageData;

  // Check if session exists and is active
  const session = await sequelize.models.Session.findByPk(session_id);
  if (!session) {
    throw new ApiError(404, "Session not found");
  }

  if (session.ended_at) {
    throw new ApiError(400, "Session is already ended");
  }

  let audioUrl = null;
  let processedText = text;

  // Handle audio file if provided
  if (audioFile) {
    try {
      console.log("🎵 Processing audio file...");
      console.log("📁 Audio file details:", {
        originalname: audioFile.originalname,
        mimetype: audioFile.mimetype,
        size: audioFile.size,
        bufferLength: audioFile.buffer?.length,
      });

      // Convert speech to text
      console.log("🎤 Converting speech to text...");
      const transcribedText = await speechToText(audioFile);
      processedText = transcribedText;

      // Save audio file
      console.log("💾 Saving audio file...");
      audioUrl = await saveAudioFile(audioFile, session_id);

      console.log("✅ Audio processing completed successfully:", {
        fileName: audioFile.originalname,
        transcribedText: transcribedText.substring(0, 50) + "...",
        audioUrl: audioUrl,
      });
    } catch (error) {
      console.error("❌ Error processing audio:", {
        fileName: audioFile.originalname,
        error: error.message,
        stack: error.stack,
      });
      throw new ApiError(500, `Error processing audio: ${error.message}`);
    }
  }

  // Create user message
  const message = await sequelize.models.Message.create({
    session_id,
    role,
    text: processedText,
    audio_url: audioUrl,
  });

  // If this is a user message, generate bot response
  if (role === "user") {
    try {
      console.log(
        `Generating bot response for: "${processedText.substring(0, 50)}..."`
      );

      // Generate bot response
      const botResponse = await generateBotResponse(session_id, processedText);

      // Convert bot response to speech
      const { audioBuffer: botAudioBuffer, audioFilePath: botAudioUrl } =
        await textToSpeech(botResponse);

      console.log(
        `Bot response generated: "${botResponse.substring(0, 50)}..."`
      );

      // Create bot message
      const botMessage = await sequelize.models.Message.create({
        session_id,
        role: "bot",
        text: botResponse,
        audio_url: botAudioUrl,
      });

      return {
        userMessage: message,
        botMessage: botMessage,
      };
    } catch (error) {
      console.error("Error generating bot response:", error);

      // Create a fallback bot message
      const fallbackResponse =
        "I'm sorry, I'm having trouble processing your request right now. Please try again.";
      const botMessage = await sequelize.models.Message.create({
        session_id,
        role: "bot",
        text: fallbackResponse,
        audio_url: null,
      });

      return {
        userMessage: message,
        botMessage: botMessage,
      };
    }
  }

  return { message };
};

export const getSessionMessages = async (sessionId) => {
  try {
    console.log(`Fetching messages for session: ${sessionId}`);

    const session = await sequelize.models.Session.findByPk(sessionId, {
      include: [
        {
          model: sequelize.models.Message,
          as: "messages",
          order: [["created_at", "ASC"]],
        },
      ],
    });

    if (!session) {
      console.log(`Session not found: ${sessionId}`);
      throw new ApiError(404, `Session not found with ID: ${sessionId}`);
    }

    console.log(
      `Found ${
        session.messages?.length || 0
      } messages for session: ${sessionId}`
    );
    return session.messages || [];
  } catch (error) {
    console.error(`Error fetching session messages for ${sessionId}:`, error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      500,
      `Failed to fetch session messages: ${error.message}`
    );
  }
};

export const getMessageById = async (messageId) => {
  const message = await sequelize.models.Message.findByPk(messageId, {
    include: [
      {
        model: sequelize.models.Session,
        as: "session",
      },
    ],
  });

  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  return message;
};

const saveAudioFile = async (audioFile, sessionId) => {
  try {
    // Create unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const fileExtension = audioFile.originalname.split(".").pop();
    const fileName = `session_${sessionId}_${timestamp}_${randomId}.${fileExtension}`;

    // Save file to storage
    const fs = await import("fs");
    const path = await import("path");

    const audioDir = path.join(process.cwd(), "storage", "audio");
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    const filePath = path.join(audioDir, fileName);
    fs.writeFileSync(filePath, audioFile.buffer);

    // Return the URL path
    const audioUrl = `/storage/audio/${fileName}`;
    return audioUrl;
  } catch (error) {
    console.error("Error saving audio file:", error);
    throw new Error(`Failed to save audio file: ${error.message}`);
  }
};
