
import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ChatPanel from '@/components/chat/ChatPanel';

const Chats = () => {
  return (
    <DashboardLayout>
      <div className="p-4 h-full">
        <ChatPanel />
      </div>
    </DashboardLayout>
  );
};

export default Chats;
