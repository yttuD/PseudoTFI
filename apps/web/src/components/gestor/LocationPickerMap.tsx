'use client';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef } from 'react';

// Fix Leaflet's default icon path issues with Webpack
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

export default function LocationPickerMap({
  initialLocation,
  onLocationSelect
}: {
  initialLocation: { lat: number, lng: number } | null;
  onLocationSelect: (loc: { lat: number, lng: number }) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstanceRef.current) {
      // Centro por defecto: Buenos Aires si no hay ubicación inicial
      const defaultCenter = [-34.6037, -58.3816];
      const center = initialLocation ? [initialLocation.lat, initialLocation.lng] : defaultCenter;
      
      mapInstanceRef.current = L.map(mapRef.current, {
        center: center as L.LatLngExpression,
        zoom: initialLocation ? 15 : 10,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(mapInstanceRef.current);

      if (initialLocation) {
        markerRef.current = L.marker([initialLocation.lat, initialLocation.lng], { icon })
          .addTo(mapInstanceRef.current);
      }

      mapInstanceRef.current.on('click', (e) => {
        const { lat, lng } = e.latlng;
        
        if (markerRef.current) {
          markerRef.current.setLatLng(e.latlng);
        } else {
          markerRef.current = L.marker(e.latlng, { icon }).addTo(mapInstanceRef.current!);
        }
        
        onLocationSelect({ lat, lng });
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once to initialize

  return (
    <div ref={mapRef} className="w-full h-full min-h-[400px] rounded-xl z-0" style={{ zIndex: 0 }} />
  );
}
