import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  ShieldCheck,
  ExternalLink,
  Trash2,
  Send,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MessageSquare,
  RefreshCw,
  Activity
} from 'lucide-react';
import { getStoredApiKey, setStoredApiKey } from '../utils/storage';
import {
  getGeminiKeyHealthSnapshot,
  subscribeGeminiKeyHealth,
  runFullKeyPoolHealthCheck,
  ADMIN_ALERT_CHAT_ID
} from '../utils/geminiKeyMonitor';
import {
  getTelegramConfig,
  saveTelegramConfig,
  clearTelegramConfig,
  detectTelegramChats,
  sendTelegramTestMessage
} from '../utils/telegramService';

export default function ApiKeyModal({
  isOpen,
  onClose,
  onKeySaved,
  onTelegramConfigSaved
}) {
  const [apiKey, setApiKey] = useState(() => getStoredApiKey());
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [chatTitle, setChatTitle] = useState('');
  const [botUsername, setBotUsername] = useState('');
  const [detectedChats, setDetectedChats] = useState([]);
  const [isDetectingChat, setIsDetectingChat] = useState(false);
  const [isTestingBot, setIsTestingBot] = useState(false);
  const [keyHealth, setKeyHealth] = useState(() => getGeminiKeyHealthSnapshot());
  const [saveStatus, setSaveStatus] = useState(null); // { type: 'success' | 'error' | 'info', text: string }

  useEffect(() => {
    if (!isOpen) return undefined;
    setApiKey(getStoredApiKey());
    const tg = getTelegramConfig();
    setBotToken(tg.botToken || '');
    setChatId(tg.chatId || 'ALL');
    setChatTitle(tg.chatTitle || '');
    setBotUsername(tg.botUsername || '');
    setDetectedChats(Array.isArray(tg.subscribers) ? tg.subscribers : []);
    setSaveStatus(null);
    setKeyHealth(getGeminiKeyHealthSnapshot());
    const unsub = subscribeGeminiKeyHealth(() => {
      setKeyHealth(getGeminiKeyHealthSnapshot());
    });
    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDetectChats = async () => {
    setSaveStatus(null);
    setIsDetectingChat(true);
    try {
      const { botInfo, chats } = await detectTelegramChats(botToken);
      const uname = botInfo?.username || '';
      setBotUsername(uname);
      setDetectedChats(chats);

      if (chats.length > 0) {
        setChatId('ALL');
        setChatTitle(`គ្រប់គណនីទាំងអស់ (${chats.length})`);
        const saved = saveTelegramConfig({
          botToken,
          chatId: 'ALL',
          targetMode: 'ALL',
          botUsername: uname,
          subscribers: chats
        });
        if (onTelegramConfigSaved) onTelegramConfigSaved(saved);
        const namesList = chats.map(c => c.title).join(', ');
        setSaveStatus({
          type: 'success',
          text: `រកឃើញគណនីដែលបាន Start សរុប ${chats.length} គណនី៖ ${namesList}`
        });
      } else {
        setSaveStatus({
          type: 'info',
          text: uname
            ? `Bot (@${uname}) ត្រឹមត្រូវហើយ! សូមចូល Telegram ផ្ញើសារ "/start" ទៅកាន់ @${uname} (ឬដាក់ Bot ចូល Group រួចផ្ញើសារ ១ ម៉ាត់) បន្ទាប់មកចុចប៊ូតុងស្វែងរកនេះម្ដងទៀត។`
            : 'សូមចូលទៅកាន់ Telegram ហើយចុច "/start" ក្នុង Bot របស់បង រួចចុចប៊ូតុងស្វែងរកនេះម្ដងទៀត។'
        });
      }
    } catch (err) {
      setSaveStatus({
        type: 'error',
        text: err?.message || 'មិនអាចស្វែងរក Chat ID បានទេ។'
      });
    } finally {
      setIsDetectingChat(false);
    }
  };

  const handleTestTelegram = async () => {
    setSaveStatus(null);
    setIsTestingBot(true);
    try {
      await sendTelegramTestMessage(botToken, chatId);
      const saved = saveTelegramConfig({
        botToken,
        chatId,
        chatTitle,
        botUsername
      });
      if (onTelegramConfigSaved) onTelegramConfigSaved(saved);
      setSaveStatus({
        type: 'success',
        text: 'បានផ្ញើសារសាកល្បងចូល Telegram ដោយជោគជ័យ! និងបានរក្សាទុកការកំណត់រួចរាល់។'
      });
    } catch (err) {
      setSaveStatus({
        type: 'error',
        text: err?.message || 'ការផ្ញើសារសាកល្បងបរាជ័យ។'
      });
    } finally {
      setIsTestingBot(false);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    setStoredApiKey(apiKey);
    if (onKeySaved) onKeySaved(apiKey.trim());

    const savedTg = saveTelegramConfig({
      botToken,
      chatId,
      chatTitle,
      botUsername
    });
    if (onTelegramConfigSaved) onTelegramConfigSaved(savedTg);

    setSaveStatus({
      type: 'success',
      text: 'បានរក្សាទុកការកំណត់ទាំងអស់ដោយជោគជ័យ!'
    });
    setTimeout(() => {
      setSaveStatus(null);
      onClose();
    }, 900);
  };

  const handleClearTelegram = () => {
    setBotToken('');
    setChatId('');
    setChatTitle('');
    setBotUsername('');
    setDetectedChats([]);
    clearTelegramConfig();
    if (onTelegramConfigSaved) {
      onTelegramConfigSaved({ botToken: '', chatId: '', chatTitle: '', botUsername: '' });
    }
    setSaveStatus({
      type: 'info',
      text: 'បានលុបការកំណត់ Telegram Bot រួចរាល់។'
    });
  };

  const handleClearGemini = () => {
    setApiKey('');
    setStoredApiKey('');
    if (onKeySaved) onKeySaved('');
    setSaveStatus({
      type: 'info',
      text: 'បានលុប Gemini API Key រួចរាល់។'
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1400 }}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 560,
          width: '95vw',
          maxHeight: '92vh',
          overflowY: 'auto'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '15px 18px',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
            position: 'sticky',
            top: 0,
            zIndex: 5
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                background: 'linear-gradient(135deg, #0088cc 0%, #0284c7 100%)',
                color: '#ffffff',
                padding: 8,
                borderRadius: 9,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Send size={19} />
            </div>
            <div>
              <h2 style={{ fontSize: 15.5, fontWeight: 800, margin: 0, color: '#0f172a' }}>
                ការកំណត់ Telegram Bot និងប្រព័ន្ធ AI
              </h2>
              <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                សម្រាប់បាញ់ឯកសារ PDF, Word និង Excel ចូល Telegram ផ្ទាល់
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', padding: 6, color: '#64748b', border: 'none', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* ============================================================== */}
          {/* SECTION 1: TELEGRAM BOT CONFIGURATION                          */}
          {/* ============================================================== */}
          <div
            style={{
              background: '#f0f9ff',
              border: '1.5px solid #bae6fd',
              borderRadius: 12,
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 800, color: '#0c4a6e' }}>
                <Send size={16} color="#0284c7" />
                <span>១. ការភ្ជាប់ Telegram Bot (ផ្ញើ PDF / Word / Excel)</span>
              </div>
              {(botToken || chatId) && (
                <button
                  type="button"
                  onClick={handleClearTelegram}
                  style={{
                    background: '#fee2e2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    borderRadius: 6,
                    padding: '3px 8px',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <Trash2 size={12} />
                  <span>លុប Bot</span>
                </button>
              )}
            </div>

            {/* Step 1: Bot Token */}
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#0f172a', marginBottom: 5 }}>
                Telegram Bot Token (បានពី @BotFather)៖
              </label>
              <input
                type="text"
                placeholder="ឧ. 7123456789:AAHxyz..."
                value={botToken}
                onChange={e => setBotToken(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 11px',
                  fontSize: 13.5,
                  borderRadius: 8,
                  border: '1px solid #93c5fd',
                  background: '#ffffff',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Step 2: Chat ID + Auto Detect Button */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5, gap: 6, flexWrap: 'wrap' }}>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>
                  Telegram Chat ID (គណនីផ្ទាល់ខ្លួន ឬ Group)៖
                </label>
                {chatTitle && (
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '2px 8px', borderRadius: 10 }}>
                    គោលដៅ៖ {chatTitle}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="ឧ. 123456789 ឬ -100123456789"
                  value={chatId}
                  onChange={e => setChatId(e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: 160,
                    padding: '9px 11px',
                    fontSize: 13.5,
                    borderRadius: 8,
                    border: '1px solid #93c5fd',
                    background: '#ffffff',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={handleDetectChats}
                  disabled={isDetectingChat || !botToken.trim()}
                  style={{
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '9px 12px',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: isDetectingChat || !botToken.trim() ? 'not-allowed' : 'pointer',
                    opacity: isDetectingChat || !botToken.trim() ? 0.65 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {isDetectingChat ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                  <span>{isDetectingChat ? 'កំពុងស្វែងរក...' : 'ទាញយក Chat ID ស្វ័យប្រវត្តិ'}</span>
                </button>
              </div>
            </div>

            {/* Discovered Chat List Chips (if multiple chats/groups found) */}
            {detectedChats.length > 0 && (
              <div style={{ background: '#ffffff', border: '1px solid #bae6fd', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0369a1', marginBottom: 6 }}>
                  ជ្រើសរើសគោលដៅផ្ញើឯកសារ (ផ្ញើទៅទាំងអស់ ឬជ្រើសរើសតាមគណនី)៖
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setChatId('ALL');
                      setChatTitle(`គ្រប់គណនីទាំងអស់ (${detectedChats.length})`);
                    }}
                    style={{
                      background: String(chatId).toUpperCase() === 'ALL' ? '#0284c7' : '#f1f5f9',
                      color: String(chatId).toUpperCase() === 'ALL' ? '#ffffff' : '#1e293b',
                      border: String(chatId).toUpperCase() === 'ALL' ? '1.5px solid #0369a1' : '1px solid #cbd5e1',
                      borderRadius: 8,
                      padding: '5px 10px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5
                    }}
                  >
                    <span>📢 គ្រប់គណនីទាំងអស់ ({detectedChats.length})</span>
                  </button>

                  {detectedChats.map(c => {
                    const active = String(c.chatId) === String(chatId);
                    return (
                      <button
                        key={c.chatId}
                        type="button"
                        onClick={() => {
                          setChatId(c.chatId);
                          setChatTitle(c.title);
                        }}
                        style={{
                          background: active ? '#0284c7' : '#f1f5f9',
                          color: active ? '#ffffff' : '#1e293b',
                          border: active ? '1.5px solid #0369a1' : '1px solid #cbd5e1',
                          borderRadius: 8,
                          padding: '5px 10px',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5
                        }}
                      >
                        <MessageSquare size={13} />
                        <span>{c.title}</span>
                        <span style={{ opacity: 0.8, fontSize: 11 }}>({c.typeLabel})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Test Button & Mini Guide */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <button
                type="button"
                onClick={handleTestTelegram}
                disabled={isTestingBot || !botToken.trim() || !chatId.trim()}
                style={{
                  background: '#15803d',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 14px',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: isTestingBot || !botToken.trim() || !chatId.trim() ? 'not-allowed' : 'pointer',
                  opacity: isTestingBot || !botToken.trim() || !chatId.trim() ? 0.6 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                {isTestingBot ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                <span>{isTestingBot ? 'កំពុងផ្ញើសារសាកល្បង...' : '✈️ សាកល្បងផ្ញើសារ (Test Bot)'}</span>
              </button>

              <a
                href={botUsername ? `https://t.me/${botUsername}` : 'https://t.me/BotFather'}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: 12,
                  color: '#0284c7',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <span>{botUsername ? `បើក @${botUsername} ក្នុង Telegram` : 'បង្កើត Bot តាម @BotFather'}</span>
                <ExternalLink size={12} />
              </a>
            </div>

            <div style={{ fontSize: 11.5, color: '#334155', lineHeight: 1.5, background: 'rgba(255,255,255,0.7)', padding: '7px 10px', borderRadius: 8 }}>
              💡 <strong>របៀបភ្ជាប់ងាយៗ ៣ ជំហាន៖</strong> (១) បង្កើត Bot នៅ{' '}
              <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" style={{ color: '#0284c7', fontWeight: 700 }}>
                @BotFather
              </a>{' '}
              រួចចម្លង <strong>Token</strong> មកដាក់ខាងលើ ➔ (២) ចូលទៅចុច <strong>Start (/start)</strong> ក្នុង Bot របស់បង ➔ (៣) ចុចប៊ូតុង <strong>«ទាញយក Chat ID ស្វ័យប្រវត្តិ»</strong> រួចចុច <strong>រក្សាទុក</strong>។
            </div>
          </div>

          {/* ============================================================== */}
          {/* SECTION 2: GEMINI AI VISION API KEY                            */}
          {/* ============================================================== */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 10
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 800, color: '#334155' }}>
                <Key size={15} color="#b45309" />
                <span>២. Google Gemini AI Vision API Key (សម្រាប់ស្កេន OCR)</span>
              </div>
              {apiKey && (
                <button
                  type="button"
                  onClick={handleClearGemini}
                  style={{
                    background: '#fee2e2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    borderRadius: 6,
                    padding: '3px 8px',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <Trash2 size={12} />
                  <span>លុប Key</span>
                </button>
              )}
            </div>

            <input
              type="password"
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 11px',
                fontSize: 13.5,
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                boxSizing: 'border-box'
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#166534' }}>
              <ShieldCheck size={15} style={{ flexShrink: 0 }} />
              <span>រក្សាទុកដោយសុវត្ថិភាពលើឧបករណ៍បង និងគាំទ្រ Smart Offline Mode ស្វ័យប្រវត្តិ។</span>
            </div>

            {/* Live Gemini Key Pool Health Dashboard (Auto-Heal + Admin Telegram Alert) */}
            {keyHealth.total > 0 && (
              <div style={{
                marginTop: 4,
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 10,
                padding: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: '#0f172a' }}>
                    <Activity size={14} color="#0284c7" />
                    <span>ស្ថានភាព AI Key Pool ({keyHealth.usableCount}/{keyHealth.total} ល្អ)</span>
                  </div>
                  <button
                    type="button"
                    disabled={keyHealth.isChecking}
                    onClick={() => runFullKeyPoolHealthCheck({ explicitApiKey: apiKey, force: true, notifyAdmin: true })}
                    style={{
                      background: keyHealth.isChecking ? '#94a3b8' : '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '5px 10px',
                      fontSize: 11.5,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      cursor: keyHealth.isChecking ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <RefreshCw size={12} className={keyHealth.isChecking ? 'spin' : ''} />
                    <span>{keyHealth.isChecking ? 'កំពុងពិនិត្យ...' : 'ពិនិត្យ Key ទាំងអស់'}</span>
                  </button>
                </div>

                {/* Summary Pills */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 11, fontWeight: 700 }}>
                  <span style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 12, padding: '2px 8px' }}>
                    🟢 Healthy Pool: {keyHealth.usableCount}
                  </span>
                  <span style={{
                    background: keyHealth.quarantineCount > 0 ? '#fef2f2' : '#f8fafc',
                    color: keyHealth.quarantineCount > 0 ? '#b91c1c' : '#64748b',
                    border: `1px solid ${keyHealth.quarantineCount > 0 ? '#fecaca' : '#e2e8f0'}`,
                    borderRadius: 12,
                    padding: '2px 8px'
                  }}>
                    🔒 Quarantine (ដាក់ដាច់): {keyHealth.quarantineCount}
                  </span>
                  {keyHealth.checkedAt > 0 && (
                    <span style={{ color: '#64748b', fontWeight: 600, padding: '2px 4px' }}>
                      ពិនិត្យចុងក្រោយ៖ {new Date(keyHealth.checkedAt).toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>

                {/* Strict 2-Pool Display: Pool 1 (Healthy) vs Pool 2 (Locked Quarantine) */}
                <div style={{
                  maxHeight: 220,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  paddingRight: 2
                }}>
                  {/* Pool 1: Healthy Pool (Fastest-First) */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#166534', marginBottom: 4 }}>
                      🟢 បន្ទប់ទី ១៖ Key ល្អកំពុងប្រើសម្រាប់ស្កេន ({keyHealth.healthyItems.length})
                    </div>
                    {keyHealth.healthyItems.length === 0 ? (
                      <div style={{ fontSize: 11, color: '#b91c1c', background: '#fef2f2', padding: '6px 8px', borderRadius: 6, border: '1px solid #fecaca' }}>
                        ⚠️ មិនមាន Key ល្អក្នុង Healthy Pool ទេ! សូមចុច «ពិនិត្យ Key ទាំងអស់»
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {keyHealth.healthyItems.map(it => (
                          <div
                            key={it.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 8,
                              padding: '5px 8px',
                              borderRadius: 7,
                              background: it.isSlow ? '#fffbeb' : '#f0fdf4',
                              border: `1px solid ${it.isSlow ? '#fde68a' : '#bbf7d0'}`,
                              fontSize: 11.5
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: it.isSlow ? '#d97706' : '#16a34a', flexShrink: 0 }} />
                              <strong style={{ color: '#0f172a', flexShrink: 0 }}>Key #{it.index}</strong>
                              <code style={{ fontSize: 11, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.masked}</code>
                            </div>
                            <span style={{ fontWeight: 700, color: it.isSlow ? '#92400e' : '#166534', whiteSpace: 'nowrap', fontSize: 11 }}>
                              {it.statusLabel}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Pool 2: Locked Quarantine Pool (Never handed to user scan until 200 OK!) */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: keyHealth.quarantineItems.length > 0 ? '#b91c1c' : '#64748b', marginBottom: 4 }}>
                      🔒 បន្ទប់ទី ២៖ Key គាំង / ដាក់ដាច់មិនឱ្យ User ប្រើ ({keyHealth.quarantineItems.length})
                    </div>
                    {keyHealth.quarantineItems.length === 0 ? (
                      <div style={{ fontSize: 11, color: '#166534', background: '#f8fafc', padding: '5px 8px', borderRadius: 6, border: '1px dashed #cbd5e1' }}>
                        ✅ គ្មាន Key ជាប់គាំង ឬអស់កូតាក្នុងបន្ទប់ដាក់ដាច់ទេ
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {keyHealth.quarantineItems.map(it => {
                          const qStyle =
                            it.status === 'invalid'
                              ? { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', dot: '#dc2626' }
                              : it.status === 'quota'
                                ? { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', dot: '#ea580c' }
                                : { bg: '#fefce8', color: '#854d0e', border: '#fef08a', dot: '#eab308' };
                          return (
                            <div
                              key={it.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 8,
                                padding: '5px 8px',
                                borderRadius: 7,
                                background: qStyle.bg,
                                border: `1px solid ${qStyle.border}`,
                                fontSize: 11.5
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: qStyle.dot, flexShrink: 0 }} />
                                <strong style={{ color: '#0f172a', flexShrink: 0 }}>Key #{it.index}</strong>
                                <code style={{ fontSize: 11, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.masked}</code>
                              </div>
                              <span style={{ fontWeight: 700, color: qStyle.color, whiteSpace: 'nowrap', fontSize: 10.5 }}>
                                {it.statusLabel}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.45, background: '#f8fafc', padding: '6px 8px', borderRadius: 6 }}>
                  🛡️ Check Healthy Pool រៀងរាល់ <strong>៥ នាទី</strong> (រួមគ្នាលើ Cloud) • តេស្តជួសជុលបន្ទប់ដាក់ដាច់រៀងរាល់ <strong>២ នាទី</strong> (ទាល់តែចេញ 200 OK ទើបអនុញ្ញាតឱ្យប្រើវិញ) • បើជួសជុលមិនបាន បាញ់សារទៅ Telegram Admin (<code>{ADMIN_ALERT_CHAT_ID}</code>)។
                </div>
              </div>
            )}
          </div>

          {/* Status Message Banner */}
          {saveStatus && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                background:
                  saveStatus.type === 'success'
                    ? '#dcfce7'
                    : saveStatus.type === 'error'
                      ? '#fef2f2'
                      : '#e0f2fe',
                border: `1px solid ${
                  saveStatus.type === 'success'
                    ? '#86efac'
                    : saveStatus.type === 'error'
                      ? '#fecaca'
                      : '#7dd3fc'
                }`,
                color:
                  saveStatus.type === 'success'
                    ? '#166534'
                    : saveStatus.type === 'error'
                      ? '#b91c1c'
                      : '#0369a1',
                fontSize: 12.5,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8
              }}
            >
              {saveStatus.type === 'success' ? (
                <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              ) : (
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              )}
              <span>{saveStatus.text}</span>
            </div>
          )}

          {/* Footer Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#f1f5f9',
                color: '#475569',
                padding: '9px 16px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                border: '1px solid #cbd5e1',
                cursor: 'pointer'
              }}
            >
              បិទ
            </button>
            <button
              type="submit"
              style={{
                background: 'linear-gradient(135deg, #b45309 0%, #d97706 100%)',
                color: '#ffffff',
                padding: '9px 22px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(180, 83, 9, 0.25)'
              }}
            >
              រក្សាទុកការកំណត់
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
