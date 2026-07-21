import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Send, RefreshCcw } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

type InstagramIntegration = {
  id: number;
  client_id: number;
  ig_account_id: string;
  username: string;
  access_token: string;
  created_at: string;
};

type InstagramMessage = {
  id: string;
  from: {
    id: string;
    username: string;
    name: string;
  };
  text: string;
  timestamp: string;
  isFromPage: boolean;
};

type Conversation = {
  id: string;
  username: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  participantIgsid: string | null; // IGSID of the other person — needed to send replies
};

const InstagramMessagesPage = () => {
  const { clientId } = useAuth();
  const [location, navigate] = useLocation();
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Get the integration ID from URL
  const params = new URLSearchParams(window.location.search);
  const integrationId = params.get('id');

  // Fetch the integration data
  const { data: integration, isLoading: isLoadingIntegration } = useQuery({
    queryKey: ['instagram-integration', integrationId],
    queryFn: async () => {
      if (!integrationId) return null;

      const { data, error } = await supabase
        .from('instagram_integrations')
        .select('*')
        .eq('id', parseInt(integrationId, 10))
        .eq('client_id', clientId)
        .single();

      if (error) throw error;
      return data as InstagramIntegration;
    },
    enabled: !!integrationId && !!clientId,
  });

  // Fetch conversations
  const {
    data: conversations,
    isLoading: isLoadingConversations,
    refetch: refetchConversations,
  } = useQuery({
    queryKey: ['instagram-conversations', integrationId],
    queryFn: async () => {
      if (!integration) return [];

      try {
        const { data, error } = await supabase.functions.invoke(
          'instagram-conversations',
          {
            body: {
              integrationId: integration.id,
            },
          }
        );

        if (error) throw error;
        if (data.error) {
          // Si hay un mensaje de error específico del servidor, úsalo
          const message = data.userMessage || data.error;
          throw new Error(message);
        }

        return data.conversations as Conversation[];
      } catch (error) {
        console.error('Error fetching conversations:', error);

        // Mensaje personalizado basado en el tipo de error
        let errorMessage = 'No se pudieron cargar las conversaciones';

        if (
          error.message?.includes('token') ||
          error.message?.includes('OAuth')
        ) {
          errorMessage =
            'El token de acceso a Instagram ha expirado. Por favor, reconecta tu cuenta desde la página principal de Instagram.';
        }

        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
        return [];
      }
    },
    enabled: !!integration,
  });

  // Fetch messages for a conversation
  const {
    data: messages,
    isLoading: isLoadingMessages,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ['instagram-messages', integrationId, selectedConversation],
    queryFn: async () => {
      if (!integration || !selectedConversation) return [];

      try {
        const { data, error } = await supabase.functions.invoke(
          'instagram-messages',
          {
            body: {
              integrationId: integration.id,
              conversationId: selectedConversation,
            },
          }
        );

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        return data.messages as InstagramMessage[];
      } catch (error) {
        console.error('Error fetching messages:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los mensajes',
          variant: 'destructive',
        });
        return [];
      }
    },
    enabled: !!integration && !!selectedConversation,
  });

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !integration || !selectedConversation) return;

    setIsLoading(true);
    try {
      const activeConversation = conversations?.find(c => c.id === selectedConversation);
      const { data, error } = await supabase.functions.invoke(
        'instagram-send-message',
        {
          body: {
            integrationId: integration.id,
            conversationId: selectedConversation,
            recipientIgsid: activeConversation?.participantIgsid || null,
            message: newMessage,
          },
        }
      );

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setNewMessage('');
      refetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'No se pudo enviar el mensaje',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingIntegration) {
    return (
      <DashboardLayout>
        <div className='p-6 max-w-7xl mx-auto'>
          <div className='flex items-center justify-center min-h-[50vh]'>
            <div className='animate-pulse text-gray-400'>Cargando...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!integration) {
    return (
      <DashboardLayout>
        <div className='p-6 max-w-7xl mx-auto'>
          <div className='mb-4'>
            <Button variant='outline' size='sm' asChild>
              <Link href='/instagram'>
                <ChevronLeft className='h-4 w-4 mr-1' />
                Volver a Instagram
              </Link>
            </Button>
          </div>
          <Card className='w-full'>
            <CardHeader>
              <CardTitle>Error</CardTitle>
              <CardDescription>
                No se encontró la integración de Instagram
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                Por favor, vuelve a la página de Instagram y selecciona una
                cuenta válida.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className='p-6 max-w-7xl mx-auto'>
        <div className='mb-4 flex items-center justify-between'>
          <Button variant='outline' size='sm' asChild>
            <Link href='/instagram'>
              <ChevronLeft className='h-4 w-4 mr-1' />
              Volver a Instagram
            </Link>
          </Button>
          <h1 className='text-2xl font-bold'>
            Mensajes de @{integration.username}
          </h1>
          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              refetchConversations();
              if (selectedConversation) refetchMessages();
            }}
            disabled={isLoadingConversations || isLoadingMessages}
          >
            <RefreshCcw className='h-4 w-4 mr-1' />
            Actualizar
          </Button>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          {/* Conversations list */}
          <Card className='md:col-span-1'>
            <CardHeader className='pb-3'>
              <CardTitle className='text-xl'>Conversaciones</CardTitle>
            </CardHeader>
            <CardContent className='p-0'>
              <ScrollArea className='h-[calc(100vh-260px)]'>
                {isLoadingConversations ? (
                  <div className='p-4 text-center text-sm text-gray-500'>
                    Cargando conversaciones...
                  </div>
                ) : conversations && conversations.length > 0 ? (
                  <div className='divide-y'>
                    {conversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        className={`flex items-start p-4 gap-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                          selectedConversation === conversation.id
                            ? 'bg-muted'
                            : ''
                        }`}
                        onClick={() => setSelectedConversation(conversation.id)}
                      >
                        <Avatar className='h-10 w-10'>
                          <AvatarFallback>
                            {conversation.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className='flex-1 min-w-0'>
                          <div className='flex justify-between items-start'>
                            <p className='font-medium truncate'>
                              {conversation.name}
                            </p>
                            <span className='text-xs text-muted-foreground'>
                              {new Date(
                                conversation.timestamp
                              ).toLocaleDateString()}
                            </span>
                          </div>
                          <p className='text-sm text-muted-foreground truncate'>
                            {conversation.lastMessage}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='p-4 text-center text-sm text-gray-500'>
                    No hay conversaciones disponibles
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Message thread */}
          <Card className='md:col-span-2'>
            <CardHeader className='pb-3'>
              <CardTitle className='text-xl'>
                {selectedConversation
                  ? conversations?.find((c) => c.id === selectedConversation)
                      ?.name || 'Conversación'
                  : 'Selecciona una conversación'}
              </CardTitle>
            </CardHeader>
            <CardContent className='p-0'>
              {selectedConversation ? (
                <>
                  <ScrollArea className='h-[calc(100vh-340px)] p-4'>
                    {isLoadingMessages ? (
                      <div className='p-4 text-center text-sm text-gray-500'>
                        Cargando mensajes...
                      </div>
                    ) : messages && messages.length > 0 ? (
                      <div className='space-y-4'>
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${
                              message.isFromPage
                                ? 'justify-end'
                                : 'justify-start'
                            }`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg p-3 ${
                                message.isFromPage
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              <p className='text-sm'>{message.text}</p>
                              <p className='text-xs mt-1 opacity-70'>
                                {new Date(
                                  message.timestamp
                                ).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className='p-4 text-center text-sm text-gray-500'>
                        No hay mensajes en esta conversación
                      </div>
                    )}
                  </ScrollArea>
                  <Separator />
                  <div className='p-4'>
                    <div className='flex gap-2'>
                      <Textarea
                        placeholder='Escribe un mensaje...'
                        className='flex-1 min-h-[80px]'
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                      <Button
                        className='self-end'
                        onClick={handleSendMessage}
                        disabled={isLoading || !newMessage.trim()}
                      >
                        <Send className='h-4 w-4 mr-1' />
                        Enviar
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className='flex items-center justify-center h-[calc(100vh-260px)] text-center p-4'>
                  <div>
                    <p className='text-lg font-medium mb-2'>
                      Selecciona una conversación
                    </p>
                    <p className='text-sm text-muted-foreground'>
                      Haz clic en una conversación para ver los mensajes
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default InstagramMessagesPage;
