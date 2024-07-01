const Chat = require('../models/chat');
const User = require('../models/user');

exports.getMessages = async (req, res, next) => {
    try {
        const messages = await Chat.findAll({
            include: {
                model: User,
                attributes: ['name']
            },
            order: [['createdAt', 'ASC']]
        });
        console.log(messages);
        res.status(200).json(messages);
    } catch (err) {
        res.status(500).json({ err: 'Failed to fetch messages!'});
    }
}

exports.postMessages = async (req, res, next) => {
    const { userId, message } = req.body;
    try {
        const newMessage = await Chat.create({ userId, message });
        console.log(newMessage);
        res.status(201).json({ success: true, message: newMessage });
    } catch (err) {
        res.status(500).json({ err: 'Failed to send message!' });
    }
}