import ApiErrors from "../utils/ApiErrors.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { findEmptyEntry, emailValidation, passwordValidation } from "../utils/Helper.controller.js";
import { User } from '../models/user.model.js';
import { deleteOldImage, uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import fs from 'fs';
import jwt from 'jsonwebtoken';
import config from "../config/config.js";
import mongoose from "mongoose";

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

    // console.log("existing user is: ", existingUser);

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


    // console.log(req.files?.avatar[0]?.path);
    
    // if(coverImageLocalPath) {
    //     coverImage = await uploadOnCloudinary(coverImageLocalPath);
    // }

    if(!avatar) {
        throw new ApiErrors(400, "No response from cloudinary");
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

    // console.log(createdUser);

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

    if(!isPassword) {
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
});


// steps:
// check if user is logged in or not
// check if current and new password are same if not update it using user.findByIdAndUpdate
// send res
const currentPasswordChange = asyncHandler(async(req, res) => {
    const { oldPassword, newPassword } = req.body;

    
    if(oldPassword == newPassword) {
        throw new ApiErrors(401, "Old and new Password are same");
    }
    
    const user = await User.findById(req.user?._id);

    // console.log(user);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if(!isPasswordCorrect) {
        throw new ApiErrors(401, "Incorrect Password");
    }

    user.password = newPassword;
    await user.save({
        validateBeforeSave: false
    });

    return res.status(200).json(
        new ApiResponse(200, {}, "Password changed successfully")
    );
});


const currentUser = asyncHandler(async(req, res) => {

    return res.status(200).json(
        new ApiResponse(200, req.user, "User fetch successfully")
    )
});

const updateAccountDetails = asyncHandler(async(req, res) => {
    const { fullName, email } = req.body;

    if(!(fullName || email)) {
        throw new ApiErrors(401, "Only fullname and email are allowed to be changed");
    }

    const updateFields = { ...req.body };

    if(!emailValidation(updateFields.email)) {
        throw new ApiErrors(400, "Invalid email id");
    }

    const user = await User.findByIdAndUpdate(req.user?._id, {
        $set: updateFields
    },{
        new: true
    }).select("-password -refreshToken");

    return res.status(200).json(
        new ApiResponse(200, user, "User Information updated successfully")
    );
});

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path;
    if(!avatarLocalPath) {
        throw new ApiErrors(401, "Avatar is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    console.log(avatar);

    if(!avatar.url) {
        throw new ApiErrors(401, "Error while uploading the image");
    }

    const user = await User.findByIdAndUpdate(req.user?._id, {
        $set: {
            avatar: avatar.url
        }
    }, {
        new: true
    }).select("-password -refreshToken");

    await deleteOldImage(avatar.display_name);

    return res.status(200).json(
        new ApiResponse(200, user, "Avatar Updated successfully")
    );
});

const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path;

    if(!coverImageLocalPath) {
        throw new ApiErrors(400, "Cover image is required");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!coverImage.url) {
        throw new ApiErrors(401, "Error while uploading the image");
    }

    const user = await User.findByIdAndUpdate(req.user?._id, {
        $set: {
            coverImage: coverImage.url
        }
    }, {
        new: true
    }).select("-password -refreshToken");

    await deleteOldImage(coverImage.display_name);

    return res.status(200).json(
        new ApiResponse(200, user, "Cover image updated successfully")
    )
});

const getUserChannelProfile = asyncHandler(async(req, res) => {
    const { username } = req.params;

    if(!username?.trim()) {
        throw new ApiErrors(400, "Username is missing");
    }

    const channel = await User.aggregate(
        [
            {
                $match: {
                    username: username?.toLowerCase()
                },
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "channel",
                    as: "subscribers"
                }
            }, 
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "subscriber",
                    as: "subscribedTo"
                }
            },
            {
                $addFields: {
                    subscribersCount: {
                        $size: "$subscribers"
                    },
                    channelsSubscribedToCount: {
                        $size: "$subscribedTo"
                    },
                    isSubscribed: {
                        $cond: {
                            if: {
                                $in: [req.user?._id, "$subscribers.subscriber"]
                            },
                            then: true,
                            else: false
                        }
                    }
                }
            },
            {
                $project: {
                    fullName: 1,
                    username: 1,
                    subscribersCount: 1,
                    channelsSubscribedToCount: 1,
                    isSubscribed: 1,
                    avatar: 1,
                    coverImage: 1,
                    email: 1,
                    created_at: 1
                }
            }
        ]
    );

    if(!channel?.length) {
        throw new ApiErrors(404, "Channel does not exists");
    }

    return res.status(200).json(
        new ApiResponse(200, 
            channel[0],
            "user channel fetched successfully"
        )
    )
});

const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField:"_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                },
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ]);

    return res.status(200).json(
        new ApiResponse(200, user[0].watchHistory, "Watch history fetched successfully!")
    )
})

export { registerUser, loginUser, logoutUser, refreshAccessToken, currentPasswordChange, currentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory };