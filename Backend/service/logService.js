import loggingService from "../util/loggingService.js";
import { ApiError } from "../util/ApiError.js";

export const getSessionLogs = async (sessionId) => {
  try {
    const logs = loggingService.getSessionLogs(sessionId);
    return logs;
  } catch (error) {
    console.error("Error getting session logs:", error);
    throw new ApiError(500, "Failed to get session logs");
  }
};

export const getAllLogs = async () => {
  try {
    const logs = loggingService.getAllLogs();
    return logs;
  } catch (error) {
    console.error("Error getting all logs:", error);
    throw new ApiError(500, "Failed to get logs");
  }
};

export const getCurrentSessionStats = async () => {
  try {
    const stats = loggingService.getCurrentSessionStats();
    return stats;
  } catch (error) {
    console.error("Error getting current session stats:", error);
    throw new ApiError(500, "Failed to get session stats");
  }
};
