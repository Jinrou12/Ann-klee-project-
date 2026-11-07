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
      activeGrad: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      activeBg: '#fffbeb',
      activeBorder: '#fcd34d',
      glow: 'rgba(217, 119, 6, 0.32)',
      badge: null
    },
    {
      id: 'idcard',
      label: 'ទិញ ID កាត',
      icon: CreditCard,
      iconColor: '#0284c7',
      iconBg: '#e0f2fe',
      activeGrad: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
      activeBg: '#f0f9ff',
      activeBorder: '#93c5fd',
      glow: 'rgba(2, 132, 199, 0.32)',
      badge: null
    },
    {
      id: 'finance',
      label: 'ចំណូល/ចំណាយ',
      icon: DollarSign,
      iconColor: '#16a34a',
      iconBg: '#dcfce7',
      activeGrad: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
      activeBg: '#f0fdf4',
      activeBorder: '#86efac',
      glow: 'rgba(22, 163, 74, 0.32)',
      badge: null
    },
    {
      id: 'upload',
      label: 'ស្កេន & OCR',
      icon: Camera,
      iconColor: '#2563eb',
      iconBg: '#dbeafe',
      activeGrad: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      activeBg: '#eff6ff',
      activeBorder: '#93c5fd',
      glow: 'rgba(37, 99, 235, 0.32)',
      badge: queueCount > 0 ? (useKhmerNumerals ? toKhmerDigits(queueCount) : queueCount) : null
    },
    {
      id: 'summary',
      label: 'ស្ថិតិរួម',
      icon: BarChart3,
      iconColor: '#7c3aed',
      iconBg: '#ede9fe',
      activeGrad: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      activeBg: '#f5f3ff',
      activeBorder: '#c4b5fd',
      glow: 'rgba(124, 58, 237, 0.32)',
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
        background: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(226, 232, 240, 0.9)',
        boxShadow: '0 -6px 20px rgba(15, 23, 42, 0.08)',
        zIndex: 90,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        gap: 4,
        paddingTop: 5,
        paddingLeft: 'max(6px, env(safe-area-inset-left, 6px))',
        paddingRight: 'max(6px, env(safe-area-inset-right, 6px))',
        paddingBottom: 'max(10px, calc(env(safe-area-inset-bottom, 10px) - 14px))'
      }}
    >
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              background: isActive ? tab.activeBg : 'transparent',
              border: isActive ? `1.5px solid ${tab.activeBorder}` : '1.5px solid transparent',
              padding: '5px 2px 4px',
              borderRadius: 12,
              cursor: 'pointer',
              color: isActive ? tab.iconColor : '#475569',
              position: 'relative',
              transform: isActive ? 'translateY(-1px)' : 'translateY(0)',
              transition: 'all 0.24s cubic-bezier(0.34, 1.56, 0.64, 1)',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            {/* Top Active Glowing Pill Indicator */}
            <span
              style={{
                position: 'absolute',
                top: -5,
                width: isActive ? 22 : 0,
                height: 3,
                borderRadius: 999,
                background: tab.activeGrad,
                opacity: isActive ? 1 : 0,
                transition: 'all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}
            />

            <div style={{
              position: 'relative',
              width: 30,
              height: 28,
              borderRadius: 9,
              background: isActive ? tab.activeGrad : tab.iconBg,
              color: isActive ? '#ffffff' : tab.iconColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isActive ? `0 4px 10px ${tab.glow}` : 'none',
              transform: isActive ? 'translateY(-1px) scale(1.08)' : 'translateY(0) scale(1)',
              transition: 'all 0.26s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}>
              <Icon size={17} strokeWidth={isActive ? 2.5 : 2.2} />
              {tab.badge && (
                <span style={{
                  position: 'absolute',
                  top: -5,
                  right: -8,
                  background: '#dc2626',
                  color: '#ffffff',
                  fontSize: 10,
                  fontWeight: 800,
                  borderRadius: 10,
                  padding: '1px 5px',
                  minWidth: 16,
                  textAlign: 'center',
                  boxShadow: '0 2px 5px rgba(220, 38, 38, 0.35)'
                }}>
                  {tab.badge}
                </span>
              )}
            </div>
            <span style={{
              fontSize: 10.5,
              fontWeight: isActive ? 800 : 600,
              letterSpacing: -0.2,
              whiteSpace: 'nowrap',
              transition: 'color 0.2s ease'
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
