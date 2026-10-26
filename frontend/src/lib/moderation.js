/** Shared labels and formatting for reporting and the admin panel. */

export const REPORT_REASONS = [
  ['spam', 'Spam or scam'],
  ['harassment', 'Harassment or bullying'],
  ['hate', 'Hate speech'],
  ['nudity', 'Nudity or sexual content'],
  ['self_harm', 'Self-harm or violence'],
  ['other', 'Something else'],
];

export const REASON_LABEL = Object.fromEntries(REPORT_REASONS);
export const TYPE_LABEL = { post: 'Post', comment: 'Comment', message: 'Message', user: 'Account' };

export const timeAgo = (iso) => {
  if (!iso) return '';
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '';
