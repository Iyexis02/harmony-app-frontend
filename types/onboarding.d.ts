import type {
  ConcertFrequency,
  DrinkingHabits,
  EducationLevel,
  ExerciseFrequency,
  Gender,
  KidsPreference,
  MBTI,
  MusicImportance,
  PoliticalViews,
  RegistrationStage,
  RelationshipGoal,
  RelationshipStatus,
  Religion,
  SexualOrientation,
  SmokingHabits,
} from '@/app/enums/user/userEnum';

// Step 1: Basic Profile
export type BasicProfileRequestDto = {
  name: string;
  dateOfBirth: string; // ISO 8601: "1995-06-15"
  gender: Gender;
  sexualOrientation: SexualOrientation;
};

// Step 2: Location
export type LocationDto = {
  latitude?: number;
  longitude?: number;
  locationCity: string;
  locationCountry: string;
};

// Step 3: Photos
export type PhotoUploadRequestDto = {
  imageUrl: string;
  displayOrder: number;
  isPrimary: boolean;
  caption?: string;
};

export type PhotosRequestDto = {
  photos: PhotoUploadRequestDto[];
};

// Step 4: Music Preferences
export type MusicPreferencesRequestDto = {
  favoriteGenres: string[];
  concertFrequency: ConcertFrequency;
  musicImportance: MusicImportance;
  favoriteDecades?: string[];
  openToNewGenres: boolean;
  listeningTimes?: string[];
  hoursPerDay?: number;
};

// Step 5: Lifestyle
export type LifestyleRequestDto = {
  education?: EducationLevel;
  occupation?: string;
  relationshipStatus: RelationshipStatus;
  wantsKids?: KidsPreference;
  smokingHabits?: SmokingHabits;
  drinkingHabits?: DrinkingHabits;
  exerciseFrequency?: ExerciseFrequency;
  religion?: Religion;
  politicalViews?: PoliticalViews;
};

// Step 6: Personality
export type PersonalityRequestDto = {
  bio: string;
  interests?: string[];
  mbti?: MBTI;
  lookingForText?: string;
  favoriteQuote?: string;
  conversationStarters?: string;
};

// Step 7: Dating Preferences
export type DatingPreferencesRequestDto = {
  minAge: number;
  maxAge: number;
  maxDistanceKm: number;
  interestedInGenders: Gender[];
  relationshipGoal: RelationshipGoal;
  dealBreakers?: string[];
  showMe?: string;
  musicMatchImportance?: number;
};

// Step 8: Privacy Settings
export type PrivacySettingsRequestDto = {
  isProfilePublic: boolean;
  showAge: boolean;
  showDistance: boolean;
  showLastActive: boolean;
  discoverable: boolean;
  showLikedByYou?: boolean;
  showSpotifyProfile: boolean;
  showMusicStats: boolean;
  incognitoMode?: boolean;
  readReceipts: boolean;
};

// Response types
export type OnboardingProgressDto = {
  currentStage: RegistrationStage;
  completionPercentage: number;
  stepsCompleted: Record<string, boolean>;
  nextStep: string | null;
};

export type MusicPreferencesResponseDto = MusicPreferencesRequestDto;
export type LifestyleResponseDto = LifestyleRequestDto;
export type PersonalityResponseDto = PersonalityRequestDto;
export type DatingPreferencesResponseDto = DatingPreferencesRequestDto;
export type PrivacySettingsResponseDto = PrivacySettingsRequestDto;
export type PhotoResponseDto = PhotoUploadRequestDto & { id: string };

export type CompleteProfileResponseDto = {
  id: string;
  email: string;
  name: string;
  dateOfBirth: string;
  age: number;
  gender: Gender;
  sexualOrientation: SexualOrientation;
  registrationStage: RegistrationStage;
  locationCity: string;
  locationCountry: string;
  latitude?: number;
  longitude?: number;
  photos: PhotoResponseDto[];
  primaryPhotoUrl?: string;
  musicPreferences?: MusicPreferencesResponseDto;
  lifestyle?: LifestyleResponseDto;
  personality?: PersonalityResponseDto;
  datingPreferences?: DatingPreferencesResponseDto;
  privacySettings?: PrivacySettingsResponseDto;
  progress: OnboardingProgressDto;
};

// Client-side state types
export type OnboardingFormData = {
  basicProfile?: BasicProfileRequestDto;
  location?: LocationDto;
  photos?: PhotosRequestDto;
  musicPreferences?: MusicPreferencesRequestDto;
  lifestyle?: LifestyleRequestDto;
  personality?: PersonalityRequestDto;
  datingPreferences?: DatingPreferencesRequestDto;
  privacySettings?: PrivacySettingsRequestDto;
};

export type StepStatus = 'pending' | 'current' | 'completed';

export type OnboardingStep = {
  stage: RegistrationStage;
  title: string;
  description: string;
  status: StepStatus;
};
