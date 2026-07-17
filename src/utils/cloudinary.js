import {v2 as cloudinary} from 'cloudinary'
import fs from 'fs'

// console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);
// console.log("API Key:", process.env.CLOUDINARY_API_KEY);
// console.log("API Secret:", process.env.CLOUDINARY_API_SECRET ? "Loaded" : "Missing");
 


const uploadOnCloudinary = async(localFilePath)  =>{
    cloudinary.config({
        cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
        api_key:process.env.CLOUDINARY_API_KEY,
        api_secret:process.env.CLOUDINARY_API_SECRET
    });
    try {
        if(!localFilePath) return null;
        const response = await cloudinary.uploader.upload(localFilePath,{resource_type:"auto"})
        // file has uploaded successfully
        //console.log("file is uploaded on cloudinary", response.url)
        fs.unlinkSync(localFilePath);
        return response;

    } catch (error) {
    console.log("Cloudinary Error:", error);

    if (localFilePath) {
        fs.unlinkSync(localFilePath);
    }

    return null;
}
}

export {uploadOnCloudinary}
 



