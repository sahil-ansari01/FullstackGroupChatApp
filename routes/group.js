const express = require('express');
const groupController = require('../controller/group');
const router = express.Router();

router.post('/create', groupController.createGroup);
router.get('/user', groupController.getGroups);  
router.get('/:groupId/messages', groupController.getGroupMessages);

module.exports = router;            