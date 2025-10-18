# FlixSync Rating Service

The rating service for the FlixSync movie recommendation platform. This service handles user movie ratings, reviews, favorites, and watchlists.

## Features

- Create, read, update, and delete movie ratings
- Store reviews, tags, and watch dates
- Manage favorites and watchlists
- User rating statistics and analytics
- JWT-based authentication
- Azure Cosmos DB integration
- Serverless Azure Functions deployment

## API Endpoints

### Authentication
All endpoints (except health) require JWT authentication via Bearer token in the Authorization header.

### Ratings Management

#### Create Rating
```
POST /v1/ratings
Authorization: Bearer <token>

Body:
{
  "movieId": "tt1234567",
  "rating": 8.5,
  "review": "Great movie!",
  "tags": ["action", "thriller"],
  "watchDate": "2024-01-15",
  "isFavorite": true,
  "isWatchlist": false
}
```

#### Update Rating
```
PUT /v1/ratings/{ratingId}
Authorization: Bearer <token>

Body:
{
  "rating": 9.0,
  "review": "Updated review",
  "isFavorite": true
}
```

#### Get Rating by ID
```
GET /v1/ratings/{ratingId}
Authorization: Bearer <token>
```

#### Get Rating by Movie ID
```
GET /v1/ratings/movie/{movieId}
Authorization: Bearer <token>
```

#### Get User Ratings (Paginated)
```
GET /v1/ratings?page=1&limit=20&sortBy=updatedAt&sortOrder=desc
Authorization: Bearer <token>
```

#### Delete Rating
```
DELETE /v1/ratings/{ratingId}
Authorization: Bearer <token>
```

### Lists

#### Get Favorites
```
GET /v1/ratings/favorites
Authorization: Bearer <token>
```

#### Get Watchlist
```
GET /v1/ratings/watchlist
Authorization: Bearer <token>
```

### Statistics

#### Get User Statistics
```
GET /v1/ratings/stats
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "totalRatings": 42,
    "averageRating": 7.5,
    "favoritesCount": 10,
    "watchlistCount": 5,
    "highestRatedMovies": [...],
    "recentRatings": [...]
  }
}
```

### Health Check

#### Service Health
```
GET /v1/health

Response:
{
  "service": "flixsync-rating-service",
  "status": "healthy",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "version": "1.0.0",
  "uptime": 3600,
  "dependencies": [
    {
      "name": "cosmos-db",
      "status": "healthy",
      "responseTime": 50,
      "lastChecked": "2024-01-15T12:00:00.000Z"
    }
  ]
}
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```
COSMOS_ENDPOINT=https://your-cosmos-account.documents.azure.com:443/
COSMOS_KEY=your-cosmos-key-for-local-development
COSMOS_DATABASE_NAME=flixsync
COSMOS_CONTAINER_NAME=ratings

JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

NODE_ENV=development
PORT=7072
```

## Data Model

### Rating Schema
```typescript
{
  id: string;              // Composite: userId-movieId
  userId: string;          // User who created the rating
  movieId: string;         // Movie identifier (from movie-service)
  rating: number;          // 0-10 rating
  review?: string;         // Optional review text
  tags?: string[];         // Optional tags
  watchDate?: Date;        // Date the movie was watched
  rewatchCount?: number;   // Number of times rewatched
  isFavorite: boolean;     // Favorite flag
  isWatchlist: boolean;    // Watchlist flag
  createdAt: Date;
  updatedAt: Date;
}
```

## Development

### Install Dependencies
```bash
npm install
```

### Build
```bash
npm run build
```

### Run Locally
```bash
npm start
```

### Run Tests
```bash
npm test
```

### Lint
```bash
npm run lint
```

## Deployment

This service is deployed as Azure Functions. Ensure the following are configured in Azure:

1. Azure Cosmos DB with `ratings` container
2. Managed Identity enabled for the Function App
3. Environment variables configured in Function App settings
4. Proper CORS settings if needed

## Architecture Notes

- Uses composite ID (`userId-movieId`) to ensure uniqueness per user-movie combination
- Partitioned by `userId` for efficient queries
- No database provisioning in code - assumes infrastructure exists
- Stateless design with connection pooling
- JWT authentication using shared secret with user-service

## Dependencies

- `@azure/functions` - Azure Functions SDK
- `@azure/cosmos` - Cosmos DB client
- `@azure/identity` - Managed Identity authentication
- `@flixsync/flixsync-shared-library` - Shared types and utilities
- `jsonwebtoken` - JWT authentication
- `uuid` - ID generation
