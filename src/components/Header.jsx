import React, { useState, useEffect } from 'react';
import { Users, Settings, Database, Printer, Wifi, WifiOff, UploadCloud, Sparkles } from 'lucide-react';

export default function Header({
  metadata,
  studentCount = 0,
  trainingCount = 0,
  hasApiKey = true,
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

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportBackup(file);
      e.target.value = '';
    }
  };

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

          {/* AI Settings Button */}
          <button
            onClick={onOpenSettings}
            title={hasApiKey ? 'AI Vision Key បានភ្ជាប់រួចរាល់' : 'ការកំណត់ AI Vision Key'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: hasApiKey ? 'rgba(22, 101, 52, 0.35)' : 'rgba(255, 255, 255, 0.12)',
              border: `1px solid ${hasApiKey ? 'rgba(74, 222, 128, 0.4)' : 'rgba(255, 255, 255, 0.25)'}`,
              color: '#ffffff',
              padding: '6px 10px',
              borderRadius: 8,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            <Settings size={16} />
            <span className="hide-on-mobile">AI Key</span>
            {hasApiKey && (
              <span style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#4ade80',
                boxShadow: '0 0 6px #4ade80'
              }} />
            )}
          </button>

          {/* AI Training Dataset Harvester Badge */}
          <button
            onClick={onExportTrainingDataset}
            title={`ទិន្នន័យបង្វឹក AI ប្រមូលបានចំនួន ${trainingCount} សន្លឹក (ចុចដើម្បីទាញយក .json)`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: trainingCount > 0 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.12)',
              border: `1px solid ${trainingCount > 0 ? 'rgba(52, 211, 153, 0.4)' : 'rgba(255, 255, 255, 0.25)'}`,
              color: '#ffffff',
              padding: '6px 10px',
              borderRadius: 8,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            <Sparkles size={16} color={trainingCount > 0 ? '#6ee7b7' : '#ffffff'} />
            <span className="hide-on-mobile">ទិន្នន័យបង្វឹក</span>
            <span style={{
              background: trainingCount > 0 ? '#059669' : 'rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              fontSize: 11,
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: 10
            }}>
              {trainingCount}
            </span>
          </button>


          {/* Backup / Restore Dropdown or Button */}
          <button
            onClick={onExportBackup}
            title="ទាញយកទិន្នន័យបម្រុងទុក (Backup JSON)"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#ffffff',
              padding: '6px 10px',
              borderRadius: 8,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            <Database size={16} />
            <span className="hide-on-mobile">Backup</span>
          </button>

          <label
            title="បញ្ចូលទិន្នន័យបម្រុងទុក (Restore JSON)"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#ffffff',
              padding: '6px 10px',
              borderRadius: 8,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            <UploadCloud size={16} />
            <span className="hide-on-mobile">Restore</span>
            <input type="file" accept=".json" onChange={handleFileChange} style={{ display: 'none' }} />
          </label>

          {/* Direct Print Button */}
          <button
            onClick={onPrint}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#ffffff',
              color: '#92400e',
              border: 'none',
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
            }}
          >
            <Printer size={16} />
            <span>បោះពុម្ព</span>
          </button>
        </div>
      </div>
    </header>
  );
}
