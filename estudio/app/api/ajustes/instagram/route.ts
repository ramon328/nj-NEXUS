import { NextResponse } from "next/server";
import { verificarAcceso } from "@/lib/auth";
import {
  borrarConexionInstagram,
  guardarConexionInstagram,
  type ConexionInstagram,
} from "@/lib/ajustes";
import { perfilInstagram } from "@/lib/instagramAuth";

// POST /api/ajustes/instagram
// Vinculación MANUAL (alternativa al botón): el usuario pega un access token de
// Instagram (larga duración). Verificamos el token leyendo el perfil y, si vale,
// guardamos la conexión. Útil si no se quiere configurar el OAuth con app propia.
export async function POST(request: Request) {
  if (!(await verificarAcceso(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);
    const token =
      typeof body?.access_token === "string" ? body.access_token.trim() : "";
    if (!token) {
      return NextResponse.json(
        { error: "Falta el access_token de Instagram." },
        { status: 400 }
      );
    }

    // Verifica el token contra la Graph API (y de paso obtiene id + usuario).
    const perfil = await perfilInstagram(token);

    const conexion: ConexionInstagram = {
      ig_user_id: perfil.ig_user_id,
      username: perfil.username,
      account_type: perfil.account_type,
      access_token: token,
      token_expira_at: null,
      conectado_at: new Date().toISOString(),
      origen: "manual",
    };
    await guardarConexionInstagram(conexion);

    return NextResponse.json({
      ok: true,
      instagram: { username: perfil.username, account_type: perfil.account_type },
    });
  } catch (err) {
    const mensaje =
      err instanceof Error ? err.message : "No se pudo guardar la conexión.";
    return NextResponse.json({ error: mensaje }, { status: 400 });
  }
}

// DELETE /api/ajustes/instagram
// Desvincula la cuenta (borra la conexión guardada). El token deja de usarse;
// para revocarlo del todo, el usuario puede quitarlo desde su cuenta de Instagram.
export async function DELETE(request: Request) {
  if (!(await verificarAcceso(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    await borrarConexionInstagram();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const mensaje =
      err instanceof Error ? err.message : "No se pudo desvincular la cuenta.";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
