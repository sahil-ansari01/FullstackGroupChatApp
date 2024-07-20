document.addEventListener('DOMContentLoaded', async (event) => {
    event.preventDefault();
    const socket = io();
    const groupSettingsModal = document.getElementById('groupSettingsModal');
    const closeSettingsModal = document.getElementById('closeSettingsModal');

    closeSettingsModal.addEventListener('click', () => {
        groupSettingsModal.classList.remove('visible');
        groupSettingsModal.classList.add('hidden');
    });

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

     // Check if user is an admin
     async function checkIfUserIsAdmin(groupId, userId) {
        try {
            const response = await axios.get(`/group/${groupId}/isAdmin?userId=${userId}`);
            return response.data.isAdmin;
        } catch (error) {
            console.error('Error checking admin status:', error);
            return false;
        }
    }

    // Show group settings modal if the user is an admin
    async function openGroupSettings(groupId) {
        const isAdmin = await checkIfUserIsAdmin(groupId, userId);
        if (isAdmin) {
            groupSettingsModal.classList.remove('hidden');
            groupSettingsModal.classList.add('visible');
            await loadGroupMembers(groupId);
        } else {
            alert('Only group admins can access settings.');
        }
    }

    async function loadGroupMessages(groupId, groupName) {
        currentGroupId = groupId;
        const currentGroupHeader = document.getElementById('currentGroupHeader');
        
        // Clear previous content
        currentGroupHeader.innerHTML = '';
        
        // Create and style the group name
        const groupNameSpan = document.createElement('span');
        groupNameSpan.textContent = groupName;
        
        // Check if the user is an admin
        const isAdmin = await checkIfUserIsAdmin(groupId, userId);
        
        if (isAdmin) {
            // Create and style the settings icon
            const groupSetting = document.createElement('span');
            groupSetting.innerHTML = '<i class="fas fa-cog"></i>'; // Font Awesome settings icon
            groupSetting.style.marginLeft = 'auto'; // Push the settings icon to the right
            groupSetting.style.cursor = 'pointer'; // Add a cursor pointer for better UX
            
            // Add the onclick handler
            groupSetting.onclick = function() {
                openGroupSettings(groupId);
            };
            
            // Append settings icon to the header
            currentGroupHeader.appendChild(groupSetting);
        }
        
        // Append group name to the header
        currentGroupHeader.appendChild(groupNameSpan);
        
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
    
    async function loadGroupMembers(groupId) {
        try {
            const response = await axios.get(`/group/${groupId}/members?userId=${userId}`);
            const membersList = response.data.membersList;
            console.log(membersList);
            const groupMembersList = document.getElementById('groupMembers');
            groupMembersList.innerHTML = '';
    
            membersList.forEach(member => {
                const memberItem = document.createElement('li');
                memberItem.style.listStyle = 'none';
                memberItem.textContent = `${member.name} `;
    
                const makeAdminButton = document.createElement('button');
                makeAdminButton.textContent = 'Make Admin';
                makeAdminButton.classList.add('admin-button'); // Adding class for styling
                makeAdminButton.onclick = async function() {
                    await makeAdmin(groupId, member.id);
                };
    
                const removeButton = document.createElement('button');
                removeButton.textContent = 'Remove';
                removeButton.classList.add('remove-button'); // Adding class for styling
                removeButton.onclick = async function() {
                    await removeMember(groupId, member.id);
                };
    
                // Create a container for buttons and align them to the right
                const buttonContainer = document.createElement('div');
                buttonContainer.style.marginLeft = 'auto'; 
                buttonContainer.classList = 'buttonContainer';
                buttonContainer.appendChild(makeAdminButton);
                buttonContainer.appendChild(removeButton);
    
                memberItem.appendChild(buttonContainer);
                groupMembersList.appendChild(memberItem);
            });
        } catch (error) {
            console.error('Error loading group members:', error);
        }
    }    
    
    async function makeAdmin(groupId, userId) {
        try {
            await axios.post(`/group/${groupId}/makeAdmin`, { userId });
            alert(`User ${userId} has been made an admin.`);
        } catch (error) {
            console.error('Error making user an admin:', error);
        }
    }
    
    async function removeMember(groupId, userId) {
        try {
            await axios.post(`/group/${groupId}/removeMember`, { userId });
            alert('User has been removed from the group.');
            await loadGroupMembers(groupId);
        } catch (error) {
            console.error('Error removing user from group:', error);
        }
    }    

    async function searchUsers(query) {
        try {
            console.log('Searching for users with query:', query);
            const response = await axios.get(`/user/search?query=${encodeURIComponent(query)}`);
            console.log('Search response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error searching users:', error);
            if (error.response) {
                console.error('Error response:', error.response.data);
            }
            return [];
        }
    }

    // Modify the existing event listener for the search input
    document.getElementById('searchUsers').addEventListener('input', async (event) => {
        const query = event.target.value.trim();
        const searchResults = document.getElementById('searchResults');
        searchResults.innerHTML = '';
    
        if (query) {
            try {
                const users = await searchUsers(query);
                
                if (users.length > 0) {
                    users.forEach(user => {
                        const userItem = document.createElement('div');
                        userItem.textContent = `${user.name} (${user.email || user.phone || 'No contact info'})`;
                        userItem.classList.add('p-2', 'hover:bg-gray-200', 'cursor-pointer');
                        userItem.addEventListener('click', () => addMemberToGroup(currentGroupId, user.id));
                        searchResults.appendChild(userItem);
                    });
                } else {
                    const noResults = document.createElement('div');
                    noResults.textContent = 'No users found';
                    noResults.classList.add('p-2', 'text-gray-500');
                    searchResults.appendChild(noResults);
                }
            } catch (error) {
                console.error('Error in user search:', error);
                const errorMessage = document.createElement('div');
                errorMessage.textContent = 'An error occurred while searching';
                errorMessage.classList.add('p-2', 'text-red-500');
                searchResults.appendChild(errorMessage);
            }
        }
    });

    // The addMemberToGroup function remains the same
    async function addMemberToGroup(groupId, userId) {
        try {
            await axios.post(`/group/${groupId}/addMember`, { userId });
            alert('User added to the group successfully');
            await loadGroupMembers(groupId);
            document.getElementById('searchUsers').value = '';
            document.getElementById('searchResults').innerHTML = '';
        } catch (error) {
            console.error('Error adding user to group:', error);
            alert('Failed to add user to the group');
        }
    }

    const fileInput = document.getElementById('fileInput');
    const fileButton = document.getElementById('fileButton');
    fileButton.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', handleFileUpload);

    async function handleFileUpload() {
        const file = fileInput.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('file', file);
            try {
                const response = await axios.post('/chat/upload', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
                const fileUrl = response.data.url;
                sendMessage(`File: ${file.name}`, fileUrl);
            } catch (error) {
                console.error('Error uploading file:', error);
                alert('Failed to upload file');
            }
        }
    }

    async function sendMessage(messageText, fileUrl = null) {
        if (!currentGroupId) {
            alert('Please select a group first');
            return;
        }

        if (messageText.trim() !== "" || fileUrl) {
            const message = {
                userId,
                groupId: currentGroupId,
                message: messageText,
                timestamp: Date.now(),
                fileUrl: fileUrl
            };
            
            // Emit the message to the server
            socket.emit('user-message', message);

            document.getElementById('messageInput').value = '';
        }
    }

    document.getElementById('messageForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const messageText = document.getElementById('messageInput').value.trim();
        await sendMessage(messageText);
    });

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
                timestamp: Date.now(),
                fileUrl: null
            };
            
            // Emit the message to the server
            socket.emit('user-message', message);

            document.getElementById('messageInput').value = '';
        }
    }

    // Socket.on('message') event listener
    socket.on('message', async (message) => {
        if (message.groupId === currentGroupId) {
            const updatedMessage = await ensureMessageHasUserInfo(message);
            addMessageToChat(updatedMessage);
            storeMessage(updatedMessage);
        }
    });
    
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
    
        if (message.fileUrl !== null) {
            const fileName = message.fileUrl.split('/').pop();
            let filePreview = '';
    
            // Determine the file type and generate the preview accordingly
            if (/\.(jpe?g|png|gif)$/i.test(fileName)) {
                // Image preview
                filePreview = `<img src="${escapeHTML(message.fileUrl)}" alt="${escapeHTML(fileName)}" class="w-48 h-48 mt-2 rounded">`;
            } else if (/\.(mp4|webm)$/i.test(fileName)) {
                // Video preview
                filePreview = `<video controls class="w-48 h-48 mt-2 rounded"><source src="${escapeHTML(message.fileUrl)}" type="video/mp4"></video>`;
            } else if (/\.(pdf)$/i.test(fileName)) {
                // PDF preview
                filePreview = `<embed src="${escapeHTML(message.fileUrl)}" type="application/pdf" class="w-48 h-48 mt-2 rounded">`;
            } else {
                // Link for other file types
                filePreview = `
                    <div class="flex items-center mt-2">
                        <svg class="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fill-rule="evenodd" d="M8 3a1 1 0 00-1 1v1H6a3 3 0 00-3 3v6a3 3 0 003 3h8a3 3 0 003-3V8a3 3 0 00-3-3h-1V4a1 1 0 00-1-1H8zm2 1v1H7V4h3zM6 7a1 1 0 00-1 1v6a1 1 0 001 1h8a1 1 0 001-1V8a1 1 0 00-1-1H6zm4 4H8a1 1 0 100 2h2a1 1 0 000-2z" clip-rule="evenodd"></path>
                        </svg>
                        <a href="${escapeHTML(message.fileUrl)}" target="_blank" class="ml-2 text-blue-500 underline">${escapeHTML(fileName)}</a>
                    </div>
                `;
            }
    
            messageElement.innerHTML = `
                <strong>${escapeHTML(sender)}:</strong> ${escapeHTML(message.message)}
                <br>${filePreview}
                <br><small class="text-gray-500">${timeString}</small>
            `;
        } else {
            messageElement.innerHTML = `
                <strong>${escapeHTML(sender)}:</strong> ${escapeHTML(message.message)}
                <br><small class="text-gray-500">${timeString}</small>
            `;
        }
    
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

    // Initial load
    await loadGroups();
});