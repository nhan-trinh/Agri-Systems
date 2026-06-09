import { MaterialType } from '@/lib/types';
import { PlusCircle, MinusCircle, RotateCcw, Loader2 } from 'lucide-react';

interface Material {
  id: string;
  material_name: string;
  material_type: MaterialType;
  unit: string;
  min_stock_alert: number;
  is_active: boolean;
  stock_item?: {
    current_stock: number;
    expiry_date: string | null;
  } | null;
}

interface StockTableProps {
  materials: Material[];
  onImportClick: (material: Material) => void;
  onExportClick: (material: Material) => void;
  onReturnClick: (material: Material) => void;
  loading: boolean;
}

export function StockTable({
  materials,
  onImportClick,
  onExportClick,
  onReturnClick,
  loading,
}: StockTableProps) {
  const getTypeLabel = (type: MaterialType) => {
    switch (type) {
      case 'SEED': return 'Hạt giống';
      case 'FERTILIZER': return 'Phân bón';
      case 'PESTICIDE': return 'Thuốc BVTV';
      case 'EQUIPMENT': return 'Thiết bị';
      case 'OTHER':
      default:
        return 'Khác';
    }
  };

  const getAlertState = (material: Material) => {
    const stock = material.stock_item?.current_stock ?? 0;
    const minAlert = material.min_stock_alert;
    const expiryStr = material.stock_item?.expiry_date;

    let isExpired = false;
    let isNearExpiry = false;

    if (expiryStr) {
      const expiryDate = new Date(expiryStr);
      const now = new Date();
      const diffTime = expiryDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        isExpired = true;
      } else if (diffDays <= 30) {
        isNearExpiry = true;
      }
    }

    const isLowStock = stock <= minAlert;

    if (isExpired) {
      return {
        label: 'Đã hết hạn',
        style: 'bg-red-50 text-red-700 border-red-200',
      };
    }
    if (isNearExpiry && isLowStock) {
      return {
        label: 'Hết hàng & Sắp hết hạn',
        style: 'bg-orange-50 text-orange-700 border-orange-200',
      };
    }
    if (isNearExpiry) {
      return {
        label: 'Sắp hết hạn',
        style: 'bg-orange-50 text-orange-700 border-orange-200',
      };
    }
    if (isLowStock) {
      return {
        label: 'Sắp hết hàng',
        style: 'bg-orange-50 text-orange-700 border-orange-200',
      };
    }

    return {
      label: 'Bình thường',
      style: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Không có';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-2xl border border-[#e6ebe3]">
        <Loader2 className="h-8 w-8 animate-spin text-[#1b4332]" />
        <p className="text-sm font-semibold text-stone-500">Đang tải trạng thái tồn kho...</p>
      </div>
    );
  }

  if (materials.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-[#e6ebe3]">
        <p className="text-stone-500 font-medium">Kho trống hoặc không tìm thấy vật tư phù hợp</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e6ebe3] overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm text-stone-600">
          <thead className="bg-[#fcfdfa] border-b border-[#e6ebe3] text-stone-500 font-semibold text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Vật tư</th>
              <th className="px-6 py-4">Loại</th>
              <th className="px-6 py-4">Đơn vị</th>
              <th className="px-6 py-4">Tồn kho</th>
              <th className="px-6 py-4">Ngưỡng cảnh báo</th>
              <th className="px-6 py-4">Hạn sử dụng</th>
              <th className="px-6 py-4">Trạng thái</th>
              <th className="px-6 py-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f3ee]">
            {materials.map((material) => {
              const currentStock = material.stock_item?.current_stock ?? 0;
              const alert = getAlertState(material);
              return (
                <tr key={material.id} className="hover:bg-[#fbfcf9] transition-colors">
                  <td className="px-6 py-4 font-bold text-stone-900">
                    {material.material_name}
                  </td>
                  <td className="px-6 py-4 text-stone-500 font-medium">
                    {getTypeLabel(material.material_type)}
                  </td>
                  <td className="px-6 py-4 font-medium text-stone-500">
                    {material.unit}
                  </td>
                  <td className={`px-6 py-4 font-mono font-bold ${currentStock <= material.min_stock_alert ? 'text-orange-600' : 'text-stone-800'}`}>
                    {currentStock.toLocaleString()} {material.unit}
                  </td>
                  <td className="px-6 py-4 font-mono text-stone-500">
                    {material.min_stock_alert.toLocaleString()} {material.unit}
                  </td>
                  <td className="px-6 py-4 font-medium text-stone-600">
                    {formatDate(material.stock_item?.expiry_date)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${alert.style}`}>
                      {alert.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onImportClick(material)}
                        disabled={!material.is_active}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-all"
                        title="Nhập thêm kho"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        Nhập kho
                      </button>
                      <button
                        onClick={() => onExportClick(material)}
                        disabled={!material.is_active}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-all"
                        title="Xuất cấp phát nông dân"
                      >
                        <MinusCircle className="h-3.5 w-3.5" />
                        Xuất kho
                      </button>
                      <button
                        onClick={() => onReturnClick(material)}
                        disabled={!material.is_active}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-all"
                        title="Nông dân trả lại vật tư"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Hoàn trả
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
