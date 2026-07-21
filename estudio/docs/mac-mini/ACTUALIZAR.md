# Actualizar el mini a la última versión

Guía corta para el agente del Mac mini. Regla de siempre: **ejecuta, verifica, corrige y repite** — no avances con un paso en rojo.

## Pasos

1. **Entra al repo**:

   ```bash
   cd /RUTA/AL/REPO   # la carpeta donde está clonado nj-marcketing
   ```

2. **Revisa si hay cambios locales**:

   ```bash
   git status
   ```

   Si hay cambios locales hechos en este equipo (por ejemplo, un `/api/media/subir` casero que se haya improvisado aquí), **descártalos**:

   ```bash
   git stash -u
   ```

   El repo canónico **ya trae la versión oficial de media local** — no hay nada local que valga la pena conservar.

3. **Trae la última versión e instala dependencias**:

   ```bash
   git pull origin main
   npm install
   ```

4. **Revisa el `.env.local`**:
   - Agrega `APP_PASSWORD=<contraseña>` **si falta** (pídesela a Ramón; debe ser la misma del front).
   - Agrega `MEDIA_PUBLIC_URL=<url del túnel actual>` (la URL vigente `https://....trycloudflare.com`; sácala del log del túnel si hace falta: `grep -o "https://.*trycloudflare.com" ~/Library/Logs/estudio-tunel.log | tail -1`).
   - Verifica que `BACKEND_SECRET` esté **presente**.
   - Verifica que `RENDER_BACKEND_URL` esté **ausente** (esa variable es solo del front en Vercel; si está aquí, bórrala).

5. **Build de producción**:

   ```bash
   npm run build
   ```

   Si falla, lee el error, corrígelo y repite.

6. **Reinicia el servicio**:

   ```bash
   launchctl unload ~/Library/LaunchAgents/com.estudio.editor.plist
   launchctl load ~/Library/LaunchAgents/com.estudio.editor.plist
   ```

7. **Verifica la salud, dentro y fuera**:

   ```bash
   curl -s http://localhost:3000/api/salud        # ajusta el puerto si usas otro
   curl -s https://<url-del-tunel>/api/salud
   ```

   Ambos deben responder JSON con el motor ok. Si algo falla: `tail -50 ~/Library/Logs/estudio-editor.log`, corrige y repite desde el paso 6.

8. **Entrega final** — cuando todo esté en verde, responde exactamente:

   ```
   MINI ACTUALIZADO
   URL vigente: <url del túnel>
   ```
