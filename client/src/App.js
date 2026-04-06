import React, { useState, createContext, useCallback, useEffect } from 'react';
import {
  Routes,
  Route,
  Navigate // Used for redirection
} from 'react-router-dom';
import './App.css'; // Keep App.css for App-specific styles if needed
import { ToastContainer } from 'react-toastify'; // Import ToastContainer
import 'react-toastify/dist/ReactToastify.css'; // Import CSS

// --- Import Page Components ---
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import MessagesPage from './pages/MessagesPage';
import NotificationsPage from './pages/NotificationsPage';
import NotFoundPage from './pages/NotFoundPage';
import SinglePostPage from './pages/SinglePostPage';

// --- Import Components ---
import Navbar from './components/Navbar';

// --- Authentication Context (Can be moved to its own file later) ---
export const AuthContext = createContext(null);

// --- Protected Route Component ---
// Redirects to login if user is not authenticated
const ProtectedRoute = ({ children }) => {
  const { user } = React.useContext(AuthContext); // Access user from context
  if (!user) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to. This allows us to send them along to that page after they login,
    // which is a nicer user experience than dropping them off on the home page.
    // (Though for this simple app, redirecting to / is fine too)
    return <Navigate to="/login" replace />;
  }
  return children;
};

// --- Main App Component ---
function App() {
  // State to hold user info (null if not logged in)
  // Initialize from localStorage if available
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('userInfo');
    console.log('Initializing user state from localStorage:', storedUser);
    try {
        const parsedUser = storedUser ? JSON.parse(storedUser) : null;
        console.log('Parsed user state:', parsedUser);
        return parsedUser;
    } catch (e) {
        console.error("Error parsing stored user info:", e);
        localStorage.removeItem('userInfo');
        return null;
    }
  });

  // Add useEffect to log user state changes
  useEffect(() => {
      console.log('AuthContext user state changed:', user);
      // You could add another check here to ensure the token exists
      if(user && !user.token) {
          console.warn('AuthContext user state is missing token:', user);
      }
  }, [user]); // Run this effect whenever the user state changes

  // Define login function using useCallback for stability
  const login = useCallback((userData) => {
    localStorage.setItem('userInfo', JSON.stringify(userData));
    setUser(userData);
     // No navigation here, let the calling page handle it
  }, []); // Empty dependency array: function doesn't depend on App state/props

  // Define logout function
  const logout = useCallback(() => {
    localStorage.removeItem('userInfo');
    setUser(null);
    // Optional: Redirect to login page after logout
    // navigate('/login'); // Would need useNavigate hook here if uncommented
  }, []);

  return (
    // Provide user, login, and logout via Context
    <AuthContext.Provider value={{ user, login, logout }}>
      <Navbar /> { /* Navbar now gets user context internally */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
      <Routes>
        {/* Public Routes: Redirect logged-in users away from login/register */}
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={<ProtectedRoute><HomePage /></ProtectedRoute>}
        />
        <Route
          path="/profile/:username"
          element={<ProtectedRoute><ProfilePage /></ProtectedRoute>}
        />
        <Route
          path="/messages"
          element={<ProtectedRoute><MessagesPage /></ProtectedRoute>}
        />
         <Route
          path="/notifications"
          element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>}
        />
        <Route
          path="/posts/:postId"
          element={<ProtectedRoute><SinglePostPage /></ProtectedRoute>}
        />

        {/* Catch-all for 404 Not Found */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthContext.Provider>
  );
}

export default App;
