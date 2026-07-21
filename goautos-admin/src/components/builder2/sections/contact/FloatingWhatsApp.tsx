import React from 'react';
import { useNode } from '@craftjs/core';
import { Icon } from '@iconify/react';
import { DeleteButton } from '../../DeleteButton';
import { useAuth } from '@/contexts/AuthContext';

type Position = 'right' | 'left';
type Size = 'sm' | 'md' | 'lg';

interface FloatingWhatsAppProps {
  phoneOverride?: string;
  message?: string;
  position?: Position;
  bottomOffset?: number;
  size?: Size;
  bgColor?: string;
  iconColor?: string;
  showTooltip?: boolean;
  tooltipText?: string;
  hideOnMobile?: boolean;
  hideOnDesktop?: boolean;
}

const SIZE_MAP: Record<Size, { btn: number; icon: number }> = {
  sm: { btn: 48, icon: 22 },
  md: { btn: 56, icon: 28 },
  lg: { btn: 64, icon: 32 },
};

export const FloatingWhatsApp = ({
  phoneOverride,
  message = 'Hola, me interesa saber más sobre sus vehículos disponibles.',
  position = 'right',
  bottomOffset = 24,
  size = 'md',
  bgColor = '#25D366',
  iconColor = '#ffffff',
  showTooltip = false,
  tooltipText = '¿Tienes dudas? Escríbenos',
  hideOnMobile = false,
  hideOnDesktop = false,
}: FloatingWhatsAppProps) => {
  const { connectors, selected, id } = useNode((state) => ({
    selected: state.events.selected,
  }));
  const { client } = useAuth();

  const dims = SIZE_MAP[size] || SIZE_MAP.md;
  const effectivePhone = phoneOverride?.trim() || client?.contact?.phone || '';
  const hasPhone = effectivePhone.length > 0;

  // Preview-only label en el editor: explica que esto es flotante
  return (
    <div
      ref={(el: HTMLDivElement | null) => {
        if (el) connectors.connect(el);
      }}
      style={{
        position: 'relative',
        border: selected ? '2px dashed #25D366' : '1px dashed #d1d5db',
        backgroundColor: selected ? '#f0fdf4' : '#fafafa',
        borderRadius: 12,
      }}
      className='w-full my-4 p-5'
    >
      {selected && <DeleteButton nodeId={id} />}

      <div className='flex items-center gap-4'>
        <div
          style={{
            width: dims.btn,
            height: dims.btn,
            backgroundColor: bgColor,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            flexShrink: 0,
          }}
        >
          <Icon
            icon='logos:whatsapp-icon'
            width={dims.icon}
            height={dims.icon}
            style={{ color: iconColor }}
          />
        </div>

        <div className='flex-1 min-w-0'>
          <div className='text-sm font-semibold text-gray-900 mb-1'>
            Botón flotante de WhatsApp
          </div>
          <div className='text-xs text-gray-600 leading-relaxed'>
            En el sitio del cliente aparece fijo en la esquina inferior{' '}
            <strong>{position === 'right' ? 'derecha' : 'izquierda'}</strong>,
            visible en todas las páginas.
          </div>
          {!hasPhone && (
            <div className='mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 inline-block'>
              ⚠️ No hay número configurado — el botón no se mostrará en el sitio
              público hasta que cargues el teléfono del cliente o uses
              "Sobrescribir número".
            </div>
          )}
          {showTooltip && tooltipText && (
            <div className='mt-2 text-xs text-gray-500 italic'>
              Tooltip: "{tooltipText}"
            </div>
          )}
          <div className='mt-2 flex flex-wrap gap-2 text-[11px] text-gray-500'>
            <span className='bg-gray-100 px-2 py-0.5 rounded'>
              Tamaño: {size}
            </span>
            <span className='bg-gray-100 px-2 py-0.5 rounded'>
              Offset: {bottomOffset}px
            </span>
            {hideOnMobile && (
              <span className='bg-gray-100 px-2 py-0.5 rounded'>
                Oculto en móvil
              </span>
            )}
            {hideOnDesktop && (
              <span className='bg-gray-100 px-2 py-0.5 rounded'>
                Oculto en desktop
              </span>
            )}
          </div>
          {message && (
            <div className='mt-2 text-xs text-gray-500'>
              <span className='text-gray-400'>Mensaje pre-rellenado:</span>{' '}
              <em>"{message}"</em>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

FloatingWhatsApp.craft = {
  displayName: 'FloatingWhatsApp',
  props: {
    message: 'Hola, me interesa saber más sobre sus vehículos disponibles.',
    position: 'right',
    bottomOffset: 24,
    size: 'md',
    bgColor: '#25D366',
    iconColor: '#ffffff',
    showTooltip: false,
    tooltipText: '¿Tienes dudas? Escríbenos',
    hideOnMobile: false,
    hideOnDesktop: false,
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => true,
  },
};
