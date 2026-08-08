import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api, { errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Avatar, Banner, Button, EmptyState, GlassCard, Skeleton } from './ui/Glass';

const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function Messages() {
  const { user } = useAuth();
  const { socket, isOnline } = useSocket();

  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [peerTyping, setPeerTyping] = useState(false);
  const [showSidebarOnMobile, setShowSidebarOnMobile] = useState(true);

  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const selectedRef = useRef(null);

  // The socket handlers below are registered once; without a ref they would
  // close over a stale `selected` and drop messages for the open thread.
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const loadContacts = useCallback(async () => {
    setLoadingContacts(true);
    try {
      const { data } = await api.get('/messages/users');
      setContacts(data.items);
    } catch (err) {
      setError(errorMessage(err, 'Could not load your contacts'));
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const openThread = useCallback(async (contact) => {
    setSelected(contact);
    setShowSidebarOnMobile(false);
    setPeerTyping(false);
    setLoadingThread(true);
    setError('');
    try {
      const { data } = await api.get(`/messages/${contact._id}`, { params: { limit: 50 } });
      setMessages(data.items);
      // Opening the thread marks it read server-side; clear the badge locally
      // rather than refetching the whole sidebar.
      setContacts((prev) =>
        prev.map((c) => (c._id === contact._id ? { ...c, unreadCount: 0 } : c))
      );
    } catch (err) {
      setError(errorMessage(err, 'Could not load this conversation'));
      setMessages([]);
    } finally {
      setLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    if (!socket) return undefined;

    const onNewMessage = (message) => {
      const current = selectedRef.current;
      const fromCurrentThread = current && String(message.senderId) === String(current._id);

      if (fromCurrentThread) {
        setMessages((prev) => [...prev, message]);
        // We are looking at it, so tell the server it has been read.
        api.get(`/messages/${current._id}`, { params: { limit: 1 } }).catch(() => {});
      } else {
        setContacts((prev) =>
          prev.map((c) =>
            String(c._id) === String(message.senderId)
              ? { ...c, unreadCount: (c.unreadCount ?? 0) + 1 }
              : c
          )
        );
      }
    };

    const onTyping = ({ from }) => {
      if (selectedRef.current && String(from) === String(selectedRef.current._id)) setPeerTyping(true);
    };
    const onStopTyping = ({ from }) => {
      if (selectedRef.current && String(from) === String(selectedRef.current._id)) setPeerTyping(false);
    };
    const onMessagesRead = ({ by }) => {
      if (selectedRef.current && String(by) === String(selectedRef.current._id)) {
        setMessages((prev) => prev.map((m) => ({ ...m, readAt: m.readAt ?? new Date().toISOString() })));
      }
    };

    socket.on('newMessage', onNewMessage);
    socket.on('typing', onTyping);
    socket.on('stopTyping', onStopTyping);
    socket.on('messagesRead', onMessagesRead);

    return () => {
      socket.off('newMessage', onNewMessage);
      socket.off('typing', onTyping);
      socket.off('stopTyping', onStopTyping);
      socket.off('messagesRead', onMessagesRead);
    };
  }, [socket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, peerTyping]);

  const handleDraftChange = (e) => {
    setDraft(e.target.value);
    if (!socket || !selected) return;

    socket.emit('typing', { to: selected._id });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit('stopTyping', { to: selected._id });
    }, 1200);
  };

  const send = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !selected) return;

    setSending(true);
    setDraft('');
    clearTimeout(typingTimer.current);
    socket?.emit('stopTyping', { to: selected._id });

    try {
      const { data } = await api.post(`/messages/send/${selected._id}`, { message: text });
      setMessages((prev) => [...prev, data.data]);
    } catch (err) {
      setError(errorMessage(err, 'Message not sent'));
      setDraft(text); // give the text back rather than losing it
    } finally {
      setSending(false);
    }
  };

  const visibleContacts = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = term
      ? contacts.filter((c) => c.name?.toLowerCase().includes(term))
      : contacts;
    // Unread conversations float to the top.
    return [...list].sort((a, b) => (b.unreadCount ?? 0) - (a.unreadCount ?? 0));
  }, [contacts, search]);

  return (
    <div
      className="grid gap-4 md:grid-cols-[300px_1fr]"
      style={{ height: 'calc(100vh - 8rem)' }}
    >
      {/* Contacts */}
      <GlassCard
        className={`flex flex-col overflow-hidden ${showSidebarOnMobile ? 'flex' : 'hidden'} md:flex`}
      >
        <div className="p-4" style={{ borderBottom: '1px solid var(--glass-border)' }}>
          <h1 className="mb-3 text-lg font-semibold">Messages</h1>
          <input
            className="gl-input"
            placeholder="Search people…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search contacts"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loadingContacts &&
            [0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-2.5">
                <Skeleton style={{ width: 42, height: 42, borderRadius: '50%' }} />
                <div className="flex-1 space-y-2">
                  <Skeleton style={{ height: 11, width: '55%' }} />
                  <Skeleton style={{ height: 9, width: '30%' }} />
                </div>
              </div>
            ))}

          {!loadingContacts && !visibleContacts.length && (
            <EmptyState icon="👥" title="Nobody here yet">
              Other people who sign up will show up in this list.
            </EmptyState>
          )}

          {!loadingContacts &&
            visibleContacts.map((c) => {
              const active = selected?._id === c._id;
              return (
                <button
                  key={c._id}
                  type="button"
                  onClick={() => openThread(c)}
                  aria-current={active ? 'true' : undefined}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-white/5"
                  style={{
                    background: active ? 'rgba(139,92,246,0.16)' : 'transparent',
                    border: `1px solid ${active ? 'rgba(139,92,246,0.35)' : 'transparent'}`,
                  }}
                >
                  <div className="relative shrink-0">
                    <Avatar src={c.pic} name={c.name} size={42} />
                    {isOnline(c._id) && (
                      <span
                        className="absolute bottom-0 right-0 h-3 w-3 rounded-full"
                        style={{ background: 'var(--success)', border: '2px solid var(--canvas-2)' }}
                        aria-label="Online"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {isOnline(c._id) ? 'Online' : 'Offline'}
                    </p>
                  </div>

                  {c.unreadCount > 0 && (
                    <span
                      className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white"
                      style={{ background: 'var(--accent)' }}
                    >
                      {c.unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
        </div>
      </GlassCard>

      {/* Thread */}
      <GlassCard
        className={`flex flex-col overflow-hidden ${showSidebarOnMobile ? 'hidden' : 'flex'} md:flex`}
      >
        {!selected ? (
          <EmptyState icon="💬" title="Pick a conversation">
            Choose someone on the left to start chatting.
          </EmptyState>
        ) : (
          <>
            <header
              className="flex items-center gap-3 p-4"
              style={{ borderBottom: '1px solid var(--glass-border)' }}
            >
              <button
                type="button"
                onClick={() => setShowSidebarOnMobile(true)}
                className="cursor-pointer md:hidden"
                aria-label="Back to conversations"
              >
                ←
              </button>
              <Avatar src={selected.pic} name={selected.name} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{selected.name}</p>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {peerTyping ? 'typing…' : isOnline(selected._id) ? 'Online' : 'Offline'}
                </p>
              </div>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {error && <Banner tone="error" onDismiss={() => setError('')}>{error}</Banner>}

              {loadingThread && (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <Skeleton
                      key={i}
                      style={{ height: 38, width: i % 2 ? '45%' : '60%', marginLeft: i % 2 ? 'auto' : 0 }}
                    />
                  ))}
                </div>
              )}

              {!loadingThread && !messages.length && (
                <p className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  No messages yet. Say hello.
                </p>
              )}

              {!loadingThread &&
                messages.map((m) => {
                  const mine = String(m.senderId) === String(user?.id);
                  return (
                    <div
                      key={m._id}
                      className={`flex ${mine ? 'justify-end' : 'justify-start'} animate-fade-in`}
                    >
                      <div
                        className="max-w-[75%] rounded-2xl px-4 py-2.5"
                        style={{
                          background: mine ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.07)',
                          border: mine ? 'none' : '1px solid var(--glass-border)',
                          borderBottomRightRadius: mine ? 6 : undefined,
                          borderBottomLeftRadius: mine ? undefined : 6,
                        }}
                      >
                        <p className="break-words text-sm">{m.message}</p>
                        <div className="mt-1 flex items-center justify-end gap-1">
                          <time
                            className="text-[10px] opacity-70"
                            dateTime={m.createdAt}
                          >
                            {formatTime(m.createdAt)}
                          </time>
                          {mine && (
                            <span className="text-[10px] opacity-80" aria-label={m.readAt ? 'Read' : 'Sent'}>
                              {m.readAt ? '✓✓' : '✓'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

              {peerTyping && (
                <div className="flex justify-start">
                  <div
                    className="rounded-2xl px-4 py-2.5 text-sm"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid var(--glass-border)' }}
                  >
                    <span className="opacity-70">typing…</span>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={send}
              className="flex gap-2 p-4"
              style={{ borderTop: '1px solid var(--glass-border)' }}
            >
              <input
                className="gl-input"
                placeholder="Type a message…"
                value={draft}
                onChange={handleDraftChange}
                maxLength={2000}
                aria-label="Message"
              />
              <Button type="submit" loading={sending} disabled={!draft.trim()}>
                Send
              </Button>
            </form>
          </>
        )}
      </GlassCard>
    </div>
  );
}
