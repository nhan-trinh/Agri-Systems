'use client';

import { useState } from 'react';
import { OCRDashboard } from '../../../components/ocr/OCRDashboard';
import { OCRReviewPanel } from '../../../components/ocr/OCRReviewPanel';

export default function OCRPage() {
  const [viewMode, setViewMode] = useState<'DASHBOARD' | 'REVIEW'>('DASHBOARD');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const handleReview = (docId: string) => {
    setSelectedDocId(docId);
    setViewMode('REVIEW');
  };

  const handleCloseReview = () => {
    setSelectedDocId(null);
    setViewMode('DASHBOARD');
  };

  return (
    <div className="space-y-6 font-sans relative">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#1b4332] tracking-tight">
            Số hóa tài liệu (OCR)
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Quét và số hóa nhật ký canh tác hoặc hóa đơn vật tư nông nghiệp bằng AI.
          </p>
        </div>
      </div>

      {viewMode === 'DASHBOARD' ? (
        <OCRDashboard onReview={handleReview} />
      ) : (
        selectedDocId && (
          <OCRReviewPanel documentId={selectedDocId} onClose={handleCloseReview} />
        )
      )}
    </div>
  );
}
