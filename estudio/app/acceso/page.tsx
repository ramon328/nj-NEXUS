"use client";

import { useState } from "react";

// Página del portón de acceso: pide la contraseña (APP_PASSWORD) y, si es
// correcta, /api/auth/login deja la cookie de sesión y volvemos al inicio.
export default function PaginaAcceso() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function manejarEnvio(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!password || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        // Recarga completa para que la cookie aplique en toda la app.
        window.location.href = "/";
        return;
      }
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(data?.error ?? "Contraseña incorrecta");
      setEnviando(false);
    } catch {
      setError("No se pudo conectar con el servidor. Intenta de nuevo.");
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-borde bg-surface p-8 shadow-2xl shadow-acento/10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-acento to-acento-2 text-2xl">
            🎬
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            Estudio de Contenido
          </h1>
          <p className="mt-1.5 text-sm text-tenue">
            Ingresa la contraseña para entrar al estudio.
          </p>
        </div>

        <form onSubmit={manejarEnvio} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-tenue">
              Contraseña
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-lg border border-borde bg-surface-2 px-3 py-2.5 text-sm text-foreground placeholder:text-tenue focus:border-acento focus:outline-none focus:ring-1 focus:ring-acento"
            />
          </label>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando || !password}
            className="w-full rounded-lg bg-gradient-to-r from-acento to-acento-2 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
