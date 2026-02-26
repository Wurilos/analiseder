import React from 'react';

interface BarChartSimpleProps {
  data: {
    label: string;
    value: number;
    color: string;
    tag?: string;
    tagColor?: string;
  }[];
  maxValue?: number;
}

export const BarChartSimple: React.FC<BarChartSimpleProps> = ({ data, maxValue }) => {
  const max = maxValue || Math.max(...data.map(d => d.value), 1);

  return (
    <div className="flex flex-col gap-2">
      {data.map((d, i) => {
        const width = (d.value / max) * 100;
        return (
          <div key={i} className="flex items-center gap-3">
            <div className="min-w-[180px] text-xs flex items-center gap-2">
              {d.label}
              {d.tag && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${d.tagColor || 'bg-accent/20 text-accent'}`}>
                  {d.tag}
                </span>
              )}
            </div>
            <div className="flex-1 h-6 bg-secondary/30 rounded-md overflow-hidden relative">
              <div
                className="h-full rounded-md flex items-center justify-end px-2 transition-all duration-700"
                style={{ width: `${width}%`, background: d.color }}
              >
                <span className="text-[11px] font-bold font-mono text-background">
                  {d.value.toLocaleString('pt-BR')}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
