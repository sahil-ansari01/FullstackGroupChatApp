const path = require('path');
const User = require('../models/user');
const bcrypt = require('bcrypt');

function isStringValidate(string) {
    return string === undefined || string.length === 0;
}

exports.getSignup = async (req, res, next) => {
    try {
        res.sendFile(path.join(__dirname, '..', 'public', 'html', 'signup.html'));
    } catch (err) {
        res.status(404).json({
            error: err
        });
    }
};

exports.postSignup = async (req, res, next) => {
    try {
        const { name, email, phone, password } = req.body;

        if (isStringValidate(name) || isStringValidate(email) || isStringValidate(phone) || isStringValidate(password)) {
            return res.status(400).json({
                error: 'Bad parameters. Something is missing'
            });
        }

        // Check if user with the same email already exists
        const existingUser = await User.findOne({ where: { email: email } });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists, Please login!' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = await User.create({ name, email, phone, password: hashedPassword });
        res.status(201).json({ message: 'Successfully signed up!', user: newUser });
    } catch (err) {
        console.error('Error creating user:', err);
        res.status(500).json({ error: 'Failed to create user', details: err });
    }
};

exports.getLogin = async (req, res, next) => {
    try {
        res.sendFile(path.join(__dirname, '..', 'public', 'html', 'login.html'));
    } catch (err) {
        res.status(404).json({
            error: err
        });
    }
};
