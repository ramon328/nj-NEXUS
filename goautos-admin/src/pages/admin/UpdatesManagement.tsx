import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { LuPlus, LuEllipsisVertical, LuPencil, LuTrash, LuEye, LuCheck, LuX, LuArchive, LuStar, LuMail } from 'react-icons/lu';
import EmailNotificationDialog from '@/components/admin/updates/EmailNotificationDialog';
import {
  getUpdates,
  deleteUpdate,
  publishUpdate,
  unpublishUpdate,
  archiveUpdate,
  Update,
  UpdateWithAuthor,
  UpdateType,
  UpdateStatus,
} from '@/services/updatesService';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const UpdatesManagement = () => {
  const [, navigate] = useLocation();
  const { userRole } = useAuth();
  const [updates, setUpdates] = useState<UpdateWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{ type?: UpdateType; status?: UpdateStatus }>({});
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedUpdateForEmail, setSelectedUpdateForEmail] = useState<UpdateWithAuthor | null>(null);

  const handleOpenEmailDialog = (update: UpdateWithAuthor) => {
    setSelectedUpdateForEmail(update);
    setEmailDialogOpen(true);
  };

  // Only superadmins can access this page
  useEffect(() => {
    if (userRole !== 'superadmin') {
      navigate('/');
    }
  }, [userRole, navigate]);

  const loadUpdates = async () => {
    setLoading(true);
    try {
      const data = await getUpdates(filter);
      setUpdates(data);
    } catch (error) {
      console.error('Error loading updates:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las novedades',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUpdates();
  }, [filter]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`¿Estás seguro de eliminar "${title}"?`)) return;

    const success = await deleteUpdate(id);
    if (success) {
      toast({
        title: 'Éxito',
        description: 'Novedad eliminada correctamente',
      });
      loadUpdates();
    } else {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la novedad',
        variant: 'destructive',
      });
    }
  };

  const handlePublish = async (id: string) => {
    const result = await publishUpdate(id);
    if (result) {
      toast({
        title: 'Éxito',
        description: 'Novedad publicada correctamente',
      });
      loadUpdates();
    } else {
      toast({
        title: 'Error',
        description: 'No se pudo publicar la novedad',
        variant: 'destructive',
      });
    }
  };

  const handleUnpublish = async (id: string) => {
    const result = await unpublishUpdate(id);
    if (result) {
      toast({
        title: 'Éxito',
        description: 'Novedad despublicada correctamente',
      });
      loadUpdates();
    } else {
      toast({
        title: 'Error',
        description: 'No se pudo despublicar la novedad',
        variant: 'destructive',
      });
    }
  };

  const handleArchive = async (id: string) => {
    const result = await archiveUpdate(id);
    if (result) {
      toast({
        title: 'Éxito',
        description: 'Novedad archivada correctamente',
      });
      loadUpdates();
    } else {
      toast({
        title: 'Error',
        description: 'No se pudo archivar la novedad',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: UpdateStatus) => {
    const variants = {
      draft: { variant: 'secondary' as const, label: 'Borrador' },
      published: { variant: 'default' as const, label: 'Publicado' },
      archived: { variant: 'outline' as const, label: 'Archivado' },
    };
    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeBadge = (type: UpdateType) => {
    const labels = {
      tutorial: 'Tutorial',
      feature: 'Feature',
      changelog: 'Changelog',
    };
    return <Badge variant="outline">{labels[type]}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Gestión de Novedades</h1>
            <p className="text-slate-500 mt-1">
              Administra tutoriales, features y changelog
            </p>
          </div>
          <Button onClick={() => navigate('/configuracion/novedades/crear')}>
            <LuPlus className="w-4 h-4 mr-2" />
            Nueva Novedad
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Tipo</label>
                <select
                  value={filter.type || ''}
                  onChange={(e) => setFilter({ ...filter, type: e.target.value as UpdateType || undefined })}
                  className="border rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Todos</option>
                  <option value="tutorial">Tutorial</option>
                  <option value="feature">Feature</option>
                  <option value="changelog">Changelog</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Estado</label>
                <select
                  value={filter.status || ''}
                  onChange={(e) => setFilter({ ...filter, status: e.target.value as UpdateStatus || undefined })}
                  className="border rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Todos</option>
                  <option value="draft">Borrador</option>
                  <option value="published">Publicado</option>
                  <option value="archived">Archivado</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-slate-500">
                Cargando...
              </div>
            ) : updates.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                No hay novedades para mostrar
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Autor</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="w-[100px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {updates.map((update) => (
                    <TableRow key={update.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {update.featured && (
                            <LuStar className="w-4 h-4 text-yellow-500 fill-current" />
                          )}
                          <span className="font-medium">{update.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getTypeBadge(update.type)}</TableCell>
                      <TableCell>{getStatusBadge(update.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{update.author_name || 'N/A'}</div>
                          <div className="text-slate-500">{update.author_role || ''}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-slate-500">
                          {update.published_at
                            ? new Date(update.published_at).toLocaleDateString()
                            : new Date(update.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <LuEllipsisVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/novedades/${update.slug}`)}>
                              <LuEye className="w-4 h-4 mr-2" />
                              Ver
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/configuracion/novedades/editar/${update.id}`)}>
                              <LuPencil className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            {/* Solo mostrar opción de email para novedades y tutoriales publicados */}
                            {update.status === 'published' && update.type !== 'changelog' && (
                              <DropdownMenuItem onClick={() => handleOpenEmailDialog(update)}>
                                <LuMail className="w-4 h-4 mr-2" />
                                Notificar por email
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {update.status === 'draft' && (
                              <DropdownMenuItem onClick={() => handlePublish(update.id)}>
                                <LuCheck className="w-4 h-4 mr-2" />
                                Publicar
                              </DropdownMenuItem>
                            )}
                            {update.status === 'published' && (
                              <DropdownMenuItem onClick={() => handleUnpublish(update.id)}>
                                <LuX className="w-4 h-4 mr-2" />
                                Despublicar
                              </DropdownMenuItem>
                            )}
                            {update.status !== 'archived' && (
                              <DropdownMenuItem onClick={() => handleArchive(update.id)}>
                                <LuArchive className="w-4 h-4 mr-2" />
                                Archivar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(update.id, update.title)}
                              className="text-red-600"
                            >
                              <LuTrash className="w-4 h-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Email Notification Dialog */}
      <EmailNotificationDialog
        open={emailDialogOpen && selectedUpdateForEmail !== null}
        onClose={() => {
          setEmailDialogOpen(false);
          setSelectedUpdateForEmail(null);
        }}
        update={selectedUpdateForEmail!}
      />
    </DashboardLayout>
  );
};

export default UpdatesManagement;
