import ApiErrors from "../utils/ApiErrors.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { findEmptyEntry, emailValidation, passwordValidation } from "../utils/Helper.controller.js";
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import fs from 'fs';
import jwt from 'jsonwebtoken';
import config from "../config/config.js";

const generateAccessAndRefreshToken = async(userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});

        return { refreshToken, accessToken };

    } catch(error) {
        throw new ApiErrors(500, "Error while generating refresh and access token");
    }
}

// step to register user
// req will have all the data send to register a user
// validation -> no empty entries
// existing user or not -> both username and email
// check for images, check for avatar
// sending files to cloudinary -> for avatar (it is mandatory)
// creating user object -> create entry in db
// check for res or not
// passing response -> remove password and refresh token

const registerUser = asyncHandler(async(req, res) => {

    // console.log("request is: ", req.body);
    const { fullName, email, username, password } = req.body;
    const emptyFields = findEmptyEntry({ fullName, email, username, password });

    if(emptyFields.length > 0) {
        throw new ApiErrors(400, `${emptyFields.join(", ")} are required`);
    }

    if(!emailValidation(email)) {
        throw new ApiErrors(400, "Invalid email id");
    } 

    if(!passwordValidation(password)) {
        throw new ApiErrors(400, "Password should have atleast one character, digit and special character [! # $ % ^ * _] and min length is 8");
    }

    const existingUser = await User.findOne({ 
        $or: [{username}, {email}]
     });

    console.log("existing user is: ", existingUser);

    if(existingUser) {
        const avatarLocalPath = req.files?.avatar[0]?.path;
        fs.unlinkSync(avatarLocalPath);
        if(req.files && Array.isArray(req.files.coverImage)) {
            const coverImageLocalPath = req.files?.coverImage[0]?.path;
            fs.unlinkSync(coverImageLocalPath);
        }
        throw new ApiErrors(409, "existing user");
    }

    let coverImageLocalPath, coverImage;
    const avatarLocalPath = req.files?.avatar[0]?.path;
    if(req.files && Array.isArray(req.files.coverImage)) {
        coverImageLocalPath = req.files?.coverImage[0]?.path;
        coverImage = await uploadOnCloudinary(coverImageLocalPath);
    }

    if(!avatarLocalPath) {
        throw new ApiErrors(400, "Avatar is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);


    console.log(req.files?.avatar[0]?.path);
    
    // if(coverImageLocalPath) {
    //     coverImage = await uploadOnCloudinary(coverImageLocalPath);
    // }

    if(!avatar) {
        throw new ApiErrors(400, "Avatar is required");
    }

    const user = await User.create({
        fullName, 
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        username: username.toLowerCase(),
        email,
        password
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if(!createdUser) {
        throw new ApiErrors(500, "Server error: Error while registering the user in database");
    } 

    console.log(createdUser);

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    );
});


// login user steps
// take input (username or email, password)
// authenticate user by checking using user.findone
// check password and then send refresh token and access token
// send cookies
// if not existing user throw error otherwise success and send generate token

const loginUser = asyncHandler(async(req, res) => {
    const { email, username, password } = req.body;
    if(!(username || email)) {
        throw new ApiErrors(400, "Username or Email required");
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    });

    if(!user) {
        throw new ApiErrors(404, "User not found");
    }

    const isPassword = await user.isPasswordCorrect(password);

    if(isPassword) {
        throw new ApiErrors(401, "Incorrect Password");
    }

    const { refreshToken, accessToken } = await generateAccessAndRefreshToken(user._id);

    const loginUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
    new ApiResponse(200, {
        user: loginUser,
        accessToken,
        refreshToken
    }, "Login successfully"));
});


// steps for logout
// remove cookies
// refresh the refresh and access token (remove them)

const logoutUser = asyncHandler(async(req, res) => {

    // to get new updated value
    await User.findByIdAndUpdate(req.user._id, {
        $set: {
            refreshToken: undefined
        },
    }, {
        new: true
    });

    const options = {
        httpOnly: true,
        secure: true
    };

    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));

});

const refreshAccessToken = asyncHandler(async(req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if(!incomingRefreshToken) {
        throw new ApiErrors(401, "unauthorised request");
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, config.RefreshTokenSecret);
    
        const user = await User.findById(decodedToken?._id);
    
        if(!user) {
            throw new ApiErrors(401, "invalid refresh token");
        }
    
        if(!user.refreshToken == incomingRefreshToken) {
            throw new ApiErrors(401, "iRefresh token is expired or used");
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const { refreshToken, accessToken } = await generateAccessAndRefreshToken(user._id);
        
        // const refreshTokenUser = await User.findById(user._id);
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, {
                // user: refreshAccessToken,
                refreshToken, 
                accessToken
            }, "Access Token refreshed successfully")
        );
    } catch (error) {
        throw new ApiErrors(401, error?.message || "invalid refresh token");
    }
})

export { registerUser, loginUser, logoutUser, refreshAccessToken };