import mongoose from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const {content} = req.body
    if(!content ||content.trim()==="") {
        throw new ApiError(400, "Content cannot be empty")
    } 
    const tweet = await Tweet.create({
        content,
        owner:req.user?._id
    })
    return res.status(201)
    .json(
        new ApiResponse(201,tweet, "tweet is created successfully")
    )
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const {userId} = req.params;
    if(!mongoose.isValidObjectId(userId)){
        throw new ApiError(400, "Invalid user id")
    }
    const tweets = await Tweet.find(
        {owner:userId}).sort({createdAt:-1});
    return res.status(200)
    .json(
        new ApiResponse(200,tweets,"all tweetes wrote by user successfully")
    )    

})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const {tweetId} = req.params;
    const {content} = req.body;

    if(!mongoose.isValidObjectId(tweetId)) {
        throw new ApiError(404, "invalid tweet id ");
    }
    if(!content || content.trim()==="") {
        throw new ApiError(400, "contnet must not be empty");
    }
     const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    if (!tweet.owner.equals(req.user._id)) {
        throw new ApiError(403, "Unauthorized");
    }
    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set:{
            content
        }
    },
        {new:true}
    )
    if(!updatedTweet) {
        throw new ApiError(404, "tweet not found");
    }
    
    return res.status(200)
    .json(
        new ApiResponse(200, updatedTweet, "tweet updated successfully")
    )
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const {tweetId} = req.params;
    if(!mongoose.isValidObjectId(tweetId)) {
        throw new ApiError(400, "invalid tweet id ");
    }
    const tweet = await Tweet.findById(tweetId);
    if(!tweet) {
        throw new ApiError(404, "tweet not found");
    }
    if (!tweet.owner.equals(req.user._id)) {
        throw new ApiError(403, "Unauthorized");
    }
    const deletedTweet = await Tweet.findByIdAndDelete(tweetId);
    if(!deletedTweet) {
        throw new ApiError(404, "tweet not found");
    }
    return res.status(200)
    .json(
        new ApiResponse(200, deletedTweet, "tweet deleted successfully")
    )
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}