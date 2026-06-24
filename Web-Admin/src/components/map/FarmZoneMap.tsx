'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, Marker, useMapEvents, LayersControl, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Sprout, Navigation, Loader2 } from 'lucide-react';

// Helper component to programmatically pan/re-center Leaflet Map.
// `panOnly=true` means recenter WITHOUT changing the user's current zoom level —
// critical while drawing so adding a point doesn't snap the zoom back (bug fix #2).
function RecenterMap({ center, zoom, panOnly }: { center: [number, number]; zoom: number; panOnly?: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (panOnly) {
      // Keep the user's zoom; just pan to the new center.
      map.panTo(center, { animate: true });
    } else {
      map.setView(center, zoom);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center]);
  return null;
}

/**
 * Fit the map to a set of points exactly once (when `fitKey` changes).
 * Used when the Edit modal opens with pre-populated boundary points so the user
 * immediately sees their polygon framed correctly — instead of the default location.
 * Fires only on mount/key change, so subsequent edits/dragging never re-fit (bug fix #2 preserved).
 */
function FitBoundsOnMount({ points, fitKey }: { points: [number, number][]; fitKey: string | null }) {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 2) {
      const bounds = L.latLngBounds(points);
      // maxZoom caps auto-zoom so small polygons don't zoom in absurdly close.
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 18 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);
  return null;
}

