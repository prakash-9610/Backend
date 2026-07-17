import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.models.js";
// We verify the JWT to make sure:
// 1. The request is coming from an authenticated user.
// 2. The token was issued by our server.
// 3. The token has not been modified.
// 4. The token has not expired.
//
// If all checks pass, we identify the user and attach
// their information to req.user before allowing access
// to the protected route.
export const verifyJWT= asyncHandler( async (req, res, next)=>{
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")
        if(!token) {
            throw new ApiError(401, "unauthoirzed request")
        }
        const decodedToken  = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
        if(!user) {
            throw new ApiError(401, "invalid access token ")
        }
        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "invalid access token")
    }

})