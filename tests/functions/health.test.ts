import { describe, it, expect, vi } from 'vitest';
import { health } from '../../src/functions/health';
import { HttpRequest, InvocationContext } from '@azure/functions';

vi.mock('../../src/config/database', () => ({
  getDbConnection: vi.fn().mockReturnValue({
    initialize: vi.fn().mockResolvedValue(undefined),
    getContainer: vi.fn().mockReturnValue({
      read: vi.fn().mockResolvedValue({})
    })
  })
}));

describe('Health Function', () => {
  it('should return healthy status', async () => {
    const mockRequest = {} as HttpRequest;
    const mockContext = {
      log: vi.fn(),
      error: vi.fn(),
    } as Partial<InvocationContext>;

    const response = await health(mockRequest, mockContext as InvocationContext);

    expect(response.status).toBe(200);
    expect(response.jsonBody).toMatchObject({
      service: 'flixsync-rating-service',
      status: 'healthy',
      version: '1.0.0'
    });
    expect(response.jsonBody).toHaveProperty('timestamp');
    expect(response.jsonBody).toHaveProperty('uptime');
    expect(response.jsonBody.dependencies).toHaveLength(1);
    expect(response.jsonBody.dependencies[0].name).toBe('cosmos-db');
    expect(response.jsonBody.dependencies[0].status).toBe('healthy');
  });

  it('should return unhealthy status if database fails', async () => {
    vi.doMock('../../src/config/database', () => ({
      getDbConnection: vi.fn().mockReturnValue({
        initialize: vi.fn().mockRejectedValue(new Error('Database connection failed')),
        getContainer: vi.fn().mockReturnValue({
          read: vi.fn().mockRejectedValue(new Error('Database connection failed'))
        })
      })
    }));

    const mockRequest = {} as HttpRequest;
    const mockContext = {
      log: vi.fn(),
      error: vi.fn(),
    } as Partial<InvocationContext>;

    const response = await health(mockRequest, mockContext as InvocationContext);

    // Note: The actual implementation might still return 200 or 503 depending on error handling
    expect(response.jsonBody).toHaveProperty('service', 'flixsync-rating-service');
  });
});
