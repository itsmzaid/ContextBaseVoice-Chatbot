import { User, Bot } from "lucide-react";
import { cn } from "../utils/cn";
import AudioPlayer from "./AudioPlayer";
import MarkdownText from "./MarkdownText";

const MessageBubble = ({ message }) => {
  const isUser = message.role === "user";
  const timestamp = new Date(message.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={cn(
        "flex gap-3 mb-4",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
          isUser ? "bg-blue-500" : "bg-gray-500"
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      <div
        className={cn(
          "flex flex-col max-w-[70%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "rounded-lg px-4 py-3 shadow-sm",
            isUser
              ? "bg-blue-500 text-white rounded-br-md"
              : "bg-white border border-gray-200 text-gray-900 rounded-bl-md"
          )}
        >
          <MarkdownText text={message.text} className="text-sm" />
        </div>

        {message.audio_url && !isUser && (
          <div className="mt-2 w-full">
            <AudioPlayer audioUrl={message.audio_url} />
          </div>
        )}

        <span
          className={cn(
            "text-xs text-gray-500 mt-1",
            isUser ? "text-right" : "text-left"
          )}
        >
          {timestamp}
        </span>
      </div>
    </div>
  );
};

export default MessageBubble;
