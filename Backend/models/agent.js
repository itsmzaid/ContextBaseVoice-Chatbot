"use strict";
import { Model } from "sequelize";
import dotenv from "dotenv";
dotenv.config();
export default (sequelize, DataTypes) => {
  class Agent extends Model {
    static associate(models) {
      // Agent belongs to a user
      Agent.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });

      // One agent can have many documents
      Agent.hasMany(models.Document, {
        foreignKey: "agent_id",
        as: "documents",
      });

      // One agent can have many sessions
      Agent.hasMany(models.Session, {
        foreignKey: "agent_id",
        as: "sessions",
      });
    }
  }

  Agent.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      prompt: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue:
          "You are a helpful AI assistant. Answer questions based on the provided documents.",
      },
      api_key: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: process.env.DEFAULT_OPENAI_API_KEY,
      },
    },
    {
      sequelize,
      modelName: "Agent",
      tableName: "agents",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  return Agent;
};
