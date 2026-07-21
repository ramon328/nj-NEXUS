import { NextResponse } from "next/server";
import { verificarAcceso } from "@/lib/auth";
import { leerConexionInstagram, type ResumenInstagram } from "@/lib/ajustes";
import { instagramConfigurado } from "@/lib/instagramAuth";

// GET /api/ajustes
// Devuelve un RESUMEN de los ajustes para la UI, SIN secretos (nunca el token).
// Hoy: estado de la conexión de Instagram.
export async function GET(request: Request) {
  // Defensa en profundidad: exige la cookie de sesión (además del proxy).
  if (!(await verificarAcceso(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    let conexion = null;
    try {
      conexion = await leerConexionInstagram();
    } catch (e) {
      // Si la tabla `ajustes` aún no existe, no rompemos la pantalla: lo tratamos
      // como "no conectado" y añadimos una pista.
      const msg = e instanceof Error ? e.message : String(e);
      if (/ajustes|does not exist|schema cache|could not find the table/i.test(msg)) {
        return NextResponse.json({
          instagram: {
            conectado: false,
            configurado: instagramConfigurado(),
            username: null,
            account_type: null,
            conectado_at: null,
            origen: null,
          } satisfies ResumenInstagram,
          aviso:
            "Falta la tabla 'ajustes': ejecuta supabase/schema.sql en el SQL Editor de Supabase.",
        });
      }
      throw e;
    }

    const instagram: ResumenInstagram = {
      conectado: Boolean(conexion),
      configurado: instagramConfigurado(),
      username: conexion?.username ?? null,
      account_type: conexion?.account_type ?? null,
      conectado_at: conexion?.conectado_at ?? null,
      origen: conexion?.origen ?? null,
    };

    return NextResponse.json({ instagram });
  } catch (err) {
    const mensaje =
      err instanceof Error ? err.message : "Error inesperado leyendo los ajustes";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
