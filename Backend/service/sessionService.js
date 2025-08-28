import { sequelize } from "../models/index.js";
import { ApiError } from "../util/ApiError.js";

export const startSession = async (agentId) => {
  // Check if agent exists
  const agent = await sequelize.models.Agent.findByPk(agentId);
  if (!agent) {
    throw new ApiError(404, "Agent not found");
  }

  // Check if there's already an active session for this agent
  const activeSession = await sequelize.models.Session.findOne({
    where: {
      agent_id: agentId,
      ended_at: null,
    },
  });

  if (activeSession) {
    return activeSession;
  }

  // Create new session
  const session = await sequelize.models.Session.create({
    agent_id: agentId,
    started_at: new Date(),
  });

  return session;
};

export const endSession = async (sessionId) => {
  const session = await sequelize.models.Session.findByPk(sessionId);
  if (!session) {
    throw new ApiError(404, "Session not found");
  }

  if (session.ended_at) {
    throw new ApiError(400, "Session is already ended");
  }

  // End the session
  await session.update({
    ended_at: new Date(),
  });

  return session;
};

export const getSessionById = async (sessionId) => {
  const session = await sequelize.models.Session.findByPk(sessionId, {
    include: [
      {
        model: sequelize.models.Agent,
        as: "agent",
        include: [
          {
            model: sequelize.models.User,
            as: "user",
            attributes: ["id", "name", "email"],
          },
        ],
      },
      {
        model: sequelize.models.Message,
        as: "messages",
        order: [["created_at", "ASC"]],
      },
    ],
  });

  if (!session) {
    throw new ApiError(404, "Session not found");
  }

  return session;
};

export const getActiveSession = async (agentId) => {
  const session = await sequelize.models.Session.findOne({
    where: {
      agent_id: agentId,
      ended_at: null,
    },
    include: [
      {
        model: sequelize.models.Message,
        as: "messages",
        order: [["created_at", "ASC"]],
      },
    ],
  });

  return session;
};
