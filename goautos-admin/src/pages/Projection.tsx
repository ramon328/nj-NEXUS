import { useState, useMemo, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { LuLock } from 'react-icons/lu';
import posthog from '@/utils/posthog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Calculator,
  Target,
  TrendingUp,
  DollarSign,
  Car,
  Handshake,
  Lightbulb,
  BarChart3,
} from 'lucide-react';

interface ProyeccionParams {
  automorasActuales: number;
  valorPorAutomotora: number;
  reunionesMensuales: number;
  tasaCierre: number;
  tasaCancelacion: number;
  objetivoMensual: number;
}

interface ProyeccionMensual {
  mes: string;
  automotoras: number;
  ingresosMensuales: number;
  automorasAcumuladas: number;
  porcentajeObjetivo: number;
}

const VALOR_AUTOMOTORA = 200;
const OBJETIVO_DEFAULT = 100_000;

const formatearNumero = (numero: number): string => {
  if (numero >= 1_000_000) {
    return `${(numero / 1_000_000).toFixed(1)}M`;
  } else if (numero >= 1_000) {
    return `${(numero / 1_000).toFixed(1)}K`;
  } else {
    return numero.toFixed(0);
  }
};

// Stat Card Component with colored background and dot pattern
const StatCard = ({
  icon: Icon,
  title,
  value,
  subtitle,
  gradient,
  bgColor,
}: {
  icon: React.ElementType;
  title: string;
  value: string | number;
  subtitle: string;
  gradient: string;
  bgColor: string;
}) => (
  <div className={`relative overflow-hidden rounded-xl sm:rounded-2xl ${bgColor} shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]`}>
    {/* Dot pattern background */}
    <div
      className="absolute inset-0 opacity-20"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)',
        backgroundSize: '12px 12px'
      }}
    />
    {/* Glow effect */}
    <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/20 blur-2xl`} />
    <div className="relative p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs sm:text-sm font-medium text-white/90">{title}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
          <Icon className="h-4 w-4 text-white" />
        </div>
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-white">{value}</p>
      <p className="text-[10px] sm:text-xs text-white/80 mt-1">{subtitle}</p>
    </div>
  </div>
);

const Projection = () => {
  const { userRole, userId } = useAuth();

  if (userRole !== 'superadmin') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-4">
              <LuLock className="w-5 h-5 text-slate-400" />
            </div>
            <h1 className="text-lg font-semibold text-slate-700 mb-1">Acceso Denegado</h1>
            <p className="text-sm text-slate-400">Esta página es exclusiva para superadmins.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const [params, setParams] = useState<ProyeccionParams>({
    automorasActuales: 5,
    valorPorAutomotora: VALOR_AUTOMOTORA,
    reunionesMensuales: 50,
    tasaCierre: 20,
    tasaCancelacion: 5,
    objetivoMensual: OBJETIVO_DEFAULT,
  });

  // Track projection page view on mount
  useEffect(() => {
    posthog.capture({
      distinctId: userId || 'anonymous',
      event: 'projection_viewed',
      properties: {},
    });
  }, []);

  const updateParam = (key: keyof ProyeccionParams, value: number) => {
    posthog.capture({
      distinctId: userId || 'anonymous',
      event: 'projection_parameters_adjusted',
      properties: { parameter_name: key, value },
    });
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const proyeccion = useMemo(() => {
    const meses: ProyeccionMensual[] = [];
    const fechaInicio = new Date();
    fechaInicio.setDate(1);

    let automorasAcumuladas = params.automorasActuales;

    for (let i = 0; i < 60; i++) {
      const fecha = new Date(fechaInicio);
      fecha.setMonth(fecha.getMonth() + i);

      const automorasNuevas = Math.round(
        (params.reunionesMensuales * params.tasaCierre) / 100
      );

      const automorasCanceladas = Math.round(
        (automorasAcumuladas * params.tasaCancelacion) / 100
      );

      if (i > 0) {
        automorasAcumuladas =
          automorasAcumuladas + automorasNuevas - automorasCanceladas;
        automorasAcumuladas = Math.max(0, automorasAcumuladas);
      }

      const ingresosMensuales = automorasAcumuladas * params.valorPorAutomotora;
      const porcentajeObjetivo =
        (ingresosMensuales / params.objetivoMensual) * 100;

      meses.push({
        mes: fecha.toLocaleDateString('es-ES', {
          month: 'short',
          year: 'numeric',
        }),
        automotoras: i === 0 ? params.automorasActuales : automorasNuevas,
        ingresosMensuales,
        automorasAcumuladas,
        porcentajeObjetivo,
      });
    }

    return meses;
  }, [params]);

  const mesObjetivo = proyeccion.find(
    (mes) => mes.ingresosMensuales >= params.objetivoMensual
  );
  const progresoActual = proyeccion[0]?.ingresosMensuales || 0;

  const automorasNecesarias = Math.ceil(
    params.objetivoMensual / params.valorPorAutomotora
  );
  const automorasAdicionales = automorasNecesarias - params.automorasActuales;

  return (
    <DashboardLayout>
      <div className="bg-gradient-to-br from-gray-50 via-white to-slate-50 p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Proyección Red de Automotoras
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Estado actual: {params.automorasActuales} automotoras | Objetivo: ${formatearNumero(params.objetivoMensual)} USD/mes | {params.reunionesMensuales} reuniones × {params.tasaCierre}% cierre
          </p>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            icon={Target}
            title="Objetivo Mensual"
            value={`$${formatearNumero(params.objetivoMensual)}`}
            subtitle="USD por mes"
            gradient="from-emerald-500 to-green-600"
            bgColor="bg-gradient-to-br from-emerald-500 to-green-600"
          />
          <StatCard
            icon={TrendingUp}
            title="Ingresos Actuales"
            value={`$${formatearNumero(progresoActual)}`}
            subtitle={`${((progresoActual / params.objetivoMensual) * 100).toFixed(1)}% del objetivo`}
            gradient="from-blue-500 to-indigo-600"
            bgColor="bg-gradient-to-br from-blue-500 to-indigo-600"
          />
          <StatCard
            icon={Car}
            title="Automotoras Necesarias"
            value={automorasNecesarias}
            subtitle="Para llegar al objetivo"
            gradient="from-violet-500 to-purple-600"
            bgColor="bg-gradient-to-br from-violet-500 to-purple-600"
          />
          <StatCard
            icon={Handshake}
            title="Automotoras Adicionales"
            value={automorasAdicionales}
            subtitle="Necesarias para el objetivo"
            gradient="from-amber-500 to-orange-600"
            bgColor="bg-gradient-to-br from-amber-500 to-orange-600"
          />
        </div>

        {/* Parameters Card */}
        <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-white border border-gray-100 shadow-lg">
          <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-blue-50 blur-3xl opacity-60" />
          <div className="absolute -left-16 -bottom-16 h-32 w-32 rounded-full bg-indigo-50 blur-3xl opacity-60" />

          <div className="relative p-4 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
                <Calculator className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Parámetros de Proyección</h3>
                <p className="text-[10px] sm:text-xs text-gray-500">Configura los valores para ajustar la proyección</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="automorasActuales" className="text-xs sm:text-sm text-gray-600">Automotoras Actuales</Label>
                <Input
                  id="automorasActuales"
                  type="number"
                  value={params.automorasActuales}
                  onChange={(e) => updateParam('automorasActuales', parseInt(e.target.value) || 0)}
                  className="h-9 sm:h-10 text-sm bg-gray-50 border-gray-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="valorPorAutomotora" className="text-xs sm:text-sm text-gray-600">Valor por Automotora (USD)</Label>
                <Input
                  id="valorPorAutomotora"
                  type="number"
                  value={params.valorPorAutomotora}
                  onChange={(e) => updateParam('valorPorAutomotora', parseFloat(e.target.value) || 0)}
                  className="h-9 sm:h-10 text-sm bg-gray-50 border-gray-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reunionesMensuales" className="text-xs sm:text-sm text-gray-600">Reuniones Mensuales</Label>
                <Input
                  id="reunionesMensuales"
                  type="number"
                  value={params.reunionesMensuales}
                  onChange={(e) => updateParam('reunionesMensuales', parseInt(e.target.value) || 0)}
                  className="h-9 sm:h-10 text-sm bg-gray-50 border-gray-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tasaCierre" className="text-xs sm:text-sm text-gray-600">Tasa de Cierre (%)</Label>
                <Input
                  id="tasaCierre"
                  type="number"
                  value={params.tasaCierre}
                  onChange={(e) => updateParam('tasaCierre', parseFloat(e.target.value) || 0)}
                  className="h-9 sm:h-10 text-sm bg-gray-50 border-gray-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tasaCancelacion" className="text-xs sm:text-sm text-gray-600">Tasa Cancelación (%)</Label>
                <Input
                  id="tasaCancelacion"
                  type="number"
                  value={params.tasaCancelacion}
                  onChange={(e) => updateParam('tasaCancelacion', parseFloat(e.target.value) || 0)}
                  className="h-9 sm:h-10 text-sm bg-gray-50 border-gray-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="objetivoMensual" className="text-xs sm:text-sm text-gray-600">Objetivo Mensual (USD)</Label>
                <Input
                  id="objetivoMensual"
                  type="number"
                  value={params.objetivoMensual}
                  onChange={(e) => updateParam('objetivoMensual', parseFloat(e.target.value) || 0)}
                  className="h-9 sm:h-10 text-sm bg-emerald-50 border-emerald-200 focus:border-emerald-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Current vs Goal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {/* Current State */}
          <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-white border border-gray-100 shadow-lg">
            <div className="absolute -right-12 -top-12 h-24 w-24 rounded-full bg-blue-50 blur-2xl opacity-60" />
            <div className="relative p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md">
                  <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                </div>
                <h4 className="text-sm sm:text-base font-bold text-gray-900">Estado Actual</h4>
              </div>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                  <span className="text-xs sm:text-sm text-gray-600">Automotoras:</span>
                  <span className="text-sm sm:text-base font-semibold text-gray-900">{params.automorasActuales}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                  <span className="text-xs sm:text-sm text-gray-600">Valor por automotora:</span>
                  <span className="text-sm sm:text-base font-semibold text-gray-900">${params.valorPorAutomotora} USD</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                  <span className="text-xs sm:text-sm text-gray-600">Ingresos mensuales:</span>
                  <span className="text-sm sm:text-base font-bold text-blue-600">${formatearNumero(progresoActual)}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                  <span className="text-xs sm:text-sm text-gray-600">Reuniones mensuales:</span>
                  <span className="text-sm sm:text-base font-semibold text-gray-900">{params.reunionesMensuales}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                  <span className="text-xs sm:text-sm text-gray-600">Tasa de cierre:</span>
                  <span className="text-sm sm:text-base font-semibold text-gray-900">{params.tasaCierre}%</span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-xs sm:text-sm text-gray-600">Tasa de cancelación:</span>
                  <span className="text-sm sm:text-base font-semibold text-gray-900">{params.tasaCancelacion}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Goal */}
          <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-white border border-gray-100 shadow-lg">
            <div className="absolute -right-12 -top-12 h-24 w-24 rounded-full bg-emerald-50 blur-2xl opacity-60" />
            <div className="relative p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 shadow-md">
                  <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                </div>
                <h4 className="text-sm sm:text-base font-bold text-gray-900">Para el Objetivo</h4>
              </div>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                  <span className="text-xs sm:text-sm text-gray-600">Automotoras necesarias:</span>
                  <span className="text-sm sm:text-base font-semibold text-gray-900">{automorasNecesarias}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                  <span className="text-xs sm:text-sm text-gray-600">Automotoras adicionales:</span>
                  <span className="text-sm sm:text-base font-semibold text-gray-900">{automorasAdicionales}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                  <span className="text-xs sm:text-sm text-gray-600">Objetivo mensual:</span>
                  <span className="text-sm sm:text-base font-bold text-emerald-600">${formatearNumero(params.objetivoMensual)}</span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-xs sm:text-sm text-gray-600">Mes del objetivo:</span>
                  <span className="text-sm sm:text-base font-bold text-amber-600">
                    {mesObjetivo ? mesObjetivo.mes : '24+ meses'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Projection Table */}
        <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-white border border-gray-100 shadow-lg">
          <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-violet-50 blur-3xl opacity-60" />

          <div className="relative p-4 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Proyección Mensual (60 meses)</h3>
                <p className="text-[10px] sm:text-xs text-gray-500">Basada en los parámetros configurados</p>
              </div>
            </div>

            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="min-w-[600px] px-4 sm:px-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-100">
                      <TableHead className="text-xs text-gray-600">Mes</TableHead>
                      <TableHead className="text-xs text-gray-600">Nuevas</TableHead>
                      <TableHead className="text-xs text-gray-600">MRR Total</TableHead>
                      <TableHead className="text-xs text-gray-600">% Objetivo</TableHead>
                      <TableHead className="text-xs text-gray-600">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proyeccion.map((mes, index) => (
                      <TableRow
                        key={index}
                        className={`border-gray-50 ${
                          mes.ingresosMensuales >= params.objetivoMensual
                            ? 'bg-emerald-50/50'
                            : mes.porcentajeObjetivo >= 80
                            ? 'bg-amber-50/50'
                            : ''
                        }`}
                      >
                        <TableCell className="text-xs sm:text-sm font-medium text-gray-900">{mes.mes}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] sm:text-xs border-gray-200 text-gray-600">
                            {mes.automotoras.toLocaleString()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {mes.ingresosMensuales >= params.objetivoMensual ? (
                            <Badge className="text-[10px] sm:text-xs bg-emerald-500 hover:bg-emerald-600">
                              ${formatearNumero(mes.ingresosMensuales)}
                            </Badge>
                          ) : (
                            <span className="text-xs sm:text-sm font-medium text-gray-900">
                              ${formatearNumero(mes.ingresosMensuales)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-[10px] sm:text-xs ${
                              mes.porcentajeObjetivo >= 100
                                ? 'bg-emerald-500 hover:bg-emerald-600'
                                : mes.porcentajeObjetivo >= 80
                                ? 'bg-amber-500 hover:bg-amber-600'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {mes.porcentajeObjetivo.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm text-gray-600">
                          {mes.automorasAcumuladas.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-white border border-gray-100 shadow-lg">
          <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-amber-50 blur-3xl opacity-60" />
          <div className="absolute -left-16 -bottom-16 h-32 w-32 rounded-full bg-orange-50 blur-3xl opacity-60" />

          <div className="relative p-4 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25">
                <Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Insights y Estrategia</h3>
                <p className="text-[10px] sm:text-xs text-gray-500">Análisis de crecimiento y recomendaciones</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-3">
                <h4 className="text-sm sm:text-base font-semibold text-gray-900">Para alcanzar $100K mensuales:</h4>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                    <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                    <strong className="text-gray-900">{automorasNecesarias} automotoras</strong> en total
                  </li>
                  <li className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                    <strong className="text-gray-900">+{automorasAdicionales} automotoras</strong> adicionales
                  </li>
                  <li className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                    <span className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0" />
                    Mantener <strong className="text-gray-900">${params.valorPorAutomotora}/mes</strong> por automotora
                  </li>
                  <li className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                    <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                    {mesObjetivo ? (
                      <span>Objetivo alcanzado en <strong className="text-gray-900">{mesObjetivo.mes}</strong></span>
                    ) : (
                      <span className="text-amber-600">Aumentar reuniones o tasa de cierre</span>
                    )}
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm sm:text-base font-semibold text-gray-900">Estrategias de Crecimiento:</h4>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                    <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
                    Nuevas automotoras: <strong className="text-gray-900">{Math.round((params.reunionesMensuales * params.tasaCierre) / 100)} mensuales</strong>
                  </li>
                  <li className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                    <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
                    Tasa de cancelación: <strong className="text-gray-900">{params.tasaCancelacion}% mensual</strong>
                  </li>
                  <li className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                    <span className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0" />
                    Crecimiento neto inicial: <strong className="text-gray-900">{Math.round((params.reunionesMensuales * params.tasaCierre) / 100 - (params.automorasActuales * params.tasaCancelacion) / 100)} automotoras/mes</strong>
                  </li>
                  <li className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                    O aumentar precio a: <strong className="text-gray-900">${(params.objetivoMensual / params.automorasActuales).toFixed(0)} por automotora</strong>
                  </li>
                  <li className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                    <span className="w-2 h-2 rounded-full bg-pink-500 flex-shrink-0" />
                    Ingresos anuales objetivo: <strong className="text-gray-900">${formatearNumero(params.objetivoMensual * 12)}</strong>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
              <h5 className="text-sm font-semibold text-blue-800 mb-2">Estado Actual vs Objetivo:</h5>
              <p className="text-xs sm:text-sm text-blue-700">
                <strong>{params.automorasActuales} automotoras</strong> × <strong>${params.valorPorAutomotora} USD</strong> = <strong>${formatearNumero(progresoActual)} USD mensuales</strong>
              </p>
              <p className="text-xs sm:text-sm text-blue-700">
                <strong>{automorasNecesarias} automotoras</strong> × <strong>${params.valorPorAutomotora} USD</strong> = <strong>${formatearNumero(params.objetivoMensual)} USD mensuales</strong>
              </p>
              <p className="text-[10px] sm:text-xs text-blue-600 mt-2">
                Necesitas {automorasAdicionales} automotoras adicionales para alcanzar el objetivo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Projection;
