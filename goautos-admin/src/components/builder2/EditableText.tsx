import React, { useRef, useCallback, useEffect } from 'react';
import { useEditor } from '@craftjs/core';

// True si el HTML no tiene contenido visible (vacío, <br>, &nbsp;, <p></p>, espacios).
// Se usa para colapsar el espacio del campo cuando el usuario lo borra en el editor.
const isBlank = (html?: string | null): boolean => {
  if (html == null) return true;
  return String(html)
    .replace(/<br\s*\/?>/gi, '')
    .replace(/&nbsp;/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, '').length === 0;
};

interface EditableTextProps {
  value: string;
  nodeId: string;
  propName: string;
  tag?: keyof React.JSX.IntrinsicElements;
  className?: string;
  style?: React.CSSProperties;
}

export const EditableText: React.FC<EditableTextProps> = ({
  value,
  nodeId,
  propName,
  tag = 'span',
  className,
  style,
}) => {
  const ref = useRef<HTMLElement>(null);
  const { actions } = useEditor();
  const { enabled } = useEditor((s) => ({ enabled: s.options.enabled }));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.innerHTML !== (value || '')) {
      el.innerHTML = value || '';
    }
  }, [value]);

  const save = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // Al vaciar un contentEditable el navegador deja un <br> residual. Si el
    // contenido quedó efectivamente vacío, guardar '' para no contaminar el prop
    // (se veía "<br>" en el panel lateral) y para que colapse/oculte bien. Si hay
    // texto real con <br> intercalado, se respeta tal cual.
    const html = isBlank(el.innerHTML) ? '' : el.innerHTML;
    if (html !== value) {
      actions.setProp(nodeId, (props: any) => {
        props[propName] = html;
      });
    }
  }, [actions, nodeId, propName, value]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    el.contentEditable = 'true';
    el.dataset.inlineEdit = 'true';
    el.style.cursor = 'text';

    const onBlur = () => save();
    const onMouseDown = (e: Event) => e.stopPropagation();

    el.addEventListener('blur', onBlur);
    el.addEventListener('mousedown', onMouseDown);

    return () => {
      el.contentEditable = 'false';
      delete el.dataset.inlineEdit;
      el.style.cursor = '';
      el.removeEventListener('blur', onBlur);
      el.removeEventListener('mousedown', onMouseDown);
    };
  }, [enabled, save]);

  // Campo vacío en modo edición: colapsar el margen reservado y mostrar un
  // placeholder tenue (vía CSS .et-empty) para que no quede el hueco grande pero
  // siga clickeable para volver a escribir. En el sitio público el elemento se
  // oculta directamente (no usa este componente).
  const empty = isBlank(value);
  const collapse = empty && enabled;
  return React.createElement(tag, {
    ref,
    className: collapse ? `${className || ''} et-empty`.trim() : className,
    style: collapse ? { ...style, marginTop: 0, marginBottom: 0 } : style,
    'data-et-placeholder': collapse ? 'Escribe aquí…' : undefined,
    suppressContentEditableWarning: true,
  });
};

/**
 * Editable text for a field inside an array prop.
 * Example: trustItems[2].text — arrayProp="trustItems", index=2, field="text"
 */
interface EditableArrayTextProps {
  value: string;
  nodeId: string;
  arrayProp: string;
  index: number;
  field: string;
  tag?: keyof React.JSX.IntrinsicElements;
  className?: string;
  style?: React.CSSProperties;
}

export const EditableArrayText: React.FC<EditableArrayTextProps> = ({
  value,
  nodeId,
  arrayProp,
  index,
  field,
  tag = 'span',
  className,
  style,
}) => {
  const ref = useRef<HTMLElement>(null);
  const { actions, query } = useEditor();
  const { enabled } = useEditor((s) => ({ enabled: s.options.enabled }));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.innerHTML !== (value || '')) {
      el.innerHTML = value || '';
    }
  }, [value]);

  const save = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // Mismo caso que EditableText: normalizar el <br> residual a '' al vaciar.
    const html = isBlank(el.innerHTML) ? '' : el.innerHTML;
    if (html !== value) {
      actions.setProp(nodeId, (props: any) => {
        const arr = [...(props[arrayProp] || [])];
        if (arr[index]) {
          arr[index] = { ...arr[index], [field]: html };
          props[arrayProp] = arr;
        }
      });
    }
  }, [actions, nodeId, arrayProp, index, field, value, query]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    el.contentEditable = 'true';
    el.dataset.inlineEdit = 'true';
    el.style.cursor = 'text';

    const onBlur = () => save();
    const onMouseDown = (e: Event) => e.stopPropagation();

    el.addEventListener('blur', onBlur);
    el.addEventListener('mousedown', onMouseDown);

    return () => {
      el.contentEditable = 'false';
      delete el.dataset.inlineEdit;
      el.style.cursor = '';
      el.removeEventListener('blur', onBlur);
      el.removeEventListener('mousedown', onMouseDown);
    };
  }, [enabled, save]);

  const empty = isBlank(value);
  const collapse = empty && enabled;
  return React.createElement(tag, {
    ref,
    className: collapse ? `${className || ''} et-empty`.trim() : className,
    style: collapse ? { ...style, marginTop: 0, marginBottom: 0 } : style,
    'data-et-placeholder': collapse ? 'Escribe aquí…' : undefined,
    suppressContentEditableWarning: true,
  });
};
