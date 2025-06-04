import express from 'express'
import dotenv from 'dotenv'
import connectDB from './config/dbConfig.js';
import { login } from './controllers/authController.js';
import authRouter from './routes/authRoutes.js';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import postRouter from './routes/postRoutes.js';

connectDB();
dotenv.config();


// const dummy=new User({
//     name:"vasu",
//     email:"dummy123@gmail.com",
//     password:"1234"
// })

// dummy.save()
// .then(()=>{
//     console.log("data saved succesfully");
// })
// .catch((err)=>{
//     console.log(err);
// })
const app = express();
const PORT = process.env.PORT || 3000;



// Middleware to parse JSON requests
app.use(express.json());
app.use(cookieParser());

// const allowlist = ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173'];

app.use(cors({
    origin:'http://localhost:5173',
    credentials:true
}));

app.use('/api/auth',authRouter);
app.use('/api/post',postRouter);

// // Basic route
// app.get('/', (req, res) => {
//     res.send('Welcome to the backend server!');
// });

// app.post('/login',login);


// app.post('/user',(req,res)=>{
    
// })
// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});