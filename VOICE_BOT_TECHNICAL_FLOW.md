# Voice Bot - Complete Technical Flow Documentation

## Table of Contents

1. [Frontend Voice Recording](#frontend-voice-recording)
2. [WebSocket Communication](#websocket-communication)
3. [Backend Audio Processing](#backend-audio-processing)
4. [Speech-to-Text Flow](#speech-to-text-flow)
5. [AI Response Generation](#ai-response-generation)
6. [Text-to-Speech Flow](#text-to-speech-flow)
7. [Response Delivery](#response-delivery)
8. [File Locations Summary](#file-locations-summary)

## Frontend Voice Recording

### File: `Frontend/src/components/VoiceChat.jsx`

#### 1. Audio Recording Setup (Lines 236-305)

```javascript
const startRecording = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      sampleRate: 16000, // Optimal for Whisper
      channelCount: 1, // Mono for efficiency
      echoCancellation: true,
      noiseSuppression: true,
    },
  });

  mediaRecorder = new MediaRecorder(stream, {
    mimeType: "audio/webm;codecs=opus",
  });

  mediaRecorder.start(200); // 200ms chunks for real-time
};
```

#### 2. Audio Chunk Handling (Lines 76-126)

```javascript
mediaRecorder.ondataavailable = (event) => {
  if (event.data.size > 0) {
    const reader = new FileReader();
    reader.onload = () => {
      const base64Audio = reader.result.split(",")[1];

      // Send to backend via WebSocket
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

**Flow**: User speaks → 200ms chunks → WebM format → Base64 → WebSocket → Backend

## WebSocket Communication

### File: `Backend/util/voiceWebSocketService.js`

#### 1. WebSocket Server Setup (Lines 25-81)

```javascript
initialize(server) {
  this.wss = new WebSocketServer({ server });

  this.wss.on("connection", (ws, req) => {
    const clientId = this.generateClientId();
    this.clients.set(clientId, {
      ws,
      sessionId: null,
      audioChunks: [],          // Store incoming chunks
      textBuffer: "",
      isRecording: false,
      lastActivity: Date.now(),
    });
  });
}
```

#### 2. Audio Chunk Reception (Lines 156-194)

```javascript
async handleAudioChunk(clientId, message) {
  const client = this.clients.get(clientId);

  // Convert base64 to buffer
  const audioData = message.audioData;
  const audioBuffer = Buffer.from(audioData, "base64");

  // Add to client's audio chunks array
  client.audioChunks.push(audioBuffer);

  // Save for debugging
  await this.saveAudioChunk(clientId, audioBuffer, client.audioChunks.length);

  // Send acknowledgment
  client.ws.send(JSON.stringify({
    type: "audio_received",
    chunkIndex: client.audioChunks.length,
  }));
}
```

**Flow**: WebSocket receives chunks → Convert to Buffer → Store in array → Save debug files

## Backend Audio Processing

### File: `Backend/util/voiceWebSocketService.js`

#### 1. Stop Recording Handler (Lines 254-268)

```javascript
async handleStopRecording(clientId) {
  const client = this.clients.get(clientId);
  client.isRecording = false;

  // Save final complete audio
  await this.saveFinalCompleteAudio(clientId);

  // Process accumulated audio immediately
  await this.processAccumulatedAudio(clientId);
}
```

#### 2. Audio Chunk Storage (Lines 194-254)

```javascript
async saveAudioChunk(clientId, audioBuffer, chunkIndex) {
  // Create debug directory
  const debugDir = path.join(process.cwd(), "storage", "debug_audio");
  const clientDir = path.join(debugDir, clientId);

  // Save individual chunk
  const chunkFileName = `chunk_${chunkIndex}_${Date.now()}.webm`;
  fs.writeFileSync(path.join(clientDir, chunkFileName), audioBuffer);

  // Save combined audio (all chunks so far)
  const combinedBuffer = Buffer.concat(client.audioChunks);
  const combinedFileName = `complete_audio_${Date.now()}.webm`;
  fs.writeFileSync(path.join(clientDir, combinedFileName), combinedBuffer);
}
```

**Flow**: Stop recording → Save final audio → Process all accumulated chunks

## Speech-to-Text Flow

### File: `Backend/util/audioService.js`

#### 1. Audio Processing (Lines 100-150)

```javascript
export const speechToTextStream = async (audioChunks) => {
  // Convert all chunks to Buffer
  const chunks = [];
  for (const chunk of audioChunks) {
    if (chunk instanceof Buffer) {
      chunks.push(chunk);
    } else {
      chunks.push(Buffer.from(chunk));
    }
  }

  // Combine all chunks into single buffer
  const audioBuffer = Buffer.concat(chunks);

  // Validate audio buffer
  validateAudioBuffer(audioBuffer);

  // Create File object for OpenAI
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
};
```

#### 2. Audio Validation (File: `Backend/util/audioConverter.js`)

```javascript
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

**Flow**: Combine chunks → Validate buffer → Create File object → Whisper API → Return text

## AI Response Generation

### File: `Backend/util/voiceWebSocketService.js`

#### 1. Main Processing (Lines 324-414)

```javascript
async processAccumulatedAudio(clientId) {
  // Send processing status
  client.ws.send(JSON.stringify({
    type: "processing_audio",
    message: "Processing your voice input...",
  }));

  // Start STT and prepare for LLM simultaneously
  const sttPromise = speechToTextStream(client.audioChunks);
  const sessionPromise = sequelize.models.Session.findByPk(client.sessionId);

  // Wait for STT to complete
  const transcribedText = await sttPromise;

  if (!transcribedText || transcribedText.trim() === "") {
    client.ws.send(JSON.stringify({
      type: "no_speech_detected",
      message: "No speech detected in the audio",
    }));
    return;
  }

  // Send transcription confirmation
  client.ws.send(JSON.stringify({
    type: "transcription_complete",
    text: transcribedText,
  }));

  // Generate AI response
  await this.generateAndSendResponseOptimized(clientId, transcribedText, await sessionPromise);
}
```

### File: `Backend/util/aiService.js`

#### 2. AI Response Generation (Lines 25-80)

```javascript
export const generateBotResponse = async (sessionId, userMessage) => {
  // Check cache first
  const cachedResponse = getCachedResponse(userMessage);
  if (cachedResponse) {
    return cachedResponse;
  }

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
            include: [{ model: sequelize.models.Embedding, as: "embeddings" }],
          },
        ],
      },
    ],
  });

  // Parallel processing - context search and AI response
  const [relevantContext, aiResponse] = await Promise.all([
    getRelevantContext(userMessage, documents),
    generateResponseWithAI(userMessage, "", agent.prompt),
  ]);

  // Enhance response with context
  let finalResponse = aiResponse;
  if (relevantContext && relevantContext.trim()) {
    finalResponse = `${aiResponse}\n\nBased on the available context: ${relevantContext.substring(
      0,
      200
    )}`;
  }

  // Cache the response
  setCachedResponse(userMessage, finalResponse);
  return finalResponse;
};
```

#### 3. Context Retrieval (Lines 82-110)

```javascript
const getRelevantContext = async (userMessage, documents) => {
  // Create embedding for user message
  const queryEmbedding = await createQueryEmbedding(userMessage);

  // Find similar embeddings across documents
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

  return context.substring(0, 3000);
};
```

**Flow**: Transcribed text → Check cache → Get context → Generate AI response → Cache result

## Text-to-Speech Flow

### File: `Backend/util/audioService.js`

#### 1. Dynamic TTS Processing (Lines 200-280)

```javascript
export const textToSpeechDynamic = async (text) => {
  // Split text into optimal chunks
  const chunks = splitTextDynamically(text);

  // Process chunks in parallel with rate limiting
  const ttsPromises = chunks.map(async (chunk, index) => {
    // Add delay to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, index * 50));

    const speech = await openai.audio.speech.create({
      model: "tts-1",
      voice: "shimmer",
      input: chunk,
      response_format: "mp3",
    });

    const buffer = Buffer.from(await speech.arrayBuffer());
    return { index, buffer, text: chunk, size: buffer.length };
  });

  // Wait for all TTS calls to complete
  const results = await Promise.all(ttsPromises);
  results.sort((a, b) => a.index - b.index);

  // Combine audio buffers
  const combinedBuffer = Buffer.concat(results.map((r) => r.buffer));

  // Save file
  const fileName = `tts_dynamic_${Date.now()}_${Math.random()
    .toString(36)
    .substring(7)}.mp3`;
  const filePath = path.join(process.cwd(), "storage", "audio", fileName);
  fs.writeFileSync(filePath, combinedBuffer);

  return {
    audioBuffer: combinedBuffer,
    audioFilePath: `/storage/audio/${fileName}`,
    processingTime: Date.now() - startTime,
    chunkCount: chunks.length,
  };
};
```

#### 2. Text Chunking (Lines 150-200)

```javascript
const splitTextDynamically = (text) => {
  const wordsPerChunk = 15; // Optimal for TTS
  const words = text.split(/\s+/);
  const chunks = [];

  for (let i = 0; i < words.length; i += wordsPerChunk) {
    const chunkWords = words.slice(i, i + wordsPerChunk);
    const chunk = chunkWords.join(" ");
    if (chunk.trim()) {
      chunks.push(chunk.trim());
    }
  }

  return chunks;
};
```

**Flow**: AI response → Split into 15-word chunks → Parallel TTS processing → Combine audio → Save file

## Response Delivery

### File: `Backend/util/voiceWebSocketService.js`

#### 1. Response Generation (Lines 506-579)

```javascript
async generateAndSendResponseOptimized(clientId, userText, preloadedSession) {
  // Generate AI response
  const botResponse = await generateUltraFastResponse(client.sessionId, userText);

  // Parallel database operations + TTS
  const [userMessage, audioResult] = await Promise.all([
    // Save user message
    sequelize.models.Message.create({
      session_id: client.sessionId,
      role: "user",
      text: userText,
      audio_url: null,
    }),
    // Generate TTS
    this.generateOptimizedTTS(botResponse, ttsPreparation),
  ]);

  // Save bot message
  const botMessage = await sequelize.models.Message.create({
    session_id: client.sessionId,
    role: "bot",
    text: botResponse,
    audio_url: audioResult.audioFilePath,
  });

  // Send response to frontend
  const audioBase64 = audioResult.audioBuffer.toString("base64");
  client.ws.send(JSON.stringify({
    type: "bot_response",
    text: botResponse,
    audioData: audioBase64,
    audioUrl: audioResult.audioFilePath,
    messageId: botMessage.id,
  }));
}
```

### File: `Frontend/src/components/VoiceChat.jsx`

#### 2. Frontend Response Handling (Lines 126-156)

```javascript
const handleBotResponse = async (data) => {
  // Convert base64 audio to blob
  const audioData = atob(data.audioData);
  const audioArray = new Uint8Array(audioData.length);
  for (let i = 0; i < audioData.length; i++) {
    audioArray[i] = audioData.charCodeAt(i);
  }

  const audioBlob = new Blob([audioArray], { type: "audio/mp3" });

  // Play audio automatically
  await playAudioWithControls(audioBlob);

  // Update UI
  if (onMessageReceived) {
    onMessageReceived({
      role: "bot",
      text: data.text,
      audioUrl: data.audioUrl,
      messageId: data.messageId,
      timestamp: new Date(),
    });
  }
};
```

#### 3. Audio Playback (Lines 156-206)

```javascript
const playAudioWithControls = async (audioBlob) => {
  // Stop any currently playing audio
  stopAudio();

  // Create audio URL from blob
  const audioUrl = URL.createObjectURL(audioBlob);

  // Create and play audio
  audioRef.current = new Audio(audioUrl);
  await audioRef.current.play();
  setIsPlaying(true);

  // Clean up URL after playing
  audioRef.current.onended = () => {
    URL.revokeObjectURL(audioUrl);
    setIsPlaying(false);
  };
};
```

**Flow**: AI response → TTS processing → Base64 encoding → WebSocket → Frontend → Audio playback

## File Locations Summary

### Frontend Files

| Component     | File                                        | Purpose                     |
| ------------- | ------------------------------------------- | --------------------------- |
| VoiceChat     | `Frontend/src/components/VoiceChat.jsx`     | Voice recording & WebSocket |
| AudioPlayer   | `Frontend/src/components/AudioPlayer.jsx`   | Audio playback controls     |
| ChatInterface | `Frontend/src/components/ChatInterface.jsx` | Chat UI                     |

### Backend Files

| Service    | File                                    | Purpose                 |
| ---------- | --------------------------------------- | ----------------------- |
| WebSocket  | `Backend/util/voiceWebSocketService.js` | Real-time communication |
| Audio      | `Backend/util/audioService.js`          | STT & TTS processing    |
| AI         | `Backend/util/aiService.js`             | LLM & context retrieval |
| Embeddings | `Backend/util/embeddingService.js`      | Vector embeddings       |
| Pinecone   | `Backend/util/pineconeService.js`       | Vector database         |

### Database Files

| Type       | Location              | Purpose              |
| ---------- | --------------------- | -------------------- |
| Models     | `Backend/models/`     | Sequelize ORM models |
| Migrations | `Backend/migrations/` | Database schema      |
| Services   | `Backend/service/`    | Business logic       |

## Complete Flow Summary

1. **User Speaks** → Frontend captures 200ms audio chunks
2. **WebSocket** → Sends base64 chunks to backend
3. **Backend** → Stores chunks, combines into complete audio
4. **Whisper API** → Converts speech to text
5. **AI Processing** → Generates response with context
6. **TTS API** → Converts response to speech in chunks
7. **WebSocket** → Sends audio back to frontend
8. **Frontend** → Plays audio automatically

**Key Optimizations**:

- 200ms audio chunks for real-time processing
- Parallel STT and session loading
- 15-word TTS chunks with rate limiting
- Response caching for repeated queries
- Debug file saving for troubleshooting
