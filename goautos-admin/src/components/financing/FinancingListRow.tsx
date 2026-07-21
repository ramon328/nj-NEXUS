import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { Financing } from "@/types/financing";
import { Eye } from "lucide-react";
import { Link } from "wouter";
import { useI18n } from '@/hooks/useI18n';
import FinancingProgressBar from "./FinancingProgressBar";
import FinancingStatusBadge from "./FinancingStatusBadge";
import { getNextPaymentDate } from "./utils/financingStatusUtils";

type FinancingListRowProps = {
  financing: Financing;
};

const FinancingListRow = ({ financing }: FinancingListRowProps) => {
  const { tCommon } = useI18n();
  const nextPaymentDate = getNextPaymentDate(financing);
  const nextPaymentDisplay =
    nextPaymentDate === 'No hay pagos programados'
      ? tCommon('financing.nextPayment.none')
      : nextPaymentDate === 'Todos los pagos completados'
      ? tCommon('financing.nextPayment.completed')
      : nextPaymentDate;

  return (
    <TableRow className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-b-0">
      <TableCell className="px-3 py-3">
        {financing.customer ? (
          <div className="min-w-0">
            <div className="text-[13px] font-medium text-slate-700 truncate">{`${financing.customer.first_name} ${financing.customer.last_name}`}</div>
            <div className="text-[11px] text-slate-400">
              {financing.customer.rut}
            </div>
          </div>
        ) : (
          <span className="text-[13px] text-slate-400">{tCommon('financing.list.labels.customerUnavailable')}</span>
        )}
     </TableCell>
      <TableCell className="px-3 py-3">
        {financing.vehicle ? (
          <div>
            <div className="text-[13px] font-medium text-slate-700">{`${financing.vehicle.brand_id} ${financing.vehicle.year}`}</div>
            <div className="text-[11px] text-slate-400">
              {financing.vehicle.license_plate}
            </div>
          </div>
        ) : (
          <span className="text-[13px] text-slate-400">{tCommon('financing.list.labels.vehicleUnavailable')}</span>
        )}
     </TableCell>
      <TableCell className="px-3 py-3 text-[13px] text-slate-700">{formatCurrency(Number(financing.downpayment))}</TableCell>
      <TableCell className="px-3 py-3 text-[13px] text-slate-700">
        {formatCurrency(Number(financing.monthly_installment))}
      </TableCell>
      <TableCell className="px-3 py-3">
        <FinancingStatusBadge financing={financing} />
      </TableCell>
      <TableCell className="px-3 py-3">
        <div className="text-[13px] text-slate-700">{nextPaymentDisplay}</div>
      </TableCell>
      <TableCell className="px-3 py-3">
        <FinancingProgressBar financing={financing} />
      </TableCell>
      <TableCell className="px-3 py-3 text-right">
        <Button variant="outline" size="sm" className="h-8 rounded-lg text-[12px] font-medium border-slate-200/60 hover:bg-slate-50" asChild>
          <Link href={`/financiamiento/${financing.id}`}>
            <Eye className="mr-1 h-3.5 w-3.5" />
            {tCommon('financing.list.buttons.viewDetail')}
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  );
};

export default FinancingListRow;
