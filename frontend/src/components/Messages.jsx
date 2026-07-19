import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useLocation } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AppLayout, { Avatar } from './layout/AppLayout';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

function Messages() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!user?.id) return;

    socketRef.current = io(SOCKET_URL, { query: { userId: user.id } });
    socketRef.current.on('getOnlineUsers', (u) => setOnlineUsers(u));
    socketRef.current.on('newMessage', (msg) => setMessages((prev) => [...prev, msg]));

    return () => socketRef.current?.disconnect();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    api.get('/api/messages/users')
      .then((res) => {
        setUsers(res.data);
        const preselectId = location.state?.userId;
        if (preselectId) {
          const target = res.data.find((u) => u._id === preselectId);
          if (target) setSelectedUser(target);
        }
      })
      .catch(() => showToast('Failed to load conversations', 'error'));
  }, [user?.id]);

  useEffect(() => {
    if (!selectedUser) return;
    api.get(`/api/messages/${selectedUser._id}`)
      .then((res) => setMessages(res.data))
      .catch(() => showToast('Failed to load messages', 'error'));
  }, [selectedUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    try {
      const res = await api.post(`/api/messages/send/${selectedUser._id}`, { message: newMessage.trim() });
      setMessages((prev) => [...prev, res.data]);
      setNewMessage('');
    } catch {
      showToast('Failed to send message', 'error');
    }
  };

  return (
    <AppLayout activePath="/messages">
      <div className="flex flex-1 relative overflow-hidden h-[calc(100vh-65px)]">
        <div className={`w-full sm:w-80 h-full flex flex-col shrink-0 lg:border-r transition-all ${selectedUser ? 'hidden sm:flex' : 'flex'}`}
          style={{ borderColor: 'var(--border-color)', background: 'var(--bg-card)' }}>
          <div className="p-5 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <h2 className="text-lg font-bold font-poppins" style={{ color: 'var(--text-primary)' }}>Messages</h2>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            {users.map((u) => {
              const isOnline = onlineUsers.includes(u._id);
              const isSelected = selectedUser?._id === u._id;

              return (
                <button
                  key={u._id}
                  onClick={() => setSelectedUser(u)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl mb-1 transition-all cursor-pointer border-none text-left"
                  style={{ background: isSelected ? 'var(--bg-card-hover)' : 'transparent' }}
                >
                  <div className="relative">
                    <Avatar user={u} size={10} />
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 rounded-full" style={{ borderColor: 'var(--bg-card)' }}></span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{u.name}</p>
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

        <div className={`flex-1 h-full flex flex-col ${!selectedUser ? 'hidden sm:flex' : 'flex'}`} style={{ background: 'var(--bg-primary)' }}>
          {selectedUser ? (
            <>
              <div className="h-20 px-4 sm:px-6 flex items-center gap-4 border-b shrink-0 glass" style={{ borderColor: 'var(--border-color)', borderRadius: 0 }}>
                <button className="sm:hidden text-lg cursor-pointer bg-transparent border-none" style={{ color: 'var(--text-primary)' }} onClick={() => setSelectedUser(null)} aria-label="Back to conversation list">←</button>
                <Avatar user={selectedUser} size={10} />
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedUser.name}</h3>
              </div>

              <div className="flex-1 p-6 sm:p-8 overflow-y-auto custom-scrollbar flex flex-col gap-4">
                {messages.map((msg, idx) => {
                  const fromMe = msg.senderId === user.id;
                  return (
                    <div key={idx} className={`flex ${fromMe ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2 ${fromMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                        style={{ background: fromMe ? 'var(--accent-gradient)' : 'var(--bg-card)', color: fromMe ? 'white' : 'var(--text-primary)', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
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

              <div className="p-5 sm:p-6 border-t shrink-0 glass" style={{ borderColor: 'var(--border-color)', borderRadius: 0 }}>
                <form onSubmit={handleSendMessage} className="flex gap-3 relative">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="w-full h-12 rounded-xl px-4 pr-16 text-sm text-white placeholder-gray-500 outline-none transition-all duration-300"
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="absolute right-1 top-1 bottom-1 px-4 rounded-lg font-semibold text-sm transition-all duration-300 cursor-pointer text-white"
                    style={{ background: 'transparent', opacity: newMessage.trim() ? 1 : 0.5, color: 'var(--accent-primary)' }}
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
      </div>
    </AppLayout>
  );
}

export default Messages;
