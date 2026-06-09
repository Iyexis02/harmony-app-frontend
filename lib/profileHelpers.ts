/**
 * Profile Helper Utilities
 * Formatting and display helpers for profile data
 */

/**
 * Formats enum values by replacing underscores with spaces and capitalizing
 * @example formatEnumValue("VERY_IMPORTANT") => "Very Important"
 */
export function formatEnumValue(value: string | undefined | null): string {
  if (!value) return 'Not specified';
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Formats a list of items as a comma-separated string
 */
export function formatList(items: string[] | undefined | null, fallback = 'Not specified'): string {
  if (!items || items.length === 0) return fallback;
  return items.join(', ');
}

/**
 * Formats age range for display
 */
export function formatAgeRange(minAge: number, maxAge: number): string {
  return `${minAge} - ${maxAge} years`;
}

/**
 * Formats distance in kilometers
 */
export function formatDistance(distanceKm: number): string {
  return `${distanceKm} km`;
}

/**
 * Gets user's first name from full name
 */
export function getFirstName(fullName: string | undefined | null): string {
  if (!fullName) return 'there';
  return fullName.split(' ')[0];
}

/**
 * Formats yes/no boolean values
 */
export function formatBoolean(value: boolean | undefined | null): string {
  if (value === undefined || value === null) return 'Not specified';
  return value ? 'Yes' : 'No';
}

/**
 * Truncates text to a specified length with ellipsis
 */
export function truncateText(text: string | undefined | null, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Formats occupation with optional company
 */
export function formatOccupation(occupation?: string | null, company?: string | null): string {
  if (!occupation) return 'Not specified';
  if (company) return `${occupation} at ${company}`;
  return occupation;
}

/**
 * Returns Tailwind background class for a compatibility score using CSS custom properties.
 * Thresholds: 80+ → --compat-high, 60–79 → --compat-medium, 40–59 → --compat-low, <40 → --compat-poor
 */
export function getScoreColorClass(score: number): string {
  if (score >= 80) return 'bg-[var(--compat-high)]';
  if (score >= 60) return 'bg-[var(--compat-medium)]';
  if (score >= 40) return 'bg-[var(--compat-low)]';
  return 'bg-[var(--compat-poor)]';
}

/**
 * Returns Tailwind text color class for a compatibility score using CSS custom properties.
 * Thresholds: 80+ → --compat-high, 60–79 → --compat-medium, 40–59 → --compat-low, <40 → --compat-poor
 */
export function getScoreTextColor(score: number): string {
  if (score >= 80) return 'text-[var(--compat-high)]';
  if (score >= 60) return 'text-[var(--compat-medium)]';
  if (score >= 40) return 'text-[var(--compat-low)]';
  return 'text-[var(--compat-poor)]';
}

/**
 * Returns Tailwind badge class (text + bg + border) for a compatibility level string.
 * Used in MatchScoreBreakdown where the label comes from getScoreLabel().
 */
export function getScoreLevelBadgeClass(level: string): string {
  switch (level) {
    case 'Very High': return 'text-green-600 bg-green-50 border-green-200';
    case 'High':      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'Medium':    return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    default:          return 'text-red-600 bg-red-50 border-red-200';
  }
}

/**
 * Returns a CSS variable reference for SVG stroke (pass to style={{ stroke: ... }}, NOT stroke= attribute).
 * Matches the same tier thresholds as getScoreColorClass.
 */
export function getScoreStrokeColor(score: number): string {
  if (score >= 80) return 'var(--compat-high)';
  if (score >= 60) return 'var(--compat-medium)';
  if (score >= 40) return 'var(--compat-low)';
  return 'var(--compat-poor)';
}

/**
 * Returns a human-readable compatibility label for a score.
 */
export function getScoreLabel(score: number): string {
  if (score >= 80) return 'Very High';
  if (score >= 60) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
}

/**
 * Normalizes backend compatibility level strings to canonical title-case form.
 * Backend sends inconsistent casing ('HIGH', 'MEDIUM', etc.).
 */
export function normalizeCompatibilityLevel(level: string): string {
  const lower = level.toLowerCase();
  if (lower === 'very high') return 'Very High';
  if (lower === 'high') return 'High';
  if (lower === 'medium') return 'Medium';
  if (lower === 'low') return 'Low';
  return level;
}

/**
 * Gets profile completion percentage (0-100)
 */
export function calculateProfileCompletion(profile: any): number {
  let completed = 0;
  let total = 0;

  // Basic info (required)
  total += 4;
  if (profile.name) completed++;
  if (profile.dateOfBirth) completed++;
  if (profile.gender) completed++;
  if (profile.sexualOrientation) completed++;

  // Location (required)
  total += 2;
  if (profile.locationCity) completed++;
  if (profile.locationCountry) completed++;

  // Photos (required, minimum 1)
  total += 1;
  if (profile.photos && profile.photos.length > 0) completed++;

  // Music preferences (optional but important)
  total += 1;
  if (profile.musicPreferences?.favoriteGenres?.length > 0) completed++;

  // Bio (optional but important)
  total += 1;
  if (profile.personality?.bio) completed++;

  // Dating preferences (optional but important)
  total += 1;
  if (profile.datingPreferences?.relationshipGoal) completed++;

  return Math.round((completed / total) * 100);
}
