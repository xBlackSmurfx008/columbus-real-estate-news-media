'use client';

import { useEffect, useState } from 'react';
import { AdminSidebar } from '@/components/admin/admin-sidebar';

interface MarketSnapshot {
  id?: string;
  label: string;
  value: string;
  change: string;
  direction: 'up' | 'down' | 'neutral';
}

interface HeroStat {
  id?: string;
  value: string;
  label: string;
}

interface Neighborhood {
  id?: string;
  name: string;
  median: string;
  yoy: string;
  rent: string;
  dom: string;
  inventory: string;
}

export default function MarketDataPage() {
  const [snapshot, setSnapshot] = useState<MarketSnapshot[]>([]);
  const [heroStats, setHeroStats] = useState<HeroStat[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchMarketData();
  }, []);

  const fetchMarketData = async () => {
    try {
      const res = await fetch('/api/admin/market', { credentials: 'include' });
      const data = await res.json();

      if (data.snapshot) setSnapshot(data.snapshot);
      if (data.heroStats) setHeroStats(data.heroStats);
      if (data.neighborhoods) setNeighborhoods(data.neighborhoods);
    } catch (error) {
      showToast('Failed to load market data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/market', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapshot,
          heroStats,
          neighborhoods,
        }),
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to save market data');
      showToast('Market data saved successfully', 'success');
    } catch (error) {
      showToast('Failed to save market data', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const addSnapshotItem = () => {
    setSnapshot([...snapshot, { label: '', value: '', change: '', direction: 'neutral' }]);
  };

  const removeSnapshotItem = (index: number) => {
    setSnapshot(snapshot.filter((_, i) => i !== index));
  };

  const updateSnapshotItem = (index: number, field: string, value: string) => {
    const updated = [...snapshot];
    updated[index] = { ...updated[index], [field]: value };
    setSnapshot(updated);
  };

  const addHeroStat = () => {
    setHeroStats([...heroStats, { value: '', label: '' }]);
  };

  const removeHeroStat = (index: number) => {
    setHeroStats(heroStats.filter((_, i) => i !== index));
  };

  const updateHeroStat = (index: number, field: string, value: string) => {
    const updated = [...heroStats];
    updated[index] = { ...updated[index], [field]: value };
    setHeroStats(updated);
  };

  const addNeighborhood = () => {
    setNeighborhoods([...neighborhoods, { name: '', median: '', yoy: '', rent: '', dom: '', inventory: '' }]);
  };

  const removeNeighborhood = (index: number) => {
    setNeighborhoods(neighborhoods.filter((_, i) => i !== index));
  };

  const updateNeighborhood = (index: number, field: string, value: string) => {
    const updated = [...neighborhoods];
    updated[index] = { ...updated[index], [field]: value };
    setNeighborhoods(updated);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <AdminSidebar />
        <main className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-center text-gray-600">Loading market data...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />

      <main className="flex-1 ml-64 overflow-auto">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-30">
          <h1 className="text-2xl font-bold text-gray-900">Market Data</h1>
        </div>

        {/* Content */}
        <div className="p-8">
          {toast && (
            <div className={`mb-4 p-4 rounded-lg ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
              {toast.message}
            </div>
          )}

          {/* Market Snapshot Section */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Market Snapshot</h2>
              <button
                onClick={addSnapshotItem}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition text-sm"
              >
                + Add Metric
              </button>
            </div>

            <div className="space-y-4">
              {snapshot.map((item, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-4 border-b border-gray-200 last:border-0">
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => updateSnapshotItem(idx, 'label', e.target.value)}
                    placeholder="Label (e.g., Median Price)"
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                  <input
                    type="text"
                    value={item.value}
                    onChange={(e) => updateSnapshotItem(idx, 'value', e.target.value)}
                    placeholder="Value (e.g., $350,000)"
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                  <input
                    type="text"
                    value={item.change}
                    onChange={(e) => updateSnapshotItem(idx, 'change', e.target.value)}
                    placeholder="Change (e.g., +5.2%)"
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                  <div className="flex gap-2">
                    <select
                      value={item.direction}
                      onChange={(e) => updateSnapshotItem(idx, 'direction', e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    >
                      <option value="up">Up</option>
                      <option value="down">Down</option>
                      <option value="neutral">Neutral</option>
                    </select>
                    <button
                      onClick={() => removeSnapshotItem(idx)}
                      className="text-red-600 hover:text-red-900 font-medium px-3 py-2"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero Stats Section */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Hero Statistics</h2>
              <button
                onClick={addHeroStat}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition text-sm"
              >
                + Add Stat
              </button>
            </div>

            <div className="space-y-4">
              {heroStats.map((stat, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-b border-gray-200 last:border-0">
                  <input
                    type="text"
                    value={stat.value}
                    onChange={(e) => updateHeroStat(idx, 'value', e.target.value)}
                    placeholder="Value (e.g., 45)"
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                  <input
                    type="text"
                    value={stat.label}
                    onChange={(e) => updateHeroStat(idx, 'label', e.target.value)}
                    placeholder="Label (e.g., Days on Market)"
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                  <button
                    onClick={() => removeHeroStat(idx)}
                    className="text-red-600 hover:text-red-900 font-medium px-3 py-2"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Neighborhoods Section */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Neighborhoods</h2>
              <button
                onClick={addNeighborhood}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition text-sm"
              >
                + Add Neighborhood
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">Neighborhood</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">Median Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">YoY Change</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">Avg Rent</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">Days on Market</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">Inventory</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {neighborhoods.map((neighborhood, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={neighborhood.name}
                          onChange={(e) => updateNeighborhood(idx, 'name', e.target.value)}
                          placeholder="Name"
                          className="w-full px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={neighborhood.median}
                          onChange={(e) => updateNeighborhood(idx, 'median', e.target.value)}
                          placeholder="$XXX,XXX"
                          className="w-full px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={neighborhood.yoy}
                          onChange={(e) => updateNeighborhood(idx, 'yoy', e.target.value)}
                          placeholder="+X.X%"
                          className="w-full px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={neighborhood.rent}
                          onChange={(e) => updateNeighborhood(idx, 'rent', e.target.value)}
                          placeholder="$X,XXX"
                          className="w-full px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={neighborhood.dom}
                          onChange={(e) => updateNeighborhood(idx, 'dom', e.target.value)}
                          placeholder="XX days"
                          className="w-full px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={neighborhood.inventory}
                          onChange={(e) => updateNeighborhood(idx, 'inventory', e.target.value)}
                          placeholder="Low/Moderate/High"
                          className="w-full px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => removeNeighborhood(idx)}
                          className="text-red-600 hover:text-red-900 font-medium text-sm"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition"
            >
              {isSaving ? 'Saving...' : 'Save All Changes'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
