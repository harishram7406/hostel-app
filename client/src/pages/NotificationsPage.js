import React, { useState, useEffect, useContext, useCallback } from 'react';
// import axios from 'axios'; - No longer needed
import apiClient from '../api/axiosConfig'; // Import apiClient
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { useSocket } from '../context/SocketContext'; // Import useSocket
import { toast } from 'react-toastify'; // Import toast
import './NotificationsPage.css';

// Helper function to format date
const formatDate = (dateString) => {
    if (!dateString) return ''; try { return new Date(dateString).toLocaleString(); } catch (e) { return dateString; }
};

const NotificationsPage = () => {
    const { user } = useContext(AuthContext);
    const { socket } = useSocket(); // Get socket instance
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate(); // Get navigate function

    const fetchNotifications = useCallback(async () => {
        if (!user?._id) return; // Still need user context initially
        setLoading(true);
        setError(null);
        try {
            // Use apiClient - backend gets user from token
            const response = await apiClient.get('/notifications/me');
            // No need for userId query param
            setNotifications(response.data.notifications || []);
        } catch (err) {
            console.error("Fetch Notifications Error:", err);
            setError('Failed to load notifications.');
        } finally {
            setLoading(false);
        }
    }, [user?._id]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // --- Socket.IO Listener for Notifications --- 
    useEffect(() => {
        if (!socket) return; // Only listen if socket connected

        const handleNewNotification = (newNotification) => {
            console.log('Socket received newNotification:', newNotification);
            // Add the new notification to the top of the list
            setNotifications((prevNotifications) => [
                newNotification, 
                ...prevNotifications
            ]);
            // Optionally limit the number of notifications kept in state
            // You might also want to update an unread count elsewhere (e.g., in Navbar)
        };

        socket.on('newNotification', handleNewNotification);

        // Cleanup listener
        return () => {
            socket.off('newNotification', handleNewNotification);
        };

    }, [socket]); // Depend only on socket
    // ---------------------------------------------

    const handleMarkAllRead = async () => {
        try {
            await apiClient.post('/notifications/me/read');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            toast.success('All notifications marked as read.');
        } catch (err) {
            const errorMsg = 'Failed to mark notifications as read.';
            console.error("Mark All Read Error:", err);
            setError(errorMsg); // Keep inline error?
            toast.error(errorMsg);
        }
    };

     // Function to generate notification text
    const getNotificationText = (notification) => {
        const initiatorName = notification.initiator?.username || 'Someone';
        switch (notification.type) {
            case 'like':
                return `${initiatorName} liked your post.`;
            case 'comment':
                return `${initiatorName} commented on your post.`;
            case 'friend_request':
                return `${initiatorName} sent you a friend request.`;
            case 'friend_accept':
                return `${initiatorName} accepted your friend request.`;
            default:
                return 'New notification';
        }
    };

    // Function to get the link for a notification
     const getNotificationLink = (notification) => {
        switch (notification.type) {
            case 'like':
            case 'comment':
                // Link to the single post page
                return notification.relatedPost?._id ? `/posts/${notification.relatedPost._id}` : '/';
            case 'friend_request':
            case 'friend_accept': // Link to the profile of the user who accepted/requested
                return notification.initiator?.username ? `/profile/${notification.initiator.username}` : '/';
            default:
                return '/';
        }
    };

    const handleNotificationClick = async (notification) => {
        const link = getNotificationLink(notification);

        // Mark as read only if it's currently unread
        if (!notification.isRead) {
            try {
                await apiClient.patch(`/notifications/${notification._id}/read`);
                // Update local state immediately for better UX
                setNotifications(prev => 
                    prev.map(n => 
                        n._id === notification._id ? { ...n, isRead: true } : n
                    )
                );
            } catch (err) {
                console.error("Mark Single Read Error:", err);
                toast.error('Failed to mark notification as read.');
                // Still navigate even if marking fails?
            }
        }
        
        // Navigate to the relevant link
        navigate(link);
    };

    return (
        <div className="container">
            <div className="notificationsHeader">
                 <h1>Notifications</h1>
                 <button onClick={handleMarkAllRead} disabled={notifications.every(n => n.isRead)} className="markAllButton">
                     Mark All Read
                 </button>
            </div>

            {loading && <p>Loading notifications...</p>}
            {error && <p className="notificationsError">{error}</p>}
            {!loading && notifications.length === 0 && <p>No notifications yet.</p>}

            <ul className="notificationList">
                {notifications.map(notification => (
                    <li 
                        key={notification._id} 
                        className={`notificationItem ${notification.isRead ? '' : 'unread'}`}
                        onClick={() => handleNotificationClick(notification)}
                        style={{ cursor: 'pointer' }}
                    >
                        <img
                            src={notification.initiator?.profilePictureUrl || '/1077596-200.png'}
                            alt={notification.initiator?.username || 'User'}
                            className="notificationAvatar"
                             onError={(e) => { e.target.onerror = null; e.target.src='/1077596-200.png'; }} // Fallback
                        />
                        <div className="notificationContent">
                            {/* Link is now handled by the li onClick, but keep for structure/SEO? */}
                            {/* <Link to={getNotificationLink(notification)} className="notificationLink"> */}
                                {getNotificationText(notification)}
                            {/* </Link> */}
                             <span className="notificationTimestamp">{formatDate(notification.createdAt)}</span>
                        </div>
                        {!notification.isRead && <span className="unreadIndicator"></span>}
                    </li>
                ))}
            </ul>
        </div>
    );
};

// Remove inline styles object
// const styles = { ... };

export default NotificationsPage; 