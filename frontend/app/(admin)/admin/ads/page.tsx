'use client';

import { useEffect, useState } from 'react';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { useSearchParams } from 'next/navigation';

interface Ad {
  id: string;
  name: string;
  type: 'display' | 'native';
  placement: string;
  status: 'active' | 'paused';
  size?: string;
  image_url?: string;
  link_url?: string;
  html_content?: string;
  title?: string;
  text?: string;
  cta_text?: string;
  cta_url?: string;
  brand_name?: string;
  brand_color?: string;
}

export default function AdsPage() {
  const searchParams = useSearchParams();
  const isNewMode = searchParams.get('new') === 'true';

  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(isNewMode);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [formData, setFormData] = useState<Partial<Ad>>({
    name: '',
    type: 'display',
    placement: 'sidebar',
    status: 'active',
    size: '300x250',
    image_url: '',
    link_url: '',
    html_content: '',
    title: '',
    text: '',
    cta_text: '',
    cta_url: '',
    brand_name: '',
    brand_color: '#000000',
  });

  const placements = ['sidebar', 'header', 'footer', 'inline', 'modal'];
  const displaySizes = ['300x250', '728x90', '160x600', '320x50', '970x90'];

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    try {
      const res = await fetch('/api/admin/ads', { credentials: 'include' });
      const data = await res.json();
      setAds(data.ads || []);
    } catch (error) {
      showToast('Failed to load ads', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/api/admin/ads/${editingId}` : '/api/admin/ads';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to save ad');

      await fetchAds();
      setShowForm(false);
      setEditingId(null);
      setFormData({
        name: '',
        type: 'display',
        placement: 'sidebar',
        status: 'active',
        size: '300x250',
        image_url: '',
        link_url: '',
        html_content: '',
        title: '',
        text: '',
        cta_text: '',
        cta_url: '',
        brand_name: '',
        brand_color: '#000000',
      });

      showToast(editingId ? 'Ad updated successfully' : 'Ad created successfully', 'success');
    } catch (error) {
      showToast('Failed to save ad', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ad?')) return;

    try {
      const res = await fetch(`/api/admin/ads/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to delete ad');

      await fetchAds();
      showToast('Ad deleted successfully', 'success');
    } catch (error) {
      showToast('Failed to delete ad', 'error');
    }
  };

  const handleEdit = (ad: Ad) => {
    setFormData(ad);
    setEditingId(ad.id);
    setShowForm(true);
  };

  const handleStatusToggle = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    const ad = ads.find(a => a.id === id);
    if (!ad) return;

    try {
      const res = await fetch(`/api/admin/ads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...ad, status: newStatus }),
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to update status');
      await fetchAds();
      showToast('Ad status updated', 'success');
    } catch (error) {
      showToast('Failed to update status', 'error');
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />

      <main className="flex-1 ml-64 overflow-auto">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-30 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Advertisements</h1>
          {!showForm && (
            <button
              onClick={() => {
                setShowForm(true);
                setEditingId(null);
                setFormData({
                  name: '',
                  type: 'display',
                  placement: 'sidebar',
                  status: 'active',
                  size: '300x250',
                  image_url: '',
                  link_url: '',
                  html_content: '',
                  title: '',
                  text: '',
                  cta_text: '',
                  cta_url: '',
                  brand_name: '',
                  brand_color: '#000000',
                });
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition"
            >
              + New Ad
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Toast */}
          {toast && (
            <div className={`mb-4 p-4 rounded-lg ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
              {toast.message}
            </div>
          )}

          {/* Form */}
          {showForm && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
              <h2 className="text-lg font-semibold mb-6">{editingId ? 'Edit Advertisement' : 'Create New Advertisement'}</h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ad Name</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <select
                      value={formData.type || 'display'}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as 'display' | 'native' })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    >
                      <option value="display">Display</option>
                      <option value="native">Native</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Placement</label>
                    <select
                      value={formData.placement || 'sidebar'}
                      onChange={(e) => setFormData({ ...formData, placement: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    >
                      {placements.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={formData.status || 'active'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'paused' })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    >
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                    </select>
                  </div>
                </div>

                {formData.type === 'display' ? (
                  <>
                    <h3 className="text-sm font-semibold text-gray-900 mt-6 mb-4">Display Ad Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
                        <select
                          value={formData.size || '300x250'}
                          onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                        >
                          {displaySizes.map(size => (
                            <option key={size} value={size}>{size}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
                        <input
                          type="url"
                          value={formData.image_url || ''}
                          onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                          required={formData.type === 'display'}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Link URL</label>
                        <input
                          type="url"
                          value={formData.link_url || ''}
                          onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">HTML Content</label>
                      <textarea
                        value={formData.html_content || ''}
                        onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none"
                        placeholder="Optional: Custom HTML for the ad"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-sm font-semibold text-gray-900 mt-6 mb-4">Native Ad Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                        <input
                          type="text"
                          value={formData.title || ''}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                          required={formData.type === 'native'}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Brand Name</label>
                        <input
                          type="text"
                          value={formData.brand_name || ''}
                          onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Brand Color</label>
                        <input
                          type="color"
                          value={formData.brand_color || '#000000'}
                          onChange={(e) => setFormData({ ...formData, brand_color: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg h-10"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">CTA Text</label>
                        <input
                          type="text"
                          value={formData.cta_text || ''}
                          onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                          placeholder="e.g., Learn More"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">CTA URL</label>
                        <input
                          type="url"
                          value={formData.cta_url || ''}
                          onChange={(e) => setFormData({ ...formData, cta_url: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Ad Text</label>
                      <textarea
                        value={formData.text || ''}
                        onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none"
                        required={formData.type === 'native'}
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition"
                  >
                    {editingId ? 'Update Ad' : 'Create Ad'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                    }}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-900 px-6 py-2 rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Ads Table */}
          {!showForm && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {isLoading ? (
                <div className="p-8 text-center text-gray-600">Loading ads...</div>
              ) : ads.length === 0 ? (
                <div className="p-8 text-center text-gray-600">No ads yet. Create one to get started!</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Placement</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ads.map((ad, idx) => (
                        <tr key={ad.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{ad.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs font-medium">
                              {ad.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{ad.placement}</td>
                          <td className="px-6 py-4 text-sm">
                            <button
                              onClick={() => handleStatusToggle(ad.id, ad.status)}
                              className={`px-2 py-1 rounded text-xs font-medium cursor-pointer transition ${
                                ad.status === 'active'
                                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                  : 'bg-red-100 text-red-800 hover:bg-red-200'
                              }`}
                            >
                              {ad.status === 'active' ? 'Active' : 'Paused'}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-sm space-x-2">
                            <button
                              onClick={() => handleEdit(ad)}
                              className="text-blue-600 hover:text-blue-900 font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(ad.id)}
                              className="text-red-600 hover:text-red-900 font-medium"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
