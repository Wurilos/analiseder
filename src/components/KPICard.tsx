import React from 'react';

interface KPICardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  iconColor?: 'blue' | 'amber' | 'red' | 'green' | 'teal' | 'purple' | 'indigo' | 'orange' | 'slate';
  severity?: 'danger' | 'warn' | 'good' | 'info' | '';
}

const KPICard: React.FC<KPICardProps> = ({ label, value, sub, icon, iconColor = 'blue', severity = '' }) => {
  return (
    <div className={`kpi ${severity}`}>
      <div className={`kpi-icon ${iconColor}`}>
        {icon}
      </div>
      <div className="kpi-content">
        <div className="kpi-label">{label}</div>
        <div className="kpi-val">{value}</div>
        {sub && <div className="kpi-sub">{sub}</div>}
      </div>
    </div>
  );
};

export default KPICard;
