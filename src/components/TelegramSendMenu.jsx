import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  FileText,
  FileSpreadsheet,
  Settings,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  Users,
  User,
  RefreshCw
} from 'lucide-react';
import {
  getTelegramConfig,
  saveTelegramConfig,
  isTelegramConfigured,
  syncSubscribersSilent,
  captureAndSendToTelegram
} from '../utils/telegramService';
import { toKhmerDigits } from '../utils/khmerNumerals';
import { loadAuthSession } from '../utils/auth';

/**
 * Reusable «✈️ Telegram ▾» Button & Floating Menu for both PC and Mobile (/mp)
 * Supports broadcasting to ALL Telegram accounts that clicked /start on the Bot,
 * or selecting a specific recipient account on the fly.
 */
export default function TelegramSendMenu({
  onExportPdf,
  onExportWord,
  onExportExcel,
  reportTitle = 'របាយការណ៍ផ្លូវការ',
  compact = false,
  fullWidth = false,
  buttonStyle = {}
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSyncingUsers, setIsSyncingUsers] = useState(false);
  const [sendingLabel, setSendingLabel] = useState('');
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: string }
  const [tgConfig, setTgConfig] = useState(() => getTelegramConfig());
  const [isOwner, setIsOwner] = useState(() => loadAuthSession()?.role === 'owner');
  const [menuCoords, setMenuCoords] = useState({ top: 0, left: 0, width: 295 });
  const buttonRef = useRef(null);

  useEffect(() => {
    const refreshConfig = () => {
      setTgConfig(getTelegramConfig());
      setIsOwner(loadAuthSession()?.role === 'owner');
    };
    window.addEventListener('telegram-config-updated', refreshConfig);
    window.addEventListener('storage', refreshConfig);
    return () => {
      window.removeEventListener('telegram-config-updated', refreshConfig);
      window.removeEventListener('storage', refreshConfig);
    };
  }, []);

  const showToast = (type, message, duration = 4500) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, duration);
  };

  const openTelegramSettingsModal = () => {
    setIsOpen(false);
    window.dispatchEvent(new CustomEvent('open-telegram-settings'));
  };

  const computeMenuPosition = (ownerRole = isOwner) => {
    if (!buttonRef.current || typeof window === 'undefined') return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = Math.min(308, window.innerWidth - 16);
    const estimatedMenuHeight = ownerRole ? 380 : 250;

    let left = rect.right - menuWidth;
    if (left < 8) left = 8;
    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8;
    }

    let top = rect.bottom + 6;
    if (top + estimatedMenuHeight > window.innerHeight - 10 && rect.top > estimatedMenuHeight + 10) {
      top = Math.max(10, rect.top - estimatedMenuHeight - 6);
    }

    setMenuCoords({ top, left, width: menuWidth });
  };

  const handleRefreshSubscribers = async (e) => {
    if (e) e.stopPropagation();
    setIsSyncingUsers(true);
    try {
      const updated = await syncSubscribersSilent();
      setTgConfig(updated);
    } finally {
      setIsSyncingUsers(false);
    }
  };

  const handleToggleMenu = () => {
    if (isSending) return;
    if (!isOpen) {
      const currentOwner = loadAuthSession()?.role === 'owner';
      setIsOwner(currentOwner);
      setTgConfig(getTelegramConfig());
      computeMenuPosition(currentOwner);
      // Automatically scan for any new users who clicked /start on the Bot
      syncSubscribersSilent().then(updated => setTgConfig(updated));
    }
    setIsOpen(prev => !prev);
  };

  const handleSelectTargetRecipient = (targetChatId, targetTitle = '') => {
    const isAll = targetChatId === 'ALL';
    const nextCfg = saveTelegramConfig({
      ...tgConfig,
      chatId: isAll ? 'ALL' : targetChatId,
      chatTitle: isAll ? '' : targetTitle,
      targetMode: isAll ? 'ALL' : 'SINGLE'
    });
    setTgConfig(nextCfg);
  };

  const handleSendFormat = async (formatType) => {
    setIsOpen(false);

    if (!isTelegramConfigured()) {
      showToast(
        'error',
        'សូមបញ្ចូល Telegram Bot Token និងចុច /start ជាមុនសិន!'
      );
      openTelegramSettingsModal();
      return;
    }

    let exportRunner = null;
    let formatLabel = '';

    if (formatType === 'pdf' && onExportPdf) {
      exportRunner = async () => {
        await onExportPdf();
      };
      formatLabel = 'ឯកសារ PDF (.pdf)';
    } else if (formatType === 'word' && onExportWord) {
      exportRunner = async () => {
        await onExportWord();
      };
      formatLabel = 'ឯកសារ Word (.docx)';
    } else if (formatType === 'excel' && onExportExcel) {
      exportRunner = async () => {
        await onExportExcel();
      };
      formatLabel = 'ឯកសារ Excel (.xlsx)';
    } else if (formatType === 'all') {
      exportRunner = async () => {
        if (onExportPdf) await onExportPdf();
        if (onExportWord) await onExportWord();
        if (onExportExcel) await onExportExcel();
      };
      formatLabel = 'កញ្ចប់ឯកសារពេញលេញ (PDF + Word + Excel)';
    }

    if (!exportRunner) return;

    try {
      setIsSending(true);
      setSendingLabel(
        formatType === 'pdf'
          ? 'កំពុងបញ្ជូន PDF...'
          : formatType === 'word'
            ? 'កំពុងបញ្ជូន Word...'
            : formatType === 'excel'
              ? 'កំពុងបញ្ជូន Excel...'
              : 'កំពុងបញ្ជូនទាំងអស់...'
      );

      const { fileNames, recipientNames } = await captureAndSendToTelegram(exportRunner, {
        reportTitle,
        formatLabel
      });

      const targetDisplay =
        Array.isArray(recipientNames) && recipientNames.length > 0
          ? recipientNames.join(', ')
          : tgConfig.chatTitle || 'Telegram';
      showToast(
        'success',
        isOwner
          ? `បានផ្ញើចូល Telegram (${targetDisplay}) ដោយជោគជ័យ! (${toKhmerDigits(fileNames.length)} ឯកសារ)`
          : `បានផ្ញើឯកសារចូល Telegram ដោយជោគជ័យ! (${toKhmerDigits(fileNames.length)} ឯកសារ)`
      );
    } catch (err) {
      if (err?.code === 'TELEGRAM_NOT_CONFIGURED') {
        openTelegramSettingsModal();
        return;
      }
      console.error('Telegram send failed:', err);
      showToast(
        'error',
        'បរាជ័យក្នុងការផ្ញើទៅ Telegram៖ ' + (err?.message || 'Error')
      );
    } finally {
      setIsSending(false);
      setSendingLabel('');
    }
  };

  const subscribers = Array.isArray(tgConfig.subscribers) ? tgConfig.subscribers : [];
  const configured = Boolean(tgConfig.botToken && subscribers.length > 0);
  const isAllSelected = tgConfig.targetMode === 'ALL' || tgConfig.chatId === 'ALL';

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggleMenu}
        disabled={isSending}
        title="ផ្ញើឯកសារ PDF, Word ឬ Excel ចូលទៅកាន់ Telegram Bot ផ្ទាល់"
        style={{
          background: 'linear-gradient(135deg, #0088cc 0%, #0284c7 100%)',
          color: '#ffffff',
          border: 'none',
          borderRadius: 8,
          padding: compact ? '9px 10px' : '7px 14px',
          fontSize: compact ? 12.5 : 13,
          fontWeight: 700,
          display: fullWidth ? 'flex' : 'inline-flex',
          width: fullWidth ? '100%' : 'auto',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          cursor: isSending ? 'wait' : 'pointer',
          opacity: isSending ? 0.8 : 1,
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 6px rgba(0, 136, 204, 0.28)',
          ...buttonStyle
        }}
      >
        {isSending ? (
          <Loader2 size={compact ? 14 : 15} className="animate-spin" />
        ) : (
          <Send size={compact ? 14 : 15} />
        )}
        <span>{isSending ? sendingLabel || 'កំពុងផ្ញើ...' : 'Telegram'}</span>
        {!isSending && <ChevronDown size={13} style={{ opacity: 0.9 }} />}
      </button>

      {/* Fixed Popover Menu with Click-Outside Backdrop */}
      {isOpen && (
        <div
          className="no-print"
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1350,
            background: 'rgba(15, 23, 42, 0.14)'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: menuCoords.top,
              left: menuCoords.left,
              width: menuCoords.width,
              background: '#ffffff',
              borderRadius: 14,
              border: '1.5px solid #bae6fd',
              boxShadow: '0 14px 36px rgba(15, 23, 42, 0.25)',
              overflow: 'hidden',
              zIndex: 1351
            }}
          >
            {/* Header Status & Recipient Switcher Bar (Visible to Owner Only) */}
            {isOwner && (
              <>
                <div
                  style={{
                    background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                    padding: '10px 12px',
                    borderBottom: '1px solid #bae6fd',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: configured ? '#16a34a' : '#f59e0b',
                        flexShrink: 0
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#0c4a6e' }}>
                        ផ្ញើចូល Telegram (@{tgConfig.botUsername || 'Annkhlebot'})
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: configured ? '#15803d' : '#b45309',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {isAllSelected
                          ? `គោលដៅ៖ គ្រប់គណនីទាំងអស់ (${toKhmerDigits(subscribers.length)} គណនី)`
                          : `គោលដៅ៖ ${tgConfig.chatTitle}`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={handleRefreshSubscribers}
                      title="ស្កេនរកគណនីថ្មីដែលទើបចុច /start"
                      style={{
                        background: '#ffffff',
                        border: '1px solid #7dd3fc',
                        color: '#0284c7',
                        borderRadius: 8,
                        padding: '5px 7px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <RefreshCw size={13} className={isSyncingUsers ? 'animate-spin' : ''} />
                    </button>
                    <button
                      type="button"
                      onClick={openTelegramSettingsModal}
                      title="កំណត់ Telegram Bot Token និង Chat ID"
                      style={{
                        background: '#ffffff',
                        border: '1px solid #7dd3fc',
                        color: '#0284c7',
                        borderRadius: 8,
                        padding: '5px 8px',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <Settings size={13} />
                      <span>កំណត់</span>
                    </button>
                  </div>
                </div>

                {subscribers.length > 0 && (
                  <div
                    style={{
                      padding: '8px 10px',
                      background: '#f8fafc',
                      borderBottom: '1px solid #e2e8f0'
                    }}
                  >
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: '#475569', marginBottom: 5 }}>
                      ជ្រើសរើសគណនីទទួលឯកសារ៖
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      <button
                        type="button"
                        onClick={() => handleSelectTargetRecipient('ALL')}
                        style={{
                          background: isAllSelected ? '#0284c7' : '#ffffff',
                          color: isAllSelected ? '#ffffff' : '#334155',
                          border: isAllSelected ? '1.5px solid #0369a1' : '1px solid #cbd5e1',
                          borderRadius: 20,
                          padding: '4px 9px',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <Users size={12} />
                        <span>ទាំងអស់ ({toKhmerDigits(subscribers.length)})</span>
                      </button>

                      {subscribers.map(sub => {
                        const active = !isAllSelected && String(tgConfig.chatId) === String(sub.chatId);
                        return (
                          <button
                            key={sub.chatId}
                            type="button"
                            onClick={() => handleSelectTargetRecipient(sub.chatId, sub.title)}
                            style={{
                              background: active ? '#0284c7' : '#ffffff',
                              color: active ? '#ffffff' : '#334155',
                              border: active ? '1.5px solid #0369a1' : '1px solid #cbd5e1',
                              borderRadius: 20,
                              padding: '4px 9px',
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              maxWidth: '100%'
                            }}
                          >
                            <User size={11} />
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>
                              {sub.title}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Menu Action List */}
            <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {onExportPdf && (
                <button
                  type="button"
                  onClick={() => handleSendFormat('pdf')}
                  style={{
                    width: '100%',
                    background: '#fff1f2',
                    border: '1px solid #fecdd3',
                    borderRadius: 9,
                    padding: '9px 11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: '#dc2626',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <FileText size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: '#881337' }}>
                      ផ្ញើជា PDF ចូល Telegram
                    </div>
                    <div style={{ fontSize: 10.5, color: '#9f1239' }}>
                      ទម្រង់ក្រដាសរដ្ឋបាលផ្លូវការ (.pdf)
                    </div>
                  </div>
                </button>
              )}

              {onExportWord && (
                <button
                  type="button"
                  onClick={() => handleSendFormat('word')}
                  style={{
                    width: '100%',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: 9,
                    padding: '9px 11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: '#1d4ed8',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <FileText size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: '#1e3a8a' }}>
                      ផ្ញើជា Word ចូល Telegram
                    </div>
                    <div style={{ fontSize: 10.5, color: '#1d4ed8' }}>
                      ឯកសារកែសម្រួលបាន (.docx)
                    </div>
                  </div>
                </button>
              )}

              {onExportExcel && (
                <button
                  type="button"
                  onClick={() => handleSendFormat('excel')}
                  style={{
                    width: '100%',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: 9,
                    padding: '9px 11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: '#15803d',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <FileSpreadsheet size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: '#14532d' }}>
                      ផ្ញើជា Excel ចូល Telegram
                    </div>
                    <div style={{ fontSize: 10.5, color: '#15803d' }}>
                      តារាងទិន្នន័យផ្លូវការ (.xlsx)
                    </div>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Status Toast */}
      {toast && (
        <div
          className="no-print"
          style={{
            position: 'fixed',
            left: '50%',
            bottom: 32,
            transform: 'translateX(-50%)',
            background: toast.type === 'success' ? '#065f46' : '#991b1b',
            color: '#ffffff',
            padding: '10px 16px',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 700,
            zIndex: 1450,
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            maxWidth: '92vw'
          }}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 size={17} color="#6ee7b7" style={{ flexShrink: 0 }} />
          ) : (
            <AlertCircle size={17} color="#fca5a5" style={{ flexShrink: 0 }} />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </>
  );
}
