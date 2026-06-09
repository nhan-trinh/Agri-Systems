import { TransactionType } from '@/lib/types';
import { TransactionTypeTag } from './TransactionTypeTag';
import { Loader2, HelpCircle } from 'lucide-react';

interface Transaction {
  id: string;
  material_id: string;
  transaction_type: TransactionType;
  quantity: number;
  unit_price: number | null;
  supplier: string | null;
  invoice_no: string | null;
  recipient_farmer_id: string | null;
  purpose: string | null;
  transaction_date: string;
  expiry_date: string | null;
  notes: string | null;
  created_by: string;
  material: {
    material_name: string;
    unit: string;
  };
}

interface TransactionTableProps {
  transactions: Transaction[];
  loading: boolean;
  farmerMap?: Record<string, string>;
}

export function TransactionTable({ transactions, loading, farmerMap }: TransactionTableProps) {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-2xl border border-[#e6ebe3]">
        <Loader2 className="h-8 w-8 animate-spin text-[#1b4332]" />
        <p className="text-sm font-semibold text-stone-500">Đang tải lịch sử giao dịch...</p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-[#e6ebe3]">
        <p className="text-stone-500 font-medium">Không tìm thấy giao dịch nào trong khoảng thời gian đã chọn</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e6ebe3] overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm text-stone-600">
          <thead className="bg-[#fcfdfa] border-b border-[#e6ebe3] text-stone-500 font-semibold text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Ngày</th>
              <th className="px-6 py-4">Loại GD</th>
              <th className="px-6 py-4">Vật tư</th>
              <th className="px-6 py-4">Số lượng</th>
              <th className="px-6 py-4">Nông dân</th>
              <th className="px-6 py-4">Mục đích / Nhà CC</th>
              <th className="px-6 py-4">Người tạo</th>
              <th className="px-6 py-4 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f3ee]">
            {transactions.map((tx) => {
              let farmerName = '-';
              let partnerOrPurpose = '-';

              if (tx.transaction_type === 'IMPORT') {
                partnerOrPurpose = `Nhà CC: ${tx.supplier || 'Không rõ'} (HĐ: ${tx.invoice_no || '-'})`;
              } else if (tx.transaction_type === 'EXPORT') {
                farmerName = farmerMap?.[tx.recipient_farmer_id || ''] || tx.recipient_farmer_id || '-';
                partnerOrPurpose = tx.purpose || '-';
              } else if (tx.transaction_type === 'RETURN') {
                farmerName = farmerMap?.[tx.recipient_farmer_id || ''] || tx.recipient_farmer_id || '-';
                partnerOrPurpose = `Lý do: ${tx.purpose || '-'}`;
              }

              return (
                <tr
                  key={tx.id}
                  className="hover:bg-[#fbfcf9] transition-colors group"
                >
                  <td className="px-6 py-4 font-medium text-stone-500 whitespace-nowrap">
                    {formatDate(tx.transaction_date)}
                  </td>
                  <td className="px-6 py-4">
                    <TransactionTypeTag type={tx.transaction_type} />
                  </td>
                  <td className="px-6 py-4 font-bold text-stone-900">
                    {tx.material.material_name}
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-stone-800">
                    {tx.quantity.toLocaleString()} {tx.material.unit}
                  </td>
                  <td className="px-6 py-4 font-semibold text-stone-700 whitespace-nowrap">
                    {farmerName}
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold text-stone-600 max-w-xs truncate" title={partnerOrPurpose}>
                    {partnerOrPurpose}
                  </td>
                  <td className="px-6 py-4 font-medium text-stone-500">
                    {tx.created_by}
                  </td>
                  <td className="px-6 py-4 text-center relative">
                    <div className="flex justify-center items-center">
                      <div className="relative group/tooltip">
                        <HelpCircle className="h-4 w-4 text-stone-400 hover:text-stone-600 cursor-pointer" />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 bg-stone-800 text-white text-[10px] font-bold rounded-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all shadow-lg text-center z-10">
                          Phiếu đã tạo không thể sửa đổi. Nếu cần điều chỉnh, vui lòng tạo một phiếu đối nghịch.
                        </span>
                      </div>
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
