import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const baseURL = 'http://localhost:3000';

function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [followingStatus, setFollowingStatus] = useState({}); // { [authorId]: true/false }

  // Fetch feed posts
  useEffect(() => {
    axios
      .get(`${baseURL}/api/post/feed`, { withCredentials: true })
      .then((res) => {
        const allPosts = res.data
          .filter(Array.isArray)
          .flat()
          .filter(post => post._id);
        setData(allPosts);
      })
      .catch((err) => {
        console.log(err);
        navigate('/');
      });
  }, []);

  // Fetch following status for each author
  useEffect(() => {
    const fetchFollowingStatus = async () => {
      try {
        const statusMap = {};
        for (const post of data) {
          const res = await axios.get(`${baseURL}/api/user/isFollowing/${post.author._id}`, {
            withCredentials: true,
          });
          statusMap[post.author._id] = res.data.isFollowing;
        }
        setFollowingStatus(statusMap);
      } catch (err) {
        console.error('Error fetching follow status:', err);
      }
    };

    if (data.length > 0) fetchFollowingStatus();
  }, [data]);

  const filteredData = data.filter(
    (item) =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const showHeart = (e) => {
    const heart = document.createElement('div');
    heart.innerText = '❤️';
    heart.className = 'flying-heart';
    heart.style.left = `${e.clientX - 10}px`;
    heart.style.top = `${e.clientY - 20}px`;
    document.body.appendChild(heart);

    setTimeout(() => {
      heart.remove();
    }, 1000);
  };

  // Follow / unfollow
  const toggleFollow = async (authorId) => {
    try {
      const currentlyFollowing = followingStatus[authorId] || false;
      const url = `${baseURL}/api/user/${authorId}/${currentlyFollowing ? 'unfollow' : 'follow'}`;
      await axios.put(url, {}, { withCredentials: true });

      // Update local state
      setFollowingStatus((prev) => ({
        ...prev,
        [authorId]: !currentlyFollowing
      }));

      setData((prevData) =>
        prevData.map((post) =>
          post.author._id === authorId
            ? { ...post, author: { ...post.author, isFollowing: !currentlyFollowing } }
            : post
        )
      );
    } catch (error) {
      console.log('Follow/unfollow error:', error);
    }
  };

  const styles = {
    container: {
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh',
      padding: '20px',
      display: 'flex',
      gap: '20px',
    },
    leftSidebar: {
      flex: '0 0 220px',
      backgroundColor: '#fff',
      borderRadius: '10px',
      padding: '20px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      height: 'fit-content',
      position: 'sticky',
      top: '20px',
      alignSelf: 'flex-start',
    },
    middleContent: {
      flex: '1 1 auto',
      overflowY: 'auto',
      maxHeight: '90vh',
    },
    rightSidebar: {
      flex: '0 0 280px',
      backgroundColor: '#fff',
      borderRadius: '10px',
      padding: '20px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      height: 'fit-content',
      position: 'sticky',
      top: '20px',
      alignSelf: 'flex-start',
    },
    searchInput: {
      width: '100%',
      padding: '10px',
      marginBottom: '20px',
      borderRadius: '5px',
      border: '1px solid #ddd',
    },
    postCard: {
      marginBottom: '20px',
      backgroundColor: '#fff',
      borderRadius: '10px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      padding: '20px',
    },
    title: { fontSize: '22px', fontWeight: 'bold', marginBottom: '10px', color: '#333' },
    content: { fontSize: '16px', marginBottom: '10px', color: '#555' },
    meta: { fontSize: '14px', color: '#777', marginBottom: '10px' },
    button: { padding: '6px 12px', marginRight: '10px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' },
    dislikeButton: { padding: '6px 12px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', marginRight: '10px' },
    followButton: { padding: '6px 12px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' },
    unfollowButton: { padding: '6px 12px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' },
  };

  return (
    <div style={styles.container}>
      <style>{`
        .flying-heart {
          position: fixed;
          font-size: 24px;
          animation: floatUp 1s ease-out forwards;
          pointer-events: none;
          z-index: 9999;
        }
        @keyframes floatUp {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-100px); }
        }
      `}</style>

      {/* Left Sidebar */}
      <div style={styles.leftSidebar}>
        <h2>Menu</h2>
        <div style={styles.navItem} onClick={() => navigate('/dashboard')}>🏠 Home</div>
        <div style={styles.navItem} onClick={() => navigate('/create-post')}>✍️ Create Post</div>
        <div style={styles.navItem} onClick={() => navigate('/messages')}>💬 Messages</div>
        <div style={styles.navItem} onClick={() => navigate('/more')}>☰ More</div>
      </div>

      {/* Middle Main Feed */}
      <div style={styles.middleContent}>
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>📋 Dashboard</h1>
          <button
            style={styles.button}
            onClick={() => {
              axios
                .get(`${baseURL}/api/auth/logout`, { withCredentials: true })
                .then((res) => navigate('/'))
                .catch((err) => console.log(err));
            }}
          >
            Logout
          </button>
        </div>

        <input
          type="text"
          placeholder="Search posts by title or content..."
          style={styles.searchInput}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <h2>User Feed:</h2>
        {filteredData.length > 0 ? (
          filteredData.map((item) => (
            <div key={item._id} style={styles.postCard}>
              <div style={styles.title}>{item.title}</div>
              <div style={styles.content}>{item.content}</div>
              <div style={styles.meta}>
                <p><strong>Author Name:</strong> {item.author.name}</p>
                <button
                  style={followingStatus[item.author._id] ? styles.unfollowButton : styles.followButton}
                  onClick={() => toggleFollow(item.author._id)}
                >
                  {followingStatus[item.author._id] ? 'Unfollow' : 'Follow'}
                </button>
                <p><strong>Likes:</strong> {item.likes.length} | <strong>Comments:</strong> {item.comments.length}</p>
                <p><strong>Created:</strong> {new Date(item.createdAt).toLocaleString()}</p>
              </div>

              <div>
                <button
                  style={styles.button}
                  onClick={async (e) => {
                    showHeart(e);
                    await axios.put(`${baseURL}/api/post/${item._id}/like`, {}, { withCredentials: true })
                      .then((res) => {
                        setData((prevData) =>
                          prevData.map((post) =>
                            post._id === item._id ? { ...post, likes: res.data.likes } : post
                          )
                        );
                      })
                      .catch(console.log);
                  }}
                >
                  ❤️ Like ({item.likes.length})
                </button>
                <button
                  style={styles.dislikeButton}
                  onClick={async () => {
                    await axios.put(`${baseURL}/api/post/${item._id}/like`, {}, { withCredentials: true })
                      .then((res) => {
                        setData((prevData) =>
                          prevData.map((post) =>
                            post._id === item._id ? { ...post, likes: res.data.likes } : post
                          )
                        );
                      })
                      .catch(console.log);
                  }}
                >
                  👎 Dislike
                </button>
              </div>
            </div>
          ))
        ) : (
          <p>No data available</p>
        )}
      </div>

      {/* Right Sidebar */}
      <div style={styles.rightSidebar}>
        <h2>Recommendations</h2>
        <div style={styles.recommendationItem}>
          <p><strong>John Doe</strong></p>
          <button style={styles.followButton}>Follow</button>
        </div>
        <div style={styles.recommendationItem}>
          <p><strong>Jane Smith</strong></p>
          <button style={styles.followButton}>Follow</button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
