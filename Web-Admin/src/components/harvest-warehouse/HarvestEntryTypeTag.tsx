import { ArrowDownToLine, Ship } from 'lucide-react';
import type { HarvestEntryType } from '@/lib/harvest-warehouse';

interface HarvestEntryTypeTagProps {
  type: HarvestEntryType;
}

/**
 * RECEIVE/SHIP badge — parallel to the Material Warehouse TransactionTypeTag.
 */
export function HarvestEntryTypeTag({ type }: HarvestEntryTypeTagProps) {
  switch (type) {
    case 'RECEIVE':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <ArrowDownToLine className="h-3.5 w-3.5" />
          Nhận vào
        </span>
      );
    case 'SHIP':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <Ship className="h-3.5 w-3.5" />
          Xuất đi
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
