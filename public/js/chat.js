// Ensure jwt-decode library is loaded before this script
document.addEventListener('DOMContentLoaded', (event) => {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('User not logged in');
        window.location.href = '/login'; // Redirect to login page if no token
        return;
    }

    const decodedToken = jwt_decode(token);
    const userId = decodedToken.userId; // Assuming the token contains the userId

    document.getElementById('messageForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        const messageText = document.getElementById('messageInput').value.trim();
        
        if (messageText !== "") {
            const message = {
                userId, // Use the actual logged-in user's ID
                message: messageText
            };
            const savedMessage = await sendMessage(message);
            addMessageToChat({ user: { name: 'You' }, message: savedMessage.message });
            document.getElementById('messageInput').value = '';
        }
    });

    async function sendMessage(message) {
        try {
            const res = await axios.post('http://localhost:3000/chat/messages', message);
            return res.data;
        } catch (err) {
            console.error('Error sending message:', err);
        }
    }

    function addMessageToChat(message) {
        const chat = document.getElementById('chat');
        const messageElement = document.createElement('div');
        if (message.userId === decodedToken.userId) {
            messageElement.textContent = `You: ${message.message}`;
            console.log();
        } else {
            messageElement.textContent = `${message.user.name}: ${message.message}`;
        }
        chat.appendChild(messageElement);
    }

    // Fetch new messages periodically
    setInterval(async () => {
        const newMessages = await fetchMessages();
        document.getElementById('chat').innerHTML = ''; // Clear existing messages
        newMessages.forEach(message => {
            addMessageToChat(message);
        });
    }, 1000);
    
    // Initial load of messages
    async function fetchMessages() {
        try {
            const res = await axios.get('http://localhost:3000/chat/messages');
            return res.data;
        } catch (err) {
            console.error('Error fetching messages:', err);
            return [];
        }
    }

    fetchMessages();
});
