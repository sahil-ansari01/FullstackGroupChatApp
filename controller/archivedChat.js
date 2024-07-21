const cron = require('node-cron');
const { Op } = require('sequelize');
const Chat = require('../models/chat');
const ArchivedChat = require('../models/archivedChat');

async function archiveOldChats() {
  try {
    // Get current time minus 24 hours
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

    // Find old chats
    const oldChats = await Chat.findAll({
      where: {
        timestamp: {
          [Op.lt]: oneDayAgo
        }
      }
    });

    if (oldChats.length > 0) {
      // Archive old chats
      await ArchivedChat.bulkCreate(oldChats.map(chat => chat.toJSON()));

      // Delete old chats from Chat table
      await Chat.destroy({
        where: {
          id: {
            [Op.in]: oldChats.map(chat => chat.id)
          }
        }
      });

      console.log(`${oldChats.length} chats archived and deleted.`);
    } else {
      console.log('No old chats to archive.');
    }
  } catch (error) {
    console.error('Error archiving chats:', error);
  }
}

// Schedule the cron job to run at midnight every day
cron.schedule('0 0 * * *', () => {
  console.log('Running the cron job to archive old chats...');
  archiveOldChats();
});
