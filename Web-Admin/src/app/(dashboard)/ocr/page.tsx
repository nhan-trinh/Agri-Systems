import { CameraCapture } from '@/components/ocr/CameraCapture';

export default function OCRPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Digitize Records (OCR)</h1>
      <CameraCapture />
    </div>
  );
}
