import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.models.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription
    if(mongoose.isValidObjectId(channelId)===false) {
        throw new ApiError(400, "Invalid channel id")
    }
    const channel = await User.findById(channelId)
    if(!channel) {
        throw new ApiError(404, "channel not found")
    }
    if (req.user._id.equals(channel._id)) {
        throw new ApiError(400, "You cannot subscribe to your own channel");
    }
    const subscription = await Subscription.findOne({
        subscriber:req.user._id,
        channel:channelId
    })
    if (subscription) {
        await Subscription.deleteOne({
            subscriber:req.user._id,
            channel:channelId
        })
        return res.status(200).json(new ApiResponse(200, { subscribed: false }, "Subscription removed"))
    } else {
        await Subscription.create({
            subscriber:req.user._id,
            channel:channelId
        })
        return res.status(200).json(new ApiResponse(200, { subscribed: true }, "Subscription added"))
    }
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    if (!mongoose.isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel id");
    }
    const channel = await User.findById(channelId);
    if(!channel) {
        throw new ApiError(404, "channel not found")
    }
    const subscribers = await Subscription.aggregate([
        {
            $match: {
            channel: new mongoose.Types.ObjectId(channelId)
        }
        },
        {
            $lookup:{
                from:"users",
                localField:"subscriber",
                foreignField:"_id",
                as:"subscriber",
                pipeline:[
                    {
                        $project:{
                            username:1,
                            email:1
                        }
                    }
                ]
            }
        },
        {
            $unwind:"$subscriber"
        },
        {
            $project: {
            _id: 0,
            username: "$subscriber.username",
            email: "$subscriber.email"
            }
        }
    ])
    if(subscribers.length===0) {
        return res.status(200)
        .json(new ApiResponse(200, [], "channel have 0 subscribers"))
    }
    return res.status(200).json(new ApiResponse(200, subscribers, "Subscribers fetched successfully"))
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
    if(!mongoose.isValidObjectId(subscriberId)) {
        throw new ApiError(400, "Invalid subscriber id")
    }
    const subscriber = await User.findById(subscriberId);
    if(!subscriber) {
        throw new ApiError(404, "subscriber not found")
    }
    const channels= await Subscription.aggregate([
        {
            $match:{
                subscriber:new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"channel",
                foreignField:"_id",
                as:"channel",
                pipeline:[
                    {
                        $project:{
                            username:1,
                            email:1
                        }
                    }
                ]
            }      
        },
        {
            $unwind:"$channel"
        },
        {
            $project:{
                _id:0,
                username: "$channel.username",
                email: "$channel.email"
            }
        }
    ])
    return res.status(200).json(new ApiResponse(200, channels, "Subscribed channels fetched successfully"))
})  


export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}