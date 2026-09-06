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

export default function Map({
  location,
  exact
}: {
  location: { lat: number, lng: number } | null;
  exact: boolean;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!location || !mapRef.current) return;

    // Initialize map only once
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, {
        center: [location.lat, location.lng],
        zoom: exact ? 15 : 13,
        scrollWheelZoom: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(mapInstanceRef.current);

      if (exact) {
        L.marker([location.lat, location.lng], { icon })
          .addTo(mapInstanceRef.current)
          .bindPopup('Ubicación exacta de la propiedad');
      } else {
        L.circle([location.lat, location.lng], {
          radius: 500,
          fillColor: '#1A56DB',
          color: '#1A56DB'
        }).addTo(mapInstanceRef.current)
          .bindPopup('Zona aproximada de la propiedad');
      }
    }

    return () => {
      // Cleanup map on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [location, exact]);

  if (!location) {
    return <div className="bg-muted w-full h-full flex items-center justify-center text-muted-foreground">Ubicación no disponible</div>;
  }

  return (
    <div ref={mapRef} className="w-full h-full rounded-xl z-0" />
  );
}
