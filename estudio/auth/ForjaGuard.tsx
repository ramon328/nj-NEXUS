"use client";

import { useEffect, useState, type ReactNode } from "react";
import { forjaSupabase } from "./forjaAuth";

// Portal Forja: a dónde se redirige a iniciar sesión si no hay acceso válido.
const FORJA_URL = "https://forja-nicojuri.vercel.app";
// Clave donde se guarda el token de Forja para esta pestaña.
const FORJA_SESSION_KEY = "forja_session_token";

// En local (dev) se omite la verificación para poder trabajar sin login.
function esLocal(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0" || h === "[::1]";
}

async function validateToken(token: string): Promise<boolean> {
  try {
    const { data, error } = await forjaSupabase.auth.getUser(token);
    return Boolean(data?.user) && !error;
  } catch {
    return false;
  }
}

// Envuelve la app: solo deja pasar si se llega con un `forja_token` válido
// (desde el portal Forja) o con una sesión de Forja ya validada en esta pestaña.
// Si se entra directo a la URL sin sesión, redirige al portal Forja para loguear.
export function ForjaGuard({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"checking" | "allowed" | "denied">("checking");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (esLocal()) {
        setStatus("allowed");
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get("forja_token");

      if (urlToken) {
        const valid = await validateToken(urlToken);
        if (cancelled) return;
        if (valid) {
          sessionStorage.setItem(FORJA_SESSION_KEY, urlToken);
          params.delete("forja_token");
          const q = params.toString();
          const url = window.location.pathname + (q ? `?${q}` : "") + window.location.hash;
          window.history.replaceState(null, "", url);
          setStatus("allowed");
        } else {
          setStatus("denied");
          window.location.href = FORJA_URL;
        }
        return;
      }

      const stored = sessionStorage.getItem(FORJA_SESSION_KEY);
      if (stored) {
        const valid = await validateToken(stored);
        if (cancelled) return;
        if (valid) {
          setStatus("allowed");
        } else {
          sessionStorage.removeItem(FORJA_SESSION_KEY);
          setStatus("denied");
          window.location.href = FORJA_URL;
        }
        return;
      }

      if (!cancelled) {
        setStatus("denied");
        window.location.href = FORJA_URL;
      }
    }

    check().catch(() => {
      if (!cancelled) {
        setStatus("denied");
        window.location.href = FORJA_URL;
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "checking") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-transparent" />
          <p className="text-sm font-medium text-gray-500">Verificando acceso…</p>
        </div>
      </div>
    );
  }

  if (status === "denied") return null;

  return <>{children}</>;
}
