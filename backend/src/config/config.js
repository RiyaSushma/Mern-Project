const config = {
    Port: process.env.PORT,
    MongodbUrl: process.env.MONGODB_URI,
    CorsOrigin: process.env.CORS_ORIGIN,
    AccessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
    AccessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY,
    RefreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
    RefreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY
}

export default config;