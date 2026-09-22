'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { HUMAN_REVIEW_ITEMS } from '@/lib/editorial-review';

interface Article {
  id: string;
  title: string;
  category: string;
  author: string;
  date: string;
  status: 'draft' | 'live';
  featured: boolean;
  excerpt: string;
  body: string;
  read_time?: number;
  tags?: string[];
  image_url?: string | null;
  area_slug?: string | null;
  topic_slug?: string | null;
  meta_description?: string | null;
  image_alt?: string | null;
  image_caption?: string | null;
  fact_checked_at?: string | null;
  machine_score?: number | null;
  machine_possible?: number | null;
  human_decision?: string | null;
  human_scores?: Record<string, number> | null;
  reviewer?: string | null;
  review_status?: string | null;
  email_review_status?: string | null;
  email_review_version?: number | null;
  email_review_reply_text?: string | null;
  email_review_reviewer?: string | null;
  email_review_sent_at?: string | null;
  email_review_replied_at?: string | null;
  submission?: Partial<Article> & {
    image_provenance?: { caption?: string };
  } | null;
}

function BodyPreview({ body }: { body: string }) {
  return body.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => {
    const heading = paragraph.match(/^#{2,3}\s+(.+)$/);
    if (heading) return <h3 key={index} className="mt-6 text-xl font-semibold text-gray-950">{heading[1]}</h3>;
    return <p key={index} className="mt-3 whitespace-pre-wrap leading-7 text-gray-800">{paragraph}</p>;
  });
}

