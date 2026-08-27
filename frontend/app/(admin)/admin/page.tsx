'use client';

import { useEffect, useState } from 'react';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import Link from 'next/link';

interface DashboardStats {
  totalArticles: number;
  liveArticles: number;
  activeAds: number;
  totalInterviews: number;
}

type StatusRecord = { status?: string };

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{label}</p>
          <p className={`text-3xl font-bold ${color}`}>{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color === 'text-blue-600' ? 'bg-blue-100' : color === 'text-green-600' ? 'bg-green-100' : color === 'text-orange-600' ? 'bg-orange-100' : 'bg-purple-100'}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalArticles: 0,
    liveArticles: 0,
    activeAds: 0,
    totalInterviews: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [articlesRes, adsRes, interviewsRes] = await Promise.all([
          fetch('/api/admin/articles', { credentials: 'include' }),
          fetch('/api/admin/ads', { credentials: 'include' }),
          fetch('/api/admin/interviews', { credentials: 'include' }),
        ]);

        const articlesData = await articlesRes.json();
        const adsData = await adsRes.json();
        const interviewsData = await interviewsRes.json();

        const articles: StatusRecord[] = articlesData.articles || [];
        const ads: StatusRecord[] = adsData.ads || [];
        const interviews = interviewsData.interviews || [];

        setStats({
          totalArticles: articles.length,
          liveArticles: articles.filter((article) => article.status === 'live').length,
          activeAds: ads.filter((ad) => ad.status === 'active').length,
          totalInterviews: interviews.length,
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />

      <main className="flex-1 ml-64 overflow-auto">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <div className="text-sm text-gray-600">
              Welcome to Columbus Real Estate News CMS
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              label="Total Articles"
              value={isLoading ? '...' : stats.totalArticles}
              icon={<svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
              color="text-blue-600"
            />
            <StatCard
              label="Live Articles"
              value={isLoading ? '...' : stats.liveArticles}
              icon={<svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              color="text-green-600"
            />
            <StatCard
              label="Active Ads"
              value={isLoading ? '...' : stats.activeAds}
              icon={<svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
              color="text-orange-600"
            />
            <StatCard
              label="Total Interviews"
              value={isLoading ? '...' : stats.totalInterviews}
              icon={<svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4" /></svg>}
              color="text-purple-600"
            />
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                href="/admin/articles?new=true"
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-red-200 transition text-center"
              >
                <div className="text-2xl mb-2">✍️</div>
                <h3 className="font-semibold text-gray-900">New Article</h3>
                <p className="text-sm text-gray-600">Create a new article</p>
              </Link>

              <Link
                href="/admin/ads?new=true"
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-red-200 transition text-center"
              >
                <div className="text-2xl mb-2">📢</div>
                <h3 className="font-semibold text-gray-900">New Ad</h3>
                <p className="text-sm text-gray-600">Create a new advertisement</p>
              </Link>

              <Link
                href="/admin/market"
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-red-200 transition text-center"
              >
                <div className="text-2xl mb-2">📊</div>
                <h3 className="font-semibold text-gray-900">Market Data</h3>
                <p className="text-sm text-gray-600">Update market metrics</p>
              </Link>

              <Link
                href="/admin/interviews?new=true"
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-red-200 transition text-center"
              >
                <div className="text-2xl mb-2">🎤</div>
                <h3 className="font-semibold text-gray-900">New Interview</h3>
                <p className="text-sm text-gray-600">Create an interview</p>
              </Link>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Getting Started</h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Complete Profile</p>
                  <p className="text-sm text-gray-600">Update your site settings and contact information in the Settings section.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Create Content</p>
                  <p className="text-sm text-gray-600">Start by creating articles, interviews, or market data entries.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Manage Advertisements</p>
                  <p className="text-sm text-gray-600">Add and manage display and native advertisements.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
