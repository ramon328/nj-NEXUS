import React, { useState } from 'react';
import UserTable from '@/components/users/UserTable';
import { User } from '@/types/user';
import { useUsers } from '@/hooks/useUsers';
import UserDialog from '@/components/users/UserDialog';
import LoadingState from './LoadingState';
import EmptyUsersState from './EmptyUsersState';
import AccessDeniedState from './AccessDeniedState';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionCode } from '@/types/permissions';

interface AdminsTabProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (id: number) => Promise<void>;
  refetchUsers: () => void;
}

const AdminsTab: React.FC<AdminsTabProps> = ({
  users,
  onEdit,
  onDelete,
  refetchUsers,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { hasPermission, isSuperadmin } = usePermissions();
  const usersPerPage = 10;

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setEditingUser(null);
    setIsDialogOpen(false);
    refetchUsers();
  };

  if (!isSuperadmin && !hasPermission(PermissionCode.TEAM_VIEW)) return <AccessDeniedState />;
  if (users.length === 0) return <EmptyUsersState />;

  // Pagination calculation
  const totalPages = Math.ceil(users.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const paginatedUsers = users.slice(startIndex, startIndex + usersPerPage);

  return (
    <div>
      <UserTable
        users={paginatedUsers}
        onEdit={handleEdit}
        onDelete={onDelete}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {isDialogOpen && (
        <UserDialog
          open={isDialogOpen}
          onClose={handleCloseDialog}
          user={editingUser}
          onSave={handleCloseDialog}
        />
      )}
    </div>
  );
};

export default AdminsTab;
