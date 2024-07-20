const express = require('express');
const router = express.Router();
const chatController = require('../controller/chat');
const multer = require('multer');

const upload = multer();

router.get('/', chatController.getChat);
router.get('/messages/:groupId', chatController.getMessages);
router.post('/messages/:groupId', chatController.postMessages);
router.post('/upload', upload.single('file'), chatController.uploadFile);

module.exports = router;