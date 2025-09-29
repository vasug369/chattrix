import mongoose from "mongoose";
import dotenv from 'dotenv';
dotenv.config();
const mongoUri=mongoose.connect(`mongodb+srv://${process.env.DB_Host}:${process.env.DB_Pass}@cluster0.ffirymn.mongodb.net/${process.env.DB_Name}?retryWrites=true&w=majority&appName=Cluster0`);

const connectDB=async()=>{
    await mongoUri
.then(()=>{
    console.log("mongodb is connected");
    // console.log("mongo uri is",mongoUri);
    

})
.catch((err)=>{
    console.log(err);
})

}

export default connectDB;