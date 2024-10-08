const config = {
    Port: process.env.PORT,
    MongodbUrl: process.env.MONGODB_URI,
    CorsOrigin: process.env.CORS_ORIGIN,
    AccessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
    AccessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY,
    RefreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
    RefreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY,
    CloudName: process.env.CLOUD_NAME,
    CloudApiKey: process.env.CLOUD_API_KEY,
    CloudApiSecret: process.env.CLOUD_API_SECRET,
    CloudinaryUrl: process.env.CLOUDINARY_URL
}

export default config;