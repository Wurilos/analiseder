import React from 'react';
import { motion } from 'framer-motion';

interface KPICardProps {
  label: string;
  value: string;
  color: string; // tailwind color class like text-neon-cyan
  sub?: string;
  icon?: string;
}

export const KPICard: React.FC<KPICardProps> = ({ label, value, color, sub, icon }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="card-glass rounded-2xl p-5 text-center"
  >
    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
      {icon && <span className="mr-1">{icon}</span>}
      {label}
    </div>
    <div className={`text-3xl font-black font-mono leading-none ${color}`}>
      {value}
    </div>
    {sub && <div className="text-xs text-muted-foreground/60 mt-2">{sub}</div>}
  </motion.div>
);

interface KPIGridProps {
  children: React.ReactNode;
}

export const KPIGrid: React.FC<KPIGridProps> = ({ children }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
    {children}
  </div>
);
