import React from 'react';

interface RankingCardProps {
  title: string;
  items: {
    id: string;
    label: string;
    value: string;
    meta?: string;
    onClick?: () => void;
  }[];
  gradient?: string;
}

export const RankingCard: React.FC<RankingCardProps> = ({ title, items, gradient }) => {
  if (items.length === 0) return null;

  return (
    <div className="card-glass rounded-2xl p-5 mb-4">
      <h3 className={`text-base font-bold mb-4 ${gradient || 'text-gradient-danger'}`}>
        {title}
      </h3>
      <div className="flex flex-col gap-2">
        {items.map((item, idx) => (
          <div
            key={item.id}
            onClick={item.onClick}
            className="bg-secondary/20 border border-border rounded-xl p-3 cursor-pointer transition-all duration-200 hover:bg-destructive/5 hover:border-destructive/30 hover:translate-x-1"
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-mono text-sm font-bold text-destructive">#{idx + 1}</span>
              <span className="font-mono text-sm font-bold text-destructive">{item.value}</span>
            </div>
            <div className="text-xs font-semibold">{item.label}</div>
            {item.meta && <div className="text-[10px] text-muted-foreground/60">{item.meta}</div>}
          </div>
        ))}
      </div>
    </div>
  );
};
