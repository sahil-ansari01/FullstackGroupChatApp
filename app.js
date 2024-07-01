require('dotenv').config();
const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const sequelize = require('./util/database');

const User = require('./models/user');
const Chat = require('./models/chat');

const cors = require('cors');
const app = express();

const userRoutes = require('./routes/user');
const chatRoutes = require('./routes/chat');

app.use(cors({
    origin: '*',
    credentials: true
}));

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.static(path.join(__dirname, 'public')));

// Serve chat.html for the /chat route
app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'html', 'chat.html'));
});

app.use('/user', userRoutes);
app.use('/chat', chatRoutes);

User.hasMany(Chat);
Chat.belongsTo(User);

sequelize.sync( )
    .then(res => {
        app.listen(3000, () => {
            console.log('Server is running in port 3000');
        })
    })
    .catch(err => {
        console.log('Unable to connect to the database: ', err);
    }) 