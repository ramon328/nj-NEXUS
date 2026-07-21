"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Clock,
  ListChecks,
  Loader2,
  Plug,
  RefreshCw,
  Trash2,
  Unplug,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  api,
  type Documento,
  type Empresa,
  type EstadoSesion,
  type Job,
  type TipoDocumento,
} from "@/lib/api";
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
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PeriodoPicker } from "@/components/periodo-picker";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const TERMINAL = ["completado", "error"];

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
        <AlertCircle className="size-3" /> Error de conexión
      </Badge>
    );
  return <Badge variant="secondary">Sin probar</Badge>;
}

function fmtReloj(seg: number): string {
  const t = Math.max(0, seg);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Contador en vivo del token de sesión: cuenta hacia atrás cada segundo,
 *  anclado a los segundos que reporta el backend (se re-sincroniza al refrescar). */
function SesionBadge({ s }: { s: EstadoSesion | null }) {
  const [restante, setRestante] = useState(0);

  useEffect(() => {
    if (!s || !s.vigente) {
      setRestante(0);
      return;
    }
    const deadline = Date.now() + s.segundos_restantes * 1000;
    const tick = () =>
      setRestante(Math.max(0, Math.round((deadline - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [s]);

  if (!s) return null;
  if (!s.tiene_sesion)
    return (
      <Badge variant="secondary" title={s.mensaje}>
        <Clock className="size-3" /> Sin sesión
      </Badge>
    );
  if (!s.vigente)
    return (
      <Badge variant="destructive" title={s.mensaje}>
        <Clock className="size-3" /> Sesión expirada — reconectar
      </Badge>
    );
  const porVencer = restante <= 15 * 60;
  return (
    <Badge
      className={`font-mono tabular-nums ${
        porVencer
          ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
          : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
      }`}
      title={`Tiempo de sesión del SII. Vence a las ${s.expira_hora}; después se reconecta sola al descargar.`}
    >
      <Clock className="size-3" />
      Sesión {fmtReloj(restante)}
    </Badge>
  );
}

export function EmpresaDetail({
  empresa,
  tipos,
  onBack,
  onEstadoChange,
  onDelete,
}: {
  empresa: Empresa;
  tipos: TipoDocumento[];
  onBack: () => void;
  onEstadoChange: (e: Empresa) => void;
  onDelete: (id: number) => void;
}) {
  const [testing, setTesting] = useState(false);
  const [desconectando, setDesconectando] = useState(false);
  const [sesion, setSesion] = useState<EstadoSesion | null>(null);
  const [seleccion, setSeleccion] = useState<Set<string>>(
    new Set(["rcv_compra", "rcv_venta"]),
  );
  // "Desde" por defecto = mes pasado; "Hasta" = mes actual.
  const [desde, setDesde] = useState(() => {
    const n = new Date();
    n.setDate(1);
    n.setMonth(n.getMonth() - 1);
    return `${n.getFullYear()}${String(n.getMonth() + 1).padStart(2, "0")}`;
  });
  const [hasta, setHasta] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}${String(n.getMonth() + 1).padStart(2, "0")}`;
  });
  // Datos del destinatario para la carpeta tributaria OFICIAL.
  const [destRut, setDestRut] = useState("");
  const [destNombre, setDestNombre] = useState("");
  const [email, setEmail] = useState("");
  const [institucion, setInstitucion] = useState("USO INTERNO");
  const [job, setJob] = useState<Job | null>(null);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [preview, setPreview] = useState<Documento | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [modoSeleccion, setModoSeleccion] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const descargando =
    job !== null && !TERMINAL.includes(job.estado);

  // ¿Hay algún documento seleccionado que exija datos del destinatario?
  const requiereDest = tipos.some(
    (t) => t.requiere_destinatario && seleccion.has(t.id),
  );

  const cargarDocumentos = useCallback(async () => {
    try {
      setDocumentos(await api.listarDocumentos(empresa.id));
    } catch {
      /* sin documentos aún */
    }
  }, [empresa.id]);

  const cargarSesion = useCallback(async () => {
    try {
      setSesion(await api.estadoSesion(empresa.id));
    } catch {
      /* backend no disponible */
    }
  }, [empresa.id]);

  useEffect(() => {
    cargarDocumentos();
  }, [cargarDocumentos]);

  // Estado de la sesión SII: carga al entrar y se refresca cada 30s.
  useEffect(() => {
    cargarSesion();
    const i = setInterval(cargarSesion, 30000);
    return () => clearInterval(i);
  }, [cargarSesion]);

  // Limpia de la selección las rutas que ya no existen (tras borrar/refrescar).
  useEffect(() => {
    setSel((prev) => {
      const rutas = new Set(documentos.map((d) => d.ruta));
      const next = new Set([...prev].filter((r) => rutas.has(r)));
      return next.size === prev.size ? prev : next;
    });
  }, [documentos]);

  // Vista previa robusta: descarga el archivo como blob (same-origin) para que
  // el navegador lo muestre en el visor en vez de descargarlo.
  useEffect(() => {
    if (!preview) {
      setPreviewUrl(null);
      return;
    }
    let url: string | null = null;
    let cancelado = false;
    setPreviewUrl(null);
    fetch(api.urlArchivo(empresa.id, preview.ruta, true))
      .then((r) => r.blob())
      .then((blob) => {
        if (cancelado) return;
        url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      })
      .catch(() => toast.error("No se pudo cargar la vista previa."));
    return () => {
      cancelado = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [preview, empresa.id]);

  async function eliminarArchivo(d: Documento) {
    try {
      await api.eliminarArchivo(empresa.id, d.ruta);
      setDocumentos((prev) => prev.filter((x) => x.ruta !== d.ruta));
      toast.success("Documento eliminado.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  // Descarga directa a la carpeta de Descargas (fallback universal).
  function descargaSimple(blob: Blob, nombre: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Guardar UN archivo eligiendo carpeta (showSaveFilePicker) o, si no está
  // disponible, cae a la carpeta de Descargas.
  async function guardarComo(d: Documento) {
    try {
      const blob = await (
        await fetch(api.urlArchivo(empresa.id, d.ruta))
      ).blob();
      const picker = (
        window as Window & {
          showSaveFilePicker?: (o?: {
            suggestedName?: string;
          }) => Promise<FileSystemFileHandle>;
        }
      ).showSaveFilePicker;
      if (picker) {
        const handle = await picker({ suggestedName: d.nombre });
        const ws = await handle.createWritable();
        await ws.write(blob);
        await ws.close();
        toast.success("Guardado en la carpeta elegida.");
      } else {
        descargaSimple(blob, d.nombre);
        toast.info("Tu navegador no permite elegir carpeta; se guardó en Descargas.");
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return; // el usuario canceló
      toast.error((e as Error).message);
    }
  }

  // Guarda una lista de documentos en una carpeta elegida (recrea subcarpetas).
  async function guardarEnCarpeta(docs: Documento[]) {
    if (docs.length === 0) return;
    const pick = (
      window as Window & {
        showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
      }
    ).showDirectoryPicker;
    if (!pick) {
      toast.info("Tu navegador no permite elegir carpeta; se descargará a Descargas.");
      for (const d of docs) {
        const blob = await (await fetch(api.urlArchivo(empresa.id, d.ruta))).blob();
        descargaSimple(blob, d.nombre);
      }
      return;
    }
    try {
      const dir = await pick();
      let n = 0;
      for (const d of docs) {
        const blob = await (await fetch(api.urlArchivo(empresa.id, d.ruta))).blob();
        const partes = d.ruta.split("/");
        let carpeta = dir;
        for (const p of partes.slice(0, -1)) {
          carpeta = await carpeta.getDirectoryHandle(p, { create: true });
        }
        const fh = await carpeta.getFileHandle(partes[partes.length - 1], {
          create: true,
        });
        const ws = await fh.createWritable();
        await ws.write(blob);
        await ws.close();
        n++;
      }
      toast.success(`${n} documento${n === 1 ? "" : "s"} guardado${n === 1 ? "" : "s"} en la carpeta elegida.`);
    } catch (e) {
      if ((e as Error).name === "AbortError") return; // el usuario canceló
      toast.error((e as Error).message);
    }
  }

  const descargarTodo = () => guardarEnCarpeta(documentos);

  // ── Selección de documentos ──────────────────────────────────────────
  const docsSeleccionados = documentos.filter((d) => sel.has(d.ruta));
  const todosSeleccionados = documentos.length > 0 && sel.size === documentos.length;

  function toggleSel(ruta: string) {
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(ruta)) next.delete(ruta);
      else next.add(ruta);
      return next;
    });
  }

  function toggleTodos() {
    setSel(todosSeleccionados ? new Set() : new Set(documentos.map((d) => d.ruta)));
  }

  async function eliminarSeleccionados() {
    const rutas = [...sel];
    let n = 0;
    for (const ruta of rutas) {
      try {
        await api.eliminarArchivo(empresa.id, ruta);
        n++;
      } catch {
        /* sigue con el resto */
      }
    }
    setDocumentos((prev) => prev.filter((x) => !sel.has(x.ruta)));
    setSel(new Set());
    toast.success(`${n} documento${n === 1 ? "" : "s"} eliminado${n === 1 ? "" : "s"}.`);
  }

  // Polling del job activo.
  useEffect(() => {
    if (!job || TERMINAL.includes(job.estado)) return;
    pollRef.current = setInterval(async () => {
      try {
        const actualizado = await api.estadoJob(job.id);
        setJob(actualizado);
        if (TERMINAL.includes(actualizado.estado)) {
          if (pollRef.current) clearInterval(pollRef.current);
          cargarDocumentos();
          cargarSesion();
          if (actualizado.estado === "completado") {
            toast.success("Descarga finalizada.");
            onEstadoChange({ ...empresa, estado: "conectada" });
          } else {
            toast.error(actualizado.error ?? "La descarga falló.");
          }
        }
      } catch {
        /* reintenta en el próximo tick */
      }
    }, 1500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [job, cargarDocumentos, cargarSesion, empresa, onEstadoChange]);

  function toggle(id: string) {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function probar() {
    setTesting(true);
    try {
      const r = await api.testConexion(empresa.id);
      if (r.ok) {
        toast.success(r.mensaje);
        onEstadoChange({ ...empresa, estado: "conectada" });
      } else {
        toast.error(r.mensaje);
        onEstadoChange({ ...empresa, estado: "error" });
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setTesting(false);
      cargarSesion();
    }
  }

  async function desconectar() {
    setDesconectando(true);
    try {
      const r = await api.desconectar(empresa.id);
      toast.success(r.mensaje);
      onEstadoChange({ ...empresa, estado: "sin_probar" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDesconectando(false);
      cargarSesion();
    }
  }

  async function eliminar() {
    try {
      await api.eliminarEmpresa(empresa.id);
      toast.success("Empresa eliminada.");
      onDelete(empresa.id);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function descargar() {
    if (seleccion.size === 0) {
      toast.error("Selecciona al menos un tipo de documento.");
      return;
    }
    if (desde > hasta) {
      toast.error("El periodo inicial no puede ser mayor que el final.");
      return;
    }
    const ahora = new Date();
    const periodoActual = `${ahora.getFullYear()}${String(
      ahora.getMonth() + 1,
    ).padStart(2, "0")}`;
    if (hasta > periodoActual) {
      toast.error(
        `No se pueden descargar meses futuros. El último periodo disponible es ${periodoActual.slice(4)}/${periodoActual.slice(0, 4)}.`,
      );
      return;
    }
    if (requiereDest && (!destRut.trim() || !email.trim())) {
      toast.error(
        "La carpeta oficial requiere RUT del destinatario y correo.",
      );
      return;
    }
    try {
      const { job_id } = await api.iniciarDescarga(empresa.id, {
        desde,
        hasta,
        docs: [...seleccion],
        ...(requiereDest && {
          dest_rut: destRut.trim(),
          dest_nombre: destNombre.trim(),
          email: email.trim(),
          institucion: institucion.trim() || "USO INTERNO",
        }),
      });
      const inicial = await api.estadoJob(job_id);
      setJob(inicial);
      toast.info("Descarga iniciada — esto puede tardar (pausas anti-bloqueo del SII).");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const pct = job && job.total > 0
    ? Math.round((job.completados / job.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {empresa.nombre}
          </h1>
          <p className="text-muted-foreground font-mono text-sm">{empresa.rut}</p>
        </div>
        <EstadoBadge estado={empresa.estado} />
        <SesionBadge s={sesion} />
        <Button variant="outline" onClick={probar} disabled={testing}>
          {testing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plug className="size-4" />
          )}
          Probar conexión
        </Button>
        <Button
          variant="outline"
          onClick={desconectar}
          disabled={desconectando}
          title="Cierra la sesión guardada (sin borrar la empresa)"
        >
          {desconectando ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Unplug className="size-4" />
          )}
          Desconectar
        </Button>
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
              />
            }
          >
            <Trash2 className="size-4" />
            Eliminar
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar {empresa.nombre}?</AlertDialogTitle>
              <AlertDialogDescription>
                Se borrará la empresa y su sesión guardada. Los archivos ya
                descargados en tu equipo se mantienen.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={eliminar}
                className="bg-destructive hover:bg-destructive/90 text-white"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Configuración de descarga */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Descargar documentos</CardTitle>
            <CardDescription>
              Elige qué documentos y el rango de periodos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">
                {seleccion.size} de {tipos.length} seleccionados
              </span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setSeleccion(new Set(tipos.map((t) => t.id)))}
                >
                  Todos
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setSeleccion(new Set())}
                >
                  Ninguno
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              {tipos.map((t) => (
                <label
                  key={t.id}
                  className="hover:bg-accent/50 flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors"
                >
                  <Checkbox
                    checked={seleccion.has(t.id)}
                    onCheckedChange={() => toggle(t.id)}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{t.nombre}</span>
                      {!t.estable && (
                        <Badge variant="outline" className="text-[10px]">
                          experimental
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {t.descripcion}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            <Separator />

            <div className="space-y-3">
              <p className="text-sm font-medium">Periodo a descargar</p>
              <div className="grid grid-cols-2 gap-3">
                <PeriodoPicker label="Desde" value={desde} onChange={setDesde} />
                <PeriodoPicker label="Hasta" value={hasta} onChange={setHasta} />
              </div>
            </div>

            {requiereDest && (
              <div className="border-amber-500/30 bg-amber-500/5 space-y-3 rounded-md border p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="text-amber-500 mt-0.5 size-4 shrink-0" />
                  <p className="text-muted-foreground text-xs">
                    La carpeta <strong>oficial</strong> del SII se genera para un{" "}
                    <strong>destinatario con RUT distinto al de la empresa</strong>{" "}
                    y el SII <strong>envía un aviso al correo</strong> indicado.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="dest-rut">RUT destinatario</Label>
                    <Input
                      id="dest-rut"
                      placeholder="12.345.678-9"
                      value={destRut}
                      onChange={(e) => setDestRut(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dest-nombre">Nombre (opcional)</Label>
                    <Input
                      id="dest-nombre"
                      placeholder="Se autocompleta del SII"
                      value={destNombre}
                      onChange={(e) => setDestNombre(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dest-email">Correo (aviso)</Label>
                    <Input
                      id="dest-email"
                      type="email"
                      placeholder="correo@ejemplo.cl"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dest-inst">Institución</Label>
                    <Input
                      id="dest-inst"
                      value={institucion}
                      onChange={(e) => setInstitucion(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            <Button
              className="w-full"
              onClick={descargar}
              disabled={descargando}
            >
              {descargando ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              {descargando ? "Descargando…" : "Iniciar descarga"}
            </Button>

            {job && (
              <div className="space-y-3 rounded-md border p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="capitalize">{job.estado}</span>
                  <span className="text-muted-foreground font-mono">
                    {job.completados}/{job.total}
                  </span>
                </div>
                <Progress value={pct} />
                <ScrollArea className="h-32">
                  <div className="space-y-1 pr-3">
                    {[...job.log].reverse().map((l, i) => (
                      <p
                        key={i}
                        className="text-muted-foreground font-mono text-xs"
                      >
                        {l.msg}
                      </p>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documentos descargados */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Documentos descargados</CardTitle>
              <CardDescription>
                {sel.size > 0
                  ? `${sel.size} seleccionado${sel.size === 1 ? "" : "s"} de ${documentos.length}`
                  : `${documentos.length} archivo${documentos.length === 1 ? "" : "s"} en tu equipo.`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-1">
              {modoSeleccion ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={sel.size === 0}
                    onClick={() => guardarEnCarpeta(docsSeleccionados)}
                  >
                    <Download className="size-4" />
                    Descargar ({sel.size})
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={sel.size === 0}
                          className="text-destructive hover:text-destructive"
                        />
                      }
                    >
                      <Trash2 className="size-4" />
                      Eliminar ({sel.size})
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          ¿Eliminar {sel.size} documento{sel.size === 1 ? "" : "s"}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Se borrarán de tu equipo. Puedes volver a descargarlos
                          desde el SII cuando quieras.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={eliminarSeleccionados}
                          className="bg-destructive hover:bg-destructive/90 text-white"
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setModoSeleccion(false);
                      setSel(new Set());
                    }}
                  >
                    <X className="size-4" />
                    Cancelar
                  </Button>
                </>
              ) : (
                documentos.length > 0 && (
                  <>
                    <Button variant="outline" size="sm" onClick={descargarTodo}>
                      <Download className="size-4" />
                      Descargar todo
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setModoSeleccion(true)}
                    >
                      <ListChecks className="size-4" />
                      Seleccionar
                    </Button>
                  </>
                )
              )}
              <Button variant="ghost" size="icon" onClick={cargarDocumentos}>
                <RefreshCw className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {documentos.length === 0 ? (
              <div className="text-muted-foreground flex flex-col items-center gap-2 py-16 text-center text-sm">
                <FileText className="size-8 opacity-40" />
                Aún no hay documentos. Inicia una descarga para empezar.
              </div>
            ) : (
              <ScrollArea className="h-[28rem]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {modoSeleccion && (
                        <TableHead className="w-8">
                          <Checkbox
                            checked={todosSeleccionados}
                            onCheckedChange={toggleTodos}
                            aria-label="Seleccionar todos"
                          />
                        </TableHead>
                      )}
                      <TableHead>Archivo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Grupo</TableHead>
                      <TableHead>Periodo</TableHead>
                      <TableHead className="text-right">Tamaño</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documentos.map((d) => (
                      <TableRow
                        key={d.ruta}
                        data-state={
                          modoSeleccion && sel.has(d.ruta) ? "selected" : undefined
                        }
                      >
                        {modoSeleccion && (
                          <TableCell>
                            <Checkbox
                              checked={sel.has(d.ruta)}
                              onCheckedChange={() => toggleSel(d.ruta)}
                              aria-label={`Seleccionar ${d.nombre}`}
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <button
                            onClick={() => setPreview(d)}
                            className="hover:text-primary cursor-pointer font-mono text-xs hover:underline"
                          >
                            {d.nombre}
                          </button>
                        </TableCell>
                        <TableCell>
                          {d.tipo === "pdf" ? (
                            <Badge className="bg-primary/15 text-primary border-primary/30 uppercase">
                              PDF
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="uppercase">
                              {d.tipo}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {d.grupo}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {d.periodo ?? "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {formatBytes(d.size)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Vista previa"
                              onClick={() => setPreview(d)}
                            >
                              <Eye className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Descargar (elegir carpeta)"
                              onClick={() => guardarComo(d)}
                            >
                              <Download className="size-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Eliminar"
                                    className="text-muted-foreground hover:text-destructive"
                                  />
                                }
                              >
                                <Trash2 className="size-4" />
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    ¿Eliminar este documento?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Se borrará{" "}
                                    <span className="font-mono">{d.nombre}</span>{" "}
                                    de tu equipo. Puedes volver a descargarlo
                                    desde el SII cuando quieras.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>
                                    Cancelar
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => eliminarArchivo(d)}
                                    className="bg-destructive hover:bg-destructive/90 text-white"
                                  >
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Vista previa del documento */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="flex h-[85vh] max-w-5xl flex-col gap-3">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3 pr-8">
              <span className="truncate font-mono text-sm">
                {preview?.nombre}
              </span>
              {preview && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => guardarComo(preview)}
                >
                  <Download className="size-4" />
                  Descargar
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {preview && previewUrl ? (
            <iframe
              key={preview.ruta}
              src={previewUrl}
              className="bg-muted min-h-0 flex-1 rounded-md border"
              title={preview.nombre}
            />
          ) : (
            <div className="text-muted-foreground flex min-h-0 flex-1 items-center justify-center gap-2 rounded-md border text-sm">
              <Loader2 className="size-4 animate-spin" /> Cargando vista previa…
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
