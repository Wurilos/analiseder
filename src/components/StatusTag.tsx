import React from 'react';
import { cn } from '@/lib/utils';

interface StatusTagProps {
  color: string;
  children: React.ReactNode;
  className?: string;
}

export const StatusTag: React.FC<StatusTagProps> = ({ color, children, className }) => {
  const colorMap: Record<string, string> = {
    'neon-green': 'bg-neon-green/20 text-neon-green border-neon-green/40',
    'neon-amber': 'bg-neon-amber/20 text-neon-amber border-neon-amber/40',
    'neon-red': 'bg-neon-red/20 text-neon-red border-neon-red/40',
    'neon-cyan': 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan/40',
    'neon-purple': 'bg-neon-purple/20 text-neon-purple border-neon-purple/40',
    'green': 'bg-neon-green/20 text-neon-green border-neon-green/40',
    'amber': 'bg-neon-amber/20 text-neon-amber border-neon-amber/40',
    'red': 'bg-neon-red/20 text-neon-red border-neon-red/40',
    'cyan': 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan/40',
    'purple': 'bg-neon-purple/20 text-neon-purple border-neon-purple/40',
  };

  return (
    <span className={cn(
      'inline-block px-2 py-1 rounded-md text-[11px] font-bold font-mono uppercase border',
      colorMap[color] || colorMap['cyan'],
      className
    )}>
      {children}
    </span>
  );
};
