import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// import axios from 'axios'; - No longer needed
import apiClient from '../api/axiosConfig'; // Corrected path
import { toast } from 'react-toastify'; // Import toast
import './LoginPage.css'; // Reverted to use LoginPage styles
import { AuthContext } from '../App'; // Import AuthContext from App.js
// import './RegisterPage.css'; // Removed incorrect CSS import

// const API_URL = 'http://localhost:5000/api'; - No longer needed

const RegisterPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    // Initialize hostelName to the first option or empty string
    const hostelOptions = ["Hostel 1", "Hostel 2", "Hostel 3", "Hostel 4", "Hostel 5"];
    const [hostelName, setHostelName] = useState(hostelOptions[0]); // Default to first hostel
    const [roomNumber, setRoomNumber] = useState(''); 
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({}); // Field-specific errors
    const navigate = useNavigate();
    const { user, login } = useContext(AuthContext); // Get login from context

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            navigate('/'); // Redirect to home page
        }
    }, [user, navigate]);

    const handleRegister = async (e) => {
        e.preventDefault();
        setError(null);       
        setFieldErrors({});   

        let hasError = false;
        const currentFieldErrors = {};

        if (password !== confirmPassword) {
            currentFieldErrors.confirmPassword = 'Passwords do not match';
            hasError = true;
        }
        if (password.length < 6) {
             currentFieldErrors.password = 'Password must be at least 6 characters long.';
             hasError = true;
        }
        if (username.length < 3) {
             currentFieldErrors.username = 'Username must be at least 3 characters long.';
             hasError = true;
        }
        
        if (hasError) {
             setFieldErrors(currentFieldErrors);
             setError('Please correct the errors above.'); 
             setLoading(false);
             return; 
        }
        
        setLoading(true);
        try {
            const userData = {
                username,
                password,
            };
            const response = await apiClient.post('/auth/register', userData);

            login(response.data);

            toast.success('Registration successful! Welcome!');
            
            navigate('/');

        } catch (err) {
            console.error("Registration failed:", err.response?.data || err.message);
            const resData = err.response?.data;
            if (resData) {
                if (resData.errors) { 
                    const errors = {};
                    resData.errors.forEach(er => errors[er.param] = er.msg);
                    setFieldErrors(errors);
                    setError('Please check the fields above.');
                } else if (resData.message) { 
                    setError(resData.message);
                } else {
                    setError('Registration failed. Please try again.');
                }
            } else {
                setError('Registration failed. Network error or server is down.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container"> {/* Reuses class from LoginPage.css */}
            <h1>Register</h1>
             <form onSubmit={handleRegister}>
                <div className="form-group">
                    <label htmlFor="username">Username</label>
                    <input
                        type="text"
                        id="username"
                        placeholder="Choose a username (min 3 chars)"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        aria-invalid={!!fieldErrors.username}
                        aria-describedby={fieldErrors.username ? "username-error" : undefined}
                    />
                    {fieldErrors.username && <span id="username-error" className="field-error">{fieldErrors.username}</span>}
                </div>
                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                        type="password"
                        id="password"
                        placeholder="Choose a password (min 6 chars)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength="6"
                        aria-invalid={!!fieldErrors.password}
                        aria-describedby={fieldErrors.password ? "password-error" : undefined}
                    />
                    {fieldErrors.password && <span id="password-error" className="field-error">{fieldErrors.password}</span>}
                </div>
                <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <input
                        type="password"
                        id="confirmPassword"
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength="6"
                        aria-invalid={!!fieldErrors.confirmPassword}
                        aria-describedby={fieldErrors.confirmPassword ? "confirmPassword-error" : undefined}
                    />
                    {fieldErrors.confirmPassword && <span id="confirmPassword-error" className="field-error">{fieldErrors.confirmPassword}</span>}
                </div>
                {error && <p className="auth-error">{error}</p>} {/* Use CSS class */}
                <button type="submit" disabled={loading}>
                     {loading ? 'Registering...' : 'Register'}
                </button>
            </form>
            <p className="auth-switch-link"> {/* Use CSS class */}
                Already have an account? <Link to="/login">Login here</Link>
            </p>
        </div>
    );
};

export default RegisterPage; 