"use client";

import { CalendarDays } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// No se puede descargar el futuro: el tope es el mes actual.
const HOY = new Date();
const ANIO_ACTUAL = HOY.getFullYear();
const MES_ACTUAL = HOY.getMonth() + 1; // 1–12
const ANIOS = Array.from({ length: 9 }, (_, i) => ANIO_ACTUAL - i);

export function PeriodoPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string; // YYYYMM
  onChange: (v: string) => void;
}) {
  const anio = value.slice(0, 4);
  const mes = value.slice(4, 6);
  const esAnioActual = Number(anio) === ANIO_ACTUAL;

  return (
    <div className="space-y-1.5">
      <Label className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
        <CalendarDays className="size-3.5" />
        {label}
      </Label>
      <div className="bg-background focus-within:border-ring focus-within:ring-ring/40 flex items-stretch overflow-hidden rounded-lg border shadow-xs transition-colors focus-within:ring-[3px]">
        <Select value={mes} onValueChange={(m) => onChange(`${anio}${m}`)}>
          <SelectTrigger className="flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0">
            <SelectValue placeholder="Mes" />
          </SelectTrigger>
          <SelectContent>
            {MESES.map((nombre, i) => {
              const m = String(i + 1).padStart(2, "0");
              const futuro = esAnioActual && i + 1 > MES_ACTUAL;
              return (
                <SelectItem key={m} value={m} disabled={futuro}>
                  {nombre}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <div className="bg-border my-2 w-px" />
        <Select
          value={anio}
          onValueChange={(a) => {
            const mNum = Number(mes);
            const m =
              Number(a) === ANIO_ACTUAL && mNum > MES_ACTUAL
                ? String(MES_ACTUAL).padStart(2, "0")
                : mes;
            onChange(`${a}${m}`);
          }}
        >
          <SelectTrigger className="text-muted-foreground w-[5.5rem] rounded-none border-0 bg-transparent font-mono shadow-none focus-visible:ring-0">
            <SelectValue placeholder="Año" />
          </SelectTrigger>
          <SelectContent>
            {ANIOS.map((a) => (
              <SelectItem key={a} value={String(a)}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
