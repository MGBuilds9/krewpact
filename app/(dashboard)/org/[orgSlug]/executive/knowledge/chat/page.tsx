'use client';

import { ChatInterface } from '@/components/Executive/ChatInterface';

export default function KnowledgeChatPage() {
  return (
    <>
      <title>AI Chat — KrewPact</title>
      <div className="h-[calc(100vh-8rem)] p-4">
        <ChatInterface />
      </div>
    </>
  );
}
