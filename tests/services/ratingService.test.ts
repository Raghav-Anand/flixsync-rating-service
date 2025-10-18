import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ratingService } from '../../src/services/ratingService';
import * as database from '../../src/config/database';
import { Rating, CreateRatingRequest, UpdateRatingRequest } from '@flixsync/flixsync-shared-library';

vi.mock('../../src/config/database');
vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid-123') }));

describe('RatingService', () => {
  let mockContainer: any;

  beforeEach(() => {
    mockContainer = {
      items: {
        create: vi.fn(),
        query: vi.fn().mockReturnValue({
          fetchAll: vi.fn()
        })
      },
      item: vi.fn().mockReturnValue({
        read: vi.fn(),
        replace: vi.fn(),
        delete: vi.fn()
      })
    };

    vi.spyOn(database, 'getDbConnection').mockReturnValue({
      getContainer: vi.fn().mockReturnValue(mockContainer),
      getDatabase: vi.fn(),
      initialize: vi.fn()
    } as any);

    vi.clearAllMocks();
  });

  describe('createRating', () => {
    const mockCreateRatingRequest: CreateRatingRequest = {
      movieId: 'tt1234567',
      rating: 8.5,
      review: 'Great movie!',
      tags: ['action', 'thriller'],
      isFavorite: true,
      isWatchlist: false
    };

    it('should create a new rating successfully', async () => {
      const userId = 'user-123';
      const mockCreatedRating: Rating = {
        id: `${userId}-${mockCreateRatingRequest.movieId}`,
        userId,
        movieId: mockCreateRatingRequest.movieId,
        rating: mockCreateRatingRequest.rating,
        review: mockCreateRatingRequest.review,
        tags: mockCreateRatingRequest.tags,
        rewatchCount: 0,
        isFavorite: true,
        isWatchlist: false,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      };

      mockContainer.items.create.mockResolvedValue({ resource: mockCreatedRating });

      const result = await ratingService.createRating(userId, mockCreateRatingRequest);

      expect(mockContainer.items.create).toHaveBeenCalled();
      expect(result).toMatchObject({
        userId,
        movieId: mockCreateRatingRequest.movieId,
        rating: mockCreateRatingRequest.rating
      });
    });

    it('should throw error if rating already exists (409 conflict)', async () => {
      const userId = 'user-123';
      const error = new Error('Conflict');
      (error as any).code = 409;
      mockContainer.items.create.mockRejectedValue(error);

      await expect(ratingService.createRating(userId, mockCreateRatingRequest))
        .rejects.toThrow('Rating already exists for this movie. Use update instead.');
    });
  });

  describe('updateRating', () => {
    const mockUpdateRequest: UpdateRatingRequest = {
      rating: 9.0,
      review: 'Updated review',
      isFavorite: false
    };

    it('should update rating successfully', async () => {
      const userId = 'user-123';
      const ratingId = `${userId}-tt1234567`;
      const mockExistingRating: Rating = {
        id: ratingId,
        userId,
        movieId: 'tt1234567',
        rating: 8.5,
        review: 'Original review',
        rewatchCount: 0,
        isFavorite: true,
        isWatchlist: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockUpdatedRating: Rating = {
        ...mockExistingRating,
        rating: 9.0,
        review: 'Updated review',
        isFavorite: false,
        updatedAt: expect.any(Date)
      };

      mockContainer.item().read.mockResolvedValue({ resource: mockExistingRating });
      mockContainer.item().replace.mockResolvedValue({ resource: mockUpdatedRating });

      const result = await ratingService.updateRating(ratingId, userId, mockUpdateRequest);

      expect(mockContainer.item().replace).toHaveBeenCalled();
      expect(result.rating).toBe(9.0);
      expect(result.review).toBe('Updated review');
      expect(result.isFavorite).toBe(false);
    });

    it('should throw error if rating not found', async () => {
      const userId = 'user-123';
      const ratingId = `${userId}-tt1234567`;

      mockContainer.item().read.mockResolvedValue({ resource: null });

      await expect(ratingService.updateRating(ratingId, userId, mockUpdateRequest))
        .rejects.toThrow('Rating not found');
    });

    it('should throw error if unauthorized', async () => {
      const userId = 'user-123';
      const differentUserId = 'user-456';
      const ratingId = `${userId}-tt1234567`;
      const mockExistingRating: Rating = {
        id: ratingId,
        userId: differentUserId,
        movieId: 'tt1234567',
        rating: 8.5,
        rewatchCount: 0,
        isFavorite: true,
        isWatchlist: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockContainer.item().read.mockResolvedValue({ resource: mockExistingRating });

      await expect(ratingService.updateRating(ratingId, userId, mockUpdateRequest))
        .rejects.toThrow('Unauthorized: Cannot update another user\'s rating');
    });
  });

  describe('getRatingById', () => {
    it('should return rating if found', async () => {
      const userId = 'user-123';
      const ratingId = `${userId}-tt1234567`;
      const mockRating: Rating = {
        id: ratingId,
        userId,
        movieId: 'tt1234567',
        rating: 8.5,
        rewatchCount: 0,
        isFavorite: true,
        isWatchlist: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockContainer.item().read.mockResolvedValue({ resource: mockRating });

      const result = await ratingService.getRatingById(ratingId, userId);

      expect(mockContainer.item).toHaveBeenCalledWith(ratingId, userId);
      expect(result).toEqual(mockRating);
    });

    it('should return null if rating not found', async () => {
      const userId = 'user-123';
      const ratingId = `${userId}-tt1234567`;
      const error = new Error('Not found');
      (error as any).code = 404;
      mockContainer.item().read.mockRejectedValue(error);

      const result = await ratingService.getRatingById(ratingId, userId);

      expect(result).toBeNull();
    });
  });

  describe('getRatingByMovieId', () => {
    it('should return rating by movie ID', async () => {
      const userId = 'user-123';
      const movieId = 'tt1234567';
      const compositeId = `${userId}-${movieId}`;
      const mockRating: Rating = {
        id: compositeId,
        userId,
        movieId,
        rating: 8.5,
        rewatchCount: 0,
        isFavorite: true,
        isWatchlist: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockContainer.item().read.mockResolvedValue({ resource: mockRating });

      const result = await ratingService.getRatingByMovieId(userId, movieId);

      expect(mockContainer.item).toHaveBeenCalledWith(compositeId, userId);
      expect(result).toEqual(mockRating);
    });

    it('should return null if rating not found for movie', async () => {
      const userId = 'user-123';
      const movieId = 'tt1234567';
      const error = new Error('Not found');
      (error as any).code = 404;
      mockContainer.item().read.mockRejectedValue(error);

      const result = await ratingService.getRatingByMovieId(userId, movieId);

      expect(result).toBeNull();
    });
  });

  describe('getUserRatings', () => {
    it('should return paginated user ratings', async () => {
      const userId = 'user-123';
      const mockRatings: Rating[] = [
        {
          id: `${userId}-tt1234567`,
          userId,
          movieId: 'tt1234567',
          rating: 8.5,
          rewatchCount: 0,
          isFavorite: true,
          isWatchlist: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockContainer.items.query().fetchAll
        .mockResolvedValueOnce({ resources: [42] }) // count
        .mockResolvedValueOnce({ resources: mockRatings }); // ratings

      const result = await ratingService.getUserRatings(userId, 1, 20);

      expect(result.ratings).toEqual(mockRatings);
      expect(result.total).toBe(42);
      expect(result.hasNext).toBe(true);
    });
  });

  describe('getFavorites', () => {
    it('should return user favorites', async () => {
      const userId = 'user-123';
      const mockFavorites: Rating[] = [
        {
          id: `${userId}-tt1234567`,
          userId,
          movieId: 'tt1234567',
          rating: 9.0,
          rewatchCount: 0,
          isFavorite: true,
          isWatchlist: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockContainer.items.query().fetchAll.mockResolvedValue({ resources: mockFavorites });

      const result = await ratingService.getFavorites(userId);

      expect(result).toEqual(mockFavorites);
    });
  });

  describe('getWatchlist', () => {
    it('should return user watchlist', async () => {
      const userId = 'user-123';
      const mockWatchlist: Rating[] = [
        {
          id: `${userId}-tt1234567`,
          userId,
          movieId: 'tt1234567',
          rating: 0,
          rewatchCount: 0,
          isFavorite: false,
          isWatchlist: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockContainer.items.query().fetchAll.mockResolvedValue({ resources: mockWatchlist });

      const result = await ratingService.getWatchlist(userId);

      expect(result).toEqual(mockWatchlist);
    });
  });

  describe('deleteRating', () => {
    it('should delete rating successfully', async () => {
      const userId = 'user-123';
      const ratingId = `${userId}-tt1234567`;
      const mockRating: Rating = {
        id: ratingId,
        userId,
        movieId: 'tt1234567',
        rating: 8.5,
        rewatchCount: 0,
        isFavorite: true,
        isWatchlist: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockContainer.item().read.mockResolvedValue({ resource: mockRating });
      mockContainer.item().delete.mockResolvedValue({});

      await ratingService.deleteRating(ratingId, userId);

      expect(mockContainer.item().delete).toHaveBeenCalled();
    });

    it('should throw error if rating not found', async () => {
      const userId = 'user-123';
      const ratingId = `${userId}-tt1234567`;

      mockContainer.item().read.mockResolvedValue({ resource: null });

      await expect(ratingService.deleteRating(ratingId, userId))
        .rejects.toThrow('Rating not found');
    });

    it('should throw error if unauthorized', async () => {
      const userId = 'user-123';
      const differentUserId = 'user-456';
      const ratingId = `${userId}-tt1234567`;
      const mockRating: Rating = {
        id: ratingId,
        userId: differentUserId,
        movieId: 'tt1234567',
        rating: 8.5,
        rewatchCount: 0,
        isFavorite: true,
        isWatchlist: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockContainer.item().read.mockResolvedValue({ resource: mockRating });

      await expect(ratingService.deleteRating(ratingId, userId))
        .rejects.toThrow('Unauthorized: Cannot delete another user\'s rating');
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      const userId = 'user-123';
      const mockRatings: Rating[] = [
        {
          id: `${userId}-tt1234567`,
          userId,
          movieId: 'tt1234567',
          rating: 9.0,
          rewatchCount: 0,
          isFavorite: true,
          isWatchlist: false,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: `${userId}-tt7654321`,
          userId,
          movieId: 'tt7654321',
          rating: 7.0,
          rewatchCount: 0,
          isFavorite: false,
          isWatchlist: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockContainer.items.query().fetchAll.mockResolvedValue({ resources: mockRatings });

      const result = await ratingService.getUserStats(userId);

      expect(result.totalRatings).toBe(2);
      expect(result.averageRating).toBe(8.0);
      expect(result.favoritesCount).toBe(1);
      expect(result.watchlistCount).toBe(1);
      expect(result.highestRatedMovies).toHaveLength(2);
      expect(result.recentRatings).toHaveLength(2);
    });
  });
});
