import React, { useState, useEffect, useCallback } from 'react';
// import axios from 'axios'; - No longer needed
import apiClient from '../api/axiosConfig'; // Import apiClient
import PostCard from '../components/PostCard';
import CreatePostForm from '../components/CreatePostForm';
import './HomePage.css'; // Import CSS

// const API_URL = 'http://localhost:5000/api'; - No longer needed

// Categories - Should match backend enum
const CATEGORIES = ['All', 'General', 'Events', 'Lost & Found', 'Announcements', 'Other'];

const HomePage = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false); // Track if search is active
    const [selectedCategory, setSelectedCategory] = useState('All'); // State for category filter

    // Function to fetch posts (handles general feed, search, and category filter)
    const fetchPosts = useCallback(async (query = '', category = 'All') => {
        setLoading(true);
        setError(null);
        setIsSearching(!!query || category !== 'All'); // Mark as searching if query OR category is set
        
        let url = '/posts';
        const params = new URLSearchParams();

        if (query) {
            url = '/posts/search'; // Use search endpoint if query exists
            params.append('q', query);
        } else if (category && category !== 'All') {
            // Use general posts endpoint with category filter ONLY if no search query
            params.append('category', category);
        }
        
        const queryString = params.toString();
        if (queryString) {
            url += `?${queryString}`;
        }
        
        console.log(`Fetching posts from URL: ${url}`); // Log the final URL

        try {
            const response = await apiClient.get(url);
            setPosts(response.data);
        } catch (err) {
            console.error("Error fetching posts:", err);
            setError('Failed to load posts. Please try again later.');
            setPosts([]); // Clear posts on error
        } finally {
            setLoading(false);
        }
    }, []); // useCallback dependencies are empty as it doesn't rely on component state directly

    // Fetch initial posts on mount
    useEffect(() => {
        fetchPosts(); // Fetch all posts initially
    }, [fetchPosts]); // Initial fetch only

    // Effect to refetch when category changes - SIMPLIFIED
    useEffect(() => {
        // If category is set back to 'All', fetch all posts.
        if (selectedCategory === 'All') {
            fetchPosts(); // Defaults to query='', category='All'
        } 
        // Otherwise, fetch posts for the specific category.
        else {
             fetchPosts('', selectedCategory); // Fetch with category, clear search term implicitly handled by fetchPosts call
        }
        // We still might want to clear the search input visually when a category is clicked, handled in handleCategorySelect
    }, [selectedCategory, fetchPosts]); // Depend on category change and fetchPosts function stability

    // Handle search input change
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    // Handle search submission
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setSelectedCategory('All'); // Reset category when searching by text
        fetchPosts(searchTerm, 'All'); // Fetch posts based on search term
    };

    // Handle category selection - Modified
    const handleCategorySelect = (category) => {
        // If 'All' is selected, clear the search term as well
        if (category === 'All') {
            setSearchTerm('');
        }
        setSelectedCategory(category);
        // The useEffect hook for selectedCategory will handle the fetch
    };

    // Callback function to add a new post to the top (only if filters allow)
    const handlePostCreated = (newPost) => {
        // Add only if no search term AND (category filter is 'All' OR new post matches category)
        if (!searchTerm && (selectedCategory === 'All' || newPost.category === selectedCategory)) {
             setPosts(prevPosts => [newPost, ...prevPosts]);
        }
    };

    // Function to remove post from state
    const handlePostDeleted = (deletedPostId) => {
        setPosts(currentPosts => currentPosts.filter(post => post._id !== deletedPostId));
    };

    // Determine the title based on search/filter state
    let listTitle = 'Recent Posts';
    if (searchTerm) {
        listTitle = `Search Results for "${searchTerm}"`;
    } else if (selectedCategory !== 'All') {
        listTitle = `Posts in Category: ${selectedCategory}`;
    }

    return (
        <div className="container">
            <h1>Home Feed</h1>

            {/* Create Post Form */}
            <CreatePostForm onPostCreated={handlePostCreated} />

            {/* Search and Filter Controls */}
            <div className="filterControls">
                 {/* Search Bar */}
                <form onSubmit={handleSearchSubmit} className="searchForm">
                    <input
                        type="search"
                        placeholder="Search posts by text..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="searchInput"
                    />
                    <button type="submit" className="searchButton">Search</button>
                </form>

                {/* Category Filter Buttons */}
                <div className="categoryFilter">
                    <span>Filter by Category:</span>
                    {CATEGORIES.map(cat => (
                        <button 
                            key={cat}
                            onClick={() => handleCategorySelect(cat)}
                            className={`categoryButton ${selectedCategory === cat ? 'active' : ''}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Post List Area Title */}
            <h2 className="postListTitle">{listTitle}</h2>

            {/* Post List */}
            {loading && <p>Loading posts...</p>}
            {error && <p className="feedError">{error}</p>}
            {!loading && !error && posts.length === 0 && (
                <p>{isSearching ? 'No posts found matching your filters.' : 'No posts yet. Be the first to share!'}</p>
            )}

            {/* Render posts using PostCard */}
            <div className="post-list">
                {posts.map(post => (
                    <PostCard
                        key={post._id}
                        post={post}
                        onPostDeleted={handlePostDeleted}
                    />
                ))}
            </div>
        </div>
    );
};

// Remove inline styles
// const styles = { ... };

export default HomePage; 