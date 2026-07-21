import { NextResponse } from "next/server";
import { verificarAcceso } from "@/lib/auth";
import {
  guardarConexionInstagram,
  leerConexionInstagram,
} from "@/lib/ajustes";
import { perfilInstagram } from "@/lib/instagramAuth";

// GET /api/ajustes/instagram/probar
// Prueba la conexión guardada llamando a la Graph API con el token. Si funciona,
// refresca el @usuario/tipo guardados y responde con ellos; si el token caducó o
// se revocó, responde 400 con el detalle.
export async function GET(request: Request) {
  if (!(await verificarAcceso(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const conexion = await leerConexionInstagram();
    if (!conexion) {
      return NextResponse.json(
        { error: "No hay ninguna cuenta de Instagram vinculada." },
        { status: 404 }
      );
    }

    // Llama a /me: si el token ya no vale, perfilInstagram lanza.
    const perfil = await perfilInstagram(conexion.access_token);

    // Refrescar datos por si cambió el usuario/tipo (best-effort).
    if (
      perfil.username !== conexion.username ||
      perfil.account_type !== conexion.account_type
    ) {
      await guardarConexionInstagram({
        ...conexion,
        username: perfil.username,
        account_type: perfil.account_type,
      });
    }

    return NextResponse.json({
      ok: true,
      instagram: {
        username: perfil.username,
        account_type: perfil.account_type,
        ig_user_id: perfil.ig_user_id,
      },
    });
  } catch (err) {
    const mensaje =
      err instanceof Error
        ? err.message
        : "No se pudo probar la conexión con Instagram.";
    return NextResponse.json({ error: mensaje }, { status: 400 });
  }
}
