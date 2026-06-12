'use client';

import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import { useEffect, useState } from 'react';
import 'leaflet/dist/leaflet.css';

interface TraceFarmMapProps {
  boundary: {
    type: string;
    coordinates: number[][][];
  };
  zoneName: string;
  areaSqm: number;
}

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 16);
  }, [center, map]);
  return null;
}

export default function TraceFarmMap({ boundary, zoneName, areaSqm }: TraceFarmMapProps) {
  const [center, setCenter] = useState<[number, number]>([12.6784, 108.2022]);
  const [coords, setCoords] = useState<[number, number][]>([]);

  useEffect(() => {
    if (boundary && boundary.coordinates && boundary.coordinates[0]) {
      const geojsonCoords = boundary.coordinates[0];
      const leafletCoords = geojsonCoords.map(coord => [coord[1], coord[0]] as [number, number]);
      setCoords(leafletCoords);
      if (leafletCoords.length > 0) {
        setCenter(leafletCoords[0]);
      }
    }
  }, [boundary]);

  return (
    <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm space-y-3">
      <h3 className="font-serif text-sm font-bold text-[#1B5E20]">
        📍 Bản đồ ranh giới vùng trồng
      </h3>
      <div className="relative w-full h-[250px] bg-stone-100 rounded-xl overflow-hidden border border-stone-200">
        <MapContainer center={center} zoom={16} style={{ width: '100%', height: '100%' }} scrollWheelZoom={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <RecenterMap center={center} />
          {coords.length >= 3 && (
            <Polygon
              positions={coords}
              pathOptions={{
                color: '#1B5E20',
                fillColor: '#2E7D32',
                fillOpacity: 0.25,
                weight: 3,
              }}
            />
          )}
        </MapContainer>
      </div>
      <div className="flex justify-between items-center text-[11px] font-bold text-stone-500">
        <span>Vùng trồng: <strong className="text-stone-800">{zoneName}</strong></span>
        <span>Diện tích: <strong className="text-stone-800">{areaSqm.toLocaleString()} m²</strong></span>
      </div>
    </div>
  );
}
