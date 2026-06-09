import OnboardingContainer from './components/OnboardingContainer';
import SignOutButton from './SignOutButton';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCompleteProfile, getOnboardingProgress } from '@/app/serverActions/onboarding';
import { RegistrationStage } from '@/app/enums/user/userEnum';
import type { CompleteProfileResponseDto } from '@/types/onboarding';

// Backend returns nextStep as lowercase snake_case (e.g. "lifestyle", "location")
// Map to RegistrationStage enum values
const NEXT_STEP_MAP: Record<string, RegistrationStage> = {
  basic_profile: RegistrationStage.BASIC_PROFILE,
  location: RegistrationStage.LOCATION_INFO,
  photos: RegistrationStage.PHOTOS,
  music_preferences: RegistrationStage.MUSIC_PREFERENCES,
  lifestyle: RegistrationStage.LIFESTYLE,
  personality: RegistrationStage.PERSONALITY,
  dating_preferences: RegistrationStage.DATING_PREFERENCES,
  privacy_settings: RegistrationStage.PRIVACY_SETTINGS,
};

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const [progressResult, profileResult] = await Promise.all([
    getOnboardingProgress(),
    getCompleteProfile(),
  ]);

  if (!progressResult.ok) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-2xl font-semibold">We couldn’t load your onboarding</h1>
          <p className="text-muted-foreground">
            Your session may have expired or the authentication service is unreachable.
            Please sign in again to continue.
          </p>
          <SignOutButton />
        </div>
      </div>
    );
  }

  const { currentStage, nextStep } = progressResult.data;

  // If onboarding is finished, redirect to profile
  if (currentStage === RegistrationStage.FINISHED) {
    redirect('/profile');
  }

  // Determine which step to show based on backend progress
  // Priority: nextStep > currentStage (if not completed) > BASIC_PROFILE (default)
  let stepToShow: RegistrationStage = RegistrationStage.BASIC_PROFILE;

  if (nextStep && NEXT_STEP_MAP[nextStep]) {
    stepToShow = NEXT_STEP_MAP[nextStep];
  } else if (currentStage === RegistrationStage.STARTED) {
    stepToShow = RegistrationStage.BASIC_PROFILE;
  } else {
    // If we're on a step but nextStep is null, show the current step
    // currentStage is guaranteed to not be FINISHED at this point
    stepToShow = currentStage as RegistrationStage;
  }

  const completeProfile: CompleteProfileResponseDto | null = profileResult.ok
    ? profileResult.data
    : null;

  return (
    <OnboardingContainer
      initialStage={stepToShow}
      progressData={progressResult.data}
      completeProfile={completeProfile}
    />
  );
}
