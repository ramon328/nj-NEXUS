
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Instagram as InstagramIcon, Trash2 } from 'lucide-react';

type InstagramAccountCardProps = {
  username: string;
  createdAt: string;
  onDelete: (id: number) => Promise<void>;
  id: number;
};

export function InstagramAccountCard({ username, createdAt, onDelete, id }: InstagramAccountCardProps) {
  const { i18n } = useTranslation('common');
  return (
    <Card className="overflow-hidden border border-purple-100 hover:border-purple-200 transition-all duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
              <InstagramIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-medium">@{username}</h3>
              <p className="text-sm text-gray-500">
                {new Date(createdAt).toLocaleDateString(i18n.language === 'es' ? 'es-CL' : 'en-US')}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={() => onDelete(id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
