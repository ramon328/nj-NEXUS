import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';

interface UserProfileProps {
  isMobile?: boolean;
}

const UserProfile = ({ isMobile = false }: UserProfileProps) => {
  const { user, userRole, client, isLoading } = useAuth();
  const { collapsed } = useSidebar();

  if (isLoading) {
    return <div className='flex items-center gap-3 mb-3'>Cargando...</div>;
  }

  if (!user) {
    return null;
  }

  // Get user's name from email if not available
  const email = user.email || '';
  const displayName = email.split('@')[0] || 'Usuario';

  return (
    <div className='flex items-center gap-3 mb-3'>
      <Avatar className='h-10 w-10 border'>
        <AvatarImage src={''} alt={displayName} />
        <AvatarFallback className='bg-secondary text-secondary-foreground'>
          {displayName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className='flex flex-col w-full overflow-hidden'>
        <p className='text-sm font-medium text-sidebar-foreground truncate'>
          {client?.name || displayName}
        </p>
        {isMobile ? (
          <p className='text-xs text-sidebar-foreground/70'>{email}</p>
        ) : (
          <p className='text-xs text-sidebar-foreground/70 truncate'>
            {collapsed ? `${email.substring(0, 15)}...` : email}
          </p>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
