import { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  Loader2,
  AlertCircle,
  Pause,
  Play,
  VolumeX,
} from "lucide-react";
import { cn } from "../utils/cn";

const VoiceChat = ({ sessionId, onMessageReceived }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [error, setError] = useState(null);

  // NEW: Audio control states
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  // WebSocket connection with optimization
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    // Direct WebSocket URL for local testing
    const wsUrl = "ws://3afb8def0500.ngrok-free.app";

    console.log("Connecting to WebSocket:", wsUrl);
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.binaryType = "arraybuffer";

    wsRef.current.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      setConnectionStatus("connected");
      setError(null);
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    wsRef.current.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
      setConnectionStatus("disconnected");
      setIsRecording(false);
    };

    wsRef.current.onerror = (error) => {
      console.error("WebSocket error:", error);
      setError("Connection error");
      setConnectionStatus("error");
    };
  }, []);

  // Handle WebSocket messages
  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case "connection_established":
        console.log("Voice connection established:", data.clientId);
        break;

      case "session_started":
        console.log("Voice session started");
        break;

      case "audio_received":
        console.log("Audio chunk received:", data.chunkIndex);
        break;

      case "processing_audio":
        setIsProcessing(true);
        break;

      case "transcription_complete":
        console.log("Transcription:", data.text);
        setIsProcessing(false);
        break;

      case "generating_response":
        setIsProcessing(true);
        break;

      case "bot_response":
        handleBotResponse(data);
        setIsProcessing(false);
        break;

      case "no_speech_detected":
        setIsProcessing(false);
        setError("No speech detected");
        setTimeout(() => setError(null), 3000);
        break;

      case "error":
        setIsProcessing(false);
        setError(data.message);
        setTimeout(() => setError(null), 5000);
        break;

      default:
        console.log("Unknown message type:", data.type);
    }
  };

  // Handle bot response
  const handleBotResponse = async (data) => {
    try {
      // Convert base64 audio to blob
      const audioData = atob(data.audioData);
      const audioArray = new Uint8Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        audioArray[i] = audioData.charCodeAt(i);
      }
      const audioBlob = new Blob([audioArray], { type: "audio/mp3" });

      // Play audio with controls
      await playAudioWithControls(audioBlob);

      // Notify parent component about new message
      if (onMessageReceived) {
        onMessageReceived({
          id: data.messageId,
          role: "bot",
          text: data.text,
          audio_url: data.audioUrl,
          created_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error handling bot response:", error);
      setError("Error playing audio response");
    }
  };

  // NEW: Play audio with controls
  const playAudioWithControls = async (audioBlob) => {
    try {
      // Stop any currently playing audio
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      // Set up audio event listeners
      audio.addEventListener("loadedmetadata", () => {
        setAudioDuration(audio.duration);
        setAudioProgress(0);
      });

      audio.addEventListener("timeupdate", () => {
        setAudioProgress(audio.currentTime);
      });

      audio.addEventListener("play", () => {
        setIsAudioPlaying(true);
      });

      audio.addEventListener("pause", () => {
        setIsAudioPlaying(false);
      });

      audio.addEventListener("ended", () => {
        setIsAudioPlaying(false);
        setAudioProgress(0);
        setCurrentAudio(null);
        URL.revokeObjectURL(audioUrl);
      });

      // Store current audio reference
      setCurrentAudio(audio);

      // Auto-play the audio
      await audio.play();

      console.log("Audio started playing with controls");
    } catch (error) {
      console.error("Error playing audio with controls:", error);
      throw error;
    }
  };

  // NEW: Stop audio
  const stopAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setIsAudioPlaying(false);
      setAudioProgress(0);
      setCurrentAudio(null);
      console.log("Audio stopped by user");
    }
  };

  // NEW: Toggle audio play/pause
  const toggleAudio = () => {
    if (currentAudio) {
      if (isAudioPlaying) {
        currentAudio.pause();
      } else {
        currentAudio.play();
      }
    }
  };

  // NEW: Format time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Start recording
  const startRecording = async () => {
    try {
      setError(null);

      // Get microphone permission with optimal settings for transcription
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000, // 16kHz is optimal for speech recognition
          channelCount: 1, // Mono
          autoGainControl: false, // Disable auto gain for better accuracy
          echoCancellation: true, // Remove echo
          noiseSuppression: false, // Disable noise suppression for medical speech
          latency: 0, // Low latency
        },
      });

      streamRef.current = stream;

      // Create MediaRecorder with better audio format for transcription
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
        audioBitsPerSecond: 128000, // Higher bitrate for better quality
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);

          // Convert blob to base64 and send
          const reader = new FileReader();
          reader.onload = () => {
            const base64Data = reader.result.split(",")[1];
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(
                JSON.stringify({
                  type: "audio_chunk",
                  audioData: base64Data,
                })
              );
            }
          };
          reader.readAsDataURL(event.data);
        }
      };

      // Start recording with optimized chunk size
      mediaRecorder.start(500);
      setIsRecording(true);

      // Start voice session
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "start_session",
            sessionId: sessionId,
          })
        );
      }
    } catch (error) {
      console.error("Error starting recording:", error);
      setError("Failed to access microphone");
    }
  };

  // Stop recording
  const stopRecording = () => {
    try {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      // Send stop recording message
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "stop_recording",
          })
        );
      }
    } catch (error) {
      console.error("Error stopping recording:", error);
    }
  };

  // Connect on mount
  useEffect(() => {
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      // NEW: Cleanup audio
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
    };
  }, [connectWebSocket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {/* Connection Status */}
      <div className="flex items-center gap-2 text-sm">
        <div
          className={cn(
            "w-2 h-2 rounded-full",
            connectionStatus === "connected" && "bg-green-500",
            connectionStatus === "disconnected" && "bg-gray-400",
            connectionStatus === "error" && "bg-red-500"
          )}
        />
        <span
          className={cn(
            connectionStatus === "connected" && "text-green-600",
            connectionStatus === "disconnected" && "text-gray-600",
            connectionStatus === "error" && "text-red-600"
          )}
        >
          {connectionStatus === "connected" && "Connected"}
          {connectionStatus === "disconnected" && "Disconnected"}
          {connectionStatus === "error" && "Connection Error"}
        </span>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* NEW: Audio Player Controls */}
      {currentAudio && (
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-4 border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">
                Bot Response
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {formatTime(audioProgress)} / {formatTime(audioDuration)}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-100"
              style={{
                width: `${
                  audioDuration > 0 ? (audioProgress / audioDuration) * 100 : 0
                }%`,
              }}
            />
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={toggleAudio}
              className={cn(
                "p-2 rounded-full transition-all duration-200",
                isAudioPlaying
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-blue-500 hover:bg-blue-600 text-white"
              )}
            >
              {isAudioPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={stopAudio}
              className="p-2 rounded-full bg-gray-500 hover:bg-gray-600 text-white transition-all duration-200"
            >
              <VolumeX className="w-4 h-4" />
            </button>
          </div>

          {/* Status Text */}
          <div className="text-center mt-2">
            <p className="text-xs text-gray-600">
              {isAudioPlaying ? "Playing..." : "Paused"}
            </p>
          </div>
        </div>
      )}

      {/* Voice Button */}
      <button
        onClick={handleToggleRecording}
        disabled={!isConnected || isProcessing || isAudioPlaying}
        className={cn(
          "relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200",
          "focus:outline-none focus:ring-4 focus:ring-blue-300",
          isRecording && "bg-red-500 hover:bg-red-600 text-white",
          !isRecording &&
            isConnected &&
            !isAudioPlaying &&
            "bg-blue-500 hover:bg-blue-600 text-white",
          (!isConnected || isAudioPlaying) &&
            "bg-gray-400 cursor-not-allowed text-gray-600",
          isProcessing && "animate-pulse"
        )}
      >
        {isProcessing ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : isRecording ? (
          <MicOff className="w-6 h-6" />
        ) : (
          <Mic className="w-6 h-6" />
        )}

        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
        )}
      </button>

      {/* Status Text */}
      <div className="text-center">
        {isProcessing && <p className="text-sm text-gray-600">Processing...</p>}
        {isRecording && !isProcessing && (
          <p className="text-sm text-red-600">Recording... Click to stop</p>
        )}
        {isAudioPlaying && !isRecording && !isProcessing && (
          <p className="text-sm text-blue-600">
            Bot is speaking... You can stop it
          </p>
        )}
        {!isRecording && !isProcessing && !isAudioPlaying && isConnected && (
          <p className="text-sm text-gray-600">Click to start voice chat</p>
        )}
        {!isConnected && <p className="text-sm text-gray-500">Connecting...</p>}
      </div>

      {/* Instructions */}
      <div className="text-xs text-gray-500 text-center max-w-xs">
        Speak clearly and pause for 4 seconds to automatically send your message
      </div>
    </div>
  );
};

export default VoiceChat;
