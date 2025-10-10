import { atom } from 'nanostores';
import type { AppPermissions } from '../api/permissions';

// Store for tracking the current permissions
export const permissionsStore = atom<AppPermissions>([]);

export const isAppOwnerStore = atom<boolean>(false);

export function setPermissions(permissions: AppPermissions) {
  permissionsStore.set(permissions);
}

export function setIsAppOwner(isOwner: boolean) {
  isAppOwnerStore.set(isOwner);
}