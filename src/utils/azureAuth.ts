import { HttpRequest } from '@azure/functions';
import * as jwt from 'jsonwebtoken';
import { config } from '../config';

export interface DecodedToken {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export function extractToken(request: HttpRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

export function verifyToken(token: string): DecodedToken {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as DecodedToken;
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

export function getUserIdFromRequest(request: HttpRequest): string {
  const token = extractToken(request);
  if (!token) {
    throw new Error('No authorization token provided');
  }

  const decoded = verifyToken(token);
  return decoded.userId;
}
