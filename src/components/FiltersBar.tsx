import React from 'react';

interface FiltersBarProps {
  children: React.ReactNode;
}

export const FiltersBar: React.FC<FiltersBarProps> = ({ children }) => (
  <div className="flex flex-wrap gap-3 mb-4 items-end">
    {children}
  </div>
);

interface FilterFieldProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export const FilterField: React.FC<FilterFieldProps> = ({ label, children, className }) => (
  <div className={`flex flex-col gap-1 ${className || ''}`}>
    <label className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</label>
    {children}
  </div>
);

export const FilterSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <select
    {...props}
    className={`border border-border bg-secondary/30 text-foreground px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-background ${props.className || ''}`}
  />
);

export const FilterInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className={`border border-border bg-secondary/30 text-foreground px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-background ${props.className || ''}`}
  />
);
