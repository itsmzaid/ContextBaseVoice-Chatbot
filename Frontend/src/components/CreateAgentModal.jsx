import { useState } from "react";
import { X, Bot, FileText, Settings } from "lucide-react";
import { cn } from "../utils/cn";
import FileUpload from "./FileUpload";

const CreateAgentModal = ({ onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    name: "",
    prompt: "",
    api_key: "",
    documents: [],
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Agent name is required";
    }

    if (formData.api_key && !formData.api_key.startsWith("sk-")) {
      newErrors.api_key = "Please enter a valid OpenAI API key";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleFilesSelected = (files) => {
    setFormData((prev) => ({ ...prev, documents: files }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Create New AI Agent
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Bot className="w-5 h-5" />
              Basic Information
            </h3>

            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Agent Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={cn(
                  "w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white",
                  "transition-colors duration-200",
                  errors.name ? "border-red-500" : "border-gray-300"
                )}
                placeholder="Enter agent name"
                disabled={isLoading}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="prompt"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                System Prompt
              </label>
              <textarea
                id="prompt"
                name="prompt"
                value={formData.prompt}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white transition-colors duration-200"
                placeholder="Enter system prompt for the AI agent (optional)"
                disabled={isLoading}
              />
              <p className="mt-1 text-xs text-gray-500">
                This prompt will guide how the AI responds to questions
              </p>
            </div>
          </div>

          {/* API Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              API Configuration
            </h3>

            <div>
              <label
                htmlFor="api_key"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                OpenAI API Key
              </label>
              <input
                type="password"
                id="api_key"
                name="api_key"
                value={formData.api_key}
                onChange={handleChange}
                className={cn(
                  "w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white",
                  "transition-colors duration-200",
                  errors.api_key ? "border-red-500" : "border-gray-300"
                )}
                placeholder="sk-... (optional, will use default if not provided)"
                disabled={isLoading}
              />
              {errors.api_key && (
                <p className="mt-1 text-sm text-red-600">{errors.api_key}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Leave empty to use the default API key from server configuration
              </p>
            </div>
          </div>

          {/* Document Upload */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Upload Documents
            </h3>

            <FileUpload
              onFilesSelected={handleFilesSelected}
              acceptedTypes=".pdf,.doc,.docx,.txt"
              multiple={true}
            />

            <p className="text-xs text-gray-500">
              Upload documents that the AI agent will use to answer questions.
              Supported formats: PDF, DOC, DOCX, TXT (Max 10MB each)
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating..." : "Create Agent"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAgentModal;
