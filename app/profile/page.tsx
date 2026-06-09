import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import {
  ProfileSection,
  InfoItem,
  InfoGrid,
  PhotoGallery,
  PrimaryPhoto,
  BadgeList,
  InterestBadgeList,
  QuickStats,
  createProfileStats,
} from '@/app/components/profile';
import MusicPreferencesDisplay from '@/app/components/profile/MusicPreferencesDisplay';
import { getCompleteProfile } from '@/app/serverActions/onboarding';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  formatEnumValue,
  formatList,
  formatAgeRange,
  formatDistance,
  formatOccupation,
  calculateProfileCompletion,
} from '@/lib/profileHelpers';
import { PROFILE_SECTIONS, PROFILE_ACTIONS } from '@/lib/profileConstants';
import { Progress } from '@/components/ui/progress';
import { BarChart2 } from 'lucide-react';

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const profileResult = await getCompleteProfile();

  if (!profileResult.ok) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-destructive">Failed to load profile</p>
      </div>
    );
  }

  const profile = profileResult.data;

  return (
    <div className="min-h-screen bg-background page-enter">
      {/* Header with cover gradient — molten-gold wash on wine */}
      <div
        className="relative h-64"
        style={{
          background:
            'radial-gradient(ellipse at top right, rgba(232,177,92,.22), transparent 55%), radial-gradient(ellipse at bottom left, rgba(200,117,51,.18), transparent 55%), var(--v-card)',
          borderBottom: '1px solid var(--v-border)',
        }}>
        <div
          className="absolute"
          style={{
            top: 0,
            left: '20%',
            right: '20%',
            height: 1,
            background: 'linear-gradient(90deg, transparent, var(--v-gold), transparent)',
          }}
        />

        {/* Action Buttons */}
        <div className="absolute top-6 right-6 flex gap-3 flex-wrap justify-end">
          {Object.values(PROFILE_ACTIONS).map((action) => (
            <Link key={action.label} href={action.href}>
              <Button
                variant="outline"
                className="backdrop-blur-sm bg-background/95 hover:bg-background border-border hover:border-primary transition-colors shadow-md"
              >
                <action.icon className="w-4 h-4 mr-2" />
                {action.label}
              </Button>
            </Link>
          ))}
          <Link href="/analytics">
            <Button
              variant="outline"
              className="backdrop-blur-sm bg-background/95 hover:bg-background border-border hover:border-primary transition-colors shadow-md"
            >
              <BarChart2 className="w-4 h-4 mr-2" />
              Stats
            </Button>
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Card */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-6">
              {/* Profile Image */}
              <PrimaryPhoto
                photoUrl={profile.primaryPhotoUrl}
                name={profile.name}
                age={profile.age}
              />

              {/* Basic Info */}
              <div className="mt-6 space-y-4">
                <div>
                  <h1 className="v-display" style={{ fontSize: 30, fontWeight: 500, lineHeight: 1.1 }}>
                    {profile.name}
                    {profile.age ? (
                      <span className="v-italic v-gold" style={{ marginLeft: 8 }}>
                        , {profile.age}
                      </span>
                    ) : null}
                  </h1>
                  <div className="flex items-center gap-2 mt-2" style={{ color: 'var(--v-fg-muted)' }}>
                    <PROFILE_SECTIONS.LOCATION.icon className="w-4 h-4" />
                    <span className="text-sm">
                      {profile.locationCity}, {profile.locationCountry}
                    </span>
                  </div>
                </div>

                {/* Profile Completion */}
                {(() => {
                  const pct = calculateProfileCompletion(profile);
                  const tone =
                    pct === 100
                      ? 'var(--v-green)'
                      : pct >= 70
                      ? 'var(--v-gold)'
                      : 'var(--v-red)';
                  return (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className="v-mono"
                          style={{ fontSize: 10, color: 'var(--v-fg-faint)' }}>
                          completeness
                        </span>
                        <span
                          className="v-mono"
                          style={{ fontSize: 10, color: tone, fontWeight: 600 }}>
                          {pct}%
                        </span>
                      </div>
                      <div
                        style={{
                          height: 2,
                          borderRadius: 9999,
                          background: 'var(--v-divider)',
                          overflow: 'hidden',
                        }}>
                        <div
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            background: tone,
                            transition: 'width .35s ease-out',
                          }}
                        />
                      </div>
                      {pct < 100 && (
                        <p
                          className="mt-2"
                          style={{
                            fontSize: 12,
                            color: 'var(--v-fg-muted)',
                            fontStyle: 'italic',
                            fontFamily: 'var(--font-fraunces), Georgia, serif',
                          }}>
                          {pct < 50
                            ? 'A half-written portrait. Add more to draw nearer matches.'
                            : 'Almost complete — finish the picture.'}
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Quick Stats */}
                <QuickStats stats={createProfileStats(profile)} />
              </div>
            </Card>
          </div>

          {/* Right Column - Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bio Section */}
            {profile.personality?.bio && (
              <ProfileSection title={PROFILE_SECTIONS.ABOUT_ME.title} icon={PROFILE_SECTIONS.ABOUT_ME.icon}>
                <p className="text-muted-foreground leading-relaxed">{profile.personality.bio}</p>
              </ProfileSection>
            )}

            {/* Photo Gallery */}
            {profile.photos && profile.photos.length > 0 && (
              <ProfileSection title={PROFILE_SECTIONS.PHOTOS.title} icon={PROFILE_SECTIONS.PHOTOS.icon}>
                <PhotoGallery photos={profile.photos} />
              </ProfileSection>
            )}

            {/* Phase 2: Genre Preferences with Rankings */}
            <MusicPreferencesDisplay
              showEditButton={true}
              compact={false}
              limit={20}
              fallbackGenres={profile.musicPreferences?.favoriteGenres}
            />

            {/* Interests */}
            {profile.personality?.interests && profile.personality.interests.length > 0 && (
              <ProfileSection title={PROFILE_SECTIONS.INTERESTS.title} icon={PROFILE_SECTIONS.INTERESTS.icon}>
                <InterestBadgeList interests={profile.personality.interests} />
              </ProfileSection>
            )}

            {/* Lifestyle */}
            {profile.lifestyle && (
              <ProfileSection title={PROFILE_SECTIONS.LIFESTYLE.title} icon={PROFILE_SECTIONS.LIFESTYLE.icon}>
                <InfoGrid columns={2}>
                  {profile.lifestyle.occupation && (
                    <InfoItem
                      label="Occupation"
                      value={formatOccupation(profile.lifestyle.occupation)}
                    />
                  )}
                  {profile.lifestyle.education && (
                    <InfoItem label="Education" value={formatEnumValue(profile.lifestyle.education)} />
                  )}
                  {profile.lifestyle.exerciseFrequency && (
                    <InfoItem label="Exercise" value={formatEnumValue(profile.lifestyle.exerciseFrequency)} />
                  )}
                  {profile.lifestyle.drinkingHabits && (
                    <InfoItem label="Drinking" value={formatEnumValue(profile.lifestyle.drinkingHabits)} />
                  )}
                </InfoGrid>
              </ProfileSection>
            )}

            {/* Dating Preferences */}
            {profile.datingPreferences && (
              <ProfileSection title={PROFILE_SECTIONS.DATING_PREFS.title} icon={PROFILE_SECTIONS.DATING_PREFS.icon}>
                <div className="space-y-4">
                  <InfoItem
                    label="Relationship Goal"
                    value={formatEnumValue(profile.datingPreferences.relationshipGoal)}
                  />
                  {profile.personality?.lookingForText && (
                    <p className="text-muted-foreground">{profile.personality.lookingForText}</p>
                  )}
                  <InfoGrid columns={2}>
                    <InfoItem
                      label="Age Range"
                      value={formatAgeRange(profile.datingPreferences.minAge, profile.datingPreferences.maxAge)}
                    />
                    <InfoItem
                      label="Max Distance"
                      value={formatDistance(profile.datingPreferences.maxDistanceKm)}
                    />
                  </InfoGrid>
                </div>
              </ProfileSection>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
