'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './announcements.css';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { useAuth } from '../../context/AuthContext';
import { announcementService } from '../../services/announcement.service';
import SelectWithOther from '../../components/common/SelectWithOther';
import {
  getStoredAnnouncements,
  saveAnnouncement,
  updateAnnouncementStore,
  deleteAnnouncementStore
} from '../../utils/crmStore';
import {
  Megaphone, PartyPopper, Trophy, Target, Sparkles,
  Send, Clock, CheckCircle2, AlertTriangle, Trash2, Power, RefreshCw, User
} from 'lucide-react';

export default function AnnouncementsPage() {
  const { user, sidebarCollapsed, loading: authLoading } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [text, setText] = useState('');
  const [category, setCategory] = useState('Celebration');
  const [durationHours, setDurationHours] = useState(44);
  const [publishing, setPublishing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch Announcements
  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await announcementService.getAllAnnouncements();
      if (res && res.data && Array.isArray(res.data)) {
        setAnnouncements(res.data);
        setLoading(false);
        return;
      }
    } catch (e) {
      // Fallback offline store
    }
    const localList = getStoredAnnouncements();
    setAnnouncements(localList);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) {
      loadAnnouncements();
    }
  }, [user, loadAnnouncements]);

  // Handle Submit
  const handlePublish = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    setPublishing(true);
    setSuccessMsg('');

    const payload = {
      text: text.trim(),
      category,
      durationHours: Number(durationHours) || 44
    };

    let newAnn = null;
    try {
      const res = await announcementService.createAnnouncement(payload);
      if (res && res.data) {
        newAnn = res.data;
      }
    } catch (err) {
      // Offline fallback
      newAnn = saveAnnouncement(payload, user);
    }

    if (!newAnn) {
      newAnn = saveAnnouncement(payload, user);
    }

    // Broadcast event to refresh Header ticker in real time
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('announcement_updated'));
    }

    setText('');
    setPublishing(false);
    setSuccessMsg(`🎉 Announcement successfully published for ${durationHours} hours!`);
    setTimeout(() => setSuccessMsg(''), 4000);

    loadAnnouncements();
  };

  // Handle Toggle Active/Inactive Status
  const handleToggleStatus = async (ann) => {
    const nextStatus = !ann.isActive;
    try {
      await announcementService.updateAnnouncement(ann._id || ann.id, { isActive: nextStatus });
    } catch (e) {
      updateAnnouncementStore(ann.id || ann._id, { isActive: nextStatus });
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('announcement_updated'));
    }
    loadAnnouncements();
  };

  // Handle Delete
  const handleDelete = async (annId) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await announcementService.deleteAnnouncement(annId);
    } catch (e) {
      deleteAnnouncementStore(annId);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('announcement_updated'));
    }
    loadAnnouncements();
  };

  if (authLoading || !user) {
    return (
      <div className="loading-screen">
        <Sparkles className="spin-icon" />
        <span>Loading Sanmora Announcement Center...</span>
      </div>
    );
  }

  const categoryOptions = [
    { key: 'Celebration', label: 'Celebration', icon: PartyPopper },
    { key: 'Important', label: 'Notice Alert', icon: Megaphone },
    { key: 'Achievement', label: 'Milestone', icon: Trophy },
    { key: 'Sales Target', label: 'Target Boost', icon: Target }
  ];

  return (
    <div className="crm-layout">
      <Sidebar />
      <Header title="Celebration & Announcements Broadcast" />

      <main className={`crm-main-content ${sidebarCollapsed ? 'collapsed' : ''}`}>
        
        {/* ── HERO BANNER ── */}
        <div className="announcements-hero">
          <div className="announcements-hero-title">
            <div className="announcements-hero-icon">
              <Megaphone size={26} />
            </div>
            <div>
              <h2>Celebration & Announcement Center</h2>
              <div className="announcements-hero-sub">
                Publish dynamic news, milestones, and celebration notices visible across all CRM pages for up to 44 hours.
              </div>
            </div>
          </div>
          <button onClick={loadAnnouncements} className="icon-btn-ann" title="Refresh List">
            <RefreshCw size={16} />
          </button>
        </div>

        {successMsg && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid #10B981',
            color: '#10B981',
            padding: '12px 18px',
            borderRadius: '12px',
            fontWeight: '650',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ── MAIN CONTENT GRID ── */}
        <div className="announcements-grid">

          {/* LEFT COLUMN: PUBLISH NEW ANNOUNCEMENT FORM */}
          <div className="publish-card">
            <div className="publish-card-header">
              <Sparkles size={20} style={{ color: '#7C3AED' }} />
              <h3>Publish New Broadcast</h3>
            </div>

            <form onSubmit={handlePublish} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div className="form-group-ann">
                <label>Announcement Text / Message</label>
                <textarea
                  className="ann-input-text"
                  placeholder="e.g. 🎉 Congratulations to the team for achieving 100 successful deals this month! Great work everyone!"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  required
                />
              </div>

              <div className="form-group-ann">
                <label>Select Banner Type</label>
                <div className="category-select-grid">
                  {categoryOptions.map(opt => {
                    const Icon = opt.icon;
                    const isSelected = category === opt.key;
                    return (
                      <div
                        key={opt.key}
                        className={`category-radio-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => setCategory(opt.key)}
                      >
                        <Icon size={16} />
                        <span>{opt.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="form-group-ann">
                <label>Display Duration (Hours)</label>
                <SelectWithOther
                  inputClassName="ann-input-text"
                  style={{ minHeight: '44px' }}
                  value={durationHours}
                  onChange={(e) => setDurationHours(e.target.value)}
                  name="durationHours"
                >
                  <option value={44}>44 Hours (Default Celebration Standard)</option>
                  <option value={24}>24 Hours (1 Day)</option>
                  <option value={12}>12 Hours (Half Day)</option>
                  <option value={72}>72 Hours (3 Days)</option>
                </SelectWithOther>
              </div>

              <button
                type="submit"
                className="btn-publish-ann"
                disabled={publishing || !text.trim()}
              >
                <Send size={16} />
                <span>{publishing ? 'Publishing...' : 'Publish Announcement Now'}</span>
              </button>

            </form>
          </div>

          {/* RIGHT COLUMN: ACTIVE & PAST ANNOUNCEMENTS HISTORY TABLE */}
          <div className="history-card">
            <div className="publish-card-header" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Clock size={20} style={{ color: '#2563EB' }} />
                <h3>Broadcast History & Active Logs ({announcements.length})</h3>
              </div>
            </div>

            <div className="announcements-table-container">
              {loading ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  Loading broadcast history...
                </div>
              ) : announcements.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <Megaphone size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                  <h4>No Announcements Published Yet</h4>
                  <p style={{ fontSize: '0.85rem' }}>Create your first broadcast news message using the form on the left.</p>
                </div>
              ) : (
                <table className="ann-table">
                  <thead>
                    <tr>
                      <th>Badge</th>
                      <th>Announcement Text</th>
                      <th>Publisher</th>
                      <th>Duration / Expiry</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {announcements.map((ann) => {
                      const pubTime = new Date(ann.publishedAt || ann.createdAt || Date.now()).getTime();
                      const durMs = (Number(ann.durationHours) || 44) * 60 * 60 * 1000;
                      const expTime = ann.expiresAt ? new Date(ann.expiresAt).getTime() : (pubTime + durMs);
                      const isExpired = Date.now() > expTime;
                      const isLive = ann.isActive !== false && !isExpired;

                      const rawCat = (ann.category || 'Celebration').toString().trim().toLowerCase();
                      const getCatInfo = (catStr) => {
                        if (catStr.includes('important') || catStr.includes('notice') || catStr.includes('alert')) {
                          return { label: 'Notice Alert', icon: Megaphone, cls: 'important' };
                        }
                        if (catStr.includes('achievement') || catStr.includes('milestone')) {
                          return { label: 'Milestone', icon: Trophy, cls: 'achievement' };
                        }
                        if (catStr.includes('sales') || catStr.includes('target') || catStr.includes('boost')) {
                          return { label: 'Target Boost', icon: Target, cls: 'salestarget' };
                        }
                        return { label: 'Celebration', icon: PartyPopper, cls: 'celebration' };
                      };
                      const catInfo = getCatInfo(rawCat);
                      const CatIcon = catInfo.icon;

                      return (
                        <tr key={ann._id || ann.id}>
                          <td>
                            <span className={`category-badge-pill ${catInfo.cls}`}>
                              <CatIcon size={12} />
                              <span>{catInfo.label}</span>
                            </span>
                          </td>
                          <td className="ann-text-cell">
                            {ann.text}
                          </td>
                          <td className="ann-publisher-cell">
                            <span className="ann-publisher-badge">
                              <User size={13} />
                              <span>{ann.createdByName || 'Sanmora Admin'}</span>
                            </span>
                          </td>
                          <td className="ann-duration-cell">
                            <div className="ann-dur-hours">{ann.durationHours || 44} Hours</div>
                            <div className="ann-dur-date">{new Date(pubTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                          </td>
                          <td>
                            {isLive ? (
                              <span className="status-pill-ann active">
                                <span className="ann-pulse-dot" />
                                <span>LIVE (ACTIVE)</span>
                              </span>
                            ) : isExpired ? (
                              <span className="status-pill-ann expired">EXPIRED</span>
                            ) : (
                              <span className="status-pill-ann disabled">PAUSED</span>
                            )}
                          </td>
                          <td>
                            <div className="ann-actions-cell">
                              <button
                                onClick={() => handleToggleStatus(ann)}
                                className={`icon-btn-ann toggle ${ann.isActive !== false ? 'active' : ''}`}
                                title={ann.isActive !== false ? 'Pause Announcement' : 'Activate Announcement'}
                              >
                                <Power size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(ann._id || ann.id)}
                                className="icon-btn-ann delete"
                                title="Delete Announcement"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
