import { Bot, FileText, Calendar, Play } from "lucide-react";
import { cn } from "../utils/cn";

const AgentCard = ({ agent, onSelect, isSelected }) => {
  const documentCount = agent.documents?.length || 0;
  const createdAt = new Date(agent.created_at).toLocaleDateString();

  return (
    <div
      onClick={() => onSelect(agent)}
      className={cn(
        "p-4 border rounded-lg cursor-pointer transition-all duration-200",
        "hover:shadow-md hover:border-blue-300",
        isSelected
          ? "border-blue-500 bg-blue-50 shadow-md"
          : "border-gray-200 bg-white"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{agent.name}</h3>
            <p className="text-sm text-gray-500">AI Assistant</p>
          </div>
        </div>

        {isSelected && <div className="w-3 h-3 bg-blue-500 rounded-full"></div>}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <FileText className="w-4 h-4" />
          <span>
            {documentCount} document{documentCount !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>Created {createdAt}</span>
        </div>

        {agent.prompt && (
          <p className="text-sm text-gray-600 line-clamp-2">{agent.prompt}</p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(agent);
          }}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            isSelected
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          )}
        >
          <Play className="w-4 h-4" />
          {isSelected ? "Selected" : "Select Agent"}
        </button>
      </div>
    </div>
  );
};

export default AgentCard;
