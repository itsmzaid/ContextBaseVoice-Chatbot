import { useState } from "react";
import { Plus, Users, Bot, MessageSquare, BarChart3 } from "lucide-react";
import { cn } from "../utils/cn";
import { Link } from "react-router-dom";
import {
  useCreateUserMutation,
  useGetAllUsersQuery,
} from "../redux/api/voiceBotApi";
import CreateUserModal from "../components/CreateUserModal";
import AgentManagement from "../components/AgentManagement";

const Dashboard = () => {
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const { data: usersResponse, isLoading: usersLoading } =
    useGetAllUsersQuery();
  const users = usersResponse?.data || [];
  const [createUser, { isLoading: creatingUser }] = useCreateUserMutation();

  const handleCreateUser = async (userData) => {
    try {
      const result = await createUser(userData).unwrap();
      setSelectedUser(result.data);
      setShowCreateUser(false);
    } catch (error) {
      console.error("Error creating user:", error);
    }
  };

  const stats = [
    {
      title: "Total Users",
      value: users.length,
      icon: Users,
      color: "bg-blue-500",
    },
    {
      title: "Total Agents",
      value: users.reduce((acc, user) => acc + (user.agents?.length || 0), 0),
      icon: Bot,
      color: "bg-green-500",
    },
    {
      title: "Active Sessions",
      value: 0, // TODO: Implement session tracking
      icon: MessageSquare,
      color: "bg-purple-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Voice Bot Dashboard
              </h1>
              <p className="mt-2 text-gray-600">
                Manage your AI agents and voice conversations
              </p>
            </div>
            <Link
              to="/logs"
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              View Logs
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat) => (
            <div
              key={stat.title}
              className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
            >
              <div className="flex items-center">
                <div className={cn("p-3 rounded-lg", stat.color)}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {usersLoading ? "..." : stat.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* User Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Select User</h2>
            <button
              onClick={() => setShowCreateUser(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create User
            </button>
          </div>

          {usersLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No users yet
              </h3>
              <p className="text-gray-600 mb-4">
                Create your first user to get started with voice bot
                conversations
              </p>
              <button
                onClick={() => setShowCreateUser(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Create First User
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={cn(
                    "p-4 border rounded-lg cursor-pointer transition-all duration-200",
                    selectedUser?.id === user.id
                      ? "border-blue-500 bg-blue-50 shadow-md"
                      : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{user.name}</h3>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      <p className="text-xs text-gray-400">
                        {user.agents?.length || 0} agents
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Agent Management */}
        {selectedUser && <AgentManagement user={selectedUser} />}

        {/* Create User Modal */}
        {showCreateUser && (
          <CreateUserModal
            onClose={() => setShowCreateUser(false)}
            onSubmit={handleCreateUser}
            isLoading={creatingUser}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
