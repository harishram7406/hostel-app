import React, { useState, useContext } from 'react';
// import axios from 'axios'; - No longer needed
import apiClient from '../api/axiosConfig'; // Import apiClient
import { AuthContext } from '../App';
import './CreatePostForm.css';

// const API_URL = 'http://localhost:5000/api'; - No longer needed
const CATEGORIES = ['General', 'Events', 'Lost & Found', 'Announcements', 'Other'];

const CreatePostForm = ({ onPostCreated }) => {
    const { user } = useContext(AuthContext);
    const [text, setText] = useState('');
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [file, setFile] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError(null);
        } else {
            setFile(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!text.trim() && !file) {
            setError('Post must include text or media.');
            return;
        }
        setError(null);
        setLoading(true);

        const formData = new FormData();
        formData.append('text', text);
        formData.append('category', category);

        if (file) {
            formData.append('media', file);
        }

        try {
            const response = await apiClient.post('/posts', formData);

            if (response.status === 201) {
                onPostCreated(response.data);
                setText('');
                setCategory(CATEGORIES[0]);
                setFile(null);
                e.target.reset();
            } else {
                setError('Failed to create post.');
            }
        } catch (err) {
            console.error("Create Post API Error:", err);
            setError(err.response?.data?.message || 'An error occurred while creating the post.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="createPostForm">
            <h3>Create New Post</h3>
            <textarea
                className="postTextarea"
                placeholder={`What's on your mind, ${user?.username || 'User'}?`}
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={280}
            />
            <div className="formControls">
                <div>
                     <label htmlFor="category">Category: </label>
                     <select
                        id="category"
                        className="categorySelect"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                    >
                        {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
                 <div>
                    <label htmlFor="media-upload" className="fileInputLabel">Add Photo/Video (Optional): </label>
                    <input
                        type="file"
                        id="media-upload"
                        className="fileInput"
                        accept="image/*,video/*"
                        onChange={handleFileChange}
                    />
                 </div>
            </div>
            {file && (
                <div className="filePreview">
                   Selected file: {file.name}
                </div>
            )}
            {error && <p className="formError">{error}</p>}
            <button type="submit" disabled={loading} className="postSubmitButton">
                {loading ? 'Posting...' : 'Post'}
            </button>
        </form>
    );
};

// Remove inline styles
// const styles = { ... };

export default CreatePostForm; 