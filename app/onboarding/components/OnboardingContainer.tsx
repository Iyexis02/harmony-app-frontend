'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { RegistrationStage } from '@/app/enums/user/userEnum';
import { Button } from '@/components/ui/button';
import type {
  CompleteProfileResponseDto,
  OnboardingFormData,
  OnboardingProgressDto,
} from '@/types/onboarding';
import ProgressRail from './ProgressRail';
import ProgressIndicator from './ProgressIndicator';
import StepTransition from './StepTransition';
import BasicProfileStep from './steps/BasicProfileStep';
import LocationStep from './steps/LocationStep';
import PhotosStep from './steps/PhotosStep';
import MusicPreferencesStep from './steps/MusicPreferencesStep';
import LifestyleStep from './steps/LifestyleStep';
import PersonalityStep from './steps/PersonalityStep';
import DatingPreferencesStep from './steps/DatingPreferencesStep';
import PrivacySettingsStep from './steps/PrivacySettingsStep';

const STEPS = [
  RegistrationStage.BASIC_PROFILE,
  RegistrationStage.LOCATION_INFO,
  RegistrationStage.PHOTOS,
  RegistrationStage.MUSIC_PREFERENCES,
  RegistrationStage.LIFESTYLE,
  RegistrationStage.PERSONALITY,
  RegistrationStage.DATING_PREFERENCES,
  RegistrationStage.PRIVACY_SETTINGS,
];

type Props = {
  initialStage: RegistrationStage;
  progressData: OnboardingProgressDto;
  completeProfile: CompleteProfileResponseDto | null;
};

// The backend returns `null` for unset optional fields, but the step schemas use
// `z.nativeEnum(...).optional()`, which only accepts `undefined`. Hydrating a resumed
// onboarding with raw nulls makes those steps un-submittable (validation rejects null on
// fields the user never touched). Strip nulls → undefined at the hydration boundary so the
// `.optional()` contract holds. Shallow is sufficient — the affected fields are scalar enums.
function stripNulls<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null)
  ) as T;
}

function mapProfileToFormData(
  profile: CompleteProfileResponseDto | null
): OnboardingFormData {
  if (!profile) return {};

  const formData: OnboardingFormData = {};

  if (profile.name && profile.dateOfBirth && profile.gender && profile.sexualOrientation) {
    formData.basicProfile = {
      name: profile.name,
      dateOfBirth: profile.dateOfBirth,
      gender: profile.gender,
      sexualOrientation: profile.sexualOrientation,
    };
  }

  if (profile.locationCity && profile.locationCountry) {
    formData.location = {
      locationCity: profile.locationCity,
      locationCountry: profile.locationCountry,
      ...(profile.latitude !== undefined ? { latitude: profile.latitude } : {}),
      ...(profile.longitude !== undefined ? { longitude: profile.longitude } : {}),
    };
  }

  if (profile.photos && profile.photos.length > 0) {
    formData.photos = {
      photos: profile.photos.map((p) => ({
        imageUrl: p.imageUrl,
        displayOrder: p.displayOrder,
        isPrimary: p.isPrimary,
        ...(p.caption !== undefined ? { caption: p.caption } : {}),
      })),
    };
  }

  if (profile.musicPreferences) formData.musicPreferences = stripNulls(profile.musicPreferences);
  if (profile.lifestyle) formData.lifestyle = stripNulls(profile.lifestyle);
  if (profile.personality) formData.personality = stripNulls(profile.personality);
  if (profile.datingPreferences) formData.datingPreferences = stripNulls(profile.datingPreferences);
  if (profile.privacySettings) formData.privacySettings = stripNulls(profile.privacySettings);

  return formData;
}

