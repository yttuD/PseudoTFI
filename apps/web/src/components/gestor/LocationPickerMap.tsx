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
  onLocationSelect,
  onAddressChange
}: {
  initialLocation: { lat: number, lng: number } | null;
  onLocationSelect: (loc: { lat: number, lng: number }) => void;
  onAddressChange?: (address: string) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onLocationSelectRef = useRef(onLocationSelect);
  const onAddressChangeRef = useRef(onAddressChange);

  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
    onAddressChangeRef.current = onAddressChange;
  }, [onLocationSelect, onAddressChange]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstanceRef.current) {
      // Centro por defecto: Goya, Corrientes [-29.1442, -59.2644] si no hay ubicación inicial
      const defaultCenter = [-29.1442, -59.2644];
      const center = initialLocation ? [initialLocation.lat, initialLocation.lng] : defaultCenter;
      
      mapInstanceRef.current = L.map(mapRef.current, {
        center: center as L.LatLngExpression,
        zoom: initialLocation ? 15 : 13,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(mapInstanceRef.current);

      if (initialLocation) {
        markerRef.current = L.marker([initialLocation.lat, initialLocation.lng], { icon })
          .addTo(mapInstanceRef.current);
      }

      mapInstanceRef.current.on('click', async (e) => {
        const { lat, lng } = e.latlng;
        
        if (markerRef.current) {
          markerRef.current.setLatLng(e.latlng);
        } else {
          markerRef.current = L.marker(e.latlng, { icon }).addTo(mapInstanceRef.current!);
        }
        
        onLocationSelectRef.current({ lat, lng });

        // Reverse Geocoding inmediato con Nominatim (OSM)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
            { headers: { 'User-Agent': 'RendoApp/1.0 (contacto@rendo.com.ar)' } }
          );
          if (res.ok) {
            const data = await res.json();
            if (data?.display_name) {
              const road = data.address?.road || '';
              const houseNumber = data.address?.house_number || '';
              const city = data.address?.city || data.address?.town || 'Goya';
              const detectedAddress = road ? `${road} ${houseNumber}, ${city}`.trim() : data.display_name;
              onAddressChangeRef.current?.(detectedAddress);
            }
          }
        } catch (err) {
          console.error('Error en geocodificación inversa:', err);
        }
      });

      // Re-invalidate size after container renders or transitions
      const timer = setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 200);

      const resizeObserver = new ResizeObserver(() => {
        mapInstanceRef.current?.invalidateSize();
      });
      if (mapRef.current) {
        resizeObserver.observe(mapRef.current);
      }

      return () => {
        clearTimeout(timer);
        resizeObserver.disconnect();
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
          markerRef.current = null;
        }
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once to initialize

  // Escuchar actualizaciones dinámicas de ubicación (geocodificación o selección externa)
  useEffect(() => {
    if (!mapInstanceRef.current || !initialLocation) return;
    const { lat, lng } = initialLocation;
    
    // Recentrado suave y animado
    mapInstanceRef.current.setView([lat, lng], 17, { animate: true });
    
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { icon }).addTo(mapInstanceRef.current);
    }
  }, [initialLocation]);

  return (
    <div ref={mapRef} className="w-full h-full min-h-[400px] rounded-xl z-0" style={{ zIndex: 0 }} />
  );
}
