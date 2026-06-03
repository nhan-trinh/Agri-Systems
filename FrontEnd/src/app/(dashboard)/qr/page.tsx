'use client';
import { useQRStream } from '@/lib/hooks/useQRStream';

export default function QRPage() {
  // Hardcoded batchId for demonstration
  const status = useQRStream('mock-batch-123');

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">QR Management</h1>
      <div className="p-4 bg-white rounded-lg shadow-sm border">
        <h2 className="text-lg">Batch #mock-batch-123</h2>
        <p className="text-sm text-slate-500">Status: <span className="font-semibold text-blue-600">{status}</span></p>
      </div>
    </div>
  );
}
