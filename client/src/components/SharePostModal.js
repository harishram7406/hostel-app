import React, { useState, useEffect, useContext } from 'react';
// import axios from 'axios'; - No longer needed
import apiClient from '../api/axiosConfig'; // Import apiClient
import { AuthContext } from '../App';
import './Modal.css'; // Shared modal styles

// const API_URL = 'http://localhost:5000/api'; - No longer needed
// const UPLOAD_URL = 'http://localhost:5000/'; - Not needed here

const SharePostModal = ({ isOpen, onClose, postToShare }) => {
    const { user } = useContext(AuthContext);
    const [friends, setFriends] = useState([]);
    const [selectedFriendId, setSelectedFriendId] = useState('');
    const [loadingFriends, setLoadingFriends] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    // Fetch friends when the modal opens
    useEffect(() => {
        if (isOpen && user?._id) {
            setLoadingFriends(true);
            setError(null);
            setSuccessMessage('');
            setSelectedFriendId(''); // Reset selection
            const fetchFriends = async () => {
                try {
                    // Use apiClient - Fetch logged-in user details to get friends
                    const response = await apiClient.get(`/users/${user._id}`);
                    setFriends(response.data?.user?.friends || []);
                } catch (err) {
                    console.error("Error fetching friends for share:", err);
                    setError('Could not load friends list.');
                } finally {
                    setLoadingFriends(false);
                }
            };
            fetchFriends();
        }
    }, [isOpen, user?._id]);

    const handleShare = async (e) => {
        e.preventDefault();
        if (!selectedFriendId || !postToShare?._id) {
             setError('Please select a friend to share with.');
             return;
         }
        // No need to check user._id

        setSending(true);
        setError(null);
        setSuccessMessage('');

        const postLink = `/posts/${postToShare._id}`;
        const messageText = `Check out this post: ${window.location.origin}${postLink}`;

        try {
            // Use apiClient - backend gets sender from token
            await apiClient.post(`/dms/${selectedFriendId}`, {
                text: messageText,
                // userId: user._id // REMOVED
            });
            setSuccessMessage(`Post shared successfully with ${friends.find(f => f._id === selectedFriendId)?.username || 'selected friend'}!`);
        } catch (err) {
             console.error("Share Post Error:", err);
             setError(err.response?.data?.message || 'Failed to share post.');
        } finally {
             setSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modalOverlay">
            <div className="modalContent">
                <h2>Share Post</h2>
                {loadingFriends && <p>Loading friends...</p>}
                {error && <p className="error-message">{error}</p>}
                {successMessage && <p className="success-message">{successMessage}</p>}

                {!loadingFriends && !error && (
                    <form onSubmit={handleShare}>
                        <div className="form-group">
                            <label htmlFor="share-friend">Share with:</label>
                            {friends.length > 0 ? (
                                <select
                                    id="share-friend"
                                    value={selectedFriendId}
                                    onChange={(e) => setSelectedFriendId(e.target.value)}
                                    required
                                >
                                    <option value="" disabled>Select a friend...</option>
                                    {friends.map(friend => (
                                        <option key={friend._id} value={friend._id}>
                                            {friend.username}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <p>You have no friends to share with yet.</p>
                            )}
                        </div>

                        <div className="modalActions">
                            <button type="button" onClick={onClose} disabled={sending}>Cancel</button>
                            <button type="submit" disabled={!selectedFriendId || sending || loadingFriends || friends.length === 0}>
                                {sending ? 'Sharing...' : 'Share'}
                            </button>
                        </div>
                    </form>
                )}
                 {/* Show close button even if loading/error */}
                 {!loadingFriends && error && (
                     <div className="modalActions">
                         <button type="button" onClick={onClose}>Close</button>
                     </div>
                 )}
            </div>
        </div>
    );
};

export default SharePostModal; 