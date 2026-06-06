'use client';
import { useRef, useState } from 'react';

export function CameraCapture() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streamActive, setStreamActive] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreamActive(true);
      }
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  return (
    <div className="border p-4 rounded-lg bg-white">
      {!streamActive ? (
        <button onClick={startCamera} className="bg-green-600 text-white px-4 py-2 rounded">Start Camera</button>
      ) : (
        <video ref={videoRef} autoPlay playsInline className="w-full max-w-md border rounded" />
      )}
    </div>
  );
}
