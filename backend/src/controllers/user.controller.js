import ApiErrors from "../utils/ApiErrors.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { findEmptyEntry, emailValidation, passwordValidation } from "../utils/Helper.controller.js";
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import fs from 'fs';

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

    // console.log("request is: ", req);
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

export { registerUser };