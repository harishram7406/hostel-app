import axios from 'axios';

// Define the base URL for the API
const API_BASE_URL = 'http://localhost:5000/api';

// Create a new Axios instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
});

// Add a request interceptor to include the JWT token
apiClient.interceptors.request.use(
    (config) => {
        // Get user info from local storage
        const userInfoString = localStorage.getItem('userInfo');
        console.log('Interceptor: userInfoString from localStorage:', userInfoString);
        if (userInfoString) {
            try {
                const userInfo = JSON.parse(userInfoString);
                if (userInfo && userInfo.token) {
                    console.log('Interceptor: Found token, adding Authorization header.');
                    // Add the Authorization header
                    config.headers.Authorization = `Bearer ${userInfo.token}`;
                } else {
                    console.warn('Interceptor: userInfo parsed but no token found.', userInfo);
                }
            } catch (error) {
                console.error('Interceptor: Error parsing user info from localStorage:', error);
            }
        } else {
             console.log('Interceptor: No userInfoString found in localStorage.');
        }
        return config;
    },
    (error) => {
        // Handle request error
        return Promise.reject(error);
    }
);

// Optional: Add a response interceptor for handling common errors (like 401 Unauthorized)
apiClient.interceptors.response.use(
    (response) => response, // Forward successful responses
    (error) => {
        // Check if it's a response error and the status is 401
        if (error.response && error.response.status === 401) {
            // Handle unauthorized access
            console.warn('Unauthorized (401) response. Logging out and redirecting.');
            
            // Remove potentially invalid user info
            localStorage.removeItem('userInfo');
            
            // TODO: Update global auth state if using Context/Redux/Zustand etc.
            // Example: authContext.logout();
            
            // Redirect to login page
            // Use react-router programmatically if possible, otherwise fallback
            if (window.location.pathname !== '/login') {
                window.location.href = '/login'; // Force redirect
            }
        }
        // Always reject the promise for other error handling downstream
        return Promise.reject(error);
    }
);

export default apiClient; 