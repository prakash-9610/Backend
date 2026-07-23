import mongoose, {isValidObjectId} from "mongoose"
import { v2 as cloudinary } from "cloudinary";
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        query,
        sortBy = "createdAt",
        sortType = "desc",
        userId
    } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    if (!userId) {
        throw new ApiError(400, "User ID is required");
    }

    if (!mongoose.isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid User ID");
    }

    const matchStage = {
        owner: new mongoose.Types.ObjectId(userId),
        isPublished: true
    };

    // Search by title or description (optional)
    if (query && query.trim() !== "") {
        matchStage.$or = [
            {
                title: {
                    $regex: query,
                    $options: "i"
                }
            },
            {
                description: {
                    $regex: query,
                    $options: "i"
                }
            }
        ];
    }

    const videos = await Video.aggregate([
        {
            $match: matchStage
        },
        {
            $sort: {
                [sortBy]: sortType === "asc" ? 1 : -1
            }
        },
        {
            $skip: (pageNumber - 1) * limitNumber
        },
        {
            $limit: limitNumber
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$ownerDetails"
        }
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            videos,
            "Videos fetched successfully"
        )
    );
});

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
        videoFile: {
        url: videoFile.secure_url,
        public_id: videoFile.public_id
        },
        thumbnail: {
            url: thumbnail.secure_url,
            public_id: thumbnail.public_id
        },
        duration: videoFile.duration
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
    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }
    const existingVVideo = await Video.findById(videoId);
    if(!existingVVideo) {
        throw new ApiError(404, "video not found")
    }
    return res.status(200)
    .json(new ApiResponse(200, existingVVideo,"video fetched successfully"))

    //TODO: get video by id
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }
    const existingVideo = await Video.findById(videoId);

    if (!existingVideo) {
        throw new ApiError(404, "Video not found");
    }

    if (!existingVideo.owner.equals(req.user._id)) {
        throw new ApiError(403, "You are not authorized to update this video");
    }
    const {title, description} = req.body
    if([title,description].some(field=>field?.trim()==="")){
        throw new ApiError(400,"All fields are required");
    }
    
    const thumbNail = req.file?.path;
    if(!thumbNail) {
        throw new ApiError(400, "Thumbnail is required")
    }
    await cloudinary.uploader.destroy(
        existingVideo.thumbnail.public_id
    );
    const newThumbnail = await uploadOnCloudinary(thumbNail);
    if(!newThumbnail) {
        throw new ApiError(500, "Thumbnail upload failed")
    }
    await cloudinary.uploader.destroy(existingVideo.thumbnail.public_id);
    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $set:{
                title,
                description,
                thumbnail:{
                url:newThumbnail.secure_url,
                public_id:newThumbnail.public_id
            }
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
    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }
    const existingVideo = await Video.findById(videoId);
    if(!existingVideo) {
        throw new ApiError(404, "video not found")
    }
    if(existingVideo.owner.toString() !== req.user._id.toString()){ 
        throw new ApiError(403, "You are not authorized to delete this video")
    }
    await cloudinary.uploader.destroy(
        existingVideo.videoFile.public_id,
        {
            resource_type: "video"
        }
    );

    await cloudinary.uploader.destroy(
        existingVideo.thumbnail.public_id
    );
    const video = await Video.findByIdAndDelete(videoId)
    return res.status(200)
    .json(
        new ApiResponse(200, video, "video deleted successfully")
    )
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }
    const video = await Video.findById(videoId)
    if(!video) {
        throw new ApiError(404, "video not found")
    }
    if(!video.owner.equals(req.user._id)) {
        throw new ApiError(403, "You are not authorized to change the publish status of this video")
    }
    video.isPublished = !video.isPublished
    await video.save({ validateBeforeSave: false })
    return res.status(200)
    .json(
        new ApiResponse(200,video,"publish status updated successfully")
    )
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}