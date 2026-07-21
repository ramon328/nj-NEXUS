"use client";

import { useState } from "react";
import { Building2, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { api, type Empresa } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddEmpresaDialog({
  onCreated,
}: {
  onCreated: (e: Empresa) => void;
}) {
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [rut, setRut] = useState("");
  const [clave, setClave] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setNombre("");
    setRut("");
    setClave("");
  }

  async function submit() {
    if (!nombre.trim() || !rut.trim() || !clave.trim()) {
      toast.error("Completa nombre, RUT y clave tributaria.");
      return;
    }
    setSaving(true);
    try {
      const empresa = await api.crearEmpresa({
        nombre: nombre.trim(),
        rut: rut.trim(),
        clave,
      });
      toast.success(`Empresa "${empresa.nombre}" agregada.`);
      onCreated(empresa);
      reset();
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message || "No se pudo crear la empresa.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" />
        Agregar empresa
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="size-5" />
            Nueva empresa
          </DialogTitle>
          <DialogDescription>
            Sus credenciales del SII se guardan solo en tu equipo y se usan para
            descargar documentos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre de la empresa</Label>
            <Input
              id="nombre"
              placeholder="Mi Empresa SpA"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rut">RUT</Label>
            <Input
              id="rut"
              placeholder="77271121-2"
              value={rut}
              onChange={(e) => setRut(e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="clave">Clave tributaria del SII</Label>
            <Input
              id="clave"
              type="password"
              placeholder="••••••••"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Guardar empresa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
