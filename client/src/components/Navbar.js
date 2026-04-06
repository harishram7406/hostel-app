import React, { useContext } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom'; // Import useNavigate
import { AuthContext } from '../App'; // Adjust path if AuthContext is moved
import './Navbar.css'; // Import the CSS file

const Navbar = () => {
    // Get user and logout function from context
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate(); // Hook for navigation

    const handleLogout = () => {
        // Call the logout function from context
        logout();
        // Optional: Navigate to login page after logout
        navigate('/login');
        console.log('User logged out');
    };

    // Function to determine NavLink class based on active state
    const getNavLinkClass = ({ isActive }) => {
        return `navLink ${isActive ? 'active' : ''}`;
    };

    // Extract username safely
    const username = user?.username;
    // Create profile link safely
    const profileLink = user?.username ? `/profile/${user.username}` : '/';

    return (
        <nav className="navbar">
            <div className="navbarContainer">
                <Link to="/" className="logoLink">HostelFeed</Link>
                <div className="navLinksContainer">
                    {user ? (
                        <>
                            <NavLink to="/" className={getNavLinkClass}>Home</NavLink>
                            <NavLink to="/messages" className={getNavLinkClass}>Messages</NavLink>
                            <NavLink to="/notifications" className={getNavLinkClass}>Notifications</NavLink>
                            {/* Link to user's profile using username */}
                            <NavLink to={profileLink} className={getNavLinkClass}>{username || 'Profile'}</NavLink>
                            <button onClick={handleLogout} className="logoutButton">Logout</button>
                        </>
                    ) : (
                        <>
                            <NavLink to="/login" className={getNavLinkClass}>Login</NavLink>
                            <NavLink to="/register" className={getNavLinkClass}>Register</NavLink>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

// Removed inline style objects
// const navStyle = { ... };
// const navContainerStyle = { ... };
// const logoLinkStyle = { ... };
// const navLinksContainerStyle = { ... };
// const navLinkStyle = ({ isActive }) => { ... };
// const logoutButtonStyle = { ... };

export default Navbar; 