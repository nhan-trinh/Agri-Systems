import { useEffect, useState } from 'react';

export function useQRStream(batchId: string) {
  const [status, setStatus] = useState('PENDING');

  useEffect(() => {
    if (!batchId) return;
    const eventSource = new EventSource(`${process.env.NEXT_PUBLIC_API_URL}/qr/batches/${batchId}/stream`);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setStatus(data.status);
    };

    return () => eventSource.close();
  }, [batchId]);

  return status;
}
