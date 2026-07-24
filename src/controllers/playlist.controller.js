import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { User } from "../models/user.models.js"
import { Video } from "../models/video.models.js"

const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body
    if(
        [name, description].some((field)=>!field || field?.trim()==="")
    ){
        throw new ApiError(400, "all fields are required")
    }
    const existedPlayList = await Playlist.findOne({
        owner:req.user._id,
        name:name
    })
    if(existedPlayList) {
        throw new ApiError(409, "Playlist already exists")
    }
    const playlistCount = await Playlist.countDocuments({
        owner:req.user._id
    })
    if (playlistCount >= 10) {
        throw new ApiError(400, "You cannot create more than 10 playlists");
    }
    
    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user._id
    });

    return res.status(201).json(
        new ApiResponse(201, playlist, "Playlist created successfully")
    );



    //TODO: create playlist
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists
    if(!mongoose.isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user id")
    }
    const user = await User.findById(userId);
    if(!user) {
        throw new ApiError(404, "User not found")
    }
    const playlists = await Playlist.find({ owner: userId });
    if(playlists.length===0) {
        return res.status(200).json(
            new ApiResponse(200, [], "No playlists found")
        );
    }   
    return res.status(200)
    .json(new ApiResponse(200, playlists, "user playlists found successfully"))
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id
    if(!mongoose.isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id")
    }
    const playlist = await Playlist.findById(playlistId).populate("videos");
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }
    return res.status(200)
    .json(new ApiResponse(200, playlist, "playlist found successfully"))

})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    if(!mongoose.isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id")
    }
    const playlist = await Playlist.findById(playlistId);
    if(!playlist) {
        throw new ApiError(404, "Playlist not found")
    }   
    if(playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Unauthorized");
    }
    if(!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }
    const video = await Video.findById(videoId);
    if(!video) {
        throw new ApiError(404, "Video not found")
    }
    const videoExists = playlist.videos.some(
        id => id.toString() === videoId
    );
    if(videoExists) {   
        throw new ApiError(409, "Video already exists in the playlist")
    }
    playlist.videos.push(videoId);
    await playlist.save({ validateBeforeSave: false });
    const updatedPlaylist = await Playlist.findById(playlistId).populate("videos");
    return res.status(200).json(new ApiResponse(200, updatedPlaylist, "Video added to playlist successfully"))
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    if(!mongoose.isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id")
    }
    const playlist = await Playlist.findById(playlistId);
    if(!playlist) {
        throw new ApiError(404, "Playlist not found")
    }  
    if(!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }
    const video = await Video.findById(videoId);
    if(!video) {
        throw new ApiError(404, "Video not found")
    }
    if(playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "Unauthorized");
    }
    const videoExists = playlist.videos.some(
        id => id.equals(videoId)
    );

    if (!videoExists) {
        throw new ApiError(404, "Video is not present in the playlist");
    }
    playlist.videos.pull(videoId);
    const updatedPlaylist = await playlist.save({validateBeforeSave:false})
    return res.status(200)
    .json(new ApiResponse(200,updatedPlaylist, "video has removed successfully from playlist"))
    // TODO: remove video from playlist

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
    if(!mongoose.isValidObjectId(playlistId)){
        throw new ApiError(404, "invalid playlist id")
    }
    const playlist = await Playlist.findById(playlistId)
    if(!playlist) {
        throw new ApiError(404, "playlist has not found")
    }
    // har baar authorization bhul jata hu 
    if (!playlist.owner.equals(req.user._id)) {
        throw new ApiError(403, "Unauthorized");
    }
    await Playlist.findByIdAndDelete(playlistId);
    return res.status(200)
    .json(new ApiResponse(200, {}, "playlist has deleted successfully"))

})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist
    if(!mongoose.isValidObjectId(playlistId)) {
        throw new ApiError(404, "invalid playlist id")
    }
    if(
        [name, description].some((field)=>!field || field?.trim()==="")
    ){
        throw new ApiError(400, "all fields are required")
    }
    const existedPlaylist =await Playlist.findById(playlistId);
    if(!existedPlaylist) {
        throw new ApiError(404, "existed playlist does not exist")
    }
    if(existedPlaylist.owner.toString()!==req.user?._id.toString()) {
        throw new ApiError(403,"unauthorized request")
    }
    const playlist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            name,
            description
        },
        {new:true}
    )
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }
    return res.status(200)
    .json(
        new ApiResponse(200, playlist, "playlist has updated successfully")
    )
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}