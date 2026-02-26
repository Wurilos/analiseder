import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaginationBarProps {
  page: number;
  pageSize: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

export const PaginationBar: React.FC<PaginationBarProps> = ({ page, pageSize, total, onPrev, onNext }) => {
  const start = page * pageSize;
  const end = Math.min(start + pageSize, total);

  return (
    <div className="flex justify-between items-center py-4 px-2 border-t border-border">
      <span className="text-xs text-muted-foreground">
        {total > 0 ? `Mostrando ${start + 1}-${end} de ${total}` : 'Nenhum resultado'}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onPrev} disabled={page === 0}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onNext} disabled={end >= total}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
