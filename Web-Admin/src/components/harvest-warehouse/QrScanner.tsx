'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, CameraOff, Loader2 } from 'lucide-react';

interface QrScannerProps {
  /** Called once with the first decoded QR text, then scanning auto-stops. */
  onDecode: (decodedText: string) => void;
  /** Called with a human-readable Vietnamese error message when the camera fails. */
  onError?: (message: string) => void;
}

const SCANNER_REGION_ID = 'harvest-qr-reader';

/**
 * Camera-based QR scanner for the UC-01 receive check-in fast path (FR-03).
 *
 * Uses html5-qrcode's Html5Qrcode class directly (not the prebuilt widget) so we
 * control start/stop lifecycle cleanly inside a modal. The parent always renders
 * the manual-entry form alongside this component, satisfying NFR-05 (graceful
 * degradation without QR) — a denied/unavailable camera surfaces an inline
 * message but never blocks the workflow.
 */
export function QrScanner({ onDecode, onError }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [status, setStatus] = useState<'idle' | 'starting' | 'scanning' | 'denied' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Stop the camera and release handles. Safe to call multiple times.
  const stopScanner = async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    // If the container was already removed from the DOM (e.g. during React
    // unmount), skip library cleanup to avoid removeChild errors.
    if (!document.getElementById(SCANNER_REGION_ID)) {
      scannerRef.current = null;
      return;
    }
    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
      await scanner.clear();
    } catch {
      // ignore — already stopped/cleared
    }
    scannerRef.current = null;
  };

  const startScanner = async () => {
    setStatus('starting');
    setErrorMsg('');
    try {
      const scanner = new Html5Qrcode(SCANNER_REGION_ID, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' }, // prefer the rear camera on phones
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          // Stop the camera on first successful decode, then bubble up.
          void stopScanner();
          setStatus('idle');
          onDecode(decodedText);
        },
        () => {
          // Per-frame decode failure is expected while no code is in view — ignore.
        }
      );
      setStatus('scanning');
    } catch (err) {
      const message = translateCameraError(err);
      setStatus(message.includes('từ chối') ? 'denied' : 'error');
      setErrorMsg(message);
      onError?.(message);
      await stopScanner();
    }
  };

  // Cleanup on unmount: always release the camera so the red recording light turns off.
  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, []);

  return (
    <div className="space-y-2">
      {/* Camera viewport — html5-qrcode mounts its <video> inside this div.
          IMPORTANT: React must NOT render children inside #harvest-qr-reader.
          The placeholder overlay is a SIBLING (not a child) to avoid DOM
          reconciliation conflicts with the library-managed <video>. */}
      <div className="relative w-full aspect-square max-w-[280px] mx-auto rounded-2xl overflow-hidden bg-stone-900">
        <div id={SCANNER_REGION_ID} className="w-full h-full" />
        {status !== 'scanning' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center text-center text-stone-400 p-6">
            {status === 'starting' ? (
              <>
                <Loader2 className="h-8 w-8 mb-2 animate-spin text-[#52b788]" />
                <p className="text-xs font-semibold">Đang mở camera...</p>
              </>
            ) : (
              <>
                <Camera className="h-8 w-8 mb-2" />
                <p className="text-xs font-semibold">Camera đang tắt</p>
              </>
            )}
          </div>
        )}
      </div>

      {status === 'scanning' ? (
        <button
          onClick={() => void stopScanner().then(() => setStatus('idle'))}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 py-2 rounded-xl transition-all"
        >
          <CameraOff className="h-3.5 w-3.5" />
          Dừng camera
        </button>
      ) : (
        <button
          onClick={() => void startScanner()}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-[#1b4332] hover:bg-[#143225] py-2 rounded-xl transition-all"
        >
          <Camera className="h-3.5 w-3.5" />
          {status === 'denied' || status === 'error' ? 'Thử mở lại camera' : 'Bắt đầu quét QR'}
        </button>
      )}

      {(status === 'denied' || status === 'error') && errorMsg && (
        <p className="text-[10px] text-orange-600 font-semibold text-center leading-relaxed">
          {errorMsg}
        </p>
      )}
    </div>
  );
}

/** Map html5-qrcode / getUserMedia errors to actionable Vietnamese guidance. */
function translateCameraError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('Permission') || msg.includes('denied') || msg.includes('NotAllowed')) {
    return 'Đã từ chối quyền truy cập camera. Vui lòng cấp quyền trong trình duyệt hoặc nhập thủ công.';
  }
  if (msg.includes('NotFound') || msg.includes('DevicesNotFoundError') || msg.includes('Requested device not found')) {
    return 'Không tìm thấy camera trên thiết bị. Vui lòng nhập thủ công.';
  }
  return 'Không thể mở camera. Vui lòng nhập thủ công.';
}
