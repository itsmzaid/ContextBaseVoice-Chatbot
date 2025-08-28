"use strict";
import { Model } from "sequelize";

export default (sequelize, DataTypes) => {
  class Embedding extends Model {
    static associate(models) {
      // Embedding belongs to a document
      Embedding.belongsTo(models.Document, {
        foreignKey: "document_id",
        as: "document",
      });
    }
  }

  Embedding.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      document_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "documents",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      chunk_text: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      pinecone_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        comment: "Pinecone vector ID for this embedding",
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: "Additional metadata for Pinecone vector",
      },
    },
    {
      sequelize,
      modelName: "Embedding",
      tableName: "embeddings",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  return Embedding;
};
