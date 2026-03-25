'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { MessageSquare } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { type PortalMessage, usePortalMessages, useSendPortalMessage } from '@/hooks/usePortalMessages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

const sendMessageSchema = z.object({
  subject: z.string().max(255).optional(),
  message: z.string().min(1, 'Message is required').max(5000),
});

type SendMessageValues = z.infer<typeof sendMessageSchema>;

function MessageCard({ msg }: { msg: PortalMessage }) {
  return (
    <div
      className={`rounded-xl border p-4 shadow-sm transition-colors ${msg.is_read ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div>
          {msg.subject && <p className="text-sm font-semibold text-gray-900">{msg.subject}</p>}
          <p className="text-xs text-gray-500">
            {msg.sender_type === 'client' ? 'You' : 'Team'} &middot;{' '}
            {new Date(msg.created_at).toLocaleString('en-CA', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
        </div>
        {!msg.is_read && (
          <span className="inline-block w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />
        )}
      </div>
      <p className="text-sm text-gray-700 whitespace-pre-wrap mt-2">{msg.body}</p>
    </div>
  );
}

function MessagesSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-28 w-full rounded-xl" />
    </div>
  );
}

function ComposeForm({ projectId }: { projectId: string }) {
  const { mutate: sendMessage, isPending, error } = useSendPortalMessage(projectId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SendMessageValues>({
    resolver: zodResolver(sendMessageSchema),
  });

  const onSubmit = (values: SendMessageValues) => {
    sendMessage(
      {
        subject: values.subject?.trim() || undefined,
        message: values.message.trim(),
      },
      { onSuccess: () => reset() },
    );
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm space-y-3"
    >
      <h3 className="text-sm font-medium text-gray-700">New Message</h3>
      <Input
        {...register('subject')}
        placeholder="Subject (optional)"
        aria-label="Message subject"
      />
      <Textarea
        {...register('message')}
        placeholder="Type your message..."
        rows={3}
        className="resize-none"
        aria-label="Message body"
        aria-required="true"
      />
      {errors.message && (
        <p className="text-xs text-red-600" role="alert">
          {errors.message.message}
        </p>
      )}
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error.message}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? 'Sending...' : 'Send Message'}
        </Button>
      </div>
    </form>
  );
}

export default function PortalMessagesPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const { data, isLoading, isError, error } = usePortalMessages(projectId);

  const messages = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Messages</h2>
        {!isLoading && (
          <span className="text-sm text-gray-500">
            {total} message{total !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <ComposeForm projectId={projectId} />
      {isError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700" role="alert">
          {error.message}
        </div>
      )}
      {isLoading ? (
        <MessagesSkeleton />
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3">
          <MessageSquare className="h-10 w-10" />
          <p className="text-sm">No messages yet. Start a conversation above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <MessageCard key={msg.id} msg={msg} />
          ))}
        </div>
      )}
    </div>
  );
}
