"use strict";
import { Model } from "sequelize";

export default (sequelize, DataTypes) => {
  class Session extends Model {
    static associate(models) {
      // Session belongs to an agent
      Session.belongsTo(models.Agent, {
        foreignKey: "agent_id",
        as: "agent",
      });

      // One session can have many messages
      Session.hasMany(models.Message, {
        foreignKey: "session_id",
        as: "messages",
      });
    }
  }

  Session.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      agent_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "agents",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      started_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      ended_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Session",
      tableName: "sessions",
      underscored: true,
      timestamps: false,
    }
  );

  return Session;
};
