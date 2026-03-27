'use client';

import { useEffect, useState } from 'react';
import { AdminSidebar } from '@/components/admin/admin-sidebar';

interface Settings {
  site_name: string;
  tagline: string;
  contact_email: string;
  contact_phone: string;
  ads_email: string;
  support_email: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    site_name: '',
    tagline: '',
    contact_email: '',
    contact_phone: '',
    ads_email: '',
    support_email: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings', { credentials: 'include' });
      const data = await res.json();
      if (data.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      showToast('Failed to load settings', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to save settings');
      showToast('Settings saved successfully', 'success');
      setIsDirty(false);
    } catch (error) {
      showToast('Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setSettings({ ...settings, [field]: value });
    setIsDirty(true);
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <AdminSidebar />
        <main className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-center text-gray-600">Loading settings...</div>
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
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        </div>

        {/* Content */}
        <div className="p-8 max-w-4xl">
          {toast && (
            <div className={`mb-4 p-4 rounded-lg ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
              {toast.message}
            </div>
          )}

          {/* Site Settings */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Site Settings</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Site Name</label>
                <input
                  type="text"
                  value={settings.site_name}
                  onChange={(e) => handleChange('site_name', e.target.value)}
                  placeholder="Columbus Real Estate News"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">The name of your website</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tagline</label>
                <input
                  type="text"
                  value={settings.tagline}
                  onChange={(e) => handleChange('tagline', e.target.value)}
                  placeholder="Your site's tagline or description"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Displayed in header and SEO metadata</p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Contact Information</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Primary Contact Email</label>
                <input
                  type="email"
                  value={settings.contact_email}
                  onChange={(e) => handleChange('contact_email', e.target.value)}
                  placeholder="contact@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Used for contact forms and general inquiries</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone</label>
                <input
                  type="tel"
                  value={settings.contact_phone}
                  onChange={(e) => handleChange('contact_phone', e.target.value)}
                  placeholder="(614) 555-0000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Displayed in footer and contact pages</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Advertising Email</label>
                <input
                  type="email"
                  value={settings.ads_email}
                  onChange={(e) => handleChange('ads_email', e.target.value)}
                  placeholder="ads@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">For advertising inquiries</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Support Email</label>
                <input
                  type="email"
                  value={settings.support_email}
                  onChange={(e) => handleChange('support_email', e.target.value)}
                  placeholder="support@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">For support requests and user issues</p>
              </div>
            </div>
          </div>

          {/* Save Actions */}
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
            {isDirty && (
              <button
                onClick={() => fetchSettings()}
                className="bg-gray-200 hover:bg-gray-300 text-gray-900 px-6 py-2 rounded-lg transition"
              >
                Discard Changes
              </button>
            )}
          </div>

          {/* Additional Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
            <h3 className="font-semibold text-blue-900 mb-2">Tip</h3>
            <p className="text-sm text-blue-800">
              These settings are used throughout your site for contact information, SEO metadata, and branding. Make sure to keep them up to date!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
