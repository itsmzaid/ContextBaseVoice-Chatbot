import { Pinecone } from "@pinecone-database/pinecone";
import dotenv from "dotenv";
dotenv.config();
// Check if required environment variables are set
if (!process.env.PINECONE_API_KEY) {
  throw new Error("PINECONE_API_KEY environment variable is not set");
}

if (!process.env.PINECONE_ENVIRONMENT) {
  throw new Error("PINECONE_ENVIRONMENT environment variable is not set");
}

if (!process.env.PINECONE_INDEX_NAME) {
  throw new Error("PINECONE_INDEX_NAME environment variable is not set");
}

console.log("Pinecone Configuration:");
console.log("API Key:", process.env.PINECONE_API_KEY ? "***SET***" : "NOT SET");
console.log("Environment:", process.env.PINECONE_ENVIRONMENT);
console.log("Index Name:", process.env.PINECONE_INDEX_NAME);
console.log("=".repeat(30));

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const getIndex = () => {
  return pinecone.index(
    process.env.PINECONE_INDEX_NAME,
    process.env.PINECONE_HOST
  );
};

// Initialize Pinecone index
export const initializePinecone = async () => {
  try {
    const index = getIndex();

    return index;
  } catch (error) {
    console.error("Error initializing Pinecone:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    throw new Error(`Pinecone initialization failed: ${error.message}`);
  }
};

// Upsert vectors to Pinecone
export const upsertVectors = async (vectors) => {
  try {
    const index = getIndex();

    const upsertResponse = await index.upsert(vectors);
    return upsertResponse;
  } catch (error) {
    console.error("Error upserting vectors to Pinecone:", error);
    console.error(" Error details:", {
      message: error.message,
      code: error.code,
      type: error.constructor.name,
      cause: error.cause,
    });
    throw new Error(`Pinecone upsert failed: ${error.message}`);
  }
};

// Query similar vectors from Pinecone
export const queryVectors = async (queryVector, topK = 5, filter = {}) => {
  try {
    const index = getIndex();
    const queryResponse = await index.query({
      vector: queryVector,
      topK: topK,
      includeMetadata: true,
      filter: filter,
    });

    return queryResponse.matches;
  } catch (error) {
    console.error("Error querying vectors from Pinecone:", error);
    throw new Error(`Pinecone query failed: ${error.message}`);
  }
};

// Delete vectors from Pinecone
export const deleteVectors = async (vectorIds) => {
  try {
    const index = getIndex();
    const deleteResponse = await index.deleteMany(vectorIds);
    return deleteResponse;
  } catch (error) {
    console.error("Error deleting vectors from Pinecone:", error);
    throw new Error(`Pinecone delete failed: ${error.message}`);
  }
};

// Get vector by ID
export const getVector = async (vectorId) => {
  try {
    const index = getIndex();
    const fetchResponse = await index.fetch([vectorId]);
    return fetchResponse.vectors[vectorId];
  } catch (error) {
    console.error("Error fetching vector from Pinecone:", error);
    throw new Error(`Pinecone fetch failed: ${error.message}`);
  }
};

// Update vector metadata
export const updateVectorMetadata = async (vectorId, metadata) => {
  try {
    const index = getIndex();
    const updateResponse = await index.update({
      id: vectorId,
      setMetadata: metadata,
    });
    return updateResponse;
  } catch (error) {
    console.error("Error updating vector metadata in Pinecone:", error);
    throw new Error(`Pinecone metadata update failed: ${error.message}`);
  }
};

// Check if index exists and is ready
export const checkIndexStatus = async () => {
  try {
    const index = getIndex();
    const stats = await index.describeIndexStats();
    return stats;
  } catch (error) {
    console.error("Error checking Pinecone index status:", error);
    throw new Error(`Pinecone status check failed: ${error.message}`);
  }
};
