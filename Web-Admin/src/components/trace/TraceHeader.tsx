import { Sprout } from 'lucide-react';

export function TraceHeader() {
  return (
    <div className="flex items-center gap-3 py-4 border-b border-stone-100 px-1">
      <div className="bg-[#1B5E20] text-white p-2 rounded-xl shadow-md">
        <Sprout className="h-6 w-6" />
      </div>
      <div>
        <h1 className="font-serif text-lg font-bold tracking-tight text-[#1B5E20]">
          AgriTrace Carbon
        </h1>
        <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">
          Cổng truy xuất nguồn gốc nông sản
        </p>
      </div>
    </div>
  );
}
