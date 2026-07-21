// Migración one-time: convierte a JPEG las fotos/stickers HEIC que ya están en
// project_assets (Supabase Storage). El navegador no pinta HEIC (miniaturas en
// negro) ni Remotion lo renderiza (slides en blanco), así que las convertimos.
// Para cada asset HEIC: descarga → normaliza con lib/imagen (sharp + sips) →
// sube el JPEG a una ruta nueva → actualiza la fila → borra el HEIC viejo.
//
// EJECUTAR EN EL MAC MINI (tiene `sips`, necesario para decodificar HEIC):
//   cd ~/estudio && npx --yes tsx scripts/reparar-heic.mts
//
// Idempotente: si no quedan HEIC, no hace nada. Best-effort por asset (si uno
// falla, sigue con los demás y lo reporta al final).

import { getSupabaseServer } from "../lib/supabase";
import {
  BUCKET_PROYECTOS,
  borrarAssetsStorage,
  subirAssetProyecto,
} from "../lib/proyectos";
import { esHeic, normalizarImagen } from "../lib/imagen";
import type { ProyectoAsset } from "../lib/types";

process.loadEnvFile(".env.local");

const supabase = getSupabaseServer();

const { data, error } = await supabase
  .from("project_assets")
  .select("*")
  .in("tipo", ["foto", "sticker"]);
if (error) {
  console.error("No se pudieron leer los assets:", error.message);
  process.exit(1);
}

const heic = ((data ?? []) as ProyectoAsset[]).filter(
  (a) => esHeic(a.mime_type || "") || esHeic(a.nombre || "")
);
console.log(`Fotos/stickers HEIC a convertir: ${heic.length}`);
if (heic.length === 0) {
  console.log("Nada que convertir. Listo.");
  process.exit(0);
}

let ok = 0;
let fallos = 0;
for (const a of heic) {
  try {
    const { data: blob, error: dErr } = await supabase.storage
      .from(BUCKET_PROYECTOS)
      .download(a.storage_path);
    if (dErr || !blob) {
      throw new Error(dErr?.message || "no se pudo descargar de Storage");
    }
    const buffer = Buffer.from(await blob.arrayBuffer());

    const norm = await normalizarImagen(buffer, { ladoMax: 2560, calidad: 88 });
    if (!norm) throw new Error("no se pudo decodificar (¿está `sips` en este equipo?)");

    const ext = norm.mediaType === "image/png" ? "png" : "jpg";
    const nombreNuevo = `${a.nombre.replace(/\.[^.]+$/, "")}.${ext}`;
    const subido = await subirAssetProyecto(
      a.project_id,
      nombreNuevo,
      norm.data,
      norm.mediaType
    );

    const { error: uErr } = await supabase
      .from("project_assets")
      .update({
        nombre: nombreNuevo,
        mime_type: norm.mediaType,
        storage_path: subido.storage_path,
        public_url: subido.public_url,
        size_bytes: norm.data.length,
      })
      .eq("id", a.id);
    if (uErr) throw new Error(`update en BD: ${uErr.message}`);

    // Borrar el HEIC viejo (best-effort).
    await borrarAssetsStorage([a.storage_path]);
    ok++;
    console.log(`✓ ${a.nombre} → ${nombreNuevo}`);
  } catch (e) {
    fallos++;
    console.warn(`✗ ${a.nombre}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

console.log(`\nListo. Convertidas: ${ok} · fallos: ${fallos}.`);
process.exit(fallos > 0 ? 1 : 0);
