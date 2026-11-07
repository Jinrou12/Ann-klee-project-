import React from 'react';
import { FileText, DollarSign, Camera, BarChart3, CreditCard } from 'lucide-react';
import { toKhmerDigits } from '../../utils/khmerNumerals';

export default function MobileBottomNav({
  activeTab,
  onSelectTab,
  queueCount = 0,
  useKhmerNumerals = true
}) {
  const tabs = [
    {
      id: 'leave',
      label: 'សុំច្បាប់',
      icon: FileText,
      iconColor: '#d97706',
      iconBg: '#fef3c7',
      badge: null
    },
    {
      id: 'idcard',
      label: 'ទិញ ID កាត',
      icon: CreditCard,
      iconColor: '#0284c7',
      iconBg: '#e0f2fe',
      badge: null
    },
    {
      id: 'finance',
      label: 'ចំណូល/ចំណាយ',
      icon: DollarSign,
      iconColor: '#16a34a',
      iconBg: '#dcfce7',
      badge: null
    },
    {
      id: 'upload',
      label: 'ស្កេន & OCR',
      icon: Camera,
      iconColor: '#2563eb',
      iconBg: '#dbeafe',
      badge: queueCount > 0 ? (useKhmerNumerals ? toKhmerDigits(queueCount) : queueCount) : null
    },
    {
      id: 'summary',
      label: 'ស្ថិតិរួម',
      icon: BarChart3,
      iconColor: '#7c3aed',
      iconBg: '#ede9fe',
      badge: null
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
        padding: '6px 6px env(safe-area-inset-bottom, 8px)'
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
              background: isActive ? '#fffbeb' : 'transparent',
              border: isActive ? '1px solid #fde68a' : '1px solid transparent',
              padding: '5px 2px',
              borderRadius: 10,
              cursor: 'pointer',
              color: isActive ? '#b45309' : '#334155',
              position: 'relative'
            }}
          >
            <div style={{
              position: 'relative',
              width: 28,
              height: 28,
              borderRadius: 8,
              background: tab.iconBg,
              color: tab.iconColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Icon size={17} strokeWidth={2.3} />
              {tab.badge && (
                <span style={{
                  position: 'absolute',
                  top: -4,
                  right: -8,
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
              fontSize: 10.5,
              fontWeight: isActive ? 700 : 600,
              letterSpacing: -0.2,
              whiteSpace: 'nowrap'
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
