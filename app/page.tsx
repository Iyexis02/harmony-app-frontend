import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from './api/auth/[...nextauth]/route';
import { getOnboardingProgress } from './serverActions/onboarding';
import LandingPage from '@/app/components/LandingPage';

const HomePage = async () => {
  const session = await getServerSession(authOptions);

  // If user is logged in, check onboarding status and redirect accordingly
  if (session) {
    const progressResult = await getOnboardingProgress();

    if (progressResult.ok) {
      const { currentStage } = progressResult.data;

      // If onboarding is finished, redirect to main app
      if (currentStage === 'FINISHED') {
        redirect('/discover');
      }

      // If onboarding is not finished, redirect to onboarding
      redirect('/onboarding');
    }
  }

  // Show landing page for non-authenticated users
  return <LandingPage />;
};

export default HomePage;
