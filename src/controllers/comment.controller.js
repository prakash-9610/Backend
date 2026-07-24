import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.models.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query
    if(!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "invalid video id")
    }
    const video = await Video.findById(videoId);
    if(!video) {
        throw new ApiError(404, "video not found")
    }
    const pageNumber = Math.max(1, Number(page));
    const limitNumber = Math.max(1, Number(limit));
    const matchStage={
        video:new mongoose.Types.ObjectId(videoId)
    };
    const comments = await Comment.aggregate([
        {
            $match:matchStage
        }, 
        {
            $sort: {
                createdAt:-1
            }
        },
        {
            $skip: (pageNumber - 1) * limitNumber
        },
        {
            $limit: limitNumber
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"ownerDetails",
                pipeline:[
                    {
                        $project:{
                            username:1,
                            avatar:1
                        }
                    }
                ]
            }
        },
        {
            $unwind:"$ownerDetails"
        },
        {
        $project: {
            _id:1,
            content: 1,
            createdAt: 1,
            owner: "$ownerDetails"
        }
    }

    ]);
    return res.status(200)
    .json(
        new ApiResponse(200,comments,"comments fetched successfully" )
    )


})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const {comment} = req.body
    if (!comment || comment.trim() === "") {
        throw new ApiError(400, "Comment cannot be empty");
    }
    const {videoId} = req.params
    if(!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "invalid video id")
    }
    const video =await Video.findById(videoId);
    if(!video ) {
        throw new ApiError(404,"video details not found")
    }
    const newComment = await Comment.create({
        owner:req.user?._id,
        video:videoId,
        content:comment
    })
    return res.status(201)
    .json(
        new ApiResponse(201, newComment, "user is commented successfully")
    ) 
    
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const {commentId} = req.params
    const {comment} = req.body
    if(!comment || comment.trim()==="") {
        throw new ApiError(400,"cooment content is empty")
    }
    if(!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, "invalid comment id")
    }
    const existingComment = await Comment.findById(commentId);
    if (!existingComment) {
        throw new ApiError(404, "Comment not found");
    }
    if (existingComment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Unauthorized");
    }
    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            content : comment
        },
        {
            new:true
        }
)
return res.status(200)
.json(
    new ApiResponse(200, updatedComment, "comment updated successfully")
)


})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const {commentId} = req.params
    if(!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, "invalid comment id")
    }
    const existingComment = await Comment.findById(commentId);
    if (!existingComment) {
        throw new ApiError(404, "Comment not found");
    }
    if (existingComment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Unauthorized");
    }
    await Comment.findByIdAndDelete(commentId)
    return res.status(200)
    .json(
        new ApiResponse(200, {}, "comment deleted successfully")
    )

})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }