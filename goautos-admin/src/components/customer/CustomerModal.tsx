
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Drawer, DrawerContent, DrawerContentRight } from '@/components/ui/drawer';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import CustomerForm from './CustomerForm';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (customerId: number) => void;
  initialEmail?: string;
}

const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialEmail
}) => {
  const { toast } = useToast();
  const { clientId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' && window.innerWidth >= 768
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleSuccess = async (customerData: any) => {
    if (customerData && customerData.id) {
      onSuccess(customerData.id);
    }
    onClose();
  };

  const content = (
    <>
      <div className="px-4 py-2 sm:px-5 sm:py-4 border-b border-slate-100 shrink-0 flex items-center justify-between gap-3">
        <h2 className="text-[14px] sm:text-[16px] font-semibold text-slate-900 leading-tight">Cliente</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="w-8 h-8 -mr-1 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-5">
        <CustomerForm
          onSuccess={handleSuccess}
          initialEmail={initialEmail}
        />
      </div>
    </>
  );

  if (isDesktop) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()} direction="right" dismissible={false}>
        <DrawerContentRight className="md:min-w-[480px]">
          <div className="flex flex-col h-full">
            {content}
          </div>
        </DrawerContentRight>
      </Drawer>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()} dismissible={false}>
      <DrawerContent className="max-h-[92vh]">
        <div className="flex flex-col h-full max-h-[92vh]">
          {content}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default CustomerModal;
