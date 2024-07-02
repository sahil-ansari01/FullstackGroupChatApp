document.addEventListener('DOMContentLoaded', (event) => {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('User not logged in');
        window.location.href = '/login'; // Redirect to login page if no token
        return;
    }

    const decodedToken = jwt_decode(token);
    const userId = decodedToken.userId; // Assuming the token contains the userId

    let lastMessageTimestamp = 0;

    document.getElementById('messageForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        const messageText = document.getElementById('messageInput').value.trim();
        
        if (messageText !== "") {
            const message = {
                userId,
                message: messageText,
                timestamp: Date.now()
            };
            const savedMessage = await sendMessage(message);
            addMessageToChat(savedMessage);
            storeMessage(savedMessage);
            document.getElementById('messageInput').value = '';
        }
    });

    async function sendMessage(message) {
        try {
            const res = await axios.post('http://localhost:3000/chat/messages', message);
            return res.data.message;
        } catch (err) {
            console.error('Error sending message:', err);
        }
    }

    function addMessageToChat(message) {
        const chat = document.getElementById('chat');
        const messageElement = document.createElement('div');
        if (message.userId === userId) {
            messageElement.textContent = `You: ${message.message}`;
        } else {
            messageElement.textContent = `${message.user.name}: ${message.message}`;
        }
        chat.appendChild(messageElement);
    }

    function storeMessage(message) {
        let messages = JSON.parse(localStorage.getItem('chatMessages')) || [];
        messages.push(message);
        
        // Maintain only the most recent 10 messages
        if (messages.length > 10) {
            messages.shift(); // Remove the oldest message
        }

        localStorage.setItem('chatMessages', JSON.stringify(messages));
        lastMessageTimestamp = Math.max(lastMessageTimestamp, message.timestamp);
    }

    function loadMessagesFromStorage() {
        const messages = JSON.parse(localStorage.getItem('chatMessages')) || [];
        document.getElementById('chat').innerHTML = ''; // Clear existing messages
        messages.forEach(message => {
            addMessageToChat(message);
        });
        if (messages.length > 0) {
            lastMessageTimestamp = Math.max(...messages.map(m => m.timestamp));
        }
    }

    // Fetch new messages periodically
    setInterval(async () => {
        const newMessages = await fetchNewMessages();
        if (newMessages.length > 0) {
            document.getElementById('chat').innerHTML = ''; // Clear existing messages
            newMessages.forEach(message => {
                addMessageToChat(message);
                storeMessage(message);
            });
        }
    }, 1000);
    
    async function fetchNewMessages() {
        try {
            const res = await axios.get(`http://localhost:3000/chat/messages?since=${lastMessageTimestamp}`);
            return res.data;
        } catch (err) {
            console.error('Error fetching new messages:', err);
            return [];
        }
    }

    // Load messages from local storage on initial load
    loadMessagesFromStorage();

    // Logout button functionality
    document.getElementById('logoutButton').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('chatMessages'); 
        window.location.href = '/login'; 
    });
});
