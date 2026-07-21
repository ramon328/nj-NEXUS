import React, { useState, useEffect, useRef } from 'react';
import { Images } from 'lucide-react';

interface ThumbRowProps {
  images: string[];
  onOpenModal: (img?: string) => void;
  gap?: number;
  aspect?: number;
  minThumb?: number;
  maxThumb?: number;
  maxCols?: number;
}

/**
 * Fila de miniaturas con tamaño contenido cuando hay < 4 imágenes
 * Se adapta al ancho disponible de forma responsive
 */
export default function ThumbRow({
  images,
  onOpenModal,
  gap = 12,
  aspect = 10 / 7,
  minThumb = 92,
  maxThumb = 148,
  maxCols = 6,
}: ThumbRowProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [layout, setLayout] = useState({ cols: 0, thumbW: 0, thumbH: 0, show: 0 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const compute = () => {
      const W = el.clientWidth || 0;
      if (!W) return;

      const count = images.length;

      // Si hay menos de 4 imágenes, no llenar el ancho: usar un ancho fijo (clamp) por thumb.
      if (count > 0 && count < 4) {
        const thumbW = Math.min(maxThumb, Math.max(minThumb, Math.floor(W / 4 - gap)));
        const thumbH = Math.round(thumbW / aspect);
        setLayout({ cols: count, thumbW, thumbH, show: count });
        return;
      }

      // Fluido normal (intenta casar columnas dentro de un rango cómodo)
      let bestCols = 1;
      let bestW = W;

      for (let cols = 1; cols <= maxCols; cols++) {
        const totalGap = gap * (cols - 1);
        const w = (W - totalGap) / cols;
        if (w >= minThumb && w <= maxThumb) {
          bestCols = cols;
          bestW = w;
        }
      }

      if (bestCols === 1) {
        for (let cols = 1; cols <= maxCols; cols++) {
          const totalGap = gap * (cols - 1);
          const w = (W - totalGap) / cols;
          if (w >= minThumb) { bestCols = cols; bestW = w; break; }
          if (cols === maxCols) { bestCols = cols; bestW = w; }
        }
      }

      const needsPlus = count > bestCols;
      const visible = needsPlus ? bestCols - 1 : Math.min(count, bestCols);
      const totalGapVisible = gap * (visible + (needsPlus ? 1 : 0) - 1);
      const tiles = visible + (needsPlus ? 1 : 0);
      const thumbW = (W - totalGapVisible) / tiles;
      const thumbH = Math.round(thumbW / aspect);

      setLayout({ cols: bestCols, thumbW, thumbH, show: visible });
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [gap, aspect, minThumb, maxThumb, maxCols, images.length]);

  if (!images?.length) return null;

  const canShowAll = images.length <= layout.cols || images.length < 4;
  const thumbs = canShowAll
    ? images.slice(0, layout.show || images.length)
    : images.slice(0, Math.max(0, layout.show));
  const remaining = Math.max(0, images.length - thumbs.length);

  const rowStyle: React.CSSProperties =
    images.length < 4
      ? { gap, justifyContent: 'flex-start' }
      : { gap };

  return (
    <div ref={wrapRef} className="w-full min-w-0">
      <div className="flex items-center" style={rowStyle}>
        {thumbs.map((src, i) => (
          <button
            key={src + i}
            type="button"
            onClick={() => onOpenModal(src)}
            className="relative overflow-hidden rounded-xl ring-1 ring-border hover:ring-primary transition grid place-items-center"
            style={{ width: layout.thumbW, height: layout.thumbH, flex: '0 0 auto' }}
            aria-label={`Miniatura ${i + 1}`}
          >
            <img
              src={src}
              alt={`thumb ${i + 1}`}
              className="h-full w-full object-cover"
              loading="lazy"
              draggable={false}
            />
          </button>
        ))}

        {!canShowAll && (
          <button
            type="button"
            onClick={() => onOpenModal(thumbs[0] || images[0])}
            className="grid place-content-center rounded-xl bg-secondary ring-1 ring-border hover:ring-primary transition"
            style={{ width: layout.thumbW, height: layout.thumbH, flex: '0 0 auto' }}
            aria-label="Ver toda la galería"
          >
            <Images className="w-6 h-6 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">+{remaining}</span>
          </button>
        )}
      </div>
    </div>
  );
}
