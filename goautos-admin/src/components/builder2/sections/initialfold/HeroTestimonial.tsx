import React from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { User, Star, Quote } from 'lucide-react';

interface TestimonialProps {
  author: string;
  role: string;
  quote: string;
  avatar?: string;
  rating: number;
}

const Testimonial = ({
  author,
  role,
  quote,
  avatar,
  rating,
}: TestimonialProps) => (
  <div className='bg-white rounded-lg shadow-lg p-6 flex flex-col items-center text-center'>
    <div className='w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mb-4 overflow-hidden'>
      {avatar ? (
        <img src={avatar} alt={author} className='w-full h-full object-cover' />
      ) : (
        <User size={40} className='text-gray-400' />
      )}
    </div>
    <div className='flex mb-3'>
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={18}
          fill={i < rating ? '#FFD700' : 'none'}
          stroke={i < rating ? '#FFD700' : '#D1D5DB'}
          className='mx-0.5'
        />
      ))}
    </div>
    <Quote size={30} className='text-gray-300 mb-3' />
    <p className='text-gray-700 mb-4 italic'>{quote}</p>
    <h3 className='font-semibold text-gray-900'>{author}</h3>
    <p className='text-gray-500 text-sm'>{role}</p>
  </div>
);

interface HeroTestimonialProps {
  title?: string;
  subtitle?: string;
  backgroundImage?: string;
  overlayColor?: string;
  overlayOpacity?: number;
  textColor?: string;
  testimonialTextColor?: string;
  accentColor?: string;
  // Testimonial 1
  testimonial1Author?: string;
  testimonial1Role?: string;
  testimonial1Quote?: string;
  testimonial1Avatar?: string;
  testimonial1Rating?: number;
  // Testimonial 2
  testimonial2Author?: string;
  testimonial2Role?: string;
  testimonial2Quote?: string;
  testimonial2Avatar?: string;
  testimonial2Rating?: number;
  // Testimonial 3
  testimonial3Author?: string;
  testimonial3Role?: string;
  testimonial3Quote?: string;
  testimonial3Avatar?: string;
  testimonial3Rating?: number;
}

export const HeroTestimonial = ({
  title = 'Lo que nuestros clientes dicen',
  subtitle = 'Miles de personas han encontrado su vehículo ideal con GoAuto',
  backgroundImage = 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?q=80&w=1470',
  overlayColor = '#000000',
  overlayOpacity = 0.7,
  textColor = '#ffffff',
  testimonialTextColor = '#333333',
  accentColor = '#3b82f6',
  // Testimonial 1
  testimonial1Author = 'Carlos Rodríguez',
  testimonial1Role = 'Comprador Reciente',
  testimonial1Quote = 'Encontré mi auto soñado en menos de una semana. El proceso fue increíblemente sencillo y el financiamiento se ajustó perfectamente a mi presupuesto.',
  testimonial1Avatar = 'https://randomuser.me/api/portraits/men/32.jpg',
  testimonial1Rating = 5,
  // Testimonial 2
  testimonial2Author = 'Mariana López',
  testimonial2Role = 'Cliente Satisfecha',
  testimonial2Quote = 'La atención personalizada fue excepcional. Me ayudaron a entender todas mis opciones y encontré un vehículo que superó mis expectativas.',
  testimonial2Avatar = 'https://randomuser.me/api/portraits/women/44.jpg',
  testimonial2Rating = 5,
  // Testimonial 3
  testimonial3Author = 'Juan Méndez',
  testimonial3Role = 'Padre de Familia',
  testimonial3Quote = 'Necesitaba una camioneta familiar con excelentes condiciones y a buen precio. GoAuto me ofreció múltiples opciones que se ajustaban a mis necesidades.',
  testimonial3Avatar = 'https://randomuser.me/api/portraits/men/75.jpg',
  testimonial3Rating = 4,
}: HeroTestimonialProps) => {
  const { connectors, selected } = useNode((state) => ({
    selected: state.events.selected,
  }));

  const overlayStyle = {
    backgroundColor: overlayColor,
    opacity: overlayOpacity,
  };

  return (
    <div
      ref={connectors.connect}
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
        color: textColor,
        border: selected ? '1px dashed #1e88e5' : '1px solid transparent',
      }}
      className='w-full min-h-[600px] flex items-center'
    >
      {/* Overlay */}
      <div style={overlayStyle} className='absolute inset-0 z-0' />

      {/* Content */}
      <div className='container mx-auto px-4 z-10 relative py-16'>
        <div className='max-w-3xl mx-auto text-center mb-12'>
          <h1
            style={{ color: textColor }}
            className='text-4xl md:text-5xl font-bold mb-4'
          >
            {title}
          </h1>
          <p style={{ color: textColor }} className='text-lg md:text-xl'>
            {subtitle}
          </p>
        </div>

        {/* Testimonials */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mt-8'>
          <Testimonial
            author={testimonial1Author}
            role={testimonial1Role}
            quote={testimonial1Quote}
            avatar={testimonial1Avatar}
            rating={testimonial1Rating}
          />
          <Testimonial
            author={testimonial2Author}
            role={testimonial2Role}
            quote={testimonial2Quote}
            avatar={testimonial2Avatar}
            rating={testimonial2Rating}
          />
          <Testimonial
            author={testimonial3Author}
            role={testimonial3Role}
            quote={testimonial3Quote}
            avatar={testimonial3Avatar}
            rating={testimonial3Rating}
          />
        </div>
      </div>
    </div>
  );
};

