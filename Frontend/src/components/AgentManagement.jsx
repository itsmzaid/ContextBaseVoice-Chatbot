import { useState } from "react";
import { Plus, Bot, MessageSquare } from "lucide-react";
import { cn } from "../utils/cn";
import {
  useCreateAgentMutation,
  useGetUserAgentsQuery,
} from "../redux/api/voiceBotApi";
import AgentCard from "./AgentCard";
import CreateAgentModal from "./CreateAgentModal";
import ChatInterface from "./ChatInterface";

const AgentManagement = ({ user }) => {
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showChat, setShowChat] = useState(false);

  const {
    data: agentsResponse,
    isLoading: agentsLoading,
    refetch,
  } = useGetUserAgentsQuery(user?.id);
  const agents = agentsResponse?.data || [];
  const [createAgent, { isLoading: creatingAgent }] = useCreateAgentMutation();

  const handleCreateAgent = async (agentData) => {
    try {
      const formData = new FormData();
      formData.append("user_id", user.id);
      formData.append("name", agentData.name);
      formData.append("prompt", agentData.prompt || "");
      formData.append("api_key", agentData.api_key || "");

      if (agentData.documents) {
        agentData.documents.forEach((file) => {
          formData.append("documents", file);
        });
      }

      const result = await createAgent(formData).unwrap();
      setSelectedAgent(result.data);
      setShowCreateAgent(false);
      refetch();
    } catch (error) {
      console.error("Error creating agent:", error);
    }
  };

  const handleAgentSelect = (agent) => {
    setSelectedAgent(agent);
    setShowChat(true);
  };

  return (
    <div className="space-y-6">
      {/* Agent Management Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Agent Management
            </h2>
            <p className="text-sm text-gray-600">
              Managing agents for {user.name} ({user.email})
            </p>
          </div>
          <button
            onClick={() => setShowCreateAgent(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Agent
          </button>
        </div>

        {agentsLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading agents...</p>
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-8">
            <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No agents yet
            </h3>
            <p className="text-gray-600 mb-4">
              Create your first AI agent to start voice conversations
            </p>
            <button
              onClick={() => {
                if (!user?.id) {
                  console.error("No user selected!");
                  return;
                }
                setShowCreateAgent(true);
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Create First Agent
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onSelect={handleAgentSelect}
                isSelected={selectedAgent?.id === agent.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Chat Interface */}
      {showChat && selectedAgent && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">
                  {selectedAgent.name}
                </h3>
                <p className="text-sm text-gray-500">Voice Chat</p>
              </div>
            </div>
            <button
              onClick={() => setShowChat(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Plus className="w-5 h-5 transform rotate-45" />
            </button>
          </div>
          <ChatInterface agent={selectedAgent} />
        </div>
      )}

      {/* Create Agent Modal */}
      {showCreateAgent && user?.id && (
        <CreateAgentModal
          onClose={() => setShowCreateAgent(false)}
          onSubmit={handleCreateAgent}
          isLoading={creatingAgent}
        />
      )}
    </div>
  );
};

export default AgentManagement;
