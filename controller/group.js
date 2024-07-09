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

exports.isAdmin = async (req, res) => {
    const { groupId } = req.params;
    const { userId } = req.query;

    try {
        const groupMember = await GroupMember.findOne({
            where: {
                groupId,
                userId,
                isAdmin: true
            }
        });

        res.json({ isAdmin: !!groupMember });
    } catch (error) {
        console.error('Error checking admin status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getMembers = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const { userId } = req.query; // Ensure userId is passed as a query parameter

        if (!userId) {
            console.log('No userId provided');
            return res.status(400).json({ error: 'User ID is required' });
        }

        const groupMembers = await GroupMember.findAll({
            where: {
                groupId: groupId
            }
        });

        const memberIds = groupMembers.map(member => member.userId);

        if (memberIds.length === 0) {
            console.log('No members found for group:', groupId);
            return res.json({ membersList: [] });
        }

        let membersList = await User.findAll({
            where: {
                id: memberIds
            }
        });

        membersList = membersList.filter(member => member.id.toString() !== userId);

        console.log(`Found ${membersList.length} members for group:`, groupId);

        res.json({ membersList: membersList });
    } catch (error) {
        console.error('Error getting the members:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.addMember = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const { userId } = req.body;

        // Check if the group exists
        const group = await Group.findByPk(groupId);
        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        // Check if the user exists
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if the user is already a member of the group
        const existingMembership = await UserGroup.findOne({
            where: { userId, groupId }
        });

        if (existingMembership) {
            return res.status(400).json({ error: 'User is already a member of this group' });
        }

        // Add the user to the group
        await UserGroup.create({ userId, groupId });

        res.status(201).json({ message: 'User added to group successfully' });
    } catch (error) {
        console.error('Error adding user to group:', error);
        res.status(500).json({ error: 'An error occurred while adding user to group' });
    }
}

exports.makeAdmin = async (req, res, next) => {
    const { groupId } = req.params;
    const { userId } = req.body;

    try {
        await GroupMember.update({ isAdmin: true }, { where: { groupId, userId } });
        res.status(200).send({ message: 'User made admin successfully' });
    } catch (error) {
        console.error('Error making user an admin:', error);
        res.status(500).send({ error: 'Failed to make user admin' });
    }
}

exports.removeMember = async (req, res, next) => {
    const { groupId } = req.params;
    const { userId } = req.body;
    console.log(groupId, userId);

    try {
        await GroupMember.destroy({ where: { groupId, userId } });
        res.status(200).send({ message: 'User removed from group successfully' });
    } catch (error) {
        console.error('Error removing user from group:', error);
        res.status(500).send({ error: 'Failed to remove user from group' });
    }
}

exports.searchUser = async (req, res, next) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const users = await User.findAll({
            where: {
                [Op.or]: [
                    { name: { [Op.iLike]: `%${query}%` } },
                    { email: { [Op.iLike]: `%${query}%` } },
                    { phoneNumber: { [Op.iLike]: `%${query}%` } }
                ]
            },
            attributes: ['id', 'name', 'email', 'phoneNumber'], 
            limit: 10 
        });

        // Ensure we're sending the users array directly
        res.json(users);
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ error: 'An error occurred while searching users' });
    }
}
