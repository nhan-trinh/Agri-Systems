import { Camera } from 'lucide-react';
import { useState } from 'react';

interface ActivityLog {
  activity_date: string;
  activity_type: 'SEEDING' | 'FERTILIZING' | 'PESTICIDE' | 'IRRIGATION' | 'HARVESTING' | 'OTHER';
  notes?: string;
  photo_urls?: string[];
  fertilizer_type?: string;
  quantity_kg?: number;
  product_name?: string;
  dosage?: number;
  unit?: string;
  water_volume_m3?: number;
  duration_hours?: number;
  yield_kg?: number;
  harvest_method?: string;
}

const activityConfig = {
  SEEDING: { icon: '🌱', label: 'Gieo sạ / Trồng cây', color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
  FERTILIZING: { icon: '🌿', label: 'Bón phân', color: 'text-[#2E7D32] bg-emerald-50 border-emerald-100' },
  PESTICIDE: { icon: '💊', label: 'Phun thuốc BVTV', color: 'text-[#E65100] bg-orange-50 border-orange-100' },
  IRRIGATION: { icon: '💧', label: 'Tưới nước', color: 'text-[#1565C0] bg-blue-50 border-blue-100' },
  HARVESTING: { icon: '🌾', label: 'Thu hoạch', color: 'text-amber-800 bg-amber-50 border-amber-100' },
  OTHER: { icon: '📝', label: 'Hoạt động khác', color: 'text-stone-500 bg-stone-50 border-stone-100' },
};

export function TraceFarmingTimeline({ logs }: { logs: ActivityLog[] }) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  if (logs.length === 0) {
    return (
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm text-center py-8">
        <p className="text-stone-500 text-xs font-semibold">Chưa có nhật ký hoạt động sản xuất</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm space-y-4">
      <h3 className="font-serif text-sm font-bold text-[#1B5E20]">
        📅 Nhật ký canh tác & chăm sóc
      </h3>

      <div className="relative pl-4 border-l border-stone-200 space-y-6 pt-2">
        {logs.map((log, index) => {
          const config = activityConfig[log.activity_type] || activityConfig.OTHER;
          const dateStr = new Date(log.activity_date).toLocaleDateString('vi-VN');

          let detailsStr = '';
          if (log.activity_type === 'FERTILIZING') {
            detailsStr = `Loại phân: ${log.fertilizer_type || '-'} | Lượng dùng: ${log.quantity_kg?.toLocaleString()} kg`;
          } else if (log.activity_type === 'PESTICIDE') {
            detailsStr = `Thuốc: ${log.product_name || '-'} | Liều lượng: ${log.dosage?.toLocaleString()} ${log.unit || 'ml'}`;
          } else if (log.activity_type === 'IRRIGATION') {
            detailsStr = `Lượng nước: ${log.water_volume_m3?.toLocaleString()} m³ | Thời gian: ${log.duration_hours} giờ`;
          } else if (log.activity_type === 'HARVESTING') {
            detailsStr = `Sản lượng: ${log.yield_kg?.toLocaleString()} kg | Phương pháp: ${log.harvest_method || '-'}`;
          }

          return (
            <div key={index} className="relative">
              <span className="absolute -left-[25px] top-0 bg-white border border-stone-200 text-sm p-0.5 rounded-full flex items-center justify-center">
                {config.icon}
              </span>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-stone-400 block">{dateStr}</span>
                <h4 className="text-xs font-bold text-stone-800 leading-normal">{config.label}</h4>
                {detailsStr && <p className="text-[11px] font-bold text-[#2E7D32]">{detailsStr}</p>}
                {log.notes && <p className="text-[11px] text-stone-500 font-medium leading-relaxed">&ldquo;{log.notes}&rdquo;</p>}

                {log.photo_urls && log.photo_urls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {log.photo_urls.map((photo, pIdx) => (
                      <div
                        key={pIdx}
                        onClick={() => setSelectedPhoto(photo)}
                        className="relative aspect-video rounded-lg overflow-hidden border border-stone-200 cursor-zoom-in group hover:opacity-90 transition-all"
                      >
                        <img src={photo} alt="Ảnh thực địa" className="w-full h-full object-cover" />
                        <span className="absolute bottom-1 right-1 bg-black/60 p-0.5 rounded text-white opacity-0 group-hover:opacity-100 transition-all">
                          <Camera className="h-3 w-3" />
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox photo Modal */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="relative max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl border border-stone-800 shadow-2xl">
            <img src={selectedPhoto} alt="Ảnh thực địa phóng to" className="object-contain max-h-[80vh] w-full" />
          </div>
        </div>
      )}
    </div>
  );
}
