const express = require('express');
const router = express.Router();
const userController = require('../controller/user');

router.get('/signup', userController.getSignup);

router.post('/signup', userController.postSignup);

router.get('/login', userController.getLogin);

router.post('/login', userController.postLogin);

router.get('/:userId', userController.getUser);

module.exports = router;