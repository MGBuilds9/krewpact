export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          account_name: string
          account_type: string
          billing_address: Json | null
          created_at: string
          created_by: string | null
          division_id: string | null
          id: string
          notes: string | null
          shipping_address: Json | null
          updated_at: string
        }
        Insert: {
          account_name: string
          account_type?: string
          billing_address?: Json | null
          created_at?: string
          created_by?: string | null
          division_id?: string | null
          id?: string
          notes?: string | null
          shipping_address?: Json | null
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_type?: string
          billing_address?: Json | null
          created_at?: string
          created_by?: string | null
          division_id?: string | null
          id?: string
          notes?: string | null
          shipping_address?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      activities: {
        Row: {
          account_id: string | null
          activity_type: string
          completed_at: string | null
          contact_id: string | null
          created_at: string
          details: string | null
          due_at: string | null
          id: string
          lead_id: string | null
          opportunity_id: string | null
          owner_user_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          activity_type: string
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          details?: string | null
          due_at?: string | null
          id?: string
          lead_id?: string | null
          opportunity_id?: string | null
          owner_user_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          activity_type?: string
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          details?: string | null
          due_at?: string | null
          id?: string
          lead_id?: string | null
          opportunity_id?: string | null
          owner_user_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_portal_id: string | null
          actor_user_id: string | null
          context: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_portal_id?: string | null
          actor_user_id?: string | null
          context?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_portal_id?: string | null
          actor_user_id?: string | null
          context?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          account_id: string | null
          communication_prefs: Json
          created_at: string
          email: string | null
          first_name: string
          id: string
          is_primary: boolean
          last_name: string
          phone: string | null
          role_title: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          communication_prefs?: Json
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          is_primary?: boolean
          last_name: string
          phone?: string | null
          role_title?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          communication_prefs?: Json
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          is_primary?: boolean
          last_name?: string
          phone?: string | null
          role_title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      divisions: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          settings: Json
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          settings?: Json
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: []
      }
      erp_sync_errors: {
        Row: {
          created_at: string
          error_code: string | null
          error_message: string
          error_payload: Json | null
          id: string
          job_id: string | null
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          error_message: string
          error_payload?: Json | null
          id?: string
          job_id?: string | null
        }
        Update: {
          created_at?: string
          error_code?: string | null
          error_message?: string
          error_payload?: Json | null
          id?: string
          job_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "erp_sync_errors_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "erp_sync_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_sync_events: {
        Row: {
          created_at: string
          event_payload: Json
          event_type: string
          id: string
          job_id: string | null
        }
        Insert: {
          created_at?: string
          event_payload: Json
          event_type: string
          id?: string
          job_id?: string | null
        }
        Update: {
          created_at?: string
          event_payload?: Json
          event_type?: string
          id?: string
          job_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "erp_sync_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "erp_sync_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_sync_jobs: {
        Row: {
          attempt_count: number
          completed_at: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          last_error: string | null
          max_attempts: number
          payload: Json
          scheduled_at: string
          started_at: string | null
          status: Database["public"]["Enums"]["sync_status"]
          sync_direction: Database["public"]["Enums"]["sync_direction"]
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          last_error?: string | null
          max_attempts?: number
          payload?: Json
          scheduled_at?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["sync_status"]
          sync_direction: Database["public"]["Enums"]["sync_direction"]
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          last_error?: string | null
          max_attempts?: number
          payload?: Json
          scheduled_at?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["sync_status"]
          sync_direction?: Database["public"]["Enums"]["sync_direction"]
          updated_at?: string
        }
        Relationships: []
      }
      erp_sync_map: {
        Row: {
          created_at: string
          direction: Database["public"]["Enums"]["sync_direction"]
          entity_type: string
          erp_docname: string
          erp_doctype: string
          id: string
          local_id: string | null
          local_key: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          direction: Database["public"]["Enums"]["sync_direction"]
          entity_type: string
          erp_docname: string
          erp_doctype: string
          id?: string
          local_id?: string | null
          local_key?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          direction?: Database["public"]["Enums"]["sync_direction"]
          entity_type?: string
          erp_docname?: string
          erp_doctype?: string
          id?: string
          local_id?: string | null
          local_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      estimate_lines: {
        Row: {
          assembly_id: string | null
          catalog_item_id: string | null
          created_at: string
          description: string
          estimate_id: string
          id: string
          is_optional: boolean
          line_total: number
          line_type: string
          markup_pct: number
          metadata: Json
          parent_line_id: string | null
          quantity: number
          sort_order: number
          unit: string | null
          unit_cost: number
          updated_at: string
        }
        Insert: {
          assembly_id?: string | null
          catalog_item_id?: string | null
          created_at?: string
          description: string
          estimate_id: string
          id?: string
          is_optional?: boolean
          line_total?: number
          line_type?: string
          markup_pct?: number
          metadata?: Json
          parent_line_id?: string | null
          quantity?: number
          sort_order?: number
          unit?: string | null
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          assembly_id?: string | null
          catalog_item_id?: string | null
          created_at?: string
          description?: string
          estimate_id?: string
          id?: string
          is_optional?: boolean
          line_total?: number
          line_type?: string
          markup_pct?: number
          metadata?: Json
          parent_line_id?: string | null
          quantity?: number
          sort_order?: number
          unit?: string | null
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimate_lines_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_lines_parent_line_id_fkey"
            columns: ["parent_line_id"]
            isOneToOne: false
            referencedRelation: "estimate_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_versions: {
        Row: {
          created_at: string
          created_by: string | null
          estimate_id: string
          id: string
          reason: string | null
          revision_no: number
          snapshot: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          estimate_id: string
          id?: string
          reason?: string | null
          revision_no: number
          snapshot: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          estimate_id?: string
          id?: string
          reason?: string | null
          revision_no?: number
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "estimate_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_versions_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          account_id: string | null
          approved_at: string | null
          approved_by: string | null
          contact_id: string | null
          created_at: string
          currency_code: string
          division_id: string | null
          estimate_number: string
          id: string
          margin_pct: number | null
          metadata: Json
          opportunity_id: string | null
          owner_user_id: string | null
          revision_no: number
          status: Database["public"]["Enums"]["estimate_status"]
          subtotal_amount: number
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          contact_id?: string | null
          created_at?: string
          currency_code?: string
          division_id?: string | null
          estimate_number: string
          id?: string
          margin_pct?: number | null
          metadata?: Json
          opportunity_id?: string | null
          owner_user_id?: string | null
          revision_no?: number
          status?: Database["public"]["Enums"]["estimate_status"]
          subtotal_amount?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          contact_id?: string | null
          created_at?: string
          currency_code?: string
          division_id?: string | null
          estimate_number?: string
          id?: string
          margin_pct?: number | null
          metadata?: Json
          opportunity_id?: string | null
          owner_user_id?: string | null
          revision_no?: number
          status?: Database["public"]["Enums"]["estimate_status"]
          subtotal_amount?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimates_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_claims: {
        Row: {
          amount: number
          category: string
          created_at: string
          currency_code: string
          description: string | null
          division_id: string | null
          erp_document_id: string | null
          erp_document_type: string | null
          expense_date: string
          id: string
          posted_at: string | null
          project_id: string | null
          status: Database["public"]["Enums"]["expense_status"]
          submitted_at: string | null
          tax_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          currency_code?: string
          description?: string | null
          division_id?: string | null
          erp_document_id?: string | null
          erp_document_type?: string | null
          expense_date: string
          id?: string
          posted_at?: string | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          submitted_at?: string | null
          tax_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          currency_code?: string
          description?: string | null
          division_id?: string | null
          erp_document_id?: string | null
          erp_document_type?: string | null
          expense_date?: string
          id?: string
          posted_at?: string | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          submitted_at?: string | null
          tax_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_claims_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_claims_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          company_name: string | null
          created_at: string
          division_id: string | null
          email: string | null
          engagement_score: number | null
          enrichment_data: Json | null
          enrichment_status: string | null
          estimated_value: number | null
          fit_score: number | null
          id: string
          intent_score: number | null
          lead_name: string
          lost_reason: string | null
          metadata: Json
          phone: string | null
          probability_pct: number | null
          source: string | null
          stage: Database["public"]["Enums"]["lead_stage"]
          total_score: number | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          company_name?: string | null
          created_at?: string
          division_id?: string | null
          email?: string | null
          engagement_score?: number | null
          enrichment_data?: Json | null
          enrichment_status?: string | null
          estimated_value?: number | null
          fit_score?: number | null
          id?: string
          intent_score?: number | null
          lead_name: string
          lost_reason?: string | null
          metadata?: Json
          phone?: string | null
          probability_pct?: number | null
          source?: string | null
          stage?: Database["public"]["Enums"]["lead_stage"]
          total_score?: number | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          company_name?: string | null
          created_at?: string
          division_id?: string | null
          email?: string | null
          engagement_score?: number | null
          enrichment_data?: Json | null
          enrichment_status?: string | null
          estimated_value?: number | null
          fit_score?: number | null
          id?: string
          intent_score?: number | null
          lead_name?: string
          lost_reason?: string | null
          metadata?: Json
          phone?: string | null
          probability_pct?: number | null
          source?: string | null
          stage?: Database["public"]["Enums"]["lead_stage"]
          total_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          actual_date: string | null
          created_at: string
          id: string
          milestone_name: string
          milestone_order: number
          owner_user_id: string | null
          planned_date: string | null
          project_id: string
          status: Database["public"]["Enums"]["workflow_state"]
          updated_at: string
        }
        Insert: {
          actual_date?: string | null
          created_at?: string
          id?: string
          milestone_name: string
          milestone_order?: number
          owner_user_id?: string | null
          planned_date?: string | null
          project_id: string
          status?: Database["public"]["Enums"]["workflow_state"]
          updated_at?: string
        }
        Update: {
          actual_date?: string | null
          created_at?: string
          id?: string
          milestone_name?: string
          milestone_order?: number
          owner_user_id?: string | null
          planned_date?: string | null
          project_id?: string
          status?: Database["public"]["Enums"]["workflow_state"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_enabled: boolean
          id: string
          in_app_enabled: boolean
          push_enabled: boolean
          quiet_hours: Json | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          push_enabled?: boolean
          quiet_hours?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          push_enabled?: boolean
          quiet_hours?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          id: string
          message: string | null
          payload: Json
          portal_account_id: string | null
          read_at: string | null
          send_at: string | null
          sent_at: string | null
          state: Database["public"]["Enums"]["notification_state"]
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          message?: string | null
          payload?: Json
          portal_account_id?: string | null
          read_at?: string | null
          send_at?: string | null
          sent_at?: string | null
          state?: Database["public"]["Enums"]["notification_state"]
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          message?: string | null
          payload?: Json
          portal_account_id?: string | null
          read_at?: string | null
          send_at?: string | null
          sent_at?: string | null
          state?: Database["public"]["Enums"]["notification_state"]
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          account_id: string | null
          contact_id: string | null
          created_at: string
          division_id: string | null
          estimated_revenue: number | null
          id: string
          lead_id: string | null
          notes: string | null
          opportunity_name: string
          owner_user_id: string | null
          probability_pct: number | null
          stage: Database["public"]["Enums"]["opportunity_stage"]
          target_close_date: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          contact_id?: string | null
          created_at?: string
          division_id?: string | null
          estimated_revenue?: number | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          opportunity_name: string
          owner_user_id?: string | null
          probability_pct?: number | null
          stage?: Database["public"]["Enums"]["opportunity_stage"]
          target_close_date?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          contact_id?: string | null
          created_at?: string
          division_id?: string | null
          estimated_revenue?: number | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          opportunity_name?: string
          owner_user_id?: string | null
          probability_pct?: number | null
          stage?: Database["public"]["Enums"]["opportunity_stage"]
          target_close_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_stage_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          from_stage: Database["public"]["Enums"]["opportunity_stage"] | null
          id: string
          opportunity_id: string
          reason: string | null
          to_stage: Database["public"]["Enums"]["opportunity_stage"]
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          from_stage?: Database["public"]["Enums"]["opportunity_stage"] | null
          id?: string
          opportunity_id: string
          reason?: string | null
          to_stage: Database["public"]["Enums"]["opportunity_stage"]
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          from_stage?: Database["public"]["Enums"]["opportunity_stage"] | null
          id?: string
          opportunity_id?: string
          reason?: string | null
          to_stage?: Database["public"]["Enums"]["opportunity_stage"]
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_stage_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_stage_history_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      project_daily_logs: {
        Row: {
          created_at: string
          crew_count: number | null
          delays: string | null
          id: string
          is_offline_origin: boolean
          log_date: string
          project_id: string
          safety_notes: string | null
          submitted_at: string | null
          submitted_by: string | null
          sync_client_id: string | null
          updated_at: string
          weather: Json | null
          work_summary: string | null
        }
        Insert: {
          created_at?: string
          crew_count?: number | null
          delays?: string | null
          id?: string
          is_offline_origin?: boolean
          log_date: string
          project_id: string
          safety_notes?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          sync_client_id?: string | null
          updated_at?: string
          weather?: Json | null
          work_summary?: string | null
        }
        Update: {
          created_at?: string
          crew_count?: number | null
          delays?: string | null
          id?: string
          is_offline_origin?: boolean
          log_date?: string
          project_id?: string
          safety_notes?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          sync_client_id?: string | null
          updated_at?: string
          weather?: Json | null
          work_summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_daily_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_daily_logs_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          allocation_pct: number | null
          id: string
          joined_at: string
          left_at: string | null
          member_role: string
          project_id: string
          user_id: string
        }
        Insert: {
          allocation_pct?: number | null
          id?: string
          joined_at?: string
          left_at?: string | null
          member_role: string
          project_id: string
          user_id: string
        }
        Update: {
          allocation_pct?: number | null
          id?: string
          joined_at?: string
          left_at?: string | null
          member_role?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          account_id: string | null
          actual_completion_date: string | null
          baseline_budget: number
          baseline_schedule: Json | null
          contact_id: string | null
          contract_id: string | null
          created_at: string
          created_by: string | null
          current_budget: number
          division_id: string
          id: string
          metadata: Json
          project_name: string
          project_number: string
          site_address: Json | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          target_completion_date: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          actual_completion_date?: string | null
          baseline_budget?: number
          baseline_schedule?: Json | null
          contact_id?: string | null
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          current_budget?: number
          division_id: string
          id?: string
          metadata?: Json
          project_name: string
          project_number: string
          site_address?: Json | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          target_completion_date?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          actual_completion_date?: string | null
          baseline_budget?: number
          baseline_schedule?: Json | null
          contact_id?: string | null
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          current_budget?: number
          division_id?: string
          id?: string
          metadata?: Json
          project_name?: string
          project_number?: string
          site_address?: Json | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          target_completion_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          id: string
          is_system: boolean
          role_key: string
          role_name: string
          scope: Database["public"]["Enums"]["role_scope"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_system?: boolean
          role_key: string
          role_name: string
          scope?: Database["public"]["Enums"]["role_scope"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_system?: boolean
          role_key?: string
          role_name?: string
          scope?: Database["public"]["Enums"]["role_scope"]
          updated_at?: string
        }
        Relationships: []
      }
      task_comments: {
        Row: {
          author_user_id: string | null
          comment_text: string
          created_at: string
          id: string
          task_id: string
          updated_at: string
        }
        Insert: {
          author_user_id?: string | null
          comment_text: string
          created_at?: string
          id?: string
          task_id: string
          updated_at?: string
        }
        Update: {
          author_user_id?: string | null
          comment_text?: string
          created_at?: string
          id?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_user_id: string | null
          blocked_reason: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_at: string | null
          id: string
          metadata: Json
          milestone_id: string | null
          priority: string
          project_id: string
          start_at: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_user_id?: string | null
          blocked_reason?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          metadata?: Json
          milestone_id?: string | null
          priority?: string
          project_id: string
          start_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_user_id?: string | null
          blocked_reason?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          metadata?: Json
          milestone_id?: string | null
          priority?: string
          project_id?: string
          start_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_divisions: {
        Row: {
          division_id: string
          id: string
          is_primary: boolean
          joined_at: string
          left_at: string | null
          user_id: string
        }
        Insert: {
          division_id: string
          id?: string
          is_primary?: boolean
          joined_at?: string
          left_at?: string | null
          user_id: string
        }
        Update: {
          division_id?: string
          id?: string
          is_primary?: boolean
          joined_at?: string
          left_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_divisions_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_divisions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_by: string | null
          created_at: string
          division_id: string | null
          ends_at: string | null
          id: string
          is_primary: boolean
          project_id: string | null
          role_id: string
          starts_at: string | null
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          division_id?: string | null
          ends_at?: string | null
          id?: string
          is_primary?: boolean
          project_id?: string | null
          role_id: string
          starts_at?: string | null
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          division_id?: string | null
          ends_at?: string | null
          id?: string
          is_primary?: boolean
          project_id?: string | null
          role_id?: string
          starts_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          clerk_user_id: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          locale: string
          phone: string | null
          status: Database["public"]["Enums"]["user_status"]
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          clerk_user_id?: string | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          locale?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          clerk_user_id?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          locale?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_platform_admin: { Args: never; Returns: boolean }
      krewpact_divisions: { Args: never; Returns: Json }
      krewpact_roles: { Args: never; Returns: Json }
      krewpact_user_id: { Args: never; Returns: string }
    }
    Enums: {
      estimate_status:
        | "draft"
        | "review"
        | "sent"
        | "approved"
        | "rejected"
        | "superseded"
      expense_status: "draft" | "submitted" | "approved" | "rejected" | "posted"
      lead_stage:
        | "new"
        | "qualified"
        | "estimating"
        | "proposal_sent"
        | "won"
        | "lost"
      notification_channel: "in_app" | "email" | "push" | "sms"
      notification_state: "queued" | "sent" | "delivered" | "failed" | "read"
      opportunity_stage:
        | "intake"
        | "site_visit"
        | "estimating"
        | "proposal"
        | "negotiation"
        | "contracted"
        | "closed_lost"
      project_status:
        | "planning"
        | "active"
        | "on_hold"
        | "substantial_complete"
        | "closed"
        | "cancelled"
      role_scope: "company" | "division" | "project"
      sync_direction: "outbound" | "inbound"
      sync_status:
        | "queued"
        | "processing"
        | "succeeded"
        | "failed"
        | "dead_letter"
      task_status: "todo" | "in_progress" | "blocked" | "done" | "cancelled"
      user_status: "active" | "inactive" | "invited" | "archived"
      workflow_state:
        | "draft"
        | "submitted"
        | "in_review"
        | "approved"
        | "rejected"
        | "void"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      estimate_status: [
        "draft",
        "review",
        "sent",
        "approved",
        "rejected",
        "superseded",
      ],
      expense_status: ["draft", "submitted", "approved", "rejected", "posted"],
      lead_stage: [
        "new",
        "qualified",
        "estimating",
        "proposal_sent",
        "won",
        "lost",
      ],
      notification_channel: ["in_app", "email", "push", "sms"],
      notification_state: ["queued", "sent", "delivered", "failed", "read"],
      opportunity_stage: [
        "intake",
        "site_visit",
        "estimating",
        "proposal",
        "negotiation",
        "contracted",
        "closed_lost",
      ],
      project_status: [
        "planning",
        "active",
        "on_hold",
        "substantial_complete",
        "closed",
        "cancelled",
      ],
      role_scope: ["company", "division", "project"],
      sync_direction: ["outbound", "inbound"],
      sync_status: [
        "queued",
        "processing",
        "succeeded",
        "failed",
        "dead_letter",
      ],
      task_status: ["todo", "in_progress", "blocked", "done", "cancelled"],
      user_status: ["active", "inactive", "invited", "archived"],
      workflow_state: [
        "draft",
        "submitted",
        "in_review",
        "approved",
        "rejected",
        "void",
      ],
    },
  },
} as const
