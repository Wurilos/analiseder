import React, { useCallback } from 'react';
import { Upload } from 'lucide-react';
import { motion } from 'framer-motion';

interface UploadCardProps {
  title: string;
  description: string;
  hint?: string;
  onFile: (file: File) => void;
}

export const UploadCard: React.FC<UploadCardProps> = ({ title, description, hint, onFile }) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      onFile(file);
    }
  }, [onFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-glass rounded-2xl p-6"
    >
      <div
        className="border-2 border-dashed border-border rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-md"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={handleDrop}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-primary opacity-60" />
        <h3 className="text-lg font-bold mb-2 text-primary">{title}</h3>
        <p className="text-muted-foreground text-sm">{description}</p>
        {hint && (
          <p className="mt-3 text-xs text-muted-foreground/60">{hint}</p>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
      />
    </motion.div>
  );
};
