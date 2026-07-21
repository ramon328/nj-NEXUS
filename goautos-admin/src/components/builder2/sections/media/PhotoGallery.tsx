import React from 'react';
import { useNode, UserComponent } from '@craftjs/core';
import { DeleteButton } from '../../DeleteButton';
import { EditableText } from '../../EditableText';

interface GalleryImage {
  src: string;
  alt: string;
  caption: string;
}

interface PhotoGalleryProps {
  sectionTitle: string;
  images: GalleryImage[];
  layout: 'grid' | 'masonry';
  columns: 2 | 3 | 4;
  gap: number;
  rounded: boolean;
  showCaptions: boolean;
  bgColor: string;
  textColor: string;
}

const defaultImages: GalleryImage[] = [
  {
    src: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&h=400&fit=crop',
    alt: 'Luxury sports car',
    caption: 'Deportivo de lujo en exhibicion',
  },
  {
    src: 'https://images.unsplash.com/photo-1542362567-b07e54358753?w=600&h=400&fit=crop',
    alt: 'Classic muscle car',
    caption: 'Clasico americano restaurado',
  },
  {
    src: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=600&h=400&fit=crop',
    alt: 'Modern sedan',
    caption: 'Sedan moderno con tecnologia avanzada',
  },
  {
    src: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=600&h=400&fit=crop',
    alt: 'Red sports car',
    caption: 'Vehiculo deportivo rojo',
  },
  {
    src: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&h=400&fit=crop',
    alt: 'SUV on road',
    caption: 'SUV familiar en carretera',
  },
  {
    src: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&h=400&fit=crop',
    alt: 'Corvette side view',
    caption: 'Vista lateral de un Corvette',
  },
];

export const PhotoGallery: UserComponent<PhotoGalleryProps> = ({
  sectionTitle,
  images,
  layout,
  columns,
  gap,
  rounded,
  showCaptions,
  bgColor,
  textColor,
}) => {
  const {
    connectors: { connect, drag },
    selected,
    id,
  } = useNode((state) => ({
    selected: state.events.selected,
  }));

  const gridCols =
    columns === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : columns === 3
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={`relative w-full py-16 px-4 ${selected ? 'outline outline-2 outline-blue-500' : ''}`}
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {selected && <DeleteButton />}

      <div className="max-w-7xl mx-auto">
        {sectionTitle && (
          <EditableText
            tag="h2"
            value={sectionTitle}
            nodeId={id}
            propName="sectionTitle"
            className="text-3xl font-bold text-center mb-10"
            style={{ color: textColor }}
          />
        )}

        <div className={`grid ${gridCols}`} style={{ gap: `${gap * 4}px` }}>
          {images.map((image, index) => (
            <div
              key={index}
              className={`group relative overflow-hidden ${rounded ? 'rounded-xl' : ''}`}
              style={
                layout === 'masonry'
                  ? { height: index % 3 === 0 ? '320px' : index % 3 === 1 ? '240px' : '280px' }
                  : { height: '240px' }
              }
            >
              <img
                src={image.src}
                alt={image.alt}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />

              {showCaptions && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                  <p className="text-white text-sm font-medium p-4">{image.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

PhotoGallery.craft = {
  displayName: 'PhotoGallery',
  props: {
    sectionTitle: 'Nuestra Galeria',
    images: defaultImages,
    layout: 'grid',
    columns: 3,
    gap: 8,
    rounded: true,
    showCaptions: true,
    bgColor: '#ffffff',
    textColor: '#1a1a1a',
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => false,
    canMoveOut: () => true,
  },
};

export default PhotoGallery;
