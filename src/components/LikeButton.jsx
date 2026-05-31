import { useState, useEffect } from 'react';
import { getCurrentCount, incrementCount, hasUserLiked, markAsLiked } from '../services/countApi.js';
import './LikeButton.css';

const LikeButton = () => {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const initializeLikes = async () => {
      const userLiked = hasUserLiked();
      setLiked(userLiked);
      
      const currentCount = await getCurrentCount();
      setCount(currentCount);
      setLoading(false);
    };

    initializeLikes();
  }, []);

  const handleLike = async () => {
    if (liked || loading) return;

    setAnimating(true);
    setTimeout(() => setAnimating(false), 200);

    try {
      const newCount = await incrementCount();
      setCount(newCount);
      setLiked(true);
      markAsLiked();
    } catch (error) {
      console.error('Failed to like:', error);
    }
  };

  const displayCount = loading ? '--' : count;
  const nextCount = count + 1;

  return (
    <div className="like-button-wrapper">
      <div className="like-button">
        <input
          className="like-checkbox"
          id="heart"
          type="checkbox"
          checked={liked}
          onChange={handleLike}
          disabled={liked || loading}
        />
        <label className="like-label" htmlFor="heart">
          <svg
            className={`like-icon ${animating ? 'animating' : ''}`}
            fillRule="nonzero"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
          </svg>
          <span className="like-text">Likes</span>
        </label>
        <div className="like-count-wrapper">
          <span className={`like-count one ${liked ? 'hidden' : ''}`}>{displayCount}</span>
          <span className={`like-count two ${liked ? 'visible' : ''}`}>{liked ? displayCount : nextCount}</span>
        </div>
      </div>
    </div>
  );
};

export default LikeButton;
