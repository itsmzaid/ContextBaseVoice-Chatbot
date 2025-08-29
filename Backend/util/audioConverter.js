import fs from "fs";
import path from "path";

// Convert Int16Array audio buffer to WAV format
export const convertAudioToWav = async (audioBuffer) => {
  try {
    // If buffer is already a Buffer, use it directly
    if (Buffer.isBuffer(audioBuffer)) {
      // Check if it's already WAV format
      if (
        audioBuffer.length >= 4 &&
        audioBuffer.toString("ascii", 0, 4) === "RIFF"
      ) {
        return audioBuffer;
      }

      // Assume it's raw PCM data and convert to WAV
      return createWavFromPCM(audioBuffer);
    }

    // If it's an ArrayBuffer or Int16Array, convert to Buffer first
    let buffer;
    if (audioBuffer instanceof ArrayBuffer) {
      buffer = Buffer.from(audioBuffer);
    } else if (audioBuffer instanceof Int16Array) {
      buffer = Buffer.from(audioBuffer.buffer);
    } else {
      throw new Error("Unsupported audio format");
    }

    return createWavFromPCM(buffer);
  } catch (error) {
    console.error("Error converting audio to WAV:", error);
    throw error;
  }
};

// Create WAV file from PCM data
function createWavFromPCM(pcmBuffer) {
  const sampleRate = 16000; // 16kHz sample rate to match frontend
  const channels = 1; // Mono
  const bitsPerSample = 16;
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const fileSize = 36 + dataSize;

  // Create WAV header
  const wavHeader = Buffer.alloc(44);

  // RIFF header
  wavHeader.write("RIFF", 0);
  wavHeader.writeUInt32LE(fileSize, 4);
  wavHeader.write("WAVE", 8);

  // fmt chunk
  wavHeader.write("fmt ", 12);
  wavHeader.writeUInt32LE(16, 16); // fmt chunk size
  wavHeader.writeUInt16LE(1, 20); // PCM format
  wavHeader.writeUInt16LE(channels, 22);
  wavHeader.writeUInt32LE(sampleRate, 24);
  wavHeader.writeUInt32LE(byteRate, 28);
  wavHeader.writeUInt16LE(blockAlign, 32);
  wavHeader.writeUInt16LE(bitsPerSample, 34);

  // data chunk
  wavHeader.write("data", 36);
  wavHeader.writeUInt32LE(dataSize, 40);

  // Combine header and PCM data
  const wavBuffer = Buffer.concat([wavHeader, pcmBuffer]);

  return wavBuffer;
}

// Validate audio buffer
export const validateAudioBuffer = (buffer) => {
  if (!buffer || buffer.length === 0) {
    throw new Error("Empty audio buffer");
  }

  if (buffer.length < 2048) {
    throw new Error("Audio buffer too small (less than 2KB)");
  }

  return true;
};
