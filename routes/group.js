const express = require('express');
const groupController = require('../controller/group');
const router = express.Router();

router.post('/create', groupController.createGroup);
router.get('/user', groupController.getGroups);  
router.get('/:groupId/messages', groupController.getGroupMessages);
router.get('/:groupId/isAdmin', groupController.isAdmin);
router.get('/:groupId/members', groupController.getMembers)
// router.post('/:groupId/addMember', groupController.isAdminOfGroup, groupController.addMember)
router.post('/:groupId/makeAdmin', groupController.makeAdmin);
router.post('/:groupId/removeMember', groupController.removeMember);

module.exports = router;            