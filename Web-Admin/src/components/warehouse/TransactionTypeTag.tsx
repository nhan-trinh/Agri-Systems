import { TransactionType } from '@/lib/types';
import { ArrowDown, ArrowUp, RotateCcw } from 'lucide-react';

interface TransactionTypeTagProps {
  type: TransactionType;
}

export function TransactionTypeTag({ type }: TransactionTypeTagProps) {
  switch (type) {
    case 'IMPORT':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <ArrowDown className="h-3.5 w-3.5" />
          ⬇ Nhập kho
        </span>
      );
    case 'EXPORT':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <ArrowUp className="h-3.5 w-3.5" />
          ⬆ Xuất kho
        </span>
      );
    case 'RETURN':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
          <RotateCcw className="h-3.5 w-3.5" />
          ↩ Hoàn trả
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-700 border border-stone-200">
          {type}
        </span>
      );
  }
}
