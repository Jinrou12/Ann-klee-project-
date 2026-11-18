import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  RefreshCw,
  Plus,
  ExternalLink,
  X
} from 'lucide-react';
import {
  getTelegramConfig,
  saveTelegramConfig,
  saveDeviceTelegramBinding,
  removeDeviceTelegramAccount,
  selectDeviceActiveAccount,
  getActiveRecipients,
  createDeviceLinkToken,
  getTelegramDeepLinks,
  getBaselineUpdateId,
  checkDeviceLinkUpdate,
  isTelegramConfigured,
  syncSubscribersSilent,
  captureAndSendToTelegram
} from '../utils/telegramService';
import { toKhmerDigits } from '../utils/khmerNumerals';
import { loadAuthSession } from '../utils/auth';

/**
 * Reusable «✈️ Telegram ▾» Button, Floating Menu & PWA-Safe Native Link Modal (/mp)
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

  // PWA-safe In-App Link Modal state (avoids window.confirm / async window.open popup blocking in Home Screen apps)
  const [linkModal, setLinkModal] = useState(null); // { pendingFormat: 'pdf' | 'word' | 'excel' | null, baselineUpdateId: number, promptStartSec: number }
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

  const showToast = useCallback((type, message, duration = 4500) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, duration);
  }, []);

  const openTelegramSettingsModal = useCallback(() => {
    setIsOpen(false);
    window.dispatchEvent(new CustomEvent('open-telegram-settings'));
  }, []);

  const executeFileExportAndSend = useCallback(async (formatType) => {
    let exportRunner = null;
    if (formatType === 'pdf' && onExportPdf) {
      exportRunner = async () => {
        await onExportPdf();
      };
    } else if (formatType === 'word' && onExportWord) {
      exportRunner = async () => {
        await onExportWord();
      };
    } else if (formatType === 'excel' && onExportExcel) {
      exportRunner = async () => {
        await onExportExcel();
      };
    }
    if (!exportRunner) return;

    try {
      setIsSending(true);
      setSendingLabel(
        formatType === 'pdf'
          ? 'កំពុងបញ្ជូន PDF...'
          : formatType === 'word'
            ? 'កំពុងបញ្ជូន Word...'
            : 'កំពុងបញ្ជូន Excel...'
      );

      const { fileNames, recipientNames } = await captureAndSendToTelegram(exportRunner, {
        reportTitle
      });

      const currentOwner = loadAuthSession()?.role === 'owner';
      const targetDisplay =
        Array.isArray(recipientNames) && recipientNames.length > 0
          ? recipientNames.join(', ')
          : getTelegramConfig().chatTitle || 'Telegram';
      showToast(
        'success',
        currentOwner
          ? `បានផ្ញើចូល Telegram (${targetDisplay}) ដោយជោគជ័យ! (${toKhmerDigits(fileNames.length)} ឯកសារ)`
          : `បានផ្ញើឯកសារចូល Telegram (${targetDisplay}) ដោយជោគជ័យ!`
      );
    } catch (err) {
      if (err?.code === 'DEVICE_NOT_LINKED') {
        const linkToken = createDeviceLinkToken();
        const promptStartSec = Math.floor(Date.now() / 1000) - 2;
        setLinkModal({
          pendingFormat: formatType,
          linkToken,
          baselineUpdateId: null,
          promptStartSec
        });
        const baseId = await getBaselineUpdateId();
        setLinkModal(prev =>
          prev && prev.linkToken === linkToken
            ? { ...prev, baselineUpdateId: baseId }
            : prev
        );
        return;
      }
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
  }, [onExportPdf, onExportWord, onExportExcel, reportTitle, showToast, openTelegramSettingsModal]);

  // Background polling & visibility listener while the In-App Link Modal is open
  useEffect(() => {
    if (!linkModal) return undefined;
    let cancelled = false;

    const checkOnce = async () => {
      if (cancelled) return;
      const bound = await checkDeviceLinkUpdate({
        linkToken: linkModal.linkToken,
        baselineUpdateId: linkModal.baselineUpdateId,
        promptStartSec: linkModal.promptStartSec
      });
      if (cancelled || !bound) return;

      const formatToRun = linkModal.pendingFormat;
      setLinkModal(null);
      setTgConfig(getTelegramConfig());

      if (formatToRun) {
        executeFileExportAndSend(formatToRun);
      } else {
        showToast('success', `បានភ្ជាប់គណនី Telegram «${bound.title}» រួចរាល់!`);
      }
    };

    const intervalId = setInterval(checkOnce, 1500);
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        checkOnce();
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [linkModal, executeFileExportAndSend, showToast]);

  const computeMenuPosition = (ownerRole = isOwner) => {
    if (!buttonRef.current || typeof window === 'undefined') return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = Math.min(308, window.innerWidth - 16);
    const estimatedMenuHeight = ownerRole ? 340 : 250;

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
      syncSubscribersSilent().then(updated => setTgConfig(updated));
    }
    setIsOpen(prev => !prev);
  };

  const handleSelectTargetRecipient = (targetChatId, targetTitle = '') => {
    if (!isOwner) {
      selectDeviceActiveAccount(targetChatId);
      setTgConfig(getTelegramConfig());
      return;
    }
    const isAll = targetChatId === 'ALL';
    const nextCfg = saveTelegramConfig({
      ...tgConfig,
      chatId: isAll ? 'ALL' : targetChatId,
      chatTitle: isAll ? '' : targetTitle,
      targetMode: isAll ? 'ALL' : 'SINGLE'
    });
    setTgConfig(nextCfg);
  };

  const handleRemoveDeviceAccount = (e, targetChatId, targetTitle = '') => {
    if (e) e.stopPropagation();
    removeDeviceTelegramAccount(targetChatId);
    setTgConfig(getTelegramConfig());
    showToast('success', `បានដកគណនី «${targetTitle || targetChatId}» ចេញពីឧបករណ៍នេះរួចរាល់។`, 3000);
  };

  const handleQuickBindExistingSubscriber = (sub) => {
    if (!sub || !sub.chatId) return;
    const formatToRun = linkModal?.pendingFormat || null;
    saveDeviceTelegramBinding(
      {
        chatId: sub.chatId,
        title: sub.title,
        username: sub.username || ''
      },
      { setAsActive: true }
    );
    setLinkModal(null);
    setTgConfig(getTelegramConfig());
    if (formatToRun) {
      executeFileExportAndSend(formatToRun);
    } else {
      showToast('success', `បានភ្ជាប់ និងប្ដូរទៅគណនី Telegram «${sub.title}» រួចរាល់!`);
    }
  };

  const openDeviceLinkModal = async (pendingFormat = null) => {
    setIsOpen(false);
    const linkToken = createDeviceLinkToken();
    const promptStartSec = Math.floor(Date.now() / 1000) - 2;
    setLinkModal({
      pendingFormat,
      linkToken,
      baselineUpdateId: null,
      promptStartSec
    });
    const [baseId, updatedCfg] = await Promise.all([
      getBaselineUpdateId(),
      syncSubscribersSilent()
    ]);
    setTgConfig(updatedCfg);
    setLinkModal(prev =>
      prev && prev.linkToken === linkToken
        ? { ...prev, baselineUpdateId: baseId }
        : prev
    );
  };

  const handleSendFormat = async (formatType) => {
    setIsOpen(false);

    if (!isTelegramConfigured()) {
      showToast('error', 'សូមបញ្ចូល Telegram Bot Token ជាមុនសិន!');
      openTelegramSettingsModal();
      return;
    }

    // Synchronous check: if this non-Owner device isn't bound yet, open the PWA-safe Link Modal immediately!
    const currentRecipients = getActiveRecipients();
    if (currentRecipients.length === 0) {
      openDeviceLinkModal(formatType);
      return;
    }

    await executeFileExportAndSend(formatType);
  };

  const subscribers = Array.isArray(tgConfig.subscribers) ? tgConfig.subscribers : [];
  const configured = Boolean(tgConfig.botToken && subscribers.length > 0);
  const isAllSelected = tgConfig.targetMode === 'ALL' || tgConfig.chatId === 'ALL';
  const deepLinks = getTelegramDeepLinks(linkModal?.linkToken || null);

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
            {/* Header Status & Recipient Switcher Bar */}
            {isOwner ? (
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
            ) : (
              /* Non-Owner Device Account Switcher (Strictly shows ONLY accounts linked on THIS device) */
              <div
                style={{
                  padding: '8px 10px',
                  background: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: '#475569' }}>
                    គណនី Telegram លើឧបករណ៍នេះ៖
                  </span>
                  <button
                    type="button"
                    onClick={() => openDeviceLinkModal(null)}
                    style={{
                      background: '#e0f2fe',
                      color: '#0284c7',
                      border: '1px solid #7dd3fc',
                      borderRadius: 12,
                      padding: '2px 7px',
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3
                    }}
                  >
                    <Plus size={10} />
                    <span>ភ្ជាប់គណនីបន្ថែម</span>
                  </button>
                </div>

                {Array.isArray(tgConfig.myDeviceAccounts) && tgConfig.myDeviceAccounts.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {tgConfig.myDeviceAccounts.map(sub => {
                      const active = String(tgConfig.chatId) === String(sub.chatId);
                      return (
                        <div
                          key={sub.chatId}
                          style={{
                            background: active ? '#0284c7' : '#ffffff',
                            color: active ? '#ffffff' : '#334155',
                            border: active ? '1.5px solid #0369a1' : '1px solid #cbd5e1',
                            borderRadius: 20,
                            padding: '3px 6px 3px 9px',
                            fontSize: 11,
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            maxWidth: '100%'
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => handleSelectTargetRecipient(sub.chatId, sub.title)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'inherit',
                              padding: 0,
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              minWidth: 0
                            }}
                          >
                            <User size={11} />
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }}>
                              {sub.title}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleRemoveDeviceAccount(e, sub.chatId, sub.title)}
                            title={`ដកគណនី «${sub.title}» ចេញពីឧបករណ៍នេះ`}
                            style={{
                              background: active ? 'rgba(255,255,255,0.22)' : '#f1f5f9',
                              color: active ? '#ffffff' : '#64748b',
                              border: 'none',
                              borderRadius: '50%',
                              width: 16,
                              height: 16,
                              padding: 0,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              flexShrink: 0,
                              marginLeft: 2
                            }}
                          >
                            <X size={10} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    មិនទាន់បានភ្ជាប់ទេ (ចុចប៊ូតុងផ្ញើខាងក្រោមដើម្បីភ្ជាប់ស្វ័យប្រវត្តិ)
                  </div>
                )}
              </div>
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

      {/* PWA-Safe In-App Telegram Link Alert Modal (Works 100% in Home Screen Apps & Browsers) */}
      {linkModal && (
        <div
          className="no-print"
          onClick={() => setLinkModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1420,
            background: 'rgba(15, 23, 42, 0.62)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 380,
              background: '#ffffff',
              borderRadius: 16,
              border: '1.5px solid #7dd3fc',
              boxShadow: '0 20px 44px rgba(15, 23, 42, 0.35)',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #0088cc 0%, #0284c7 100%)',
                color: '#ffffff',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <Send size={18} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>
                    ភ្ជាប់ឧបករណ៍ទៅកាន់ Telegram
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.9 }}>
                    លេខសម្គាល់ឧបករណ៍៖ {deepLinks.deviceId}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLinkModal(null)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: '#ffffff',
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 11 }}>
              <div
                style={{
                  fontSize: 12.5,
                  color: '#1e293b',
                  lineHeight: 1.55,
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: 10,
                  padding: '10px 12px'
                }}
              >
                ១. បើបងបានប្ដូរ (Switch) ទៅគណនី Telegram ទី ២ រួចហើយ សូមចុចប៊ូតុងខាងក្រោមដើម្បីបើក{' '}
                <strong>@{deepLinks.botUsername}</strong> រួចចុចប៊ូតុង{' '}
                <strong style={{ color: '#0284c7' }}>&ldquo;Start&rdquo;</strong> (ឬផ្ញើសារ{' '}
                <code style={{ background: '#e0f2fe', padding: '1px 5px', borderRadius: 4 }}>/start</code> ១ ម៉ាត់)៖
              </div>

              {/* Clean Direct Native App Link (tg:// protocol without duplicate setTimeout window.open interference) */}
              <a
                href={deepLinks.tgProtocolUrl}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #0088cc 0%, #0284c7 100%)',
                  color: '#ffffff',
                  textDecoration: 'none',
                  padding: '11px 14px',
                  borderRadius: 10,
                  fontSize: 13.5,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                  boxSizing: 'border-box'
                }}
              >
                <Send size={16} />
                <span>📲 បើកកម្មវិធី Telegram (ចុច Start)</span>
                <ExternalLink size={14} />
              </a>

              <div style={{ textAlign: 'center', marginTop: -4 }}>
                <a
                  href={deepLinks.httpsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 11,
                    color: '#0284c7',
                    fontWeight: 700,
                    textDecoration: 'underline'
                  }}
                >
                  ឬបើកតាមតំណ Web (t.me/{deepLinks.botUsername}) ជំនួស
                </a>
              </div>

              {/* Quick 1-Tap Picker for accounts that have ALREADY pressed /start in @Annkhlebot */}
              {subscribers.length > 0 && (
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: '9px 11px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#334155' }}>
                      ២. ឬជ្រើសរើសគណនីដែលបានចុច Start រួចហើយ៖
                    </span>
                    <button
                      type="button"
                      onClick={handleRefreshSubscribers}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#0284c7',
                        borderRadius: 6,
                        padding: '2px 6px',
                        fontSize: 10,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3
                      }}
                    >
                      <RefreshCw size={10} className={isSyncingUsers ? 'animate-spin' : ''} />
                      <span>ស្កេនថ្មី</span>
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {subscribers.map(sub => {
                      const alreadyLinked =
                        Array.isArray(tgConfig.myDeviceAccounts) &&
                        tgConfig.myDeviceAccounts.some(a => String(a.chatId) === String(sub.chatId));
                      const isCurrentActive = String(tgConfig.chatId) === String(sub.chatId);
                      return (
                        <button
                          key={sub.chatId}
                          type="button"
                          onClick={() => handleQuickBindExistingSubscriber(sub)}
                          style={{
                            background: isCurrentActive ? '#0284c7' : alreadyLinked ? '#e0f2fe' : '#ffffff',
                            color: isCurrentActive ? '#ffffff' : '#0c4a6e',
                            border: isCurrentActive ? '1.5px solid #0369a1' : '1px solid #7dd3fc',
                            borderRadius: 18,
                            padding: '5px 10px',
                            fontSize: 11.5,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          {alreadyLinked ? <User size={11} /> : <Plus size={11} />}
                          <span>{sub.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Live Waiting Indicator */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  fontSize: 12,
                  color: '#0369a1',
                  fontWeight: 700,
                  padding: '2px 0'
                }}
              >
                <Loader2 size={15} className="animate-spin" />
                <span>កំពុងរង់ចាំការចុច Start ពីគណនី Telegram ថ្មី...</span>
              </div>

              <button
                type="button"
                onClick={() => setLinkModal(null)}
                style={{
                  width: '100%',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: 9,
                  padding: '9px 14px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                បោះបង់
              </button>
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
