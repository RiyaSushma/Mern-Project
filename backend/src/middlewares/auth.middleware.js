import config from "../config/config.js";
import { User } from "../models/user.model.js";
import ApiErrors from "../utils/ApiErrors.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyJwt = asyncHandler(async(req, _, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
        if(!token) {
            throw new ApiErrors(401, "Unauthorised request");
        }
    
        const decodedToken = jwt.verify(token, config.AccessTokenSecret);
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
    
        if(!user) {
            throw new ApiErrors(401, "Invalid access token");
        }
    
        req.user = user;
        next();
    } catch (error) {
        throw new ApiErrors(401, error?.message || "Invalid access token");
    }
});