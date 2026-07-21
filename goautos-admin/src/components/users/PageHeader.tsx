import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Users, Filter, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';

interface Client {
  id: number;
  name: string;
}

interface PageHeaderProps {
  onCreateUser: () => void;
  clients?: Client[];
  selectedClientId?: string;
  onClientChange?: (clientId: string) => void;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
}

const PageHeader = ({
  onCreateUser,
  clients = [],
  selectedClientId,
  onClientChange,
  searchTerm = '',
  onSearchChange,
}: PageHeaderProps) => {
  const { userRole } = useAuth();
  const isSuperAdmin = userRole === 'superadmin';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-end">
        <Button
          onClick={onCreateUser}
          className="bg-primary hover:bg-primary/90 gap-2"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nuevo Usuario</span>
          <span className="sm:hidden">Nuevo</span>
        </Button>
      </div>

      {/* Filters */}
      {isSuperAdmin && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por nombre o email..."
              value={searchTerm}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="pl-9 h-9 rounded-xl bg-white border-slate-200/60 text-[13px] text-slate-500 placeholder:text-slate-400 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)]"
            />
          </div>
          {clients.length > 0 && (
            <Select value={selectedClientId} onValueChange={onClientChange}>
              <SelectTrigger className="w-full sm:w-[250px] h-9 rounded-xl bg-white border-slate-200/60 text-[13px] text-slate-500 [&>svg]:text-slate-400 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)]" id="client-filter">
                <SelectValue placeholder="Todos los clientes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los clientes</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id.toString()}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
