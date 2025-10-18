import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getDbConnection } from '../config/database';

let initialized = false;
const startTime = Date.now();

async function ensureInitialized() {
  if (!initialized) {
    const dbConnection = getDbConnection();
    await dbConnection.initialize();
    initialized = true;
  }
}

export async function health(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const healthCheck = {
    service: 'flixsync-rating-service',
    status: 'healthy' as const,
    timestamp: new Date(),
    version: '1.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    dependencies: [] as any[],
  };

  try {
    // Check database connection
    const dbStartTime = Date.now();
    await ensureInitialized();
    const dbConnection = getDbConnection();
    await dbConnection.getContainer().read();
    const dbResponseTime = Date.now() - dbStartTime;

    healthCheck.dependencies.push({
      name: 'cosmos-db',
      status: 'healthy',
      responseTime: dbResponseTime,
      lastChecked: new Date(),
    });

    return {
      status: 200,
      jsonBody: healthCheck,
    };
  } catch (error: any) {
    context.error('Health check error:', error);

    healthCheck.status = 'unhealthy';
    healthCheck.dependencies.push({
      name: 'cosmos-db',
      status: 'unhealthy',
      lastChecked: new Date(),
      error: error.message,
    });

    return {
      status: 503,
      jsonBody: healthCheck,
    };
  }
}

app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'v1/health',
  handler: health,
});
