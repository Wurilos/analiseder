import React from 'react';

interface KPICardProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: React.ReactNode;
  iconColor?: 'blue' | 'amber' | 'red' | 'green' | 'teal' | 'purple' | 'indigo' | 'orange' | 'slate';
  severity?: 'danger' | 'warn' | 'good' | 'info' | '';
}

const KPICard: React.FC<KPICardProps> = ({ label, value, sub, icon, iconColor = 'blue', severity = '' }) => {
  return (
    <div className={`kpi ${severity}`} style={{ alignItems: 'flex-start' }}>
      <div className={`kpi-icon ${iconColor}`}>
        {icon}
      </div>
      <div className="kpi-content self-stretch">
        <div className="kpi-label" style={{ fontWeight: 700 }}>{label}</div>
        <div className="kpi-val">{value}</div>
        {sub && <div className="kpi-sub">{sub}</div>}
      </div>
    </div>
  );
};

export default KPICard;
