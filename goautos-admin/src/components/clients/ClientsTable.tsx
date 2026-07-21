import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Pencil,
  Trash2,
  ExternalLink,
  Mail,
  Phone,
  Globe,
  Calendar,
  MoreVertical,
  Power,
  PowerOff,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Client } from './types';
import { ClientScore } from '@/hooks/useClientsImplementationScores';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18n } from '@/hooks/useI18n';

interface ClientsTableProps {
  clients: Client[];
  formatDate: (dateString: string) => string;
  onEdit: (client: Client) => void;
  onDelete: (id: number) => void;
  onToggleActive?: (client: Client) => void;
  implementationScores?: Record<number, ClientScore>;
}

// Mobile Card Component
const ImplementationBar = ({ score }: { score?: ClientScore }) => {
  if (!score) return null;
  const color =
    score.score === 100
      ? 'bg-emerald-500'
      : score.score >= 50
        ? 'bg-sky-500'
        : 'bg-amber-500';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-500">Implementación</span>
        <span className="font-medium text-slate-700">{score.score}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${score.score}%` }}
        />
      </div>
      <p className="text-[10px] text-slate-400">
        {score.completedCount}/{score.totalCount} pasos completados
      </p>
    </div>
  );
};

const ClientCard = ({
  client,
  formatDate,
  onEdit,
  onDelete,
  onToggleActive,
  score,
}: {
  client: Client;
  formatDate: (dateString: string) => string;
  onEdit: (client: Client) => void;
  onDelete: (id: number) => void;
  onToggleActive?: (client: Client) => void;
  score?: ClientScore;
}) => {
  const { tCommon } = useI18n();

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Header with avatar and actions */}
      <div className="p-4 pb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Avatar className="h-12 w-12 border-2 border-gray-100 shadow-sm flex-shrink-0">
            <AvatarImage src={client.logo} alt={client.name} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold">
              {client.name?.charAt(0) || 'C'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 truncate text-base">
              {client.name || '-'}
            </h3>
            <p className="text-xs text-gray-500">
              ID: {client.id}
            </p>
          </div>
        </div>

        {/* Actions dropdown for mobile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => onEdit(client)}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </DropdownMenuItem>
            {client.domain && (
              <DropdownMenuItem
                onClick={() => window.open(`https://${client.domain}`, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Visitar sitio
              </DropdownMenuItem>
            )}
            {onToggleActive && (
              <DropdownMenuItem
                onClick={() => onToggleActive(client)}
                className={client.is_active === false ? 'text-emerald-600 focus:text-emerald-600' : 'text-amber-600 focus:text-amber-600'}
              >
                {client.is_active === false ? (
                  <>
                    <Power className="h-4 w-4 mr-2" />
                    Reactivar
                  </>
                ) : (
                  <>
                    <PowerOff className="h-4 w-4 mr-2" />
                    Inactivar
                  </>
                )}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => onDelete(client.id)}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Status badge */}
      <div className="px-4 pb-3">
        <Badge
          variant={client.has_demo ? 'secondary' : 'default'}
          className={`text-xs ${
            client.has_demo
              ? 'bg-amber-100 text-amber-700 hover:bg-amber-100'
              : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
          }`}
        >
          {client.has_demo
            ? tCommon('clients.badges.demoActive')
            : tCommon('clients.badges.production')}
        </Badge>
      </div>

      {/* Info grid */}
      <div className="px-4 pb-4 space-y-2.5">
        {/* Domain */}
        {client.domain && (
          <div className="flex items-center gap-2.5 text-sm">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50">
              <Globe className="h-4 w-4 text-blue-600" />
            </div>
            <a
              href={`https://${client.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline truncate flex-1"
            >
              {client.domain}
            </a>
          </div>
        )}

        {/* Email */}
        {client.contact?.email && (
          <div className="flex items-center gap-2.5 text-sm">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-50">
              <Mail className="h-4 w-4 text-gray-600" />
            </div>
            <span className="text-gray-700 truncate flex-1">
              {client.contact.email}
            </span>
          </div>
        )}

        {/* Phone */}
        {client.contact?.phone && (
          <div className="flex items-center gap-2.5 text-sm">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-50">
              <Phone className="h-4 w-4 text-gray-600" />
            </div>
            <span className="text-gray-700">{client.contact.phone}</span>
          </div>
        )}

        {/* Registration date */}
        <div className="flex items-center gap-2.5 text-sm">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-50">
            <Calendar className="h-4 w-4 text-gray-600" />
          </div>
          <span className="text-gray-500">
            {formatDate(client.created_at)}
          </span>
        </div>
      </div>

      {/* Implementation progress */}
      {score && (
        <div className="px-4 pb-4">
          <ImplementationBar score={score} />
        </div>
      )}
    </div>
  );
};

const ClientsTable = ({
  clients,
  formatDate,
  onEdit,
  onDelete,
  onToggleActive,
  implementationScores,
}: ClientsTableProps) => {
  const { tCommon } = useI18n();

  return (
    <>
      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {clients.map((client) => (
          <ClientCard
            key={client.id}
            client={client}
            formatDate={formatDate}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleActive={onToggleActive}
            score={implementationScores?.[client.id]}
          />
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
              <TableHead className="w-[280px] font-semibold text-gray-700">
                {tCommon('clients.superadminTable.headers.company')}
              </TableHead>
              <TableHead className="font-semibold text-gray-700">
                {tCommon('clients.superadminTable.headers.contact')}
              </TableHead>
              <TableHead className="font-semibold text-gray-700">
                {tCommon('clients.superadminTable.headers.domain')}
              </TableHead>
              <TableHead className="font-semibold text-gray-700">
                {tCommon('clients.superadminTable.headers.status')}
              </TableHead>
              <TableHead className="font-semibold text-gray-700">
                {tCommon('clients.superadminTable.headers.registered')}
              </TableHead>
              <TableHead className="font-semibold text-gray-700 w-[160px]">
                Implementación
              </TableHead>
              <TableHead className="text-right font-semibold text-gray-700">
                {tCommon('general.actions')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow
                key={client.id}
                className="hover:bg-gray-50/50 transition-colors"
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={client.logo} alt={client.name} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {client.name?.charAt(0) || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">
                        {client.name || '-'}
                      </span>
                      <span className="text-xs text-gray-400">
                        ID: {client.id}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {client.contact?.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-gray-700">{client.contact.email}</span>
                      </div>
                    )}
                    {client.contact?.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-gray-500">{client.contact.phone}</span>
                      </div>
                    )}
                    {!client.contact?.email && !client.contact?.phone && (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {client.domain ? (
                    <a
                      href={`https://${client.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 hover:underline"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      {client.domain}
                    </a>
                  ) : (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={client.has_demo ? 'secondary' : 'default'}
                    className={`text-xs font-medium ${
                      client.has_demo
                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                        : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {client.has_demo
                      ? tCommon('clients.badges.demoActive')
                      : tCommon('clients.badges.production')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-700">
                      {formatDate(client.created_at)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(client.created_at).toLocaleTimeString('es-CL', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <ImplementationBar score={implementationScores?.[client.id]} />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600"
                          onClick={() => onEdit(client)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Editar cliente</TooltipContent>
                    </Tooltip>

                    {client.domain && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-gray-100"
                            onClick={() =>
                              window.open(`https://${client.domain}`, '_blank')
                            }
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Visitar sitio web</TooltipContent>
                      </Tooltip>
                    )}

                    {onToggleActive && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${
                              client.is_active === false
                                ? 'hover:bg-emerald-50 hover:text-emerald-600'
                                : 'hover:bg-amber-50 hover:text-amber-600'
                            }`}
                            onClick={() => onToggleActive(client)}
                          >
                            {client.is_active === false ? (
                              <Power className="h-4 w-4" />
                            ) : (
                              <PowerOff className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {client.is_active === false ? 'Reactivar cliente' : 'Inactivar cliente'}
                        </TooltipContent>
                      </Tooltip>
                    )}

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                          onClick={() => onDelete(client.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Eliminar cliente</TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

export default ClientsTable;
