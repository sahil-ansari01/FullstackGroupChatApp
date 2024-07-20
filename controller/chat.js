const path = require('path');
const Chat = require('../models/chat');
const User = require('../models/user');
const AWS = require('aws-sdk');
const uuid = require('uuid');

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

exports.uploadFile = async (req, res) => {
    const file = req.file;
    const fileName = `${uuid.v4()}-${file.originalname}`;
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read'
    };

    try {
        const data = await s3.upload(params).promise();
        res.status(200).json({ url: data.Location });
    } catch (error) {
        console.error('Error uploading file to S3:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
};

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
            include: { model: User, attributes: ['name'] },
            order: [['createdAt', 'ASC']]
        });
        res.status(200).json(messages);
    } catch (err) {
        console.error('Error fetching messages:', err);
        res.status(500).json({ error: 'Failed to fetch messages!'});
    }
};

exports.postMessages = async (req, res, next) => {
    const { userId, message, timestamp, fileUrl } = req.body;
    const { groupId } = req.params;
    try {
        const savedMessage = await Chat.create({ userId, groupId, message, timestamp, fileUrl });
        console.log("This is the saved message response: ", savedMessage);
        res.status(201).json({ success: true, message: savedMessage });
    } catch (err) {
        console.error('Error sending message:', err);
        res.status(500).json({ error: 'Failed to send message!' });
    }
}
