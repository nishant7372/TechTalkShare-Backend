let endpoints = {};

if (process.env.NODE_ENV === "development") {
  endpoints = {
    mongo_db_url: process.env.MONGODB_DEV_URL,
    jwt_secret: process.env.JWT_SECRET,
    port: process.env.PORT,
    cors_origin: JSON.parse(process.env.CORS_ORIGINS),
  };
} else {
  endpoints = {
    mongo_db_url: process.env.MONGODB_PROD_URL,
    jwt_secret: process.env.JWT_SECRET,
    port: process.env.PORT,
    cors_origin: JSON.parse(process.env.CORS_ORIGINS),
  };
}

module.exports = endpoints;
