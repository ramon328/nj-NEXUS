"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronRight,
  FileStack,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { api, type Empresa, type TipoDocumento } from "@/lib/api";
import { AddEmpresaDialog } from "@/components/add-empresa-dialog";
import { EmpresaDetail } from "@/components/empresa-detail";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function EstadoBadge({ estado }: { estado: Empresa["estado"] }) {
  if (estado === "conectada")
    return (
      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
        <CheckCircle2 className="size-3" /> Conectada
      </Badge>
    );
  if (estado === "error")
    return (
      <Badge variant="destructive">
        <AlertCircle className="size-3" /> Error
      </Badge>
    );
  return <Badge variant="secondary">Sin probar</Badge>;
}

export default function Home() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [tipos, setTipos] = useState<TipoDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selId, setSelId] = useState<number | null>(null);

  async function cargar() {
    try {
      const [es, ts] = await Promise.all([
        api.listarEmpresas(),
        api.tiposDocumento(),
      ]);
      setEmpresas(es);
      setTipos(ts);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  function actualizarEmpresa(e: Empresa) {
    setEmpresas((prev) => prev.map((x) => (x.id === e.id ? e : x)));
  }

  async function borrar(id: number) {
    try {
      await api.eliminarEmpresa(id);
      setEmpresas((prev) => prev.filter((x) => x.id !== id));
      toast.success("Empresa eliminada.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const seleccionada = empresas.find((e) => e.id === selId) ?? null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Marca */}
      <header className="mb-8 flex items-center gap-3">
        <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
          <FileStack className="size-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold leading-none">SII Extractor</h1>
          <p className="text-muted-foreground text-sm">
            Conecta tus empresas al SII y descarga sus documentos.
          </p>
        </div>
      </header>

      {error && (
        <Card className="border-destructive/40 mb-6">
          <CardContent className="flex items-center gap-3 py-4 text-sm">
            <AlertCircle className="text-destructive size-5" />
            <div>
              No se pudo conectar con la API local ({error}).{" "}
              <span className="text-muted-foreground">
                Asegúrate de tener el backend corriendo en el puerto 8000.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {seleccionada ? (
        <EmpresaDetail
          empresa={seleccionada}
          tipos={tipos}
          onBack={() => {
            setSelId(null);
            cargar();
          }}
          onEstadoChange={actualizarEmpresa}
          onDelete={(id) => {
            setEmpresas((prev) => prev.filter((x) => x.id !== id));
            setSelId(null);
          }}
        />
      ) : (
        <>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">
              Tus empresas
            </h2>
            <AddEmpresaDialog
              onCreated={(e) => setEmpresas((prev) => [e, ...prev])}
            />
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-36 rounded-xl" />
              ))}
            </div>
          ) : empresas.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                <div className="bg-muted flex size-12 items-center justify-center rounded-full">
                  <Building2 className="text-muted-foreground size-6" />
                </div>
                <div>
                  <p className="font-medium">Todavía no tienes empresas</p>
                  <p className="text-muted-foreground text-sm">
                    Agrega tu primera empresa para conectarla al SII.
                  </p>
                </div>
                <AddEmpresaDialog
                  onCreated={(e) => setEmpresas((prev) => [e, ...prev])}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {empresas.map((e) => (
                <Card
                  key={e.id}
                  className="group hover:border-primary/50 cursor-pointer transition-colors"
                  onClick={() => setSelId(e.id)}
                >
                  <CardHeader className="flex-row items-start justify-between space-y-0">
                    <div className="flex items-center gap-2.5">
                      <div className="bg-muted flex size-9 items-center justify-center rounded-md">
                        <Building2 className="size-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base leading-tight">
                          {e.nombre}
                        </CardTitle>
                        <p className="text-muted-foreground font-mono text-xs">
                          {e.rut}
                        </p>
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                            onClick={(ev) => ev.stopPropagation()}
                          />
                        }
                      >
                        <Trash2 className="size-4" />
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(ev) => ev.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            ¿Eliminar {e.nombre}?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Se borrará la empresa y su sesión guardada. Los
                            archivos ya descargados en tu equipo se mantienen.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => borrar(e.id)}
                            className="bg-destructive hover:bg-destructive/90 text-white"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <EstadoBadge estado={e.estado} />
                    <ChevronRight className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
