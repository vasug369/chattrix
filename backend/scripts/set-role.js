/**
 * Grant or remove admin access. The only way to change a role: the API has no
 * endpoint for it, so a compromised account can't promote itself.
 *
 *   MONGO_URI=<connection string> npm run set-role -- <email> <admin|user>
 *
 * MONGO_URI must be given on the command line; .env is never read, so the
 * target database is always a deliberate choice.
 */
import mongoose from 'mongoose';
import User from '../src/models/user.model.js';

const [email, role] = process.argv.slice(2);
const uri = process.env.MONGO_URI;

if (!uri || !email || !['admin', 'user'].includes(role)) {
  console.error('Usage: MONGO_URI=<uri> npm run set-role -- <email> <admin|user>');
  process.exit(1);
}

await mongoose.connect(uri);
const user = await User.findOneAndUpdate(
  { email: email.trim().toLowerCase() },
  { $set: { role } },
  { new: true }
).select('name email role');
await mongoose.disconnect();

if (!user) {
  console.error(`No account with email ${email}`);
  process.exit(1);
}
console.log(`${user.name} <${user.email}> is now: ${user.role}`);
