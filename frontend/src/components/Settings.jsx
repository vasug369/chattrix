import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AppLayout, { Avatar } from './layout/AppLayout';

export default function Settings() {
  const navigate = useNavigate();
  const { user, refreshUser, logout } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(user?.pic || null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('bio', bio);
      if (image) formData.append('pic', image);

      await api.put(`/api/user/${user.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await refreshUser();
      showToast('Profile updated', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await api.delete('/api/user/');
      await logout();
      navigate('/');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete account', 'error');
      setDeleting(false);
    }
  };

  return (
    <AppLayout activePath="/settings">
      <div className="min-w-0 px-4 sm:px-6 py-8 max-w-2xl mx-auto w-full flex flex-col gap-6">
        <div className="glass p-8 sm:p-10 animate-fade-in-up">
          <h2 className="text-2xl font-bold mb-6 font-poppins" style={{ color: 'var(--text-primary)' }}>Edit Profile</h2>

          <form onSubmit={handleSave} className="flex flex-col gap-5">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-full overflow-hidden shrink-0" style={{ background: 'var(--accent-gradient)' }}>
                {imagePreview ? (
                  <img src={imagePreview} alt="Avatar preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <label className="px-4 h-10 rounded-xl text-sm font-medium cursor-pointer flex items-center transition-all duration-300"
                style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                Change photo
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide uppercase" style={{ color: 'var(--text-muted)' }}>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-12 rounded-xl px-4 text-sm text-white outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide uppercase" style={{ color: 'var(--text-muted)' }}>Bio</label>
              <textarea
                rows="3"
                maxLength={160}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell people about yourself..."
                className="w-full rounded-xl p-4 text-sm text-white placeholder-gray-500 outline-none resize-y"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}
              />
              <p className="text-[10px] mt-1 text-right" style={{ color: 'var(--text-muted)' }}>{bio.length}/160</p>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide uppercase" style={{ color: 'var(--text-muted)' }}>Email</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full h-12 rounded-xl px-4 text-sm outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', opacity: 0.7 }}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="self-end px-8 h-11 rounded-xl text-white font-semibold text-sm cursor-pointer transition-all duration-300"
              style={{ background: 'var(--accent-gradient)', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </form>
        </div>

        {!user?.isAccountVerified && (
          <div className="glass p-6 animate-fade-in-up flex items-center justify-between gap-4 flex-wrap"
            style={{ borderColor: 'rgba(234, 179, 8, 0.3)' }}>
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Email not verified</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Verify your email to secure your account.</p>
            </div>
            <button
              onClick={() => navigate('/verify-email')}
              className="px-5 h-9 rounded-xl text-xs font-semibold cursor-pointer"
              style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#fde047', border: '1px solid rgba(234, 179, 8, 0.3)' }}
            >
              Verify now
            </button>
          </div>
        )}

        <div className="glass p-8 sm:p-10 animate-fade-in-up" style={{ borderColor: 'rgba(239, 68, 68, 0.25)' }}>
          <h2 className="text-lg font-bold mb-2 font-poppins" style={{ color: '#fca5a5' }}>Danger Zone</h2>
          <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
            Deleting your account is permanent. All your posts, comments, likes, and follow relationships will be removed.
          </p>

          {!deleteConfirm ? (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="px-6 h-10 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-300"
              style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)' }}
            >
              Delete my account
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Type <strong>DELETE</strong> to confirm.
              </p>
              <input
                type="text"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                className="w-full h-11 rounded-xl px-4 text-sm text-white outline-none max-w-xs"
                style={{ background: 'var(--bg-input)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setDeleteConfirm(false); setDeleteInput(''); }}
                  className="px-5 h-10 rounded-xl text-sm font-medium cursor-pointer"
                  style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteInput !== 'DELETE' || deleting}
                  className="px-5 h-10 rounded-xl text-sm font-semibold cursor-pointer text-white"
                  style={{ background: 'var(--danger)', opacity: (deleteInput !== 'DELETE' || deleting) ? 0.5 : 1 }}
                >
                  {deleting ? 'Deleting...' : 'Permanently delete'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
