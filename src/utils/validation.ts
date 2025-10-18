import { CreateRatingRequest, UpdateRatingRequest } from '@flixsync/flixsync-shared-library';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateCreateRating(data: any): CreateRatingRequest {
  if (!data.movieId || typeof data.movieId !== 'string') {
    throw new ValidationError('movieId is required and must be a string');
  }

  if (data.rating === undefined || typeof data.rating !== 'number') {
    throw new ValidationError('rating is required and must be a number');
  }

  if (data.rating < 0 || data.rating > 10) {
    throw new ValidationError('rating must be between 0 and 10');
  }

  if (data.review !== undefined && typeof data.review !== 'string') {
    throw new ValidationError('review must be a string');
  }

  if (data.tags !== undefined && !Array.isArray(data.tags)) {
    throw new ValidationError('tags must be an array');
  }

  if (data.watchDate !== undefined) {
    const date = new Date(data.watchDate);
    if (isNaN(date.getTime())) {
      throw new ValidationError('watchDate must be a valid date');
    }
  }

  if (data.isFavorite !== undefined && typeof data.isFavorite !== 'boolean') {
    throw new ValidationError('isFavorite must be a boolean');
  }

  if (data.isWatchlist !== undefined && typeof data.isWatchlist !== 'boolean') {
    throw new ValidationError('isWatchlist must be a boolean');
  }

  return {
    movieId: data.movieId,
    rating: data.rating,
    review: data.review,
    tags: data.tags,
    watchDate: data.watchDate ? new Date(data.watchDate) : undefined,
    isFavorite: data.isFavorite,
    isWatchlist: data.isWatchlist,
  };
}

export function validateUpdateRating(data: any): UpdateRatingRequest {
  if (data.rating !== undefined) {
    if (typeof data.rating !== 'number') {
      throw new ValidationError('rating must be a number');
    }
    if (data.rating < 0 || data.rating > 10) {
      throw new ValidationError('rating must be between 0 and 10');
    }
  }

  if (data.review !== undefined && typeof data.review !== 'string') {
    throw new ValidationError('review must be a string');
  }

  if (data.tags !== undefined && !Array.isArray(data.tags)) {
    throw new ValidationError('tags must be an array');
  }

  if (data.watchDate !== undefined) {
    const date = new Date(data.watchDate);
    if (isNaN(date.getTime())) {
      throw new ValidationError('watchDate must be a valid date');
    }
  }

  if (data.rewatchCount !== undefined && typeof data.rewatchCount !== 'number') {
    throw new ValidationError('rewatchCount must be a number');
  }

  if (data.isFavorite !== undefined && typeof data.isFavorite !== 'boolean') {
    throw new ValidationError('isFavorite must be a boolean');
  }

  if (data.isWatchlist !== undefined && typeof data.isWatchlist !== 'boolean') {
    throw new ValidationError('isWatchlist must be a boolean');
  }

  return {
    rating: data.rating,
    review: data.review,
    tags: data.tags,
    watchDate: data.watchDate ? new Date(data.watchDate) : undefined,
    rewatchCount: data.rewatchCount,
    isFavorite: data.isFavorite,
    isWatchlist: data.isWatchlist,
  };
}
