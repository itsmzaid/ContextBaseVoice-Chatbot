"use strict";
import { Model } from "sequelize";

export default (sequelize, DataTypes) => {
  class Document extends Model {
    static associate(models) {
      // Document belongs to an agent
      Document.belongsTo(models.Agent, {
        foreignKey: "agent_id",
        as: "agent",
      });

      // One document can have many embeddings
      Document.hasMany(models.Embedding, {
        foreignKey: "document_id",
        as: "embeddings",
      });
    }
  }

  Document.init(
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
      file_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      file_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      file_path: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      content_text: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Document",
      tableName: "documents",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  return Document;
};
