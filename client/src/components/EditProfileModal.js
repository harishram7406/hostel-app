import React, { useState, useContext, useEffect } from 'react';
// import axios from 'axios'; - No longer needed
import apiClient from '../api/axiosConfig'; // Import apiClient
import { AuthContext } from '../App';
import './Modal.css'; // Shared modal styles
import { toast } from 'react-toastify'; // Import toast

// const API_URL = 'http://localhost:5000/api'; - No longer needed

const EditProfileModal = ({ isOpen, onClose, currentProfileData }) => {
    const { setUser: setAuthUser } = useContext(AuthContext);
    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');
    const [profilePictureFile, setProfilePictureFile] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (currentProfileData) {
            setUsername(currentProfileData.username || '');
            setBio(currentProfileData.bio || '');
        } else {
             // Reset form if modal is opened without data (shouldn't happen ideally)
             setUsername('');
             setBio('');
        }
        // Reset file input state when modal opens
        setProfilePictureFile(null);
         setError(null);
    }, [currentProfileData, isOpen]);

    const handleFileChange = (e) => {
        setProfilePictureFile(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // No need to check currentProfileData._id, backend uses token

        setLoading(true);
        setError(null);

        const formData = new FormData();
        let hasChanges = false;

        // Only append fields that have actually changed
        if (username !== currentProfileData.username) {
            formData.append('username', username);
            hasChanges = true;
        }
        if (bio !== currentProfileData.bio) {
            formData.append('bio', bio);
            hasChanges = true;
        }
        if (profilePictureFile) {
            formData.append('profilePicture', profilePictureFile);
            hasChanges = true;
        }
        // formData.append('userId', currentProfileData._id); // REMOVED

        if (!hasChanges) {
             setError("No changes detected.");
             setLoading(false);
             return;
         }

        try {
            // Use apiClient - PUT request to /users/me
            const response = await apiClient.put('/users/me', formData, {
                // Content-Type handled automatically for FormData
            });

            if (response.data) {
                // Update AuthContext and localStorage with the potentially updated token/user info
                setAuthUser(response.data);
                localStorage.setItem('userInfo', JSON.stringify(response.data));
                toast.success('Profile updated successfully!');
                onClose(true); // Close modal and signal success
            } else {
                 setError('Failed to update profile.');
            }

        } catch (err) {
            console.error("Update Profile Error:", err);
            const errorMsg = err.response?.data?.message || 'Error updating profile.';
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modalOverlay">
            <div className="modalContent">
                <h2>Edit Profile</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="edit-username">Username</label>
                        <input
                            type="text"
                            id="edit-username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            minLength="3"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="edit-bio">Bio</label>
                        <textarea
                            id="edit-bio"
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            maxLength="160"
                            rows="3"
                        />
                    </div>
                     <div className="form-group">
                        <label htmlFor="edit-avatar">Profile Picture</label>
                        <input
                            type="file"
                            id="edit-avatar"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                         {profilePictureFile && <span className="fileNameIndicator">Selected: {profilePictureFile.name}</span>}
                    </div>

                    {error && <p className="error-message">{error}</p>}

                    <div className="modalActions">
                        <button type="button" onClick={() => onClose(false)} disabled={loading}>Cancel</button>
                        <button type="submit" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditProfileModal; 