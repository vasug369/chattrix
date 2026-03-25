import dotenv from 'dotenv';
dotenv.config();

import connectDB from './config/dbConfig.js';
import app from './app.js';

connectDB();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});