'use client';

import { useState } from 'react';
import Phase1Dashboard from './components/Phase1Dashboard';
import GenreBrowser from './components/GenreBrowser';

type Tab = 'dashboard' | 'genres';

export default function Phase1AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-purple-50 to-pink-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-linear-to-r from-purple-600 to-pink-600 rounded-lg p-2">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              Phase 1 Admin Panel
            </h1>
          </div>
          <p className="text-gray-600 ml-14">
            Database foundation testing and monitoring tools
          </p>
        </div>

        {/* Warning Banner */}
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <span className="font-semibold">Development Only:</span> These
                endpoints have NO AUTHENTICATION and should be removed or
                secured before production deployment.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-6 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <TabButton
                active={activeTab === 'dashboard'}
                onClick={() => setActiveTab('dashboard')}
                icon={
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                }
              >
                Dashboard
              </TabButton>
              <TabButton
                active={activeTab === 'genres'}
                onClick={() => setActiveTab('genres')}
                icon={
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                    />
                  </svg>
                }
              >
                Genre Browser
              </TabButton>
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          {activeTab === 'dashboard' ? <Phase1Dashboard /> : <GenreBrowser />}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Phase 1 Admin Panel • Backend API:{' '}
            <code className="bg-gray-100 px-2 py-1 rounded text-xs">
              {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition-all
        ${
          active
            ? 'border-purple-600 text-purple-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }
      `}
    >
      {icon}
      {children}
    </button>
  );
}
