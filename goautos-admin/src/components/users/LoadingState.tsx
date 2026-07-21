import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingState = () => {
  return (
    <div className='flex items-center justify-center py-12'>
      <Loader2 className='h-6 w-6 animate-spin text-slate-400' />
    </div>
  );
};

export default LoadingState;
