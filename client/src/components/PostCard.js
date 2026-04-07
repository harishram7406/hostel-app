import React, { useContext, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
// import axios from 'axios'; - No longer needed
import apiClient from '../api/axiosConfig'; // Import apiClient
import { AuthContext } from '../App';
import MediaCarousel from './MediaCarousel'; // Import the MediaCarousel
import './PostCard.css'; // Import the CSS file
import { toast } from 'react-toastify'; // Import toast
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart as faHeartRegular, faComment } from '@fortawesome/free-regular-svg-icons';
import { faHeart as faHeartSolid } from '@fortawesome/free-solid-svg-icons';

// Helper function to format time difference
const timeSince = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m";
    return Math.floor(seconds) + "s";
};

// Add showDeleteButton prop, defaulting to true
const PostCard = ({ post, onPostDeleted, showDeleteButton = true }) => {
    const { user: loggedInUser } = useContext(AuthContext);
    const { _id, author, text, media = [], likes = [], commentCount = 0, category, createdAt } = post;
    
    // State for like status - initialize directly based on props
    const initialLiked = loggedInUser ? likes.includes(loggedInUser._id) : false;
    const [isLiked, setIsLiked] = useState(initialLiked);
    const [likeCount, setLikeCount] = useState(likes.length);
    
    // State for author details
    const [authorInfo, setAuthorInfo] = useState(null);
    const [loadingAuthor, setLoadingAuthor] = useState(true);
    const [errorAuthor, setErrorAuthor] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false); // State for delete operation

    // Single effect to set initial like state
    useEffect(() => {
        setIsLiked(loggedInUser ? likes.includes(loggedInUser._id) : false);
        setLikeCount(likes.length);
    }, [likes, loggedInUser]);

    // Single effect for author fetching
    useEffect(() => {
        let isMounted = true; // Prevent state update on unmounted component
        setLoadingAuthor(true);
        setErrorAuthor(false);
        setAuthorInfo(null); // Reset author info on post change

        if (author && typeof author === 'object') {
             // If author object is passed directly (already populated)
            console.log("PostCard: Using provided author object:", author);
            setAuthorInfo(author);
            setLoadingAuthor(false);
        } else if (author && typeof author === 'string') {
             // If only author ID is passed, fetch the user details
             console.log(`PostCard: Author is ID, fetching user: ${author}`);
            apiClient.get(`/users/${author}`)
                .then(response => {
                    if (isMounted) {
                        console.log(`PostCard: Fetched author data for ${author}:`, response.data);
                        setAuthorInfo(response.data);
                        setLoadingAuthor(false);
                    }
                })
                .catch(err => {
                    console.error("Error fetching author:", err);
                     if (isMounted) {
                        // Set authorInfo to a fallback object instead of just error flag
                        setAuthorInfo({ username: '[Deleted User]', profilePictureUrl: null });
                        setErrorAuthor(true); // Keep error flag if needed elsewhere
                        setLoadingAuthor(false);
                    }
                });
        } else {
             // Handle case where author prop is missing or invalid format
             console.warn("PostCard: Author prop is missing or invalid format for post:", _id);
             setAuthorInfo({ username: '[Deleted User]', profilePictureUrl: null });
            setErrorAuthor(true);
            setLoadingAuthor(false);
        }
        
        return () => { isMounted = false }; // Cleanup function
        
    }, [author, _id]); // Add _id to dependency array if console warnings need it

    const handleLike = async () => {
        if (!loggedInUser) return;
        const originalLikedState = isLiked;
        const originalLikeCount = likeCount;
        setIsLiked(!isLiked);
        setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
        try {
            await apiClient.post(`/posts/${_id}/like`);
        } catch (error) {            
            console.error('Error liking post:', error);
            setIsLiked(originalLikedState);
            setLikeCount(originalLikeCount);
        }
    };

    const handleDelete = async () => {
        if (!loggedInUser || loggedInUser._id !== authorInfo?._id || isDeleting) {
            return; // Only author can delete, prevent double clicks
        }

        // Confirmation dialog
        if (!window.confirm('Are you sure you want to delete this post?')) {
            return;
        }

        setIsDeleting(true);
        try {
            await apiClient.delete(`/posts/${_id}`);
            toast.success('Post deleted successfully!');
            if (onPostDeleted) {
                onPostDeleted(_id); // Notify parent component
            }
            // The component might unmount here if parent removes it from list
        } catch (error) {
            console.error("Error deleting post:", error);
            toast.error(error.response?.data?.message || 'Failed to delete post.');
            setIsDeleting(false); // Re-enable button on error
        }
    };
    
    // --- Conditional Rendering --- 
    if (loadingAuthor) {
        // Optional: Render a placeholder skeleton
        return <div className="postCard loadingPlaceholder">Loading post...</div>;
    }

    if (errorAuthor && !authorInfo) {
        // This condition might not be needed anymore if we always set a fallback authorInfo
        console.warn("Error state reached without fallback author info? Post ID:", _id);
        return <div className="postCard error">Error loading author information</div>;
    }

    // Ensure authorInfo is not null before proceeding (should be handled by useEffect now)
    if (!authorInfo) {
        console.log("PostCard: authorInfo is null during render, showing loading. Post ID:", _id);
        return <div className="postCard loadingPlaceholder">Loading author...</div>; // Or return null/placeholder
    }

    // Use the fallback info directly from authorInfo state
    const profilePicUrl = authorInfo.profilePictureUrl || '/1077596-200.png';
    const authorUsername = authorInfo.username; // Already set to '[Deleted User]' or actual username

    // Determine if the current user is the author (Check against _id if authorInfo isn't the full user)
    const isAuthor = loggedInUser?._id === (typeof author === 'string' ? author : authorInfo?._id);

    const postAge = timeSince(createdAt);

    return (
        <div className="postCard">
            <div className="postHeader">
                 {/* Link only works if author is not deleted */}
                 {authorInfo.username !== '[Deleted User]' ? (
                     <Link to={`/profile/${authorUsername}`}> 
                         <img 
                             src={profilePicUrl}
                             alt={`${authorUsername}'s avatar`}
                             className="avatar"
                             onError={(e) => { e.target.onerror = null; e.target.src='/1077596-200.png'; }}
                         />
                     </Link>
                 ) : (
                     <img 
                         src={profilePicUrl}
                         alt={`${authorUsername}'s avatar`}
                         className="avatar"
                         onError={(e) => { e.target.onerror = null; e.target.src='/1077596-200.png'; }}
                     />
                 )}
                 <div className="userInfo">
                     {authorInfo.username !== '[Deleted User]' ? (
                         <Link to={`/profile/${authorUsername}`}>{authorUsername}</Link>
                     ) : (
                         <span>{authorUsername}</span>
                     )}
                     <span className="postTimestamp"> · {postAge}</span>
                 </div>
                 {category && <span className="postCategory">{category}</span>}
                 {/* Conditionally show based on prop AND authorship */}
                 {showDeleteButton && isAuthor && (
                     <button 
                        onClick={handleDelete} 
                        disabled={isDeleting} 
                        className="deleteButton"
                        title="Delete Post"
                     >
                         &times; 
                     </button>
                 )}
             </div>

            {media.length > 0 && <MediaCarousel media={media} />}

            <div className="postContent">
                {text}
            </div>

            <div className="postFooter">
                <div className="postActions">
                    <button 
                        className={`actionButton likeButton ${isLiked ? 'liked' : ''}`}
                        onClick={handleLike}
                        // The like action doesn't have its own loading state, so it's not disabled
                        // disabled={isLiking} 
                    >
                        <FontAwesomeIcon icon={isLiked ? faHeartSolid : faHeartRegular} /> 
                         ({likeCount}) {/* Keep like count in parentheses */}
                    </button>
                    <Link to={`/posts/${_id}`} className="actionButton commentButton">
                        <FontAwesomeIcon icon={faComment} /> ({commentCount}) {/* Use commentCount from props */}
                    </Link>
                </div>
                 {/* ... timestamp ... */}
            </div>
        </div>
    );
};

// Remove inline styles
// const styles = { ... };

export default PostCard;
