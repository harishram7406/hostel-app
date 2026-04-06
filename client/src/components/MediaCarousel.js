import React, { useState } from 'react';
import './MediaCarousel.css'; // Import CSS

const UPLOAD_URL = 'http://localhost:5000/'; // Base URL for uploads

const MediaCarousel = ({ media = [] }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    if (!media || media.length === 0) {
        return null;
    }

    const goToPrevious = () => {
        setCurrentIndex((prevIndex) => (prevIndex === 0 ? media.length - 1 : prevIndex - 1));
    };

    const goToNext = () => {
        setCurrentIndex((prevIndex) => (prevIndex === media.length - 1 ? 0 : prevIndex + 1));
    };

    const currentMediaPath = media[currentIndex];
    const isVideo = /\.(mp4|webm|ogg)$/i.test(currentMediaPath); // Basic check for video extension

    return (
        <div className="mediaCarouselContainer">
            {media.length > 1 && (
                <button onClick={goToPrevious} className="arrowButton leftArrow">
                    &lt;
                </button>
            )}
            <div className="mediaWrapper">
                {isVideo ? (
                    <video controls className="mediaItem" src={`${UPLOAD_URL}${currentMediaPath}`}>
                        Your browser does not support the video tag.
                    </video>
                ) : (
                    <img
                        src={`${UPLOAD_URL}${currentMediaPath}`}
                        alt={`Media ${currentIndex + 1}`}
                        className="mediaItem"
                    />
                )}
                 {media.length > 1 && (
                     <div className="indicator">
                         {currentIndex + 1} / {media.length}
                     </div>
                 )}
            </div>
            {media.length > 1 && (
                <button onClick={goToNext} className="arrowButton rightArrow">
                    &gt;
                </button>
            )}
        </div>
    );
};

export default MediaCarousel; 