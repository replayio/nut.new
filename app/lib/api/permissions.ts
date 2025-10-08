import { callNutAPI } from '~/lib/replay/NutAPI';

/**
 * Kinds of ways that apps can be accessed.
 */
export enum AppAccessKind {
  /** Create a copy of an app with a new database. */
  Copy = 'CopyApp',

  /** View the app preview and chat history. */
  View = 'ViewApp',

  /** Send new messages to update the app. */
  SendMessage = 'SendMessage',

  /** Change the app's title. */
  SetTitle = 'RenameApp',

  /** Delete the app. */
  Delete = 'DeleteApp',

  /** Set new permissions for the app. */
  SetPermissions = 'SetPermissions',
}

/**
 * Kinds of accessors that can be granted permission for an access.
 */
export enum AppAccessorKind {
  /** Specific user email. */
  User = 'User',

  /** Anyone with their email in a given domain. */
  Domain = 'Domain',

  /** Everyone with knowledge of the app ID. */
  Everyone = 'Everyone',
}

/**
 * A permission that can be granted or denied to access an app.
 */
export interface AppPermission {
  /** Kind of access. */
  access: AppAccessKind;

  /** Kind of accessor. */
  accessor: AppAccessorKind;

  /** For User accessor: the email. For Domain accessor: the domain. Omitted for Everyone accessor. */
  accessorName?: string;

  /** Whether access is allowed or denied. */
  allowed: boolean;
}

/**
 * The permissions for an app are all the rules defined for who can access it.
 */
export type AppPermissions = AppPermission[];

/**
 * Request payload for getting app permissions.
 */
export interface GetAppPermissionsRequest {
  appId: string;
}

/**
 * Response payload for getting app permissions.
 */
export interface GetAppPermissionsResponse {
  permissions?: AppPermissions;
}

/**
 * Request payload for setting app permissions.
 */
export interface SetAppPermissionsRequest {
  appId: string;
  permissions: AppPermissions;
}

/**
 * Response payload for setting app permissions (empty on success).
 */
export interface SetAppPermissionsResponse {
  error?: string | undefined;
}

/**
 * Get the permissions for an app.
 *
 * @param appId - The ID of the app to get permissions for
 * @returns The app's permissions
 * @throws NutAPIError if the request fails (e.g., unauthorized, app not found)
 */
export async function getAppPermissions(appId: string): Promise<AppPermissions> {
  if (!appId || typeof appId !== 'string') {
    throw new Error('Invalid appId: must be a non-empty string');
  }

  const request: GetAppPermissionsRequest = { appId };
  const response: GetAppPermissionsResponse = await callNutAPI('get-app-permissions', request);

  return response.permissions || [];
}

/**
 * Set the permissions for an app.
 *
 * @param appId - The ID of the app to set permissions for
 * @param permissions - The new permissions to set
 * @throws NutAPIError if the request fails (e.g., unauthorized, invalid permissions)
 */
export async function setAppPermissions(appId: string, permissions: AppPermissions): Promise<void> {
  if (!appId || typeof appId !== 'string') {
    throw new Error('Invalid appId: must be a non-empty string');
  }

  if (!Array.isArray(permissions)) {
    throw new Error('Invalid permissions: must be an array');
  }

  // Validate each permission
  for (const permission of permissions) {
    if (!permission.access || !Object.values(AppAccessKind).includes(permission.access)) {
      throw new Error(`Invalid access kind: ${permission.access}`);
    }

    if (!permission.accessor || !Object.values(AppAccessorKind).includes(permission.accessor)) {
      throw new Error(`Invalid accessor kind: ${permission.accessor}`);
    }

    if (typeof permission.allowed !== 'boolean') {
      throw new Error('Invalid permission: allowed must be a boolean');
    }

    // Validate accessorName based on accessor type
    if (permission.accessor === AppAccessorKind.User && !permission.accessorName) {
      throw new Error('User accessor requires an email in accessorName');
    }

    if (permission.accessor === AppAccessorKind.Domain && !permission.accessorName) {
      throw new Error('Domain accessor requires a domain in accessorName');
    }

    if (permission.accessor === AppAccessorKind.Everyone && permission.accessorName) {
      throw new Error('Everyone accessor should not have an accessorName');
    }

    // Basic email validation for User accessor
    if (permission.accessor === AppAccessorKind.User && permission.accessorName) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(permission.accessorName)) {
        throw new Error(`Invalid email format: ${permission.accessorName}`);
      }
    }

    // Basic domain validation for Domain accessor
    if (permission.accessor === AppAccessorKind.Domain && permission.accessorName) {
      const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
      if (!domainRegex.test(permission.accessorName)) {
        throw new Error(`Invalid domain format: ${permission.accessorName}`);
      }
    }
  }

  const request: SetAppPermissionsRequest = { appId, permissions };
  await callNutAPI('set-app-permissions', request);
}

/**
 * Helper function to validate if a user has access based on permissions.
 *
 * @param permissions - The app's permissions
 * @param accessKind - The kind of access to check
 * @param userEmail - The user's email
 * @param userIsOwner - Whether the user is the app owner
 * @returns Whether the user has access
 */
export function isAppAccessAllowed(
  permissions: AppPermissions | undefined,
  accessKind: AppAccessKind,
  userEmail: string,
  userIsOwner: boolean = false,
): boolean {
  // Owner always has access
  if (userIsOwner) {
    return true;
  }

  // If no permissions are set, default to allowing if user is owner
  if (!permissions || permissions.length === 0) {
    return userIsOwner;
  }

  // Only read permissions that can be granted to everyone.
  const canBeGrantedToEveryone = [AppAccessKind.Copy, AppAccessKind.View].includes(accessKind);

  // Look for a permission for the specific user
  const userPermission = permissions.find(
    (p) => p.access === accessKind && p.accessor === AppAccessorKind.User && p.accessorName === userEmail,
  );

  if (userPermission) {
    return userPermission.allowed;
  }

  // Look for a permission for the user's email domain
  const domain = userEmail.split('@')[1];
  if (domain) {
    const domainPermission = permissions.find(
      (p) => p.access === accessKind && p.accessor === AppAccessorKind.Domain && p.accessorName === domain,
    );

    if (domainPermission) {
      return domainPermission.allowed;
    }
  }

  // Look for a permission applying to everyone
  const everyonePermission = permissions.find(
    (p) => p.access === accessKind && p.accessor === AppAccessorKind.Everyone,
  );

  if (everyonePermission) {
    // Writable permission ${access} cannot be granted to everyone.
    if (!canBeGrantedToEveryone) {
      return false;
    }
    return everyonePermission.allowed;
  }

  // Apply default rules in the absence of specific permissions
  switch (accessKind) {
    case AppAccessKind.Copy:
      return true; // Default: allow copying
    default:
      return userIsOwner; // Default: only owner for other operations
  }
}