const HeroTestimonialSettings = () => {
  const { actions, selected } = useEditor((state) => {
    const currentNodeId = state.events.selected;
    let selectedNode = null;

    if (currentNodeId) {
      const nodeId = Array.from(currentNodeId as Set<string>)[0];
      if (nodeId && state.nodes[nodeId]) {
        selectedNode = {
          id: nodeId,
          data: state.nodes[nodeId].data,
          props: state.nodes[nodeId].data.props,
        };
      }
    }

    return {
      selected: selectedNode,
    };
  });

  if (!selected) return null;

  return (
    <div className='space-y-4 overflow-y-auto max-h-[600px] pr-2'>
      <h3 className='font-medium'>Configuración general</h3>
      <div>
        <label className='text-sm font-medium mb-1 block'>Título</label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={selected.props.title || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.title = e.target.value;
            });
          }}
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>Subtítulo</label>
        <textarea
          className='w-full p-2 border rounded text-sm'
          rows={2}
          value={selected.props.subtitle || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.subtitle = e.target.value;
            });
          }}
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          URL de imagen de fondo
        </label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={selected.props.backgroundImage || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.backgroundImage = e.target.value;
            });
          }}
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Color de superposición
        </label>
        <div className='flex items-center'>
          <input
            type='color'
            className='w-10 h-10 p-1 border rounded'
            value={selected.props.overlayColor || '#000000'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.overlayColor = e.target.value;
              });
            }}
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={selected.props.overlayColor || '#000000'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.overlayColor = e.target.value;
              });
            }}
          />
        </div>
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Opacidad de superposición
        </label>
        <div className='flex items-center space-x-2'>
          <input
            type='range'
            min='0'
            max='1'
            step='0.1'
            className='flex-1'
            value={selected.props.overlayOpacity || 0.7}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.overlayOpacity = parseFloat(e.target.value);
              });
            }}
          />
          <span className='w-10 text-center'>
            {(selected.props.overlayOpacity || 0.7) * 100}%
          </span>
        </div>
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Color del texto principal
        </label>
        <div className='flex items-center'>
          <input
            type='color'
            className='w-10 h-10 p-1 border rounded'
            value={selected.props.textColor || '#ffffff'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.textColor = e.target.value;
              });
            }}
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={selected.props.textColor || '#ffffff'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.textColor = e.target.value;
              });
            }}
          />
        </div>
      </div>

      <h3 className='font-medium mt-6'>Testimonial 1</h3>
      <div>
        <label className='text-sm font-medium mb-1 block'>Autor</label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={selected.props.testimonial1Author || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.testimonial1Author = e.target.value;
            });
          }}
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>Rol</label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={selected.props.testimonial1Role || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.testimonial1Role = e.target.value;
            });
          }}
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>Testimonial</label>
        <textarea
          className='w-full p-2 border rounded text-sm'
          rows={3}
          value={selected.props.testimonial1Quote || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.testimonial1Quote = e.target.value;
            });
          }}
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>URL de Avatar</label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={selected.props.testimonial1Avatar || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.testimonial1Avatar = e.target.value;
            });
          }}
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Calificación (1-5)
        </label>
        <div className='flex items-center space-x-2'>
          <input
            type='range'
            min='1'
            max='5'
            step='1'
            className='flex-1'
            value={selected.props.testimonial1Rating || 5}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.testimonial1Rating = parseInt(e.target.value);
              });
            }}
          />
          <span className='w-10 text-center'>
            {selected.props.testimonial1Rating || 5}
          </span>
        </div>
      </div>

      <h3 className='font-medium mt-6'>Testimonial 2</h3>
      <div>
        <label className='text-sm font-medium mb-1 block'>Autor</label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={selected.props.testimonial2Author || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.testimonial2Author = e.target.value;
            });
          }}
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>Rol</label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={selected.props.testimonial2Role || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.testimonial2Role = e.target.value;
            });
          }}
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>Testimonial</label>
        <textarea
          className='w-full p-2 border rounded text-sm'
          rows={3}
          value={selected.props.testimonial2Quote || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.testimonial2Quote = e.target.value;
            });
          }}
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>URL de Avatar</label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={selected.props.testimonial2Avatar || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.testimonial2Avatar = e.target.value;
            });
          }}
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Calificación (1-5)
        </label>
        <div className='flex items-center space-x-2'>
          <input
            type='range'
            min='1'
            max='5'
            step='1'
            className='flex-1'
            value={selected.props.testimonial2Rating || 5}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.testimonial2Rating = parseInt(e.target.value);
              });
            }}
          />
          <span className='w-10 text-center'>
            {selected.props.testimonial2Rating || 5}
          </span>
        </div>
      </div>

      <h3 className='font-medium mt-6'>Testimonial 3</h3>
      <div>
        <label className='text-sm font-medium mb-1 block'>Autor</label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={selected.props.testimonial3Author || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.testimonial3Author = e.target.value;
            });
          }}
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>Rol</label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={selected.props.testimonial3Role || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.testimonial3Role = e.target.value;
            });
          }}
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>Testimonial</label>
        <textarea
          className='w-full p-2 border rounded text-sm'
          rows={3}
          value={selected.props.testimonial3Quote || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.testimonial3Quote = e.target.value;
            });
          }}
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>URL de Avatar</label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={selected.props.testimonial3Avatar || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.testimonial3Avatar = e.target.value;
            });
          }}
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Calificación (1-5)
        </label>
        <div className='flex items-center space-x-2'>
          <input
            type='range'
            min='1'
            max='5'
            step='1'
            className='flex-1'
            value={selected.props.testimonial3Rating || 4}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.testimonial3Rating = parseInt(e.target.value);
              });
            }}
          />
          <span className='w-10 text-center'>
            {selected.props.testimonial3Rating || 4}
          </span>
        </div>
      </div>
    </div>
  );
};

