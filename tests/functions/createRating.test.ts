import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRating } from '../../src/functions/createRating';
import { ratingService } from '../../src/services/ratingService';
import { HttpRequest, InvocationContext } from '@azure/functions';
import * as azureAuth from '../../src/utils/azureAuth';
import { ValidationError } from '../../src/utils/validation';
import * as validation from '../../src/utils/validation';

vi.mock('../../src/services/ratingService');
vi.mock('../../src/config/database', () => ({
  getDbConnection: vi.fn().mockReturnValue({
    initialize: vi.fn().mockResolvedValue(undefined)
  })
}));
vi.mock('../../src/utils/azureAuth');
vi.mock('../../src/utils/validation', async () => {
  const actual = await vi.importActual<typeof import('../../src/utils/validation')>('../../src/utils/validation');
  return {
    ...actual,
    validateCreateRating: vi.fn(),
  };
});

describe('Create Rating Function', () => {
  let mockRequest: Partial<HttpRequest>;
  let mockContext: Partial<InvocationContext>;

  beforeEach(() => {
    mockContext = {
      log: vi.fn(),
      error: vi.fn(),
    };

    vi.clearAllMocks();
  });

  it('should create rating successfully', async () => {
    const requestBody = {
      movieId: 'tt1234567',
      rating: 8.5,
      review: 'Great movie!',
      isFavorite: true
    };

    mockRequest = {
      json: vi.fn().mockResolvedValue(requestBody),
      headers: {
        get: vi.fn().mockReturnValue('Bearer valid-token')
      } as any
    };

    const mockRating = {
      id: 'user-123-tt1234567',
      userId: 'user-123',
      movieId: 'tt1234567',
      rating: 8.5,
      review: 'Great movie!',
      isFavorite: true,
      isWatchlist: false,
      rewatchCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    vi.mocked(azureAuth.getUserIdFromRequest).mockReturnValue('user-123');
    vi.mocked(validation.validateCreateRating).mockReturnValue(requestBody as any);
    vi.mocked(ratingService.createRating).mockResolvedValue(mockRating as any);

    const response = await createRating(mockRequest as HttpRequest, mockContext as InvocationContext);

    expect(response.status).toBe(201);
    expect(response.jsonBody).toEqual({
      success: true,
      data: mockRating
    });
  });

  it('should return 400 for validation error', async () => {
    const requestBody = {
      movieId: 'tt1234567',
      rating: 15 // invalid rating
    };

    mockRequest = {
      json: vi.fn().mockResolvedValue(requestBody),
      headers: {
        get: vi.fn().mockReturnValue('Bearer valid-token')
      } as any
    };

    vi.mocked(azureAuth.getUserIdFromRequest).mockReturnValue('user-123');
    vi.mocked(validation.validateCreateRating).mockImplementation(() => {
      throw new ValidationError('rating must be between 0 and 10');
    });

    const response = await createRating(mockRequest as HttpRequest, mockContext as InvocationContext);

    expect(response.status).toBe(400);
    expect(response.jsonBody).toEqual({
      success: false,
      error: 'rating must be between 0 and 10'
    });
  });

  it('should return 409 if rating already exists', async () => {
    const requestBody = {
      movieId: 'tt1234567',
      rating: 8.5
    };

    mockRequest = {
      json: vi.fn().mockResolvedValue(requestBody),
      headers: {
        get: vi.fn().mockReturnValue('Bearer valid-token')
      } as any
    };

    vi.mocked(azureAuth.getUserIdFromRequest).mockReturnValue('user-123');
    vi.mocked(validation.validateCreateRating).mockReturnValue(requestBody as any);
    vi.mocked(ratingService.createRating).mockRejectedValue(
      new Error('Rating already exists for this movie. Use update instead.')
    );

    const response = await createRating(mockRequest as HttpRequest, mockContext as InvocationContext);

    expect(response.status).toBe(409);
    expect(response.jsonBody).toEqual({
      success: false,
      error: 'Rating already exists for this movie. Use update instead.'
    });
  });

  it('should return 401 for authentication error', async () => {
    mockRequest = {
      json: vi.fn().mockResolvedValue({}),
      headers: {
        get: vi.fn().mockReturnValue(null)
      } as any
    };

    vi.mocked(azureAuth.getUserIdFromRequest).mockImplementation(() => {
      throw new Error('No authorization token provided');
    });

    const response = await createRating(mockRequest as HttpRequest, mockContext as InvocationContext);

    expect(response.status).toBe(401);
    expect(response.jsonBody).toEqual({
      success: false,
      error: 'No authorization token provided'
    });
  });
});
