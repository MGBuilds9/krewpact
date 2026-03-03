export interface GraphMessage {
  id: string;
  subject: string | null;
  bodyPreview: string;
  body?: { contentType: string; content: string };
  from: { emailAddress: { name: string; address: string } } | null;
  toRecipients: Array<{ emailAddress: { name: string; address: string } }>;
  ccRecipients?: Array<{ emailAddress: { name: string; address: string } }>;
  receivedDateTime: string;
  sentDateTime: string;
  isRead: boolean;
  hasAttachments: boolean;
  importance: 'low' | 'normal' | 'high';
  webLink: string;
  conversationId: string;
}

export interface GraphEvent {
  id: string;
  subject: string;
  bodyPreview: string;
  body?: { contentType: string; content: string };
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: { displayName: string };
  organizer?: { emailAddress: { name: string; address: string } };
  attendees?: Array<{
    emailAddress: { name: string; address: string };
    status: { response: string };
  }>;
  isAllDay: boolean;
  webLink: string;
  onlineMeetingUrl?: string | null;
}

export interface GraphListResponse<T> {
  value: T[];
  '@odata.nextLink'?: string;
  '@odata.count'?: number;
}

export interface SendMessagePayload {
  message: {
    subject: string;
    body: { contentType: 'Text' | 'HTML'; content: string };
    toRecipients: Array<{ emailAddress: { name?: string; address: string } }>;
    ccRecipients?: Array<{ emailAddress: { name?: string; address: string } }>;
  };
  saveToSentItems?: boolean;
}

export interface CreateEventPayload {
  subject: string;
  body?: { contentType: 'Text' | 'HTML'; content: string };
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: { displayName: string };
  attendees?: Array<{
    emailAddress: { name?: string; address: string };
    type: 'required' | 'optional';
  }>;
}
