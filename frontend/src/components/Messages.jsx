import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

const baseURL = 'http://localhost:3000';

function Messages() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  const [currentUserId, setCurrentUserId] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  const navItems = [
    { icon: '🏠', label: 'Home', path: '/dashboard' },
    { icon: '✍️', label: 'Create Post', path: '/create-post' },
    { icon: '💬', label: 'Messages', path: '/messages' },
    { icon: '👤', label: 'Profile', path: '/profile' },
  ];

  // Fetch current user and initialize socket
  useEffect(() => {
    axios.get(`${baseURL}/api/auth/validate`, { withCredentials: true })
      .then((res) => {
        if (res.data.authenticated) {
          const uId = res.data.userId;
          setCurrentUserId(uId);
          
          socketRef.current = io('http://localhost:3000', {
            query: { userId: uId },
          });

          socketRef.current.on('getOnlineUsers', (users) => {
            setOnlineUsers(users);
          });

          socketRef.current.on('newMessage', (msg) => {
            setMessages((prev) => [...prev, msg]);
          });
        }
      })
      .catch((err) => {
        console.log(err);
        navigate('/');
      });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [navigate]);

  // Fetch sidebar users
  useEffect(() => {
    if (!currentUserId) return;
    axios.get(`${baseURL}/api/messages/users`, { withCredentials: true })
      .then((res) => setUsers(res.data))
      .catch(console.log);
  }, [currentUserId]);

  // Fetch messages when a user is selected
  useEffect(() => {
    if (!selectedUser) return;
    axios.get(`${baseURL}/api/messages/${selectedUser._id}`, { withCredentials: true })
      .then((res) => {
        setMessages(res.data);
      })
      .catch(console.log);
  }, [selectedUser]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    try {
      const res = await axios.post(`${baseURL}/api/messages/send/${selectedUser._id}`, 
        { message: newMessage },
        { withCredentials: true }
      );
      setMessages((prev) => [...prev, res.data]);
      setNewMessage('');
    } catch (error) {
      console.log(error);
      alert('Failed to send message');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* ===== Top Navbar ===== */}
      <header className="glass sticky top-0 z-50 px-4 sm:px-6 py-4 flex items-center justify-between"
        style={{ borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
        
        <button
          className="lg:hidden text-2xl cursor-pointer bg-transparent border-none"
          style={{ color: 'var(--text-primary)' }}
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          ☰
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xl">💬</span>
          <h1 className="text-lg sm:text-xl font-bold font-poppins cursor-pointer" 
              style={{ color: 'var(--text-primary)' }}
              onClick={() => navigate('/dashboard')}>
            Chattrix
          </h1>
        </div>

        <div className="w-10" />
      </header>

      {/* ===== Main Layout ===== */}
      <div className="flex flex-1 relative overflow-hidden h-[calc(100vh-65px)]">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* ===== Left App Sidebar ===== */}
        <aside
          className={`
            fixed lg:static top-[65px] left-0 z-50 lg:z-10
            w-64 lg:w-56 h-full
            p-6 flex flex-col gap-2
            transition-transform duration-300 ease-in-out shrink-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
          style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)' }}
        >
          <button
            className="lg:hidden self-end text-xl mb-2 cursor-pointer bg-transparent border-none"
            style={{ color: 'var(--text-secondary)' }}
            onClick={() => setSidebarOpen(false)}
          >
            ✕
          </button>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
            Menu
          </p>
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => { navigate(item.path); setSidebarOpen(false); }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium cursor-pointer transition-all duration-200 w-full text-left bg-transparent border-none"
              style={{ 
                color: item.path === '/messages' ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: item.path === '/messages' ? 'var(--bg-card-hover)' : 'transparent'
              }}
              onMouseEnter={(e) => {
                if (item.path !== '/messages') {
                  e.currentTarget.style.background = 'var(--bg-card-hover)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (item.path !== '/messages') {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </aside>

        {/* ===== Chat Interface ===== */}
        <main className="flex-1 flex w-full relative">
          
          {/* Chat Sidebar (User List) */}
          <div className={`w-full sm:w-80 h-full flex flex-col shrink-0 lg:border-r transition-all ${selectedUser ? 'hidden sm:flex' : 'flex'}`}
               style={{ borderColor: 'var(--border-color)', background: 'var(--bg-card)' }}>
            <div className="p-5 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <h2 className="text-lg font-bold font-poppins" style={{ color: 'var(--text-primary)' }}>Messages</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
              {users.map((user) => {
                const isOnline = onlineUsers.includes(user._id);
                const isSelected = selectedUser?._id === user._id;

                return (
                  <button
                    key={user._id}
                    onClick={() => setSelectedUser(user)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl mb-1 transition-all cursor-pointer border-none text-left"
                    style={{ background: isSelected ? 'var(--bg-card-hover)' : 'transparent' }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md bg-cover overflow-hidden"
                           style={{ background: 'var(--accent-gradient)' }}>
                        {user.pic && user.pic.includes('http') ? (
                          <img src={user.pic} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          user.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 rounded-full" style={{ borderColor: 'var(--bg-card)' }}></span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
                      <p className="text-xs truncate" style={{ color: isOnline ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                        {isOnline ? 'Active now' : 'Offline'}
                      </p>
                    </div>
                  </button>
                );
              })}
              {users.length === 0 && (
                <p className="text-center text-xs mt-10" style={{ color: 'var(--text-muted)' }}>No other users found.</p>
              )}
            </div>
          </div>

          {/* Chat Window */}
          <div className={`flex-1 h-full flex flex-col ${!selectedUser ? 'hidden sm:flex' : 'flex'}`} style={{ background: 'var(--bg-primary)' }}>
            
            {selectedUser ? (
              <>
                {/* Chat Header */}
                <div className="h-20 px-4 sm:px-6 flex items-center gap-4 border-b shrink-0 glass" style={{ borderColor: 'var(--border-color)', borderRadius: 0 }}>
                  <button 
                    className="sm:hidden text-lg cursor-pointer bg-transparent border-none"
                    style={{ color: 'var(--text-primary)' }}
                    onClick={() => setSelectedUser(null)}
                  >
                    ←
                  </button>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                       style={{ background: 'var(--accent-gradient)' }}>
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </div>
                  <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedUser.name}</h3>
                </div>

                {/* Messages Container */}
                <div className="flex-1 p-6 sm:p-8 overflow-y-auto custom-scrollbar flex flex-col gap-4">
                  {messages.map((msg, idx) => {
                    const fromMe = msg.senderId === currentUserId;
                    return (
                      <div key={idx} className={`flex ${fromMe ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
                        <div 
                          className={`max-w-[75%] rounded-2xl px-4 py-2 ${fromMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                          style={{ 
                            background: fromMe ? 'var(--accent-gradient)' : 'var(--bg-card)',
                            color: fromMe ? 'white' : 'var(--text-primary)',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                          }}
                        >
                          <p className="text-sm">{msg.message}</p>
                          <span className="text-[10px] opacity-70 mt-1 block text-right">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-5 sm:p-6 border-t shrink-0 glass" style={{ borderColor: 'var(--border-color)', borderRadius: 0 }}>
                  <form onSubmit={handleSendMessage} className="flex gap-3 relative">
                    <input
                      type="text"
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="w-full h-12 rounded-xl px-4 pr-16 text-sm text-white placeholder-gray-500 outline-none transition-all duration-300"
                      style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}
                      onFocus={(e) => { e.target.style.borderColor = 'var(--accent-primary)'; }}
                      onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; }}
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="absolute right-1 top-1 bottom-1 px-4 rounded-lg font-semibold text-sm transition-all duration-300 cursor-pointer text-white"
                      style={{ 
                        background: 'transparent', 
                        opacity: newMessage.trim() ? 1 : 0.5,
                        color: 'var(--accent-primary)'
                      }}
                    >
                      Send
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 animate-fade-in">
                <span className="text-6xl mb-4">💬</span>
                <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Your Messages</h3>
                <p className="text-sm max-w-sm" style={{ color: 'var(--text-secondary)' }}>
                  Select a conversation from the sidebar to chat with other users on Chattrix.
                </p>
              </div>
            )}
            
          </div>

        </main>
      </div>
    </div>
  );
}

export default Messages;
