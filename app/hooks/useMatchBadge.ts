'use client';

/**
 * Thin wrapper around NotificationsContext for backward compatibility.
 * New code should import useNotifications() directly.
 */
import { useNotifications } from './useNotifications';

export function useMatchBadge(): boolean {
  return useNotifications().hasNewMatch;
}
