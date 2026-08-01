'use client';

import { useRef, useState } from 'react';

interface UploadPanelProps {
  onUpload: (file: File) => Promise<void>;
  uploading: boolean;
}

export default function UploadPanel({ onUpload, uploading }: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900">1. Upload Excel</h2>
      <p className="mt-1 text-sm text-gray-500">Supports .xlsx and .csv files.</p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.csv"
          onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
        />
        <button
          onClick={() => selectedFile && onUpload(selectedFile)}
          disabled={!selectedFile || uploading}
          className="whitespace-nowrap rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploading ? 'Validating…' : 'Upload & Validate'}
        </button>
      </div>
    </section>
  );
}
