'use client';

import { useEffect, useState } from 'react';
import { AdminSidebar } from '@/components/admin/admin-sidebar';

interface TickerItem {
  id?: string;
  text: string;
  active: boolean;
}

export default function TickerPage() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchTickerItems();
  }, []);

  const fetchTickerItems = async () => {
    try {
      const res = await fetch('/api/admin/ticker', { credentials: 'include' });
      const data = await res.json();
      setItems(data.items || []);
    } catch (error) {
      showToast('Failed to load ticker items', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/ticker', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to save ticker items');
      showToast('Ticker items saved successfully', 'success');
    } catch (error) {
      showToast('Failed to save ticker items', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const addItem = () => {
    setItems([...items, { text: '', active: true }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <AdminSidebar />
        <main className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-center text-gray-600">Loading ticker items...</div>
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
          <h1 className="text-2xl font-bold text-gray-900">Ticker</h1>
        </div>

        {/* Content */}
        <div className="p-8">
          {toast && (
            <div className={`mb-4 p-4 rounded-lg ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
              {toast.message}
            </div>
          )}

          {/* Ticker Items */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Ticker Items</h2>
              <button
                onClick={addItem}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition text-sm"
              >
                + Add Item
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Add or edit ticker items that will scroll across the top of the site. Use these for breaking news, announcements, or important updates.
            </p>

            <div className="space-y-4">
              {items.length === 0 ? (
                <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg">
                  No ticker items yet. Add one to get started!
                </div>
              ) : (
                items.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 md:grid-cols-5 gap-4 pb-4 border-b border-gray-200 last:border-0 items-center"
                  >
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) => updateItem(idx, 'text', e.target.value)}
                      placeholder="Enter ticker text..."
                      className="md:col-span-4 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    />

                    <div className="flex gap-2">
                      <label className="flex items-center gap-2 flex-1">
                        <input
                          type="checkbox"
                          checked={item.active}
                          onChange={(e) => updateItem(idx, 'active', e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">Active</span>
                      </label>
                      <button
                        onClick={() => removeItem(idx)}
                        className="text-red-600 hover:text-red-900 font-medium px-3 py-2"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Preview Section */}
          {items.filter(i => i.active && i.text).length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Preview</h2>
              <div className="bg-red-600 text-white p-3 rounded-lg overflow-hidden">
                <div className="flex gap-4 animate-scroll whitespace-nowrap">
                  {items
                    .filter(i => i.active && i.text)
                    .map((item, idx) => (
                      <span key={idx} className="inline-flex items-center">
                        <span className="mx-4">{item.text}</span>
                        <span className="text-red-400">•</span>
                      </span>
                    ))}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                This is a preview of how the active items will appear on your site.
              </p>
            </div>
          )}

          {/* Save Button */}
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition"
            >
              {isSaving ? 'Saving...' : 'Save Ticker Items'}
            </button>
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        .animate-scroll {
          animation: scroll 20s linear infinite;
        }
      `}</style>
    </div>
  );
}
