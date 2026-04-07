import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useParams } from 'react-router-dom';
// import axios from 'axios'; - No longer needed
import apiClient from '../api/axiosConfig'; // Import apiClient
import { AuthContext } from '../App';
import PostCard from '../components/PostCard';
import EditProfileModal from '../components/EditProfileModal';
import { toast } from 'react-toastify'; // Import toast
import './ProfilePage.css';

const ProfilePage = () => {
    const { username } = useParams();
    const { user } = useContext(AuthContext);
    // const navigate = useNavigate(); // Removed: not used

    const [profileData, setProfileData] = useState(null);
    const [userPosts, setUserPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [friendStatus, setFriendStatus] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const isOwnProfile = user?.username === username;

    // Use useCallback to prevent recreation on every render
    const fetchProfileAndFriendStatus = useCallback(async () => {
        console.log(`FETCHING profile for username: ${username}`);
        setLoading(true);
        setError(null);
        try {
            // ALWAYS use the public profile route which returns user AND posts
            console.log(`Calling API: /users/profile/${username}`);
            const profileRes = await apiClient.get(`/users/profile/${username}`);
            console.log('API Response received', profileRes);

            const profileResult = profileRes.data;
            const profile = profileResult?.user;
            const posts = profileResult?.posts || [];
            
            if (!profile) {
                console.error('Profile.user data missing in response', profileResult);
                 throw new Error('User data not found in response.');
            }
            console.log('Profile data extracted', profile);
            console.log('Posts data extracted', posts);
            
            setProfileData(profile);
            setUserPosts(posts);
            console.log('Profile and Posts state SET');

            // Fetch friend status only if viewing someone else's profile
            if (!isOwnProfile && user?._id && profile._id) {
                 console.log('Fetching friend status...');
                try {
                    const friendStatusRes = await apiClient.get(`/friends/status/${profile._id}`);
                     console.log('Friend status received', friendStatusRes.data);
                    setFriendStatus(friendStatusRes.data.status);
                } catch (friendErr) {
                    console.error("Error fetching friend status:", friendErr);
                    setFriendStatus('error'); 
                }
            } else {
                 console.log('Skipping friend status fetch (own profile or missing IDs)');
            }
            console.log('Profile fetch function finished successfully.');

        } catch (err) {
            console.error("Error fetching profile (in catch block):", err);
            let errorMsg = 'Profile not found or error loading profile.';
            if (err.response) {
                errorMsg = err.response.data?.message || `Request failed with status ${err.response.status}`;
            } else if (err.request) {
                errorMsg = 'Could not connect to server. Please check your network.';
            } else {
                errorMsg = err.message;
            }
            setError(errorMsg);
            setProfileData(null);
            setUserPosts([]);
        } finally {
            console.log('Setting loading to false (in finally block)');
            setLoading(false);
        }
    }, [username, user, isOwnProfile]);

    useEffect(() => {
        console.log(`EFFECT triggered for username: ${username}, user exists: ${!!user?._id}`);
        if (username) {
             fetchProfileAndFriendStatus();
        }
    }, [username, user?._id, fetchProfileAndFriendStatus]); 

    // Function to remove post from state
    const handlePostDeleted = (deletedPostId) => {
        setUserPosts(currentUserPosts => currentUserPosts.filter(post => post._id !== deletedPostId));
    };

    const handleFriendAction = async (action) => {
        if (!user || !profileData) return;
        const targetUserId = profileData._id;
        const endpointMap = {
            add: '/friends/request',
            remove: '/friends/remove',
            accept: '/friends/accept',
            reject: '/friends/reject',
            cancel: '/friends/cancel'
        };
        const endpoint = endpointMap[action];
        if (!endpoint) return;

        try {
            // Use apiClient - backend gets logged-in user from token
            // Send only the target friendId in the body
            const response = await apiClient.post(endpoint, { friendId: targetUserId });

            // Update friend status based on action
            switch (action) {
                case 'add': setFriendStatus('pending_sent'); break;
                case 'remove': case 'reject': case 'cancel': setFriendStatus('none'); break;
                case 'accept': setFriendStatus('friends'); break;
                default: break;
            }
            toast.success(response.data?.message || `Friend action ${action} successful.`); // Success toast
        } catch (err) {
            const errorMsg = err.response?.data?.message || `Failed to ${action} friend.`;
            console.error(`Error performing friend action ${action}:`, err);
            setError(errorMsg); // Keep inline error near button?
            toast.error(errorMsg); // Show toast error
        }
    };

    const handleCloseEditModal = (updated) => {
        setIsEditModalOpen(false);
        if (updated) {
            fetchProfileAndFriendStatus(); // Refetch profile data if updated
        }
    };

    if (loading) return <div>Loading profile...</div>;
    if (error) return <div className="profileError">Error: {error}</div>;
    if (!profileData) return <div>Profile not found.</div>;

    const { username: profileUsername, bio, profilePictureUrl: actualProfilePicUrl, createdAt } = profileData;
    const joinDate = new Date(createdAt).toLocaleDateString();
    const profilePicUrl = actualProfilePicUrl || '/1077596-200.png';

    const renderFriendButton = () => {
        if (isOwnProfile) {
            return (
                <button onClick={() => setIsEditModalOpen(true)} className="button-primary">
                    Edit Profile
                </button>
            );
        }

        switch (friendStatus) {
            case 'friends':
                return <button onClick={() => handleFriendAction('remove')}>Remove Friend</button>;
            case 'pending_sent':
                return <button onClick={() => handleFriendAction('cancel')}>Cancel Request</button>;
            case 'pending_received':
                return (
                    <>
                        <button onClick={() => handleFriendAction('accept')} className="button-success">Accept Request</button>
                        <button onClick={() => handleFriendAction('reject')} className="button-danger">Reject Request</button>
                    </>
                );
            case 'none':
            default:
                return <button onClick={() => handleFriendAction('add')} className="button-primary">Add Friend</button>;
        }
    };

    return (
        <div className="container">
            <div className="profileHeader">
                <img
                    src={profilePicUrl}
                    alt={`${profileUsername}'s avatar`}
                    className="profileAvatar"
                    onError={(e) => { e.target.onerror = null; e.target.src='/1077596-200.png'; }}
                 />
                <div className="profileInfo">
                    <h1>{profileUsername}</h1>
                    {bio && <p className="profileBio">{bio}</p>}
                    <p>Member since: {joinDate}</p>
                </div>
                <div className="profileActions">
                    {renderFriendButton()}
                </div>
            </div>
            <hr className="profileHr" />
            <h2 className="profilePostListTitle">Posts by {profileUsername}</h2>
            {userPosts && userPosts.length > 0 ? (
                userPosts.map(post => (
                    <PostCard 
                        key={post._id} 
                        post={post} 
                        onPostDeleted={handlePostDeleted}
                        showDeleteButton={isOwnProfile}
                    />
                ))
            ) : (
                <p>{isOwnProfile ? "You haven't" : `${profileUsername} hasn't`} posted anything yet.</p>
            )}
            {isOwnProfile && isEditModalOpen && (
                <EditProfileModal
                    isOpen={isEditModalOpen}
                    onClose={handleCloseEditModal}
                    // Pass necessary data; ensure EditProfileModal uses apiClient
                    currentProfileData={profileData}
                 />
            )}
        </div>
    );

};

export default ProfilePage; 