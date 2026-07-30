// src/components/map/LocationPicker.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';

interface LocationPickerProps {
  initialLocation?: { lat: number; lng: number };
  onLocationChange: (location: { lat: number; lng: number; address: string }) => void;
  initialAddress?: string;
}

type Suggestion = {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
};

/* =============== helpers carga robusta =============== */
function ensureCss(id: string, hrefs: string[]) {
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = hrefs[0];
  document.head.appendChild(link);
  // fallback si el primer origin no aplica
  if (hrefs.length > 1) {
    setTimeout(() => {
      const el = document.getElementById(id) as HTMLLinkElement | null;
      if (el && !el.sheet) el.href = hrefs[1];
    }, 1800);
  }
}

function loadScriptSeq(id: string, srcs: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) return resolve();
    let ix = 0;
    const next = () => {
      if (ix >= srcs.length) return reject(new Error(`No se pudo cargar ${id}`));
      const s = document.createElement('script');
      s.id = id;
      s.src = srcs[ix++];
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        s.remove();
        next();
      };
      document.head.appendChild(s);
    };
    next();
  });
}

/* =============== componente =============== */
const LocationPicker: React.FC<LocationPickerProps> = ({
  initialLocation,
  onLocationChange,
  initialAddress,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const geolocateRef = useRef<any>(null);

  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState(initialAddress ?? '');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const abortRef = useRef<AbortController | null>(null);

  const defaultLat = initialLocation?.lat ?? -33.4489;
  const defaultLng = initialLocation?.lng ?? -70.6693;

  const MAPBOX_TOKEN =
    '__REDACTED_SECRET__';

  /* ---------- reverse geocode ---------- */
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`);
      url.searchParams.set('access_token', MAPBOX_TOKEN);
      url.searchParams.set('language', 'es');
      const res = await fetch(url.toString());
      if (!res.ok) return '';
      const data = await res.json();
      return data?.features?.[0]?.place_name ?? '';
    } catch {
      return '';
    }
  };

  /* ---------- montar mapa (sin geocoder nativo) ---------- */
  useEffect(() => {
    let cancelled = false;
    if (typeof window === 'undefined') return;

    ensureCss('mapbox-gl-css', [
      'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css',
      'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/dist/mapbox-gl.css',
    ]);

    (async () => {
      await loadScriptSeq('mapbox-gl-js', [
        'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js',
        'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/dist/mapbox-gl.js',
      ]);
      if (cancelled || !mapContainer.current) return;

      const mapboxgl: any = (window as any).mapboxgl;
      mapboxgl.accessToken = MAPBOX_TOKEN;

      mapRef.current = new mapboxgl.Map({
        container: mapContainer.current!,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [defaultLng, defaultLat],
        zoom: initialLocation ? 15 : 5,
        attributionControl: false,
      });

      // Controles discretos
      mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      geolocateRef.current = new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
        showAccuracyCircle: false,
      });
      mapRef.current.addControl(geolocateRef.current, 'top-right');
      mapRef.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');
      mapRef.current.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-left');
      mapRef.current.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');

      // Marcador custom (drag)
      const markerEl = document.createElement('div');
      markerEl.className = 'ga-marker';
      markerEl.innerHTML = `<span class="ga-marker-dot"></span><span class="ga-marker-pulse"></span>`;
      markerRef.current = new mapboxgl.Marker({ element: markerEl, draggable: true })
        .setLngLat([defaultLng, defaultLat])
        .addTo(mapRef.current);

      markerRef.current.on('dragend', () => {
        const lngLat = markerRef.current.getLngLat();
        reverseGeocode(lngLat.lat, lngLat.lng).then((address) => {
          setQuery(address || '');
          onLocationChange({ lat: lngLat.lat, lng: lngLat.lng, address });
        });
      });

      // ⬇️ AHORA geolocate también hace reverse geocode y setea address automáticamente
      geolocateRef.current?.on('geolocate', async (pos: GeolocationPosition) => {
        const { latitude, longitude } = pos.coords;
        markerRef.current?.setLngLat([longitude, latitude]);
        mapRef.current?.easeTo({ center: [longitude, latitude], zoom: 16, duration: 500 });

        const address = await reverseGeocode(latitude, longitude);
        setQuery(address || '');
        onLocationChange({ lat: latitude, lng: longitude, address });
      });

      mapRef.current.on('load', () => setReady(true));
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch {}
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- sincroniza cambios entrantes ---------- */
  useEffect(() => {
    if (!ready || !initialLocation || !markerRef.current) return;
    markerRef.current.setLngLat([initialLocation.lng, initialLocation.lat]);
    mapRef.current?.flyTo({
      center: [initialLocation.lng, initialLocation.lat],
      zoom: 15,
      essential: true,
      duration: 360,
    });
  }, [initialLocation, ready]);

  /* ---------- detectar coordenadas (lat, lng) ---------- */
  const parseCoordinates = (input: string): { lat: number; lng: number } | null => {
    const match = input.trim().match(/^(-?\d+\.?\d*)\s*[,;\s]\s*(-?\d+\.?\d*)$/);
    if (!match) return null;
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (isNaN(lat) || isNaN(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
  };

  const applyCoordinates = async (lat: number, lng: number) => {
    markerRef.current?.setLngLat([lng, lat]);
    mapRef.current?.easeTo({ center: [lng, lat], zoom: 16, duration: 420 });
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
    const address = await reverseGeocode(lat, lng);
    if (address) setQuery(address);
    onLocationChange({ lat, lng, address });
  };

  /* ---------- autocomplete: debounce + abort ---------- */
  const debouncedFetch = useMemo(() => {
    let t: number | undefined;
    return (q: string) => {
      window.clearTimeout(t);
      if (!q || q.trim().length < 3) {
        setSuggestions([]);
        setOpen(false);
        setActiveIndex(-1);
        return;
      }

      // Si el input son coordenadas, mover pin directamente
      const coords = parseCoordinates(q);
      if (coords) {
        applyCoordinates(coords.lat, coords.lng);
        return;
      }

      t = window.setTimeout(async () => {
        // cancela anteriores
        if (abortRef.current) abortRef.current.abort();
        const ctl = new AbortController();
        abortRef.current = ctl;

        try {
          const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`);
          url.searchParams.set('access_token', MAPBOX_TOKEN);
          url.searchParams.set('autocomplete', 'true');
          url.searchParams.set('language', 'es');
          url.searchParams.set('limit', '6');
          // Priorizamos Chile (ajusta si quieres)
          url.searchParams.set('country', 'CL');
          // Proximidad según centro actual del mapa
          const c = mapRef.current?.getCenter?.();
          if (c) url.searchParams.set('proximity', `${c.lng},${c.lat}`);

          const res = await fetch(url.toString(), { signal: ctl.signal });
          if (!res.ok) throw new Error('geocode failed');
          const data = await res.json();
          const feats = (data?.features ?? []) as any[];
          const next: Suggestion[] = feats.map((f) => ({
            id: f.id,
            place_name: f.place_name,
            center: f.center,
          }));
          setSuggestions(next);
          setOpen(next.length > 0);
          setActiveIndex(next.length ? 0 : -1);
        } catch (e) {
          if ((e as any)?.name !== 'AbortError') {
            setSuggestions([]);
            setOpen(false);
            setActiveIndex(-1);
          }
        }
      }, 220);
    };

  }, []);

  useEffect(() => {
    debouncedFetch(query);
  }, [query, debouncedFetch]);

  /* ---------- seleccionar sugerencia ---------- */
  const selectSuggestion = (s: Suggestion) => {
    const [lng, lat] = s.center;
    markerRef.current?.setLngLat([lng, lat]);
    mapRef.current?.easeTo({ center: [lng, lat], zoom: 16, duration: 420 });
    setQuery(s.place_name);
    setOpen(false);
    setActiveIndex(-1);
    onLocationChange({ lat, lng, address: s.place_name });
  };

  /* ---------- teclado + click fuera ---------- */
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0) selectSuggestion(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div className="relative h-[360px] sm:h-[400px] w-full">
      {/* ====== estilos ====== */}
      <style>{`
        .ga-marker { position: relative; width: 18px; height: 18px; transform: translate(-50%, -50%); }
        .ga-marker-dot { position:absolute; inset:0; border-radius:9999px; background:#E03131; box-shadow:0 0 0 2px rgba(224,49,49,.18); }
        .ga-marker-pulse { position:absolute; inset:-10px; border-radius:9999px; background:rgba(224,49,49,.16); animation:gapulse 1.8s ease-out infinite; }
        @keyframes gapulse { 0%{opacity:.7;transform:scale(.5)} 100%{opacity:0;transform:scale(1.75)} }
        .mapboxgl-ctrl-top-right { margin-top: 10px; margin-right: 10px; }
        .mapboxgl-ctrl-bottom-left, .mapboxgl-ctrl-bottom-right { margin: 6px; }
      `}</style>

      {/* Input + dropdown propios (sin geocoder nativo) */}
      <div ref={wrapperRef} className="pointer-events-none absolute left-3 right-3 top-3 z-10 flex justify-start">
        <div className="pointer-events-auto w-full max-w-[380px]">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-[0_8px_30px_rgba(15,23,42,.10)] backdrop-blur">
            <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-70" aria-hidden="true">
              <path fill="currentColor" d="M21.53 20.47l-3.67-3.67a8 8 0 10-1.06 1.06l3.67 3.67a.75.75 0 101.06-1.06zM4.75 10a5.25 5.25 0 1110.5 0a5.25 5.25 0 01-10.5 0z"/>
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => suggestions.length && setOpen(true)}
              onKeyDown={onKeyDown}
              placeholder="Buscar dirección o pegar coordenadas…"
              className="h-9 w-full bg-transparent text-[14px] text-slate-800 placeholder:text-slate-400 outline-none"
              aria-label="Buscar dirección"
            />
            {query ? (
              <button
                type="button"
                onClick={() => { setQuery(''); setSuggestions([]); setOpen(false); setActiveIndex(-1); }}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Limpiar"
              >
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M18.3 5.71a1 1 0 00-1.41 0L12 10.59L7.11 5.7A1 1 0 105.7 7.11L10.59 12l-4.9 4.89a1 1 0 101.41 1.42L12 13.41l4.89 4.9a1 1 0 001.42-1.41L13.41 12l4.9-4.89a1 1 0 000-1.4z"/>
                </svg>
              </button>
            ) : null}
          </div>

          {/* Dropdown */}
          {open && suggestions.length > 0 && (
            <div className="mt-2 max-h-[320px] w-full max-w-[380px] overflow-auto rounded-xl border border-slate-200 bg-white shadow-[0_12px_34px_rgba(15,23,42,.15)]">
              {suggestions.map((s, i) => {
                const active = i === activeIndex;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => selectSuggestion(s)}
                    className={`block w-full px-3 py-2 text-left text-[14px] ${
                      active ? 'bg-slate-50' : 'bg-white'
                    } hover:bg-slate-50`}
                  >
                    {s.place_name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Contenedor del mapa */}
      <div ref={mapContainer} className="h-full w-full rounded-xl" />
    </div>
  );
};

export default LocationPicker;
