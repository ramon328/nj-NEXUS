"use client";

import { useCallback, useEffect, useState } from "react";
import type { ResumenInstagram } from "@/lib/ajustes";
import Spinner from "@/components/Spinner";
import { mensajeDeError } from "@/components/formato";

// ---------------------------------------------------------------------------
// Apartado "Ajustes": integraciones de la app. Hoy: vincular la cuenta de
// Instagram de empresa/creador con un clic (OAuth "Instagram Login"). El token
// se guarda en la BD (tabla ajustes) para poder publicar reels y posts.
// ---------------------------------------------------------------------------

type Aviso = { tipo: "exito" | "error"; texto: string } | null;

// Lee el ?ajustes=... que deja el callback del OAuth y lo traduce a un aviso.
function avisoDesdeUrl(): Aviso {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const estado = params.get("ajustes");
  if (!estado) return null;
  if (estado === "ig_ok") {
    const usuario = params.get("usuario");
    return {
      tipo: "exito",
      texto: usuario
        ? `Cuenta de Instagram @${usuario} vinculada correctamente.`
        : "Cuenta de Instagram vinculada correctamente.",
    };
  }
  if (estado === "ig_no_config") {
    return {
      tipo: "error",
      texto:
        "Falta configurar la app de Meta (INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET) para el botón de vincular.",
    };
  }
  if (estado === "ig_error") {
    return {
      tipo: "error",
      texto: params.get("msg") || "No se pudo vincular la cuenta de Instagram.",
    };
  }
  return null;
}

// Etiqueta legible del tipo de cuenta que devuelve Instagram.
function etiquetaTipoCuenta(tipo: string | null): string | null {
  if (!tipo) return null;
  const mapa: Record<string, string> = {
    BUSINESS: "Empresa",
    MEDIA_CREATOR: "Creador",
    CREATOR: "Creador",
    PERSONAL: "Personal",
  };
  return mapa[tipo] ?? tipo;
}

