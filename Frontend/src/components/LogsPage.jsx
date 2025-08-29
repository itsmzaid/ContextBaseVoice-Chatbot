import React, { useState, useEffect } from "react";
import {
  Activity,
  DollarSign,
  MessageSquare,
  Mic,
  Brain,
  Volume2,
  Clock,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Calendar,
  Filter,
} from "lucide-react";
import { cn } from "../utils/cn";

const LogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all"); // all, stt, llm, tts
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/logs/all`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch logs");
      }

      const data = await response.json();
      setLogs(data.data || []);
    } catch (error) {
      console.error("Error fetching logs:", error);
      setError("Failed to load logs");
    } finally {
      setLoading(false);
    }
  };

  const getModelIcon = (modelType) => {
    switch (modelType) {
      case "stt":
        return <Mic className="w-4 h-4" />;
      case "llm":
        return <Brain className="w-4 h-4" />;
      case "tts":
        return <Volume2 className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getModelColor = (modelType) => {
    switch (modelType) {
      case "stt":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "llm":
        return "text-green-600 bg-green-50 border-green-200";
      case "tts":
        return "text-purple-600 bg-purple-50 border-purple-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const formatCost = (cost) => {
    return `$${parseFloat(cost).toFixed(6)}`;
  };

  const formatTokens = (tokens) => {
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const filteredLogs = logs.filter((log) => {
    if (filter === "all") return true;
    return log.modelType === filter;
  });

  const totalStats = logs.reduce(
    (acc, log) => {
      acc.totalCost += parseFloat(log.cost) || 0;
      acc.totalInputTokens += parseInt(log.inputTokens) || 0;
      acc.totalOutputTokens += parseInt(log.outputTokens) || 0;
      acc.messageCount += 1;
      return acc;
    },
    { totalCost: 0, totalInputTokens: 0, totalOutputTokens: 0, messageCount: 0 }
  );

  const modelStats = logs.reduce((acc, log) => {
    const modelType = log.modelType;
    if (!acc[modelType]) {
      acc[modelType] = {
        count: 0,
        totalCost: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
      };
    }
    acc[modelType].count += 1;
    acc[modelType].totalCost += parseFloat(log.cost) || 0;
    acc[modelType].totalInputTokens += parseInt(log.inputTokens) || 0;
    acc[modelType].totalOutputTokens += parseInt(log.outputTokens) || 0;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading logs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <Activity className="w-12 h-12 mx-auto" />
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchLogs}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Model Usage Logs
              </h1>
              <p className="text-gray-600 mt-2">
                Track all AI model usage, tokens, and costs
              </p>
            </div>
            <button
              onClick={fetchLogs}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-4 mb-6">
            <Filter className="w-5 h-5 text-gray-600" />
            <div className="flex gap-2">
              {["all", "stt", "llm", "tts"].map((filterType) => (
                <button
                  key={filterType}
                  onClick={() => setFilter(filterType)}
                  className={cn(
                    "px-3 py-1 rounded-full text-sm font-medium transition-colors",
                    filter === filterType
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                  )}
                >
                  {filterType.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Cost</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCost(totalStats.totalCost)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Input Tokens
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatTokens(totalStats.totalInputTokens)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Output Tokens
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatTokens(totalStats.totalOutputTokens)}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Messages</p>
                <p className="text-2xl font-bold text-gray-900">
                  {totalStats.messageCount}
                </p>
              </div>
              <MessageSquare className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Model Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {Object.entries(modelStats).map(([modelType, stats]) => (
            <div
              key={modelType}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                {getModelIcon(modelType)}
                <h3 className="text-lg font-semibold text-gray-900">
                  {modelType.toUpperCase()}
                </h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Usage Count:</span>
                  <span className="font-medium">{stats.count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Cost:</span>
                  <span className="font-medium">
                    {formatCost(stats.totalCost)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Input Tokens:</span>
                  <span className="font-medium">
                    {formatTokens(stats.totalInputTokens)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Output Tokens:</span>
                  <span className="font-medium">
                    {formatTokens(stats.totalOutputTokens)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Detailed Logs
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Model
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Input Tokens
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Output Tokens
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      No logs found
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border",
                              getModelColor(log.modelType)
                            )}
                          >
                            {getModelIcon(log.modelType)}
                            {log.modelName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTokens(parseInt(log.inputTokens) || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTokens(parseInt(log.outputTokens) || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCost(parseFloat(log.cost) || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTimestamp(log.timestamp)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogsPage;
