import { useEffect, useRef } from 'react';
import { BUILDER_FONTS } from './constants/builderFonts';

const COLORS = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280',
];

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64];

// Use nodeType check instead of instanceof — instanceof fails across iframe boundaries
function findEditable(node: Node | null): HTMLElement | null {
  let c: Node | null = node;
  while (c) {
    if (c.nodeType === 1 && (c as Element).getAttribute('data-inline-edit') === 'true') {
      return c as HTMLElement;
    }
    c = c.parentNode;
  }
  return null;
}

export const TextColorToolbar: React.FC = () => {
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const doc = anchor.ownerDocument;
    const body = doc.body;
    if (!body) return;

    // Build toolbar with vanilla DOM inside the iframe
    const toolbar = doc.createElement('div');
    toolbar.setAttribute('data-text-toolbar', 'true');
    Object.assign(toolbar.style, {
      position: 'fixed', zIndex: '99999', background: '#fff',
      borderRadius: '10px', padding: '6px 10px',
      boxShadow: '0 4px 20px rgba(0,0,0,.15), 0 0 0 1px rgba(0,0,0,.05)',
      display: 'none', alignItems: 'center', gap: '4px',
      userSelect: 'none', transform: 'translateX(-50%)',
      // Que nunca exceda el ancho del viewport: se envuelve en varias filas en
      // pantallas/canvas angostos en vez de salirse (y dejar "Fuente" inalcanzable).
      flexWrap: 'wrap', justifyContent: 'center', maxWidth: 'calc(100vw - 16px)',
    });

    // Cierra todos los paneles desplegables de la barra (tamaño, fuente). Su
    // stopPropagation impide que el mousedown del documento los cierre solo, así
    // que los cerramos explícitamente al ejecutar cualquier otra acción.
    function closePanels() {
      toolbar.querySelectorAll('[data-tb-panel]').forEach((p) => {
        (p as HTMLElement).style.display = 'none';
      });
    }

    function applyColor(color: string) {
      closePanels();
      const sel = doc.getSelection();
      if (!sel || sel.isCollapsed) return;
      doc.execCommand('foreColor', false, color);
      const el = findEditable(sel.anchorNode);
      if (el) {
        el.querySelectorAll('font[color]').forEach((font) => {
          const span = doc.createElement('span');
          span.style.color = font.getAttribute('color') || color;
          span.innerHTML = font.innerHTML;
          font.replaceWith(span);
        });
      }
    }

    // Aplica un tamaño (en px) a la selección. Mismo enfoque que applyColor:
    // execCommand('fontSize') envuelve en <font size="7"> (un sentinel), que luego
    // convertimos a <span style="font-size:Npx"> para guardar px reales (execCommand
    // solo soporta los tamaños legacy 1–7). El valor viaja en el HTML del prop `text`
    // y el sitio público lo pinta vía dangerouslySetInnerHTML.
    // Importante: usamos botones (no <select> nativo) con preventDefault+stopPropagation
    // para NO robar el foco del contentEditable — así la selección sigue viva y no se
    // dispara un blur/save prematuro (mismo patrón probado que los botones de color).
    function applyFontSize(px: number) {
      const sel = doc.getSelection();
      if (!sel || sel.isCollapsed) return;
      const el = findEditable(sel.anchorNode);
      if (!el) return;
      // styleWithCSS=false → execCommand produce <font size>, que es lo que convertimos.
      doc.execCommand('styleWithCSS', false, 'false');
      if (!doc.execCommand('fontSize', false, '7')) return;
      el.querySelectorAll('font[size="7"]').forEach((font) => {
        const span = doc.createElement('span');
        span.style.fontSize = `${px}px`;
        span.innerHTML = font.innerHTML;
        // Quitar font-size de descendientes dentro de la selección para que el nuevo
        // tamaño gane (si no, un span de tamaño previo más interno seguiría mandando).
        span.querySelectorAll('[style*="font-size"]').forEach((inner) => {
          (inner as HTMLElement).style.removeProperty('font-size');
          if (!(inner as HTMLElement).getAttribute('style')) inner.removeAttribute('style');
        });
        font.replaceWith(span);
      });
    }

    // Aplica una familia de fuente a la selección (stack '' = volver a la global).
    // Mismo patrón que applyFontSize: execCommand('fontName') envuelve en
    // <font face="BuilderFont"> (sentinel), que convertimos a <span style="font-family">.
    // Las fuentes se cargan en el iframe (DevicePreviewFrame) y en el público (layout.tsx).
    function applyFontFamily(stack: string) {
      closePanels();
      const sel = doc.getSelection();
      if (!sel || sel.isCollapsed) return;
      const el = findEditable(sel.anchorNode);
      if (!el) return;
      doc.execCommand('styleWithCSS', false, 'false');
      if (!doc.execCommand('fontName', false, 'BuilderFont')) return;
      el.querySelectorAll('font[face="BuilderFont"]').forEach((font) => {
        const span = doc.createElement('span');
        if (stack) span.style.fontFamily = stack;
        span.innerHTML = font.innerHTML;
        // Quitar font-family de descendientes para que la nueva familia (o el
        // reset a "por defecto") gane sobre cualquier span de fuente más interno.
        span.querySelectorAll('[style*="font-family"]').forEach((inner) => {
          (inner as HTMLElement).style.removeProperty('font-family');
          if (!(inner as HTMLElement).getAttribute('style')) inner.removeAttribute('style');
        });
        font.replaceWith(span);
        // El browser suele anidar el nuevo span DENTRO de un span de fuente
        // previo. Limpiar font-family de los ancestros que envuelvan EXACTAMENTE
        // este mismo texto (sin hermanos) para que la nueva fuente / "Por
        // defecto" gane. La condición textContent === garantiza que NO tocamos
        // ancestros que cubran texto fuera de la selección.
        let anc = span.parentElement;
        while (anc && anc !== el && anc.textContent === span.textContent) {
          if (anc.style && anc.style.fontFamily) {
            anc.style.removeProperty('font-family');
            if (!anc.getAttribute('style')) anc.removeAttribute('style');
          }
          anc = anc.parentElement;
        }
      });
    }

    // Negrita / itálica / subrayado. Producen <b>/<i>/<u> (styleWithCSS off) que
    // viajan en el HTML del prop `text` y el público pinta vía dangerouslySetInnerHTML.
    // execCommand hace toggle nativo (re-aplicar sobre lo mismo lo quita).
    function applyFormat(cmd: 'bold' | 'italic' | 'underline') {
      closePanels();
      const sel = doc.getSelection();
      if (!sel || sel.isCollapsed) return;
      if (!findEditable(sel.anchorNode) && !findEditable(sel.focusNode)) return;
      doc.execCommand('styleWithCSS', false, 'false');
      doc.execCommand(cmd, false);
    }

    // Format buttons (B / I / U) — a la izquierda de la barra
    const FORMATS: Array<{ cmd: 'bold' | 'italic' | 'underline'; label: string }> = [
      { cmd: 'bold', label: 'B' },
      { cmd: 'italic', label: 'I' },
      { cmd: 'underline', label: 'U' },
    ];
    FORMATS.forEach(({ cmd, label }) => {
      const btn = doc.createElement('button');
      btn.textContent = label;
      Object.assign(btn.style, {
        width: '26px', height: '26px', borderRadius: '8px',
        border: '2px solid #e5e7eb', background: '#f9fafb', color: '#374151',
        fontSize: '14px', cursor: 'pointer', outline: 'none', flexShrink: '0',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0',
        fontWeight: cmd === 'bold' ? '700' : '400',
        fontStyle: cmd === 'italic' ? 'italic' : 'normal',
        textDecoration: cmd === 'underline' ? 'underline' : 'none',
      });
      btn.addEventListener('mouseenter', () => { btn.style.background = '#f3f4f6'; });
      btn.addEventListener('mouseleave', () => { btn.style.background = '#f9fafb'; });
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        applyFormat(cmd);
      });
      toolbar.appendChild(btn);
    });

    // Divider 0
    const sep0 = doc.createElement('div');
    Object.assign(sep0.style, { width: '1px', height: '20px', background: '#e5e7eb', margin: '0 4px' });
    toolbar.appendChild(sep0);

    // Color buttons
    COLORS.forEach((color) => {
      const btn = doc.createElement('button');
      Object.assign(btn.style, {
        width: '22px', height: '22px', borderRadius: '50%', backgroundColor: color,
        border: color === '#ffffff' ? '2px solid #d1d5db' : '2px solid transparent',
        cursor: 'pointer', transition: 'transform .15s', flexShrink: '0',
        outline: 'none', padding: '0',
      });
      btn.addEventListener('mouseenter', () => { btn.style.transform = 'scale(1.25)'; });
      btn.addEventListener('mouseleave', () => { btn.style.transform = 'scale(1)'; });
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        applyColor(color);
      });
      toolbar.appendChild(btn);
    });

    // Divider
    const sep = doc.createElement('div');
    Object.assign(sep.style, { width: '1px', height: '20px', background: '#e5e7eb', margin: '0 4px' });
    toolbar.appendChild(sep);

    // Custom color picker
    const wrap = doc.createElement('label');
    Object.assign(wrap.style, {
      position: 'relative', width: '26px', height: '26px', flexShrink: '0',
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: '2px solid #e5e7eb', borderRadius: '50%', background: '#f9fafb',
    });
    wrap.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none"><path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"/></svg>';
    const ci = doc.createElement('input');
    ci.type = 'color';
    ci.value = '#ff0000';
    Object.assign(ci.style, {
      position: 'absolute', inset: '0', width: '100%', height: '100%',
      opacity: '0', cursor: 'pointer',
    });
    let colorPickerOpen = false;
    ci.addEventListener('input', (e) => applyColor((e.target as HTMLInputElement).value));
    ci.addEventListener('mousedown', (e) => e.stopPropagation());
    ci.addEventListener('focus', () => { colorPickerOpen = true; });
    ci.addEventListener('blur', () => { colorPickerOpen = false; });
    ci.addEventListener('change', () => { colorPickerOpen = false; });
    wrap.appendChild(ci);
    toolbar.appendChild(wrap);

    // Divider 2
    const sep2 = doc.createElement('div');
    Object.assign(sep2.style, { width: '1px', height: '20px', background: '#e5e7eb', margin: '0 4px' });
    toolbar.appendChild(sep2);

    // Font-size control: botón "Aa" que abre un panel propio de tamaños (botones,
    // no <select> nativo, para no robar el foco del contentEditable).
    const sizeWrap = doc.createElement('div');
    Object.assign(sizeWrap.style, { position: 'relative', flexShrink: '0' });

    const sizeBtn = doc.createElement('button');
    sizeBtn.textContent = 'Aa';
    Object.assign(sizeBtn.style, {
      height: '26px', minWidth: '34px', borderRadius: '8px', border: '2px solid #e5e7eb',
      background: '#f9fafb', color: '#374151', fontSize: '13px', fontWeight: '600',
      padding: '0 6px', cursor: 'pointer', outline: 'none',
    });

    const panel = doc.createElement('div');
    panel.setAttribute('data-tb-panel', 'true');
    Object.assign(panel.style, {
      position: 'absolute', top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
      background: '#fff', borderRadius: '10px', padding: '4px',
      boxShadow: '0 4px 20px rgba(0,0,0,.15), 0 0 0 1px rgba(0,0,0,.05)',
      display: 'none', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px', zIndex: '100000',
    });
    FONT_SIZES.forEach((s) => {
      const opt = doc.createElement('button');
      opt.textContent = String(s);
      Object.assign(opt.style, {
        border: 'none', background: 'transparent', borderRadius: '6px',
        padding: '6px 8px', fontSize: '13px', color: '#374151', cursor: 'pointer',
        minWidth: '40px', outline: 'none',
      });
      opt.addEventListener('mouseenter', () => { opt.style.background = '#f3f4f6'; });
      opt.addEventListener('mouseleave', () => { opt.style.background = 'transparent'; });
      opt.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        applyFontSize(s);
        panel.style.display = 'none';
      });
      panel.appendChild(opt);
    });

    sizeBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wasOpen = panel.style.display !== 'none';
      closePanels();
      if (!wasOpen) panel.style.display = 'grid';
    });

    sizeWrap.appendChild(sizeBtn);
    sizeWrap.appendChild(panel);
    toolbar.appendChild(sizeWrap);

    // Divider 3
    const sep3 = doc.createElement('div');
    Object.assign(sep3.style, { width: '1px', height: '20px', background: '#e5e7eb', margin: '0 4px' });
    toolbar.appendChild(sep3);

    // Font-family selector: botón "Fuente" + panel con las fuentes (cada opción
    // previsualizada en su propia tipografía).
    const fontWrap = doc.createElement('div');
    Object.assign(fontWrap.style, { position: 'relative', flexShrink: '0' });
    const fontBtn = doc.createElement('button');
    fontBtn.textContent = 'Fuente';
    Object.assign(fontBtn.style, {
      height: '26px', borderRadius: '8px', border: '2px solid #e5e7eb',
      background: '#f9fafb', color: '#374151', fontSize: '12px', fontWeight: '600',
      padding: '0 8px', cursor: 'pointer', outline: 'none', flexShrink: '0',
    });
    const fontPanel = doc.createElement('div');
    fontPanel.setAttribute('data-tb-panel', 'true');
    Object.assign(fontPanel.style, {
      position: 'absolute', top: 'calc(100% + 6px)', right: '0',
      background: '#fff', borderRadius: '10px', padding: '4px', minWidth: '170px',
      maxHeight: '264px', overflowY: 'auto',
      boxShadow: '0 4px 20px rgba(0,0,0,.15), 0 0 0 1px rgba(0,0,0,.05)',
      display: 'none', zIndex: '100000',
    });
    const fontOption = (label: string, stack: string, previewStack?: string) => {
      const opt = doc.createElement('button');
      opt.textContent = label;
      Object.assign(opt.style, {
        display: 'block', width: '100%', textAlign: 'left', border: 'none',
        background: 'transparent', borderRadius: '6px', padding: '7px 10px',
        fontSize: '14px', color: '#374151', cursor: 'pointer', outline: 'none',
        whiteSpace: 'nowrap',
      });
      if (previewStack) opt.style.fontFamily = previewStack;
      opt.addEventListener('mouseenter', () => { opt.style.background = '#f3f4f6'; });
      opt.addEventListener('mouseleave', () => { opt.style.background = 'transparent'; });
      opt.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        applyFontFamily(stack);
      });
      return opt;
    };
    // "Por defecto" resetea a la fuente global del tema
    const defOpt = fontOption('Por defecto', '');
    defOpt.style.color = '#6b7280';
    fontPanel.appendChild(defOpt);
    BUILDER_FONTS.forEach((f) => {
      fontPanel.appendChild(fontOption(f.name, f.stack, f.stack));
    });
    fontBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wasOpen = fontPanel.style.display !== 'none';
      closePanels();
      if (!wasOpen) fontPanel.style.display = 'block';
    });
    fontWrap.appendChild(fontBtn);
    fontWrap.appendChild(fontPanel);
    toolbar.appendChild(fontWrap);

    // Prevent clicks on toolbar from blurring contentEditable
    toolbar.addEventListener('mousedown', (e) => e.preventDefault());

    body.appendChild(toolbar);

    // --- Show/hide logic ---
    function hideToolbar() {
      toolbar.style.display = 'none';
      closePanels();
    }

    function update() {
      // Never hide while color picker is open
      if (colorPickerOpen) return;
      const sel = doc.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        hideToolbar();
        return;
      }
      if (!findEditable(sel.anchorNode) && !findEditable(sel.focusNode)) {
        hideToolbar();
        return;
      }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      if (rect.width < 2) {
        hideToolbar();
        return;
      }
      toolbar.style.display = 'flex';
      // Posicionar centrado sobre la selección PERO clamp horizontal para que la
      // barra entera (con su ancho real) quede dentro del viewport — si no, con
      // selección cerca del borde el botón "Fuente" se sale y no se puede tocar.
      const vw = doc.documentElement.clientWidth || doc.body.clientWidth || 0;
      const tw = toolbar.offsetWidth;
      const th = toolbar.offsetHeight;
      const half = tw / 2;
      const minCx = half + 8;
      const maxCx = vw - half - 8;
      let cx = rect.left + rect.width / 2;
      cx = maxCx >= minCx ? Math.max(minCx, Math.min(cx, maxCx)) : vw / 2;
      const top = rect.top - th - 8;
      toolbar.style.top = (top < 8 ? rect.bottom + 8 : top) + 'px';
      toolbar.style.left = cx + 'px';
    }

    const onMouseUp = () => setTimeout(update, 15);
    const onKeyUp = () => setTimeout(update, 15);
    const onMouseDown = (e: MouseEvent) => {
      // Don't hide toolbar while color picker is open
      if (colorPickerOpen) return;
      const t = e.target as Element;
      if (t.closest?.('[data-text-toolbar]')) return;
      if (t.closest?.('[data-inline-edit]')) return;
      hideToolbar();
    };

    doc.addEventListener('selectionchange', update);
    doc.addEventListener('mouseup', onMouseUp);
    doc.addEventListener('keyup', onKeyUp);
    doc.addEventListener('mousedown', onMouseDown);

    return () => {
      doc.removeEventListener('selectionchange', update);
      doc.removeEventListener('mouseup', onMouseUp);
      doc.removeEventListener('keyup', onKeyUp);
      doc.removeEventListener('mousedown', onMouseDown);
      toolbar.remove();
    };
  }, []);

  return <div ref={anchorRef} style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }} />;
};
