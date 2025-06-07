import axios from 'axios'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  useEffect(() => {
    axios.get('http://localhost:3000/api/post/currentUser', {
      withCredentials: true
    })
    .then((res) => {
      // console.log("Response:", res);
      setData(res.data);
      console.log("data fetched successfully");
      console.log("User data:", res.data);
      // console.log(res);
    })
    .catch((err) => {
      console.log(err);
      navigate('/');
    });
  }
  , []);

  return (
    <div>
      <h1>Welcome to the Dashboard</h1>
      <button
        style={{ cursor: 'pointer' }}
        onClick={() => {
          axios
            .get('http://localhost:3000/api/auth/logout', {
              withCredentials: true,
            })
            .then((res) => {
              console.log(res);
              navigate('/');
            })
            .catch((err) => {
              console.log(err);
            });
        }}
      >
        Logout
      </button>
      <div>
        <h2>User Data:</h2>
        {data.length > 0 ? (
          data.map((item) => (
            <div key={item._id} style={{ border: '1px solid #ccc', margin: '10px', padding: '10px' }}>
              <h3>{item.title}</h3>
              <p>{item.content}</p>
              <p><strong>Author:</strong> {item.author}</p>
              <p><strong>Likes:</strong> {item.likes.length}</p>
              <p><strong>Comments:</strong> {item.comments.length}</p>
              <p><strong>Created At:</strong> {new Date(item.createdAt).toLocaleString()}</p>
              <button
                style={{ cursor: 'pointer', marginRight: '10px' }} 
                onClick={async() => {
                  await axios
                    .put(`http://localhost:3000/api/post/${item._id}/like`, {},{ withCredentials: true })
                    .then((res) => {
                      setData((prevData) =>
                        prevData.map((post) =>
                          post._id === item._id ? { ...post, likes: res.data.likes } : post
                        )
                      );
                    })
                    .catch((err) => {
                      console.log(err);
                    });
                }}
              >
                Like ({item.likes.length})
              </button>
              <button
                style={{ cursor: 'pointer' }}
                onClick={async() => {
                  await axios
                  .put(`http://localhost:3000/api/post/${item._id}/like`, {}, { withCredentials: true })
                  
                  .then((res) => {
                      setData((prevData) =>
                        prevData.map((post) =>
                          post._id === item._id ? { ...post, likes: res.data.likes } : post
                        )
                      );
                    })
                    .catch((err) => {
                      console.log(err);
                    });
                }}
              >
                Dislike
              </button>
            </div>
          ))
        ) : (
          <p>No data available</p>
        )}
      </div>
    </div>
  );
}

export default Dashboard
