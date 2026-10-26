/**
 * Fill the local development database with demo data.
 *
 *   npm run seed
 *
 * Add-only and idempotent: it creates what is missing and never deletes or
 * overwrites anything, so it is safe to run again at any time.
 *
 * Refuses to run against anything but a local MongoDB. It reads MONGO_URI
 * from the shell only, never from .env, so a production connection string in
 * .env can never be seeded by accident.
 *
 * Every demo account uses the password in DEMO_PASSWORD below. These are
 * fixture accounts for local testing only. Each run also writes them to
 * local-dev/accounts.txt at the repo root (git-ignored).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import Conversation from '../src/models/conversation.model.js';
import Message from '../src/models/message.model.js';
import Post from '../src/models/post.model.js';
import Report from '../src/models/report.model.js';
import User from '../src/models/user.model.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/chattrix_local';
const DEMO_PASSWORD = 'DemoPassw0rd';

const host = new URL(MONGO_URI.replace(/^mongodb(\+srv)?:/, 'http:')).hostname;
if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(host)) {
  console.error(`Refusing to seed a non-local database (${host}). Seed only runs against localhost.`);
  process.exit(1);
}

const USERS = [
  { key: 'aanya', name: 'Aanya Sharma', bio: 'CS undergrad. Hackathons, chai, and bad sketches.' },
  { key: 'rohan', name: 'Rohan Mehta', bio: 'Coding Club lead. I build things at 3 AM.' },
  { key: 'isha', name: 'Isha Verma', bio: 'Music Society. Open mics every Friday.' },
  { key: 'kabir', name: 'Kabir Singh', bio: 'Robotics. Our rover made the finals.' },
  { key: 'meera', name: 'Meera Iyer', bio: 'Design Club. Pixels and posters.' },
  { key: 'spam', name: 'Promo Deals', bio: 'Buy followers cheap!!', unverified: true },
  { key: 'admin', name: 'Chattrix Admin', bio: 'Keeps Chattrix safe.', role: 'admin' },
];

const FOLLOWS = [
  ['aanya', 'rohan'], ['aanya', 'isha'], ['aanya', 'kabir'],
  ['rohan', 'aanya'], ['rohan', 'kabir'],
  ['isha', 'aanya'], ['isha', 'meera'],
  ['kabir', 'rohan'], ['meera', 'aanya'],
];

const POSTS = [
  ['rohan', 'Hackathon this Saturday 🚀', '48 hours, free food, mentors from three startups. Teams of up to four.', ['aanya', 'kabir'], [['aanya', 'Count me in! Need a designer?'], ['kabir', 'Is there a hardware track?']]],
  ['isha', 'Open mic at the amphitheatre', 'Bring a guitar or just your voice. 7 PM near the canteen.', ['aanya', 'meera'], [['meera', 'I’ll make the poster!']]],
  ['kabir', 'Our rover made it to the finals', 'Thank you to everyone who stayed up debugging with us.', ['rohan', 'aanya'], []],
  ['aanya', 'Newsletter #12 is out ✍️', 'This week: the hackathon line-up and three alumni interviews.', ['rohan', 'isha', 'meera'], [['rohan', 'Great issue as always.']]],
  ['meera', 'Design Club meetup', 'Thursday 6 PM, room 204. Bring your portfolio.', ['isha'], []],
  ['spam', 'FREE FOLLOWERS', 'DM for 10k followers today only!!!', [], []],
];

const MESSAGES = [
  ['aanya', 'rohan', 'Hey! Saw you’re organising the hackathon'],
  ['rohan', 'aanya', 'Yes! Want to join a team?'],
  ['aanya', 'rohan', 'Is the hardware track open to first-years?'],
  ['rohan', 'aanya', 'Totally. Kits are on us 🙌'],
  ['isha', 'aanya', 'See you at the open mic!'],
];

const BLOCKS = [['aanya', 'spam']];

// Open reports, so the admin queue has something to review.
// [reporter, targetType, target author, post title (for posts), reason, details]
const REPORTS = [
  ['rohan', 'post', 'spam', 'FREE FOLLOWERS', 'spam', 'Selling followers'],
  ['isha', 'post', 'spam', 'FREE FOLLOWERS', 'spam', ''],
  ['meera', 'user', 'spam', null, 'spam', 'Spam account'],
];

const email = (key) => `${key}@chattrix.local`;

await mongoose.connect(MONGO_URI);
const created = { users: 0, posts: 0, messages: 0, reports: 0 };

// Users: created only if the email is new; existing accounts are left alone.
const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
const ids = {};
for (const u of USERS) {
  let doc = await User.findOne({ email: email(u.key) });
  if (!doc) {
    doc = await User.create({
      name: u.name,
      email: email(u.key),
      password: hash,
      bio: u.bio,
      isAccountVerified: !u.unverified,
      role: u.role ?? 'user',
    });
    created.users += 1;
  }
  if (u.role && doc.role !== u.role) await User.updateOne({ _id: doc._id }, { $set: { role: u.role } });
  ids[u.key] = doc._id;
}

for (const [a, b] of FOLLOWS) {
  await User.updateOne({ _id: ids[a] }, { $addToSet: { following: ids[b] } });
  await User.updateOne({ _id: ids[b] }, { $addToSet: { followers: ids[a] } });
}

for (const [author, title, content, likers, comments] of POSTS) {
  if (await Post.exists({ author: ids[author], title })) continue;
  await Post.create({
    author: ids[author],
    title,
    content,
    likes: likers.map((k) => ids[k]),
    comments: comments.map(([k, text]) => ({
      author: ids[k],
      name: USERS.find((u) => u.key === k).name,
      content: text,
    })),
  });
  created.posts += 1;
}

for (const [from, to, text] of MESSAGES) {
  if (await Message.exists({ senderId: ids[from], receiverId: ids[to], message: text })) continue;
  let convo = await Conversation.findOne({ participants: { $all: [ids[from], ids[to]], $size: 2 } });
  if (!convo) convo = await Conversation.create({ participants: [ids[from], ids[to]] });
  const msg = await Message.create({ senderId: ids[from], receiverId: ids[to], message: text });
  convo.messages.push(msg._id);
  await convo.save();
  created.messages += 1;
}

for (const [a, b] of BLOCKS) {
  await User.updateOne({ _id: ids[a] }, { $addToSet: { blocked: ids[b] } });
}

for (const [reporter, targetType, author, title, reason, details] of REPORTS) {
  const target = targetType === 'post' ? await Post.findOne({ author: ids[author], title }).lean() : { _id: ids[author] };
  if (!target || (await Report.exists({ reporter: ids[reporter], targetType, targetId: target._id }))) continue;
  await Report.create({
    reporter: ids[reporter],
    targetType,
    targetId: target._id,
    targetUser: ids[author],
    reason,
    details,
    snapshot: targetType === 'post' ? `${target.title}\n\n${target.content}` : USERS.find((u) => u.key === author).name,
  });
  created.reports += 1;
}

// Local-only cheat sheet of the demo logins.
const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../local-dev');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'accounts.txt');
const rows = USERS.map((u) => `${u.name.padEnd(14)} ${email(u.key).padEnd(24)} ${DEMO_PASSWORD}${u.unverified ? '   (unverified email)' : ''}${u.role === 'admin' ? '   (admin: open /admin)' : ''}`);
fs.writeFileSync(
  outFile,
  [
    'Chattrix local demo accounts (local testing only, never production)',
    `Database: ${MONGO_URI}`,
    'Web: http://localhost:5173   API: http://localhost:3000/api',
    '',
    `${'Name'.padEnd(14)} ${'Email'.padEnd(24)} Password`,
    ...rows,
    '',
    'Aanya has blocked "Promo Deals". The admin queue has open reports about Promo Deals.',
    'Regenerate with: cd backend && npm run seed',
    '',
  ].join('\n')
);

console.log(`Seeded ${MONGO_URI}`);
console.log(`  new users ${created.users}, new posts ${created.posts}, new messages ${created.messages}, new reports ${created.reports}`);
console.log(`  demo logins written to ${outFile}`);

await mongoose.disconnect();
