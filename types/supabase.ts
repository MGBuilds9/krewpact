export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.1';
  };
  public: {
    Tables: {
      accounts: {
        Row: {
          account_name: string;
          account_type: string;
          billing_address: Json | null;
          created_at: string;
          created_by: string | null;
          division_id: string | null;
          id: string;
          notes: string | null;
          shipping_address: Json | null;
          updated_at: string;
        };
        Insert: {
          account_name: string;
          account_type?: string;
          billing_address?: Json | null;
          created_at?: string;
          created_by?: string | null;
          division_id?: string | null;
          id?: string;
          notes?: string | null;
          shipping_address?: Json | null;
          updated_at?: string;
        };
        Update: {
          account_name?: string;
          account_type?: string;
          billing_address?: Json | null;
          created_at?: string;
          created_by?: string | null;
          division_id?: string | null;
          id?: string;
          notes?: string | null;
          shipping_address?: Json | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'accounts_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'accounts_division_id_fkey';
            columns: ['division_id'];
            isOneToOne: false;
            referencedRelation: 'divisions';
            referencedColumns: ['id'];
          },
        ];
      };
      activities: {
        Row: {
          account_id: string | null;
          activity_type: string;
          completed_at: string | null;
          contact_id: string | null;
          created_at: string;
          details: string | null;
          due_at: string | null;
          id: string;
          lead_id: string | null;
          opportunity_id: string | null;
          owner_user_id: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          account_id?: string | null;
          activity_type: string;
          completed_at?: string | null;
          contact_id?: string | null;
          created_at?: string;
          details?: string | null;
          due_at?: string | null;
          id?: string;
          lead_id?: string | null;
          opportunity_id?: string | null;
          owner_user_id?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          account_id?: string | null;
          activity_type?: string;
          completed_at?: string | null;
          contact_id?: string | null;
          created_at?: string;
          details?: string | null;
          due_at?: string | null;
          id?: string;
          lead_id?: string | null;
          opportunity_id?: string | null;
          owner_user_id?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'activities_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'activities_opportunity_id_fkey';
            columns: ['opportunity_id'];
            isOneToOne: false;
            referencedRelation: 'opportunities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'activities_owner_user_id_fkey';
            columns: ['owner_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      assemblies: {
        Row: {
          assembly_code: string | null;
          assembly_name: string;
          created_at: string;
          created_by: string | null;
          description: string | null;
          division_id: string | null;
          id: string;
          is_active: boolean;
          unit: string;
          updated_at: string;
          version_no: number;
        };
        Insert: {
          assembly_code?: string | null;
          assembly_name: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          division_id?: string | null;
          id?: string;
          is_active?: boolean;
          unit: string;
          updated_at?: string;
          version_no?: number;
        };
        Update: {
          assembly_code?: string | null;
          assembly_name?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          division_id?: string | null;
          id?: string;
          is_active?: boolean;
          unit?: string;
          updated_at?: string;
          version_no?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'assemblies_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'assemblies_division_id_fkey';
            columns: ['division_id'];
            isOneToOne: false;
            referencedRelation: 'divisions';
            referencedColumns: ['id'];
          },
        ];
      };
      assembly_items: {
        Row: {
          assembly_id: string;
          catalog_item_id: string | null;
          created_at: string;
          description: string | null;
          id: string;
          line_type: string;
          metadata: Json;
          quantity: number;
          sort_order: number;
          unit_cost: number;
          updated_at: string;
        };
        Insert: {
          assembly_id: string;
          catalog_item_id?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          line_type: string;
          metadata?: Json;
          quantity?: number;
          sort_order?: number;
          unit_cost?: number;
          updated_at?: string;
        };
        Update: {
          assembly_id?: string;
          catalog_item_id?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          line_type?: string;
          metadata?: Json;
          quantity?: number;
          sort_order?: number;
          unit_cost?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'assembly_items_assembly_id_fkey';
            columns: ['assembly_id'];
            isOneToOne: false;
            referencedRelation: 'assemblies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'assembly_items_catalog_item_id_fkey';
            columns: ['catalog_item_id'];
            isOneToOne: false;
            referencedRelation: 'cost_catalog_items';
            referencedColumns: ['id'];
          },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_portal_id: string | null;
          actor_user_id: string | null;
          context: Json | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: string;
          ip_address: unknown;
          new_data: Json | null;
          old_data: Json | null;
          user_agent: string | null;
        };
        Insert: {
          action: string;
          actor_portal_id?: string | null;
          actor_user_id?: string | null;
          context?: Json | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
          ip_address?: unknown;
          new_data?: Json | null;
          old_data?: Json | null;
          user_agent?: string | null;
        };
        Update: {
          action?: string;
          actor_portal_id?: string | null;
          actor_user_id?: string | null;
          context?: Json | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
          ip_address?: unknown;
          new_data?: Json | null;
          old_data?: Json | null;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_logs_actor_user_id_fkey';
            columns: ['actor_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      contacts: {
        Row: {
          created_at: string;
          email: string | null;
          email_opted_in: boolean | null;
          first_name: string | null;
          full_name: string;
          id: string;
          is_decision_maker: boolean | null;
          is_primary: boolean | null;
          last_contacted_at: string | null;
          last_name: string | null;
          lead_id: string;
          linkedin_url: string | null;
          mobile: string | null;
          phone: string | null;
          phone_opted_in: boolean | null;
          preferred_channel: string | null;
          role: string | null;
          title: string | null;
          total_touches: number | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          email_opted_in?: boolean | null;
          first_name?: string | null;
          full_name: string;
          id?: string;
          is_decision_maker?: boolean | null;
          is_primary?: boolean | null;
          last_contacted_at?: string | null;
          last_name?: string | null;
          lead_id: string;
          linkedin_url?: string | null;
          mobile?: string | null;
          phone?: string | null;
          phone_opted_in?: boolean | null;
          preferred_channel?: string | null;
          role?: string | null;
          title?: string | null;
          total_touches?: number | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          email_opted_in?: boolean | null;
          first_name?: string | null;
          full_name?: string;
          id?: string;
          is_decision_maker?: boolean | null;
          is_primary?: boolean | null;
          last_contacted_at?: string | null;
          last_name?: string | null;
          lead_id?: string;
          linkedin_url?: string | null;
          mobile?: string | null;
          phone?: string | null;
          phone_opted_in?: boolean | null;
          preferred_channel?: string | null;
          role?: string | null;
          title?: string | null;
          total_touches?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'contacts_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['id'];
          },
        ];
      };
      contract_terms: {
        Row: {
          contract_status: Database['public']['Enums']['contract_status'];
          created_at: string;
          id: string;
          legal_text_version: string;
          proposal_id: string;
          signed_at: string | null;
          supersedes_contract_id: string | null;
          terms_payload: Json;
          updated_at: string;
        };
        Insert: {
          contract_status?: Database['public']['Enums']['contract_status'];
          created_at?: string;
          id?: string;
          legal_text_version: string;
          proposal_id: string;
          signed_at?: string | null;
          supersedes_contract_id?: string | null;
          terms_payload: Json;
          updated_at?: string;
        };
        Update: {
          contract_status?: Database['public']['Enums']['contract_status'];
          created_at?: string;
          id?: string;
          legal_text_version?: string;
          proposal_id?: string;
          signed_at?: string | null;
          supersedes_contract_id?: string | null;
          terms_payload?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'contract_terms_proposal_id_fkey';
            columns: ['proposal_id'];
            isOneToOne: false;
            referencedRelation: 'proposals';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contract_terms_supersedes_contract_id_fkey';
            columns: ['supersedes_contract_id'];
            isOneToOne: false;
            referencedRelation: 'contract_terms';
            referencedColumns: ['id'];
          },
        ];
      };
      cost_catalog_items: {
        Row: {
          base_cost: number;
          created_at: string;
          division_id: string | null;
          effective_from: string;
          effective_to: string | null;
          id: string;
          item_code: string | null;
          item_name: string;
          item_type: string;
          metadata: Json;
          unit: string;
          updated_at: string;
          vendor_name: string | null;
        };
        Insert: {
          base_cost: number;
          created_at?: string;
          division_id?: string | null;
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          item_code?: string | null;
          item_name: string;
          item_type: string;
          metadata?: Json;
          unit: string;
          updated_at?: string;
          vendor_name?: string | null;
        };
        Update: {
          base_cost?: number;
          created_at?: string;
          division_id?: string | null;
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          item_code?: string | null;
          item_name?: string;
          item_type?: string;
          metadata?: Json;
          unit?: string;
          updated_at?: string;
          vendor_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'cost_catalog_items_division_id_fkey';
            columns: ['division_id'];
            isOneToOne: false;
            referencedRelation: 'divisions';
            referencedColumns: ['id'];
          },
        ];
      };
      divisions: {
        Row: {
          code: string;
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
          settings: Json;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          settings?: Json;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          settings?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      email_templates: {
        Row: {
          body_html: string;
          body_text: string | null;
          category: string | null;
          created_at: string;
          division_id: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
          subject: string;
          updated_at: string;
          variables: Json | null;
        };
        Insert: {
          body_html: string;
          body_text?: string | null;
          category?: string | null;
          created_at?: string;
          division_id?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          subject: string;
          updated_at?: string;
          variables?: Json | null;
        };
        Update: {
          body_html?: string;
          body_text?: string | null;
          category?: string | null;
          created_at?: string;
          division_id?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          subject?: string;
          updated_at?: string;
          variables?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'email_templates_division_id_fkey';
            columns: ['division_id'];
            isOneToOne: false;
            referencedRelation: 'divisions';
            referencedColumns: ['id'];
          },
        ];
      };
      erp_sync_errors: {
        Row: {
          created_at: string;
          error_code: string | null;
          error_message: string;
          error_payload: Json | null;
          id: string;
          job_id: string | null;
        };
        Insert: {
          created_at?: string;
          error_code?: string | null;
          error_message: string;
          error_payload?: Json | null;
          id?: string;
          job_id?: string | null;
        };
        Update: {
          created_at?: string;
          error_code?: string | null;
          error_message?: string;
          error_payload?: Json | null;
          id?: string;
          job_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'erp_sync_errors_job_id_fkey';
            columns: ['job_id'];
            isOneToOne: false;
            referencedRelation: 'erp_sync_jobs';
            referencedColumns: ['id'];
          },
        ];
      };
      erp_sync_events: {
        Row: {
          created_at: string;
          event_payload: Json;
          event_type: string;
          id: string;
          job_id: string | null;
        };
        Insert: {
          created_at?: string;
          event_payload: Json;
          event_type: string;
          id?: string;
          job_id?: string | null;
        };
        Update: {
          created_at?: string;
          event_payload?: Json;
          event_type?: string;
          id?: string;
          job_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'erp_sync_events_job_id_fkey';
            columns: ['job_id'];
            isOneToOne: false;
            referencedRelation: 'erp_sync_jobs';
            referencedColumns: ['id'];
          },
        ];
      };
      erp_sync_jobs: {
        Row: {
          attempt_count: number;
          completed_at: string | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: string;
          last_error: string | null;
          max_attempts: number;
          payload: Json;
          scheduled_at: string;
          started_at: string | null;
          status: Database['public']['Enums']['sync_status'];
          sync_direction: Database['public']['Enums']['sync_direction'];
          updated_at: string;
        };
        Insert: {
          attempt_count?: number;
          completed_at?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
          last_error?: string | null;
          max_attempts?: number;
          payload?: Json;
          scheduled_at?: string;
          started_at?: string | null;
          status?: Database['public']['Enums']['sync_status'];
          sync_direction: Database['public']['Enums']['sync_direction'];
          updated_at?: string;
        };
        Update: {
          attempt_count?: number;
          completed_at?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
          last_error?: string | null;
          max_attempts?: number;
          payload?: Json;
          scheduled_at?: string;
          started_at?: string | null;
          status?: Database['public']['Enums']['sync_status'];
          sync_direction?: Database['public']['Enums']['sync_direction'];
          updated_at?: string;
        };
        Relationships: [];
      };
      erp_sync_map: {
        Row: {
          created_at: string;
          direction: Database['public']['Enums']['sync_direction'];
          entity_type: string;
          erp_docname: string;
          erp_doctype: string;
          id: string;
          local_id: string | null;
          local_key: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          direction: Database['public']['Enums']['sync_direction'];
          entity_type: string;
          erp_docname: string;
          erp_doctype: string;
          id?: string;
          local_id?: string | null;
          local_key?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          direction?: Database['public']['Enums']['sync_direction'];
          entity_type?: string;
          erp_docname?: string;
          erp_doctype?: string;
          id?: string;
          local_id?: string | null;
          local_key?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      esign_documents: {
        Row: {
          certificate_file_id: string | null;
          checksum_sha256: string | null;
          created_at: string;
          envelope_id: string;
          file_id: string | null;
          id: string;
          signed_at: string | null;
        };
        Insert: {
          certificate_file_id?: string | null;
          checksum_sha256?: string | null;
          created_at?: string;
          envelope_id: string;
          file_id?: string | null;
          id?: string;
          signed_at?: string | null;
        };
        Update: {
          certificate_file_id?: string | null;
          checksum_sha256?: string | null;
          created_at?: string;
          envelope_id?: string;
          file_id?: string | null;
          id?: string;
          signed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'esign_documents_envelope_id_fkey';
            columns: ['envelope_id'];
            isOneToOne: false;
            referencedRelation: 'esign_envelopes';
            referencedColumns: ['id'];
          },
        ];
      };
      esign_envelopes: {
        Row: {
          contract_id: string;
          created_at: string;
          id: string;
          payload: Json;
          provider: string;
          provider_envelope_id: string | null;
          signer_count: number;
          status: string;
          updated_at: string;
          webhook_last_event_at: string | null;
        };
        Insert: {
          contract_id: string;
          created_at?: string;
          id?: string;
          payload?: Json;
          provider?: string;
          provider_envelope_id?: string | null;
          signer_count?: number;
          status: string;
          updated_at?: string;
          webhook_last_event_at?: string | null;
        };
        Update: {
          contract_id?: string;
          created_at?: string;
          id?: string;
          payload?: Json;
          provider?: string;
          provider_envelope_id?: string | null;
          signer_count?: number;
          status?: string;
          updated_at?: string;
          webhook_last_event_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'esign_envelopes_contract_id_fkey';
            columns: ['contract_id'];
            isOneToOne: false;
            referencedRelation: 'contract_terms';
            referencedColumns: ['id'];
          },
        ];
      };
      estimate_allowances: {
        Row: {
          allowance_amount: number;
          allowance_name: string;
          created_at: string;
          estimate_id: string;
          id: string;
          notes: string | null;
          updated_at: string;
        };
        Insert: {
          allowance_amount?: number;
          allowance_name: string;
          created_at?: string;
          estimate_id: string;
          id?: string;
          notes?: string | null;
          updated_at?: string;
        };
        Update: {
          allowance_amount?: number;
          allowance_name?: string;
          created_at?: string;
          estimate_id?: string;
          id?: string;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'estimate_allowances_estimate_id_fkey';
            columns: ['estimate_id'];
            isOneToOne: false;
            referencedRelation: 'estimates';
            referencedColumns: ['id'];
          },
        ];
      };
      estimate_alternates: {
        Row: {
          amount: number;
          created_at: string;
          description: string | null;
          estimate_id: string;
          id: string;
          selected: boolean;
          title: string;
          updated_at: string;
        };
        Insert: {
          amount?: number;
          created_at?: string;
          description?: string | null;
          estimate_id: string;
          id?: string;
          selected?: boolean;
          title: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          description?: string | null;
          estimate_id?: string;
          id?: string;
          selected?: boolean;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'estimate_alternates_estimate_id_fkey';
            columns: ['estimate_id'];
            isOneToOne: false;
            referencedRelation: 'estimates';
            referencedColumns: ['id'];
          },
        ];
      };
      estimate_lines: {
        Row: {
          assembly_id: string | null;
          catalog_item_id: string | null;
          created_at: string;
          description: string;
          estimate_id: string;
          id: string;
          is_optional: boolean;
          line_total: number;
          line_type: string;
          markup_pct: number;
          metadata: Json;
          parent_line_id: string | null;
          quantity: number;
          sort_order: number;
          unit: string | null;
          unit_cost: number;
          updated_at: string;
        };
        Insert: {
          assembly_id?: string | null;
          catalog_item_id?: string | null;
          created_at?: string;
          description: string;
          estimate_id: string;
          id?: string;
          is_optional?: boolean;
          line_total?: number;
          line_type?: string;
          markup_pct?: number;
          metadata?: Json;
          parent_line_id?: string | null;
          quantity?: number;
          sort_order?: number;
          unit?: string | null;
          unit_cost?: number;
          updated_at?: string;
        };
        Update: {
          assembly_id?: string | null;
          catalog_item_id?: string | null;
          created_at?: string;
          description?: string;
          estimate_id?: string;
          id?: string;
          is_optional?: boolean;
          line_total?: number;
          line_type?: string;
          markup_pct?: number;
          metadata?: Json;
          parent_line_id?: string | null;
          quantity?: number;
          sort_order?: number;
          unit?: string | null;
          unit_cost?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'estimate_lines_estimate_id_fkey';
            columns: ['estimate_id'];
            isOneToOne: false;
            referencedRelation: 'estimates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'estimate_lines_parent_line_id_fkey';
            columns: ['parent_line_id'];
            isOneToOne: false;
            referencedRelation: 'estimate_lines';
            referencedColumns: ['id'];
          },
        ];
      };
      estimate_templates: {
        Row: {
          created_at: string;
          created_by: string | null;
          division_id: string | null;
          id: string;
          is_default: boolean;
          payload: Json;
          project_type: string | null;
          template_name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          division_id?: string | null;
          id?: string;
          is_default?: boolean;
          payload: Json;
          project_type?: string | null;
          template_name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          division_id?: string | null;
          id?: string;
          is_default?: boolean;
          payload?: Json;
          project_type?: string | null;
          template_name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'estimate_templates_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'estimate_templates_division_id_fkey';
            columns: ['division_id'];
            isOneToOne: false;
            referencedRelation: 'divisions';
            referencedColumns: ['id'];
          },
        ];
      };
      estimate_versions: {
        Row: {
          created_at: string;
          created_by: string | null;
          estimate_id: string;
          id: string;
          reason: string | null;
          revision_no: number;
          snapshot: Json;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          estimate_id: string;
          id?: string;
          reason?: string | null;
          revision_no: number;
          snapshot: Json;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          estimate_id?: string;
          id?: string;
          reason?: string | null;
          revision_no?: number;
          snapshot?: Json;
        };
        Relationships: [
          {
            foreignKeyName: 'estimate_versions_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'estimate_versions_estimate_id_fkey';
            columns: ['estimate_id'];
            isOneToOne: false;
            referencedRelation: 'estimates';
            referencedColumns: ['id'];
          },
        ];
      };
      estimates: {
        Row: {
          account_id: string | null;
          approved_at: string | null;
          approved_by: string | null;
          contact_id: string | null;
          created_at: string;
          currency_code: string;
          division_id: string | null;
          estimate_number: string;
          id: string;
          margin_pct: number | null;
          metadata: Json;
          opportunity_id: string | null;
          owner_user_id: string | null;
          revision_no: number;
          status: Database['public']['Enums']['estimate_status'];
          subtotal_amount: number;
          tax_amount: number;
          total_amount: number;
          updated_at: string;
        };
        Insert: {
          account_id?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          contact_id?: string | null;
          created_at?: string;
          currency_code?: string;
          division_id?: string | null;
          estimate_number: string;
          id?: string;
          margin_pct?: number | null;
          metadata?: Json;
          opportunity_id?: string | null;
          owner_user_id?: string | null;
          revision_no?: number;
          status?: Database['public']['Enums']['estimate_status'];
          subtotal_amount?: number;
          tax_amount?: number;
          total_amount?: number;
          updated_at?: string;
        };
        Update: {
          account_id?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          contact_id?: string | null;
          created_at?: string;
          currency_code?: string;
          division_id?: string | null;
          estimate_number?: string;
          id?: string;
          margin_pct?: number | null;
          metadata?: Json;
          opportunity_id?: string | null;
          owner_user_id?: string | null;
          revision_no?: number;
          status?: Database['public']['Enums']['estimate_status'];
          subtotal_amount?: number;
          tax_amount?: number;
          total_amount?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'estimates_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'estimates_approved_by_fkey';
            columns: ['approved_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'estimates_division_id_fkey';
            columns: ['division_id'];
            isOneToOne: false;
            referencedRelation: 'divisions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'estimates_opportunity_id_fkey';
            columns: ['opportunity_id'];
            isOneToOne: false;
            referencedRelation: 'opportunities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'estimates_owner_user_id_fkey';
            columns: ['owner_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      expense_claims: {
        Row: {
          amount: number;
          category: string;
          created_at: string;
          currency_code: string;
          description: string | null;
          division_id: string | null;
          erp_document_id: string | null;
          erp_document_type: string | null;
          expense_date: string;
          id: string;
          posted_at: string | null;
          project_id: string | null;
          status: Database['public']['Enums']['expense_status'];
          submitted_at: string | null;
          tax_amount: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          category: string;
          created_at?: string;
          currency_code?: string;
          description?: string | null;
          division_id?: string | null;
          erp_document_id?: string | null;
          erp_document_type?: string | null;
          expense_date: string;
          id?: string;
          posted_at?: string | null;
          project_id?: string | null;
          status?: Database['public']['Enums']['expense_status'];
          submitted_at?: string | null;
          tax_amount?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          category?: string;
          created_at?: string;
          currency_code?: string;
          description?: string | null;
          division_id?: string | null;
          erp_document_id?: string | null;
          erp_document_type?: string | null;
          expense_date?: string;
          id?: string;
          posted_at?: string | null;
          project_id?: string | null;
          status?: Database['public']['Enums']['expense_status'];
          submitted_at?: string | null;
          tax_amount?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'expense_claims_division_id_fkey';
            columns: ['division_id'];
            isOneToOne: false;
            referencedRelation: 'divisions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expense_claims_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expense_claims_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      file_folders: {
        Row: {
          created_at: string;
          created_by: string | null;
          folder_name: string;
          folder_path: string;
          id: string;
          parent_folder_id: string | null;
          project_id: string | null;
          updated_at: string;
          visibility: Database['public']['Enums']['file_visibility'];
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          folder_name: string;
          folder_path: string;
          id?: string;
          parent_folder_id?: string | null;
          project_id?: string | null;
          updated_at?: string;
          visibility?: Database['public']['Enums']['file_visibility'];
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          folder_name?: string;
          folder_path?: string;
          id?: string;
          parent_folder_id?: string | null;
          project_id?: string | null;
          updated_at?: string;
          visibility?: Database['public']['Enums']['file_visibility'];
        };
        Relationships: [
          {
            foreignKeyName: 'file_folders_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'file_folders_parent_folder_id_fkey';
            columns: ['parent_folder_id'];
            isOneToOne: false;
            referencedRelation: 'file_folders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'file_folders_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      file_metadata: {
        Row: {
          checksum_sha256: string | null;
          created_at: string;
          deleted_at: string | null;
          file_path: string;
          file_size_bytes: number;
          filename: string;
          folder_id: string | null;
          id: string;
          is_deleted: boolean;
          mime_type: string | null;
          original_filename: string;
          project_id: string | null;
          source_identifier: string | null;
          source_system: string | null;
          storage_bucket: string;
          tags: string[] | null;
          updated_at: string;
          uploaded_by: string | null;
          version_no: number;
          visibility: Database['public']['Enums']['file_visibility'];
        };
        Insert: {
          checksum_sha256?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          file_path: string;
          file_size_bytes: number;
          filename: string;
          folder_id?: string | null;
          id?: string;
          is_deleted?: boolean;
          mime_type?: string | null;
          original_filename: string;
          project_id?: string | null;
          source_identifier?: string | null;
          source_system?: string | null;
          storage_bucket: string;
          tags?: string[] | null;
          updated_at?: string;
          uploaded_by?: string | null;
          version_no?: number;
          visibility?: Database['public']['Enums']['file_visibility'];
        };
        Update: {
          checksum_sha256?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          file_path?: string;
          file_size_bytes?: number;
          filename?: string;
          folder_id?: string | null;
          id?: string;
          is_deleted?: boolean;
          mime_type?: string | null;
          original_filename?: string;
          project_id?: string | null;
          source_identifier?: string | null;
          source_system?: string | null;
          storage_bucket?: string;
          tags?: string[] | null;
          updated_at?: string;
          uploaded_by?: string | null;
          version_no?: number;
          visibility?: Database['public']['Enums']['file_visibility'];
        };
        Relationships: [
          {
            foreignKeyName: 'file_metadata_folder_id_fkey';
            columns: ['folder_id'];
            isOneToOne: false;
            referencedRelation: 'file_folders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'file_metadata_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'file_metadata_uploaded_by_fkey';
            columns: ['uploaded_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      file_shares: {
        Row: {
          created_at: string;
          expires_at: string | null;
          file_id: string;
          id: string;
          is_active: boolean;
          permission_level: string;
          shared_by: string | null;
          shared_with_portal_actor_id: string | null;
          shared_with_user_id: string | null;
        };
        Insert: {
          created_at?: string;
          expires_at?: string | null;
          file_id: string;
          id?: string;
          is_active?: boolean;
          permission_level?: string;
          shared_by?: string | null;
          shared_with_portal_actor_id?: string | null;
          shared_with_user_id?: string | null;
        };
        Update: {
          created_at?: string;
          expires_at?: string | null;
          file_id?: string;
          id?: string;
          is_active?: boolean;
          permission_level?: string;
          shared_by?: string | null;
          shared_with_portal_actor_id?: string | null;
          shared_with_user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'file_shares_file_id_fkey';
            columns: ['file_id'];
            isOneToOne: false;
            referencedRelation: 'file_metadata';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'file_shares_shared_by_fkey';
            columns: ['shared_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'file_shares_shared_with_user_id_fkey';
            columns: ['shared_with_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      file_versions: {
        Row: {
          change_note: string | null;
          checksum_sha256: string | null;
          created_at: string;
          file_id: string;
          file_path: string;
          id: string;
          storage_bucket: string;
          uploaded_by: string | null;
          version_no: number;
        };
        Insert: {
          change_note?: string | null;
          checksum_sha256?: string | null;
          created_at?: string;
          file_id: string;
          file_path: string;
          id?: string;
          storage_bucket: string;
          uploaded_by?: string | null;
          version_no: number;
        };
        Update: {
          change_note?: string | null;
          checksum_sha256?: string | null;
          created_at?: string;
          file_id?: string;
          file_path?: string;
          id?: string;
          storage_bucket?: string;
          uploaded_by?: string | null;
          version_no?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'file_versions_file_id_fkey';
            columns: ['file_id'];
            isOneToOne: false;
            referencedRelation: 'file_metadata';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'file_versions_uploaded_by_fkey';
            columns: ['uploaded_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      knowledge_docs: {
        Row: {
          category: string | null;
          checksum: string | null;
          created_at: string;
          division_id: string | null;
          file_path: string;
          id: string;
          last_synced_at: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          category?: string | null;
          checksum?: string | null;
          created_at?: string;
          division_id?: string | null;
          file_path: string;
          id?: string;
          last_synced_at?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          category?: string | null;
          checksum?: string | null;
          created_at?: string;
          division_id?: string | null;
          file_path?: string;
          id?: string;
          last_synced_at?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'knowledge_docs_division_id_fkey';
            columns: ['division_id'];
            isOneToOne: false;
            referencedRelation: 'divisions';
            referencedColumns: ['id'];
          },
        ];
      };
      knowledge_embeddings: {
        Row: {
          chunk_index: number;
          content: string;
          created_at: string;
          doc_id: string;
          embedding: string | null;
          id: string;
        };
        Insert: {
          chunk_index: number;
          content: string;
          created_at?: string;
          doc_id: string;
          embedding?: string | null;
          id?: string;
        };
        Update: {
          chunk_index?: number;
          content?: string;
          created_at?: string;
          doc_id?: string;
          embedding?: string | null;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'knowledge_embeddings_doc_id_fkey';
            columns: ['doc_id'];
            isOneToOne: false;
            referencedRelation: 'knowledge_docs';
            referencedColumns: ['id'];
          },
        ];
      };
      lead_score_history: {
        Row: {
          engagement_score: number | null;
          fit_score: number | null;
          id: string;
          intent_score: number | null;
          lead_id: string | null;
          lead_score: number | null;
          recorded_at: string | null;
          triggered_by: string | null;
        };
        Insert: {
          engagement_score?: number | null;
          fit_score?: number | null;
          id?: string;
          intent_score?: number | null;
          lead_id?: string | null;
          lead_score?: number | null;
          recorded_at?: string | null;
          triggered_by?: string | null;
        };
        Update: {
          engagement_score?: number | null;
          fit_score?: number | null;
          id?: string;
          intent_score?: number | null;
          lead_id?: string | null;
          lead_score?: number | null;
          recorded_at?: string | null;
          triggered_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'lead_score_history_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['id'];
          },
        ];
      };
      leads: {
        Row: {
          address: string | null;
          assigned_to: string | null;
          automation_paused: boolean | null;
          city: string | null;
          company_name: string;
          created_at: string;
          current_sequence_id: string | null;
          decision_date: string | null;
          deleted_at: string | null;
          disqualified_reason: string | null;
          division_id: string | null;
          domain: string | null;
          domain_hash: string | null;
          engagement_score: number | null;
          enrichment_data: Json | null;
          enrichment_status: string | null;
          estimated_sqft: number | null;
          estimated_value: number | null;
          external_id: string | null;
          fit_score: number | null;
          id: string;
          industry: string | null;
          intent_score: number | null;
          is_qualified: boolean | null;
          last_automation_at: string | null;
          last_touch_at: string | null;
          lead_score: number | null;
          lost_reason: string | null;
          next_followup_at: string | null;
          nurture_status: Database['public']['Enums']['nurture_status'] | null;
          postal_code: string | null;
          project_description: string | null;
          project_type: string | null;
          province: string | null;
          qualified_at: string | null;
          qualified_by: string | null;
          sequence_step: number | null;
          source_channel: string;
          source_detail: string | null;
          status: Database['public']['Enums']['lead_status'];
          timeline_urgency: string | null;
          updated_at: string;
          utm_campaign: string | null;
          utm_medium: string | null;
          utm_source: string | null;
        };
        Insert: {
          address?: string | null;
          assigned_to?: string | null;
          automation_paused?: boolean | null;
          city?: string | null;
          company_name: string;
          created_at?: string;
          current_sequence_id?: string | null;
          decision_date?: string | null;
          deleted_at?: string | null;
          disqualified_reason?: string | null;
          division_id?: string | null;
          domain?: string | null;
          domain_hash?: string | null;
          engagement_score?: number | null;
          enrichment_data?: Json | null;
          enrichment_status?: string | null;
          estimated_sqft?: number | null;
          estimated_value?: number | null;
          external_id?: string | null;
          fit_score?: number | null;
          id?: string;
          industry?: string | null;
          intent_score?: number | null;
          is_qualified?: boolean | null;
          last_automation_at?: string | null;
          last_touch_at?: string | null;
          lead_score?: number | null;
          lost_reason?: string | null;
          next_followup_at?: string | null;
          nurture_status?: Database['public']['Enums']['nurture_status'] | null;
          postal_code?: string | null;
          project_description?: string | null;
          project_type?: string | null;
          province?: string | null;
          qualified_at?: string | null;
          qualified_by?: string | null;
          sequence_step?: number | null;
          source_channel: string;
          source_detail?: string | null;
          status?: Database['public']['Enums']['lead_status'];
          timeline_urgency?: string | null;
          updated_at?: string;
          utm_campaign?: string | null;
          utm_medium?: string | null;
          utm_source?: string | null;
        };
        Update: {
          address?: string | null;
          assigned_to?: string | null;
          automation_paused?: boolean | null;
          city?: string | null;
          company_name?: string;
          created_at?: string;
          current_sequence_id?: string | null;
          decision_date?: string | null;
          deleted_at?: string | null;
          disqualified_reason?: string | null;
          division_id?: string | null;
          domain?: string | null;
          domain_hash?: string | null;
          engagement_score?: number | null;
          enrichment_data?: Json | null;
          enrichment_status?: string | null;
          estimated_sqft?: number | null;
          estimated_value?: number | null;
          external_id?: string | null;
          fit_score?: number | null;
          id?: string;
          industry?: string | null;
          intent_score?: number | null;
          is_qualified?: boolean | null;
          last_automation_at?: string | null;
          last_touch_at?: string | null;
          lead_score?: number | null;
          lost_reason?: string | null;
          next_followup_at?: string | null;
          nurture_status?: Database['public']['Enums']['nurture_status'] | null;
          postal_code?: string | null;
          project_description?: string | null;
          project_type?: string | null;
          province?: string | null;
          qualified_at?: string | null;
          qualified_by?: string | null;
          sequence_step?: number | null;
          source_channel?: string;
          source_detail?: string | null;
          status?: Database['public']['Enums']['lead_status'];
          timeline_urgency?: string | null;
          updated_at?: string;
          utm_campaign?: string | null;
          utm_medium?: string | null;
          utm_source?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_leads_sequence';
            columns: ['current_sequence_id'];
            isOneToOne: false;
            referencedRelation: 'sequences';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'leads_assigned_to_fkey';
            columns: ['assigned_to'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'leads_division_id_fkey';
            columns: ['division_id'];
            isOneToOne: false;
            referencedRelation: 'divisions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'leads_qualified_by_fkey';
            columns: ['qualified_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      milestones: {
        Row: {
          actual_date: string | null;
          created_at: string;
          id: string;
          milestone_name: string;
          milestone_order: number;
          owner_user_id: string | null;
          planned_date: string | null;
          project_id: string;
          status: Database['public']['Enums']['workflow_state'];
          updated_at: string;
        };
        Insert: {
          actual_date?: string | null;
          created_at?: string;
          id?: string;
          milestone_name: string;
          milestone_order?: number;
          owner_user_id?: string | null;
          planned_date?: string | null;
          project_id: string;
          status?: Database['public']['Enums']['workflow_state'];
          updated_at?: string;
        };
        Update: {
          actual_date?: string | null;
          created_at?: string;
          id?: string;
          milestone_name?: string;
          milestone_order?: number;
          owner_user_id?: string | null;
          planned_date?: string | null;
          project_id?: string;
          status?: Database['public']['Enums']['workflow_state'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'milestones_owner_user_id_fkey';
            columns: ['owner_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'milestones_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_preferences: {
        Row: {
          created_at: string;
          email_enabled: boolean;
          id: string;
          in_app_enabled: boolean;
          push_enabled: boolean;
          quiet_hours: Json | null;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          email_enabled?: boolean;
          id?: string;
          in_app_enabled?: boolean;
          push_enabled?: boolean;
          quiet_hours?: Json | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          email_enabled?: boolean;
          id?: string;
          in_app_enabled?: boolean;
          push_enabled?: boolean;
          quiet_hours?: Json | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_preferences_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          channel: Database['public']['Enums']['notification_channel'];
          created_at: string;
          id: string;
          message: string | null;
          payload: Json;
          portal_account_id: string | null;
          read_at: string | null;
          send_at: string | null;
          sent_at: string | null;
          state: Database['public']['Enums']['notification_state'];
          title: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          channel: Database['public']['Enums']['notification_channel'];
          created_at?: string;
          id?: string;
          message?: string | null;
          payload?: Json;
          portal_account_id?: string | null;
          read_at?: string | null;
          send_at?: string | null;
          sent_at?: string | null;
          state?: Database['public']['Enums']['notification_state'];
          title: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          channel?: Database['public']['Enums']['notification_channel'];
          created_at?: string;
          id?: string;
          message?: string | null;
          payload?: Json;
          portal_account_id?: string | null;
          read_at?: string | null;
          send_at?: string | null;
          sent_at?: string | null;
          state?: Database['public']['Enums']['notification_state'];
          title?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      opportunities: {
        Row: {
          account_id: string | null;
          contact_id: string | null;
          created_at: string;
          division_id: string | null;
          estimated_revenue: number | null;
          id: string;
          lead_id: string | null;
          notes: string | null;
          opportunity_name: string;
          owner_user_id: string | null;
          probability_pct: number | null;
          stage: Database['public']['Enums']['opportunity_stage'];
          target_close_date: string | null;
          updated_at: string;
        };
        Insert: {
          account_id?: string | null;
          contact_id?: string | null;
          created_at?: string;
          division_id?: string | null;
          estimated_revenue?: number | null;
          id?: string;
          lead_id?: string | null;
          notes?: string | null;
          opportunity_name: string;
          owner_user_id?: string | null;
          probability_pct?: number | null;
          stage?: Database['public']['Enums']['opportunity_stage'];
          target_close_date?: string | null;
          updated_at?: string;
        };
        Update: {
          account_id?: string | null;
          contact_id?: string | null;
          created_at?: string;
          division_id?: string | null;
          estimated_revenue?: number | null;
          id?: string;
          lead_id?: string | null;
          notes?: string | null;
          opportunity_name?: string;
          owner_user_id?: string | null;
          probability_pct?: number | null;
          stage?: Database['public']['Enums']['opportunity_stage'];
          target_close_date?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'opportunities_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'opportunities_division_id_fkey';
            columns: ['division_id'];
            isOneToOne: false;
            referencedRelation: 'divisions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'opportunities_owner_user_id_fkey';
            columns: ['owner_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      opportunity_stage_history: {
        Row: {
          changed_at: string;
          changed_by: string | null;
          from_stage: Database['public']['Enums']['opportunity_stage'] | null;
          id: string;
          opportunity_id: string;
          reason: string | null;
          to_stage: Database['public']['Enums']['opportunity_stage'];
        };
        Insert: {
          changed_at?: string;
          changed_by?: string | null;
          from_stage?: Database['public']['Enums']['opportunity_stage'] | null;
          id?: string;
          opportunity_id: string;
          reason?: string | null;
          to_stage: Database['public']['Enums']['opportunity_stage'];
        };
        Update: {
          changed_at?: string;
          changed_by?: string | null;
          from_stage?: Database['public']['Enums']['opportunity_stage'] | null;
          id?: string;
          opportunity_id?: string;
          reason?: string | null;
          to_stage?: Database['public']['Enums']['opportunity_stage'];
        };
        Relationships: [
          {
            foreignKeyName: 'opportunity_stage_history_changed_by_fkey';
            columns: ['changed_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'opportunity_stage_history_opportunity_id_fkey';
            columns: ['opportunity_id'];
            isOneToOne: false;
            referencedRelation: 'opportunities';
            referencedColumns: ['id'];
          },
        ];
      };
      outreach: {
        Row: {
          activity_type: string | null;
          channel: Database['public']['Enums']['outreach_channel'];
          contact_id: string | null;
          created_by: string | null;
          direction: string;
          id: string;
          is_automated: boolean | null;
          lead_id: string | null;
          message_preview: string | null;
          notes: string | null;
          occurred_at: string | null;
          outcome: string | null;
          outcome_detail: string | null;
          sequence_id: string | null;
          sequence_step: number | null;
          subject: string | null;
        };
        Insert: {
          activity_type?: string | null;
          channel: Database['public']['Enums']['outreach_channel'];
          contact_id?: string | null;
          created_by?: string | null;
          direction: string;
          id?: string;
          is_automated?: boolean | null;
          lead_id?: string | null;
          message_preview?: string | null;
          notes?: string | null;
          occurred_at?: string | null;
          outcome?: string | null;
          outcome_detail?: string | null;
          sequence_id?: string | null;
          sequence_step?: number | null;
          subject?: string | null;
        };
        Update: {
          activity_type?: string | null;
          channel?: Database['public']['Enums']['outreach_channel'];
          contact_id?: string | null;
          created_by?: string | null;
          direction?: string;
          id?: string;
          is_automated?: boolean | null;
          lead_id?: string | null;
          message_preview?: string | null;
          notes?: string | null;
          occurred_at?: string | null;
          outcome?: string | null;
          outcome_detail?: string | null;
          sequence_id?: string | null;
          sequence_step?: number | null;
          subject?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'outreach_contact_id_fkey';
            columns: ['contact_id'];
            isOneToOne: false;
            referencedRelation: 'contacts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'outreach_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'outreach_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'outreach_sequence_id_fkey';
            columns: ['sequence_id'];
            isOneToOne: false;
            referencedRelation: 'sequences';
            referencedColumns: ['id'];
          },
        ];
      };
      photo_annotations: {
        Row: {
          annotation_json: Json;
          created_at: string;
          created_by: string | null;
          id: string;
          photo_id: string;
        };
        Insert: {
          annotation_json: Json;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          photo_id: string;
        };
        Update: {
          annotation_json?: Json;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          photo_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'photo_annotations_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'photo_annotations_photo_id_fkey';
            columns: ['photo_id'];
            isOneToOne: false;
            referencedRelation: 'photo_assets';
            referencedColumns: ['id'];
          },
        ];
      };
      photo_assets: {
        Row: {
          category: string | null;
          created_at: string;
          created_by: string | null;
          file_id: string;
          id: string;
          location_point: Json | null;
          project_id: string;
          taken_at: string | null;
        };
        Insert: {
          category?: string | null;
          created_at?: string;
          created_by?: string | null;
          file_id: string;
          id?: string;
          location_point?: Json | null;
          project_id: string;
          taken_at?: string | null;
        };
        Update: {
          category?: string | null;
          created_at?: string;
          created_by?: string | null;
          file_id?: string;
          id?: string;
          location_point?: Json | null;
          project_id?: string;
          taken_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'photo_assets_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'photo_assets_file_id_fkey';
            columns: ['file_id'];
            isOneToOne: false;
            referencedRelation: 'file_metadata';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'photo_assets_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      portal_accounts: {
        Row: {
          actor_type: Database['public']['Enums']['portal_actor_type'];
          clerk_user_id: string | null;
          company_name: string | null;
          contact_name: string | null;
          created_at: string;
          email: string;
          id: string;
          invited_by: string | null;
          phone: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          actor_type: Database['public']['Enums']['portal_actor_type'];
          clerk_user_id?: string | null;
          company_name?: string | null;
          contact_name?: string | null;
          created_at?: string;
          email: string;
          id?: string;
          invited_by?: string | null;
          phone?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          actor_type?: Database['public']['Enums']['portal_actor_type'];
          clerk_user_id?: string | null;
          company_name?: string | null;
          contact_name?: string | null;
          created_at?: string;
          email?: string;
          id?: string;
          invited_by?: string | null;
          phone?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      portal_messages: {
        Row: {
          body: string;
          created_at: string;
          direction: string;
          id: string;
          portal_account_id: string | null;
          project_id: string;
          read_at: string | null;
          sender_user_id: string | null;
          subject: string | null;
          updated_at: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          direction?: string;
          id?: string;
          portal_account_id?: string | null;
          project_id: string;
          read_at?: string | null;
          sender_user_id?: string | null;
          subject?: string | null;
          updated_at?: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          direction?: string;
          id?: string;
          portal_account_id?: string | null;
          project_id?: string;
          read_at?: string | null;
          sender_user_id?: string | null;
          subject?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'portal_messages_portal_account_id_fkey';
            columns: ['portal_account_id'];
            isOneToOne: false;
            referencedRelation: 'portal_accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'portal_messages_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'portal_messages_sender_user_id_fkey';
            columns: ['sender_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      portal_permissions: {
        Row: {
          created_at: string;
          id: string;
          permission_set: Json;
          portal_account_id: string;
          project_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          permission_set: Json;
          portal_account_id: string;
          project_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          permission_set?: Json;
          portal_account_id?: string;
          project_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'portal_permissions_portal_account_id_fkey';
            columns: ['portal_account_id'];
            isOneToOne: false;
            referencedRelation: 'portal_accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'portal_permissions_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      portal_view_logs: {
        Row: {
          id: string;
          ip_address: unknown;
          portal_account_id: string;
          project_id: string;
          user_agent: string | null;
          viewed_at: string;
          viewed_resource_id: string | null;
          viewed_resource_type: string;
        };
        Insert: {
          id?: string;
          ip_address?: unknown;
          portal_account_id: string;
          project_id: string;
          user_agent?: string | null;
          viewed_at?: string;
          viewed_resource_id?: string | null;
          viewed_resource_type: string;
        };
        Update: {
          id?: string;
          ip_address?: unknown;
          portal_account_id?: string;
          project_id?: string;
          user_agent?: string | null;
          viewed_at?: string;
          viewed_resource_id?: string | null;
          viewed_resource_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'portal_view_logs_portal_account_id_fkey';
            columns: ['portal_account_id'];
            isOneToOne: false;
            referencedRelation: 'portal_accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'portal_view_logs_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      project_daily_logs: {
        Row: {
          created_at: string;
          crew_count: number | null;
          delays: string | null;
          id: string;
          is_offline_origin: boolean;
          log_date: string;
          project_id: string;
          safety_notes: string | null;
          submitted_at: string | null;
          submitted_by: string | null;
          sync_client_id: string | null;
          updated_at: string;
          weather: Json | null;
          work_summary: string | null;
        };
        Insert: {
          created_at?: string;
          crew_count?: number | null;
          delays?: string | null;
          id?: string;
          is_offline_origin?: boolean;
          log_date: string;
          project_id: string;
          safety_notes?: string | null;
          submitted_at?: string | null;
          submitted_by?: string | null;
          sync_client_id?: string | null;
          updated_at?: string;
          weather?: Json | null;
          work_summary?: string | null;
        };
        Update: {
          created_at?: string;
          crew_count?: number | null;
          delays?: string | null;
          id?: string;
          is_offline_origin?: boolean;
          log_date?: string;
          project_id?: string;
          safety_notes?: string | null;
          submitted_at?: string | null;
          submitted_by?: string | null;
          sync_client_id?: string | null;
          updated_at?: string;
          weather?: Json | null;
          work_summary?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'project_daily_logs_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_daily_logs_submitted_by_fkey';
            columns: ['submitted_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      project_files: {
        Row: {
          created_at: string;
          file_id: string;
          id: string;
          linked_from: string | null;
          project_id: string;
        };
        Insert: {
          created_at?: string;
          file_id: string;
          id?: string;
          linked_from?: string | null;
          project_id: string;
        };
        Update: {
          created_at?: string;
          file_id?: string;
          id?: string;
          linked_from?: string | null;
          project_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'project_files_file_id_fkey';
            columns: ['file_id'];
            isOneToOne: false;
            referencedRelation: 'file_metadata';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_files_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      project_members: {
        Row: {
          allocation_pct: number | null;
          id: string;
          joined_at: string;
          left_at: string | null;
          member_role: string;
          project_id: string;
          user_id: string;
        };
        Insert: {
          allocation_pct?: number | null;
          id?: string;
          joined_at?: string;
          left_at?: string | null;
          member_role: string;
          project_id: string;
          user_id: string;
        };
        Update: {
          allocation_pct?: number | null;
          id?: string;
          joined_at?: string;
          left_at?: string | null;
          member_role?: string;
          project_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'project_members_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      projects: {
        Row: {
          account_id: string | null;
          actual_completion_date: string | null;
          baseline_budget: number;
          baseline_schedule: Json | null;
          contact_id: string | null;
          contract_id: string | null;
          created_at: string;
          created_by: string | null;
          current_budget: number;
          division_id: string;
          id: string;
          metadata: Json;
          project_name: string;
          project_number: string;
          site_address: Json | null;
          start_date: string | null;
          status: Database['public']['Enums']['project_status'];
          target_completion_date: string | null;
          updated_at: string;
        };
        Insert: {
          account_id?: string | null;
          actual_completion_date?: string | null;
          baseline_budget?: number;
          baseline_schedule?: Json | null;
          contact_id?: string | null;
          contract_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          current_budget?: number;
          division_id: string;
          id?: string;
          metadata?: Json;
          project_name: string;
          project_number: string;
          site_address?: Json | null;
          start_date?: string | null;
          status?: Database['public']['Enums']['project_status'];
          target_completion_date?: string | null;
          updated_at?: string;
        };
        Update: {
          account_id?: string | null;
          actual_completion_date?: string | null;
          baseline_budget?: number;
          baseline_schedule?: Json | null;
          contact_id?: string | null;
          contract_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          current_budget?: number;
          division_id?: string;
          id?: string;
          metadata?: Json;
          project_name?: string;
          project_number?: string;
          site_address?: Json | null;
          start_date?: string | null;
          status?: Database['public']['Enums']['project_status'];
          target_completion_date?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'projects_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'projects_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'projects_division_id_fkey';
            columns: ['division_id'];
            isOneToOne: false;
            referencedRelation: 'divisions';
            referencedColumns: ['id'];
          },
        ];
      };
      proposal_events: {
        Row: {
          actor_user_id: string | null;
          event_payload: Json;
          event_type: string;
          id: string;
          occurred_at: string;
          proposal_id: string;
        };
        Insert: {
          actor_user_id?: string | null;
          event_payload?: Json;
          event_type: string;
          id?: string;
          occurred_at?: string;
          proposal_id: string;
        };
        Update: {
          actor_user_id?: string | null;
          event_payload?: Json;
          event_type?: string;
          id?: string;
          occurred_at?: string;
          proposal_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'proposal_events_actor_user_id_fkey';
            columns: ['actor_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'proposal_events_proposal_id_fkey';
            columns: ['proposal_id'];
            isOneToOne: false;
            referencedRelation: 'proposals';
            referencedColumns: ['id'];
          },
        ];
      };
      proposals: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          created_by: string | null;
          estimate_id: string;
          expires_on: string | null;
          id: string;
          proposal_number: string;
          proposal_payload: Json;
          rejected_at: string | null;
          sent_at: string | null;
          status: Database['public']['Enums']['proposal_status'];
          updated_at: string;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          estimate_id: string;
          expires_on?: string | null;
          id?: string;
          proposal_number: string;
          proposal_payload: Json;
          rejected_at?: string | null;
          sent_at?: string | null;
          status?: Database['public']['Enums']['proposal_status'];
          updated_at?: string;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          estimate_id?: string;
          expires_on?: string | null;
          id?: string;
          proposal_number?: string;
          proposal_payload?: Json;
          rejected_at?: string | null;
          sent_at?: string | null;
          status?: Database['public']['Enums']['proposal_status'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'proposals_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'proposals_estimate_id_fkey';
            columns: ['estimate_id'];
            isOneToOne: false;
            referencedRelation: 'estimates';
            referencedColumns: ['id'];
          },
        ];
      };
      roles: {
        Row: {
          created_at: string;
          id: string;
          is_system: boolean;
          role_key: string;
          role_name: string;
          scope: Database['public']['Enums']['role_scope'];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_system?: boolean;
          role_key: string;
          role_name: string;
          scope?: Database['public']['Enums']['role_scope'];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_system?: boolean;
          role_key?: string;
          role_name?: string;
          scope?: Database['public']['Enums']['role_scope'];
          updated_at?: string;
        };
        Relationships: [];
      };
      scoring_rules: {
        Row: {
          category: string;
          created_at: string;
          division_id: string | null;
          field_name: string;
          id: string;
          is_active: boolean | null;
          name: string;
          operator: string;
          priority: number | null;
          score_impact: number;
          updated_at: string;
          value: string;
        };
        Insert: {
          category: string;
          created_at?: string;
          division_id?: string | null;
          field_name: string;
          id?: string;
          is_active?: boolean | null;
          name: string;
          operator: string;
          priority?: number | null;
          score_impact: number;
          updated_at?: string;
          value: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          division_id?: string | null;
          field_name?: string;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          operator?: string;
          priority?: number | null;
          score_impact?: number;
          updated_at?: string;
          value?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'scoring_rules_division_id_fkey';
            columns: ['division_id'];
            isOneToOne: false;
            referencedRelation: 'divisions';
            referencedColumns: ['id'];
          },
        ];
      };
      sequence_enrollments: {
        Row: {
          contact_id: string | null;
          current_step: number | null;
          enrolled_at: string | null;
          id: string;
          lead_id: string | null;
          next_step_at: string | null;
          sequence_id: string | null;
          status: string | null;
        };
        Insert: {
          contact_id?: string | null;
          current_step?: number | null;
          enrolled_at?: string | null;
          id?: string;
          lead_id?: string | null;
          next_step_at?: string | null;
          sequence_id?: string | null;
          status?: string | null;
        };
        Update: {
          contact_id?: string | null;
          current_step?: number | null;
          enrolled_at?: string | null;
          id?: string;
          lead_id?: string | null;
          next_step_at?: string | null;
          sequence_id?: string | null;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'sequence_enrollments_contact_id_fkey';
            columns: ['contact_id'];
            isOneToOne: false;
            referencedRelation: 'contacts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sequence_enrollments_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sequence_enrollments_sequence_id_fkey';
            columns: ['sequence_id'];
            isOneToOne: false;
            referencedRelation: 'sequences';
            referencedColumns: ['id'];
          },
        ];
      };
      sequence_steps: {
        Row: {
          action_config: Json;
          action_type: string;
          created_at: string;
          delay_days: number | null;
          delay_hours: number | null;
          id: string;
          sequence_id: string;
          step_number: number;
        };
        Insert: {
          action_config: Json;
          action_type: string;
          created_at?: string;
          delay_days?: number | null;
          delay_hours?: number | null;
          id?: string;
          sequence_id: string;
          step_number: number;
        };
        Update: {
          action_config?: Json;
          action_type?: string;
          created_at?: string;
          delay_days?: number | null;
          delay_hours?: number | null;
          id?: string;
          sequence_id?: string;
          step_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'sequence_steps_sequence_id_fkey';
            columns: ['sequence_id'];
            isOneToOne: false;
            referencedRelation: 'sequences';
            referencedColumns: ['id'];
          },
        ];
      };
      sequences: {
        Row: {
          created_at: string;
          description: string | null;
          division_id: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
          trigger_conditions: Json | null;
          trigger_type: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          division_id?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          trigger_conditions?: Json | null;
          trigger_type: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          division_id?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          trigger_conditions?: Json | null;
          trigger_type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sequences_division_id_fkey';
            columns: ['division_id'];
            isOneToOne: false;
            referencedRelation: 'divisions';
            referencedColumns: ['id'];
          },
        ];
      };
      site_diary_entries: {
        Row: {
          created_at: string;
          created_by: string | null;
          entry_at: string;
          entry_text: string;
          entry_type: string;
          id: string;
          project_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          entry_at: string;
          entry_text: string;
          entry_type: string;
          id?: string;
          project_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          entry_at?: string;
          entry_text?: string;
          entry_type?: string;
          id?: string;
          project_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'site_diary_entries_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'site_diary_entries_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      task_comments: {
        Row: {
          author_user_id: string | null;
          comment_text: string;
          created_at: string;
          id: string;
          task_id: string;
          updated_at: string;
        };
        Insert: {
          author_user_id?: string | null;
          comment_text: string;
          created_at?: string;
          id?: string;
          task_id: string;
          updated_at?: string;
        };
        Update: {
          author_user_id?: string | null;
          comment_text?: string;
          created_at?: string;
          id?: string;
          task_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'task_comments_author_user_id_fkey';
            columns: ['author_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_comments_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
        ];
      };
      task_dependencies: {
        Row: {
          created_at: string;
          dependency_type: string;
          depends_on_task_id: string;
          id: string;
          task_id: string;
        };
        Insert: {
          created_at?: string;
          dependency_type?: string;
          depends_on_task_id: string;
          id?: string;
          task_id: string;
        };
        Update: {
          created_at?: string;
          dependency_type?: string;
          depends_on_task_id?: string;
          id?: string;
          task_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'task_dependencies_depends_on_task_id_fkey';
            columns: ['depends_on_task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_dependencies_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
        ];
      };
      tasks: {
        Row: {
          assigned_user_id: string | null;
          blocked_reason: string | null;
          completed_at: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          due_at: string | null;
          id: string;
          metadata: Json;
          milestone_id: string | null;
          priority: string;
          project_id: string;
          start_at: string | null;
          status: Database['public']['Enums']['task_status'];
          title: string;
          updated_at: string;
        };
        Insert: {
          assigned_user_id?: string | null;
          blocked_reason?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          due_at?: string | null;
          id?: string;
          metadata?: Json;
          milestone_id?: string | null;
          priority?: string;
          project_id: string;
          start_at?: string | null;
          status?: Database['public']['Enums']['task_status'];
          title: string;
          updated_at?: string;
        };
        Update: {
          assigned_user_id?: string | null;
          blocked_reason?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          due_at?: string | null;
          id?: string;
          metadata?: Json;
          milestone_id?: string | null;
          priority?: string;
          project_id?: string;
          start_at?: string | null;
          status?: Database['public']['Enums']['task_status'];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tasks_assigned_user_id_fkey';
            columns: ['assigned_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_milestone_id_fkey';
            columns: ['milestone_id'];
            isOneToOne: false;
            referencedRelation: 'milestones';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      user_divisions: {
        Row: {
          division_id: string;
          id: string;
          is_primary: boolean;
          joined_at: string;
          left_at: string | null;
          user_id: string;
        };
        Insert: {
          division_id: string;
          id?: string;
          is_primary?: boolean;
          joined_at?: string;
          left_at?: string | null;
          user_id: string;
        };
        Update: {
          division_id?: string;
          id?: string;
          is_primary?: boolean;
          joined_at?: string;
          left_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_divisions_division_id_fkey';
            columns: ['division_id'];
            isOneToOne: false;
            referencedRelation: 'divisions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_divisions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      user_roles: {
        Row: {
          assigned_by: string | null;
          created_at: string;
          division_id: string | null;
          ends_at: string | null;
          id: string;
          is_primary: boolean;
          project_id: string | null;
          role_id: string;
          starts_at: string | null;
          user_id: string;
        };
        Insert: {
          assigned_by?: string | null;
          created_at?: string;
          division_id?: string | null;
          ends_at?: string | null;
          id?: string;
          is_primary?: boolean;
          project_id?: string | null;
          role_id: string;
          starts_at?: string | null;
          user_id: string;
        };
        Update: {
          assigned_by?: string | null;
          created_at?: string;
          division_id?: string | null;
          ends_at?: string | null;
          id?: string;
          is_primary?: boolean;
          project_id?: string | null;
          role_id?: string;
          starts_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_roles_assigned_by_fkey';
            columns: ['assigned_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_roles_division_id_fkey';
            columns: ['division_id'];
            isOneToOne: false;
            referencedRelation: 'divisions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_roles_role_id_fkey';
            columns: ['role_id'];
            isOneToOne: false;
            referencedRelation: 'roles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_roles_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      users: {
        Row: {
          avatar_url: string | null;
          clerk_user_id: string | null;
          created_at: string;
          email: string;
          first_name: string;
          id: string;
          last_name: string;
          locale: string;
          phone: string | null;
          status: Database['public']['Enums']['user_status'];
          timezone: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          clerk_user_id?: string | null;
          created_at?: string;
          email: string;
          first_name: string;
          id?: string;
          last_name: string;
          locale?: string;
          phone?: string | null;
          status?: Database['public']['Enums']['user_status'];
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          clerk_user_id?: string | null;
          created_at?: string;
          email?: string;
          first_name?: string;
          id?: string;
          last_name?: string;
          locale?: string;
          phone?: string | null;
          status?: Database['public']['Enums']['user_status'];
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      ensure_clerk_user: {
        Args: {
          p_avatar_url?: string;
          p_clerk_id: string;
          p_email: string;
          p_first_name: string;
          p_last_name: string;
        };
        Returns: {
          avatar_url: string | null;
          clerk_user_id: string | null;
          created_at: string;
          email: string;
          first_name: string;
          id: string;
          last_name: string;
          locale: string;
          phone: string | null;
          status: Database['public']['Enums']['user_status'];
          timezone: string;
          updated_at: string;
        }[];
        SetofOptions: {
          from: '*';
          to: 'users';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      is_platform_admin: { Args: never; Returns: boolean };
      krewpact_divisions: { Args: never; Returns: Json };
      krewpact_roles: { Args: never; Returns: Json };
      krewpact_user_id: { Args: never; Returns: string };
      show_limit: { Args: never; Returns: number };
      show_trgm: { Args: { '': string }; Returns: string[] };
    };
    Enums: {
      contract_status: 'draft' | 'pending_signature' | 'signed' | 'amended' | 'terminated';
      estimate_status: 'draft' | 'review' | 'sent' | 'approved' | 'rejected' | 'superseded';
      expense_status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'posted';
      file_visibility: 'internal' | 'client' | 'trade' | 'public';
      lead_stage: 'new' | 'qualified' | 'estimating' | 'proposal_sent' | 'won' | 'lost';
      lead_status:
        | 'new'
        | 'contacted'
        | 'qualified'
        | 'proposal'
        | 'negotiation'
        | 'won'
        | 'lost'
        | 'nurture';
      notification_channel: 'in_app' | 'email' | 'push' | 'sms';
      notification_state: 'queued' | 'sent' | 'delivered' | 'failed' | 'read';
      nurture_status: 'pool' | 'flash_response' | 'active_sprint' | 'long_drip' | 'disqualified';
      opportunity_stage:
        | 'intake'
        | 'site_visit'
        | 'estimating'
        | 'proposal'
        | 'negotiation'
        | 'contracted'
        | 'closed_lost';
      outreach_channel: 'email' | 'call' | 'linkedin' | 'video' | 'meeting' | 'text' | 'site_visit';
      portal_actor_type: 'client' | 'trade_partner';
      project_status:
        | 'planning'
        | 'active'
        | 'on_hold'
        | 'substantial_complete'
        | 'closed'
        | 'cancelled';
      proposal_status:
        | 'draft'
        | 'sent'
        | 'viewed'
        | 'accepted'
        | 'rejected'
        | 'expired'
        | 'superseded';
      role_scope: 'company' | 'division' | 'project';
      sync_direction: 'outbound' | 'inbound';
      sync_status: 'queued' | 'processing' | 'succeeded' | 'failed' | 'dead_letter';
      task_status: 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled';
      user_status: 'active' | 'inactive' | 'invited' | 'archived';
      workflow_state: 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'void';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      contract_status: ['draft', 'pending_signature', 'signed', 'amended', 'terminated'],
      estimate_status: ['draft', 'review', 'sent', 'approved', 'rejected', 'superseded'],
      expense_status: ['draft', 'submitted', 'approved', 'rejected', 'posted'],
      file_visibility: ['internal', 'client', 'trade', 'public'],
      lead_stage: ['new', 'qualified', 'estimating', 'proposal_sent', 'won', 'lost'],
      lead_status: [
        'new',
        'contacted',
        'qualified',
        'proposal',
        'negotiation',
        'won',
        'lost',
        'nurture',
      ],
      notification_channel: ['in_app', 'email', 'push', 'sms'],
      notification_state: ['queued', 'sent', 'delivered', 'failed', 'read'],
      nurture_status: ['pool', 'flash_response', 'active_sprint', 'long_drip', 'disqualified'],
      opportunity_stage: [
        'intake',
        'site_visit',
        'estimating',
        'proposal',
        'negotiation',
        'contracted',
        'closed_lost',
      ],
      outreach_channel: ['email', 'call', 'linkedin', 'video', 'meeting', 'text', 'site_visit'],
      portal_actor_type: ['client', 'trade_partner'],
      project_status: [
        'planning',
        'active',
        'on_hold',
        'substantial_complete',
        'closed',
        'cancelled',
      ],
      proposal_status: ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'superseded'],
      role_scope: ['company', 'division', 'project'],
      sync_direction: ['outbound', 'inbound'],
      sync_status: ['queued', 'processing', 'succeeded', 'failed', 'dead_letter'],
      task_status: ['todo', 'in_progress', 'blocked', 'done', 'cancelled'],
      user_status: ['active', 'inactive', 'invited', 'archived'],
      workflow_state: ['draft', 'submitted', 'in_review', 'approved', 'rejected', 'void'],
    },
  },
} as const;
