import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateIntercomJWT, verifyIntercomJWT, decodeIntercomJWT } from '../app/lib/intercom';

// Mock environment variables
const mockAppSecret = 'test-secret-key-32-chars-long';
const mockAppId = 'test-app-id';
const mockSigningKey = 'test-signing-key-32-chars-long';

describe('Intercom JWT', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateIntercomJWT', () => {
    it('should generate a valid JWT with required fields', async () => {
      const userData = {
        user_id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User'
      };

      const result = await generateIntercomJWT(userData, mockAppSecret, mockAppId, mockSigningKey);

      expect(result.jwt).toBeDefined();
      expect(result.app_id).toBe(mockAppId);
      expect(result.user_id).toBe(userData.user_id);
      expect(result.email).toBe(userData.email);
      expect(result.name).toBe(userData.name);
      expect(result.expires_in).toBe(3600); // 1 hour in seconds
    });

    it('should generate a JWT with only required user_id', async () => {
      const userData = {
        user_id: 'test-user-123'
      };

      const result = await generateIntercomJWT(userData, mockAppSecret, mockAppId, mockSigningKey);

      expect(result.jwt).toBeDefined();
      expect(result.app_id).toBe(mockAppId);
      expect(result.user_id).toBe(userData.user_id);
      expect(result.email).toBeUndefined();
      expect(result.name).toBeUndefined();
    });

    it('should throw error when user_id is missing', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User'
      };

      await expect(
        generateIntercomJWT(userData as any, mockAppSecret, mockAppId)
      ).rejects.toThrow('user_id is required');
    });

    it('should throw error when app secret is missing', async () => {
      const userData = {
        user_id: 'test-user-123'
      };

      await expect(
        generateIntercomJWT(userData, '', mockAppId)
      ).rejects.toThrow('Intercom app secret is required');
    });

    it('should throw error when app ID is missing', async () => {
      const userData = {
        user_id: 'test-user-123'
      };

      await expect(
        generateIntercomJWT(userData, mockAppSecret, '')
      ).rejects.toThrow('Intercom app ID is required');
    });

    it('should generate JWT with custom expiration time', async () => {
      const userData = {
        user_id: 'test-user-123'
      };

      const result = await generateIntercomJWT(userData, mockAppSecret, mockAppId, mockSigningKey, 2);

      expect(result.expires_in).toBe(7200); // 2 hours in seconds
    });
  });

  describe('verifyIntercomJWT', () => {
    it('should verify a valid JWT', async () => {
      const userData = {
        user_id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User'
      };

      const jwt = await generateIntercomJWT(userData, mockAppSecret, mockAppId, mockSigningKey);
      const verified = await verifyIntercomJWT(jwt.jwt, mockSigningKey);

      expect(verified.app_id).toBe(mockAppId);
      expect(verified.user_id).toBe(userData.user_id);
      expect(verified.email).toBe(userData.email);
      expect(verified.name).toBe(userData.name);
    });

    it('should throw error for invalid JWT', async () => {
      const invalidJWT = 'invalid.jwt.token';

      await expect(
        verifyIntercomJWT(invalidJWT, mockAppSecret)
      ).rejects.toThrow('Invalid JWT token');
    });

    it('should throw error for JWT with wrong secret', async () => {
      const userData = {
        user_id: 'test-user-123'
      };

      const jwt = await generateIntercomJWT(userData, mockAppSecret, mockAppId, mockSigningKey);
      const wrongSecret = 'wrong-secret-key-32-chars-long';

      await expect(
        verifyIntercomJWT(jwt.jwt, wrongSecret)
      ).rejects.toThrow('Invalid JWT token');
    });
  });

  describe('decodeIntercomJWT', () => {
    it('should decode a valid JWT without verification', async () => {
      const userData = {
        user_id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User'
      };

      const jwt = await generateIntercomJWT(userData, mockAppSecret, mockAppId, mockSigningKey);
      const decoded = decodeIntercomJWT(jwt.jwt);

      expect(decoded.app_id).toBe(mockAppId);
      expect(decoded.user_id).toBe(userData.user_id);
      expect(decoded.email).toBe(userData.email);
      expect(decoded.name).toBe(userData.name);
    });

    it('should throw error for invalid JWT format', async () => {
      const invalidJWT = 'invalid.jwt.token';

      expect(() => decodeIntercomJWT(invalidJWT)).toThrow('Failed to decode JWT token');
    });
  });
}); 