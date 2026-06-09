import { Loader2 } from 'lucide-react';

interface ReconciliationItem {
  material_name: string;
  unit: string;
  allocated: number; // Đã xuất kho
  used: number; // Đã ghi nhật ký
  discrepancy: number; // Chênh lệch
}

interface ReconciliationTableProps {
  reconciliationItems: ReconciliationItem[];
  loading: boolean;
}

export function ReconciliationTable({ reconciliationItems, loading }: ReconciliationTableProps) {
  const getDiscrepancyBadge = (item: ReconciliationItem) => {
    const diff = item.discrepancy;
    if (diff === 0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          0 {item.unit} ✅
        </span>
      );
    }

    if (diff > 0) {
      if (item.used === 0) {
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
            +{diff.toLocaleString()} {item.unit} 🔴
          </span>
        );
      }
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
          +{diff.toLocaleString()} {item.unit} ⚠️
        </span>
      );
    }

    // Negative discrepancy (e.g. used > allocated)
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
        {diff.toLocaleString()} {item.unit} (Ghi vượt)
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-2xl border border-[#e6ebe3]">
        <Loader2 className="h-8 w-8 animate-spin text-[#1b4332]" />
        <p className="text-sm font-semibold text-stone-500">Đang thực hiện đối chiếu...</p>
      </div>
    );
  }

  if (reconciliationItems.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-[#e6ebe3] text-stone-400 italic text-sm">
        Vui lòng chọn nông dân và khoảng thời gian để xem kết quả đối chiếu dữ liệu.
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
              <th className="px-6 py-4">Số lượng đã cấp (Xuất kho)</th>
              <th className="px-6 py-4">Số lượng thực canh tác (Ghi nhật ký)</th>
              <th className="px-6 py-4">Chênh lệch / Đối soát</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f3ee]">
            {reconciliationItems.map((item, index) => (
              <tr key={index} className="hover:bg-[#fbfcf9] transition-colors">
                <td className="px-6 py-4 font-bold text-stone-900">
                  {item.material_name}
                </td>
                <td className="px-6 py-4 font-mono font-semibold text-stone-700">
                  {item.allocated.toLocaleString()} {item.unit}
                </td>
                <td className="px-6 py-4 font-mono font-semibold text-stone-700">
                  {item.used.toLocaleString()} {item.unit}
                </td>
                <td className="px-6 py-4">
                  {getDiscrepancyBadge(item)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
