'use client';

import { useEffect, useState } from 'react';

import type { Phase1StatsResponseDto } from '@/types/phase1';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function Phase1Dashboard() {
  const [stats, setStats] = useState<Phase1StatsResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/test/phase1/stats`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
        <h3 className="font-semibold mb-2">Error Loading Stats</h3>
        <p className="text-sm">{error}</p>
        <button
          onClick={fetchStats}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold bg-linear-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
          Phase 1: Database Foundation
        </h1>
        <p className="text-gray-600 text-lg">System statistics and health check</p>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard value={stats?.genres?.total || 0} label="Total Genres" gradient="from-blue-500 to-blue-600" />
        <StatCard
          value={stats?.genres?.primary || 0}
          label="Primary Genres"
          subtitle="Shown in UI"
          gradient="from-purple-500 to-purple-600"
        />
        <StatCard
          value={stats?.genres?.topLevel || 0}
          label="Top-Level Genres"
          subtitle="No parent"
          gradient="from-pink-500 to-pink-600"
        />
        <StatCard
          value={stats?.users?.usersWithGenrePreferences || 0}
          label="Users with Preferences"
          gradient="from-green-500 to-green-600"
        />
        <StatCard value={stats?.swipes?.total || 0} label="Total Swipes" gradient="from-yellow-500 to-yellow-600" />
        <StatCard value={stats?.matches?.total || 0} label="Mutual Matches" gradient="from-red-500 to-red-600" />
      </div>

      {/* Status Indicator */}
      <div className="bg-linear-to-br from-green-50 to-emerald-50 border-2 border-green-500 rounded-xl p-6 shadow-sm">
        <h3 className="text-2xl font-bold text-green-700 mb-4 flex items-center gap-2">
          <span className="text-3xl">✅</span>
          Phase 1 Status: Operational
        </h3>
        <ul className="space-y-2">
          <StatusItem text="Genre database seeded" />
          <StatusItem text="Repositories functioning" />
          <StatusItem text="All tables created" />
          <StatusItem text="API endpoints operational" />
        </ul>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          About Phase 1
        </h3>
        <p className="text-blue-800 text-sm leading-relaxed">
          Phase 1 establishes the database foundation for the dating app. This includes the canonical genre system, user
          preferences, swipe history, matches, and match scores. These admin tools help verify that all backend systems
          are functioning correctly.
        </p>
      </div>
    </div>
  );
}

function StatCard({
  value,
  label,
  subtitle,
  gradient,
}: {
  value: number;
  label: string;
  subtitle?: string;
  gradient: string;
}) {
  return (
    <div
      className={`bg-linear-to-br ${gradient} text-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300`}>
      <h2 className="text-5xl font-bold mb-3">{value.toLocaleString()}</h2>
      <p className="text-lg font-medium opacity-95">{label}</p>
      {subtitle && <p className="text-sm opacity-75 mt-1 font-light">{subtitle}</p>}
    </div>
  );
}

function StatusItem({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-3 text-green-800 text-base">
      <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      <span>{text}</span>
    </li>
  );
}
