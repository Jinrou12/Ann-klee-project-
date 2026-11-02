import React, { useState, useEffect } from 'react';
import { Users, Sparkles, Database, Wifi, WifiOff } from 'lucide-react';

export default function Header({
  metadata,
  studentCount = 0,
  trainingCount = 0,
  hasApiKey = true,
  cloudStatus = 'idle',
  onExportTrainingDataset,
  onOpenStudentMaster,
  onOpenSettings,
  onExportBackup,
  onImportBackup,
  onPrint
}) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header className="no-print" style={{
      background: 'linear-gradient(135deg, #78350f 0%, #b45309 60%, #d97706 100%)',
      color: '#ffffff',
      padding: '12px 20px',
      boxShadow: '0 4px 12px rgba(180, 83, 9, 0.25)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        {/* Left: Branding & Institution */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img
            src="/logo.png"
            alt="ពុទ្ធិកបឋមសិក្សាកម្រង ហ៊ុន ណេង Logo"
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              objectFit: 'contain',
              background: '#ffffff',
              padding: 2,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              border: '2px solid rgba(255, 255, 255, 0.8)'
            }}
          />
          <div>
            <h1 className="font-moul" style={{ fontSize: 15, margin: 0, textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
              {metadata.school}
            </h1>
            <p style={{ fontSize: 12, opacity: 0.9, margin: 0 }}>
              {metadata.ministry} • {metadata.location}
            </p>
          </div>
        </div>

        {/* Right: Actions and Status Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Online/Offline & AI Vision Status */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: (isOnline && hasApiKey) ? 'rgba(22, 101, 52, 0.45)' : isOnline ? 'rgba(180, 83, 9, 0.45)' : 'rgba(185, 28, 28, 0.45)',
            border: `1px solid ${(isOnline && hasApiKey) ? 'rgba(74, 222, 128, 0.5)' : isOnline ? 'rgba(251, 191, 36, 0.5)' : 'rgba(248, 113, 113, 0.4)'}`,
            padding: '4px 10px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600
          }}>
            {isOnline && hasApiKey ? (
              <>
                <Sparkles size={14} color="#86efac" />
                <span style={{ color: '#dcfce7' }}>AI Vision សកម្ម (Gemini)</span>
              </>
            ) : isOnline ? (
              <>
                <Wifi size={14} color="#fde047" />
                <span style={{ color: '#fef08a' }}>Online (គ្មាន AI Key)</span>
              </>
            ) : (
              <>
                <WifiOff size={14} color="#fca5a5" />
                <span style={{ color: '#fee2e2' }}>Offline Mode</span>
              </>
            )}
          </div>

          {/* Cloud Database Sync Status */}
          {cloudStatus === 'connected' && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: 'rgba(15, 118, 110, 0.45)',
              border: '1px solid rgba(45, 212, 191, 0.5)',
              padding: '4px 10px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              color: '#ccfbf1'
            }} title="ភ្ជាប់ Cloud Database (Supabase) ដោយជោគជ័យ">
              <Database size={13} color="#2dd4bf" />
              <span>Cloud Sync</span>
            </div>
          )}
          {cloudStatus === 'syncing' && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: 'rgba(217, 119, 6, 0.45)',
              border: '1px solid rgba(251, 191, 36, 0.5)',
              padding: '4px 10px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              color: '#fef08a'
            }}>
              <Database size={13} color="#fde047" />
              <span>Syncing...</span>
            </div>
          )}

          {/* Discreet Student Master Button (Rule requirement: unobtrusive/subtle) */}
          <button
            onClick={onOpenStudentMaster}
            title="គ្រប់គ្រងបញ្ជីឈ្មោះសមណសិស្ស"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: '#ffffff',
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            <Users size={16} />
            <span className="hide-on-mobile">បញ្ជីសិស្ស</span>
            <span style={{
              background: '#ffffff',
              color: '#92400e',
              fontSize: 11,
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: 10
            }}>
              {studentCount}
            </span>
          </button>

          {/* AI Key, Backup, Restore, Print — managed automatically in backend (hidden from UI) */}
        </div>
      </div>
    </header>
  );
}
