import OpenAI from "openai";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { validateAudioBuffer } from "./audioConverter.js";
dotenv.config();
// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.DEFAULT_OPENAI_API_KEY,
});

export const textToSpeech = async (text) => {
  try {
    console.log("Starting text-to-speech conversion...");

    // Generate audio using OpenAI TTS
    const mp3 = await openai.audio.speech.create({
      model: "tts-1-hd",
      voice: "echo",
      input: text,
    });

    // Create unique filename
    const fileName = `tts_${Date.now()}_${Math.random()
      .toString(36)
      .substring(7)}.mp3`;
    const audioPath = path.join(process.cwd(), "storage", "audio", fileName);

    // Ensure directory exists
    const audioDir = path.dirname(audioPath);
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    // Convert buffer to file
    const buffer = Buffer.from(await mp3.arrayBuffer());
    fs.writeFileSync(audioPath, buffer);

    // Return both the audio buffer and the URL path
    const audioUrl = `/storage/audio/${fileName}`;
    console.log("Text-to-speech successful.");
    return { audioBuffer: buffer, audioFilePath: audioUrl };
  } catch (error) {
    console.error("Error in text-to-speech:", error);
    throw error;
  }
};

export const speechToText = async (audioInput) => {
  try {
    console.log("Starting speech-to-text conversion...");

    let audioBuffer;
    let fileName;
    let mimeType;

    // Handle different input types
    if (audioInput instanceof Buffer) {
      // Direct buffer input - use WebM format
      audioBuffer = audioInput;
      fileName = "voice_input.webm";
      mimeType = "audio/webm";
    } else if (audioInput.buffer) {
      // File object input (from API)
      audioBuffer = audioInput.buffer;
      fileName = audioInput.originalname;
      mimeType = audioInput.mimetype;
    } else {
      throw new Error("Invalid audio input format");
    }

    console.log("Audio file details:", {
      fileName,
      mimeType,
      bufferLength: audioBuffer.length,
    });

    // Create a proper File object for OpenAI
    const file = new File([audioBuffer], fileName, { type: mimeType });

    // Transcribe audio using OpenAI Whisper with optimized settings
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      response_format: "text",
      language: "en", // Specify language for better accuracy
      temperature: 0.0, // Lower temperature for more accurate transcription
      prompt:
        "This is a clear English conversation. Please transcribe exactly what is spoken without adding or removing words.",
    });

    console.log(
      "Speech-to-text successful:",
      transcription.substring(0, 50) + "..."
    );
    return transcription;
  } catch (error) {
    console.error("Error in speech-to-text:", error);
    console.error("🔍 Error details:", {
      message: error.message,
      status: error.status,
      type: error.type,
      code: error.code,
    });
    throw new Error(`Speech-to-text failed: ${error.message}`);
  }
};

// New streaming speech-to-text function
export const speechToTextStream = async (audioChunks) => {
  try {
    console.log("Starting streaming speech-to-text conversion...");
    console.log("Audio chunks received:", audioChunks.length);

    // Convert audio chunks to Buffer
    const chunks = [];
    for (const chunk of audioChunks) {
      if (chunk instanceof ArrayBuffer) {
        chunks.push(Buffer.from(chunk));
      } else if (chunk instanceof Buffer) {
        chunks.push(chunk);
      } else {
        // If it's a Blob or other format, convert to buffer
        const arrayBuffer = await chunk.arrayBuffer();
        chunks.push(Buffer.from(arrayBuffer));
      }
    }

    // Combine all chunks into a single buffer
    const audioBuffer = Buffer.concat(chunks);
    console.log("Combined audio buffer size:", audioBuffer.length, "bytes");

    // Validate audio buffer
    validateAudioBuffer(audioBuffer);

    // Use WebM format directly - no conversion needed
    const audioFile = new File([audioBuffer], "audio.webm", {
      type: "audio/webm",
    });

    // Log audio details for debugging
    console.log("Audio details for transcription:", {
      originalSize: audioBuffer.length,
      fileType: "webm",
      fileName: audioFile.name,
      fileSize: audioFile.size,
    });

    // Transcribe using OpenAI Whisper with ULTRA-OPTIMIZED settings
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      response_format: "text",
      language: "en", // Specify language for better accuracy
      temperature: 0.0, // Lower temperature for more accurate transcription
      prompt: "Transcribe exactly.", // Shorter prompt for faster processing
    });

    console.log(
      "Streaming speech-to-text successful:",
      transcription.substring(0, 50) + "..."
    );

    // Debug: Log full transcription for debugging
    console.log("FULL TRANSCRIPTION:", transcription);
    console.log("TRANSCRIPTION LENGTH:", transcription.length);

    return transcription;
  } catch (error) {
    console.error("Error in streaming speech-to-text:", error);
    console.error("Error details:", {
      message: error.message,
      status: error.status,
      type: error.type,
      code: error.code,
    });
    throw error;
  }
};