export default function PanelAjustes() {
  const [resumen, setResumen] = useState<ResumenInstagram | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<Aviso>(null);

  const [probando, setProbando] = useState(false);
  const [desvinculando, setDesvinculando] = useState(false);

  // Vinculación manual (pegar token).
  const [mostrarManual, setMostrarManual] = useState(false);
  const [token, setToken] = useState("");
  const [guardandoManual, setGuardandoManual] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch("/api/ajustes");
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "No se pudieron cargar los ajustes");
      }
      setResumen(data?.instagram as ResumenInstagram);
      if (data?.aviso) setAviso({ tipo: "error", texto: data.aviso });
      setError(null);
    } catch (e) {
      setError(mensajeDeError(e, "Error inesperado al cargar los ajustes"));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial
    void cargar();
    // Leer el resultado del OAuth de la URL y limpiarla para no repetir el aviso.
    const a = avisoDesdeUrl();
    if (a) {
      setAviso(a);
      const limpia = new URL(window.location.href);
      limpia.searchParams.delete("ajustes");
      limpia.searchParams.delete("usuario");
      limpia.searchParams.delete("msg");
      limpia.searchParams.delete("tab");
      window.history.replaceState({}, "", limpia.toString());
    }
  }, [cargar]);

  // Botón principal: arranca el OAuth (navegación completa, no fetch).
  const vincular = useCallback(() => {
    window.location.href = "/api/ajustes/instagram/conectar";
  }, []);

  const probar = useCallback(async () => {
    setProbando(true);
    setAviso(null);
    try {
      const res = await fetch("/api/ajustes/instagram/probar");
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "La prueba falló");
      setAviso({
        tipo: "exito",
        texto: `Conexión OK · @${data?.instagram?.username ?? "cuenta"} responde.`,
      });
      await cargar();
    } catch (e) {
      setAviso({ tipo: "error", texto: mensajeDeError(e, "La prueba de conexión falló") });
    } finally {
      setProbando(false);
    }
  }, [cargar]);

  const desvincular = useCallback(async () => {
    if (!window.confirm("¿Desvincular la cuenta de Instagram?")) return;
    setDesvinculando(true);
    setAviso(null);
    try {
      const res = await fetch("/api/ajustes/instagram", { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo desvincular");
      setAviso({ tipo: "exito", texto: "Cuenta de Instagram desvinculada." });
      await cargar();
    } catch (e) {
      setAviso({ tipo: "error", texto: mensajeDeError(e, "No se pudo desvincular la cuenta") });
    } finally {
      setDesvinculando(false);
    }
  }, [cargar]);

  const guardarManual = useCallback(async () => {
    if (!token.trim() || guardandoManual) return;
    setGuardandoManual(true);
    setAviso(null);
    try {
      const res = await fetch("/api/ajustes/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: token.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo guardar el token");
      setAviso({
        tipo: "exito",
        texto: `Cuenta @${data?.instagram?.username ?? "cuenta"} vinculada.`,
      });
      setToken("");
      setMostrarManual(false);
      await cargar();
    } catch (e) {
      setAviso({ tipo: "error", texto: mensajeDeError(e, "No se pudo guardar el token") });
    } finally {
      setGuardandoManual(false);
    }
  }, [token, guardandoManual, cargar]);

  const conectado = resumen?.conectado ?? false;
  const configurado = resumen?.configurado ?? false;

  const claseBoton =
    "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Ajustes</h2>
        <p className="mt-1 text-sm text-tenue">
          Conecta tus cuentas para publicar directamente desde el estudio.
        </p>
      </div>

      {aviso && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            aviso.tipo === "exito"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/40 bg-red-500/10 text-red-300"
          }`}
        >
          {aviso.texto}
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void cargar()}
            className="shrink-0 rounded-lg border border-red-500/40 px-3 py-1 text-xs font-medium transition-colors hover:bg-red-500/20"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Tarjeta de Instagram */}
      <section className="overflow-hidden rounded-3xl border border-borde bg-surface/70 shadow-xl shadow-black/20">
        <div className="flex items-center gap-3 border-b border-borde bg-surface-2/40 px-6 py-4">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-lg shadow-lg"
          >
            📷
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground">Instagram</h3>
            <p className="text-xs text-tenue">
              Cuenta de empresa o creador para publicar reels y posts.
            </p>
          </div>
          {conectado && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
              ● Conectado
            </span>
          )}
        </div>

        <div className="px-6 py-5">
          {cargando ? (
            <div className="flex items-center gap-2 text-sm text-tenue">
              <Spinner className="h-4 w-4" /> Cargando…
            </div>
          ) : conectado ? (
            /* ------- Estado: conectado ------- */
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-lg font-bold text-white">
                  {resumen?.username?.[0]?.toUpperCase() ?? "@"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    @{resumen?.username}
                  </p>
                  <p className="text-xs text-tenue">
                    {etiquetaTipoCuenta(resumen?.account_type ?? null) ?? "Cuenta"}
                    {resumen?.origen === "manual" ? " · token manual" : ""}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void probar()}
                  disabled={probando}
                  className={`${claseBoton} border border-borde text-tenue hover:border-acento/50 hover:bg-surface-2 hover:text-foreground`}
                >
                  {probando ? <Spinner className="h-4 w-4" /> : <span aria-hidden="true">🔌</span>}
                  {probando ? "Probando…" : "Probar conexión"}
                </button>
                <button
                  type="button"
                  onClick={() => void desvincular()}
                  disabled={desvinculando}
                  className={`${claseBoton} border border-borde text-tenue hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300`}
                >
                  {desvinculando ? <Spinner className="h-4 w-4" /> : <span aria-hidden="true">🔓</span>}
                  {desvinculando ? "Desvinculando…" : "Desvincular"}
                </button>
              </div>
            </div>
          ) : (
            /* ------- Estado: no conectado ------- */
            <div className="flex flex-col gap-4">
              <p className="text-sm text-tenue">
                Vincula tu cuenta de Instagram para publicar los reels y posts que
                creas aquí, sin salir del estudio.
              </p>

              {configurado ? (
                <button
                  type="button"
                  onClick={vincular}
                  className={`${claseBoton} w-fit bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white hover:opacity-90`}
                >
                  <span aria-hidden="true">📷</span> Vincular cuenta de Instagram
                </button>
              ) : (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  <p className="font-medium">Falta un paso de configuración</p>
                  <p className="mt-1 text-amber-200/80">
                    Para el botón de un clic necesitas una app de Meta (gratis):
                    crea una app en{" "}
                    <span className="font-mono text-xs">developers.facebook.com</span>,
                    agrega el producto <b>Instagram</b> → <b>business login</b>, y
                    pon el <b>Instagram App ID</b> y <b>App Secret</b> en las
                    variables{" "}
                    <span className="font-mono text-xs">INSTAGRAM_APP_ID</span> y{" "}
                    <span className="font-mono text-xs">INSTAGRAM_APP_SECRET</span>.
                    También agrega esta URL de callback en “Valid OAuth Redirect
                    URIs”:{" "}
                    <span className="font-mono text-[11px] break-all">
                      https://nj-marcketing.vercel.app/api/ajustes/instagram/callback
                    </span>
                    .
                  </p>
                </div>
              )}

              {/* Alternativa: pegar un token a mano */}
              <div className="rounded-xl border border-borde bg-background/40 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setMostrarManual((v) => !v)}
                  className="flex w-full items-center justify-between text-left text-sm font-medium text-tenue hover:text-foreground"
                >
                  <span>¿Ya tienes un access token? Vincular a mano</span>
                  <span aria-hidden="true">{mostrarManual ? "▲" : "▼"}</span>
                </button>
                {mostrarManual && (
                  <div className="mt-3 flex flex-col gap-2">
                    <input
                      type="text"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="Pega aquí el access token de larga duración"
                      disabled={guardandoManual}
                      className="w-full rounded-xl border border-borde bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-tenue/60 focus:border-acento focus:outline-none focus:ring-1 focus:ring-acento"
                    />
                    <button
                      type="button"
                      onClick={() => void guardarManual()}
                      disabled={!token.trim() || guardandoManual}
                      className={`${claseBoton} w-fit bg-gradient-to-r from-acento to-acento-2 text-white hover:opacity-90`}
                    >
                      {guardandoManual ? <Spinner className="h-4 w-4" /> : <span aria-hidden="true">🔗</span>}
                      {guardandoManual ? "Verificando…" : "Vincular con token"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
