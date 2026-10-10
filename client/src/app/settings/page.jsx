'use client';

import React from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { useAuth } from '../../context/AuthContext';
import { Settings, ShieldCheck, Database, Sliders } from 'lucide-react';

export default function SettingsPage() {
  const { user, sidebarCollapsed } = useAuth();

  return (
    <div className="crm-layout">
      <Sidebar />
      <Header title="System Settings" />

      <main className={`crm-main-content ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="page-action-header glass-card">
          <div>
            <h2>System & Company Configuration</h2>
            <p>Manage application preferences, RBAC defaults, and cloud integrations</p>
          </div>
        </div>

        <div className="settings-grid">
          <div className="settings-card glass-card">
            <div className="card-hdr">
              <Sliders size={20} className="icon-purple" />
              <h3>General CRM Preferences</h3>
            </div>
            <p>Customize company name, default currency, time zone, and brand colors.</p>
          </div>

          <div className="settings-card glass-card">
            <div className="card-hdr">
              <ShieldCheck size={20} className="icon-blue" />
              <h3>Security & Session Rules</h3>
            </div>
            <p>Configure password policy, multi-factor authentication, and JWT expiration time.</p>
          </div>

          <div className="settings-card glass-card">
            <div className="card-hdr">
              <Database size={20} className="icon-green" />
              <h3>Database Connection</h3>
            </div>
            <p>Connected to MongoDB Atlas Live Cluster (`crmsanmora`).</p>
          </div>
        </div>
      </main>

      <style jsx>{`
        .crm-layout { display: flex; min-height: 100vh; }
        .crm-main-content { margin-left: var(--sidebar-width); margin-top: calc(var(--header-height, 70px) + var(--announcement-height, 0px)); padding: 24px 28px; flex: 1; display: flex; flex-direction: column; gap: 24px; }
        .page-action-header { padding: 24px 28px; display: flex; align-items: center; justify-content: space-between; }
        .page-action-header h2 { font-family: var(--font-heading); font-size: 1.5rem; }
        .page-action-header p { color: var(--text-secondary); font-size: 0.9rem; }
        .settings-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
        .settings-card { padding: 24px; display: flex; flex-direction: column; gap: 12px; }
        .card-hdr { display: flex; align-items: center; gap: 10px; font-family: var(--font-heading); font-size: 1.1rem; }
        .settings-card p { font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5; }
        :global(.icon-purple) { color: var(--primary); }
        :global(.icon-blue) { color: var(--secondary); }
        :global(.icon-green) { color: var(--success); }
        @media (max-width: 1024px) {
          .crm-main-content {
            margin-left: 0 !important;
            margin-top: calc(58px + var(--announcement-height, 0px) + 6px) !important;
            width: 100% !important;
            padding: 14px 12px !important;
          }
          .page-action-header { flex-direction: column; align-items: flex-start; gap: 12px; }
        }
        @media (max-width: 640px) {
          .settings-grid { grid-template-columns: 1fr !important; gap: 14px !important; }
          .settings-card { padding: 18px 14px !important; }
        }
      `}</style>
    </div>
  );
}
