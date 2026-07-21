import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Client } from '@/types/user';
import { Button } from './ui/button';

interface WebsiteBannerProps {
  client: Client;
}

const WebsiteBanner: React.FC<WebsiteBannerProps> = ({ client }) => {
  if (!client.domain) return null;

  const websiteUrl = `https://${client.domain}`;

  return (
    <div className=' border-b  shadow-sm'>
      <div className='container mx-auto px-4 py-3'>
        <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3'>
          {/* Información del dominio */}
          <div className='flex flex-col'>
            <span className='text-xs md:text-sm font-medium text-gray-600 mb-1'>
              Tu sitio web está publicado en:
            </span>
            <a
              href={websiteUrl}
              target='_blank'
              rel='noopener noreferrer'
              className='font-bold text-base md:text-lg text-cyan-500  transition-colors flex items-center gap-2 group break-all'
            >
              <span className='relative'>
                {client.domain}
                <span className='absolute -bottom-1 left-0 w-0 h-0.5 bg-cyan-500 group-hover:w-full transition-all duration-300' />
              </span>
              <ExternalLink className='h-4 w-4 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all flex-shrink-0' />
            </a>
          </div>

          {/* Botones de acción */}
          <div className='flex items-center gap-2 w-full sm:w-auto'>
            {/* Botón Visitar sitio */}
            <Button
              asChild
              size='sm'
              className='flex items-center rounded-full gap-2  bg-gradient-to-r from-cyan-500 to-cyan-600 hover:to-cyan-700 text-white shadow-md hover:shadow-lg transition-all flex-1 sm:flex-none'
            >
              <a
                href={websiteUrl}
                target='_blank'
                rel='noopener noreferrer'
              >
                <ExternalLink className='h-4 w-4' />
                <span>Visitar sitio</span>
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebsiteBanner;
