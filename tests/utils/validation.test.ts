import { describe, it, expect } from 'vitest';
import { validateCreateRating, validateUpdateRating, ValidationError } from '../../src/utils/validation';

describe('Validation Utils', () => {
  describe('validateCreateRating', () => {
    it('should validate valid create rating request', () => {
      const data = {
        movieId: 'tt1234567',
        rating: 8.5,
        review: 'Great movie!',
        tags: ['action', 'thriller'],
        isFavorite: true,
        isWatchlist: false
      };

      const result = validateCreateRating(data);

      expect(result).toEqual(data);
    });

    it('should throw error if movieId is missing', () => {
      const data = {
        rating: 8.5
      };

      expect(() => validateCreateRating(data)).toThrow('movieId is required and must be a string');
    });

    it('should throw error if rating is missing', () => {
      const data = {
        movieId: 'tt1234567'
      };

      expect(() => validateCreateRating(data)).toThrow('rating is required and must be a number');
    });

    it('should throw error if rating is out of range', () => {
      const data = {
        movieId: 'tt1234567',
        rating: 15
      };

      expect(() => validateCreateRating(data)).toThrow('rating must be between 0 and 10');
    });

    it('should throw error if rating is negative', () => {
      const data = {
        movieId: 'tt1234567',
        rating: -1
      };

      expect(() => validateCreateRating(data)).toThrow('rating must be between 0 and 10');
    });

    it('should throw error if review is not a string', () => {
      const data = {
        movieId: 'tt1234567',
        rating: 8.5,
        review: 123
      };

      expect(() => validateCreateRating(data)).toThrow('review must be a string');
    });

    it('should throw error if tags is not an array', () => {
      const data = {
        movieId: 'tt1234567',
        rating: 8.5,
        tags: 'action'
      };

      expect(() => validateCreateRating(data)).toThrow('tags must be an array');
    });

    it('should throw error if watchDate is invalid', () => {
      const data = {
        movieId: 'tt1234567',
        rating: 8.5,
        watchDate: 'invalid-date'
      };

      expect(() => validateCreateRating(data)).toThrow('watchDate must be a valid date');
    });

    it('should accept valid watchDate', () => {
      const data = {
        movieId: 'tt1234567',
        rating: 8.5,
        watchDate: '2024-01-15'
      };

      const result = validateCreateRating(data);

      expect(result.watchDate).toBeInstanceOf(Date);
    });
  });

  describe('validateUpdateRating', () => {
    it('should validate valid update rating request', () => {
      const data = {
        rating: 9.0,
        review: 'Updated review',
        isFavorite: false
      };

      const result = validateUpdateRating(data);

      expect(result).toEqual(data);
    });

    it('should allow partial updates', () => {
      const data = {
        rating: 9.0
      };

      const result = validateUpdateRating(data);

      expect(result).toEqual(data);
    });

    it('should throw error if rating is out of range', () => {
      const data = {
        rating: 11
      };

      expect(() => validateUpdateRating(data)).toThrow('rating must be between 0 and 10');
    });

    it('should throw error if rating is not a number', () => {
      const data = {
        rating: '8.5'
      };

      expect(() => validateUpdateRating(data)).toThrow('rating must be a number');
    });

    it('should throw error if rewatchCount is not a number', () => {
      const data = {
        rewatchCount: '3'
      };

      expect(() => validateUpdateRating(data)).toThrow('rewatchCount must be a number');
    });

    it('should accept valid rewatchCount', () => {
      const data = {
        rewatchCount: 3
      };

      const result = validateUpdateRating(data);

      expect(result.rewatchCount).toBe(3);
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with correct name', () => {
      const error = new ValidationError('Test error');

      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Test error');
      expect(error).toBeInstanceOf(Error);
    });
  });
});
