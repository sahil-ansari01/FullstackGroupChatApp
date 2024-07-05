document.addEventListener('DOMContentLoaded', async (event) => {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('User not logged in');
        window.location.href = '/user/login';
        return;
    }

    const decodedToken = jwt_decode(token);
    const userId = decodedToken.userId;
  
    let currentGroupId;
    let lastMessageTimestamp = 0;

    // Event Listeners
    document.getElementById('messageForm').addEventListener('submit', handleMessageSubmit);
    document.getElementById('newGroupBtn').addEventListener('click', showNewGroupModal);
    document.getElementById('closeModal').addEventListener('click', hideNewGroupModal);
    document.getElementById('newGroupForm').addEventListener('submit', createNewGroup);
    document.getElementById('groupSearch').addEventListener('input', filterGroups);
    document.getElementById('logoutButton').addEventListener('click', logout);

    async function handleMessageSubmit(e) {
        e.preventDefault();
        if (!currentGroupId) {
            alert('Please select a group first');
            return;
        }
        const messageText = document.getElementById('messageInput').value.trim();
        if (messageText !== "") {
            const message = {
                userId,
                groupId: currentGroupId,
                message: messageText,
                timestamp: Date.now()
            };
            const savedMessage = await sendMessage(message);
            if (savedMessage) {
                addMessageToChat(savedMessage);
                storeMessage(savedMessage);
                document.getElementById('messageInput').value = '';
            }
        }
    }

    async function sendMessage(message) {
        try {
            const res = await axios.post(`/chat/messages/${currentGroupId}`, message, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            return res.data.message;
        } catch (err) {
            console.error('Error sending message:', err);
            return null;
        }
    }
    
    function addMessageToChat(message) {
        const chat = document.getElementById('chat');
        const messageElement = document.createElement('div');
        messageElement.dataset.timestamp = message.timestamp;
        messageElement.classList.add('message', 'p-2', 'mb-2', 'rounded');
        console.log(message);
        let sender;
        if (message.userId === userId) {
            sender = 'You';
            messageElement.classList.add('bg-blue-100', 'text-right');
        } else if (message.User && message.User.name) {
            sender = message.User.name;
            messageElement.classList.add('bg-gray-100');
        } else {
            sender = message.userId ? `User ${message.userId}` : 'Unknown User';
            messageElement.classList.add('bg-gray-100');
        }

        const timeString = new Date(message.timestamp).toLocaleTimeString();
        messageElement.innerHTML = `
            <strong>${escapeHTML(sender)}:</strong> ${escapeHTML(message.message)}
            <br><small class="text-gray-500">${timeString}</small>
        `;

        if (!chat.querySelector(`[data-timestamp="${message.timestamp}"]`)) {
            chat.appendChild(messageElement);
            chat.scrollTop = chat.scrollHeight;
        }
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }

    function storeMessage(message) {
        let messages = JSON.parse(localStorage.getItem(`chatMessages_${currentGroupId}`)) || [];
        if (!messages.some(m => m.timestamp === message.timestamp && m.message === message.message)) {
            messages.push(message);
            if (messages.length > 50) {
                messages = messages.slice(-50);
            }
            localStorage.setItem(`chatMessages_${currentGroupId}`, JSON.stringify(messages));
            lastMessageTimestamp = Math.max(lastMessageTimestamp, message.timestamp);
        }
    }

    async function loadMessagesFromStorage() {
        const messages = JSON.parse(localStorage.getItem(`chatMessages_${currentGroupId}`)) || [];
        document.getElementById('chat').innerHTML = '';
        for (const message of messages) {
            const updatedMessage = await ensureMessageHasUserInfo(message);
            addMessageToChat(updatedMessage);
        }
        if (messages.length > 0) {
            lastMessageTimestamp = Math.max(...messages.map(m => m.timestamp));
        }
    }

    async function fetchNewMessages() {
        try {
            const res = await axios.get(`/chat/messages/${currentGroupId}?since=${lastMessageTimestamp}`);
            return Array.isArray(res.data) ? res.data : [];
        } catch (err) {
            console.error('Error fetching new messages:', err);
            return [];
        }
    }

    async function loadGroups() {
        try {
            const response = await axios.get(`/group/user/?userId=${userId}`);
            const groups = response.data?.groups || [];
            console.log(groups);
            const groupList = document.getElementById('groupList');
            groupList.innerHTML = '';
            if (Array.isArray(groups)) {
                groups.forEach(group => {
                    const groupElement = document.createElement('div');
                    groupElement.textContent = group.name;
                    groupElement.classList.add('p-2', 'hover:bg-gray-200', 'cursor-pointer');
                    groupElement.addEventListener('click', () => loadGroupMessages(group.id, group.name));
                    groupList.appendChild(groupElement);
                });
            }
        } catch (error) {
            console.error('Error loading groups:', error);
        }
    }

    async function loadGroupMessages(groupId, groupName) {
        currentGroupId = groupId;
        document.getElementById('currentGroupHeader').textContent = groupName;
        lastMessageTimestamp = 0;

        document.getElementById('chat').innerHTML = '';
        localStorage.removeItem(`chatMessages_${currentGroupId}`);

        try {
            const response = await axios.get(`/group/${groupId}/messages`);
            const messages = response.data;
            await storeMessagesLocally(messages);
            await loadMessagesFromStorage();
        } catch (error) {
            console.error('Error loading group messages:', error);
        }
    }

    function showNewGroupModal() {
        document.getElementById('newGroupModal').classList.add('visible');
    }

    function hideNewGroupModal() {
        document.getElementById('newGroupModal').classList.remove('visible');
    }

    async function createNewGroup(e) {
        e.preventDefault();
        const groupName = document.getElementById('groupName').value.trim();
        const groupParticipants = document.getElementById('groupParticipants').value.trim().split(',');

        if (groupName && groupParticipants.length > 0) {
            const groupDetails = {
                name: groupName,
                participants: groupParticipants.map(phone => phone.trim()),
                createdBy: userId
            };
            try {
                const res = await axios.post('/group/create', groupDetails);
                if (res.status === 201) {
                    alert('Group created successfully!');
                    hideNewGroupModal();
                    await loadGroups();
                } else {
                    alert('Failed to create group');
                }
            } catch (error) {
                console.error('Error creating group:', error);
                alert('Error creating group: ' + error.message);
            }
        }
    }

    function filterGroups() {
        const searchTerm = document.getElementById('groupSearch').value.toLowerCase();
        const groups = document.getElementById('groupList').children;
        for (let group of groups) {
            if (group.textContent.toLowerCase().includes(searchTerm)) {
                group.style.display = '';
            } else {
                group.style.display = 'none';
            }
        }
    }

    function logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('chatMessages');
        window.location.href = '/login';
    }

    async function storeMessagesLocally(messages) {
        const updatedMessages = await Promise.all(messages.map(ensureMessageHasUserInfo));
        localStorage.setItem(`chatMessages_${currentGroupId}`, JSON.stringify(updatedMessages));
    }

    async function ensureMessageHasUserInfo(message) {
        if (!message.user && message.userId && message.userId !== userId) {
            try {
                const userInfo = await fetchUserInfo(message.userId);
                message.user = userInfo;
            } catch (error) {
                console.error('Error fetching user info:', error);
            }
        }
        return message;
    }

    async function fetchUserInfo(userId) {
        try {
            const response = await axios.get(`/user/${userId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching user info:', error);
            return null;
        }
    }

    // Fetch new messages periodically
    setInterval(async () => {
        if (currentGroupId) {
            const newMessages = await fetchNewMessages();
            if (newMessages.length > 0) {
                for (const message of newMessages) {
                    const updatedMessage = await ensureMessageHasUserInfo(message);
                    addMessageToChat(updatedMessage);
                    storeMessage(updatedMessage);
                }
            }
        }
    }, 5000);

    // Initial load
    await loadGroups();
});