import { Container } from '@azure/cosmos';
import { v4 as uuidv4 } from 'uuid';
import { Rating, CreateRatingRequest, UpdateRatingRequest } from '@flixsync/flixsync-shared-library';
import { getDbConnection } from '../config/database';

class RatingService {
  private getContainer(): Container {
    return getDbConnection().getContainer();
  }

  async createRating(userId: string, data: CreateRatingRequest): Promise<Rating> {
    const container = this.getContainer();
    const now = new Date();

    // Create composite ID: userId-movieId to ensure uniqueness
    const compositeId = `${userId}-${data.movieId}`;

    const rating: Rating = {
      id: compositeId,
      userId,
      movieId: data.movieId,
      rating: data.rating,
      review: data.review,
      tags: data.tags,
      watchDate: data.watchDate,
      rewatchCount: 0,
      isFavorite: data.isFavorite || false,
      isWatchlist: data.isWatchlist || false,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const { resource } = await container.items.create(rating);
      return resource as Rating;
    } catch (error: any) {
      if (error.code === 409) {
        throw new Error('Rating already exists for this movie. Use update instead.');
      }
      throw error;
    }
  }

  async updateRating(ratingId: string, userId: string, data: UpdateRatingRequest): Promise<Rating> {
    const container = this.getContainer();

    // Get the existing rating
    const { resource: existingRating } = await container.item(ratingId, userId).read<Rating>();

    if (!existingRating) {
      throw new Error('Rating not found');
    }

    if (existingRating.userId !== userId) {
      throw new Error('Unauthorized: Cannot update another user\'s rating');
    }

    const updatedRating: Rating = {
      ...existingRating,
      rating: data.rating !== undefined ? data.rating : existingRating.rating,
      review: data.review !== undefined ? data.review : existingRating.review,
      tags: data.tags !== undefined ? data.tags : existingRating.tags,
      watchDate: data.watchDate !== undefined ? data.watchDate : existingRating.watchDate,
      rewatchCount: data.rewatchCount !== undefined ? data.rewatchCount : existingRating.rewatchCount,
      isFavorite: data.isFavorite !== undefined ? data.isFavorite : existingRating.isFavorite,
      isWatchlist: data.isWatchlist !== undefined ? data.isWatchlist : existingRating.isWatchlist,
      updatedAt: new Date(),
    };

    const { resource } = await container.item(ratingId, userId).replace(updatedRating);
    return resource as Rating;
  }

  async getRatingById(ratingId: string, userId: string): Promise<Rating | null> {
    const container = this.getContainer();

    try {
      const { resource } = await container.item(ratingId, userId).read<Rating>();
      return resource || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  }

  async getRatingByMovieId(userId: string, movieId: string): Promise<Rating | null> {
    const container = this.getContainer();
    const compositeId = `${userId}-${movieId}`;

    try {
      const { resource } = await container.item(compositeId, userId).read<Rating>();
      return resource || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  }

  async getUserRatings(
    userId: string,
    page: number = 1,
    limit: number = 20,
    sortBy: string = 'updatedAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<{ ratings: Rating[]; total: number; hasNext: boolean }> {
    const container = this.getContainer();

    // Get total count
    const countQuery = `SELECT VALUE COUNT(1) FROM c WHERE c.userId = @userId`;
    const { resources: countResult } = await container.items
      .query({
        query: countQuery,
        parameters: [{ name: '@userId', value: userId }],
      })
      .fetchAll();

    const total = countResult[0] || 0;

    // Get paginated results
    const offset = (page - 1) * limit;
    const order = sortOrder.toUpperCase();
    const query = `SELECT * FROM c WHERE c.userId = @userId ORDER BY c.${sortBy} ${order} OFFSET @offset LIMIT @limit`;

    const { resources: ratings } = await container.items
      .query({
        query,
        parameters: [
          { name: '@userId', value: userId },
          { name: '@offset', value: offset },
          { name: '@limit', value: limit },
        ],
      })
      .fetchAll();

    const hasNext = offset + limit < total;

    return { ratings, total, hasNext };
  }

  async getFavorites(userId: string): Promise<Rating[]> {
    const container = this.getContainer();

    const query = `SELECT * FROM c WHERE c.userId = @userId AND c.isFavorite = true ORDER BY c.updatedAt DESC`;
    const { resources } = await container.items
      .query({
        query,
        parameters: [{ name: '@userId', value: userId }],
      })
      .fetchAll();

    return resources;
  }

  async getWatchlist(userId: string): Promise<Rating[]> {
    const container = this.getContainer();

    const query = `SELECT * FROM c WHERE c.userId = @userId AND c.isWatchlist = true ORDER BY c.updatedAt DESC`;
    const { resources } = await container.items
      .query({
        query,
        parameters: [{ name: '@userId', value: userId }],
      })
      .fetchAll();

    return resources;
  }

  async deleteRating(ratingId: string, userId: string): Promise<void> {
    const container = this.getContainer();

    // Verify ownership before deleting
    const { resource: existingRating } = await container.item(ratingId, userId).read<Rating>();

    if (!existingRating) {
      throw new Error('Rating not found');
    }

    if (existingRating.userId !== userId) {
      throw new Error('Unauthorized: Cannot delete another user\'s rating');
    }

    await container.item(ratingId, userId).delete();
  }

  async getUserStats(userId: string): Promise<{
    totalRatings: number;
    averageRating: number;
    favoritesCount: number;
    watchlistCount: number;
    highestRatedMovies: Rating[];
    recentRatings: Rating[];
  }> {
    const container = this.getContainer();

    // Get all user ratings
    const query = `SELECT * FROM c WHERE c.userId = @userId`;
    const { resources: allRatings } = await container.items
      .query({
        query,
        parameters: [{ name: '@userId', value: userId }],
      })
      .fetchAll();

    const totalRatings = allRatings.length;
    const averageRating =
      totalRatings > 0
        ? allRatings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
        : 0;

    const favoritesCount = allRatings.filter((r) => r.isFavorite).length;
    const watchlistCount = allRatings.filter((r) => r.isWatchlist).length;

    const highestRatedMovies = [...allRatings]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 10);

    const recentRatings = [...allRatings]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10);

    return {
      totalRatings,
      averageRating: Math.round(averageRating * 10) / 10,
      favoritesCount,
      watchlistCount,
      highestRatedMovies,
      recentRatings,
    };
  }
}

export const ratingService = new RatingService();
