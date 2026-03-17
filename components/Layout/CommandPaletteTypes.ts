import {
  BarChart3,
  Bell,
  Building2,
  Calculator,
  Calendar,
  CheckSquare,
  FileText,
  FolderKanban,
  Gavel,
  ListTodo,
  Phone,
  Plus,
  Settings,
  Shield,
  Target,
  TrendingUp,
  User,
  Users,
} from 'lucide-react';
import React from 'react';

export interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  adminOnly?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export interface EntityResult {
  id: string;
  name: string;
  subtitle: string | null;
}

export type EntityType =
  | 'leads'
  | 'accounts'
  | 'contacts'
  | 'opportunities'
  | 'estimates'
  | 'projects'
  | 'tasks';

export interface GlobalSearchResults {
  leads: EntityResult[];
  accounts: EntityResult[];
  contacts: EntityResult[];
  opportunities: EntityResult[];
  estimates: EntityResult[];
  projects: EntityResult[];
  tasks: EntityResult[];
}

export interface FlatSearchResult {
  entityType: EntityType;
  result: EntityResult;
}

export const navigationSections: NavSection[] = [
  {
    title: 'CRM',
    items: [
      { icon: Building2, label: 'Dashboard', href: '/crm/dashboard' },
      { icon: ListTodo, label: 'My Tasks', href: '/crm/tasks' },
      { icon: Building2, label: 'Leads', href: '/crm/leads' },
      { icon: Building2, label: 'Accounts', href: '/crm/accounts' },
      { icon: User, label: 'Contacts', href: '/crm/contacts' },
      { icon: TrendingUp, label: 'Pipeline', href: '/crm/opportunities' },
      { icon: Building2, label: 'Sequences', href: '/crm/sequences' },
      { icon: Gavel, label: 'Bidding', href: '/crm/bidding' },
      { icon: Building2, label: 'Enrichment', href: '/crm/enrichment' },
      { icon: BarChart3, label: 'CRM Report', href: '/reports/crm-overview' },
    ],
  },
  {
    title: 'Projects',
    items: [
      { icon: FolderKanban, label: 'Projects', href: '/projects' },
      { icon: Calendar, label: 'Schedule', href: '/schedule' },
      { icon: Users, label: 'Team', href: '/team' },
    ],
  },
  {
    title: 'Resources',
    items: [{ icon: FileText, label: 'Documents', href: '/documents' }],
  },
  {
    title: 'Actions',
    items: [
      { icon: Plus, label: 'New Lead', href: '/crm/leads/new' },
      { icon: Plus, label: 'New Account', href: '/crm/accounts/new' },
      { icon: Plus, label: 'New Contact', href: '/crm/contacts/new' },
      { icon: Plus, label: 'New Opportunity', href: '/crm/opportunities/new' },
      { icon: Plus, label: 'New Bid', href: '/crm/bidding/new' },
    ],
  },
  {
    title: 'System',
    items: [
      { icon: Settings, label: 'Settings', href: '/settings' },
      { icon: Bell, label: 'Notifications', href: '/notifications' },
      { icon: Shield, label: 'Admin', href: '/admin', adminOnly: true },
    ],
  },
];

export const entityTypeConfig: Record<
  EntityType,
  { icon: React.ElementType; label: string; pathPrefix: string }
> = {
  leads: { icon: User, label: 'Leads', pathPrefix: '/crm/leads' },
  accounts: { icon: Building2, label: 'Accounts', pathPrefix: '/crm/accounts' },
  contacts: { icon: Phone, label: 'Contacts', pathPrefix: '/crm/contacts' },
  opportunities: { icon: Target, label: 'Opportunities', pathPrefix: '/crm/opportunities' },
  estimates: { icon: Calculator, label: 'Estimates', pathPrefix: '/estimates' },
  projects: { icon: FolderKanban, label: 'Projects', pathPrefix: '/projects' },
  tasks: { icon: CheckSquare, label: 'Tasks', pathPrefix: '/tasks' },
};

export const ENTITY_TYPE_ORDER: EntityType[] = [
  'leads',
  'accounts',
  'contacts',
  'opportunities',
  'estimates',
  'projects',
  'tasks',
];
