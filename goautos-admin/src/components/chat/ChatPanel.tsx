
import React, { useState } from 'react';
import { MessageCircle, Instagram, Send } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import posthog from '@/utils/posthog';

type ChatSource = 'instagram' | 'whatsapp' | 'website';
type ChatMessage = {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  isOwn: boolean;
  source: ChatSource;
};

type Contact = {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  source: ChatSource;
  avatar?: string;
};

const ChatPanel: React.FC = () => {
  const { user } = useAuth();
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [activeSource, setActiveSource] = useState<ChatSource>('instagram');

  // Sample contacts and messages data
  const contacts: Contact[] = [
    {
      id: '1',
      name: 'María García',
      lastMessage: 'Me interesa el Toyota Corolla 2022',
      time: '10:34',
      unread: 2,
      source: 'instagram',
      avatar: '/placeholder.svg',
    },
    {
      id: '2',
      name: 'Juan Rodríguez',
      lastMessage: '¿Tienen sedanes disponibles?',
      time: '9:20',
      unread: 0,
      source: 'whatsapp',
      avatar: '/placeholder.svg',
    },
    {
      id: '3',
      name: 'Ana Torres',
      lastMessage: 'Quiero agendar una prueba de manejo',
      time: 'Ayer',
      unread: 0,
      source: 'website',
      avatar: '/placeholder.svg',
    },
    {
      id: '4',
      name: 'Pedro Sánchez',
      lastMessage: '¿Cuáles son las opciones de financiamiento?',
      time: 'Ayer',
      unread: 1,
      source: 'instagram',
      avatar: '/placeholder.svg',
    },
  ];

  const messages: Record<string, ChatMessage[]> = {
    '1': [
      {
        id: 'm1',
        sender: 'María García',
        text: 'Hola, me interesa el Toyota Corolla 2022 que tienen publicado',
        timestamp: '10:30',
        isOwn: false,
        source: 'instagram',
      },
      {
        id: 'm2',
        sender: 'GoAuto',
        text: '¡Hola María! Gracias por contactarnos. El Corolla 2022 está disponible para prueba de manejo.',
        timestamp: '10:32',
        isOwn: true,
        source: 'instagram',
      },
      {
        id: 'm3',
        sender: 'María García',
        text: '¿Cuál es el precio y qué opciones de financiamiento tienen?',
        timestamp: '10:34',
        isOwn: false,
        source: 'instagram',
      },
    ],
    '2': [
      {
        id: 'm4',
        sender: 'Juan Rodríguez',
        text: 'Buenas tardes, ¿tienen sedanes disponibles actualmente?',
        timestamp: '9:15',
        isOwn: false,
        source: 'whatsapp',
      },
      {
        id: 'm5',
        sender: 'GoAuto',
        text: 'Hola Juan, sí tenemos varios modelos de sedanes disponibles. ¿Buscas alguna marca en particular?',
        timestamp: '9:20',
        isOwn: true,
        source: 'whatsapp',
      },
    ],
  };

  const filteredContacts = contacts.filter(contact => 
    activeSource === 'website' ? contact.source === 'website' : 
    activeSource === 'instagram' ? contact.source === 'instagram' : 
    activeSource === 'whatsapp' ? contact.source === 'whatsapp' : true
  );

  const handleSendMessage = () => {
    if (!messageInput.trim() || !activeChat) return;

    posthog.capture({
      distinctId: user?.id || 'anonymous',
      event: 'chat_message_sent',
      properties: {
        chat_source: activeSource,
        contact_id: activeChat,
      },
    });

    // Here you would typically send the message to an API
    // For demonstration, we're just clearing the input
    setMessageInput('');
  };

  const getSourceIcon = (source: ChatSource) => {
    switch (source) {
      case 'instagram':
        return <Instagram className="h-4 w-4" />;
      case 'whatsapp':
        return <MessageCircle className="h-4 w-4 text-green-500" />;
      case 'website':
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <Tabs defaultValue="instagram" onValueChange={(value) => setActiveSource(value as ChatSource)} className="h-full flex flex-col">
        <TabsList className="w-full px-2 mb-2">
          <TabsTrigger value="instagram" className="flex-1 flex items-center gap-1">
            <Instagram className="h-4 w-4" />
            <span>Instagram</span>
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex-1 flex items-center gap-1">
            <MessageCircle className="h-4 w-4 text-green-500" />
            <span>WhatsApp</span>
          </TabsTrigger>
          <TabsTrigger value="website" className="flex-1 flex items-center gap-1">
            <MessageCircle className="h-4 w-4 text-blue-500" />
            <span>Website</span>
          </TabsTrigger>
        </TabsList>

        <div className="flex flex-col h-full">
          {!activeChat ? (
            <ScrollArea className="flex-1 px-2">
              <div className="space-y-2 py-2">
                {filteredContacts.map((contact) => (
                  <div 
                    key={contact.id}
                    className="p-2 rounded-md hover:bg-accent cursor-pointer flex items-center gap-3"
                    onClick={() => {
                      posthog.capture({
                        distinctId: user?.id || 'anonymous',
                        event: 'chat_conversation_started',
                        properties: {
                          chat_source: contact.source,
                          contact_id: contact.id,
                        },
                      });
                      setActiveChat(contact.id);
                    }}
                  >
                    <div className="relative">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        {contact.avatar ? 
                          <img src={contact.avatar} alt={contact.name} className="h-full w-full object-cover" /> : 
                          <span className="text-lg font-semibold">{contact.name.charAt(0)}</span>
                        }
                      </div>
                      <div className="absolute -top-1 -right-1">
                        {getSourceIcon(contact.source)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <h4 className="font-medium truncate">{contact.name}</h4>
                        <span className="text-xs text-gray-500">{contact.time}</span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{contact.lastMessage}</p>
                    </div>
                    {contact.unread > 0 && (
                      <div className="h-5 w-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">
                        {contact.unread}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col h-full">
              <div className="p-2 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button 
                    className="p-1 rounded-md hover:bg-gray-200"
                    onClick={() => setActiveChat(null)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="font-medium">
                    {contacts.find(c => c.id === activeChat)?.name}
                  </div>
                </div>
                <div>
                  {getSourceIcon(contacts.find(c => c.id === activeChat)?.source || 'website')}
                </div>
              </div>
              
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-3">
                  {messages[activeChat]?.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.isOwn 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <p>{msg.text}</p>
                        <div className={`text-xs mt-1 ${msg.isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                          {msg.timestamp}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              <div className="p-2 border-t">
                <div className="flex items-center gap-2">
                  <Input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Escribe un mensaje..."
                    className="flex-1"
                  />
                  <button 
                    className="p-2 rounded-full bg-blue-500 text-white"
                    onClick={handleSendMessage}
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Tabs>
    </Card>
  );
};

export default ChatPanel;
