export interface ProcessorResult {
  processed: number;
  completed: number;
  errors: string[];
  deadLettered: number;
}

/**
 * Email sender callback — injected by the cron route to send real emails.
 * If not provided, the processor only creates outreach_event records.
 */
export interface EmailSender {
  send(params: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    enrollmentId: string;
    leadId: string;
  }): Promise<{ success: boolean; error?: string }>;
}

/**
 * Template resolver — injected by cron route to fetch and render email templates.
 * @param outreachEventId — when provided, enables open/click tracking pixel injection.
 */
export interface TemplateResolver {
  resolve(
    templateId: string,
    variables: Record<string, string>,
    outreachEventId?: string,
  ): Promise<{ subject: string; html: string; text?: string } | null>;
}

export interface ProcessorOptions {
  emailSender?: EmailSender;
  templateResolver?: TemplateResolver;
  onTaskCreated?: (params: {
    assigneeEmail: string;
    assigneeName: string;
    taskTitle: string;
    leadCompany: string;
    leadId: string;
  }) => Promise<void>;
}
