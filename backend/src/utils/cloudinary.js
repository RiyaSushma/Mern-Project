import { v2 as  cloudinary} from 'cloudinary';
import config from '../config/config.js';
import fs from 'fs';
import ApiErrors from './ApiErrors.js';

cloudinary.config({
    cloud_name: config.CloudName,
    api_key: config.CloudApiKey,
    api_secret: config.CloudApiSecret
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) {
            return null;
        }

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        }).catch((error) => {
            console.log(error);
        });
        
        // console.log("File is uploaded successfully!! ", response, " ", response);
        fs.unlinkSync(localFilePath);
        return response;

    } catch(error) {
        fs.unlinkSync(localFilePath); // remove the locally saved temporary file as upload operation failed
        return null; 
    }
};

const deleteOldImage = async (imageName) => {
    try {
        if(!imageName) {
            return null;
        }

        // console.log(imageName);

        const response = await cloudinary.uploader.destroy(imageName, function(error, result) {
            if(result) {
                console.log("success!");
                return result;
            } 
            return null;
        });

    } catch(error) {
        throw new ApiErrors(500, "Error in delete old image from cloudinary");
    }
}

export { uploadOnCloudinary, deleteOldImage };