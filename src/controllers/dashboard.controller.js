import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {User} from "../models/user.models.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const channelId = req.user?._id
    if(!mongoose.isValidObjectId(channelId)) {
        throw new ApiError(404, "channelid is invalid")
    }
    const channel = await User.findById(channelId);
    if(!channel) {
        throw new ApiError(404,"user has not found")
    }
    const totalVideos = await Video.countDocuments({
        owner:channelId
    })
    const videoResult = await Video.aggregate([
        {
            $match:{
                owner:new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $group:{
                _id:null,
                totalViews:{
                    $sum:"$views"
                }
            }
        }
    ])
    const totalViews = videoResult.length ? videoResult[0].totalViews:0;
    const totalSubscribers = await Subscription.countDocuments({
        channel:channelId
    })
    const videos = await Video.find(
    { owner: channelId },
    "_id"
);

    const videoIds = videos.map(video => video._id);

    const totalLikes = await Like.countDocuments({
        video: {
            $in: videoIds
        }
    });
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                totalVideos,
                totalViews,
                totalSubscribers,
                totalLikes
            },
            "Channel stats fetched successfully"
        )
    );

})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const channelId = req.user?._id;
    if(!mongoose.isValidObjectId(channelId)) {
        throw new ApiError(400, "invalid user id");
    }
    const channel = await User.findById(channelId);
    if(!channel) {
        throw new ApiError(404, "channel has not found")
    }
    const videos = await Video.find({
        owner: channelId,
    }).sort({
        createdAt: -1
    });
    return res.status(200).json(
        new ApiResponse(
            200,
            videos,
            "Videos fetched successfully"
        )
    );
    })

export {
    getChannelStats, 
    getChannelVideos
    }