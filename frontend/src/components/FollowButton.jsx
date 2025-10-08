import React, { useState, useEffect } from 'react';
import axios from 'axios';

const FollowButton = ({ targetUserId }) => {
  const [isFollowed, setIsFollowed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkFollow = async () => {
      try {
        const res = await axios.get(`/api/user/isFollowing/${targetUserId}`, {
          withCredentials: true
        });
        setIsFollowed(res.data.isFollowing);
      } catch (err) {
        console.error(err);
      }
    };

    checkFollow();
  }, [targetUserId]);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (isFollowed) {
        await axios.post(`/api/user/unfollow`, { targetUserId }, { withCredentials: true });
      } else {
        await axios.post(`/api/user/follow`, { targetUserId }, { withCredentials: true });
      }
      setIsFollowed(!isFollowed);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      style={{
        padding: '8px 16px',
        backgroundColor: isFollowed ? '#ddd' : '#28a745',
        color: isFollowed ? '#000' : '#fff',
        border: 'none',
        borderRadius: '5px',
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: '0.2s'
      }}
    >
      {loading ? 'Loading...' : isFollowed ? 'Unfollow' : 'Follow'}
    </button>
  );
};

export default FollowButton;
