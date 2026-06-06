export default function CarbonPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Carbon Records</h1>
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-4">Season</th>
              <th className="p-4">Net Carbon (tCO2e)</th>
              <th className="p-4">Status</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="p-4">Spring 2026</td>
              <td className="p-4">12.5</td>
              <td className="p-4"><span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm">DRAFT</span></td>
              <td className="p-4"><button className="text-blue-600 text-sm">Verify</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
