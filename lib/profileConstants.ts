/**
 * Profile Constants
 * Centralized configuration for profile display
 */

import {
  User,
  MapPin,
  Music,
  Heart,
  Briefcase,
  Calendar,
  Shield,
  Camera,
  Mail,
  Lock,
  Trash2,
  LogOut,
  Edit,
  Settings as SettingsIcon,
  type LucideIcon,
} from 'lucide-react';

/**
 * Profile section configuration
 */
export interface ProfileSection {
  id: string;
  title: string;
  icon: LucideIcon;
  description?: string;
}

/**
 * Main profile sections
 */
export const PROFILE_SECTIONS: Record<string, ProfileSection> = {
  BASIC_INFO: {
    id: 'basic-info',
    title: 'Basic Information',
    icon: User,
    description: 'Your name, age, and identity',
  },
  LOCATION: {
    id: 'location',
    title: 'Location',
    icon: MapPin,
    description: 'Where you are based',
  },
  ABOUT_ME: {
    id: 'about-me',
    title: 'About Me',
    icon: User,
    description: 'Your bio and personality',
  },
  PHOTOS: {
    id: 'photos',
    title: 'Photo Gallery',
    icon: Camera,
    description: 'Your profile photos',
  },
  MUSIC: {
    id: 'music',
    title: 'Music Taste',
    icon: Music,
    description: 'Your music preferences and habits',
  },
  INTERESTS: {
    id: 'interests',
    title: 'Interests',
    icon: Heart,
    description: 'What you love to do',
  },
  LIFESTYLE: {
    id: 'lifestyle',
    title: 'Lifestyle',
    icon: Briefcase,
    description: 'Career, habits, and daily life',
  },
  DATING_PREFS: {
    id: 'dating-preferences',
    title: "What I'm Looking For",
    icon: Calendar,
    description: 'Your dating preferences',
  },
} as const;

/**
 * Settings sections
 */
export const SETTINGS_SECTIONS: Record<string, ProfileSection> = {
  ACCOUNT_INFO: {
    id: 'account-info',
    title: 'Account Information',
    icon: Mail,
    description: 'Your email and authentication',
  },
  SECURITY: {
    id: 'security',
    title: 'Security',
    icon: Lock,
    description: 'Password and security settings',
  },
  PRIVACY: {
    id: 'privacy',
    title: 'Privacy',
    icon: Shield,
    description: 'Control your visibility',
  },
  DANGER_ZONE: {
    id: 'danger-zone',
    title: 'Danger Zone',
    icon: Trash2,
    description: 'Account deletion',
  },
} as const;

/**
 * Profile action buttons
 */
export const PROFILE_ACTIONS = {
  EDIT: {
    label: 'Edit Profile',
    icon: Edit,
    href: '/edit-profile',
    variant: 'secondary' as const,
  },
  SETTINGS: {
    label: 'Settings',
    icon: SettingsIcon,
    href: '/profile/settings',
    variant: 'secondary' as const,
  },
} as const;

/**
 * Settings action buttons
 */
export const SETTINGS_ACTIONS = {
  CHANGE_PASSWORD: {
    label: 'Change Password',
    icon: Lock,
    description: 'Update your password',
  },
  SIGN_OUT: {
    label: 'Sign Out',
    icon: LogOut,
    description: 'Sign out of your account',
  },
  DELETE_ACCOUNT: {
    label: 'Delete My Account',
    icon: Trash2,
    description: 'Permanently delete your account',
    variant: 'destructive' as const,
  },
} as const;

/**
 * Quick stats configuration
 */
export interface QuickStat {
  label: string;
  colorClass: string;
}

export const QUICK_STATS: Record<string, QuickStat> = {
  PHOTOS: {
    label: 'Photos',
    colorClass: 'text-primary',
  },
  GENRES: {
    label: 'Genres',
    colorClass: 'text-secondary',
  },
  INTERESTS: {
    label: 'Interests',
    colorClass: 'text-accent',
  },
} as const;

/**
 * Photo grid configuration
 */
export const PHOTO_GRID_CONFIG = {
  MOBILE_COLS: 2,
  TABLET_COLS: 3,
  DESKTOP_COLS: 3,
  GAP: 3,
  ASPECT_RATIO: '3/4',
} as const;

/**
 * Profile layout configuration
 */
export const PROFILE_LAYOUT = {
  MAX_WIDTH: '6xl',
  COVER_HEIGHT: 64, // h-64 = 16rem = 256px
  PROFILE_CARD_OFFSET: -32, // -mt-32
  STICKY_TOP: 6, // top-6
} as const;

/**
 * Validation messages
 */
export const VALIDATION_MESSAGES = {
  EMAIL_SENT: 'Verification email sent!',
  EMAIL_SEND_ERROR: 'Failed to send verification email',
  DELETE_CONFIRM: 'Are you sure you want to delete your account? This action cannot be undone.',
  SIGN_OUT_CONFIRM: 'Are you sure you want to sign out?',
} as const;

/**
 * Display text for auth providers
 */
export const AUTH_PROVIDER_LABELS = {
  EMAIL: 'Email/Password',
  SPOTIFY: 'Spotify',
} as const;

/**
 * Badge variants by type
 */
export const BADGE_VARIANTS = {
  GENRE: 'secondary',
  INTEREST: 'default',
  PRIMARY: 'default',
  AGE: 'default',
} as const;
