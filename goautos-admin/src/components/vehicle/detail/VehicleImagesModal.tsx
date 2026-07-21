'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

interface VehicleImagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentImage: string;
  images: string[];
  onImageChange: (image: string) => void;
}

/**
 * V4 – Miniaturas SIEMPRE visibles, sin zoom, imagen centrada y más compacta
 * - Layout en columnas: topbar (overlay), stage (flex-1), dock fijo (auto)
 * - Imagen central limitada: móvil 78vh, desktop 68vh (menos invasiva)
 * - Miniaturas SIEMPRE visibles (barra fija al fondo del modal)
 * - Navegación con flechas, teclado y click en miniaturas
 * - Animación fade+scale suave al cambiar imagen
 */
export default function VehicleImagesModal({
  isOpen,
  onClose,
  currentImage,
  images = [],
  onImageChange,
}: VehicleImagesModalProps) {
  const safeImages = useMemo(() => Array.from(new Set(images.filter(Boolean))), [images]);

  const [index, setIndex] = useState<number>(() => Math.max(0, safeImages.indexOf(currentImage)));

  // sync externo
  useEffect(() => {
    const idx = safeImages.indexOf(currentImage);
    if (idx !== -1) setIndex(idx);
  }, [currentImage, safeImages]);

  const clampIndex = useCallback(
    (i: number) => (safeImages.length ? (i + safeImages.length) % safeImages.length : 0),
    [safeImages.length]
  );

  const goTo = useCallback(
    (i: number) => {
      const n = clampIndex(i);
      setIndex(n);
      onImageChange?.(safeImages[n] ?? '');
    },
    [clampIndex, onImageChange, safeImages]
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  // teclado
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, next, prev, onClose]);

  const active = safeImages[index];

  // Dock: asegurar que inicie en el comienzo
  const dockRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (isOpen && dockRef.current) {
      dockRef.current.scrollLeft = 0; // siempre comienza desde la primera miniatura
    }
  }, [isOpen]);

  // Prefetch para evitar parpadeos
  useEffect(() => {
    const preload = (src?: string) => { if (!src) return; const img = new Image(); img.src = src; };
    preload(safeImages[clampIndex(index + 1)]);
    preload(safeImages[clampIndex(index - 1)]);
  }, [index, safeImages, clampIndex]);

  return (
    <Dialog open={isOpen} onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <DialogContent className="p-0 overflow-hidden border-0 bg-black w-[100vw] h-[100vh] sm:max-w-[92vw] sm:h-[92vh] flex flex-col">
        {/* Top bar overlay */}
        <div className="absolute top-2 left-2 right-2 z-30 flex items-center justify-between">
          <div className="px-2 py-1 rounded-full bg-black/60 text-white text-xs md:text-sm">
            {index + 1} / {safeImages.length}
          </div>
          <div className="flex items-center gap-1">
            {active && (
              <a href={active} download className="rounded-full bg-black/60 hover:bg-black/70 text-white p-2 transition" aria-label="Descargar">
                <Download className="h-4 w-4" />
              </a>
            )}
            <Button variant="ghost" size="icon" className="rounded-full bg-black/60 hover:bg-black/70 text-white" onClick={onClose} aria-label="Cerrar">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Stage (más compacto) */}
        <div className="relative flex-1 min-h-0 grid place-items-center px-2">
          <AnimatePresence mode="wait">
            {active ? (
              <motion.img
                key={active}
                src={active}
                alt={`Imagen ${index + 1}`}
                initial={{ opacity: 0, scale: 0.985 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.985 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="object-contain rounded-md block mx-auto w-auto max-h-[78vh] sm:max-h-[68vh]"
                draggable={false}
              />
            ) : (
              <></>
            )}
          </AnimatePresence>

          {/* Flechas desktop */}
          {safeImages.length > 1 && (
            <>
              <button
                className="hidden sm:grid absolute left-3 top-1/2 -translate-y-1/2 z-30 place-items-center h-10 w-10 rounded-full bg-black/60 hover:bg-black/70 text-white"
                onClick={prev}
                aria-label="Anterior"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                className="hidden sm:grid absolute right-3 top-1/2 -translate-y-1/2 z-30 place-items-center h-10 w-10 rounded-full bg-black/60 hover:bg-black/70 text-white"
                onClick={next}
                aria-label="Siguiente"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
        </div>

        {/* Dock SIEMPRE visible */}
        {safeImages.length > 1 && (
          <div className="relative z-20 border-t border-white/10 bg-black/85">
            {/* Gradientes para pista visual */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-black to-transparent" />

            <div
              ref={dockRef}
              className="flex gap-2 overflow-x-auto no-scrollbar py-3 px-3 snap-x snap-mandatory scroll-pl-3"
              role="tablist"
              aria-label="Miniaturas"
            >
              {safeImages.map((src, i) => (
                <button
                  key={src + i}
                  role="tab"
                  aria-selected={i === index}
                  onClick={() => goTo(i)}
                  className={cn(
                    'relative flex-shrink-0 h-16 w-24 rounded-md overflow-hidden ring-1 ring-white/10 snap-start',
                    i === index ? 'ring-2 ring-white' : 'opacity-80 hover:opacity-100'
                  )}
                >
                  <img src={src} alt={`Miniatura ${i + 1}`} className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