export default function ArticlesPage() {
  const searchParams = useSearchParams();
  const isNewMode = searchParams.get('new') === 'true';

  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(isNewMode);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [reviewer, setReviewer] = useState('');
  const [isSendingProof, setIsSendingProof] = useState(false);
  const [humanScores, setHumanScores] = useState<Record<string, number>>(
    Object.fromEntries(HUMAN_REVIEW_ITEMS.map((item) => [item.id, 0])),
  );

  const [formData, setFormData] = useState<Partial<Article>>({
    title: '',
    category: 'Market Analysis',
    author: '',
    date: new Date().toISOString().split('T')[0],
    status: 'draft',
    featured: false,
    excerpt: '',
    body: '',
    read_time: 5,
  });

  const categories = ['Market Analysis', 'Development', 'Neighborhoods', 'Economic Impact', 'Rental Market', 'Commercial', 'Local Politics', 'Lifestyle', 'Policy'];

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleEdit = useCallback((article: Article) => {
    const pending = ['AWAITING_IMAGE', 'READY_FOR_REVIEW', 'READY_FOR_AUTOMATION', 'AWAITING_HUMAN_REVIEW'].includes(article.review_status ?? '')
      ? article.submission
      : null;
    setFormData(pending ? {
      ...article,
      ...pending,
      id: article.id,
      status: article.status,
      image_url: pending.image_url ?? article.image_url,
      image_caption: pending.image_provenance?.caption ?? article.image_caption,
    } : article);
    setEditingId(article.id);
    setReviewer(article.reviewer ?? '');
    setHumanScores(Object.fromEntries(HUMAN_REVIEW_ITEMS.map((item) => [
      item.id,
      article.human_scores?.[item.id] ?? 0,
    ])));
    setShowForm(true);
  }, []);

  const fetchArticles = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/articles', { credentials: 'include' });
      const data = await res.json();
      const nextArticles = data.articles || [];
      setArticles(nextArticles);
      const editId = searchParams.get('edit');
      const requested = editId ? nextArticles.find((article: Article) => article.id === editId) : undefined;
      if (requested) handleEdit(requested);
    } catch {
      showToast('Failed to load articles', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [handleEdit, searchParams, showToast]);

  useEffect(() => {
    // This effect synchronizes the client admin view with the remote API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchArticles();
  }, [fetchArticles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...formData,
      read_time: parseInt(String(formData.read_time || 5)),
      ...(formData.status === 'live' ? {
        human_decision: 'APPROVED',
        human_scores: humanScores,
        reviewer,
      } : {}),
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

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.error || 'Failed to save article');
      }

      await fetchArticles();
      setShowForm(false);
      setEditingId(null);
      setFormData({
        title: '',
        category: 'Market Analysis',
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
      showToast(error instanceof Error ? error.message : 'Failed to save article', 'error');
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
    } catch {
      showToast('Failed to delete article', 'error');
    }
  };

  const handleEmailProof = async () => {
    if (!editingId) return;
    setIsSendingProof(true);
    try {
      const save = await fetch(`/api/admin/articles/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, status: 'draft' }),
        credentials: 'include',
      });
      if (!save.ok) {
        const errorBody = await save.json().catch(() => ({}));
        throw new Error(errorBody.error || 'Failed to save the draft before emailing it');
      }
      const response = await fetch(`/api/admin/articles/${editingId}/email-review`, {
        method: 'POST',
        credentials: 'include',
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Failed to send publication proof');
      await fetchArticles();
      showToast(`Publication proof v${result.version} sent to ${result.recipient}`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to send publication proof', 'error');
    } finally {
      setIsSendingProof(false);
    }
  };

  const handleStatusToggle = async (id: string, currentStatus: string) => {
    const article = articles.find(a => a.id === id);
    if (!article) return;

    if (currentStatus === 'draft') {
      handleEdit(article);
      showToast('Review the exact copy and hero, complete the scorecard, then approve publication', 'success');
      return;
    }
    if (!confirm('Move this live article back to draft?')) return;

    try {
      const res = await fetch(`/api/admin/articles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...article, status: 'draft' }),
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to update status');
      await fetchArticles();
      showToast('Article status updated', 'success');
    } catch {
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
        body: JSON.stringify({ featured: !currentFeatured }),
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to update featured');
      await fetchArticles();
      showToast('Featured status updated', 'success');
    } catch {
      showToast('Failed to update featured status', 'error');
    }
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
                  category: 'Market Analysis',
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
                      value={formData.category || 'Market Analysis'}
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
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'live' })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    >
                      <option value="draft">Draft</option>
                      <option value="live">Live after explicit approval</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                  <input
                    type="text"
                    value={(formData.tags || []).join(', ')}
                    onChange={(e) => setFormData({
                      ...formData,
                      tags: [...new Set(e.target.value.split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean))],
                    })}
                    placeholder="columbus-ohio, central-ohio-real-estate, development, gahanna"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                  <p className="mt-1 text-xs text-gray-500">Comma-separated. Development and Neighborhoods tags are required by the machine gate.</p>
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

                {editingId && (
                  <section className="rounded-xl border border-gray-300 bg-white p-5">
                    <h3 className="text-lg font-semibold text-gray-950">Reader preview</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Preview the exact copy and hero that will be approved. Saving as live requires the scorecard below.
                    </p>
                    <article className="mx-auto mt-5 max-w-3xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                      {formData.image_url ? (
                        <Image
                          src={formData.image_url}
                          alt={formData.title || 'Draft hero image'}
                          width={1600}
                          height={900}
                          className="aspect-video w-full object-cover"
                        />
                      ) : (
                        <div className="flex aspect-video items-center justify-center bg-gray-100 text-sm text-gray-500">
                          No hero image ready
                        </div>
                      )}
                      <div className="p-6">
                        <h1 className="text-3xl font-bold leading-tight text-gray-950">{formData.title}</h1>
                        <p className="mt-3 text-lg text-gray-600">{formData.excerpt}</p>
                        <div className="mt-6 border-t border-gray-200 pt-3 text-sm text-gray-600">
                          {formData.author} · {formData.date}
                        </div>
                        <div className="mt-6"><BodyPreview body={formData.body || ''} /></div>
                      </div>
                    </article>
                    <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
                      <p className="font-semibold">Email review: {articles.find((article) => article.id === editingId)?.email_review_status ?? 'NOT_SENT'}</p>
                      {articles.find((article) => article.id === editingId)?.email_review_reply_text && (
                        <p className="mt-2 whitespace-pre-wrap"><strong>Latest email reply:</strong> {articles.find((article) => article.id === editingId)?.email_review_reply_text}</p>
                      )}
                      <button
                        type="button"
                        onClick={handleEmailProof}
                        disabled={isSendingProof || !formData.image_url}
                        className="mt-3 rounded-lg bg-blue-700 px-4 py-2 font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSendingProof ? 'Sending proof…' : 'Save draft and email publication proof'}
                      </button>
                      <button type="button" className="mt-3 ml-3 rounded-lg border border-blue-700 px-4 py-2" onClick={async () => {
                        const response = await fetch(`/api/admin/articles/${editingId}/email-review`);
                        const data = await response.json();
                        if (!response.ok) { showToast(data.error ?? 'Could not load email review', 'error'); return; }
                        const event = data.events?.find((entry: { version: number; decision: string; action?: string; approvalRecoveryAvailable?: boolean }) =>
                          entry.version === data.reviews?.[0]?.version && ((entry.decision === 'APPROVED' && !entry.action) || entry.approvalRecoveryAvailable));
                        if (!event) { showToast('No pending email approval is available', 'error'); return; }
                        if (!confirm(`Retry publication checks for email-approved proof version ${event.version}?\n\nThe provider will reverify your email. The exact approved article publishes if all checks pass.`)) return;
                        const result = await fetch(`/api/admin/articles/${editingId}/email-review`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ emailId: event.email_id, confirm: 'retry-verified-email-publication' }) });
                        const detail = await result.json();
                        showToast(result.ok ? 'Email-approved article published' : detail.error ?? 'Publication checks did not pass', result.ok ? 'success' : 'error');
                        await fetchArticles();
                      }}>Retry failed email publication</button>
                      <p className="mt-2 text-xs text-blue-800">Reply APPROVE or APPROVED to publish this exact proof after sender, article and image checks pass. No additional admin confirmation or scorecard is required. Edits require a corrected proof and a new approval. The retry button is only for failed checks.</p>
                    </div>
                  </section>
                )}

                {editingId && formData.status === 'live' && articles.find((article) => article.id === editingId)?.email_review_status === 'APPROVED' && (
                  <section className="rounded-xl border border-green-300 bg-green-50 p-5">
                    <h3 className="text-lg font-semibold text-green-950">Approved by email</h3>
                    <p className="mt-1 text-sm text-green-900">
                      {articles.find((article) => article.id === editingId)?.email_review_reviewer} approved this exact candidate.
                      Saving as live will recheck the candidate fingerprint, machine gate, hero, and your separately completed editorial scorecard before publication.
                    </p>
                  </section>
                )}

                {editingId && formData.status === 'live' && (
                  <section className="rounded-xl border border-amber-300 bg-amber-50 p-5">
                    <h3 className="text-lg font-semibold text-gray-950">Editorial approval</h3>
                    <p className="mt-1 text-sm text-gray-700">
                      Score the exact copy and hero above. Publication requires at least 17/20, every blocking item above zero,
                      and accuracy, fairness, originality, and reader-visible evidence at 2.
                    </p>
                    <div className="mt-4 space-y-3">
                      {HUMAN_REVIEW_ITEMS.map((item) => (
                        <label key={item.id} className="grid gap-2 rounded-lg border border-amber-200 bg-white p-3 md:grid-cols-[1fr_8rem]">
                          <span>
                            <span className="block text-sm font-semibold text-gray-950">{item.id}: {item.label}{item.blocking ? ' (blocking)' : ''}</span>
                            <span className="mt-1 block text-xs text-gray-600">{item.description}</span>
                          </span>
                          <select
                            value={humanScores[item.id] ?? 0}
                            onChange={(event) => setHumanScores({ ...humanScores, [item.id]: Number(event.target.value) })}
                            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                          >
                            <option value={0}>0 — fails</option>
                            <option value={1}>1 — passes</option>
                            <option value={2}>2 — excellent</option>
                          </select>
                        </label>
                      ))}
                    </div>
                    <label className="mt-4 block text-sm font-medium text-gray-800">
                      Reviewer identity
                      <input
                        type="text"
                        value={reviewer}
                        onChange={(event) => setReviewer(event.target.value)}
                        className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2"
                        placeholder="Name or accountable editor ID"
                        required
                      />
                    </label>
                  </section>
                )}

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
                                article.status === 'live'
                                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                  : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                              }`}
                            >
                              {article.status === 'live' ? 'Live' : 'Draft'}
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
