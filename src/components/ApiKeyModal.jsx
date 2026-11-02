import React, { useState } from 'react';
import { X, Key, ShieldCheck, ExternalLink, Trash2 } from 'lucide-react';
import { getStoredApiKey, setStoredApiKey } from '../utils/storage';

export default function ApiKeyModal({ isOpen, onClose, onKeySaved }) {
  const [apiKey, setApiKey] = useState(getStoredApiKey());
  const [saveStatus, setSaveStatus] = useState(null);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    setStoredApiKey(apiKey);
    onKeySaved(apiKey.trim());
    setSaveStatus('បានរក្សាទុក API Key ដោយជោគជ័យ!');
    setTimeout(() => {
      setSaveStatus(null);
      onClose();
    }, 1000);
  };

  const handleClear = () => {
    setApiKey('');
    setStoredApiKey('');
    onKeySaved('');
    setSaveStatus('បានលុប API Key រួចរាល់។ ប្រព័ន្ធនឹងប្រើប្រាស់ Smart Offline Mode!');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              background: '#e0f2fe',
              color: '#0284c7',
              padding: 8,
              borderRadius: 8
            }}>
              <Key size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                ការកំណត់ Gemini AI Vision API Key
              </h2>
              <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                សម្រាប់អានអក្សរខ្មែរសរសេរដៃ និងវិក្កយបត្រស្វ័យប្រវត្តិតាម Cloud AI
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', padding: 6, color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} style={{ padding: '20px' }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Google Gemini API Key
            </label>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              style={{ width: '100%', fontSize: 14 }}
            />
          </div>

          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 8,
            padding: 12,
            fontSize: 12,
            color: '#166534',
            marginBottom: 16,
            display: 'flex',
            gap: 8,
            alignItems: 'flex-start'
          }}>
            <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>សុវត្ថិភាពខ្ពស់៖</strong> API Key នេះត្រូវបានរក្សាទុកតែក្នុង Browser លើម៉ាស៊ីនបងផ្ទាល់ប៉ុណ្ណោះ មិនត្រូវបានបញ្ជូនទៅ Server ផ្សេងឡើយ។
            </div>
          </div>

          <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, marginBottom: 16 }}>
            * ប្រសិនបើបងមិនទាន់មាន API Key ទេ បងអាចបង្កើតដោយឥតគិតថ្លៃនៅ{' '}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              style={{ color: '#b45309', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 2 }}
            >
              Google AI Studio <ExternalLink size={12} />
            </a>
            <br />
            * បើគ្មាន API Key ឬគ្មាន Internet ប្រព័ន្ធនៅតែដំណើរការយ៉ាងល្អដោយប្រើ <strong>Smart Offline Mode</strong>។
          </p>

          {saveStatus && (
            <div style={{
              padding: '8px 12px',
              borderRadius: 6,
              background: '#dcfce7',
              color: '#15803d',
              fontSize: 12,
              marginBottom: 14
            }}>
              {saveStatus}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            {apiKey && (
              <button
                type="button"
                onClick={handleClear}
                style={{
                  background: '#fee2e2',
                  color: '#b91c1c',
                  padding: '8px 14px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Trash2 size={16} />
                <span>លុប Key</span>
              </button>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  padding: '8px 16px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600
                }}
              >
                បោះបង់
              </button>
              <button
                type="submit"
                style={{
                  background: '#b45309',
                  color: '#ffffff',
                  padding: '8px 20px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600
                }}
              >
                រក្សាទុក
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
