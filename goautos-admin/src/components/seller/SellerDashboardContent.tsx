import { useSellerDashboard } from '@/hooks/useSellerDashboard';
import { formatCurrency } from '@/components/dashboard/formatters';
import { Car, ShoppingBag, Clock, DollarSign, CheckCircle2, XCircle, BarChart3, Handshake, Receipt, Wallet } from 'lucide-react';
import { DEFAULT_IVA_PERCENTAGE } from '@/utils/sellerCalculation';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

interface SellerDashboardContentProps {
  showHeader?: boolean;
}

const SellerDashboardContent = ({ showHeader = true }: SellerDashboardContentProps) => {
  const { stats, loading, monthlyData } = useSellerDashboard();

  // Skeleton for stat cards
  const StatSkeleton = () => (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 animate-pulse">
      <div className="h-3 w-20 bg-slate-200 rounded mb-3" />
      <div className="h-7 w-28 bg-slate-200 rounded mb-2" />
      <div className="h-2.5 w-16 bg-slate-100 rounded" />
    </div>
  );

  const ChartSkeleton = () => (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-6 animate-pulse">
      <div className="h-4 w-32 bg-slate-200 rounded mb-4" />
      <div className="h-48 sm:h-56 bg-slate-50 rounded-xl" />
    </div>
  );

  // Stats config
  const statCards = [
    {
      label: 'Comisiones ganadas',
      value: formatCurrency(stats.totalCommissionEarned),
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Ventas totales',
      value: stats.totalSales.toString(),
      icon: ShoppingBag,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Vehículos asignados',
      value: stats.assignedVehicles.toString(),
      icon: Car,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
    {
      label: 'Consignas captadas',
      value: stats.consignmentsCaptured.toString(),
      icon: Handshake,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ];

  // Pie data
  const pieData = [
    { name: 'Aprobadas', value: stats.approvedSales, color: '#10b981' },
    { name: 'Pendientes', value: stats.pendingApprovalSales, color: '#f59e0b' },
    { name: 'Rechazadas', value: stats.rejectedSales, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const hasPieData = pieData.length > 0;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-5 sm:space-y-6">
      {/* Header - only if standalone */}
      {showHeader && (
        <div className="px-1">
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900">
            Mi rendimiento
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Resumen de ventas y comisiones
          </p>
        </div>
      )}

      {/* Divider when combined with admin dashboard */}
      {!showHeader && (
        <div className="flex items-center gap-3 px-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-violet-50">
              <BarChart3 className="h-4 w-4 text-violet-600" />
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-slate-900">Mi rendimiento</h2>
          </div>
          <div className="flex-1 h-px bg-slate-200" />
        </div>
      )}

      {/* Stat cards - 2 cols mobile, 4 cols desktop */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map(i => <StatSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 transition-shadow hover:shadow-sm"
            >
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs sm:text-sm font-medium text-slate-500 leading-tight">
                  {card.label}
                </span>
                <div className={`p-1.5 sm:p-2 rounded-xl ${card.bg}`}>
                  <card.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${card.color}`} />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {card.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* IVA + comisión neta estimada (cálculo automático) */}
      {!loading && stats.approvedSales > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-medium text-slate-600 leading-tight">
                IVA estimado retenido ({DEFAULT_IVA_PERCENTAGE}% sobre margen)
              </span>
              <div className="p-1.5 sm:p-2 rounded-xl bg-amber-100">
                <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-700" />
              </div>
            </div>
            <p className="text-lg sm:text-xl font-semibold text-amber-800 tracking-tight">
              {formatCurrency(stats.totalIvaWithheld)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Régimen del margen: IVA = margen × {DEFAULT_IVA_PERCENTAGE}/{100 + DEFAULT_IVA_PERCENTAGE}.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-medium text-slate-600 leading-tight">
                Comisión neta estimada (post-IVA)
              </span>
              <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-100">
                <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-700" />
              </div>
            </div>
            <p className="text-lg sm:text-xl font-semibold text-emerald-800 tracking-tight">
              {formatCurrency(stats.totalNetCommission)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Cálculo informativo basado en ventas aprobadas.
            </p>
          </div>
        </div>
      )}

      {/* Charts grid - stack on mobile, 2 cols on lg */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          {/* Ventas mensuales */}
          <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Ventas mensuales</h3>
            <div className="h-52 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 13 }}
                    formatter={(value: number) => [value, 'Ventas']}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Bar dataKey="sales" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Comisiones mensuales */}
          <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Comisiones mensuales</h3>
            <div className="h-52 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sellerCommGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 13 }}
                    formatter={(value: number) => [formatCurrency(value), 'Comisión']}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Area type="monotone" dataKey="commissions" stroke="#10b981" strokeWidth={2} fill="url(#sellerCommGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Estado de ventas */}
          <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Estado de ventas</h3>
            {!hasPieData ? (
              <div className="h-52 sm:h-64 flex items-center justify-center">
                <p className="text-sm text-slate-400">Sin datos de ventas aún</p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Pie chart */}
                <div className="h-44 sm:h-56 w-full sm:w-1/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius="55%"
                        outerRadius="85%"
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 13 }}
                        formatter={(value: number) => [`${value} ventas`, '']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Legend manual */}
                <div className="flex sm:flex-col gap-3 sm:gap-2.5 w-full sm:w-1/2">
                  {[
                    { label: 'Aprobadas', value: stats.approvedSales, color: '#10b981', icon: CheckCircle2 },
                    { label: 'Pendientes', value: stats.pendingApprovalSales, color: '#f59e0b', icon: Clock },
                    { label: 'Rechazadas', value: stats.rejectedSales, color: '#ef4444', icon: XCircle },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2 flex-1 sm:flex-none">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-xs sm:text-sm text-slate-600">{item.label}</span>
                      <span className="text-xs sm:text-sm font-semibold text-slate-900 ml-auto">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerDashboardContent;
