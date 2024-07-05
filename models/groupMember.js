const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../util/database');
const Group = require('./group');
const User = require('./user');

const GroupMember = sequelize.define('GroupMember', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    groupId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Group,
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    isAdmin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    indexes: [
        {
            unique: true,
            fields: ['groupId', 'userId']
        }
    ]
});

// Define associations
GroupMember.associate = (models) => {
    GroupMember.belongsTo(models.Group, { foreignKey: 'groupId' });
    GroupMember.belongsTo(models.User, { foreignKey: 'userId' });
};

module.exports = GroupMember;