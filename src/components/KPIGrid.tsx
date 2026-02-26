import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string;
  color?: 'cyan' | 'amber' | 'green' | 'red' | 'purple';
  icon?: LucideIcon;
  sub?: string;
}

const colorMap = {
  cyan: {
    bg: 'bg-primary/15',
    text: 'text-primary',
    ring: 'ring-primary/20',
  },
  amber: {
    bg: 'bg-neon-amber/15',
    text: 'text-neon-amber',
    ring: 'ring-neon-amber/20',
  },
  green: {
    bg: 'bg-neon-green/15',
    text: 'text-neon-green',
    ring: 'ring-neon-green/20',
  },
  red: {
    bg: 'bg-neon-red/15',
    text: 'text-neon-red',
    ring: 'ring-neon-red/20',
  },
  purple: {
    bg: 'bg-neon-purple/15',
    text: 'text-neon-purple',
    ring: 'ring-neon-purple/20',
  },
};

export const KPICard: React.FC<KPICardProps> = ({ label, value, color = 'cyan', icon: Icon, sub }) => {
  const c = colorMap[color];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm"
    >
      {Icon && (
        <div className={`w-12 h-12 rounded-full ${c.bg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-5 h-5 ${c.text}`} />
        </div>
      )}
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground truncate">{label}</div>
        <div className="text-xl font-bold font-mono text-foreground leading-tight">{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</div>}
      </div>
    </motion.div>
  );
};

interface KPIGridProps {
  children: React.ReactNode;
  cols?: number;
}

export const KPIGrid: React.FC<KPIGridProps> = ({ children, cols }) => {
  const colClass = cols === 5 ? 'grid-cols-2 md:grid-cols-5' :
                   cols === 3 ? 'grid-cols-1 md:grid-cols-3' :
                   'grid-cols-2 md:grid-cols-4';
  return (
    <div className={`grid ${colClass} gap-4 mb-5`}>
      {children}
    </div>
  );
};
