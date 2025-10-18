import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ratingService } from '../services/ratingService';
import { getDbConnection } from '../config/database';
import { getUserIdFromRequest } from '../utils/azureAuth';

let initialized = false;

async function ensureInitialized() {
  if (!initialized) {
    const dbConnection = getDbConnection();
    await dbConnection.initialize();
    initialized = true;
  }
}

export async function getRatingByMovie(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    await ensureInitialized();

    const userId = getUserIdFromRequest(request);
    const movieId = request.params.movieId;

    if (!movieId) {
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: 'Movie ID is required',
        },
      };
    }

    const rating = await ratingService.getRatingByMovieId(userId, movieId);

    if (!rating) {
      return {
        status: 404,
        jsonBody: {
          success: false,
          error: 'Rating not found for this movie',
        },
      };
    }

    return {
      status: 200,
      jsonBody: {
        success: true,
        data: rating,
      },
    };
  } catch (error: any) {
    context.error('Get rating by movie error:', error);

    return {
      status: error.message.includes('token') ? 401 : 500,
      jsonBody: {
        success: false,
        error: error.message || 'Internal server error',
      },
    };
  }
}

app.http('getRatingByMovie', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'v1/ratings/movie/{movieId}',
  handler: getRatingByMovie,
});
