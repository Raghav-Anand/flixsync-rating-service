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

export async function getWatchlist(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    await ensureInitialized();

    const userId = getUserIdFromRequest(request);
    const watchlist = await ratingService.getWatchlist(userId);

    return {
      status: 200,
      jsonBody: {
        success: true,
        data: watchlist,
      },
    };
  } catch (error: any) {
    context.error('Get watchlist error:', error);

    return {
      status: error.message.includes('token') ? 401 : 500,
      jsonBody: {
        success: false,
        error: error.message || 'Internal server error',
      },
    };
  }
}

app.http('getWatchlist', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'v1/ratings/watchlist',
  handler: getWatchlist,
});
