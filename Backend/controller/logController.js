import { asyncHandler } from "../util/asyncHandler.js";
import { ApiResponse } from "../util/ApiResponse.js";
import {
  getSessionLogs as getSessionLogsService,
  getAllLogs as getAllLogsService,
  getCurrentSessionStats as getCurrentSessionStatsService,
} from "../service/logService.js";

export const getSessionLogs = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const logs = await getSessionLogsService(sessionId);

  return res
    .status(200)
    .json(new ApiResponse(200, logs, "Session logs retrieved successfully"));
});

export const getAllLogs = asyncHandler(async (req, res) => {
  const logs = await getAllLogsService();

  return res
    .status(200)
    .json(new ApiResponse(200, logs, "All logs retrieved successfully"));
});

export const getCurrentSessionStats = asyncHandler(async (req, res) => {
  const stats = await getCurrentSessionStatsService();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        stats,
        "Current session stats retrieved successfully"
      )
    );
});
