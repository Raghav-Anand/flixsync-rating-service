import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ratingService } from '../services/ratingService';
import { getDbConnection } from '../config/database';
import { getUserIdFromRequest } from '../utils/azureAuth';
import { validateCreateRating, ValidationError } from '../utils/validation';

let initialized = false;

async function ensureInitialized() {
  if (!initialized) {
    const dbConnection = getDbConnection();
    await dbConnection.initialize();
    initialized = true;
  }
}

export async function createRating(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    await ensureInitialized();

    const userId = getUserIdFromRequest(request);
    const body = await request.json();
    const validatedData = validateCreateRating(body);

    const rating = await ratingService.createRating(userId, validatedData);

    return {
      status: 201,
      jsonBody: {
        success: true,
        data: rating,
      },
    };
  } catch (error: any) {
    context.error('Create rating error:', error);

    if (error instanceof ValidationError) {
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: error.message,
        },
      };
    }

    if (error.message === 'Rating already exists for this movie. Use update instead.') {
      return {
        status: 409,
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

app.http('createRating', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'v1/ratings',
  handler: createRating,
});
