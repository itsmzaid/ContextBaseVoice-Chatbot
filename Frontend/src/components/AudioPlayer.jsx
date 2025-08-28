import { useState, useRef } from "react";
import { Play, Pause, Volume2, Loader2 } from "lucide-react";
import { cn } from "../utils/cn";
import { FILE_ENDPOINTS } from "../utils/ApiUrls";

const AudioPlayer = ({ audioUrl, className }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        setIsLoading(true);
        audioRef.current.play();
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setIsLoading(false);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handlePlay = () => {
    setIsPlaying(true);
    setIsLoading(false);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const getFullAudioUrl = (url) => {
    if (url.startsWith("http")) return url;
    if (url.startsWith("/storage/")) {
      return FILE_ENDPOINTS.AUDIO(url.split("/").pop());
    }
    return url;
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg shadow-sm",
        className
      )}
    >
      <button
        onClick={handlePlayPause}
        disabled={isLoading}
        className={cn(
          "p-2 rounded-full transition-all duration-200",
          "bg-blue-500 hover:bg-blue-600 text-white",
          "disabled:bg-gray-400 disabled:cursor-not-allowed",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        )}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4" />
        )}
      </button>

      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <Volume2 className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">Bot Response</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {formatTime(currentTime)}
          </span>
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-100"
              style={{
                width:
                  duration > 0 ? `${(currentTime / duration) * 100}%` : "0%",
              }}
            />
          </div>
          <span className="text-xs text-gray-500">{formatTime(duration)}</span>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={getFullAudioUrl(audioUrl)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={handlePlay}
        onPause={handlePause}
        onError={() => {
          setIsLoading(false);
          setIsPlaying(false);
        }}
      />
    </div>
  );
};

export default AudioPlayer;
