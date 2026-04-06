import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom'; // To get state passed from profile page
// import axios from 'axios'; - No longer needed
import apiClient from '../api/axiosConfig'; // Import apiClient
import { AuthContext } from '../App';
import { useSocket } from '../context/SocketContext'; // Import useSocket
import './MessagesPage.css'; // Import CSS
import { toast } from 'react-toastify'; // Import toast

// const API_URL = 'http://localhost:5000/api'; - No longer needed
const UPLOAD_URL = 'http://localhost:5000/'; // Keep for media display

// Helper function to format date
const formatDate = (dateString) => {
    if (!dateString) return ''; try { return new Date(dateString).toLocaleString(); } catch (e) { return dateString; }
};

const MessagesPage = () => {
    const { user } = useContext(AuthContext);
    const { socket } = useSocket(); // Get socket instance
    const location = useLocation(); // Get location state if navigated from profile
    const [friends, setFriends] = useState([]);
    const [selectedFriend, setSelectedFriend] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessageText, setNewMessageText] = useState('');
    const [newMessageFile, setNewMessageFile] = useState(null);
    const [loadingFriends, setLoadingFriends] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null); // Ref for scrolling
    const fileInputRef = useRef(null); // Ref for resetting file input

    // Function to scroll to the bottom of the message list
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Fetch friends list
    useEffect(() => {
        const fetchFriends = async () => {
            if (!user?._id) return; 
            setLoadingFriends(true);
            setError(null);
            try {
                // Corrected Endpoint: Use /users/me to get logged-in user's data
                const response = await apiClient.get('/users/me'); 
                // The /users/me endpoint directly returns the user object with populated friends
                const userFriends = response.data?.friends || []; 
                setFriends(userFriends);

                if (location.state?.preSelectedUserId) {
                    const friendToSelect = userFriends.find(f => f._id === location.state.preSelectedUserId);
                    if (friendToSelect) {
                        setSelectedFriend(friendToSelect);
                    }
                }
            } catch (err) {
                console.error("Error fetching friends:", err);
                setError('Could not load friends list.');
            } finally {
                setLoadingFriends(false);
            }
        };
        fetchFriends();
    }, [user?._id, location.state]);

    // Fetch messages when a friend is selected
    const fetchMessages = useCallback(async (partnerId) => {
        if (!user?._id || !partnerId) return;
        setLoadingMessages(true);
        setError(null);
        try {
            const response = await apiClient.get(`/dms/${partnerId}`);
            setMessages(response.data);
        } catch (err) {
            console.error("Error fetching messages:", err);
            setError('Could not load messages.');
            setMessages([]);
        } finally {
            setLoadingMessages(false);
        }
    }, [user?._id]);

    useEffect(() => {
        if (selectedFriend?._id) {
            fetchMessages(selectedFriend._id);
        }
        // Clear messages when friend changes
        else {
            setMessages([]); 
        }
    }, [selectedFriend?._id, fetchMessages]);

    // --- Socket.IO Listener --- 
    useEffect(() => {
        if (!socket || !selectedFriend) return; // Only listen if socket connected and friend selected

        const handleNewMessage = (newMessage) => {
            console.log('Socket received newMessage:', newMessage);
            // Check if the message belongs to the currently selected chat
            if (newMessage.sender._id === selectedFriend._id || newMessage.receiver === selectedFriend._id) {
                setMessages((prevMessages) => [...prevMessages, newMessage]);
            }
        };

        socket.on('newMessage', handleNewMessage);

        // Cleanup listener
        return () => {
            socket.off('newMessage', handleNewMessage);
        };

    }, [socket, selectedFriend]); // Depend on socket and selectedFriend
    // --------------------------

    // Scroll to bottom when messages load or new message arrives
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSelectFriend = (friend) => {
        setSelectedFriend(friend);
        setMessages([]);
        setError(null);
    };

    const handleFileChange = (e) => {
        setNewMessageFile(e.target.files[0]);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if ((!newMessageText.trim() && !newMessageFile) || !selectedFriend?._id) {
            return;
        }
        setSendingMessage(true);
        setError(null);

        const formData = new FormData();
        formData.append('text', newMessageText);
        // formData.append('userId', user._id); // REMOVED
        if (newMessageFile) {
            formData.append('media', newMessageFile);
        }

        try {
            // Use apiClient - backend gets sender from token
            await apiClient.post(`/dms/${selectedFriend._id}`, formData);
            // Message added via socket, clear inputs
            setNewMessageText('');
            setNewMessageFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            // No success toast needed usually for chat messages
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Failed to send message.';
            console.error("Send DM Error:", err);
            setError(errorMsg); // Show error near input potentially
            toast.error(errorMsg); // Show toast error
        } finally {
            setSendingMessage(false);
        }
    };

    return (
        <div className="container messagesPageLayout">
            {/* Friends List Sidebar */}
            <div className="friendListContainer">
                <h2>Friends</h2>
                {loadingFriends && <p>Loading...</p>}
                {error && !loadingFriends && !selectedFriend && <p className="messagesError">{error}</p>}
                {!loadingFriends && friends.length === 0 && <p>No friends yet. Find users and add them!</p>}
                <ul className="friendList">
                    {friends.map(friend => (
                        <li
                            key={friend._id}
                            onClick={() => handleSelectFriend(friend)}
                            className={`friendListItem ${selectedFriend?._id === friend._id ? 'selected' : ''}`}
                        >
                             <img
                                src={friend.profilePictureUrl || '/1077596-200.png'}
                                alt={friend.username || 'Friend'}
                                className="friendAvatar"
                                onError={(e) => { e.target.onerror = null; e.target.src='/1077596-200.png'; }}
                             />
                            {friend.username || '[Deleted Friend]'}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Chat Area */}
            <div className="chatArea">
                {selectedFriend ? (
                    <>
                        <h2 className="chatHeader">Chat with {selectedFriend.username}</h2>
                        <div className="messageList">
                            {loadingMessages && <p>Loading messages...</p>}
                            {error && <p className="messagesError">{error}</p>}
                            {!loadingMessages && messages.length === 0 && <p>No messages yet. Start the conversation!</p>}
                            {!loadingMessages && messages.map(msg => (
                                <div key={msg._id} className={`messageItem ${msg.sender?._id === user?._id ? 'outgoing' : 'incoming'}`}>
                                    <p className="messageText">{msg.text}</p>
                                    {msg.media && (
                                        // Rudimentary media display - enhance as needed
                                        /.(jpg|jpeg|png|gif)$/i.test(msg.media) ? (
                                            <img src={`${UPLOAD_URL}${msg.media}`} alt="DM media" className="messageMedia" />
                                        ) : /.(mp4|webm|ogg)$/i.test(msg.media) ? (
                                             <video controls src={`${UPLOAD_URL}${msg.media}`} className="messageMedia" style={{ maxHeight: '250px'}} />
                                        ) : (
                                            <a href={`${UPLOAD_URL}${msg.media}`} target="_blank" rel="noopener noreferrer">View Attachment</a>
                                        )
                                    )}
                                    <span className="messageTimestamp">{formatDate(msg.createdAt)}</span>
                                </div>
                            ))}
                            <div ref={messagesEndRef} /> {/* Anchor for scrolling */}
                        </div>
                        <form onSubmit={handleSendMessage} className="messageForm">
                             <input
                                type="text"
                                placeholder="Type a message..."
                                value={newMessageText}
                                onChange={(e) => setNewMessageText(e.target.value)}
                                className="messageInput"
                                disabled={sendingMessage}
                            />
                            <input
                                type="file"
                                onChange={handleFileChange}
                                accept="image/*,video/*"
                                ref={fileInputRef}
                                disabled={sendingMessage}
                            />
                            <button type="submit" disabled={sendingMessage || (!newMessageText.trim() && !newMessageFile)}>
                                {sendingMessage ? 'Sending...' : 'Send'}
                            </button>
                        </form>
                    </>
                ) : (
                    <p className="noChatSelected">Select a friend to start chatting.</p>
                )}
            </div>
        </div>
    );
};

export default MessagesPage; 