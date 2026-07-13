// require('dotenv').config({path:'./env'})
import dotenv from 'dotenv'
import connectDB from "./db/index.js";
import { app } from './app.js';
dotenv.config({
    path:'./.env'
})
console.log("Environment variables loaded successfully.");
connectDB()
.then(()=>{
    app.on("error", (error)=>{
        console.log("the application is unable to talk with the database", error);
        throw error;
    })
    app.listen(process.env.PORT || 8000, ()=>{
        console.log(`server is running at port :${process.env.PORT}`)
    })
})
.catch((err)=>{
    console.log("MONGO db connection failed!!!", err)
})

// import connectDB from "./db/index.js";

// connectDB();
/*
import express from 'express'
const app = express()
;( async  ()=>{
    try{
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error", (error)=>{
            console.log("the application is unable  to talk with the database", error);
            throw error;
        })
        app.listen(process.env.PORT, ()=>{
            console.log(`app is listening on port ${process.env.PORT}`)
        })
    } catch(error) {
        console.error("ERROR: ", error)
        throw error
        
    }
})()
*/