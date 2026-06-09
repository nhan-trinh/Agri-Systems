import { AlertTriangle, X } from 'lucide-react';

interface StockAlertBannerProps {
  lowStockCount: number;
  nearExpiryCount: number;
  onFilterLowStock: () => void;
  onFilterNearExpiry: () => void;
  onClearFilters: () => void;
  activeFilter: string;
}

export function StockAlertBanner({
  lowStockCount,
  nearExpiryCount,
  onFilterLowStock,
  onFilterNearExpiry,
  onClearFilters,
  activeFilter,
}: StockAlertBannerProps) {
  const totalAlerts = lowStockCount + nearExpiryCount;

  if (totalAlerts === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-[#FFF8E1] border-l-4 border-l-[#E65100] rounded-r-xl shadow-sm gap-3 transition-all">
      <div className="flex items-center gap-2.5">
        <AlertTriangle className="h-5 w-5 text-[#E65100] flex-shrink-0" />
        <span className="text-sm font-semibold text-stone-800">
          {totalAlerts} vật tư cần chú ý: {lowStockCount > 0 ? `${lowStockCount} sắp hết hàng` : ''}
          {lowStockCount > 0 && nearExpiryCount > 0 ? ' và ' : ''}
          {nearExpiryCount > 0 ? `${nearExpiryCount} sắp hết hạn hoặc đã hết hạn` : ''}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {activeFilter ? (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1 text-xs font-bold text-[#E65100] hover:text-[#b23c00] underline"
          >
            Hiển thị tất cả
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <div className="flex gap-4">
            {lowStockCount > 0 && (
              <button
                onClick={onFilterLowStock}
                className="text-xs font-bold text-[#E65100] hover:text-[#b23c00] underline"
              >
                Xem sắp hết hàng →
              </button>
            )}
            {nearExpiryCount > 0 && (
              <button
                onClick={onFilterNearExpiry}
                className="text-xs font-bold text-[#E65100] hover:text-[#b23c00] underline"
              >
                Xem sắp hết hạn →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
