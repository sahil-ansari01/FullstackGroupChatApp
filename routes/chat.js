const express = require('express');
const chatController = require('../controller/chat');
const router = express.Router();

router.get('/messages', chatController.getMessages);
router.post('/messages', chatController.postMessages);

module.exports = router;