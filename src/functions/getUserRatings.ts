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

export async function getUserRatings(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    await ensureInitialized();

    const userId = getUserIdFromRequest(request);

    // Get query parameters
    const page = parseInt(request.query.get('page') || '1', 10);
    const limit = parseInt(request.query.get('limit') || '20', 10);
    const sortBy = request.query.get('sortBy') || 'updatedAt';
    const sortOrder = (request.query.get('sortOrder') || 'desc') as 'asc' | 'desc';

    const result = await ratingService.getUserRatings(userId, page, limit, sortBy, sortOrder);

    return {
      status: 200,
      jsonBody: {
        success: true,
        data: result.ratings,
        metadata: {
          page,
          limit,
          total: result.total,
          hasNext: result.hasNext,
          hasPrevious: page > 1,
        },
      },
    };
  } catch (error: any) {
    context.error('Get user ratings error:', error);

    return {
      status: error.message.includes('token') ? 401 : 500,
      jsonBody: {
        success: false,
        error: error.message || 'Internal server error',
      },
    };
  }
}

app.http('getUserRatings', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'v1/ratings',
  handler: getUserRatings,
});
