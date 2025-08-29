import { sequelize } from "../models/index.js";
import { ApiError } from "../util/ApiError.js";
import { extractTextFromDocument } from "../util/documentProcessor.js";
import { createEmbeddings } from "../util/embeddingService.js";
import dotenv from "dotenv";
dotenv.config();
export const createAgent = async (agentData, files) => {
  const { user_id, name, prompt, api_key } = agentData;

  // Check if user exists
  const user = await sequelize.models.User.findByPk(user_id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Create agent
  const agent = await sequelize.models.Agent.create({
    user_id,
    name,
    prompt:
      prompt ||
      "You are a helpful AI assistant. Answer questions based on the provided documents.",
    api_key: api_key || process.env.DEFAULT_OPENAI_API_KEY,
  });

  // Process uploaded documents if any
  if (files && files.length > 0) {
    for (const file of files) {
      await processDocument(agent.id, file);
    }
  }

  return agent;
};

export const getAgentById = async (agentId) => {
  const agent = await sequelize.models.Agent.findByPk(agentId, {
    include: [
      {
        model: sequelize.models.User,
        as: "user",
        attributes: ["id", "name", "email"],
      },
      {
        model: sequelize.models.Document,
        as: "documents",
        include: [
          {
            model: sequelize.models.Embedding,
            as: "embeddings",
          },
        ],
      },
    ],
  });

  if (!agent) {
    throw new ApiError(404, "Agent not found");
  }

  return agent;
};

export const getUserAgents = async (userId) => {
  const agents = await sequelize.models.Agent.findAll({
    where: { user_id: userId },
    include: [
      {
        model: sequelize.models.Document,
        as: "documents",
      },
    ],
  });

  return agents;
};

const processDocument = async (agentId, file) => {
  try {
    // Extract text from document
    const contentText = await extractTextFromDocument(file);

    if (!contentText || contentText.trim().length === 0) {
      throw new Error("No text content extracted from document");
    }

    // Save file to disk since we're using memory storage
    const fs = await import("fs");
    const path = await import("path");

    const fileName = `${Date.now()}_${Math.random()
      .toString(36)
      .substring(7)}${path.extname(file.originalname)}`;
    const filePath = path.join(process.cwd(), "storage", "uploads", fileName);

    // Ensure upload directory exists
    const uploadDir = path.dirname(filePath);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Write file to disk
    fs.writeFileSync(filePath, file.buffer);

    // Create document record
    const document = await sequelize.models.Document.create({
      agent_id: agentId,
      file_name: file.originalname,
      file_type: file.mimetype,
      file_path: `/storage/uploads/${fileName}`,
      content_text: contentText,
    });

    // Create embeddings for document chunks
    const chunks = splitTextIntoChunks(contentText);

    const embeddings = await createEmbeddings(chunks, document.id);

    // Save embedding records to database
    for (let i = 0; i < embeddings.length; i++) {
      const embeddingData = embeddings[i];
      await sequelize.models.Embedding.create({
        document_id: document.id,
        chunk_text: embeddingData.text,
        pinecone_id: embeddingData.vectorId,
        metadata: {
          chunk_index: i,
          text_length: embeddingData.text.length,
        },
      });
    }

    return document;
  } catch (error) {
    console.error("Error processing document:", {
      fileName: file.originalname,
      error: error.message,
      stack: error.stack,
    });
    throw new ApiError(500, `Error processing document: ${error.message}`);
  }
};

const splitTextIntoChunks = (text, maxChunkSize = 1000, overlapSize = 200) => {
  try {
    // Clean the text
    const cleanText = text.replace(/\s+/g, " ").trim();

    if (cleanText.length <= maxChunkSize) {
      return [cleanText];
    }

    const chunks = [];
    let startIndex = 0;

    while (startIndex < cleanText.length) {
      let endIndex = startIndex + maxChunkSize;

      // If this isn't the last chunk, try to break at a sentence boundary
      if (endIndex < cleanText.length) {
        // Look for sentence endings (. ! ?) within the last 100 characters
        const searchStart = Math.max(
          startIndex + maxChunkSize - 100,
          startIndex
        );
        const searchEnd = Math.min(startIndex + maxChunkSize, cleanText.length);
        const searchText = cleanText.substring(searchStart, searchEnd);

        const sentenceEnd = searchText.search(/[.!?]\s+/);
        if (sentenceEnd !== -1) {
          endIndex = searchStart + sentenceEnd + 1;
        }
      }

      const chunk = cleanText.substring(startIndex, endIndex).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }

      // Move start index for next chunk with overlap
      startIndex = endIndex - overlapSize;

      // Prevent infinite loop
      if (startIndex >= cleanText.length) {
        break;
      }
    }

    return chunks;
  } catch (error) {
    console.error("Error splitting text into chunks:", error);
    // Fallback: simple word-based splitting
    const words = text.split(" ");
    const chunks = [];

    for (let i = 0; i < words.length; i += maxChunkSize) {
      chunks.push(words.slice(i, i + maxChunkSize).join(" "));
    }

    return chunks;
  }
};
