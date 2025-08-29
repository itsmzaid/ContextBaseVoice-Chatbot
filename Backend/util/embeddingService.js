import OpenAI from "openai";
import {
  upsertVectors,
  queryVectors,
  deleteVectors,
} from "./pineconeService.js";
// Initialize OpenAI client
import dotenv from "dotenv";
// Load environment variables
dotenv.config();
const openai = new OpenAI({
  apiKey: process.env.DEFAULT_OPENAI_API_KEY,
});

export const createEmbeddings = async (texts, documentId) => {
  try {
    const embeddings = [];
    const vectors = [];

    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];

      // Generate embedding using OpenAI
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small", // 1536 dimensions
        input: text,
        encoding_format: "float",
      });

      const embedding = response.data[0].embedding;
      const vectorId = `${documentId}_chunk_${i}`;

      // Store embedding data
      embeddings.push({
        embedding: embedding,
        vectorId: vectorId,
        text: text,
      });

      // Prepare vector for Pinecone
      vectors.push({
        id: vectorId,
        values: embedding,
        metadata: {
          document_id: documentId,
          chunk_text: text,
          chunk_index: i,
          text_length: text.length,
        },
      });
    }

    // Upsert vectors to Pinecone
    await upsertVectors(vectors);

    return embeddings;
  } catch (error) {
    console.error("Error creating embeddings:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
    });
    throw new Error(`Embedding generation failed: ${error.message}`);
  }
};

export const findSimilarEmbeddings = async (
  queryEmbedding,
  documentIds = null,
  limit = 5
) => {
  try {
    // Prepare filter if document IDs are provided
    let filter = {};
    if (documentIds && documentIds.length > 0) {
      filter.document_id = { $in: documentIds };
    }

    // Query Pinecone for similar vectors
    const matches = await queryVectors(queryEmbedding, limit, filter);

    // Transform matches to our format
    const similarEmbeddings = matches.map((match) => ({
      id: match.id,
      chunk_text: match.metadata.chunk_text,
      document_id: match.metadata.document_id,
      score: match.score,
    }));

    return similarEmbeddings;
  } catch (error) {
    console.error("Error finding similar embeddings:", error);
    throw new Error(`Similarity search failed: ${error.message}`);
  }
};

export const createQueryEmbedding = async (queryText) => {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: queryText,
      encoding_format: "float",
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("Error creating query embedding:", error);
    throw new Error(`Query embedding generation failed: ${error.message}`);
  }
};

// Delete embeddings for a document
export const deleteDocumentEmbeddings = async (documentId) => {
  try {
    // Get all vector IDs for this document
    const filter = { document_id: documentId };
    const matches = await queryVectors([0, 0, 0], 10000, filter); // Dummy vector to get all

    if (matches.length > 0) {
      const vectorIds = matches.map((match) => match.id);
      await deleteVectors(vectorIds);
    }
  } catch (error) {
    console.error("Error deleting document embeddings:", error);
    throw new Error(`Embedding deletion failed: ${error.message}`);
  }
};
