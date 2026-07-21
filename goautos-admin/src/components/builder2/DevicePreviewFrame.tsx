import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BUILDER_FONTS_HREF } from './constants/builderFonts';

export type PreviewDevice = 'mobile' | 'tablet' | 'desktop';

interface DevicePreviewFrameProps {
  device: PreviewDevice;
  children: React.ReactNode;
  className?: string;
  zoom?: number;
  fontFamily?: string;
}

const DEVICE_WIDTH: Record<PreviewDevice, number | '100%'> = {
  mobile: 375,
  tablet: 768,
  desktop: '100%',
};

export const DevicePreviewFrame: React.FC<DevicePreviewFrameProps> = ({
  device,
  children,
  className,
  zoom = 0.8,
  fontFamily,
}) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [iframeDoc, setIframeDoc] = useState<Document | null>(null);

  // Expose iframe ref and doc on the DOM element for the toolbar to find
  useEffect(() => {
    const wrapper = iframeRef.current?.parentElement;
    if (wrapper && iframeRef.current) {
      (wrapper as any).__iframeEl = iframeRef.current;
    }
  });

  // Calcular el ancho del marco según el dispositivo
  const frameStyle = useMemo<React.CSSProperties>(() => {
    const w = DEVICE_WIDTH[device];
    return {
      width: typeof w === 'number' ? `${w}px` : w,
      maxWidth: typeof w === 'number' ? `${w}px` : '100%',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      boxShadow:
        '0 1px 2px rgba(0,0,0,0.06), 0 10px 15px -3px rgba(0,0,0,0.1)',
      transform: zoom !== 1 ? `scale(${zoom})` : undefined,
      transformOrigin: 'top center',
    };
  }, [device, zoom]);

  // Crear el documento del iframe con estilos base y clonar los estilos globales
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const srcDoc = `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
          <style>
            html, body { margin: 0; padding: 0; overflow: hidden; }
            body { background: #ffffff; }
            .builder-root { min-height: 100vh; }
          </style>
        </head>
        <body>
          <div id="__preview_root" class="builder-root"></div>
        </body>
      </html>
    `;

    iframe.srcdoc = srcDoc;

    const onLoad = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;

      const head = doc.head;

      // Clonar <link rel="stylesheet"> del documento padre (para Tailwind, etc.)
      const parentLinks = document.querySelectorAll<HTMLLinkElement>(
        'link[rel="stylesheet"]'
      );
      parentLinks.forEach((lnk) => {
        const cloned = doc.createElement('link');
        cloned.rel = 'stylesheet';
        cloned.href = lnk.href;
        head.appendChild(cloned);
      });

      // Clonar <style> del documento padre
      const parentStyles = document.querySelectorAll<HTMLStyleElement>('style');
      parentStyles.forEach((st) => {
        const cloned = st.cloneNode(true) as HTMLStyleElement;
        head.appendChild(cloned);
      });

      // Cargar la lista curada de fuentes del builder en el iframe, para que el
      // selector inline de tipo de fuente las muestre en el editor.
      const fontsLink = doc.createElement('link');
      fontsLink.rel = 'stylesheet';
      fontsLink.href = BUILDER_FONTS_HREF;
      head.appendChild(fontsLink);

      setIframeDoc(doc);
    };

    iframe.addEventListener('load', onLoad);
    return () => {
      iframe.removeEventListener('load', onLoad);
    };
  }, []);

  // Aplicar la tipografía elegida al iframe (override Tailwind .font-sans).
  useEffect(() => {
    if (!iframeDoc) return;
    const head = iframeDoc.head;
    const STYLE_ID = 'user-font-override';
    const FONT_LINK_ID = 'user-font-link';

    // Limpiar previos
    head.querySelector(`#${STYLE_ID}`)?.remove();
    head.querySelector(`#${FONT_LINK_ID}`)?.remove();

    if (!fontFamily) return;

    // Cargar Google Font en el iframe
    const link = iframeDoc.createElement('link');
    link.id = FONT_LINK_ID;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;500;600;700&display=swap`;
    head.appendChild(link);

    // Aplicar la fuente global a todo el canvas. Usamos el selector
    // `#__preview_root *` (especificidad de id > la clase .font-sans de Tailwind)
    // pero SIN !important, para que un <span style="font-family"> por elemento
    // (estilo inline → gana sobre cualquier selector no-important) pueda
    // sobreescribir la fuente global. Con !important el font por elemento no se vería.
    const style = iframeDoc.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #__preview_root, #__preview_root * {
        font-family: '${fontFamily}', sans-serif;
      }
    `;
    head.appendChild(style);
  }, [iframeDoc, fontFamily]);

  // Ajustar altura del iframe automáticamente
  useEffect(() => {
    if (!iframeRef.current || !iframeDoc) return;

    const iframe = iframeRef.current;
    const body = iframeDoc.body;

    const setHeight = () => {
      requestAnimationFrame(() => {
        iframe.style.height = body.scrollHeight + 'px';
      });
    };

    setHeight();

    // ✅ Corrección: no se puede usar new con encadenamiento opcional
    const ResizeObs = (window as any).ResizeObserver;
    const ro = ResizeObs ? new ResizeObs(() => setHeight()) : null;
    if (ro) ro.observe(body);

    const mo = new MutationObserver(setHeight);
    mo.observe(body, { childList: true, subtree: true, attributes: true });

    window.addEventListener('load', setHeight);
    const interval = window.setInterval(setHeight, 250);

    return () => {
      if (ro) ro.disconnect();
      mo.disconnect();
      window.removeEventListener('load', setHeight);
      window.clearInterval(interval);
    };
  }, [iframeDoc]);

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        justifyContent: 'center',
        width: '100%',
      }}
    >
      <iframe
        ref={iframeRef}
        title="DevicePreviewFrame"
        style={{
          ...frameStyle,
          background: '#fff',
        }}
        sandbox="allow-same-origin allow-scripts allow-forms allow-pointer-lock allow-popups allow-modals"
      />
      {iframeDoc &&
        createPortal(
          <div id="__portal_root" className="w-full h-full">
            {children}
          </div>,
          iframeDoc.getElementById('__preview_root') as HTMLElement
        )}
    </div>
  );
};

export default DevicePreviewFrame;
