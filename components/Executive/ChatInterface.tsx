'use client';

import { Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api-client';

interface ChatSource {
  doc_id: string;
  title: string;
  similarity: number;
}
interface Message {
  id?: string;
  role: string;
  content: string;
  sources?: ChatSource[];
}
interface ChatResponse {
  sessionId: string;
  message: Message;
}

interface ChatMessageListProps {
  messages: Message[];
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

function ChatMessageList({ messages, isLoading, messagesEndRef }: ChatMessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">
      {messages.length === 0 && !isLoading && (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          <div className="text-center space-y-2">
            <p className="font-medium">Ask anything about the MDM knowledge base</p>
            <p>SOPs, strategy docs, training materials, and more</p>
          </div>
        </div>
      )}
      {messages.map((msg, idx) => (
        <div
          key={msg.id ?? `msg-${idx}`}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          {msg.role === 'user' ? (
            <div className="max-w-[75%] bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm">
              {msg.content}
            </div>
          ) : (
            <AssistantMessage msg={msg} />
          )}
        </div>
      ))}
      {isLoading && (
        <div className="flex justify-start">
          <Card className="max-w-[85%] shadow-sm">
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-3 w-64" />
              <Skeleton className="h-3 w-36" />
            </CardContent>
          </Card>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

interface ChatInputBarProps {
  input: string;
  isLoading: boolean;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSend: () => void;
}

function ChatInputBar({ input, isLoading, onChange, onKeyDown, onSend }: ChatInputBarProps) {
  return (
    <div className="flex gap-2 pt-4 border-t">
      <Input
        value={input}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Ask about SOPs, strategy, procedures..."
        disabled={isLoading}
        className="flex-1"
        aria-label="Chat message input"
      />
      <Button
        onClick={onSend}
        disabled={!input.trim() || isLoading}
        size="icon"
        aria-label="Send message"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}

function AssistantMessage({ msg }: { msg: Message }) {
  return (
    <Card className="max-w-[85%] shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown>{msg.content}</ReactMarkdown>
        </div>
        {msg.sources && msg.sources.length > 0 && (
          <div className="border-t pt-3 space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Sources</p>
            <div className="flex flex-wrap gap-1.5">
              {msg.sources.map((source) => (
                <Badge
                  key={source.doc_id}
                  variant="outline"
                  className="text-xs font-normal"
                  title={`Similarity: ${(source.similarity * 100).toFixed(0)}%`}
                >
                  {source.title}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', content: trimmed }]);
    setInput('');
    setIsLoading(true);
    try {
      const data = await apiFetch<ChatResponse>('/api/executive/knowledge/chat', {
        method: 'POST',
        body: { message: trimmed, sessionId },
      });
      setSessionId(data.sessionId);
      setMessages((prev) => [...prev, data.message]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <h1 className="text-xl font-semibold">AI Knowledge Chat</h1>
        <Badge variant="secondary" className="text-xs">
          GPT-4o-mini
        </Badge>
      </div>
      <ChatMessageList messages={messages} isLoading={isLoading} messagesEndRef={messagesEndRef} />
      <ChatInputBar
        input={input}
        isLoading={isLoading}
        onChange={setInput}
        onKeyDown={handleKeyDown}
        onSend={handleSend}
      />
    </div>
  );
}
