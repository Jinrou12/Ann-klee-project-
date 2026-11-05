import React from 'react';
import { FileText, DollarSign, Camera, BarChart3 } from 'lucide-react';
import { toKhmerDigits } from '../utils/khmerNumerals';

export default function TabNavigation({
  activeTab,
  onSelectTab,
  queueCount = 0,
  useKhmerNumerals = true
}) {
  const tabs = [
    {
      id: 'leave',
      label: 'សមណសិស្សសុំច្បាប់',
      icon: FileText,
      iconColor: '#d97706',
      iconBg: '#fef3c7',
      badge: null
    },
    {
      id: 'finance',
      label: 'ចំណូល-ចំណាយ',
      icon: DollarSign,
      iconColor: '#16a34a',
      iconBg: '#dcfce7',
      badge: null
    },
    {
      id: 'upload',
      label: 'ស្កេនរូបភាព & OCR',
      icon: Camera,
      iconColor: '#2563eb',
      iconBg: '#dbeafe',
      badge: queueCount > 0 ? `${useKhmerNumerals ? toKhmerDigits(queueCount) : queueCount}` : null
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
    <div className="no-print" style={{
      display: 'flex',
      gap: 10,
      marginBottom: 20,
      borderBottom: '2px solid #e2e8f0',
      paddingBottom: 4,
      overflowX: 'auto'
    }}>
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 18px',
              borderRadius: '10px 10px 0 0',
              fontWeight: 700,
              fontSize: 14,
              background: isActive ? '#b45309' : '#ffffff',
              color: isActive ? '#ffffff' : '#334155',
              borderTop: `1px solid ${isActive ? '#b45309' : '#e2e8f0'}`,
              borderLeft: `1px solid ${isActive ? '#b45309' : '#e2e8f0'}`,
              borderRight: `1px solid ${isActive ? '#b45309' : '#e2e8f0'}`,
              borderBottom: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: isActive ? '0 -2px 8px rgba(180,83,9,0.18)' : '0 1px 2px rgba(0,0,0,0.03)',
              transition: 'all 0.15s'
            }}
          >
            <span style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: isActive ? '#ffffff' : tab.iconBg,
              color: tab.iconColor,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.12)' : 'none'
            }}>
              <Icon size={17} strokeWidth={2.4} />
            </span>
            <span>{tab.label}</span>
            {tab.badge && (
              <span style={{
                background: isActive ? 'rgba(255, 255, 255, 0.25)' : '#fee2e2',
                color: isActive ? '#ffffff' : '#dc2626',
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 12
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
