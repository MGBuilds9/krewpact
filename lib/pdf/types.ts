export interface EstimatePdfData {
  companyName: string;
  estimateNumber?: string;
  date?: string;
  client?: {
    name: string;
    address?: string;
    email?: string;
  };
  lineItems?: Array<{
    description: string;
    quantity: number;
    unit?: string;
    unitCost: number;
    markup?: number;
  }>;
  subtotal?: number;
  markupTotal?: number;
  taxRate?: number;
  taxAmount?: number;
  total?: number;
  terms?: string;
}

export interface ProjectStatusPdfData {
  companyName: string;
  project?: {
    name: string;
    code?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  };
  milestones?: Array<{
    name: string;
    progress: number;
    dueDate?: string;
  }>;
  taskSummary?: {
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
  };
  recentLogs?: Array<{
    date: string;
    author: string;
    summary: string;
  }>;
}

export type PdfTemplate = 'estimate' | 'project-status';
export type PdfData = EstimatePdfData | ProjectStatusPdfData;
