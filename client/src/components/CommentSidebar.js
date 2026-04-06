import React, { useState, useEffect, useContext, useCallback } from 'react';
// import axios from 'axios'; - No longer needed
import apiClient from '../api/axiosConfig'; // Import apiClient
import { Link } from 'react-router-dom';
import { AuthContext } from '../App'; // Adjust as needed
import './CommentSidebar.css'; // Import CSS

// const API_URL = 'http://localhost:5000/api'; - No longer needed
const UPLOAD_URL = 'http://localhost:5000/'; // Keep for media display

// Helper function to format date
const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
        return new Date(dateString).toLocaleString();
    } catch (e) {
        return dateString; // Fallback
    }
};

const CommentSidebar = ({ postId, isOpen, onClose }) => {
    const { user } = useContext(AuthContext);
    const [comments, setComments] = useState([]);
    const [newCommentText, setNewCommentText] = useState('');
    const [loading, setLoading] = useState(false);
    const [posting, setPosting] = useState(false);
    const [error, setError] = useState(null);

    const fetchComments = useCallback(async () => {
        if (!postId) return;
        setLoading(true);
        setError(null);
        try {
            // Use apiClient
            const response = await apiClient.get(`/posts/${postId}/comments`);
            setComments(response.data);
        } catch (err) {
            console.error("Fetch Comments Error:", err);
            setError('Failed to load comments.');
        } finally {
            setLoading(false);
        }
    }, [postId]);

    // Fetch comments when the sidebar opens or postId changes
    useEffect(() => {
        if (isOpen) {
            fetchComments();
        }
    }, [isOpen, fetchComments]);

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newCommentText.trim()) return;
        // No need to check user._id here, backend handles auth
        setPosting(true);
        setError(null);

        try {
            // Use apiClient - backend gets user from token
            const response = await apiClient.post(`/posts/${postId}/comments`, {
                text: newCommentText,
                // userId: user._id // REMOVED
            });
            if (response.status === 201) {
                setComments(prevComments => [...prevComments, response.data]); // Add new comment to list
                setNewCommentText(''); // Clear input
            } else {
                setError('Failed to post comment.');
            }
        } catch (err) {
            console.error("Add Comment Error:", err);
            setError(err.response?.data?.message || 'Failed to post comment.');
        } finally {
            setPosting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="commentSidebar">
            <div className="sidebarHeader">
                <h3>Comments</h3>
                <button onClick={onClose} className="closeButton">×</button>
            </div>
            <div className="commentList">
                {loading && <p>Loading comments...</p>}
                {error && <p className="commentError">{error}</p>}
                {!loading && comments.length === 0 && <p>No comments yet.</p>}
                {!loading && comments.map(comment => (
                    <div key={comment._id} className="commentItem">
                        <img
                             src={comment.author?.profilePicture ? `${UPLOAD_URL}${comment.author.profilePicture}` : `${UPLOAD_URL}uploads/default_avatar.png`}
                             alt={comment.author?.username || 'User'}
                             className="commentAvatar"
                        />
                        <div className="commentContent">
                            <Link to={`/profile/${comment.author?._id}`} className="commentAuthor">
                                {comment.author?.username || 'Unknown User'}
                            </Link>
                            <span className="commentTimestamp">{formatDate(comment.createdAt)}</span>
                            <p className="commentText">{comment.text}</p>
                        </div>
                    </div>
                ))}
            </div>
            <form onSubmit={handleAddComment} className="commentForm">
                <textarea
                    placeholder="Write a comment..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    maxLength={150} // From Comment model
                    required
                    className="commentTextarea"
                />
                <button type="submit" disabled={posting} className="commentSubmitButton">
                    {posting ? 'Posting...' : 'Post'}
                </button>
            </form>
        </div>
    );
};

// Remove inline styles
// const styles = { ... };

export default CommentSidebar; 