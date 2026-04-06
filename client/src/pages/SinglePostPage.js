import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
// import axios from 'axios'; - No longer needed
import apiClient from '../api/axiosConfig'; // Import apiClient
import { AuthContext } from '../App'; // Import AuthContext
import PostCard from '../components/PostCard';
// Commented out - Assuming comments are handled via PostCard interaction or a separate component
// import CommentSidebar from '../components/CommentSidebar';
import { toast } from 'react-toastify'; // Import toast
import './SinglePostPage.css'; // Import CSS

// const API_URL = 'http://localhost:5000/api'; - No longer needed

const UPLOAD_URL = 'http://localhost:5000/'; // Needed for comment author avatars
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
}; // Helper for comment timestamps

const SinglePostPage = () => {
    const { postId } = useParams();
    const { user } = useContext(AuthContext); // Get logged-in user
    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]); // State for comments
    const [newCommentText, setNewCommentText] = useState(''); // State for comment input
    const [loadingPost, setLoadingPost] = useState(true);
    const [loadingComments, setLoadingComments] = useState(true);
    const [errorPost, setErrorPost] = useState(null);
    const [errorComment, setErrorComment] = useState(null); // Separate error for comments
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);

    console.log(`--- SinglePostPage Mounted: postId from params = ${postId} ---`); // Log postId on mount

    // Fetch Post Data
    useEffect(() => {
        console.log(`--- useEffect for fetchPost triggered with postId: ${postId} ---`); // Log effect trigger
        const fetchPost = async () => {
            setLoadingPost(true);
            setErrorPost(null);
            try {
                console.log(`--- fetchPost: Attempting API call to /posts/${postId} ---`); // Log API call attempt
                // Use apiClient
                const response = await apiClient.get(`/posts/${postId}`);
                console.log('--- fetchPost: API call successful, setting post data ---'); // Log success
                setPost(response.data);
            } catch (err) {
                console.error("--- fetchPost: CATCH BLOCK ERROR ---", err); // Log error
                setErrorPost(err.response?.data?.message || 'Failed to load post.');
            } finally {
                console.log('--- fetchPost: finally block, setLoadingPost(false) ---'); // Log finally
                setLoadingPost(false);
            }
        };

        if (postId) { // Only fetch if postId is valid
            fetchPost();
        } else {
             console.error("--- fetchPost: Skipping fetch because postId is invalid or missing ---");
             setErrorPost("Invalid Post ID provided.");
             setLoadingPost(false);
        }
    }, [postId]);

    // Fetch Comments Data
    useEffect(() => {
        console.log(`--- useEffect for fetchComments triggered with postId: ${postId} ---`); // Log effect trigger
        const fetchComments = async () => {
            setLoadingComments(true);
            setErrorComment(null);
            try {
                 console.log(`--- fetchComments: Attempting API call to /posts/${postId}/comments ---`); // Log API call attempt
                const response = await apiClient.get(`/posts/${postId}/comments`);
                 console.log('--- fetchComments: API call successful, setting comments data ---'); // Log success
                setComments(response.data);
            } catch (err) {
                console.error("--- fetchComments: CATCH BLOCK ERROR ---", err); // Log error
                 setErrorComment(err.response?.data?.message || 'Failed to load comments.'); // Use specific error if available
            } finally {
                console.log('--- fetchComments: finally block, setLoadingComments(false) ---'); // Log finally
                setLoadingComments(false);
            }
        };

        if (postId) { // Only fetch if postId is valid
             fetchComments();
        } else {
             console.error("--- fetchComments: Skipping fetch because postId is invalid or missing ---");
             setErrorComment("Invalid Post ID provided.");
             setLoadingComments(false);
        }
    }, [postId]); // Dependency on postId

    // Handle Comment Submission
    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newCommentText.trim() || isSubmittingComment || !user) return;

        setIsSubmittingComment(true);
        setErrorComment(null);

        try {
             console.log(`--- handleAddComment: Attempting POST to /posts/${postId}/comments ---`); // Log add comment
            const response = await apiClient.post(`/posts/${postId}/comments`, {
                text: newCommentText
            });
            // Add the new comment (returned by API) to the start of the list
            setComments(prevComments => [response.data, ...prevComments]);
            setNewCommentText(''); // Clear input field
            toast.success('Comment added!');
        } catch (err) {
            console.error("--- handleAddComment: CATCH BLOCK ERROR ---", err); // Log error
            const errorMsg = err.response?.data?.message || 'Failed to add comment.';
            setErrorComment(errorMsg); // Show error related to comments
            toast.error(errorMsg);
        } finally {
            setIsSubmittingComment(false);
        }
    };

    // Handle Comment Deletion
    const handleDeleteComment = async (commentId) => {
        if (!window.confirm('Are you sure you want to delete this comment?')) {
            return;
        }

        try {
             console.log(`--- handleDeleteComment: Attempting DELETE to /comments/${commentId} ---`); // Log delete comment
            await apiClient.delete(`/comments/${commentId}`);
            // Remove the comment from state
            setComments(prevComments => prevComments.filter(comment => comment._id !== commentId));
            toast.success('Comment deleted!');
        } catch (err) {
             console.error("--- handleDeleteComment: CATCH BLOCK ERROR ---", err); // Log error
             const errorMsg = err.response?.data?.message || 'Failed to delete comment.';
             setErrorComment(errorMsg); // Show error related to comments
             toast.error(errorMsg);
        }
    };

    // Add logging for render states
    console.log(`--- SinglePostPage Rendering: loadingPost=${loadingPost}, errorPost=${errorPost}, loadingComments=${loadingComments}, errorComment=${errorComment}, postExists=${!!post} ---`);

    if (loadingPost) return <div className="container"><p>Loading post...</p></div>;
    // Use CSS class for error
    if (errorPost) return <div className="container"><p className="postError">{errorPost}</p></div>;
    if (!post) return <div className="container"><p>Post not found.</p></div>;

    return (
        <div className="container singlePostContainer">
            <Link to="/" className="backLink">&larr; Back to Feed</Link>
            <div className="postLayout">
                <div className="postCardWrapper">
                    {/* Pass post data AND hide the delete button */}
                    <PostCard post={post} showDeleteButton={false} />
                 </div>

                 <div className="commentsSection">
                     <h3>Comments</h3>

                     {/* Add Comment Form */}
                     {user && ( // Only show form if logged in
                         <form onSubmit={handleAddComment} className="commentForm">
                             <textarea
                                 value={newCommentText}
                                 onChange={(e) => setNewCommentText(e.target.value)}
                                 placeholder="Add a comment..."
                                 rows="3"
                                 required
                             />
                             <button type="submit" disabled={isSubmittingComment}>
                                 {isSubmittingComment ? 'Posting...' : 'Post Comment'}
                             </button>
                         </form>
                     )}
                     {!user && (
                         <p><Link to="/login">Log in</Link> to add a comment.</p>
                     )}

                     {/* Display Comment Errors */}
                     {errorComment && <p className="commentError">{errorComment}</p>}

                     {/* Display Comments List */}
                     {loadingComments ? (
                         <p>Loading comments...</p>
                     ) : comments.length > 0 ? (
                         <ul className="commentsList">
                             {comments.map(comment => (
                                 <li key={comment._id} className="commentItem">
                                     <div className="commentHeader">
                                         <img
                                             src={comment.author?.profilePictureUrl || '/1077596-200.png'}
                                             alt={comment.author?.username}
                                             className="commentAvatar"
                                             onError={(e) => { e.target.onerror = null; e.target.src='/1077596-200.png'; }}
                                         />
                                         <Link to={`/profile/${comment.author?.username}`} className="commentAuthor">
                                             {comment.author?.username || 'Unknown User'}
                                         </Link>
                                         <span className="commentTimestamp"> · {timeSince(comment.createdAt)}</span>
                                         {/* Delete Button for Comment Author */}
                                         {user && user._id === comment.author?._id && (
                                             <button
                                                onClick={() => handleDeleteComment(comment._id)}
                                                className="deleteCommentButton"
                                                title="Delete Comment"
                                             >
                                                 &times;
                                             </button>
                                         )}
                                     </div>
                                     <p className="commentText">{comment.text}</p>
                                 </li>
                             ))}
                         </ul>
                     ) : (
                         <p>No comments yet.</p>
                     )}
                 </div>
            </div>
        </div>
    );
};

export default SinglePostPage; 