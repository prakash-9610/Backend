import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { User } from "../models/user.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
const generateAccessAndRefreshToken = async(userId) =>{
        try {
            const user = await User.findById(userId);
            const accessToken = user.generateAccessToken()
            const refreshToken = user.generateRefreshToken()
            user.refreshToken = refreshToken
            await user.save({validateBeforeSave:false})
            return {accessToken , refreshToken}
        } catch (error) {
            throw new ApiError(500, "something went wrong while generating refresh and access token")
        }
    }
const registerUser = asyncHandler( async(req,res)=>{
    // get users details from frontend
    // validation- not empty
    // check if  user already exists: username, email
    // check for images , check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db 
    // remove password and refresh tokens field form response 
    // check for user creation 
    // return res
    const {fullname, email, username, password} = req.body
    console.log("email: ", email);
    if(
        [fullname, email, username,password].some((field)=>field?.trim()==="")
    ){
        throw new ApiError(400, "all fields are required")
    }
    const existedUser = await User.findOne({
        $or:[{username}, {email}]
    })
    if(existedUser) {
        throw new ApiError(409, "user with email or username already exists")
    }
    console.log(req.files);
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }
    if(!avatarLocalPath) {
        throw new ApiError(400, "avatar file is required")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if(!avatar) {
         throw new ApiError(400, "avatar file is required");
    }
    const user = await User.create({
        fullname,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser) {
        throw new ApiError(500, "something went wrong while registering the user")
    }
    return res.status(201).json(
        new ApiResponse(200, createdUser, "user registered successfully")
    )
})

const loginUser = asyncHandler( async(req,res) =>{
    // req body -> data 
    // username or email 
    // find the user
    // paddword check 
    // access and refresh token 
    // send cookie 
    const {email , username, password} = req.body
    if(!(username || email)) {
        throw new ApiError(400, "username or email is required");
    }
    const user = await User.findOne({
        $or:[
            {username:username},{email:email}]
    })
    if(!user) {
        throw new ApiError(404, " user not exist");
    }
    const isPasswordValid = await user.isPasswordCorrect(password);
    if(!isPasswordValid) {
        throw new ApiError(401, "invalid password");
    }
    const {accessToken, refreshToken}=await generateAccessAndRefreshToken(user._id)
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    const options = {
        httpOnly :  true,
        secure:true
    }
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser, accessToken, refreshToken
            },
            "user logged In Successfully"
        )
    )
})
const logoutUser = asyncHandler(async(req,res) =>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
    )
    const options = {
        httpOnly:true,
        secure:true
    }
    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "user logged out"))
})

const refreshAccessToken = asyncHandler(async (req,res)=>{
    const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken // this comes from user 
    if(!incomingRefreshToken) { // verify users refresh token like is this valid or not ? if not then throw error
        throw new ApiError(401, "unauthorized request")
    }
    try {   // try block when , user's refrresh token is verified
        const decodedToken = jwt.verify( // here  i am veryfying,  was this token created using my secret key ?
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )// and it also verify encrypted information ,bcs whatever info is store in refresh token that is encrypted , jwt decrypt these info and send it as response
        const user = await User.findById(decodedToken?._id);
        if(!user) {
            throw new ApiError(401, "invalid refresh token")
        }
        if(incomingRefreshToken!==user.refreshToken) {
            throw new ApiError(401," refreshToken token has expired or used" )
        }
        const options = {
            httpOnly:true,
            secure:true
        }
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id)
        return res.status(200)
        .cookie("accessToken",accessToken, options)
        .cookie("refreshToken", newRefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken:newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "envalid refress token ")   
    }


})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword, newPassword} = req.body
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect) {
        throw new ApiError(400, "invalid old password");
    }
    user.password = newPassword
    await user.save({validateBeforeSave:false})
    return res.status(200)
    .json(
        new ApiResponse(200, {},"password changed successfully")
    )
})

const currentUser = asyncHandler(async (req,res)=>{
    return res
    .status(200)
    .json(
         (200,req.user,"current user fetched successfully")
    )
})

const updateAccountDetails = asyncHandler(async (req,res) =>{
    const {fullname, email} = req.body
    if(!(fullname || email)) {
        throw new ApiError(400, "all fields are required")
    }
    const user =  User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullname:fullname,
                email:email
            }
        },
        {new:true} // this returns the values after the updation
    ).select("-password")
    return res.status(200)
    .json(new ApiResponse(200, user,"account details updated successfully"))

})

const updateUserAvatar = asyncHandler(async(req,res) =>{
    const avatarLocalPath = req.file?.path
    if(!avatarLocalPath) {
        throw new ApiError(400, "avatar file is missing")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url) {
        throw new ApiError(400, "error while uploading on avatar")
    }
    const user = await user.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password")
    return res.status(200)
    .json(new ApiResponse(200, user,"avatar image updated successfully"))

})

const updateUserCoverImage = asyncHandler(async(req,res) =>{
    const coverImageLocalPath = req.file?.path
    if(!coverImageLocalPath) {
        throw new ApiError(400, "cover iamge file is missing")
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage.url) {
        throw new ApiError(400, "error while uploading on cover iamge")
    }
    const user = await user.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new:true}
    ).select("-password")
    return res.status(200)
    .json(new ApiResponse(200, user,"coverimage image updated successfully"))

})
export {registerUser, loginUser,logoutUser,refreshAccessToken,changeCurrentPassword,currentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage} 