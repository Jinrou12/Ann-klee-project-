import React from 'react';
import { FileText, DollarSign, Camera, Monitor, Smartphone } from 'lucide-react';
import { toKhmerDigits } from '../../utils/khmerNumerals';

export default function MobileBottomNav({
  activeTab,
  onSelectTab,
  leaveCount = 0,
  queueCount = 0,
  useKhmerNumerals = true,
  isForcedDesktop = false,
  onToggleViewMode
}) {
  const tabs = [
    {
      id: 'leave',
      label: 'ច្បាប់សិស្ស',
      icon: FileText,
      badge: leaveCount > 0 ? (useKhmerNumerals ? toKhmerDigits(leaveCount) : leaveCount) : null
    },
    {
      id: 'finance',
      label: 'ចំណូល-ចំណាយ',
      icon: DollarSign,
      badge: null
    },
    {
      id: 'upload',
      label: 'ស្កេនរូបភាព',
      icon: Camera,
      badge: queueCount > 0 ? (useKhmerNumerals ? toKhmerDigits(queueCount) : queueCount) : null
    }
  ];

  return (
    <nav
      className="no-print"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        boxShadow: '0 -4px 16px rgba(0,0,0,0.08)',
        zIndex: 90,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '6px 8px env(safe-area-inset-bottom, 8px)'
      }}
    >
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              background: 'transparent',
              border: 'none',
              padding: '6px 4px',
              borderRadius: 8,
              cursor: 'pointer',
              color: isActive ? '#b45309' : '#64748b',
              position: 'relative'
            }}
          >
            <div style={{ position: 'relative' }}>
              <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
              {tab.badge && (
                <span style={{
                  position: 'absolute',
                  top: -4,
                  right: -10,
                  background: '#dc2626',
                  color: '#ffffff',
                  fontSize: 10,
                  fontWeight: 700,
                  borderRadius: 10,
                  padding: '1px 5px',
                  minWidth: 16,
                  textAlign: 'center'
                }}>
                  {tab.badge}
                </span>
              )}
            </div>
            <span style={{
              fontSize: 11,
              fontWeight: isActive ? 700 : 500,
              letterSpacing: -0.2
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}

      {/* Switch between Mobile App View and Desktop A4 Mode */}
      {onToggleViewMode && (
        <button
          onClick={onToggleViewMode}
          title={isForcedDesktop ? 'ប្ដូរមកមើលទម្រង់ Mobile វិញ' : 'ប្ដូរទៅមើលទម្រង់ PC A4'}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            background: isForcedDesktop ? '#fef3c7' : 'transparent',
            border: isForcedDesktop ? '1px solid #fde68a' : 'none',
            padding: '6px 8px',
            borderRadius: 8,
            cursor: 'pointer',
            color: isForcedDesktop ? '#b45309' : '#94a3b8'
          }}
        >
          {isForcedDesktop ? <Smartphone size={18} /> : <Monitor size={18} />}
          <span style={{ fontSize: 10, fontWeight: 600 }}>
            {isForcedDesktop ? 'Mobile' : 'PC A4'}
          </span>
        </button>
      )}
    </nav>
  );
}
