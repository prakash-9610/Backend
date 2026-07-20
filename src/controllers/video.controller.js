import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    if([title,description].some((field)=>field?.trim()==="")) {
        throw new ApiError(400, "All fields are required")
    }
    let videoLocalpath;
    if(req.files && Array.isArray(req.files.videoFile) && req.files.videoFile.length>0) {
        videoLocalpath = req.files.videoFile[0].path
    }
    if(!videoLocalpath) {
        throw new ApiError(400, "Video file is required")
    }
    const videoFile = await uploadOnCloudinary(videoLocalpath);
    if(!videoFile) {
        throw new ApiError(500, "Video upload failed")
    }
    let thumbNail;
    if(req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length>0) {
        thumbNail = req.files.thumbnail[0].path
    }
    if(!thumbNail) {
        throw new ApiError(400, "Thumbnail is required")
    }
    const thumbnail = await uploadOnCloudinary(thumbNail);
    if(!thumbnail) {
        throw new ApiError(500, "Thumbnail upload failed")
    }
    const owner = req.user?._id;
    if(!owner) {
        throw new ApiError(401, "u have not logged in pls login ")
    }
    const video = await Video.create({
        title,
        description,
        owner:owner,
        videoFile : videoFile?.url ,
        thumbnail : thumbnail?.url,
        duration:videoFile.duration
    })
    if(!video) {
        throw new ApiError(500, "failed to upload video");
    }
    return res.status(201)
    .json(
        new ApiResponse(201,video,"video is published successfully")
    )

    // TODO: get video, upload to cloudinary, create video
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const {title, description,thumbnail} = req.body
    if(!title || !description || !thumbnail) {
        throw new ApiError(400, "all field is required")
    }
    let thumbNail;
    if(req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length>0) {
        thumbNail = req.files.thumbnail[0].path
    }
    if(!thumbNail) {
        throw new ApiError(400, "Thumbnail is required")
    }
    const thumbnail = await uploadOnCloudinary(thumbNail);
    if(!thumbnail) {
        throw new ApiError(500, "Thumbnail upload failed")
    }
    const video = await Video.findByIdAndUpdate(
        req.params.videoId,
        {
            $set:{
                title:title,
                description:description,
                thumbnail:thumbnail?.url
            }
        },
        {new:true}
    )
    return res.status(200)
    .json(
        new ApiResponse(200, video, "video details updated successfully")
    )
    //TODO: update video details like title, description, thumbnail

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}