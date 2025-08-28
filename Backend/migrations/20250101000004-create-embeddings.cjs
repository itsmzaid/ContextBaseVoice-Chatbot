"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("embeddings", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      document_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "documents",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      chunk_text: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      pinecone_id: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        comment: "Pinecone vector ID for this embedding",
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: "Additional metadata for Pinecone vector",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add index for better performance
    await queryInterface.addIndex("embeddings", ["document_id"]);
    await queryInterface.addIndex("embeddings", ["pinecone_id"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("embeddings");
  },
};
