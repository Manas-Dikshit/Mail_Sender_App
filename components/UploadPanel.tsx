'use client';

import { useCallback, useRef, useState, type DragEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileSpreadsheet, FileText, CheckCircle2, X } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/lib/cn';

interface UploadPanelProps {
  onUpload: (file: File) => Promise<void>;
  uploading: boolean;
}

function fileIconFor(name: string) {
  return name.toLowerCase().endsWith('.csv') ? FileText : FileSpreadsheet;
}

export default function UploadPanel({ onUpload, uploading }: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const acceptFile = useCallback((file: File | undefined) => {
    if (!file) return;
    const isValid = /\.(xlsx|csv)$/i.test(file.name);
    if (!isValid) return;
    setSelectedFile(file);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      acceptFile(e.dataTransfer.files?.[0]);
    },
    [acceptFile]
  );

  const FileIcon = selectedFile ? fileIconFor(selectedFile.name) : UploadCloud;

  return (
    <Card>
      <CardHeader
        eyebrow="Step 1"
        title="Upload Excel"
        description="Supports .xlsx and .csv files"
        icon={<UploadCloud className="h-5 w-5" aria-hidden="true" />}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        aria-label="Upload a spreadsheet by dragging it here or pressing Enter to browse"
        className={cn(
          'group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl2 border-2 border-dashed px-6 py-10 text-center transition-all',
          isDragging
            ? 'border-secondary-400 bg-secondary-50 shadow-glow'
            : 'border-primary-200 bg-primary-50/40 hover:border-secondary-300 hover:bg-secondary-50/40'
        )}
      >
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-40" />

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.csv"
          className="sr-only"
          onChange={(e) => acceptFile(e.target.files?.[0])}
        />

        <AnimatePresence mode="wait">
          {selectedFile ? (
            <motion.div
              key="file"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative z-10 flex flex-col items-center gap-2"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-xl2 bg-accent-100 text-accent-700">
                <FileIcon className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="max-w-xs truncate text-sm font-semibold text-primary-800">{selectedFile.name}</p>
              <p className="text-xs text-primary-400">{(selectedFile.size / 1024).toFixed(1)} KB · ready to validate</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                  if (inputRef.current) inputRef.current.value = '';
                }}
                className="mt-1 inline-flex items-center gap-1 rounded-full border border-primary-200 bg-white px-2.5 py-1 text-xs font-medium text-primary-500 hover:text-primary-700"
              >
                <X className="h-3 w-3" aria-hidden="true" />
                Remove
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative z-10 flex flex-col items-center gap-2"
            >
              <motion.span
                animate={{ y: isDragging ? -4 : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                className="flex h-14 w-14 items-center justify-center rounded-xl2 bg-white text-secondary-600 shadow-soft"
              >
                <UploadCloud className="h-6 w-6" aria-hidden="true" />
              </motion.span>
              <p className="text-sm font-semibold text-primary-800">
                Drag &amp; drop your file here, or{' '}
                <span className="text-secondary-600 underline underline-offset-2">browse</span>
              </p>
              <p className="text-xs text-primary-400">.xlsx or .csv · up to 10 MB</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-5 flex justify-end">
        <Button
          onClick={() => selectedFile && onUpload(selectedFile)}
          disabled={!selectedFile}
          loading={uploading}
        >
          {uploading ? (
            'Validating\u2026'
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Upload &amp; Validate
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}