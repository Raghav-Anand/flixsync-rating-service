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

export async function getUserStats(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    await ensureInitialized();

    const userId = getUserIdFromRequest(request);
    const stats = await ratingService.getUserStats(userId);

    return {
      status: 200,
      jsonBody: {
        success: true,
        data: stats,
      },
    };
  } catch (error: any) {
    context.error('Get user stats error:', error);

    return {
      status: error.message.includes('token') ? 401 : 500,
      jsonBody: {
        success: false,
        error: error.message || 'Internal server error',
      },
    };
  }
}

app.http('getUserStats', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'v1/ratings/stats',
  handler: getUserStats,
});
