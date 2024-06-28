const jwt = require('jsonwebtoken');
const User = require('../models/user');
const secretKey = process.env.SECRET_KEY;

exports.middleParseToken = async (req, res, next) => {
    const token = req.body.token;
    const obj = jwt.verify(token, secretKey);
    req.body.userId = obj.userId;
    next();
};

const authenticate = async (req, res, next) => {
    try {
        const token = req.header('Authorization');
        const user = jwt.verify(token, secretKey);
        User.findByPk(user.userId)
        .then(user => {
            req.user = user; 
            next();
        })
        .catch(err => {
            throw new Error(err);
        })
    } catch (err) {
        console.log(err);
        return res.status(401).json({success: false});
    }
}

module.exports = {
    authenticate
}   