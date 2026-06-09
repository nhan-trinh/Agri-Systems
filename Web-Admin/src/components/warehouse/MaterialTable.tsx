import { MaterialType } from '@/lib/types';
import { Edit2, Trash2, Loader2 } from 'lucide-react';

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

interface MaterialTableProps {
  materials: Material[];
  onEdit: (material: Material) => void;
  onDelete: (id: string) => void;
  loading: boolean;
}

export function MaterialTable({ materials, onEdit, onDelete, loading }: MaterialTableProps) {
  const getTypeBadgeStyles = (type: MaterialType) => {
    switch (type) {
      case 'SEED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'FERTILIZER':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'PESTICIDE':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'EQUIPMENT':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'OTHER':
      default:
        return 'bg-stone-50 text-stone-600 border-stone-200';
    }
  };

  const getTypeLabel = (type: MaterialType) => {
    switch (type) {
      case 'SEED':
        return 'Hạt giống';
      case 'FERTILIZER':
        return 'Phân bón';
      case 'PESTICIDE':
        return 'Thuốc BVTV';
      case 'EQUIPMENT':
        return 'Thiết bị';
      case 'OTHER':
      default:
        return 'Khác';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-2xl border border-[#e6ebe3]">
        <Loader2 className="h-8 w-8 animate-spin text-[#1b4332]" />
        <p className="text-sm font-semibold text-stone-500">Đang tải danh mục vật tư...</p>
      </div>
    );
  }

  if (materials.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-[#e6ebe3]">
        <p className="text-stone-500 font-medium">Chưa có vật tư nào được tạo</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e6ebe3] overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm text-stone-600">
          <thead className="bg-[#fcfdfa] border-b border-[#e6ebe3] text-stone-500 font-semibold text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Tên vật tư</th>
              <th className="px-6 py-4">Loại</th>
              <th className="px-6 py-4">Đơn vị</th>
              <th className="px-6 py-4">Tồn kho hiện tại</th>
              <th className="px-6 py-4">Ngưỡng cảnh báo</th>
              <th className="px-6 py-4">Trạng thái</th>
              <th className="px-6 py-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f3ee]">
            {materials.map((material) => {
              const currentStock = material.stock_item?.current_stock ?? 0;
              return (
                <tr key={material.id} className="hover:bg-[#fbfcf9] transition-colors">
                  <td className="px-6 py-4 font-bold text-stone-900">
                    {material.material_name}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getTypeBadgeStyles(material.material_type)}`}>
                      {getTypeLabel(material.material_type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-stone-700">
                    {material.unit}
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-stone-800">
                    {currentStock.toLocaleString()} {material.unit}
                  </td>
                  <td className="px-6 py-4 font-mono font-medium text-stone-500">
                    {material.min_stock_alert.toLocaleString()} {material.unit}
                  </td>
                  <td className="px-6 py-4">
                    {material.is_active ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Hoạt động
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-stone-100 text-stone-400 border border-stone-200">
                        Vô hiệu hóa
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onEdit(material)}
                        className="p-1.5 text-stone-500 hover:text-[#1b4332] hover:bg-[#f0f4ee] rounded-lg transition-all"
                        title="Chỉnh sửa vật tư"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDelete(material.id)}
                        className="p-1.5 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Xóa vật tư"
                      >
                        <Trash2 className="h-4 w-4" />
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
