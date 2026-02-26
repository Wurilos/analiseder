import React from 'react';

interface SectionCardProps {
  title: string;
  badge?: string;
  children: React.ReactNode;
  className?: string;
  emptyIcon?: React.ReactNode;
  emptyText?: string;
  isEmpty?: boolean;
}

export const SectionCard: React.FC<SectionCardProps> = ({ title, badge, children, className, emptyIcon, emptyText, isEmpty }) => (
  <div className={`bg-card border border-border rounded-xl p-5 ${className || ''}`}>
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {badge && (
        <span className="text-xs bg-secondary text-muted-foreground px-2.5 py-1 rounded-full">
          {badge}
        </span>
      )}
    </div>
    {isEmpty ? (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/40">
        {emptyIcon && <div className="mb-3 text-4xl">{emptyIcon}</div>}
        <span className="text-sm">{emptyText || 'Nenhum dado disponível'}</span>
      </div>
    ) : children}
  </div>
);
