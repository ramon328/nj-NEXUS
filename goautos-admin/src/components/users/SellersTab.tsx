import React from 'react';
import { useTranslation } from 'react-i18next';
import { User } from '@/types/user';
import { Trash2, Edit, Settings2 } from 'lucide-react';
import { Drawer, DrawerContentRight, DrawerTrigger } from '@/components/ui/drawer';
import SellerProfile from '@/components/users/seller/SellerProfile';
import { useDealerships } from '@/hooks/useDealerships';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface SellersTabProps {
  users: User[];
  onCreateUser: () => void;
  onSelectSeller: (seller: User) => void;
  selectedSeller: User | null;
  drawerOpen: boolean;
  onDrawerOpenChange: (open: boolean) => void;
  onCloseDrawer: () => void;
  onEditSeller?: (seller: User) => void;
  onDeleteSeller?: (seller: User) => void;
  onCommissionsSaved?: () => void;
}

const SellersTab: React.FC<SellersTabProps> = ({
  users,
  onCreateUser,
  onSelectSeller,
  selectedSeller,
  drawerOpen,
  onDrawerOpenChange,
  onCloseDrawer,
  onEditSeller,
  onDeleteSeller,
  onCommissionsSaved,
}) => {
  const { t } = useTranslation('team');
  // Users are already filtered by EquipoContent
  const sellerUsers = users;
  const [sellerToDelete, setSellerToDelete] = React.useState<User | null>(null);
  const { dealerships } = useDealerships();
  // La columna de sede solo aparece si el tenant tiene mas de una sede.
  const showDealershipCol = dealerships.length > 1;
  const dealershipsById = React.useMemo(
    () => new Map(dealerships.map((d) => [d.id, d])),
    [dealerships]
  );
  const dealershipLabel = (id: number) => {
    const d = dealershipsById.get(id);
    return d ? d.name || d.address || `Sede ${id}` : `Sede ${id}`;
  };

  const handleDeleteClick = (seller: User, e: React.MouseEvent) => {
    e.stopPropagation();
    setSellerToDelete(seller);
  };

  const handleEditClick = (seller: User, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEditSeller) {
      onEditSeller(seller);
    }
  };

  const confirmDelete = () => {
    if (sellerToDelete && onDeleteSeller) {
      onDeleteSeller(sellerToDelete);
    }
    setSellerToDelete(null);
  };

  return (
    <>
      <Drawer open={drawerOpen} onOpenChange={onDrawerOpenChange} direction="right">
        <div className='mx-4 sm:mx-6 lg:mx-8 mt-3 sm:mt-4 rounded-2xl overflow-hidden shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border border-slate-200/60'>
          {sellerUsers.length === 0 ? (
            <div className='p-8 text-center'>
              <p className='text-[13px] text-slate-400'>
                {t('sellers.empty')}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className='border-b border-slate-100'>
                  <TableHead className='bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium px-3'>
                    {t('sellers.table.name')}
                  </TableHead>
                  <TableHead className='bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium px-3'>
                    {t('sellers.table.email')}
                  </TableHead>
                  <TableHead className='bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium px-3'>
                    {t('sellers.table.phone')}
                  </TableHead>
                  <TableHead className='bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium px-3'>
                    {t('sellers.table.assignedCommissions')}
                  </TableHead>
                  {showDealershipCol && (
                    <TableHead className='bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium px-3'>
                      Sede(s)
                    </TableHead>
                  )}
                  <TableHead className='bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium px-3 text-right'>
                    {t('sellers.table.actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sellerUsers.map((seller) => (
                  <TableRow
                    key={seller.id}
                    className='border-b border-slate-100 hover:bg-slate-50/50 transition-colors'
                  >
                    <TableCell className='text-[13px] text-slate-700'>
                      <DrawerTrigger asChild>
                        <button
                          onClick={() => onSelectSeller(seller)}
                          className='font-medium text-slate-900 hover:text-primary transition-colors'
                        >
                          {`${seller.first_name || ''} ${
                            seller.last_name || ''
                          }`.trim() || t('sellers.table.sellerFallback')}
                        </button>
                      </DrawerTrigger>
                    </TableCell>
                    <TableCell className='text-[13px] text-slate-600'>{seller.email}</TableCell>
                    <TableCell className='text-[13px] text-slate-600'>{seller.phone || '-'}</TableCell>
                    <TableCell>
                      <span
                        className={`text-[12px] font-medium px-2 py-0.5 rounded-full ${
                          seller.hasAssignedCommissions
                            ? 'text-emerald-700 bg-emerald-50'
                            : 'text-amber-700 bg-amber-50'
                        }`}
                      >
                        {seller.hasAssignedCommissions
                          ? t('sellers.table.assigned')
                          : t('sellers.table.pending')}
                      </span>
                    </TableCell>
                    {showDealershipCol && (
                      <TableCell>
                        {seller.dealership_ids && seller.dealership_ids.length > 0 ? (
                          <div className='flex flex-wrap gap-1'>
                            {seller.dealership_ids.map((id) => (
                              <Badge
                                key={id}
                                className='text-[11px] bg-blue-50 text-blue-700 hover:bg-blue-50 font-normal'
                              >
                                {dealershipLabel(id)}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className='text-[12px] text-slate-400'>Todas</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell className='py-2 px-3 align-middle text-right'>
                      <div className='flex justify-end gap-1'>
                        <DrawerTrigger asChild>
                          <button
                            onClick={() => onSelectSeller(seller)}
                            className='flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors duration-150'
                            title={t('sellers.table.configureCommissions')}
                            type='button'
                          >
                            <Settings2 className='h-3.5 w-3.5' />
                          </button>
                        </DrawerTrigger>
                        {onEditSeller && (
                          <button
                            onClick={(e) => handleEditClick(seller, e)}
                            className='flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors duration-150'
                            title={t('sellers.table.edit')}
                            type='button'
                          >
                            <Edit className='h-3.5 w-3.5' />
                          </button>
                        )}
                        {onDeleteSeller && (
                          <button
                            onClick={(e) => handleDeleteClick(seller, e)}
                            className='flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors duration-150'
                            title={t('sellers.table.delete')}
                            type='button'
                          >
                            <Trash2 className='h-3.5 w-3.5' />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <DrawerContentRight className='md:min-w-[480px]'>
          {selectedSeller && (
            <SellerProfile seller={selectedSeller} onClose={onCloseDrawer} onCommissionsSaved={onCommissionsSaved} />
          )}
        </DrawerContentRight>
      </Drawer>

      <AlertDialog
        open={!!sellerToDelete}
        onOpenChange={(open) => !open && setSellerToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('sellers.confirmDelete.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('sellers.confirmDelete.description', { seller: sellerToDelete ? `${sellerToDelete.first_name || ''} ${sellerToDelete.last_name || ''}`.trim() || t('sellers.table.sellerFallback') : '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={confirmDelete}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              {t('sellers.confirmDelete.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SellersTab;
