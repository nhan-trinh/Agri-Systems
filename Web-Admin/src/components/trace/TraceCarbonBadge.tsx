interface TraceCarbonBadgeProps {
  carbonRecord: {
    status: string;
    net_carbon_tCO2e: number;
    certificate_no: string;
    credit_amount_tCO2e: number;
  };
}

export function TraceCarbonBadge({ carbonRecord }: TraceCarbonBadgeProps) {
  if (!carbonRecord || carbonRecord.status !== 'ISSUED') return null;

  const isNetNegative = carbonRecord.net_carbon_tCO2e < 0;

  return (
    <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm space-y-3">
      <h3 className="font-serif text-sm font-bold text-[#1B5E20] flex items-center gap-1.5">
        🌿 Nhật ký phát thải Carbon
      </h3>
      <div className="space-y-3 pt-1">
        <div className="flex justify-between items-center bg-[#F9FAFB] p-3 rounded-xl border border-stone-100">
          <span className="text-xs font-medium text-stone-500">Phát thải ròng:</span>
          <span className={`text-base font-extrabold ${isNetNegative ? 'text-[#2E7D32]' : 'text-[#B71C1C]'}`}>
            {carbonRecord.net_carbon_tCO2e.toLocaleString()} tCO2e
          </span>
        </div>

        <div className="text-[11px] text-stone-600 leading-normal space-y-1.5 font-medium">
          <p className="font-bold text-emerald-800 flex items-center gap-1">
            🏅 Tín chỉ Carbon đã xác thực
          </p>
          <p>Mã chứng nhận: <span className="font-mono font-bold text-stone-800">{carbonRecord.certificate_no}</span></p>
          <p>Số tín chỉ: <span className="font-bold text-stone-800">{carbonRecord.credit_amount_tCO2e} tCO2e</span></p>
        </div>
      </div>
    </div>
  );
}