HeroTestimonial.craft = {
  displayName: 'Hero con Testimonios',
  props: {
    title: 'Lo que nuestros clientes dicen',
    subtitle: 'Miles de personas han encontrado su vehículo ideal con GoAuto',
    backgroundImage:
      'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?q=80&w=1470',
    overlayColor: '#000000',
    overlayOpacity: 0.7,
    textColor: '#ffffff',
    testimonialTextColor: '#333333',
    accentColor: '#3b82f6',
    // Testimonial 1
    testimonial1Author: 'Carlos Rodríguez',
    testimonial1Role: 'Comprador Reciente',
    testimonial1Quote:
      'Encontré mi auto soñado en menos de una semana. El proceso fue increíblemente sencillo y el financiamiento se ajustó perfectamente a mi presupuesto.',
    testimonial1Avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    testimonial1Rating: 5,
    // Testimonial 2
    testimonial2Author: 'Mariana López',
    testimonial2Role: 'Cliente Satisfecha',
    testimonial2Quote:
      'La atención personalizada fue excepcional. Me ayudaron a entender todas mis opciones y encontré un vehículo que superó mis expectativas.',
    testimonial2Avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    testimonial2Rating: 5,
    // Testimonial 3
    testimonial3Author: 'Juan Méndez',
    testimonial3Role: 'Padre de Familia',
    testimonial3Quote:
      'Necesitaba una camioneta familiar con excelentes condiciones y a buen precio. GoAuto me ofreció múltiples opciones que se ajustaban a mis necesidades.',
    testimonial3Avatar: 'https://randomuser.me/api/portraits/men/75.jpg',
    testimonial3Rating: 4,
  },
  related: {
    toolbar: HeroTestimonialSettings,
  },
};

export { HeroTestimonialSettings };
