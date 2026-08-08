import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage, fieldErrors } from '../lib/api';
import { Banner, Button, Field, GlassCard, TextArea } from './ui/Glass';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const TITLE_MAX = 120;
const CONTENT_MAX = 5000;

export default function CreatePost() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  // Object URLs leak until revoked; do it whenever the preview changes and on
  // unmount.
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pickFile = (e) => {
    const chosen = e.target.files?.[0];
    setErrors((prev) => ({ ...prev, pic: undefined }));
    if (!chosen) {
      setFile(null);
      return;
    }
    // Checked here as well as on the server: rejecting a 40MB file before it
    // is uploaded is much kinder than after.
    if (!ALLOWED_TYPES.includes(chosen.type)) {
      setErrors((prev) => ({ ...prev, pic: 'Choose a JPEG, PNG or WebP image' }));
      setFile(null);
      return;
    }
    if (chosen.size > MAX_IMAGE_BYTES) {
      setErrors((prev) => ({ ...prev, pic: 'That image is over the 5MB limit' }));
      setFile(null);
      return;
    }
    setFile(chosen);
  };

  const clearFile = () => {
    setFile(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setBanner(null);
    setLoading(true);

    try {
      const form = new FormData();
      form.append('title', title);
      form.append('content', content);
      if (file) form.append('pic', file);

      // Let the browser set the multipart Content-Type (with its boundary) —
      // setting it by hand produces a body the server cannot parse.
      await api.post('/post/create', form);
      navigate('/dashboard');
    } catch (err) {
      const fields = fieldErrors(err);
      if (fields) setErrors(fields);
      else setBanner(errorMessage(err, 'Could not publish your post'));
    } finally {
      setLoading(false);
    }
  };

  const counter = (value, max) => (
    <span
      className="text-[11px]"
      style={{ color: value.length > max * 0.9 ? 'var(--warning)' : 'var(--text-muted)' }}
    >
      {value.length}/{max}
    </span>
  );

  return (
    <div className="mx-auto max-w-2xl">
      <GlassCard variant="glass-strong" className="p-6 sm:p-8 animate-fade-in-up">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Write a post</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-dim)' }}>
            Share something with the people who follow you.
          </p>
        </header>

        {banner && <Banner tone="error" onDismiss={() => setBanner(null)}>{banner}</Banner>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <div>
            <Field
              id="input-title"
              label="Title"
              placeholder="Give it a headline"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              error={errors.title}
              maxLength={TITLE_MAX}
              required
            />
            <div className="mt-1 text-right">{counter(title, TITLE_MAX)}</div>
          </div>

          <div>
            <TextArea
              id="input-content"
              label="Content"
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              error={errors.content}
              maxLength={CONTENT_MAX}
              required
            />
            <div className="mt-1 text-right">{counter(content, CONTENT_MAX)}</div>
          </div>

          <div>
            <span className="gl-label">Image (optional)</span>

            {preview ? (
              <div className="relative">
                <img
                  src={preview}
                  alt="Selected preview"
                  className="w-full rounded-xl object-cover"
                  style={{ maxHeight: 320, border: '1px solid var(--glass-border)' }}
                />
                <button
                  type="button"
                  onClick={clearFile}
                  aria-label="Remove image"
                  className="absolute right-3 top-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-sm"
                  style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid var(--glass-border)' }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <label
                htmlFor="input-pic"
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl px-4 py-8 text-center transition-colors hover:bg-white/5"
                style={{ border: '1px dashed var(--glass-border)' }}
              >
                <span className="text-2xl opacity-60" aria-hidden="true">🖼️</span>
                <span className="text-sm" style={{ color: 'var(--text-dim)' }}>
                  Click to choose an image
                </span>
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  JPEG, PNG or WebP · up to 5MB
                </span>
              </label>
            )}

            <input
              ref={fileRef}
              id="input-pic"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={pickFile}
              className="sr-only"
            />

            {errors.pic && (
              <p className="mt-1.5 text-xs" style={{ color: 'var(--danger)' }}>{errors.pic}</p>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              loading={loading}
              disabled={!title.trim() || !content.trim()}
              className="flex-1"
            >
              Publish
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate('/dashboard')}>
              Cancel
            </Button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
