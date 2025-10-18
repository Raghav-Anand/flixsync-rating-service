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

export async function deleteRating(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    await ensureInitialized();

    const userId = getUserIdFromRequest(request);
    const ratingId = request.params.ratingId;

    if (!ratingId) {
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: 'Rating ID is required',
        },
      };
    }

    await ratingService.deleteRating(ratingId, userId);

    return {
      status: 200,
      jsonBody: {
        success: true,
        message: 'Rating deleted successfully',
      },
    };
  } catch (error: any) {
    context.error('Delete rating error:', error);

    if (error.message === 'Rating not found') {
      return {
        status: 404,
        jsonBody: {
          success: false,
          error: error.message,
        },
      };
    }

    if (error.message.includes('Unauthorized')) {
      return {
        status: 403,
        jsonBody: {
          success: false,
          error: error.message,
        },
      };
    }

    return {
      status: error.message.includes('token') ? 401 : 500,
      jsonBody: {
        success: false,
        error: error.message || 'Internal server error',
      },
    };
  }
}

app.http('deleteRating', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'v1/ratings/{ratingId}',
  handler: deleteRating,
});
