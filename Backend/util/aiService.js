import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();
import { sequelize } from "../models/index.js";
import {
  createQueryEmbedding,
  findSimilarEmbeddings,
} from "./embeddingService.js";
import loggingService from "./loggingService.js";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.DEFAULT_OPENAI_API_KEY,
});

// NEW: Response caching for faster responses
const responseCache = new Map();
const CACHE_SIZE_LIMIT = 1000; // Max cache entries

const getCachedResponse = (userMessage) => {
  const key = userMessage.toLowerCase().trim();
  return responseCache.get(key);
};

const setCachedResponse = (userMessage, response) => {
  const key = userMessage.toLowerCase().trim();

  // Implement LRU cache
  if (responseCache.size >= CACHE_SIZE_LIMIT) {
    const firstKey = responseCache.keys().next().value;
    responseCache.delete(firstKey);
  }

  responseCache.set(key, response);
};

export const generateBotResponse = async (sessionId, userMessage) => {
  try {
    // NEW: Check cache first for instant response
    const cachedResponse = getCachedResponse(userMessage);
    if (cachedResponse) {
      return cachedResponse;
    }

    const startTime = Date.now();

    // Get session and agent information
    const session = await sequelize.models.Session.findByPk(sessionId, {
      include: [
        {
          model: sequelize.models.Agent,
          as: "agent",
          include: [
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
        },
      ],
    });

    if (!session) {
      throw new Error("Session not found");
    }

    const agent = session.agent;
    const documents = agent.documents;

    // NEW: Parallel processing - context search and AI response simultaneously
    const [relevantContext, aiResponse] = await Promise.all([
      getRelevantContext(userMessage, documents),
      generateResponseWithAI(userMessage, "", agent.prompt), // Start AI response immediately
    ]);

    // Use AI response directly without automatically adding context
    // Context is already used internally by the AI model for generating the response
    const finalResponse = aiResponse;

    const endTime = Date.now();

    // NEW: Cache the response for future use
    setCachedResponse(userMessage, finalResponse);

    return finalResponse;
  } catch (error) {
    console.error("Error generating bot response:", error);
    return "I'm sorry, I encountered an error while processing your request.";
  }
};

const getRelevantContext = async (userMessage, documents) => {
  try {
    if (!documents || documents.length === 0) {
      return "";
    }

    // Create embedding for user message
    const queryEmbedding = await createQueryEmbedding(userMessage);

    // Get document IDs for filtering
    const documentIds = documents.map((doc) => doc.id);

    // Find similar embeddings across all documents
    const similarChunks = await findSimilarEmbeddings(
      queryEmbedding,
      documentIds,
      5
    );

    // Combine relevant chunks into context
    let context = "";
    for (const chunk of similarChunks) {
      context += chunk.chunk_text + "\n\n";
    }

    return context.substring(0, 3000); // Limit context length
  } catch (error) {
    console.error("Error getting relevant context:", error);
    // Fallback: return content from all documents
    let context = "";
    for (const doc of documents) {
      if (doc.content_text) {
        context += doc.content_text + "\n";
      }
    }
    return context.substring(0, 2000);
  }
};

const generateResponseWithAI = async (userMessage, context, systemPrompt) => {
  try {
    const messages = [
      {
        role: "system",
        content:
          systemPrompt ||
          "You are an AI assistant. Be concise, accurate, and provide answers based only on the provided context. Keep responses clear. Answer according to the information given, regardless of topic",
      },
    ];

    // Add context if available
    if (context && context.trim()) {
      messages.push({
        role: "system",
        content: `Here is the relevant context from the documents:\n\n${context}`,
      });
    }

    // Add user message
    messages.push({
      role: "user",
      content: userMessage,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Faster model
      messages: messages,
      max_tokens: 150, // Increased slightly for complete responses
      temperature: 0.3, // Lower temperature for faster, more consistent responses
      top_p: 0.2,
      frequency_penalty: 0,
      presence_penalty: 0,
      stream: false,
    });

    // Log LLM usage
    const usage = response.usage;
    const cost = loggingService.calculateCost(
      "gpt-3.5-turbo",
      usage.prompt_tokens,
      usage.completion_tokens
    );
    if (loggingService.currentSession) {
      loggingService.logModelUsage(
        "llm",
        "gpt-3.5-turbo",
        usage.prompt_tokens,
        usage.completion_tokens,
        cost,
        {
          totalTokens: usage.total_tokens,
          model: "gpt-3.5-turbo",
        }
      );
    }

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error generating AI response:", error);
    return "I'm sorry, I'm having trouble generating a response right now. Please try again.";
  }
};

// NEW: Search context function
const searchContext = async (userText, sessionId) => {
  try {
    // Get session and agent information
    const session = await sequelize.models.Session.findByPk(sessionId, {
      include: [
        {
          model: sequelize.models.Agent,
          as: "agent",
          include: [
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
        },
      ],
    });

    if (!session) {
      return "";
    }

    const agent = session.agent;
    const documents = agent.documents;

    // Get relevant context from documents using embeddings
    const relevantContext = await getRelevantContext(userText, documents);
    return relevantContext;
  } catch (error) {
    console.error("Error searching context:", error);
    return "";
  }
};

// NEW: Combine response function
const combineResponse = (contextResults, llmResponse) => {
  try {
    // Return LLM response directly without adding context
    // The context is already used internally by the AI model
    return llmResponse;
  } catch (error) {
    console.error("Error combining response:", error);
    return llmResponse;
  }
};

// NEW: Optimized LLM response with faster models
export const generateBotResponseOptimized = async (sessionId, userText) => {
  try {
    const startTime = Date.now();

    // 1. Get context and LLM response in parallel
    const [contextResults, llmResponse] = await Promise.all([
      searchContext(userText, sessionId),
      generateFastLLMResponse(userText),
    ]);

    // 2. Combine results
    const finalResponse = combineResponse(contextResults, llmResponse);

    const endTime = Date.now();
    console.log(`Optimized LLM completed in ${endTime - startTime}ms`);

    return finalResponse;
  } catch (error) {
    console.error("Error in optimized LLM:", error);
    // Fallback to original method
    return generateBotResponse(sessionId, userText);
  }
};

// NEW: Fast LLM response with optimized settings
const generateFastLLMResponse = async (userText) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Give complete answers in 2-3 short sentences. Never cut off mid-sentence. Always finish your response properly. Be direct and concise.",
        },
        {
          role: "user",
          content: userText,
        },
      ],
      max_tokens: 120, // Increased slightly for complete responses
      temperature: 0.2,
      top_p: 0.8,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    // Log LLM usage only if session is active
    const usage = response.usage;
    const cost = loggingService.calculateCost(
      "gpt-4o-mini",
      usage.prompt_tokens,
      usage.completion_tokens
    );
    if (loggingService.currentSession) {
      loggingService.logModelUsage(
        "llm",
        "gpt-4o-mini",
        usage.prompt_tokens,
        usage.completion_tokens,
        cost,
        {
          totalTokens: usage.total_tokens,
          model: "gpt-4o-mini",
        }
      );
    }

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Fast LLM error:", error);
    throw error;
  }
};

// NEW: Ultra-fast response with caching
export const generateUltraFastResponse = async (sessionId, userText) => {
  try {
    // 1. Check cache first
    const cachedResponse = getCachedResponse(userText);
    if (cachedResponse) {
      return cachedResponse;
    }

    // 2. Generate new response
    const response = await generateBotResponseOptimized(sessionId, userText);

    // 3. Cache the response
    setCachedResponse(userText, response);

    return response;
  } catch (error) {
    console.error("Ultra-fast response error:", error);
    return generateBotResponse(sessionId, userText); // Fallback
  }
};
