import React from 'react';
import { useEditor } from '@craftjs/core';

interface VideoEmbedSettingsProps {
  videoUrl?: string;
  title?: string;
  subtitle?: string;
  bgColor?: string;
  textColor?: string;
  aspectRatio?: '16:9' | '4:3' | '1:1' | '21:9';
  maxWidth?: string;
  borderRadius?: string;
  autoplay?: boolean;
}

export const VideoEmbedSettings = () => {
  const {
    actions: { setProp },
    props: nodeProps,
    id: nodeId,
  } = useEditor((state, query) => {
    const currentNodeId = query.getEvent('selected').last();
    let props: VideoEmbedSettingsProps = {};
    if (currentNodeId) {
      props = state.nodes[currentNodeId]?.data?.props || {};
    }
    return {
      props,
      id: currentNodeId,
    };
  });

  if (!nodeId) {
    return (
      <p className='text-sm text-gray-500'>Ningún video seleccionado.</p>
    );
  }

  // Texto y selects: guarda el valor tal cual bajo la key del input (name).
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setProp(nodeId, (props: VideoEmbedSettingsProps) => {
      (props as Record<string, unknown>)[name] = value;
    });
  };

  // Checkbox (autoplay): guarda booleano.
  const handleCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setProp(nodeId, (props: VideoEmbedSettingsProps) => {
      (props as Record<string, unknown>)[name] = checked;
    });
  };

  const inputCls =
    'w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm placeholder-gray-400';
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1';
  const colorCls =
    'w-full h-10 p-1 border border-gray-300 rounded-md cursor-pointer';

  return (
    <div className='space-y-4'>
      <div>
        <label htmlFor='videoUrl' className={labelCls}>
          Video URL (YouTube/Vimeo)
        </label>
        <input
          type='text'
          name='videoUrl'
          id='videoUrl'
          value={nodeProps.videoUrl || ''}
          onChange={handleChange}
          className={inputCls}
          placeholder='e.g., https://www.youtube.com/watch?v=VIDEO_ID'
        />
      </div>

      <div>
        <label htmlFor='title' className={labelCls}>
          Título
        </label>
        <input
          type='text'
          name='title'
          id='title'
          value={nodeProps.title || ''}
          onChange={handleChange}
          className={inputCls}
        />
      </div>

      <div>
        <label htmlFor='subtitle' className={labelCls}>
          Subtítulo
        </label>
        <textarea
          name='subtitle'
          id='subtitle'
          value={nodeProps.subtitle || ''}
          onChange={handleChange}
          rows={3}
          className={inputCls}
        />
      </div>

      {/* Colores: uno al lado del otro */}
      <div className='grid grid-cols-2 gap-3'>
        <div>
          <label htmlFor='bgColor' className={labelCls}>
            Color fondo
          </label>
          <input
            type='color'
            name='bgColor'
            id='bgColor'
            value={nodeProps.bgColor || '#f7fafc'}
            onChange={handleChange}
            className={colorCls}
          />
        </div>
        <div>
          <label htmlFor='textColor' className={labelCls}>
            Color texto
          </label>
          <input
            type='color'
            name='textColor'
            id='textColor'
            value={nodeProps.textColor || '#1a202c'}
            onChange={handleChange}
            className={colorCls}
          />
        </div>
      </div>

      {/* Proporción y bordes redondeados: uno al lado del otro */}
      <div className='grid grid-cols-2 gap-3'>
        <div>
          <label htmlFor='aspectRatio' className={labelCls}>
            Proporción
          </label>
          <select
            name='aspectRatio'
            id='aspectRatio'
            value={nodeProps.aspectRatio || '16:9'}
            onChange={handleChange}
            className={`${inputCls} bg-white`}
          >
            <option value='16:9'>16:9</option>
            <option value='4:3'>4:3</option>
            <option value='1:1'>1:1</option>
            <option value='21:9'>21:9</option>
          </select>
        </div>
        <div>
          <label htmlFor='borderRadius' className={labelCls}>
            Bordes redondeados
          </label>
          <select
            name='borderRadius'
            id='borderRadius'
            value={nodeProps.borderRadius ?? '8px'}
            onChange={handleChange}
            className={`${inputCls} bg-white`}
          >
            <option value='0px'>Ninguno</option>
            <option value='8px'>Pequeño</option>
            <option value='16px'>Mediano</option>
            <option value='24px'>Grande</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor='maxWidth' className={labelCls}>
          Ancho máximo (ej: 800px, 100%)
        </label>
        <input
          type='text'
          name='maxWidth'
          id='maxWidth'
          value={nodeProps.maxWidth || '800px'}
          onChange={handleChange}
          className={inputCls}
          placeholder='800px'
        />
      </div>

      {/* Autoplay */}
      <label className='flex items-center gap-2 cursor-pointer select-none pt-1'>
        <input
          type='checkbox'
          name='autoplay'
          checked={!!nodeProps.autoplay}
          onChange={handleCheckbox}
          className='h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500'
        />
        <span className='text-sm font-medium text-gray-700'>
          Reproducir automáticamente (sin sonido)
        </span>
      </label>
    </div>
  );
};
