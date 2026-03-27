'use client';

import { useEffect, useState } from 'react';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { useSearchParams } from 'next/navigation';

interface Article {
  id: string;
  title: string;
  category: string;
  author: string;
  date: string;
  status: 'draft' | 'published';
  featured: boolean;
  excerpt: string;
  body: string;
  read_time?: number;
}

export default function ArticlesPage() {
  const searchParams = useSearchParams();
  const isNewMode = searchParams.get('new') === 'true';

  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(isNewMode);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [formData, setFormData] = useState<Partial<Article>>({
    title: '',
    category: 'market',
    author: '',
    date: new Date().toISOString().split('T')[0],
    status: 'draft',
    featured: false,
    excerpt: '',
    body: '',
    read_time: 5,
  });

  const categories = ['market', 'news', 'trends', 'guides', 'interviews'];

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const res = await fetch('/api/admin/articles', { credentials: 'include' });
      const data = await res.json();
      setArticles(data.articles || []);
    } catch (error) {
      showToast('Failed to load articles', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...formData,
      read_time: parseInt(String(formData.read_time || 5)),
    };

    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/api/admin/articles/${editingId}` : '/api/admin/articles';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to save article');

      await fetchArticles();
      setShowForm(false);
      setEditingId(null);
      setFormData({
        title: '',
        category: 'market',
        author: '',
        date: new Date().toISOString().split('T')[0],
        status: 'draft',
        featured: false,
        excerpt: '',
        body: '',
        read_time: 5,
      });

      showToast(editingId ? 'Article updated successfully' : 'Article created successfully', 'success');
    } catch (error) {
      showToast('Failed to save article', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;

    try {
      const res = await fetch(`/api/admin/articles/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to delete article');

      await fetchArticles();
      showToast('Article deleted successfully', 'success');
    } catch (error) {
      showToast('Failed to delete article', 'error');
    }
  };

  const handleEdit = (article: Article) => {
    setFormData(article);
    setEditingId(article.id);
    setShowForm(true);
  };

  const handleStatusToggle = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'draft' ? 'published' : 'draft';
    const article = articles.find(a => a.id === id);
    if (!article) return;

    try {
      const res = await fetch(`/api/admin/articles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...article, status: newStatus }),
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to update status');
      await fetchArticles();
      showToast('Article status updated', 'success');
    } catch (error) {
      showToast('Failed to update status', 'error');
    }
  };

  const handleFeaturedToggle = async (id: string, currentFeatured: boolean) => {
    const article = articles.find(a => a.id === id);
    if (!article) return;

    try {
      const res = await fetch(`/api/admin/articles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...article, featured: !currentFeatured }),
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to update featured');
      await fetchArticles();
      showToast('Featured status updated', 'success');
    } catch (error) {
      showToast('Failed to update featured status', 'error');
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
          <h1 className="text-2xl font-bold text-gray-900">Articles</h1>
          {!showForm && (
            <button
              onClick={() => {
                setShowForm(true);
                setEditingId(null);
                setFormData({
                  title: '',
                  category: 'market',
                  author: '',
                  date: new Date().toISOString().split('T')[0],
                  status: 'draft',
                  featured: false,
                  excerpt: '',
                  body: '',
                  read_time: 5,
                });
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition"
            >
              + New Article
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
              <h2 className="text-lg font-semibold mb-6">{editingId ? 'Edit Article' : 'Create New Article'}</h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                    <input
                      type="text"
                      value={formData.title || ''}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={formData.category || 'market'}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Author</label>
                    <input
                      type="text"
                      value={formData.author || ''}
                      onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={formData.date || ''}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Read Time (minutes)</label>
                    <input
                      type="number"
                      value={formData.read_time || 5}
                      onChange={(e) => setFormData({ ...formData, read_time: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={formData.status || 'draft'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'published' })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.featured || false}
                      onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">Featured Article</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Excerpt</label>
                  <textarea
                    value={formData.excerpt || ''}
                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Body</label>
                  <textarea
                    value={formData.body || ''}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    rows={8}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none"
                    required
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition"
                  >
                    {editingId ? 'Update Article' : 'Create Article'}
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

          {/* Articles Table */}
          {!showForm && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {isLoading ? (
                <div className="p-8 text-center text-gray-600">Loading articles...</div>
              ) : articles.length === 0 ? (
                <div className="p-8 text-center text-gray-600">No articles yet. Create one to get started!</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Title</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Author</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Featured</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {articles.map((article, idx) => (
                        <tr key={article.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{article.title}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs font-medium">
                              {article.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{article.author}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {new Date(article.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <button
                              onClick={() => handleStatusToggle(article.id, article.status)}
                              className={`px-2 py-1 rounded text-xs font-medium cursor-pointer transition ${
                                article.status === 'published'
                                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                  : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                              }`}
                            >
                              {article.status === 'published' ? 'Live' : 'Draft'}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <button
                              onClick={() => handleFeaturedToggle(article.id, article.featured)}
                              className={`px-2 py-1 rounded text-xs font-medium cursor-pointer transition ${
                                article.featured
                                  ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                              }`}
                            >
                              {article.featured ? '★ Featured' : 'Not Featured'}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-sm space-x-2">
                            <button
                              onClick={() => handleEdit(article)}
                              className="text-blue-600 hover:text-blue-900 font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(article.id)}
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
