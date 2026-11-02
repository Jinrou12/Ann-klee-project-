import React from 'react';
import { FileText, DollarSign, Camera } from 'lucide-react';
import { toKhmerDigits } from '../utils/khmerNumerals';

export default function TabNavigation({
  activeTab,
  onSelectTab,
  leaveCount = 0,
  queueCount = 0,
  useKhmerNumerals
}) {
  const tabs = [
    {
      id: 'leave',
      label: 'ច្បាប់សមណសិស្ស (PDF 2)',
      icon: FileText,
      badge: `${useKhmerNumerals ? toKhmerDigits(leaveCount) : leaveCount} អង្គ`
    },
    {
      id: 'finance',
      label: 'ចំណូល-ចំណាយ (PDF 1)',
      icon: DollarSign,
      badge: 'របាយការណ៍ហិរញ្ញវត្ថុ'
    },
    {
      id: 'upload',
      label: 'ស្កេនរូបភាព & OCR',
      icon: Camera,
      badge: queueCount > 0 ? `${queueCount} រង់ចាំ` : 'Upload'
    }
  ];

  return (
    <div className="no-print" style={{
      display: 'flex',
      gap: 8,
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
              gap: 8,
              padding: '10px 18px',
              borderRadius: '8px 8px 0 0',
              fontWeight: 600,
              fontSize: 14,
              background: isActive ? '#b45309' : '#f8fafc',
              color: isActive ? '#ffffff' : '#64748b',
              border: '1px solid',
              borderColor: isActive ? '#b45309' : '#e2e8f0',
              borderBottom: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: isActive ? '0 -2px 6px rgba(180,83,9,0.15)' : 'none',
              transition: 'all 0.15s'
            }}
          >
            <Icon size={18} />
            <span>{tab.label}</span>
            {tab.badge && (
              <span style={{
                background: isActive ? 'rgba(255, 255, 255, 0.25)' : '#e2e8f0',
                color: isActive ? '#ffffff' : '#475569',
                fontSize: 11,
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
