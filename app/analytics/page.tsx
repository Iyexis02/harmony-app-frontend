'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/lib/motion';
import { ArrowLeft, Heart, TrendingUp, Users, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMatching } from '@/app/hooks/useMatching';
import type { MatchAnalyticsDto } from '@/types/phase3';

/** Animates a number from 0 to `target` over `duration` ms. */
function useCountUp(target: number, duration = 600) {
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    if (target === 0) return;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setValue(Math.round(progress * target));
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return value;
}

const cardVariants = fadeInUp(24, 0.35);
const containerVariants = staggerContainer(0.08);

function StatCard({
  label,
  value,
  subtitle,
  icon,
  iconBg,
}: {
  label: string;
  value: number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg: string;
}) {
  const displayed = useCountUp(value);
  return (
    <motion.div variants={cardVariants}>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <p className="text-3xl font-bold mt-2">{displayed}</p>
              {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            </div>
            <div className={`${iconBg} rounded-full p-3`}>{icon}</div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function PercentStatCard({
  label,
  value,
  subtitle,
  icon,
  iconBg,
}: {
  label: string;
  value: number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg: string;
}) {
  const displayed = useCountUp(Math.round(value * 100));
  return (
    <motion.div variants={cardVariants}>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <p className="text-3xl font-bold mt-2">{displayed}%</p>
              {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            </div>
            <div className={`${iconBg} rounded-full p-3`}>{icon}</div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { fetchAnalytics } = useMatching();
  const [analytics, setAnalytics] = useState<MatchAnalyticsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [barsReady, setBarsReady] = useState(false);

  // Redirect only when definitively logged out — see matches/page.tsx. Avoids a spurious
  // /login bounce during the transient 'loading' phase where `session` is undefined.
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Fetch analytics on mount
  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      const data = await fetchAnalytics();
      setAnalytics(data);
      setLoading(false);
    };

    if (session) {
      loadAnalytics();
    }
  }, [session, fetchAnalytics]);

  // Trigger progress bar animation after data renders (start at 0%, then transition to real value)
  useEffect(() => {
    if (!analytics) return;
    const t = setTimeout(() => setBarsReady(true), 50);
    return () => clearTimeout(t);
  }, [analytics]);

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background page-enter">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-4xl font-bold bg-linear-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
              Your Matching Stats
            </h1>
            <p className="text-muted-foreground text-lg">See how you&apos;re doing and discover insights about your matches</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-6">
            {/* Stat card skeletons */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-16" />
                      </div>
                      <Skeleton className="h-12 w-12 rounded-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {/* Breakdown skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-28" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-8 w-full rounded-full" />
                <Skeleton className="h-8 w-full rounded-full" />
              </CardContent>
            </Card>
          </div>
        ) : analytics ? (
          <div className="space-y-6">
            {/* Main Stats Grid */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
              variants={containerVariants}
              initial="hidden"
              animate="show">
              <StatCard
                label="Total Swipes"
                value={analytics.totalSwipes}
                icon={<TrendingUp className="h-6 w-6 text-primary" />}
                iconBg="bg-primary/10"
              />
              <StatCard
                label="Total Matches"
                value={analytics.totalMatches}
                icon={<Users className="h-6 w-6 text-pink-600" />}
                iconBg="bg-accent/10"
              />
              <PercentStatCard
                label="Like Rate"
                value={analytics.swipeThroughRate}
                subtitle={`${analytics.totalLikes} likes`}
                icon={<Heart className="h-6 w-6 text-green-600" />}
                iconBg="bg-green-100"
              />
              <PercentStatCard
                label="Match Rate"
                value={analytics.matchRate}
                subtitle="of your likes"
                icon={<Award className="h-6 w-6 text-blue-600" />}
                iconBg="bg-blue-100"
              />
            </motion.div>

            {/* Activity Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.35 }}>
              <Card>
                <CardHeader>
                  <CardTitle>Activity Breakdown</CardTitle>
                  <CardDescription>How you&apos;ve been swiping</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-green-600">Likes</span>
                      <span className="text-sm font-medium">{analytics.totalLikes}</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all duration-700"
                        style={{ width: barsReady ? `${analytics.totalSwipes > 0 ? (analytics.totalLikes / analytics.totalSwipes) * 100 : 0}%` : '0%' }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Passes</span>
                      <span className="text-sm font-medium">{analytics.totalPasses}</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-400 rounded-full transition-all duration-700"
                        style={{ width: barsReady ? `${analytics.totalSwipes > 0 ? (analytics.totalPasses / analytics.totalSwipes) * 100 : 0}%` : '0%' }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-muted-foreground mb-4">No analytics data available yet</p>
            <Button onClick={() => router.push('/discover')}>Start Discovering</Button>
          </div>
        )}
      </div>
    </div>
  );
}
