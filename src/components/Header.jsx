import React, { useState, useEffect } from 'react';
import {
  Users,
  Sparkles,
  Database,
  Wifi,
  WifiOff,
  Calendar,
  FolderOpen,
  Folder,
  Plus,
  X,
  ChevronDown,
  CheckCircle2
} from 'lucide-react';
import { toKhmerDigits } from '../utils/khmerNumerals';

export default function Header({
  metadata,
  activeYear = '2026',
  yearStatsList = [],
  onSelectYear,
  onAddYear,
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
  const [isYearDrawerOpen, setIsYearDrawerOpen] = useState(false);
  const [newYearInput, setNewYearInput] = useState('');
  const [showAddYearForm, setShowAddYearForm] = useState(false);

  const useKhmerNumerals = metadata?.useKhmerNumerals !== false;
  const fmtNum = (n) => (useKhmerNumerals ? toKhmerDigits(n) : String(n));

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

  const handleChooseYear = (yr) => {
    if (onSelectYear) {
      onSelectYear(String(yr));
    }
    setIsYearDrawerOpen(false);
  };

  const handleCreateNewYear = (e) => {
    e.preventDefault();
    const cleaned = String(newYearInput || '').trim();
    if (!/^\d{4}$/.test(cleaned)) return;
    if (onAddYear) {
      onAddYear(cleaned);
    }
    setNewYearInput('');
    setShowAddYearForm(false);
    setIsYearDrawerOpen(false);
  };

  return (
    <>
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
          {/* Left: Clickable School Logo & Branding -> Opens Left Year Drawer */}
          <div
            onClick={() => setIsYearDrawerOpen(true)}
            title="ចុចទីនេះដើម្បីប្ដូរឆ្នាំទិន្នន័យ (២០២៥, ២០២៦, ២០២៧...)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              cursor: 'pointer'
            }}
          >
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
                border: '2px solid rgba(255, 255, 255, 0.8)',
                flexShrink: 0
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
            <div
              title={isOnline && hasApiKey ? "AI Vision សកម្ម (Gemini)" : isOnline ? "Online (គ្មាន AI Key)" : "Offline Mode"}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: (isOnline && hasApiKey) ? 'rgba(22, 101, 52, 0.45)' : isOnline ? 'rgba(180, 83, 9, 0.45)' : 'rgba(185, 28, 28, 0.45)',
                border: `1px solid ${(isOnline && hasApiKey) ? 'rgba(74, 222, 128, 0.5)' : isOnline ? 'rgba(251, 191, 36, 0.5)' : 'rgba(248, 113, 113, 0.4)'}`,
                padding: '6px 8px',
                borderRadius: 20
              }}
            >
              {isOnline && hasApiKey ? (
                <Sparkles size={15} color="#86efac" />
              ) : isOnline ? (
                <Wifi size={15} color="#fde047" />
              ) : (
                <WifiOff size={15} color="#fca5a5" />
              )}
            </div>

            {/* Cloud Database Sync Status */}
            {cloudStatus === 'connected' && (
              <div
                title="ភ្ជាប់ Cloud Database (Supabase) ដោយជោគជ័យ"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(15, 118, 110, 0.45)',
                  border: '1px solid rgba(45, 212, 191, 0.5)',
                  padding: '6px 8px',
                  borderRadius: 20
                }}
              >
                <Database size={15} color="#2dd4bf" />
              </div>
            )}
            {cloudStatus === 'syncing' && (
              <div
                title="កំពុងដំណើរការ Syncing..."
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(217, 119, 6, 0.45)',
                  border: '1px solid rgba(251, 191, 36, 0.5)',
                  padding: '6px 8px',
                  borderRadius: 20
                }}
              >
                <Database size={15} color="#fde047" className="spin" />
              </div>
            )}

            {/* Discreet Student Master Button */}
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
          </div>
        </div>
      </header>

      {/* ================================================================== */}
      {/* LEFT SIDEBAR DRAWER FOR SELECTING YEAR (2025, 2026, 2027...)       */}
      {/* ================================================================== */}
      {isYearDrawerOpen && (
        <div
          className="no-print"
          onClick={() => setIsYearDrawerOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(2px)',
            zIndex: 999,
            display: 'flex',
            justifyContent: 'flex-start'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 320,
              maxWidth: '86vw',
              height: '100%',
              background: '#ffffff',
              boxShadow: '8px 0 28px rgba(0,0,0,0.22)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              overflowY: 'auto'
            }}
          >
            {/* Top Drawer Header */}
            <div>
              <div style={{
                background: 'linear-gradient(135deg, #78350f 0%, #b45309 100%)',
                color: '#ffffff',
                padding: '18px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img
                    src="/logo.png"
                    alt="Logo"
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: '50%',
                      background: '#ffffff',
                      padding: 2,
                      objectFit: 'contain'
                    }}
                  />
                  <div>
                    <div className="font-moul" style={{ fontSize: 13 }}>
                      {metadata.school}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.9 }}>
                      ជ្រើសរើសសៀវភៅទិន្នន័យប្រចាំឆ្នាំ
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsYearDrawerOpen(false)}
                  style={{
                    background: 'rgba(255,255,255,0.18)',
                    border: 'none',
                    color: '#ffffff',
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Year List */}
              <div style={{ padding: '16px 14px' }}>
                <div style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#64748b',
                  marginBottom: 10,
                  paddingLeft: 4
                }}>
                  📅 បញ្ជីឆ្នាំទិន្នន័យទាំងអស់៖
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {yearStatsList.map(item => {
                    const isCurrent = String(item.year) === String(activeYear);
                    return (
                      <button
                        key={item.year}
                        type="button"
                        onClick={() => handleChooseYear(item.year)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '12px 14px',
                          borderRadius: 12,
                          border: isCurrent ? '2px solid #d97706' : '1px solid #e2e8f0',
                          background: isCurrent ? '#fffbeb' : '#f8fafc',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          boxShadow: isCurrent ? '0 3px 10px rgba(217,119,6,0.12)' : 'none',
                          transition: 'all 0.15s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            background: isCurrent ? '#d97706' : '#e2e8f0',
                            color: isCurrent ? '#ffffff' : '#475569',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {isCurrent ? <FolderOpen size={20} /> : <Folder size={20} />}
                          </div>
                          <div>
                            <div style={{
                              fontSize: 15,
                              fontWeight: 800,
                              color: isCurrent ? '#92400e' : '#0f172a',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6
                            }}>
                              <span>ឆ្នាំ {fmtNum(item.year)}</span>
                              {isCurrent && (
                                <span style={{
                                  fontSize: 10,
                                  background: '#d97706',
                                  color: '#ffffff',
                                  padding: '1px 7px',
                                  borderRadius: 10,
                                  fontWeight: 700
                                }}>
                                  កំពុងបើក
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                              {item.leaveCount > 0 || item.financeCount > 0
                                ? `មានទិន្នន័យ ${fmtNum(item.activeMonthsCount)} ខែ • ច្បាប់ ${fmtNum(item.leaveCount)} លើក`
                                : 'មិនទាន់មានទិន្នន័យ (ទទេ)'}
                            </div>
                          </div>
                        </div>

                        {isCurrent && <CheckCircle2 size={18} color="#d97706" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Add New Year Action */}
            <div style={{
              padding: 14,
              borderTop: '1px solid #e2e8f0',
              background: '#f8fafc'
            }}>
              {!showAddYearForm ? (
                <button
                  type="button"
                  onClick={() => setShowAddYearForm(true)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1.5px dashed #cbd5e1',
                    background: '#ffffff',
                    color: '#334155',
                    fontSize: 13,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={16} color="#b45309" />
                  <span>បន្ថែមឆ្នាំសិក្សាថ្មី (ឧ. ២០២៨)...</span>
                </button>
              ) : (
                <form onSubmit={handleCreateNewYear} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
                    វាយបញ្ចូលឆ្នាំថ្មី (ជាលេខ ៤ ខ្ទង់ ឧ. 2028)៖
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="number"
                      min="2020"
                      max="2100"
                      placeholder="2028"
                      value={newYearInput}
                      onChange={e => setNewYearInput(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '7px 10px',
                        fontSize: 14,
                        fontWeight: 700,
                        borderRadius: 8,
                        border: '1px solid #cbd5e1'
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        background: '#b45309',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '7px 12px',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      យល់ព្រម
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddYearForm(false)}
                      style={{
                        background: '#e2e8f0',
                        color: '#475569',
                        border: 'none',
                        borderRadius: 8,
                        padding: '7px 10px',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      បិទ
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
