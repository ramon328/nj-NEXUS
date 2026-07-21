import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle: string;
}

const PageHeader = ({ title, subtitle }: PageHeaderProps) => {
  return (
    <div className=' pb-6'>
      <div className='flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0'>
        <div className='space-y-1'>
          <h1 className='text-2xl font-semibold tracking-tight text-foreground mb-2'>
            {title}
          </h1>
          <p className='text-base text-muted-foreground max-w-[500px]'>
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
