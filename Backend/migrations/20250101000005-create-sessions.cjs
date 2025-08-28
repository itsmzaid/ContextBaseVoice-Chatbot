"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("sessions", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      agent_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "agents",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      ended_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Add index for better performance
    await queryInterface.addIndex("sessions", ["agent_id"]);
    await queryInterface.addIndex("sessions", ["ended_at"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("sessions");
  },
};
