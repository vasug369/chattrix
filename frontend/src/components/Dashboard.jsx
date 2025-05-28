import axios from 'axios'
import React from 'react'
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const navigate = useNavigate();

  return (
    <div>
      Welcome to dashboard page
      <button style={{cursor:'pointer'}} onClick={()=>{
        axios.get('http://localhost:3000/api/auth/logout',{
          withCredentials:true
        })
        .then((res)=>{
          console.log(res);
          navigate('/');
        })
        .catch((err)=>{
          console.log(err);
        })
      }}>logout</button>
    </div>
  )
}

export default Dashboard