export default function OnboardingContainer({
  initialStage,
  progressData,
  completeProfile,
}: Props) {
  const router = useRouter();
  const { update } = useSession();
  const [currentStep, setCurrentStep] = useState(
    STEPS.indexOf(initialStage) >= 0 ? STEPS.indexOf(initialStage) : 0
  );
  const [formData, setFormData] = useState<OnboardingFormData>(() =>
    mapProfileToFormData(completeProfile)
  );
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [showCelebration, setShowCelebration] = useState(false);

  const goNext = () => {
    if (currentStep < STEPS.length - 1) {
      setDirection('forward');
      setCurrentStep(currentStep + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setDirection('backward');
      setCurrentStep(currentStep - 1);
    }
  };

  const jumpTo = (index: number) => {
    if (index < currentStep) {
      setDirection('backward');
      setCurrentStep(index);
    }
  };

  const renderStep = () => {
    const stage = STEPS[currentStep];

    switch (stage) {
      case RegistrationStage.BASIC_PROFILE:
        return (
          <BasicProfileStep
            data={formData.basicProfile}
            onNext={(data) => {
              setFormData({ ...formData, basicProfile: data });
              goNext();
            }}
          />
        );
      case RegistrationStage.LOCATION_INFO:
        return (
          <LocationStep
            data={formData.location}
            onNext={(data) => {
              setFormData({ ...formData, location: data });
              goNext();
            }}
            onBack={goBack}
          />
        );
      case RegistrationStage.PHOTOS:
        return (
          <PhotosStep
            data={formData.photos}
            onNext={(data) => {
              setFormData({ ...formData, photos: data });
              goNext();
            }}
            onBack={goBack}
          />
        );
      case RegistrationStage.MUSIC_PREFERENCES:
        return (
          <MusicPreferencesStep
            data={formData.musicPreferences}
            onNext={(data) => {
              setFormData({ ...formData, musicPreferences: data });
              goNext();
            }}
            onBack={goBack}
          />
        );
      case RegistrationStage.LIFESTYLE:
        return (
          <LifestyleStep
            data={formData.lifestyle}
            onNext={(data) => {
              setFormData({ ...formData, lifestyle: data });
              goNext();
            }}
            onBack={goBack}
          />
        );
      case RegistrationStage.PERSONALITY:
        return (
          <PersonalityStep
            data={formData.personality}
            onNext={(data) => {
              setFormData({ ...formData, personality: data });
              goNext();
            }}
            onBack={goBack}
          />
        );
      case RegistrationStage.DATING_PREFERENCES:
        return (
          <DatingPreferencesStep
            data={formData.datingPreferences}
            onNext={(data) => {
              setFormData({ ...formData, datingPreferences: data });
              goNext();
            }}
            onBack={goBack}
          />
        );
      case RegistrationStage.PRIVACY_SETTINGS:
        return (
          <PrivacySettingsStep
            data={formData.privacySettings}
            onComplete={async (data) => {
              setFormData({ ...formData, privacySettings: data });
              try {
                await update({ registrationStage: 'FINISHED' });
                setShowCelebration(true);
              } catch {
                toast.error("Couldn't finalize your profile — please retry");
              }
            }}
            onBack={goBack}
          />
        );
    }
  };

  if (showCelebration) {
    return (
      <div
        className="min-h-screen flex items-center justify-center relative overflow-hidden px-6 py-12"
        style={{ background: 'var(--v-bg-top)' }}>
        <div className="v-page-texture" />
        <div className="v-grain" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', duration: 0.6 }}
          className="text-center relative z-10 w-full"
          style={{
            maxWidth: 680,
            padding: 'clamp(40px, 6vw, 64px) clamp(24px, 4vw, 48px)',
            borderRadius: 22,
            background:
              'radial-gradient(ellipse at top, rgba(232,177,92,.14), transparent 65%), var(--v-card)',
            border: '1px solid var(--v-border-strong)',
            boxShadow: 'var(--v-shadow-card)',
            position: 'relative',
          }}>
          {/* Top gold hairline */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '70%',
              height: 1,
              background:
                'linear-gradient(90deg, transparent, var(--v-gold), transparent)',
            }}
          />

          {/* Vinyl-record ornament */}
          <div
            className="mx-auto"
            style={{
              width: 96,
              height: 96,
              marginBottom: 24,
              borderRadius: '50%',
              background:
                'radial-gradient(circle, #1B0F1A 0%, #1B0F1A 22%, #0B050A 24%, #2C1A24 40%, #0B050A 60%, #2C1A24 80%, #0B050A 90%)',
              boxShadow: 'var(--v-shadow-gold-glow), inset 0 0 0 2px rgba(232,177,92,.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: 'var(--v-gold-grad-135)',
                boxShadow: '0 0 20px rgba(232,177,92,.6)',
              }}
            />
          </div>

          <span
            className="v-mono"
            style={{ fontSize: 11, color: 'var(--v-gold)', letterSpacing: '.22em' }}>
            — finale · side a —
          </span>
          <h1
            className="v-display"
            style={{
              fontSize: 'clamp(36px, 5vw, 52px)',
              fontWeight: 500,
              margin: '14px 0 16px',
              color: 'var(--v-fg)',
              lineHeight: 1.04,
            }}>
            The stage is <span className="v-italic v-gold">yours.</span>
          </h1>
          <p
            style={{
              fontSize: 17,
              color: 'var(--v-fg-muted)',
              margin: '0 auto 32px',
              maxWidth: 460,
              lineHeight: 1.55,
            }}>
            Your profile is ready. Your first matches are being scored against
            126 genres as we speak.
          </p>

          <div
            style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}>
            <Button
              size="lg"
              onClick={() => router.push('/discover')}
              className="px-8 rounded-full v-cta-gold">
              Begin discovering
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => router.push('/profile')}
              className="px-8 rounded-full">
              Review your profile
            </Button>
          </div>

          <p
            className="v-mono"
            style={{
              fontSize: 10,
              color: 'var(--v-fg-faint)',
              marginTop: 28,
              letterSpacing: '.18em',
            }}>
            ★ first match expected within 24 hours ★
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative"
      style={{ background: 'var(--v-bg-top)' }}>
      <div className="v-page-texture" />
      <div className="v-grain" />

      <div className="relative z-10 flex items-start min-h-screen">
        <ProgressRail
          currentStep={currentStep}
          totalSteps={STEPS.length}
          completionPercentage={progressData.completionPercentage}
          onJump={jumpTo}
        />

        <div className="flex-1 min-w-0">
          {/* Mobile-only top progress bar (rail is hidden < lg) */}
          <div className="lg:hidden">
            <ProgressIndicator
              currentStep={currentStep}
              totalSteps={STEPS.length}
              completionPercentage={progressData.completionPercentage}
            />
          </div>

          <div className="flex justify-center py-8 lg:py-12 px-4 lg:px-12">
            <StepTransition direction={direction}>{renderStep()}</StepTransition>
          </div>
        </div>
      </div>
    </div>
  );
}
