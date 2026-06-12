import { Users, MapPin } from 'lucide-react';

interface TraceFarmerCardProps {
  farmer: any;
  cooperative: any;
}

export function TraceFarmerCard({ farmer, cooperative }: TraceFarmerCardProps) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm space-y-3">
      <h3 className="font-serif text-sm font-bold text-[#1B5E20] flex items-center gap-1.5">
        <Users className="h-4 w-4" />
        👨‍🌾 Thông tin hộ sản xuất
      </h3>
      <div className="space-y-1 text-xs font-medium text-stone-600">
        <p>Hộ nông dân: <span className="font-bold text-stone-800">{farmer.full_name}</span></p>
        <p className="flex items-center gap-1 mt-1">
          <MapPin className="h-3.5 w-3.5 text-stone-400" />
          {farmer.address}
        </p>
        <p className="pt-2 border-t border-stone-100 text-[10px] font-bold text-emerald-800 block uppercase mt-2">
          Hợp tác xã liên kết
        </p>
        <p className="font-bold text-stone-800 text-xs mt-1">{cooperative.name}</p>
        <p className="text-[11px] text-stone-400">SĐT: {cooperative.phone}</p>
      </div>
    </div>
  );
}
