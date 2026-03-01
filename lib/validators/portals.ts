import { z } from 'zod';

// ============================================================
// Portal account schemas
// ============================================================

const actorTypes = ['client', 'trade_partner'] as const;

export const portalAccountInviteSchema = z.object({
  actor_type: z.enum(actorTypes),
  role: z.enum(['client_owner', 'client_delegate', 'trade_partner_admin', 'trade_partner_user']).optional(),
  projects: z.array(z.string().uuid()).optional(),
  company_name: z.string().optional(),
  contact_name: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
});

export const portalAccountUpdateSchema = z.object({
  company_name: z.string().optional(),
  contact_name: z.string().optional(),
  phone: z.string().optional(),
  status: z.string().optional(),
});

// ============================================================
// Portal permission schemas
// ============================================================

export const portalPermissionSchema = z.object({
  portal_account_id: z.string().uuid(),
  project_id: z.string().uuid(),
  permission_set: z.record(z.string(), z.unknown()),
});

// ============================================================
// Portal message schemas
// ============================================================

export const portalMessageSchema = z.object({
  portal_account_id: z.string().uuid().optional(),
  subject: z.string().optional(),
  body: z.string().min(1),
});

// ============================================================
// Client portal schemas
// ============================================================

export const clientChangeApprovalSchema = z.object({
  change_order_id: z.string().uuid(),
  approved: z.boolean(),
  notes: z.string().optional(),
});

export const clientSelectionSubmissionSchema = z.object({
  selection_sheet_id: z.string().uuid(),
  choices: z.array(z.object({
    selection_option_id: z.string().uuid(),
    quantity: z.number().min(0).optional(),
    notes: z.string().optional(),
  })),
});

export const clientMessageReplySchema = z.object({
  message_id: z.string().uuid(),
  body: z.string().min(1),
});

export const clientDeficiencyConfirmSchema = z.object({
  deficiency_id: z.string().uuid(),
  confirmed: z.boolean(),
  notes: z.string().optional(),
});

export const serviceCallIntakeSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
});

// ============================================================
// Trade portal schemas
// ============================================================

export const tradeOnboardingSchema = z.object({
  company_name: z.string().min(1),
  contact_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  trades: z.array(z.string()).min(1),
});

export const tradeComplianceUploadSchema = z.object({
  compliance_type: z.string().min(1),
  doc_number: z.string().optional(),
  issued_on: z.string().optional(),
  expires_on: z.string().optional(),
});

export const tradeBidSubmissionSchema = z.object({
  rfq_id: z.string().uuid(),
  subtotal_amount: z.number().min(0),
  tax_amount: z.number().min(0).optional(),
  total_amount: z.number().min(0),
  exclusions: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const tradeSubmittalSubmissionSchema = z.object({
  submittal_id: z.string().uuid(),
  notes: z.string().optional(),
});

export const tradeRFIResponseSchema = z.object({
  rfi_id: z.string().uuid(),
  message_text: z.string().min(1),
  is_official_response: z.boolean().optional(),
});

export const tradeTimeEntrySchema = z.object({
  project_id: z.string().uuid(),
  work_date: z.string().min(1),
  hours_regular: z.number().min(0).max(24),
  hours_overtime: z.number().min(0).max(24).optional(),
  cost_code: z.string().optional(),
  notes: z.string().optional(),
});

export const tradeSafetySubmissionSchema = z.object({
  form_type: z.string().min(1),
  form_date: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
});

// ============================================================
// Inferred types
// ============================================================

export type PortalAccountInvite = z.infer<typeof portalAccountInviteSchema>;
export type PortalAccountUpdate = z.infer<typeof portalAccountUpdateSchema>;
export type PortalPermission = z.infer<typeof portalPermissionSchema>;
export type PortalMessage = z.infer<typeof portalMessageSchema>;
export type ClientChangeApproval = z.infer<typeof clientChangeApprovalSchema>;
export type ClientSelectionSubmission = z.infer<typeof clientSelectionSubmissionSchema>;
export type ClientMessageReply = z.infer<typeof clientMessageReplySchema>;
export type ClientDeficiencyConfirm = z.infer<typeof clientDeficiencyConfirmSchema>;
export type ServiceCallIntake = z.infer<typeof serviceCallIntakeSchema>;
export type TradeOnboarding = z.infer<typeof tradeOnboardingSchema>;
export type TradeComplianceUpload = z.infer<typeof tradeComplianceUploadSchema>;
export type TradeBidSubmission = z.infer<typeof tradeBidSubmissionSchema>;
export type TradeSubmittalSubmission = z.infer<typeof tradeSubmittalSubmissionSchema>;
export type TradeRFIResponse = z.infer<typeof tradeRFIResponseSchema>;
export type TradeTimeEntry = z.infer<typeof tradeTimeEntrySchema>;
export type TradeSafetySubmission = z.infer<typeof tradeSafetySubmissionSchema>;
