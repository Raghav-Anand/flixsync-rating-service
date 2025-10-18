import * as dotenv from 'dotenv';

dotenv.config();

export const config = {
  cosmos: {
    endpoint: process.env.COSMOS_ENDPOINT || '',
    key: process.env.COSMOS_KEY,
    databaseName: process.env.COSMOS_DATABASE_NAME || 'flixsync',
    containerName: process.env.COSMOS_CONTAINER_NAME || 'ratings',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  service: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '7072', 10),
  },
};
