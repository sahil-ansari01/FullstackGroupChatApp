const express = require('express');
const chatController = require('../controller/chat');
const router = express.Router();

router.get('/', chatController.getChat);
router.get('/messages/:groupId', chatController.getMessages);
router.post('/messages/:groupId', chatController.postMessages);

module.exports = router;