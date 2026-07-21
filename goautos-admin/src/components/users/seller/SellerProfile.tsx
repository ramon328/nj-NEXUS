import React from 'react';
import { X } from 'lucide-react';
import CommissionTiers from './CommissionTiers';

type User = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  rol: string;
  client_id: number | null;
  auth_id: string;
};

interface SellerProfileProps {
  seller: User;
  onClose?: () => void;
  onCommissionsSaved?: () => void;
}

const SellerProfile: React.FC<SellerProfileProps> = ({ seller, onClose, onCommissionsSaved }) => {
  const sellerName =
    `${seller.first_name || ''} ${seller.last_name || ''}`.trim() || 'Vendedor';
  const initials = `${seller.first_name?.charAt(0) || ''}${seller.last_name?.charAt(0) || ''}`.toUpperCase();

  return (
    <div className='flex flex-col h-full'>
      {/* Header */}
      <div className='px-5 py-4 border-b border-slate-100 shrink-0'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm'>
              <span className='text-[12px] font-bold text-white'>{initials}</span>
            </div>
            <div>
              <h2 className='text-[15px] font-semibold text-slate-900 leading-tight'>{sellerName}</h2>
              <p className='text-[12px] text-slate-400'>{seller.email}</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className='flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors'
            >
              <X className='h-4 w-4' />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className='flex-1 overflow-y-auto p-5'>
        <CommissionTiers userId={seller.id} userName={sellerName} onSaved={onCommissionsSaved} />
      </div>
    </div>
  );
};

export default SellerProfile;
