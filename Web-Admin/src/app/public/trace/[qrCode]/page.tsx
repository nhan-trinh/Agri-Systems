'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/axios';
import { TraceHeader } from '@/components/trace/TraceHeader';
import { TraceProductInfo } from '@/components/trace/TraceProductInfo';
import { TraceFarmerCard } from '@/components/trace/TraceFarmerCard';
import { TraceCarbonBadge } from '@/components/trace/TraceCarbonBadge';
import { TraceRecalledWarning } from '@/components/trace/TraceRecalledWarning';
import { TraceFarmingTimeline } from '@/components/trace/TraceFarmingTimeline';
import { Loader2, AlertTriangle, AlertCircle } from 'lucide-react';
import dynamic from 'next/dynamic';
import { TracingData } from '@/lib/types';

const TraceFarmMap = dynamic(() => import('@/components/trace/TraceFarmMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[250px] bg-stone-100 rounded-xl flex items-center justify-center font-bold text-xs text-stone-400">
      <Loader2 className="h-5 w-5 animate-spin mr-1.5" />
      Đang tải bản đồ ranh giới...
    </div>
  ),
});

export default function PublicTracePage() {
  const params = useParams();
  const qrCodeValue = decodeURIComponent(params.qrCode as string);
  
  const [data, setData] = useState<TracingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ code?: string; message: string } | null>(null);

  useEffect(() => {
    const fetchTraceData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await apiClient.get(`/qr/trace/${encodeURIComponent(qrCodeValue)}`);
        if (res.data?.success) {
          setData(res.data.data);
        }
      } catch (err) {
        console.error('Lỗi tra cứu:', err);
        const axiosError = err as { response?: { data?: { message?: string; code?: string } } };
        const errMsg = axiosError.response?.data?.message || 'Không thể tra cứu thông tin sản phẩm';
        const errCode = axiosError.response?.data?.code || 'ERROR';
        setError({ code: errCode, message: errMsg });
      } finally {
        setLoading(false);
      }
    };
    if (qrCodeValue) {
      fetchTraceData();
    }
  }, [qrCodeValue]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#1B5E20]" />
        <span className="text-xs font-semibold text-stone-500">Đang truy xuất nguồn gốc sản phẩm...</span>
      </div>
    );
  }

  // Handle Recalled Warning directly
  if (data?.status === 'RECALLED' || error?.code === 'QR_RECALLED') {
    return (
      <TraceRecalledWarning
        batchName={data?.batch?.batch_name || 'Sản phẩm liên kết'}
        recallReason={data?.recall_reason || error?.message}
        recalledAt={data?.recalled_at}
        cooperativeName={data?.cooperative?.name || 'Hợp Tác Xã'}
      />
    );
  }

  // Handle errors
  if (error || !data) {
    const isInactive = data?.status === 'INACTIVE' || error?.code === 'QR_NOT_ACTIVATED';
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-sm rounded-3xl border border-stone-200 shadow-md p-6 space-y-4 text-center font-sans">
          <div className={`p-4 rounded-full w-fit mx-auto ${isInactive ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
            {isInactive ? <AlertCircle className="h-8 w-8" /> : <AlertTriangle className="h-8 w-8" />}
          </div>
          <div className="space-y-1">
            <h3 className="font-serif text-lg font-bold text-stone-800">
              {isInactive ? 'Sản phẩm chưa được kích hoạt' : 'Lỗi truy xuất nguồn gốc'}
            </h3>
            <p className="text-xs text-stone-500 leading-normal font-semibold">
              {error?.message || 'Mã QR không hợp lệ hoặc không tồn tại trên hệ thống.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans pb-10">
      <div className="w-full max-w-md mx-auto bg-[#F9FAFB] px-4 py-3 space-y-4">
        {/* Header */}
        <TraceHeader />

        {/* Product Details */}
        <TraceProductInfo batch={data.batch} />

        {/* Farm Map */}
        {data.farm_zone?.boundary && (
          <TraceFarmMap
            boundary={data.farm_zone.boundary}
            zoneName={data.farm_zone.zone_name}
            areaSqm={data.farm_zone.area_sqm}
          />
        )}

        {/* Farmer info */}
        <TraceFarmerCard farmer={data.farmer} cooperative={data.cooperative} />

        {/* Timeline */}
        <TraceFarmingTimeline logs={data.farming_logs || []} />

        {/* Carbon Badge */}
        {data.carbon_record && <TraceCarbonBadge carbonRecord={data.carbon_record} />}

        {/* Footer */}
        <div className="text-center text-[10px] text-stone-400 font-bold border-t border-stone-100 pt-4 leading-normal">
          <p>Mã QR: {qrCodeValue.substring(qrCodeValue.lastIndexOf('/') + 1)}</p>
          <p className="mt-1">© AgriTrace Carbon. Mọi quyền được bảo lưu.</p>
        </div>
      </div>
    </div>
  );
}
