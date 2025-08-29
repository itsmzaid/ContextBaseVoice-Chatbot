# Voice Bot - Complete Technical Flow Documentation

## Table of Contents

1. [Project Architecture Overview](#project-architecture-overview)
2. [Frontend Voice Recording Flow](#frontend-voice-recording-flow)
3. [WebSocket Communication Flow](#websocket-communication-flow)
4. [Backend Audio Processing Flow](#backend-audio-processing-flow)
5. [Speech-to-Text Processing](#speech-to-text-processing)
6. [AI Response Generation Flow](#ai-response-generation-flow)
7. [Text-to-Speech Processing](#text-to-speech-processing)
8. [Response Delivery Flow](#response-delivery-flow)
9. [File Structure and Code Locations](#file-structure-and-code-locations)
10. [Performance Optimizations](#performance-optimizations)

## Project Architecture Overview

The voice bot application follows a real-time architecture with the following components:

```
Frontend (React) ←→ WebSocket ←→ Backend (Node.js) ←→ AI Services (OpenAI)
     ↓                    ↓              ↓                    ↓
Voice Recording    Real-time Comm    Audio Processing    GPT/Whisper/TTS
```

## Frontend Voice Recording Flow

### 1. Voice Recording Component

**File Location**: `Frontend/src/components/VoiceChat.jsx`

#### Audio Recording Setup

```javascript
// Lines 236-305: startRecording function
const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    // Create MediaRecorder with 200ms chunks
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: "audio/webm;codecs=opus",
    });

    // Start recording with 200ms chunks
    mediaRecorder.start(200);
  } catch (error) {
    console.error("Error starting recording:", error);
  }
};
```

**Key Points**:

- **Sample Rate**: 16kHz for optimal Whisper performance
- **Chunk Size**: 200ms chunks for real-time processing
- **Audio Format**: WebM with Opus codec
- **Channels**: Mono (1 channel) for better processing

#### Audio Chunk Handling

```javascript
// Lines 76-126: handleWebSocketMessage function
mediaRecorder.ondataavailable = (event) => {
  if (event.data.size > 0) {
    // Convert blob to base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64Audio = reader.result.split(",")[1];

      // Send chunk to backend via WebSocket
      ws.send(
        JSON.stringify({
          type: "audio_chunk",
          audioData: base64Audio,
        })
      );
    };
    reader.readAsDataURL(event.data);
  }
};
```

**Flow Explanation**:

1. **MediaRecorder** captures audio in 200ms chunks
2. **FileReader** converts each chunk to base64
3. **WebSocket** sends chunk to backend immediately
4. **Real-time streaming** ensures minimal latency

## WebSocket Communication Flow

### 1. WebSocket Connection Setup

**File Location**: `Frontend/src/components/VoiceChat.jsx`

```javascript
// Lines 14-76: WebSocket initialization
const ws = new WebSocket(`ws://localhost:5000`);

ws.onopen = () => {
  console.log("WebSocket connected");
  // Send session start message
  ws.send(
    JSON.stringify({
      type: "start_session",
      sessionId: sessionId,
    })
  );
};
```

### 2. Backend WebSocket Service

**File Location**: `Backend/util/voiceWebSocketService.js`

#### WebSocket Server Initialization

```javascript
// Lines 25-81: initialize function
initialize(server) {
  this.wss = new WebSocketServer({ server });

  this.wss.on("connection", (ws, req) => {
    const clientId = this.generateClientId();
    this.clients.set(clientId, {
      ws,
      sessionId: null,
      audioChunks: [],
      textBuffer: "",
      isRecording: false,
      lastActivity: Date.now(),
    });
  });
}
```

#### Audio Chunk Reception

```javascript
// Lines 156-194: handleAudioChunk function
async handleAudioChunk(clientId, message) {
  const client = this.clients.get(clientId);
  if (!client || !client.isRecording) return;

  try {
    // Convert base64 to buffer
    const audioData = message.audioData;
    const audioBuffer = Buffer.from(audioData, "base64");

    // Add to client's audio chunks array
    client.audioChunks.push(audioBuffer);

    // Save chunk for debugging
    await this.saveAudioChunk(clientId, audioBuffer, client.audioChunks.length);

    // Send acknowledgment
    client.ws.send(JSON.stringify({
      type: "audio_received",
      chunkIndex: client.audioChunks.length,
    }));
  } catch (error) {
    console.error("Error handling audio chunk:", error);
  }
}
```

**Flow Explanation**:

1. **Frontend** sends base64 audio chunks via WebSocket
2. **Backend** converts base64 to Buffer
3. **Chunks** are stored in client's audioChunks array
4. **Debug files** are saved for troubleshooting
5. **Acknowledgment** sent back to frontend

## Backend Audio Processing Flow

### 1. Audio Chunk Storage and Debugging

**File Location**: `Backend/util/voiceWebSocketService.js`

```javascript
// Lines 194-254: saveAudioChunk function
async saveAudioChunk(clientId, audioBuffer, chunkIndex) {
  try {
    const fs = await import("fs");
    const path = await import("path");

    // Create debug directory structure
    const debugDir = path.join(process.cwd(), "storage", "debug_audio");
    const clientDir = path.join(debugDir, clientId);

    // Save individual chunk
    const chunkFileName = `chunk_${chunkIndex}_${Date.now()}.webm`;
    const chunkPath = path.join(clientDir, chunkFileName);
    fs.writeFileSync(chunkPath, audioBuffer);

    // Save combined audio (all chunks so far)
    const combinedBuffer = Buffer.concat(client.audioChunks);
    const combinedFileName = `complete_audio_${Date.now()}.webm`;
    const combinedPath = path.join(clientDir, combinedFileName);
    fs.writeFileSync(combinedPath, combinedBuffer);
  } catch (error) {
    console.error("Error saving audio chunk:", error);
  }
}
```

### 2. Stop Recording and Process Audio

**File Location**: `Backend/util/voiceWebSocketService.js`

```javascript
// Lines 254-268: handleStopRecording function
async handleStopRecording(clientId) {
  const client = this.clients.get(clientId);
  if (!client) return;

  client.isRecording = false;
  this.clearSilenceTimer(clientId);

  // Save final complete audio
  await this.saveFinalCompleteAudio(clientId);

  // Process accumulated audio immediately
  await this.processAccumulatedAudio(clientId);
}
```

## Speech-to-Text Processing

### 1. Audio Chunk Combination

**File Location**: `Backend/util/audioService.js`

```javascript
// Lines 100-150: speechToTextStream function
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
        const arrayBuffer = await chunk.arrayBuffer();
        chunks.push(Buffer.from(arrayBuffer));
      }
    }

    // Combine all chunks into a single buffer
    const audioBuffer = Buffer.concat(chunks);
    console.log("Combined audio buffer size:", audioBuffer.length, "bytes");

    // Validate audio buffer
    validateAudioBuffer(audioBuffer);

    // Create File object for OpenAI Whisper
    const audioFile = new File([audioBuffer], "audio.webm", {
      type: "audio/webm",
    });

    // Transcribe using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      response_format: "text",
      language: "en",
      temperature: 0.0,
      prompt: "Transcribe exactly.",
    });

    return transcription;
  } catch (error) {
    console.error("Error in streaming speech-to-text:", error);
    throw error;
  }
};
```

**Flow Explanation**:

1. **Chunk Conversion**: Convert all audio chunks to Buffer format
2. **Buffer Concatenation**: Combine all chunks into single audio buffer
3. **File Creation**: Create File object for OpenAI API
4. **Whisper API Call**: Send to OpenAI Whisper for transcription
5. **Text Return**: Return transcribed text

### 2. Audio Validation

**File Location**: `Backend/util/audioConverter.js`

```javascript
// Lines 80-94: validateAudioBuffer function
export const validateAudioBuffer = (buffer) => {
  if (!buffer || buffer.length === 0) {
    throw new Error("Empty audio buffer");
  }

  if (buffer.length < 2048) {
    throw new Error("Audio buffer too small (less than 2KB)");
  }

  return true;
};
```

## AI Response Generation Flow

### 1. Main Processing Function

**File Location**: `Backend/util/voiceWebSocketService.js`

```javascript
// Lines 324-414: processAccumulatedAudio function
async processAccumulatedAudio(clientId) {
  const client = this.clients.get(clientId);
  if (!client || client.audioChunks.length === 0) return;

  try {
    console.log(`Processing ${client.audioChunks.length} audio chunks for client ${clientId}`);

    // Send processing status
    client.ws.send(JSON.stringify({
      type: "processing_audio",
      message: "Processing your voice input...",
    }));

    // Start STT and prepare for LLM simultaneously
    const startTime = Date.now();

    // Start STT processing
    const sttPromise = speechToTextStream(client.audioChunks);

    // Prepare session data for LLM (non-blocking)
    const sessionPromise = sequelize.models.Session.findByPk(client.sessionId, {
      include: [{ model: sequelize.models.Agent, as: "agent" }]
    });

    // Wait for STT to complete
    const transcribedText = await sttPromise;
    const sttTime = Date.now() - startTime;
    console.log(`STT completed in ${sttTime}ms`);

    if (!transcribedText || transcribedText.trim() === "") {
      client.ws.send(JSON.stringify({
        type: "no_speech_detected",
        message: "No speech detected in the audio",
      }));
      return;
    }

    console.log(`Transcribed text: "${transcribedText}"`);

    // Send transcription confirmation
    client.ws.send(JSON.stringify({
      type: "transcription_complete",
      text: transcribedText,
      fullText: client.textBuffer.trim(),
    }));

    // Generate AI response with ultra-fast parallel processing
    const responseStartTime = Date.now();
    await this.generateAndSendResponseOptimized(clientId, transcribedText, await sessionPromise);

    // Track performance
    const totalResponseTime = Date.now() - responseStartTime;
    this.trackPerformance(totalResponseTime);

    // Clear audio chunks for next recording
    client.audioChunks = [];
  } catch (error) {
    console.error("Error processing accumulated audio:", error);
  }
}
```

### 2. AI Response Generation

**File Location**: `Backend/util/aiService.js`

```javascript
// Lines 25-80: generateBotResponse function
export const generateBotResponse = async (sessionId, userMessage) => {
  try {
    // Check cache first for instant response
    const cachedResponse = getCachedResponse(userMessage);
    if (cachedResponse) {
      console.log("Cache hit - instant response!");
      return cachedResponse;
    }

    console.log("Starting optimized bot response generation...");
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
                { model: sequelize.models.Embedding, as: "embeddings" },
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

    // Parallel processing - context search and AI response simultaneously
    const [relevantContext, aiResponse] = await Promise.all([
      getRelevantContext(userMessage, documents),
      generateResponseWithAI(userMessage, "", agent.prompt),
    ]);

    // If context found, enhance the response
    let finalResponse = aiResponse;
    if (relevantContext && relevantContext.trim()) {
      finalResponse = `${aiResponse}\n\nBased on the available context: ${relevantContext.substring(
        0,
        200
      )}`;
    }

    const endTime = Date.now();
    console.log(`Bot response generated in ${endTime - startTime}ms`);

    // Cache the response for future use
    setCachedResponse(userMessage, finalResponse);

    return finalResponse;
  } catch (error) {
    console.error("Error generating bot response:", error);
    return "I'm sorry, I encountered an error while processing your request.";
  }
};
```

### 3. Context Retrieval

**File Location**: `Backend/util/aiService.js`

```javascript
// Lines 82-110: getRelevantContext function
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
    return "";
  }
};
```

## Text-to-Speech Processing

### 1. Dynamic TTS Processing

**File Location**: `Backend/util/audioService.js`

```javascript
// Lines 200-280: textToSpeechDynamic function
export const textToSpeechDynamic = async (text) => {
  try {
    console.log("Starting dynamic parallel TTS processing...");
    const startTime = Date.now();

    // Analyze text and calculate optimal chunks
    const chunks = splitTextDynamically(text);
    console.log(`Text split into ${chunks.length} optimal chunks`);

    // Process chunks in parallel with rate limiting
    const ttsPromises = chunks.map(async (chunk, index) => {
      // Add small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, index * 50));

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

    // Wait for all TTS calls to complete
    const results = await Promise.all(ttsPromises);

    // Sort by original index to maintain order
    results.sort((a, b) => a.index - b.index);

    // Combine audio buffers
    const combinedBuffer = Buffer.concat(results.map((r) => r.buffer));

    // Save file
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
```

### 2. Text Chunking for TTS

**File Location**: `Backend/util/audioService.js`

```javascript
// Lines 150-200: splitTextDynamically function
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

  // Simple and reliable text splitting
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
```

## Response Delivery Flow

### 1. Backend Response Generation

**File Location**: `Backend/util/voiceWebSocketService.js`

```javascript
// Lines 506-579: generateAndSendResponseOptimized function
async generateAndSendResponseOptimized(clientId, userText, preloadedSession) {
  const client = this.clients.get(clientId);
  if (!client || !client.sessionId) return;

  try {
    console.log(`Generating ULTRA-FAST AI response for: "${userText}"`);
    const startTime = Date.now();

    // Send processing status
    client.ws.send(JSON.stringify({
      type: "generating_response",
      message: "Generating response...",
    }));

    // Sequential processing - LLM first, then TTS preparation
    const botResponse = await generateUltraFastResponse(client.sessionId, userText);
    const ttsPreparation = await this.prepareTTSOptimization(botResponse);

    const llmTime = Date.now() - startTime;
    console.log(`LLM response generated in ${llmTime}ms: "${botResponse}"`);

    // Parallel database operations + TTS
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

    // Send bot response as audio
    const audioBase64 = audioResult.audioBuffer.toString("base64");
    client.ws.send(JSON.stringify({
      type: "bot_response",
      text: botResponse,
      audioData: audioBase64,
      audioUrl: audioResult.audioFilePath,
      messageId: botMessage.id,
    }));

    const totalTime = Date.now() - startTime;
    console.log(`ULTRA-FAST response completed in ${totalTime}ms`);
    console.log(`Performance: LLM=${llmTime}ms, TTS=${audioResult.processingTime}ms`);
  } catch (error) {
    console.error("Error in ultra-fast response generation:", error);
    // Fallback to original method
    await this.generateAndSendResponse(clientId, userText);
  }
}
```

### 2. Frontend Response Handling

**File Location**: `Frontend/src/components/VoiceChat.jsx`

```javascript
// Lines 126-156: handleBotResponse function
const handleBotResponse = async (data) => {
  try {
    console.log("Received bot response:", data);

    // Convert base64 audio to blob
    const audioData = atob(data.audioData);
    const audioArray = new Uint8Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
      audioArray[i] = audioData.charCodeAt(i);
    }

    const audioBlob = new Blob([audioArray], { type: "audio/mp3" });

    // Play audio automatically
    await playAudioWithControls(audioBlob);

    // Update UI with bot response
    if (onMessageReceived) {
      onMessageReceived({
        role: "bot",
        text: data.text,
        audioUrl: data.audioUrl,
        messageId: data.messageId,
        timestamp: new Date(),
      });
    }
  } catch (error) {
    console.error("Error handling bot response:", error);
  }
};
```

### 3. Audio Playback

**File Location**: `Frontend/src/components/VoiceChat.jsx`

```javascript
// Lines 156-206: playAudioWithControls function
const playAudioWithControls = async (audioBlob) => {
  try {
    // Stop any currently playing audio
    stopAudio();

    // Create audio URL from blob
    const audioUrl = URL.createObjectURL(audioBlob);

    // Create audio element
    audioRef.current = new Audio(audioUrl);

    // Set up audio event listeners
    audioRef.current.onloadedmetadata = () => {
      setAudioDuration(audioRef.current.duration);
    };

    audioRef.current.ontimeupdate = () => {
      setAudioCurrentTime(audioRef.current.currentTime);
    };

    audioRef.current.onended = () => {
      setIsPlaying(false);
      setAudioCurrentTime(0);
    };

    // Play audio
    await audioRef.current.play();
    setIsPlaying(true);

    // Clean up URL after playing
    audioRef.current.onended = () => {
      URL.revokeObjectURL(audioUrl);
      setIsPlaying(false);
      setAudioCurrentTime(0);
    };
  } catch (error) {
    console.error("Error playing audio:", error);
  }
};
```

## File Structure and Code Locations

### Frontend Files

| Component     | File Location                               | Purpose                                          |
| ------------- | ------------------------------------------- | ------------------------------------------------ |
| VoiceChat     | `Frontend/src/components/VoiceChat.jsx`     | Main voice recording and WebSocket communication |
| AudioPlayer   | `Frontend/src/components/AudioPlayer.jsx`   | Audio playback controls                          |
| ChatInterface | `Frontend/src/components/ChatInterface.jsx` | Chat UI and message handling                     |

### Backend Files

| Service           | File Location                           | Purpose                                       |
| ----------------- | --------------------------------------- | --------------------------------------------- |
| WebSocket Service | `Backend/util/voiceWebSocketService.js` | Real-time communication and audio processing  |
| Audio Service     | `Backend/util/audioService.js`          | Speech-to-text and text-to-speech             |
| AI Service        | `Backend/util/aiService.js`             | LLM response generation and context retrieval |
| Embedding Service | `Backend/util/embeddingService.js`      | Vector embeddings for document search         |
| Pinecone Service  | `Backend/util/pineconeService.js`       | Vector database operations                    |

### Database Files

| Type       | File Location         | Purpose                     |
| ---------- | --------------------- | --------------------------- |
| Models     | `Backend/models/`     | Sequelize ORM models        |
| Migrations | `Backend/migrations/` | Database schema definitions |
| Services   | `Backend/service/`    | Database business logic     |

### Configuration Files

| File            | Location                     | Purpose                      |
| --------------- | ---------------------------- | ---------------------------- |
| Database Config | `Backend/config/config.json` | Database connection settings |
| Environment     | `Backend/.env`               | API keys and configuration   |
| Package Config  | `Backend/package.json`       | Dependencies and scripts     |

## Performance Optimizations

### 1. Audio Processing Optimizations

**Chunk Size Optimization**:

- **200ms chunks** for optimal real-time processing
- **16kHz sample rate** for Whisper compatibility
- **Mono channel** for reduced processing load

**Parallel Processing**:

```javascript
// Parallel STT and session loading
const [transcribedText, session] = await Promise.all([
  speechToTextStream(client.audioChunks),
  sequelize.models.Session.findByPk(client.sessionId),
]);
```

### 2. TTS Optimizations

**Dynamic Chunking**:

- **15 words per chunk** for optimal TTS performance
- **Parallel TTS processing** with rate limiting
- **50ms delays** between chunks to avoid API limits

**Caching**:

```javascript
// Response caching for repeated queries
const cachedResponse = getCachedResponse(userMessage);
if (cachedResponse) {
  return cachedResponse;
}
```

### 3. Database Optimizations

**Indexes**:

- **User ID indexes** for fast user queries
- **Session ID indexes** for message retrieval
- **Document ID indexes** for embedding searches

**Connection Pooling**:

```javascript
// Sequelize connection pooling
const sequelize = new Sequelize(database, username, password, {
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});
```

### 4. Memory Management

**Audio Buffer Cleanup**:

```javascript
// Clear audio chunks after processing
client.audioChunks = [];

// Clean up audio URLs
URL.revokeObjectURL(audioUrl);
```

**File Cleanup**:

- **Debug files** saved for troubleshooting
- **Temporary files** cleaned up automatically
- **Storage limits** to prevent disk space issues

## Complete Flow Summary

### 1. User Speaks (Frontend)

1. **VoiceChat.jsx** captures audio in 200ms chunks
2. **MediaRecorder** converts to WebM format
3. **FileReader** converts to base64
4. **WebSocket** sends chunks to backend

### 2. Backend Receives (WebSocket Service)

1. **voiceWebSocketService.js** receives base64 chunks
2. **Buffer conversion** from base64
3. **Chunk storage** in client's audioChunks array
4. **Debug file saving** for troubleshooting

### 3. Audio Processing (Audio Service)

1. **speechToTextStream** combines all chunks
2. **Buffer concatenation** creates complete audio
3. **File creation** for OpenAI API
4. **Whisper API call** for transcription

### 4. AI Response (AI Service)

1. **generateBotResponse** processes user text
2. **Context retrieval** from document embeddings
3. **LLM API call** to OpenAI GPT
4. **Response caching** for future use

### 5. Speech Generation (Audio Service)

1. **textToSpeechDynamic** splits response into chunks
2. **Parallel TTS** processing with rate limiting
3. **Audio combination** from multiple chunks
4. **File saving** to storage

### 6. Response Delivery (WebSocket Service)

1. **Base64 conversion** of audio buffer
2. **WebSocket message** with audio data
3. **Database saving** of messages
4. **Frontend playback** of response

This complete flow ensures real-time voice communication with minimal latency and optimal performance through parallel processing, caching, and efficient audio handling.
