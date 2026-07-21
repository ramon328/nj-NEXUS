import React, { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { LuSave, LuArrowLeft, LuImage, LuVideo, LuEye, LuStar, LuPlus, LuTrash, LuSparkles, LuBug, LuTrendingUp, LuGitBranch } from 'react-icons/lu';
import {
  createUpdate,
  updateUpdate,
  getUpdateById,
  uploadUpdateImage,
  CreateUpdateInput,
  UpdateType,
  UpdateStatus,
  UpdateCategory,
} from '@/services/updatesService';
import { useAuth } from '@/contexts/AuthContext';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Types
type ChangeType = 'feat' | 'fix' | 'perf' | 'chore';

interface ChangelogItem {
  type: ChangeType;
  text: string;
}

// Gradients presets
const GRADIENT_PRESETS = [
  { label: 'Blue Dark', value: 'from-blue-700 via-blue-600 to-slate-900' },
  { label: 'Emerald', value: 'from-emerald-500 to-teal-400' },
  { label: 'Sky', value: 'from-sky-500 to-blue-400' },
  { label: 'Orange', value: 'from-orange-500 to-amber-400' },
  { label: 'Indigo', value: 'from-indigo-500 to-blue-500' },
  { label: 'Purple', value: 'from-purple-500 to-pink-500' },
  { label: 'Rose', value: 'from-rose-500 to-pink-500' },
];

const CHANGE_TYPE_CONFIG = {
  feat: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: LuSparkles, label: 'NEW' },
  fix: { color: 'bg-rose-100 text-rose-700 border-rose-200', icon: LuBug, label: 'FIX' },
  perf: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: LuTrendingUp, label: 'PERF' },
  chore: { color: 'bg-slate-100 text-slate-600 border-slate-200', icon: LuGitBranch, label: 'MISC' },
};

