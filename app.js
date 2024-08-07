require('dotenv').config();
const http = require('http');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const sequelize = require('./util/database');
const cors = require('cors');
const { Server } = require('socket.io');

const User = require('./models/user');
const Chat = require('./models/chat');
const Group = require('./models/group');
const GroupMember = require('./models/groupMember');
require('./controller/archivedChat')

const userRoutes = require('./routes/user');
const chatRoutes = require('./routes/chat');
const groupRoutes = require('./routes/group');

const app = express();
const server = http.createServer(app)
const io = new Server(server);

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('user-message', async (message) => {
        try {
            const savedMessage = await Chat.create({
                userId: message.userId,
                groupId: message.groupId,
                message: message.message,
                timestamp: message.timestamp,
                fileUrl: message.fileUrl
            });

            const user = await User.findByPk(message.userId);

            const messageWithUser = {
                ...savedMessage.get(),
                User: {
                    id: user.id,
                    name: user.name
                }
            };

            io.emit('message', messageWithUser);
        } catch (error) {
            console.error('Error saving message:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

app.use(cors({
    origin: ['http://localhost:3000'],
    credentials: true
}));

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/user', userRoutes);
app.use('/chat', chatRoutes);
app.use('/group', groupRoutes);

User.hasMany(Chat, { foreignKey: 'userId' });
Chat.belongsTo(User, { foreignKey: 'userId' });

Group.hasMany(Chat, { foreignKey: 'groupId' });
Chat.belongsTo(Group, { foreignKey: 'groupId' });

User.belongsToMany(Group, { through: GroupMember, as: 'groups', foreignKey: 'userId' });
Group.belongsToMany(User, { through: GroupMember, as: 'members', foreignKey: 'groupId' });

sequelize.sync()
    .then(() => {   
        server.listen(3000, () => {
            console.log('Server is running on port 3000');
        });
    })
    .catch(err => {
        console.log('Unable to connect to the database:', err);
    });