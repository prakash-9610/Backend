import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.models.js"
import { Comment } from "../models/comment.model.js"
import { Tweet } from "../models/tweet.model.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video
    if(!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(404, "invalid video id")
    }
    const video = await Video.findById(videoId);
    if(!video) {
        throw new ApiError(404,"video has not found");
    }
    const existingLike = await Like.findOne({
        video:videoId,
        likedBy:req.user?._id
    })
    if(existingLike) {
        const deletedLike = await Like.findByIdAndDelete(existingLike?._id)
        if(!deletedLike) {
            throw new ApiError(500, "smething went worng, pls try again")
        }
        return res.status(200)
        .json(new ApiResponse(200, deletedLike,"video like has deleted successfully"))
    }else {
        const like = await Like.create({
            video:videoId,
            likedBy:req.user?._id
        })
        if(!like) {
            throw new ApiError(500, "smething went worng, pls try again")
        }
        return res.status(200)
        .json(new ApiResponse(200, like,"video has liked successfully")) 
    }

})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    if(!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(404, "invalid video id")
    }
    const comment = await Comment.findById(commentId);
    if(!comment) {
        throw new ApiError(404,"comment has not found");
    }
    const existingLike = await Like.findOne({
        comment:commentId,
        likedBy:req.user?._id
    }) 
    if(existingLike) {
        const deletedLike = await Like.findByIdAndDelete(existingLike?._id)
        if(!deletedLike) {
            throw new ApiError(500, "smething went worng, pls try again")
        }
        return res.status(200)
        .json(new ApiResponse(200, deletedLike,"comment like has deleted successfully"))
    }else {
        const like = await Like.create({
            comment:commentId,
            likedBy:req.user?._id
        })
        if(!like) {
            throw new ApiError(500, "smething went worng, pls try again")
        }
        return res.status(200)
        .json(new ApiResponse(200, like,"comment has liked successfully")) 
    }
    //TODO: toggle like on comment

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
    if(!mongoose.isValidObjectId(tweetId)) {
        throw new ApiError(400, "invalid tweet id")
    }
    const tweet = await Tweet.findById(tweetId);
    if(!tweet) {
        throw new ApiError(404,"tweet has not found");
    }
    const existingLike = await Like.findOne({
        tweet:tweetId,
        likedBy:req.user?._id
    })
    if(existingLike) {
        const deletedLike = await Like.findByIdAndDelete(existingLike._id)
        if(!deletedLike) {
            throw new ApiError(500, "smething went worng, pls try again")
        }
        return res.status(200)
        .json(new ApiResponse(200, deletedLike,"tweet like has deleted successfully"))
    }else {
        const like = await Like.create({
            tweet:tweetId,
            likedBy:req.user?._id
        })
        if(!like) {
            throw new ApiError(500, "smething went worng, pls try again")
        }
        return res.status(200)
        .json(new ApiResponse(200, like,"tweet has liked successfully")) 
    }
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const likedVidoes = await Like.aggregate([
        {
            $match:{
                likedBy:new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup:{
                from :"videos",
                localField:"video",
                foreignField:"_id",
                as:"likedVideo",
                
            }
        },
        {
            $unwind: "$likedVideo"
        },
        {
            $replaceRoot: {
                newRoot: "$likedVideo"
            }
        }
    ])
    return res.status(200)
    .json(
        new ApiResponse(200, likedVidoes,"all liked videos have fetched successfully")
    )

})


export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}