const UpdateEditor = () => {
  const [, navigate] = useLocation();
  const params = useParams<{ id?: string }>();
  const { userRole } = useAuth();
  const isEditMode = !!params.id;

  // Form state
  const [formData, setFormData] = useState<CreateUpdateInput>({
    type: 'feature',
    title: '',
    excerpt: '',
    content_markdown: '',
    tags: [],
    category: 'feature',
    read_time: '',
    status: 'draft',
    featured: false,
    is_major: false,
    version: '',
    gradient: GRADIENT_PRESETS[0].value,
    client_id: null, // Global by default for superadmin
  });

  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  // Changelog items state
  const [changelogItems, setChangelogItems] = useState<ChangelogItem[]>([]);
  const [newItemType, setNewItemType] = useState<ChangeType>('feat');
  const [newItemText, setNewItemText] = useState('');

  // Custom gradient state
  const [customGradient, setCustomGradient] = useState('');
  const [useCustomGradient, setUseCustomGradient] = useState(false);
  const [customFromColor, setCustomFromColor] = useState('#3b82f6'); // blue-500
  const [customToColor, setCustomToColor] = useState('#8b5cf6'); // purple-500

  // Update custom gradient when colors change
  useEffect(() => {
    if (useCustomGradient) {
      setCustomGradient(`from-[${customFromColor}] to-[${customToColor}]`);
    }
  }, [customFromColor, customToColor, useCustomGradient]);

  // Load update data if in edit mode
  useEffect(() => {
    if (isEditMode && params.id) {
      loadUpdate(params.id);
    }
  }, [isEditMode, params.id]);

  const loadUpdate = async (id: string) => {
    setLoading(true);
    try {
      const data = await getUpdateById(id);
      if (data) {
        setFormData({
          type: data.type,
          title: data.title,
          slug: data.slug,
          excerpt: data.excerpt,
          content_markdown: data.content_markdown || '',
          image_url: data.image_url,
          video_url: data.video_url,
          thumbnail_url: data.thumbnail_url,
          tags: data.tags || [],
          category: data.category,
          read_time: data.read_time,
          status: data.status,
          featured: data.featured || false,
          is_major: data.is_major || false,
          version: data.version || '',
          gradient: data.gradient || GRADIENT_PRESETS[0].value,
          client_id: data.client_id,
        });

        // Load changelog items if they exist
        if (data.content && typeof data.content === 'object' && Array.isArray(data.content.items)) {
          setChangelogItems(data.content.items);
        }

        // Check if using custom gradient
        const isPreset = GRADIENT_PRESETS.some(p => p.value === data.gradient);
        if (!isPreset && data.gradient) {
          setUseCustomGradient(true);
          setCustomGradient(data.gradient);
        }
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo cargar la novedad',
          variant: 'destructive',
        });
        navigate('/configuracion/novedades');
      }
    } catch (error) {
      console.error('Error loading update:', error);
      toast({
        title: 'Error',
        description: 'Error al cargar la novedad',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const imageUrl = await uploadUpdateImage(file, 'updates');
      if (imageUrl) {
        setFormData({ ...formData, image_url: imageUrl });
        toast({
          title: 'Éxito',
          description: 'Imagen subida correctamente',
        });
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo subir la imagen',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Error',
        description: 'Error al subir la imagen',
        variant: 'destructive',
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((t) => t !== tag),
    });
  };

  const handleAddChangelogItem = () => {
    if (newItemText.trim()) {
      setChangelogItems([...changelogItems, { type: newItemType, text: newItemText.trim() }]);
      setNewItemText('');
      setNewItemType('feat');
    }
  };

  const handleRemoveChangelogItem = (index: number) => {
    setChangelogItems(changelogItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (status?: UpdateStatus) => {
    // Validation
    if (!formData.title.trim()) {
      toast({
        title: 'Error',
        description: 'El título es obligatorio',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.excerpt.trim()) {
      toast({
        title: 'Error',
        description: 'El extracto es obligatorio',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const dataToSave: any = {
        ...formData,
        status: status || formData.status,
        gradient: useCustomGradient ? customGradient : formData.gradient,
      };

      // If it's a changelog and has items, save them in content JSON
      if (formData.type === 'changelog' && changelogItems.length > 0) {
        dataToSave.content = { items: changelogItems };
      }

      let result;
      if (isEditMode && params.id) {
        result = await updateUpdate(params.id, dataToSave);
      } else {
        result = await createUpdate(dataToSave);
      }

      if (result) {
        toast({
          title: 'Éxito',
          description: isEditMode
            ? 'Novedad actualizada correctamente'
            : 'Novedad creada correctamente',
        });
        navigate('/configuracion/novedades');
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo guardar la novedad',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving update:', error);
      toast({
        title: 'Error',
        description: 'Error al guardar la novedad',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) {
    return (
      <DashboardLayout>
        <div className="p-12 text-center text-slate-500">Cargando...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/configuracion/novedades')}>
              <LuArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {isEditMode ? 'Editar Novedad' : 'Nueva Novedad'}
              </h1>
              <p className="text-slate-500 mt-1">
                {isEditMode ? 'Modifica los detalles de la novedad' : 'Crea una nueva novedad, tutorial o changelog'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contenido Principal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Title */}
                <div>
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Título de la novedad"
                  />
                </div>

                {/* Excerpt */}
                <div>
                  <Label htmlFor="excerpt">Extracto *</Label>
                  <Textarea
                    id="excerpt"
                    value={formData.excerpt}
                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                    placeholder="Breve descripción que aparecerá en la tarjeta"
                    rows={3}
                  />
                </div>

                {/* Content (Markdown) */}
                <div>
                  <Label htmlFor="content">Contenido (Markdown)</Label>
                  <Textarea
                    id="content"
                    value={formData.content_markdown}
                    onChange={(e) => setFormData({ ...formData, content_markdown: e.target.value })}
                    placeholder="Escribe el contenido en formato Markdown..."
                    rows={15}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Soporta Markdown: **negrita**, *cursiva*, # Títulos, - listas, etc.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Changelog Items - Only for changelog type */}
            {formData.type === 'changelog' && (
              <Card>
                <CardHeader>
                  <CardTitle>Items del Changelog</CardTitle>
                  <p className="text-sm text-slate-500 mt-1">
                    Agrega los cambios específicos de esta versión con sus tipos
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add new item */}
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                    <div className="flex gap-2">
                      <select
                        value={newItemType}
                        onChange={(e) => setNewItemType(e.target.value as ChangeType)}
                        className="border rounded-md px-3 py-2 text-sm min-w-[140px]"
                      >
                        {Object.entries(CHANGE_TYPE_CONFIG).map(([type, config]) => {
                          const Icon = config.icon;
                          return (
                            <option key={type} value={type}>
                              {config.label}
                            </option>
                          );
                        })}
                      </select>
                      <Input
                        value={newItemText}
                        onChange={(e) => setNewItemText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddChangelogItem())}
                        placeholder="Descripción del cambio..."
                        className="flex-1"
                      />
                      <Button type="button" onClick={handleAddChangelogItem} size="sm">
                        <LuPlus className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Preview of selected type */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Vista previa:</span>
                      <span className={cn(
                        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider",
                        CHANGE_TYPE_CONFIG[newItemType].color
                      )}>
                        {React.createElement(CHANGE_TYPE_CONFIG[newItemType].icon, { className: "w-3 h-3 mr-1" })}
                        {CHANGE_TYPE_CONFIG[newItemType].label}
                      </span>
                    </div>
                  </div>

                  {/* List of items */}
                  {changelogItems.length > 0 ? (
                    <div className="space-y-2">
                      {changelogItems.map((item, index) => {
                        const config = CHANGE_TYPE_CONFIG[item.type];
                        const Icon = config.icon;
                        return (
                          <div
                            key={index}
                            className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors group"
                          >
                            <span className={cn(
                              "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider shrink-0",
                              config.color
                            )}>
                              <Icon className="w-3 h-3 mr-1" />
                              {config.label}
                            </span>
                            <span className="text-sm text-slate-700 flex-1 leading-relaxed">{item.text}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveChangelogItem(index)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-600"
                            >
                              <LuTrash className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg">
                      No hay items agregados. Agrega cambios para que aparezcan en el timeline.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Media */}
            <Card>
              <CardHeader>
                <CardTitle>Multimedia</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Image URL */}
                <div>
                  <Label htmlFor="image">Imagen Principal</Label>
                  <div className="flex gap-2">
                    <Input
                      id="image"
                      value={formData.image_url || ''}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      placeholder="URL de la imagen"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('image-upload')?.click()}
                      disabled={uploadingImage}
                    >
                      <LuImage className="w-4 h-4 mr-2" />
                      {uploadingImage ? 'Subiendo...' : 'Subir'}
                    </Button>
                  </div>
                  {formData.image_url && (
                    <div className="mt-2">
                      <img
                        src={formData.image_url}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-md border"
                      />
                    </div>
                  )}
                </div>

                {/* Video URL */}
                <div>
                  <Label htmlFor="video">Video (YouTube/Vimeo URL)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="video"
                      value={formData.video_url || ''}
                      onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                      placeholder="https://youtube.com/watch?v=..."
                    />
                    <Button type="button" variant="outline" disabled>
                      <LuVideo className="w-4 h-4 mr-2" />
                      Video
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Configuración</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Type */}
                <div>
                  <Label htmlFor="type">Tipo *</Label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as UpdateType })}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                  >
                    <option value="feature">Feature / Novedad</option>
                    <option value="tutorial">Tutorial / Guía</option>
                    <option value="changelog">Changelog</option>
                  </select>
                </div>

                {/* Category */}
                <div>
                  <Label htmlFor="category">Categoría</Label>
                  <select
                    id="category"
                    value={formData.category || ''}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as UpdateCategory })}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                  >
                    <option value="feature">Feature</option>
                    <option value="guide">Guía</option>
                    <option value="announcement">Anuncio</option>
                  </select>
                </div>

                {/* Version (for changelog) */}
                {formData.type === 'changelog' && (
                  <div>
                    <Label htmlFor="version">Versión</Label>
                    <Input
                      id="version"
                      value={formData.version || ''}
                      onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                      placeholder="v2.5.0"
                    />
                  </div>
                )}

                {/* Read Time */}
                <div>
                  <Label htmlFor="readTime">Tiempo de lectura</Label>
                  <Input
                    id="readTime"
                    value={formData.read_time || ''}
                    onChange={(e) => setFormData({ ...formData, read_time: e.target.value })}
                    placeholder="5 min"
                  />
                </div>

                {/* Gradient */}
                <div>
                  <Label>Color de acento</Label>
                  <div className="space-y-3 mt-2">
                    {/* Presets */}
                    <div className="grid grid-cols-2 gap-2">
                      {GRADIENT_PRESETS.map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => {
                            setUseCustomGradient(false);
                            setFormData({ ...formData, gradient: preset.value });
                          }}
                          className={`h-12 rounded-md bg-gradient-to-r ${preset.value} transition-all ${
                            !useCustomGradient && formData.gradient === preset.value
                              ? 'ring-2 ring-blue-500 ring-offset-2'
                              : 'hover:ring-2 hover:ring-slate-300'
                          }`}
                          title={preset.label}
                        />
                      ))}
                    </div>

                    {/* Custom gradient option */}
                    <div className="pt-2 border-t border-slate-200">
                      <div className="flex items-center gap-2 mb-3">
                        <input
                          type="checkbox"
                          id="useCustomGradient"
                          checked={useCustomGradient}
                          onChange={(e) => setUseCustomGradient(e.target.checked)}
                          className="rounded"
                        />
                        <Label htmlFor="useCustomGradient" className="text-xs font-medium cursor-pointer">
                          Usar gradiente personalizado
                        </Label>
                      </div>
                      {useCustomGradient && (
                        <div className="space-y-3">
                          {/* Color pickers */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs text-slate-600">Color inicial</Label>
                              <div className="flex gap-2 items-center">
                                <input
                                  type="color"
                                  value={customFromColor}
                                  onChange={(e) => setCustomFromColor(e.target.value)}
                                  className="w-12 h-10 rounded border border-slate-200 cursor-pointer"
                                />
                                <Input
                                  value={customFromColor}
                                  onChange={(e) => setCustomFromColor(e.target.value)}
                                  className="text-xs font-mono flex-1"
                                  placeholder="#3b82f6"
                                />
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs text-slate-600">Color final</Label>
                              <div className="flex gap-2 items-center">
                                <input
                                  type="color"
                                  value={customToColor}
                                  onChange={(e) => setCustomToColor(e.target.value)}
                                  className="w-12 h-10 rounded border border-slate-200 cursor-pointer"
                                />
                                <Input
                                  value={customToColor}
                                  onChange={(e) => setCustomToColor(e.target.value)}
                                  className="text-xs font-mono flex-1"
                                  placeholder="#8b5cf6"
                                />
                              </div>
                            </div>
                          </div>
                          {/* Preview */}
                          <div className="space-y-1.5">
                            <Label className="text-xs text-slate-600">Vista previa</Label>
                            <div
                              className="h-12 rounded-md border border-slate-200"
                              style={{
                                background: `linear-gradient(to right, ${customFromColor}, ${customToColor})`
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Featured */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="featured" className="flex items-center gap-2">
                    <LuStar className="w-4 h-4" />
                    Destacar
                  </Label>
                  <Switch
                    id="featured"
                    checked={formData.featured || false}
                    onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })}
                  />
                </div>

                {/* Is Major (for changelog) */}
                {formData.type === 'changelog' && (
                  <div className="flex items-center justify-between">
                    <Label htmlFor="isMajor">Versión Mayor</Label>
                    <Switch
                      id="isMajor"
                      checked={formData.is_major || false}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_major: checked })}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    placeholder="Agregar tag"
                  />
                  <Button type="button" variant="outline" onClick={handleAddTag}>
                    +
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags?.map((tag) => (
                    <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveTag(tag)}>
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Acciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  className="w-full"
                  onClick={() => handleSubmit('published')}
                  disabled={loading}
                >
                  <LuSave className="w-4 h-4 mr-2" />
                  {loading ? 'Guardando...' : 'Publicar'}
                </Button>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => handleSubmit('draft')}
                  disabled={loading}
                >
                  Guardar como Borrador
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UpdateEditor;
