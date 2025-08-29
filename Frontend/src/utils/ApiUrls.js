const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

// User endpoints
export const USER_ENDPOINTS = {
  CREATE: `${BASE_URL}/users`,
  GET_BY_ID: (id) => `${BASE_URL}/users/${id}`,
  GET_ALL: `${BASE_URL}/users`,
};

// Agent endpoints
export const AGENT_ENDPOINTS = {
  CREATE: `${BASE_URL}/agents`,
  GET_BY_ID: (id) => `${BASE_URL}/agents/${id}`,
  GET_USER_AGENTS: (userId) => `${BASE_URL}/agents/user/${userId}`,
};

// Session endpoints
export const SESSION_ENDPOINTS = {
  START: `${BASE_URL}/sessions/start`,
  END: (id) => `${BASE_URL}/sessions/${id}/end`,
  GET_BY_ID: (id) => `${BASE_URL}/sessions/${id}`,
};

// Message endpoints
export const MESSAGE_ENDPOINTS = {
  CREATE: `${BASE_URL}/messages`,
  GET_SESSION_MESSAGES: (sessionId) =>
    `${BASE_URL}/messages/session/${sessionId}`,
  GET_BY_ID: (id) => `${BASE_URL}/messages/${id}`,
};

// File storage
export const FILE_ENDPOINTS = {
  AUDIO: (filename) =>
    `${BASE_URL.replace("/api", "")}/storage/audio/${filename}`,
  UPLOAD: (filename) =>
    `${BASE_URL.replace("/api", "")}/storage/uploads/${filename}`,
};

export const getAuthToken = () => {
  return localStorage.getItem("token")
    ? `Bearer ${localStorage.getItem("token")}`
    : "";
};
