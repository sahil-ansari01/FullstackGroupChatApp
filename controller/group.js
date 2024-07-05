const { Op, where } = require('sequelize');
const Group = require('../models/group');
const GroupMember = require('../models/groupMember');
const User = require('../models/user');
const Chat = require('../models/chat');

exports.createGroup = async (req, res, next) => {
    const { name, createdBy, participants } = req.body;
    
    if (!participants || participants.length === 0) {
        return res.status(400).json({ error: 'At least one participant is required' });
    }

    const transaction = await Group.sequelize.transaction();

    try {
        // Create the group
        const group = await Group.create({ name, createdBy }, { transaction });

        // Add the creator as an admin GroupMember
        const creatorUser = await User.findByPk(createdBy);
        if (!creatorUser) {
            throw new Error('Creator user not found');
        }
        await GroupMember.create({ groupId: group.id, userId: creatorUser.id, isAdmin: true }, { transaction });

        // Add participants as GroupMembers
        const addedParticipants = await Promise.all(participants.map(async (phoneNumber) => {
            const user = await User.findOne({ where: { phoneNumber } });
            if (user) {
                await GroupMember.findOrCreate({
                    where: { groupId: group.id, userId: user.id },
                    defaults: { isAdmin: false },
                    transaction
                });
                return user.phoneNumber;
            }
            return null;
        }));

        const notFoundParticipants = participants.filter(p => !addedParticipants.includes(p));

        await transaction.commit();

        res.status(201).json({ 
            success: true, 
            groupId: group.id,
            notAddedParticipants: notFoundParticipants
        });
    } catch (err) {
        await transaction.rollback();
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

        const groupMembers = await GroupMember.findAll({
            where: {
                userId: userId
            }
        });

        const involvedGroups = groupMembers.map(member => member.groupId);

        console.log('Involved group IDs:', involvedGroups);

        if (involvedGroups.length === 0) {
            console.log('No groups found for user:', userId);
            return res.json({ groups: [] });
        }

        const groupsList = await Group.findAll({
            where: {
                id: involvedGroups
            }
        });

        console.log(`Found ${groupsList.length} groups for user:`, userId);
        res.json({ groups: groupsList });
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
