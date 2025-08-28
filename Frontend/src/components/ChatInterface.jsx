import { useState, useEffect, useRef } from "react";
import { Bot, MessageSquare, Loader2, Mic, MessageCircle } from "lucide-react";
import { cn } from "../utils/cn";
import {
  useStartSessionMutation,
  useCreateMessageMutation,
  useGetSessionMessagesQuery,
} from "../redux/api/voiceBotApi";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import VoiceChat from "./VoiceChat";

const ChatInterface = ({ agent }) => {
  const [sessionId, setSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chatMode, setChatMode] = useState("text"); // 'text' or 'voice'
  const messagesEndRef = useRef(null);

  const [startSession] = useStartSessionMutation();
  const [createMessage] = useCreateMessageMutation();
  const { data: messagesResponse, refetch: refetchMessages } =
    useGetSessionMessagesQuery(sessionId, {
      skip: !sessionId,
      pollingInterval: 3000, // Poll every 3 seconds for new messages
    });
  const messages = messagesResponse?.data || [];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Start session when agent is selected
  useEffect(() => {
    if (agent && !sessionId) {
      handleStartSession();
    }
  }, [agent]);

  const handleStartSession = async () => {
    try {
      setIsLoading(true);
      const result = await startSession({ agent_id: agent.id }).unwrap();
      setSessionId(result.data.id);
    } catch (error) {
      console.error("Error starting session:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (text, audioFile = null) => {
    if (!sessionId || (!text && !audioFile)) return;

    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append("session_id", sessionId);
      formData.append("role", "user");
      formData.append("text", text || "Voice message");

      if (audioFile) {
        formData.append("audio", audioFile);
      }

      await createMessage(formData).unwrap();
      refetchMessages();
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceMessageReceived = (message) => {
    // Add the voice message to the local state immediately
    // The message will be fetched from server on next refetch
    refetchMessages();
  };

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
          <p className="text-gray-600">Starting conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-gray-50">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{agent.name}</h3>
          <p className="text-sm text-gray-500">
            {agent.documents?.length || 0} document
            {agent.documents?.length !== 1 ? "s" : ""} loaded
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Start a conversation
            </h3>
            <p className="text-gray-600">
              Send a message to start chatting with {agent.name}
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Mode Toggle */}
      <div className="border-t bg-white p-4">
        <div className="flex items-center justify-center gap-2 mb-4">
          <button
            onClick={() => setChatMode("text")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200",
              chatMode === "text"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            <MessageCircle className="w-4 h-4" />
            Text Chat
          </button>
          <button
            onClick={() => setChatMode("voice")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200",
              chatMode === "voice"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            <Mic className="w-4 h-4" />
            Voice Chat
          </button>
        </div>

        {/* Chat Input based on mode */}
        {chatMode === "text" ? (
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        ) : (
          <VoiceChat
            sessionId={sessionId}
            onMessageReceived={handleVoiceMessageReceived}
          />
        )}
      </div>
    </div>
  );
};

export default ChatInterface;
