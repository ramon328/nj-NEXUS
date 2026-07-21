import { Button } from '@/components/ui/button';
import { Instagram } from 'lucide-react';
import { INSTAGRAM_APP_ID } from '@/config/env';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const SocialMediaConfig = () => {
  const { clientId } = useAuth();
  const { t } = useTranslation('common');

  const handleInstagramConnect = () => {
    // Use the fixed deployment URL
    const redirectUri = 'https://portal.goauto.cl/instagram';
    const scopes = [
      'instagram_business_basic',
      /* 'instagram_business_manage_messages', */
      /* 'instagram_business_manage_comments', */
      'instagram_business_content_publish',
    ].join('%2C');

    const authUrl = `https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=${INSTAGRAM_APP_ID}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=${scopes}`;

    window.location.href = authUrl;
  };

  return (
    <div className='p-6'>
      <h1 className='text-2xl font-semibold mb-6 bg-gradient-to-r from-neutral-900 to-neutral-600 bg-clip-text text-transparent'>
        {t('configuration.integrations.social.title')}
      </h1>
      <Button
        onClick={handleInstagramConnect}
        className='bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200'
      >
        <Instagram className='mr-2 h-4 w-4' />
        {t('configuration.integrations.social.connectInstagram')}
      </Button>
    </div>
  );
};

export default SocialMediaConfig;
