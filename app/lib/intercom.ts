import * as jose from 'jose';

export interface IntercomUserData {
  user_id: string;
  email?: string;
  name?: string;
}

export interface IntercomJWTPayload {
  app_id: string;
  user_id: string;
  email?: string;
  name?: string;
  iat: number;
  exp: number;
  [key: string]: any; // Add index signature for JWT compatibility
}

export interface IntercomJWTResponse {
  jwt: string;
  app_id: string;
  user_id: string;
  email?: string;
  name?: string;
  expires_in: number;
}

/**
 * Generate a JWT token for Intercom authentication
 * @param userData - User data including user_id, email, and name
 * @param appSecret - Intercom app secret from environment variables
 * @param appId - Intercom app ID from environment variables
 * @param signingKey - Intercom signing key from environment variables
 * @param expirationHours - JWT expiration time in hours (default: 1)
 * @returns Promise<IntercomJWTResponse>
 */
export async function generateIntercomJWT(
  userData: IntercomUserData,
  appSecret: string,
  appId: string,
  signingKey: string,
  expirationHours: number = 1,
): Promise<IntercomJWTResponse> {
  if (!userData.user_id) {
    throw new Error('user_id is required');
  }

  if (!appSecret) {
    throw new Error('Intercom app secret is required');
  }

  if (!appId) {
    throw new Error('Intercom app ID is required');
  }

  if (!signingKey) {
    throw new Error('Intercom signing key is required');
  }

  // Create the JWT payload according to Intercom's specification
  const payload: IntercomJWTPayload = {
    app_id: appId,
    user_id: userData.user_id,
    email: userData.email,
    name: userData.name,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expirationHours * 60 * 60,
  };

  // Remove undefined values
  Object.keys(payload).forEach((key) => {
    if (payload[key as keyof typeof payload] === undefined) {
      delete payload[key as keyof typeof payload];
    }
  });

  // Create the JWT using the signing key
  const secret = new TextEncoder().encode(signingKey);

  const jwt = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${expirationHours}h`)
    .sign(secret);

  return {
    jwt,
    app_id: appId,
    user_id: userData.user_id,
    email: userData.email,
    name: userData.name,
    expires_in: expirationHours * 60 * 60, // Convert to seconds
  };
}

/**
 * Verify a JWT token from Intercom
 * @param token - JWT token to verify
 * @param appSecret - Intercom app secret from environment variables
 * @returns Promise<IntercomJWTPayload>
 */
export async function verifyIntercomJWT(token: string, signingKey: string): Promise<IntercomJWTPayload> {
  try {
    const secret = new TextEncoder().encode(signingKey);
    const { payload } = await jose.jwtVerify(token, secret);

    return payload as unknown as IntercomJWTPayload;
  } catch (error) {
    throw new Error(`Invalid JWT token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get user data from JWT token without verification (for client-side use)
 * @param token - JWT token
 * @returns IntercomJWTPayload
 */
export function decodeIntercomJWT(token: string): IntercomJWTPayload {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    throw new Error(`Failed to decode JWT token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
