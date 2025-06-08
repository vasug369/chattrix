import mongoose from "mongoose";

const userSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true,
        trim:true

    },
    email:{
        type:String,
        required:true,
        unique:true


    },
    password:{
        type:String,
        required:true

    },

    pic:{
        type:String,
        default:"https://iconarchive.com/download/i107272/Flat-UI-Icons/User-Interface/user.ico"
    },

    followers:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }],

    following:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }],

    verifyOtp:{ 
        type:String,
        default:""
    },

    verifyOtpExpiry:{
        type:Date,
        default:0
    },

    isAccountVerified:{
        type:Boolean,
        default:false
    },

    resetOtp:{
        type:String,
        default:""
    },

    resetOtpExpiry:{
        type:Date,
        default:0
    },

    createdAt:{
        type:Date,
        default:Date.now

    }

})

const User=mongoose.model('User',userSchema);

export default User;