// NEW: Analyze text length and structure
const analyzeTextLength = (text) => {
  const wordCount = text.split(/\s+/).length;
  const charCount = text.length;
  const sentenceCount = text.split(/[.!?]+/).length;

  return {
    wordCount,
    charCount,
    sentenceCount,
    averageWordsPerSentence: wordCount / sentenceCount,
  };
};

// NEW: Split text into optimal chunks for parallel processing
const splitTextDynamically = (text) => {
  const analysis = analyzeTextLength(text);
  const wordsPerChunk = 15; // Optimized chunk size for better TTS performance
  const optimalChunks = Math.max(
    1,
    Math.ceil(analysis.wordCount / wordsPerChunk)
  );

  console.log(`Text Analysis:`, {
    totalWords: analysis.wordCount,
    totalChars: analysis.charCount,
    sentences: analysis.sentenceCount,
    optimalChunks,
    wordsPerChunk,
  });

  // NEW: Simple and reliable text splitting
  const words = text.split(/\s+/);
  const chunks = [];

  for (let i = 0; i < words.length; i += wordsPerChunk) {
    const chunkWords = words.slice(i, i + wordsPerChunk);
    const chunk = chunkWords.join(" ");

    if (chunk.trim()) {
      chunks.push(chunk.trim());
    }
  }

  console.log(
    `Split into ${chunks.length} chunks:`,
    chunks.map((chunk, i) => `Chunk ${i + 1}: "${chunk.substring(0, 50)}..."`)
  );

  return chunks;
};

// NEW: Dynamic parallel TTS processing
export const textToSpeechDynamic = async (text) => {
  try {
    console.log("Starting dynamic parallel TTS processing...");
    const startTime = Date.now();

    // 1. Analyze text and calculate optimal chunks
    const chunks = splitTextDynamically(text);
    console.log(` Text split into ${chunks.length} optimal chunks`);

    // 2. Process chunks in parallel with rate limiting
    const ttsPromises = chunks.map(async (chunk, index) => {
      // Add small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, index * 50)); // Reduced delay from 100ms to 50ms

      console.log(
        `Processing chunk ${index + 1}/${chunks.length}: "${chunk.substring(
          0,
          50
        )}..."`
      );

      try {
        const speech = await openai.audio.speech.create({
          model: "tts-1",
          voice: "shimmer",
          input: chunk,
          response_format: "mp3",
        });

        const buffer = Buffer.from(await speech.arrayBuffer());
        console.log(`Chunk ${index + 1} processed: ${buffer.length} bytes`);

        return {
          index,
          buffer,
          text: chunk,
          size: buffer.length,
        };
      } catch (error) {
        console.error(`Error processing chunk ${index + 1}:`, error);
        throw error;
      }
    });

    // 3. Wait for all TTS calls to complete
    const results = await Promise.all(ttsPromises);

    // 4. Sort by original index to maintain order
    results.sort((a, b) => a.index - b.index);

    // 5. Combine audio buffers
    const combinedBuffer = Buffer.concat(results.map((r) => r.buffer));

    // NEW: Verify all chunks were processed
    console.log(`Verification:`, {
      originalChunks: chunks.length,
      processedResults: results.length,
      totalCombinedSize: combinedBuffer.length,
      individualSizes: results.map((r) => r.size),
    });

    // 6. Save file
    const fileName = `tts_dynamic_${Date.now()}_${Math.random()
      .toString(36)
      .substring(7)}.mp3`;
    const filePath = path.join(process.cwd(), "storage", "audio", fileName);
    fs.writeFileSync(filePath, combinedBuffer);

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    console.log(`Dynamic TTS completed in ${processingTime}ms`);
    console.log(
      `${chunks.length} chunks processed, ${combinedBuffer.length} bytes total`
    );
    console.log(`Average time per chunk: ${processingTime / chunks.length}ms`);

    return {
      audioBuffer: combinedBuffer,
      audioFilePath: `/storage/audio/${fileName}`,
      processingTime,
      chunkCount: chunks.length,
      totalWords: text.split(/\s+/).length,
      efficiency: processingTime / chunks.length,
    };
  } catch (error) {
    console.error("Dynamic TTS error:", error);
    throw error;
  }
};
