// Punto de entrada del bundle de Remotion (lo consume @remotion/bundler desde
// lib/overlay.ts). Registra la raíz con la composición "Overlay".
import { registerRoot } from "remotion";
import { Root } from "./Root";

registerRoot(Root);
