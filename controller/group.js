const { Op } = require('sequelize');
const Group = require('../models/group');
const GroupMember = require('../models/groupMember');
const User = require('../models/user');
const Chat = require('../models/chat');

exports.createGroup = async (req, res, next) => {
    const { name, createdBy, participants } = req.body;
    
    try {
        // Create the group
        const group = await Group.create({ name, createdBy });

        // Add the creator as an admin GroupMember
        const creatorUser = await User.findByPk(createdBy);
        if (creatorUser) {
            await GroupMember.create({ groupId: group.id, userId: creatorUser.id, isAdmin: true });
        } else {
            throw new Error('Creator user not found');
        }

        // Add participants as GroupMembers
        await Promise.all(participants.map(async (phoneNumber) => {
            const user = await User.findOne({ where: { phoneNumber } });
            if (user) {
                await GroupMember.create({ groupId: group.id, userId: user.id });
            }
        }));

        res.status(201).json({ success: true, groupId: group.id });
    } catch (err) {
        console.error('Error creating group:', err);
        res.status(500).json({ error: 'Failed to create group', details: err.message });
    }
};

exports.getGroups = async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        console.log('No userId provided');
        return res.status(400).json({ error: 'User ID is required' });
    }

    try {
        console.log('Fetching groups for user:', userId);

        const groups = await Group.findAll({
            include: [{
                model: User,
                as: 'members',
                through: {
                    model: GroupMember,
                    where: {
                        userId: userId
                    },
                },
                attributes: ['id', 'name', 'email'] 
            }],
            where: {} // Remove the where clause to include all groups the user is a member of
        });

        if (groups.length === 0) {
            console.log('No groups found for user:', userId);
            return res.json({ groups: [] });
        }

        console.log(`Found ${groups.length} groups for user:`, userId);
        res.json({ groups });
    } catch (error) {
        console.error('Error fetching groups:', error);
        res.status(500).json({ error: 'Failed to fetch groups' });
    }
};

exports.getGroupMessages = async (req, res, next) => {
    const { groupId } = req.params;
    try {
        const messages = await Chat.findAll({
            where: { groupId },
            include: {
                model: User,
                attributes: ['name']
            },
            order: [['createdAt', 'ASC']]
        });
        res.status(200).json(messages);
    } catch (err) {
        console.error('Error fetching group messages:', err);
        res.status(500).json({ error: 'Failed to fetch group messages' });
    }
};
