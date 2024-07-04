const path = require('path');
const Chat = require('../models/chat');
const User = require('../models/user');

exports.getChat = (req, res) => {
    try {
        res.sendFile(path.join(__dirname, '..', 'public', 'html', 'chat.html'));
    } catch (err) {                                                             
        res.status(404).json({ error: err });
    }                                        
};

exports.getMessages = async (req, res, next) => {
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
        console.error('Error fetching messages:', err);
        res.status(500).json({ error: 'Failed to fetch messages!'});
    }
}

exports.postMessages = async (req, res, next) => {
    const { userId, message, timestamp } = req.body;
    const { groupId } = req.params;
    try {
        const savedMessage = await Chat.create({ userId, groupId, message, timestamp });
        console.log("This is the saved message response: ", savedMessage);
        res.status(201).json({ success: true, message: savedMessage });
    } catch (err) {
        console.error('Error sending message:', err);
        res.status(500).json({ error: 'Failed to send message!' });
    }
}