// Custom modern Leaflet DivIcon for drawing vertices
const createVertexIcon = (index: number, isFirst: boolean) => {
  return L.divIcon({
    className: 'custom-vertex-marker',
    html: `<div class="relative flex items-center justify-center">
      <div class="w-4 h-4 rounded-full border-2 border-white shadow-md flex items-center justify-center font-bold text-[9px] text-white ${
        isFirst ? 'bg-emerald-600 ring-4 ring-emerald-300/50' : 'bg-[#1b4332]'
      }">
        ${index + 1}
      </div>
    </div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

interface MapEventsProps {
  onMapClick?: (lat: number, lng: number) => void;
}

function MapEvents({ onMapClick }: MapEventsProps) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

export interface ZoneData {
  id: string;
  farm_zone_code: string;
  zone_name: string;
  crop_type: string;
  area_sqm: number;
  boundary: {
    type: string;
    coordinates: number[][][];
  };
  farmer: {
    full_name: string;
  };
}

interface FarmZoneMapProps {
  zones?: ZoneData[];
  selectedZoneId?: string | null;
  isDrawing?: boolean;
  drawingPoints?: [number, number][]; // [lat, lng]
  onDrawingPointsChange?: (points: [number, number][]) => void;
  center?: [number, number];
  zoom?: number;
  /**
   * When set, the map fits its bounds to the current `drawingPoints` exactly once
   * (every time this key changes). Used when the Edit modal opens with a pre-populated
   * boundary so the user immediately sees their polygon framed correctly, instead of
   * the default location. Pass the editing zone's id (or a fresh token on each open).
   */
  initialFitKey?: string | null;
}

export function FarmZoneMap({
  zones = [],
  selectedZoneId = null,
  isDrawing = false,
  drawingPoints = [],
  onDrawingPointsChange,
  center = [12.6784, 108.2022], // Default to Central Highlands (Buôn Ma Thuột)
  zoom = 13,
  initialFitKey = null,
}: FarmZoneMapProps) {
  const [mapCenter, setMapCenter] = useState<[number, number]>(center);
  const [mapZoom, setMapZoom] = useState<number>(zoom);
  // Whether the map should pan without overriding the user's zoom. While drawing we
  // only pan (never setView), so adding points does NOT snap the zoom back (bug fix #2).
  const [panOnly, setPanOnly] = useState(false);
  // Track the previous point count so we only auto-pan on the FIRST drawn point —
  // subsequent points leave the user's viewport (and zoom) alone.
  const [drawingViewEstablished, setDrawingViewEstablished] = useState(false);

  // When opening the Edit modal with a pre-populated boundary, mark the view as
  // established so the "first-point" auto-pan logic doesn't fight the fit-bounds.
  // FitBoundsOnMount (rendered below) performs the actual bounds fit on this key change.
  useEffect(() => {
    if (isDrawing && initialFitKey && drawingPoints.length >= 2) {
      setDrawingViewEstablished(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFitKey]);

  // Auto-center map based on selected zone (display mode) — full setView (zoom + center).
  // NOTE: drawing mode intentionally does NOT live here. It is handled separately below
  // so that placing a point never resets the zoom.
  useEffect(() => {
    if (selectedZoneId) {
      const zone = zones.find((z) => z.id === selectedZoneId);
      if (zone && zone.boundary && zone.boundary.coordinates) {
        const coords = zone.boundary.coordinates[0];
        if (coords.length > 0) {
          setMapCenter([coords[0][1], coords[0][0]]);
          setMapZoom(17);
          setPanOnly(false);
        }
      }
    }
  }, [selectedZoneId, zones]);

  // Drawing mode: when the FIRST point is placed, establish the view once.
  // After that, adding/removing/moving points must NOT change the user's zoom or
  // pan — they are free to zoom in fully to place precise points (bug fix #2).
  useEffect(() => {
    if (!isDrawing) {
      setDrawingViewEstablished(false);
      return;
    }
    // First point establishes the view (zoom stays at the map default — user zooms from there).
    if (drawingPoints.length === 1 && !drawingViewEstablished) {
      setMapCenter(drawingPoints[0]);
      setPanOnly(true); // even the first recenter keeps the current zoom
      setDrawingViewEstablished(true);
    }
  }, [isDrawing, drawingPoints, drawingViewEstablished]);

  const [locating, setLocating] = useState(false);

  const locateUser = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!navigator.geolocation) {
      alert('Trình duyệt của bạn không hỗ trợ định vị GPS.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setMapCenter([latitude, longitude]);
        setMapZoom(17); // Zoom close to user GPS location
        setPanOnly(false); // full setView: recenter + zoom
        setLocating(false);
      },
      (error) => {
        console.error('Lỗi định vị:', error);
        alert('Không thể lấy vị trí hiện tại. Vui lòng cho phép quyền truy cập vị trí trên trình duyệt.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (!isDrawing || !onDrawingPointsChange) return;
    
    // Add point to drawing list
    // Check to prevent clicking very close to the same point twice
    const lastPoint = drawingPoints[drawingPoints.length - 1];
    if (lastPoint) {
      const dist = Math.sqrt(Math.pow(lastPoint[0] - lat, 2) + Math.pow(lastPoint[1] - lng, 2));
      if (dist < 0.00005) return;
    }

    onDrawingPointsChange([...drawingPoints, [lat, lng]]);
  };

  const removeLastPoint = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDrawingPointsChange || drawingPoints.length === 0) return;
    onDrawingPointsChange(drawingPoints.slice(0, -1));
  };

  const updateDrawingPoint = (index: number, newPoint: [number, number]) => {
    if (!onDrawingPointsChange) return;
    const updated = [...drawingPoints];
    updated[index] = newPoint;
    onDrawingPointsChange(updated);
  };

  const getCropColor = (cropType: string) => {
    switch (cropType) {
      case 'RICE':
        return '#e9c46a'; // Yellow
      case 'COFFEE':
        return '#8b5a2b'; // Brown
      case 'PEPPER':
        return '#2a9d8f'; // Teal
      case 'DURIAN':
        return '#e76f51'; // Terracotta
      case 'VEGETABLE':
        return '#52b788'; // Bright Green
      default:
        return '#1b4332'; // Deep Green
    }
  };

  const getCropLabel = (cropType: string) => {
    switch (cropType) {
      case 'RICE':
        return 'Lúa nước';
      case 'COFFEE':
        return 'Cà phê';
      case 'PEPPER':
        return 'Hồ tiêu';
      case 'DURIAN':
        return 'Sầu riêng';
      case 'VEGETABLE':
        return 'Rau củ';
      default:
        return 'Khác';
    }
  };

  return (
    <div className="relative w-full h-full min-h-[500px] bg-stone-100 rounded-2xl overflow-hidden border border-[#e6ebe3]">
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        style={{ width: '100%', height: '100%', minHeight: '500px' }}
        scrollWheelZoom={true}
        className="z-10"
      >
        <RecenterMap center={mapCenter} zoom={mapZoom} panOnly={panOnly} />
        {/* Edit modal: fit to the pre-populated boundary once on open (initialFitKey change). */}
        {isDrawing && initialFitKey && (
          <FitBoundsOnMount points={drawingPoints} fitKey={initialFitKey} />
        )}
        <LayersControl position="topright">
          <LayersControl.BaseLayer name="Bản đồ đường đi">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer checked name="Ảnh vệ tinh (ESRI)">
            <TileLayer
              attribution='&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        {/* Dynamic click handler for drawing */}
        {isDrawing && <MapEvents onMapClick={handleMapClick} />}

        {/* Render Saved Zones */}
        {!isDrawing &&
          zones.map((zone) => {
            if (!zone.boundary || !zone.boundary.coordinates) return null;
            const geojsonCoords = zone.boundary.coordinates[0];
            const leafletCoords = geojsonCoords.map((coord: number[]) => [coord[1], coord[0]] as [number, number]);
            
            const isSelected = selectedZoneId === zone.id;
            const cropColor = getCropColor(zone.crop_type);

            return (
              <Polygon
                key={zone.id}
                positions={leafletCoords}
                pathOptions={{
                  color: isSelected ? '#10b981' : cropColor,
                  fillColor: cropColor,
                  fillOpacity: isSelected ? 0.45 : 0.25,
                  weight: isSelected ? 3 : 2,
                  dashArray: isSelected ? '5, 5' : undefined,
                }}
              >
                <Popup className="custom-leaflet-popup">
                  <div className="p-2 space-y-1 text-stone-700 min-w-[180px]">
                    <div className="flex justify-between items-center border-b border-[#e6ebe3] pb-1.5 mb-1.5">
                      <span className="font-serif font-bold text-[#1b4332] text-sm">
                        {zone.zone_name}
                      </span>
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white"
                        style={{ backgroundColor: cropColor }}
                      >
                        {getCropLabel(zone.crop_type)}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 font-semibold flex items-center gap-1">
                      Mã vùng: <span className="font-mono text-stone-800">{zone.farm_zone_code}</span>
                    </p>
                    <p className="text-[11px] text-stone-500 font-semibold flex items-center gap-1">
                      Nông dân: <span className="text-stone-800">{zone.farmer?.full_name}</span>
                    </p>
                    <p className="text-[11px] text-stone-500 font-semibold flex items-center gap-1">
                      Diện tích: <span className="text-stone-900 font-bold">{zone.area_sqm.toLocaleString()} m²</span>
                    </p>
                  </div>
                </Popup>
              </Polygon>
            );
          })}

        {/* Render Drawing elements */}
        {isDrawing && (
          <>
            {/* Markers for vertices */}
            {drawingPoints.map((point, index) => (
              <Marker
                key={index}
                position={point}
                icon={createVertexIcon(index, index === 0)}
                draggable={isDrawing}
                eventHandlers={{
                  dragend: (event) => {
                    const marker = event.target as L.Marker;
                    const latLng = marker.getLatLng();
                    updateDrawingPoint(index, [latLng.lat, latLng.lng]);
                  },
                }}
              />
            ))}

            {/* In-progress Polyline */}
            {drawingPoints.length > 1 && (
              <Polyline
                positions={drawingPoints}
                pathOptions={{
                  color: '#1b4332',
                  weight: 3,
                  dashArray: '5, 10',
                }}
              />
            )}

            {/* Completed Preview Polygon */}
            {drawingPoints.length >= 3 && (
              <Polygon
                positions={[...drawingPoints, drawingPoints[0]]}
                pathOptions={{
                  color: '#10b981',
                  fillColor: '#10b981',
                  fillOpacity: 0.15,
                  weight: 2,
                }}
              />
            )}
          </>
        )}
      </MapContainer>

      {/* Floating Instructions/Controls */}
      {isDrawing && (
        <div className="absolute bottom-4 left-4 z-20 bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-lg border border-[#e6ebe3] max-w-xs space-y-3 font-sans">
          <div className="flex gap-2 items-start">
            <Sprout className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-[#1b4332] uppercase tracking-wider">Cách vẽ ranh giới</h4>
              <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
                Click chuột lên bản đồ để thêm góc vùng trồng. Kéo thả các điểm đã tạo để tinh chỉnh ranh giới. Vẽ tối thiểu 3 điểm.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={locateUser}
            disabled={locating}
            className="w-full flex items-center justify-center gap-1.5 bg-[#1b4332] hover:bg-[#143225] text-white py-2 px-3 rounded-lg text-[10px] font-bold transition-all disabled:opacity-50 shadow-sm"
          >
            {locating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Navigation className="h-3.5 w-3.5 rotate-45 text-emerald-300 fill-emerald-300" />
            )}
            {locating ? 'Đang định vị GPS...' : '📍 Định vị vị trí của tôi'}
          </button>

          <div className="flex gap-2 justify-between border-t border-[#e6ebe3] pt-3">
            <button
              type="button"
              onClick={removeLastPoint}
              disabled={drawingPoints.length === 0}
              className="px-2.5 py-1.5 border border-stone-200 hover:bg-stone-50 rounded-lg text-[10px] font-bold text-stone-600 disabled:opacity-50 transition-all flex items-center gap-1"
            >
              Lùi 1 điểm
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onDrawingPointsChange) onDrawingPointsChange([]);
              }}
              disabled={drawingPoints.length === 0}
              className="px-2.5 py-1.5 border border-red-200 hover:bg-red-50 text-red-700 rounded-lg text-[10px] font-bold disabled:opacity-50 transition-all"
            >
              Xóa ranh giới
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
