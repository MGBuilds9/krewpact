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
          address: Json | null
          billing_address: Json | null
          company_code: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          division_id: string | null
          email: string | null
          first_project_date: string | null
          id: string
          industry: string | null
          is_repeat_client: boolean | null
          last_project_date: string | null
          lifetime_revenue: number | null
          metadata: Json | null
          notes: string | null
          org_id: string
          phone: string | null
          shipping_address: Json | null
          source: string | null
          tags: string[] | null
          total_projects: number | null
          updated_at: string
          website: string | null
        }
        Insert: {
          account_name: string
          account_type?: string
          address?: Json | null
          billing_address?: Json | null
          company_code?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          division_id?: string | null
          email?: string | null
          first_project_date?: string | null
          id?: string
          industry?: string | null
          is_repeat_client?: boolean | null
          last_project_date?: string | null
          lifetime_revenue?: number | null
          metadata?: Json | null
          notes?: string | null
          org_id?: string
          phone?: string | null
          shipping_address?: Json | null
          source?: string | null
          tags?: string[] | null
          total_projects?: number | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          account_name?: string
          account_type?: string
          address?: Json | null
          billing_address?: Json | null
          company_code?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          division_id?: string | null
          email?: string | null
          first_project_date?: string | null
          id?: string
          industry?: string | null
          is_repeat_client?: boolean | null
          last_project_date?: string | null
          lifetime_revenue?: number | null
          metadata?: Json | null
          notes?: string | null
          org_id?: string
          phone?: string | null
          shipping_address?: Json | null
          source?: string | null
          tags?: string[] | null
          total_projects?: number | null
          updated_at?: string
          website?: string | null
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
          {
            foreignKeyName: "accounts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          disposition: string | null
          due_at: string | null
          duration_minutes: number | null
          id: string
          lead_id: string | null
          opportunity_id: string | null
          org_id: string
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
          disposition?: string | null
          due_at?: string | null
          duration_minutes?: number | null
          id?: string
          lead_id?: string | null
          opportunity_id?: string | null
          org_id?: string
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
          disposition?: string | null
          due_at?: string | null
          duration_minutes?: number | null
          id?: string
          lead_id?: string | null
          opportunity_id?: string | null
          org_id?: string
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
            foreignKeyName: "activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      adp_field_mappings: {
        Row: {
          adp_field: string
          created_at: string
          id: string
          internal_field: string
          is_active: boolean
          transform_rule: string | null
          updated_at: string
        }
        Insert: {
          adp_field: string
          created_at?: string
          id?: string
          internal_field: string
          is_active?: boolean
          transform_rule?: string | null
          updated_at?: string
        }
        Update: {
          adp_field?: string
          created_at?: string
          id?: string
          internal_field?: string
          is_active?: boolean
          transform_rule?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_actions: {
        Row: {
          action_type: string
          cost_cents: number | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          input_tokens: number | null
          latency_ms: number | null
          model_used: string
          org_id: string
          output_tokens: number | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          cost_cents?: number | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          model_used: string
          org_id: string
          output_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          cost_cents?: number | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          model_used?: string
          org_id?: string
          output_tokens?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_actions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_actions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
          sources: Json | null
          token_count: number | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
          sources?: Json | null
          token_count?: number | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
          sources?: Json | null
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_sessions: {
        Row: {
          context_id: string | null
          context_type: string | null
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_insights: {
        Row: {
          acted_on_at: string | null
          acted_on_by: string | null
          action_label: string | null
          action_url: string | null
          confidence: number | null
          content: string
          created_at: string | null
          dismissed_at: string | null
          dismissed_by: string | null
          entity_id: string
          entity_type: string
          expires_at: string | null
          id: string
          insight_type: string
          metadata: Json | null
          model_used: string
          org_id: string
          title: string
        }
        Insert: {
          acted_on_at?: string | null
          acted_on_by?: string | null
          action_label?: string | null
          action_url?: string | null
          confidence?: number | null
          content: string
          created_at?: string | null
          dismissed_at?: string | null
          dismissed_by?: string | null
          entity_id: string
          entity_type: string
          expires_at?: string | null
          id?: string
          insight_type: string
          metadata?: Json | null
          model_used: string
          org_id: string
          title: string
        }
        Update: {
          acted_on_at?: string | null
          acted_on_by?: string | null
          action_label?: string | null
          action_url?: string | null
          confidence?: number | null
          content?: string
          created_at?: string | null
          dismissed_at?: string | null
          dismissed_by?: string | null
          entity_id?: string
          entity_type?: string
          expires_at?: string | null
          id?: string
          insight_type?: string
          metadata?: Json | null
          model_used?: string
          org_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_acted_on_by_fkey"
            columns: ["acted_on_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_insights_dismissed_by_fkey"
            columns: ["dismissed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_insights_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      allowance_reconciliations: {
        Row: {
          allowance_budget: number
          category_name: string
          created_at: string
          id: string
          last_reconciled_at: string | null
          project_id: string
          selected_cost: number
          updated_at: string
          variance: number
        }
        Insert: {
          allowance_budget?: number
          category_name: string
          created_at?: string
          id?: string
          last_reconciled_at?: string | null
          project_id: string
          selected_cost?: number
          updated_at?: string
          variance?: number
        }
        Update: {
          allowance_budget?: number
          category_name?: string
          created_at?: string
          id?: string
          last_reconciled_at?: string | null
          project_id?: string
          selected_cost?: number
          updated_at?: string
          variance?: number
        }
        Relationships: [
          {
            foreignKeyName: "allowance_reconciliations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      apollo_profile_runs: {
        Row: {
          avg_score_at_30_days: number | null
          created_at: string
          credits_used: number | null
          division_code: string | null
          duplicates_skipped: number | null
          id: string
          leads_converted: number | null
          leads_found: number | null
          leads_imported: number | null
          leads_qualified: number | null
          page_end: number | null
          page_start: number | null
          profile_id: string
          run_at: string | null
        }
        Insert: {
          avg_score_at_30_days?: number | null
          created_at?: string
          credits_used?: number | null
          division_code?: string | null
          duplicates_skipped?: number | null
          id?: string
          leads_converted?: number | null
          leads_found?: number | null
          leads_imported?: number | null
          leads_qualified?: number | null
          page_end?: number | null
          page_start?: number | null
          profile_id: string
          run_at?: string | null
        }
        Update: {
          avg_score_at_30_days?: number | null
          created_at?: string
          credits_used?: number | null
          division_code?: string | null
          duplicates_skipped?: number | null
          id?: string
          leads_converted?: number | null
          leads_found?: number | null
          leads_imported?: number | null
          leads_qualified?: number | null
          page_end?: number | null
          page_start?: number | null
          profile_id?: string
          run_at?: string | null
        }
        Relationships: []
      }
      apollo_pump_state: {
        Row: {
          created_at: string
          credits_used_this_month: number | null
          division_code: string | null
          last_page: number | null
          last_run_at: string | null
          month_reset_at: string | null
          profile_id: string
          total_credits_used: number | null
          total_imported: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits_used_this_month?: number | null
          division_code?: string | null
          last_page?: number | null
          last_run_at?: string | null
          month_reset_at?: string | null
          profile_id: string
          total_credits_used?: number | null
          total_imported?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits_used_this_month?: number | null
          division_code?: string | null
          last_page?: number | null
          last_run_at?: string | null
          month_reset_at?: string | null
          profile_id?: string
          total_credits_used?: number | null
          total_imported?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      assemblies: {
        Row: {
          assembly_code: string | null
          assembly_name: string
          created_at: string
          created_by: string | null
          description: string | null
          division_id: string | null
          id: string
          is_active: boolean
          unit: string
          updated_at: string
          version_no: number
        }
        Insert: {
          assembly_code?: string | null
          assembly_name: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          division_id?: string | null
          id?: string
          is_active?: boolean
          unit: string
          updated_at?: string
          version_no?: number
        }
        Update: {
          assembly_code?: string | null
          assembly_name?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          division_id?: string | null
          id?: string
          is_active?: boolean
          unit?: string
          updated_at?: string
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "assemblies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assemblies_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      assembly_items: {
        Row: {
          assembly_id: string
          catalog_item_id: string | null
          created_at: string
          description: string | null
          id: string
          line_type: string
          metadata: Json
          quantity: number
          sort_order: number
          unit_cost: number
          updated_at: string
        }
        Insert: {
          assembly_id: string
          catalog_item_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          line_type: string
          metadata?: Json
          quantity?: number
          sort_order?: number
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          assembly_id?: string
          catalog_item_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          line_type?: string
          metadata?: Json
          quantity?: number
          sort_order?: number
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assembly_items_assembly_id_fkey"
            columns: ["assembly_id"]
            isOneToOne: false
            referencedRelation: "assemblies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_items_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "cost_catalog_items"
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
      bcp_incidents: {
        Row: {
          created_at: string
          id: string
          incident_number: string
          owner_user_id: string | null
          resolved_at: string | null
          severity: string
          started_at: string
          status: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          incident_number: string
          owner_user_id?: string | null
          resolved_at?: string | null
          severity: string
          started_at?: string
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          incident_number?: string
          owner_user_id?: string | null
          resolved_at?: string | null
          severity?: string
          started_at?: string
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bcp_incidents_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bcp_recovery_events: {
        Row: {
          created_at: string
          created_by: string | null
          event_payload: Json
          event_type: string
          id: string
          incident_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_payload?: Json
          event_type: string
          id?: string
          incident_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_payload?: Json
          event_type?: string
          id?: string
          incident_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bcp_recovery_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bcp_recovery_events_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "bcp_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_leveling_entries: {
        Row: {
          bid_id: string
          created_at: string
          id: string
          leveling_session_id: string
          normalized_total: number
          rationale: string | null
          recommended: boolean
          risk_score: number | null
          updated_at: string
        }
        Insert: {
          bid_id: string
          created_at?: string
          id?: string
          leveling_session_id: string
          normalized_total?: number
          rationale?: string | null
          recommended?: boolean
          risk_score?: number | null
          updated_at?: string
        }
        Update: {
          bid_id?: string
          created_at?: string
          id?: string
          leveling_session_id?: string
          normalized_total?: number
          rationale?: string | null
          recommended?: boolean
          risk_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bid_leveling_entries_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "rfq_bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_leveling_entries_leveling_session_id_fkey"
            columns: ["leveling_session_id"]
            isOneToOne: false
            referencedRelation: "bid_leveling_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_leveling_sessions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          rfq_id: string
          version_no: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          rfq_id: string
          version_no?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          rfq_id?: string
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "bid_leveling_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_leveling_sessions_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfq_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      bidding_opportunities: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          deadline: string | null
          division_id: string | null
          estimated_value: number | null
          id: string
          metadata: Json | null
          notes: string | null
          opportunity_id: string | null
          org_id: string
          source: Database["public"]["Enums"]["bidding_source"]
          status: Database["public"]["Enums"]["bidding_status"]
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          division_id?: string | null
          estimated_value?: number | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          opportunity_id?: string | null
          org_id: string
          source?: Database["public"]["Enums"]["bidding_source"]
          status?: Database["public"]["Enums"]["bidding_status"]
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          division_id?: string | null
          estimated_value?: number | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          opportunity_id?: string | null
          org_id?: string
          source?: Database["public"]["Enums"]["bidding_source"]
          status?: Database["public"]["Enums"]["bidding_status"]
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bidding_opportunities_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bidding_opportunities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bidding_opportunities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      change_orders: {
        Row: {
          amount_delta: number
          approved_at: string | null
          approved_by: string | null
          change_request_id: string | null
          co_number: string
          created_at: string
          days_delta: number
          id: string
          project_id: string
          reason: string | null
          signed_contract_id: string | null
          status: Database["public"]["Enums"]["co_status"]
          updated_at: string
        }
        Insert: {
          amount_delta?: number
          approved_at?: string | null
          approved_by?: string | null
          change_request_id?: string | null
          co_number: string
          created_at?: string
          days_delta?: number
          id?: string
          project_id: string
          reason?: string | null
          signed_contract_id?: string | null
          status?: Database["public"]["Enums"]["co_status"]
          updated_at?: string
        }
        Update: {
          amount_delta?: number
          approved_at?: string | null
          approved_by?: string | null
          change_request_id?: string | null
          co_number?: string
          created_at?: string
          days_delta?: number
          id?: string
          project_id?: string
          reason?: string | null
          signed_contract_id?: string | null
          status?: Database["public"]["Enums"]["co_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_change_request_id_fkey"
            columns: ["change_request_id"]
            isOneToOne: false
            referencedRelation: "change_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_signed_contract_id_fkey"
            columns: ["signed_contract_id"]
            isOneToOne: false
            referencedRelation: "contract_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      change_requests: {
        Row: {
          created_at: string
          description: string
          estimated_cost_impact: number
          estimated_days_impact: number
          id: string
          project_id: string
          request_number: string
          requested_by: string | null
          state: Database["public"]["Enums"]["workflow_state"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          estimated_cost_impact?: number
          estimated_days_impact?: number
          id?: string
          project_id: string
          request_number: string
          requested_by?: string | null
          state?: Database["public"]["Enums"]["workflow_state"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          estimated_cost_impact?: number
          estimated_days_impact?: number
          id?: string
          project_id?: string
          request_number?: string
          requested_by?: string | null
          state?: Database["public"]["Enums"]["workflow_state"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      client_project_history: {
        Row: {
          account_id: string
          created_at: string
          end_date: string | null
          estimated_value: number | null
          id: string
          metadata: Json | null
          org_id: string | null
          outcome: string | null
          project_address: Json | null
          project_description: string | null
          project_name: string
          project_number: string | null
          source: string | null
          start_date: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          end_date?: string | null
          estimated_value?: number | null
          id?: string
          metadata?: Json | null
          org_id?: string | null
          outcome?: string | null
          project_address?: Json | null
          project_description?: string | null
          project_name: string
          project_number?: string | null
          source?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          end_date?: string | null
          estimated_value?: number | null
          id?: string
          metadata?: Json | null
          org_id?: string | null
          outcome?: string | null
          project_address?: Json | null
          project_description?: string | null
          project_name?: string
          project_number?: string | null
          source?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_project_history_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      closeout_packages: {
        Row: {
          accepted_at: string | null
          checklist_payload: Json
          created_at: string
          created_by: string | null
          id: string
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          checklist_payload?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          checklist_payload?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "closeout_packages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closeout_packages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_account_links: {
        Row: {
          account_id: string
          contact_id: string
          created_at: string
          id: string
          is_primary: boolean
          relationship_type: string | null
        }
        Insert: {
          account_id: string
          contact_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          relationship_type?: string | null
        }
        Update: {
          account_id?: string
          contact_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          relationship_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_account_links_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_account_links_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string
          departments: string | null
          email: string | null
          email_opted_in: boolean | null
          first_name: string | null
          full_name: string
          id: string
          is_decision_maker: boolean | null
          is_primary: boolean | null
          last_contacted_at: string | null
          last_name: string | null
          lead_id: string
          linkedin_url: string | null
          mobile: string | null
          org_id: string
          phone: string | null
          phone_opted_in: boolean | null
          preferred_channel: string | null
          role: string | null
          seniority: string | null
          title: string | null
          total_touches: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          departments?: string | null
          email?: string | null
          email_opted_in?: boolean | null
          first_name?: string | null
          full_name: string
          id?: string
          is_decision_maker?: boolean | null
          is_primary?: boolean | null
          last_contacted_at?: string | null
          last_name?: string | null
          lead_id: string
          linkedin_url?: string | null
          mobile?: string | null
          org_id?: string
          phone?: string | null
          phone_opted_in?: boolean | null
          preferred_channel?: string | null
          role?: string | null
          seniority?: string | null
          title?: string | null
          total_touches?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          departments?: string | null
          email?: string | null
          email_opted_in?: boolean | null
          first_name?: string | null
          full_name?: string
          id?: string
          is_decision_maker?: boolean | null
          is_primary?: boolean | null
          last_contacted_at?: string | null
          last_name?: string | null
          lead_id?: string
          linkedin_url?: string | null
          mobile?: string | null
          org_id?: string
          phone?: string | null
          phone_opted_in?: boolean | null
          preferred_channel?: string | null
          role?: string | null
          seniority?: string | null
          title?: string | null
          total_touches?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_terms: {
        Row: {
          contract_status: Database["public"]["Enums"]["contract_status"]
          created_at: string
          id: string
          legal_text_version: string
          proposal_id: string
          signed_at: string | null
          supersedes_contract_id: string | null
          terms_payload: Json
          updated_at: string
        }
        Insert: {
          contract_status?: Database["public"]["Enums"]["contract_status"]
          created_at?: string
          id?: string
          legal_text_version: string
          proposal_id: string
          signed_at?: string | null
          supersedes_contract_id?: string | null
          terms_payload: Json
          updated_at?: string
        }
        Update: {
          contract_status?: Database["public"]["Enums"]["contract_status"]
          created_at?: string
          id?: string
          legal_text_version?: string
          proposal_id?: string
          signed_at?: string | null
          supersedes_contract_id?: string | null
          terms_payload?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_terms_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_terms_supersedes_contract_id_fkey"
            columns: ["supersedes_contract_id"]
            isOneToOne: false
            referencedRelation: "contract_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          contract_type: string | null
          created_at: string
          created_by: string | null
          end_date: string | null
          id: string
          notes: string | null
          opportunity_id: string | null
          project_id: string | null
          signed_at: string | null
          start_date: string | null
          status: string
          title: string
          updated_at: string
          value: number | null
        }
        Insert: {
          contract_type?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          opportunity_id?: string | null
          project_id?: string | null
          signed_at?: string | null
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          contract_type?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          opportunity_id?: string | null
          project_id?: string | null
          signed_at?: string | null
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_catalog_items: {
        Row: {
          base_cost: number
          created_at: string
          division_id: string | null
          effective_from: string
          effective_to: string | null
          id: string
          item_code: string | null
          item_name: string
          item_type: string
          metadata: Json
          unit: string
          updated_at: string
          vendor_name: string | null
        }
        Insert: {
          base_cost: number
          created_at?: string
          division_id?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          item_code?: string | null
          item_name: string
          item_type: string
          metadata?: Json
          unit: string
          updated_at?: string
          vendor_name?: string | null
        }
        Update: {
          base_cost?: number
          created_at?: string
          division_id?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          item_code?: string | null
          item_name?: string
          item_type?: string
          metadata?: Json
          unit?: string
          updated_at?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_catalog_items_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_code_dictionary: {
        Row: {
          cost_code: string
          cost_code_name: string
          created_at: string
          division_id: string | null
          id: string
          is_active: boolean
          metadata: Json
          parent_cost_code_id: string | null
          updated_at: string
        }
        Insert: {
          cost_code: string
          cost_code_name: string
          created_at?: string
          division_id?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          parent_cost_code_id?: string | null
          updated_at?: string
        }
        Update: {
          cost_code?: string
          cost_code_name?: string
          created_at?: string
          division_id?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          parent_cost_code_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_code_dictionary_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_code_dictionary_parent_cost_code_id_fkey"
            columns: ["parent_cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_code_dictionary"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_code_mappings: {
        Row: {
          adp_labor_code: string | null
          created_at: string
          division_id: string | null
          erp_cost_code: string
          id: string
          is_active: boolean
          local_cost_code: string
          updated_at: string
        }
        Insert: {
          adp_labor_code?: string | null
          created_at?: string
          division_id?: string | null
          erp_cost_code: string
          id?: string
          is_active?: boolean
          local_cost_code: string
          updated_at?: string
        }
        Update: {
          adp_labor_code?: string | null
          created_at?: string
          division_id?: string | null
          erp_cost_code?: string
          id?: string
          is_active?: boolean
          local_cost_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_code_mappings_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_saved_views: {
        Row: {
          columns: string[] | null
          created_at: string
          entity_type: string
          filters: Json
          id: string
          is_default: boolean
          name: string
          sort_by: string | null
          sort_dir: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          columns?: string[] | null
          created_at?: string
          entity_type: string
          filters?: Json
          id?: string
          is_default?: boolean
          name: string
          sort_by?: string | null
          sort_dir?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          columns?: string[] | null
          created_at?: string
          entity_type?: string
          filters?: Json
          id?: string
          is_default?: boolean
          name?: string
          sort_by?: string | null
          sort_dir?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      crm_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      deficiency_items: {
        Row: {
          assigned_to: string | null
          closed_at: string | null
          closeout_package_id: string | null
          created_at: string
          details: string | null
          due_at: string | null
          id: string
          project_id: string
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          closed_at?: string | null
          closeout_package_id?: string | null
          created_at?: string
          details?: string | null
          due_at?: string | null
          id?: string
          project_id: string
          severity?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          closed_at?: string | null
          closeout_package_id?: string | null
          created_at?: string
          details?: string | null
          due_at?: string | null
          id?: string
          project_id?: string
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deficiency_items_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deficiency_items_closeout_package_id_fkey"
            columns: ["closeout_package_id"]
            isOneToOne: false
            referencedRelation: "closeout_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deficiency_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
          org_id: string
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
          org_id?: string
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
          org_id?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "divisions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      document_attachments: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          file_id: string | null
          file_name: string
          file_size: number | null
          file_url: string | null
          id: string
          mime_type: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          file_id?: string | null
          file_name: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          mime_type?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          file_id?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          mime_type?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_attachments_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "file_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_html: string
          body_text: string | null
          category: string | null
          created_at: string
          division_id: string | null
          id: string
          is_active: boolean | null
          name: string
          subject: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          body_html: string
          body_text?: string | null
          category?: string | null
          created_at?: string
          division_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          subject: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          body_html?: string
          body_text?: string | null
          category?: string | null
          created_at?: string
          division_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      enrichment_jobs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          lead_id: string | null
          result: Json | null
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          result?: Json | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          result?: Json | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrichment_jobs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_tags: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          tag_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_sync_errors: {
        Row: {
          created_at: string
          error_code: string | null
          error_message: string
          error_payload: Json | null
          id: string
          job_id: string | null
          org_id: string
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          error_message: string
          error_payload?: Json | null
          id?: string
          job_id?: string | null
          org_id?: string
        }
        Update: {
          created_at?: string
          error_code?: string | null
          error_message?: string
          error_payload?: Json | null
          id?: string
          job_id?: string | null
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "erp_sync_errors_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "erp_sync_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "erp_sync_errors_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          org_id: string
        }
        Insert: {
          created_at?: string
          event_payload: Json
          event_type: string
          id?: string
          job_id?: string | null
          org_id?: string
        }
        Update: {
          created_at?: string
          event_payload?: Json
          event_type?: string
          id?: string
          job_id?: string | null
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "erp_sync_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "erp_sync_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "erp_sync_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          org_id: string
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
          org_id?: string
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
          org_id?: string
          payload?: Json
          scheduled_at?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["sync_status"]
          sync_direction?: Database["public"]["Enums"]["sync_direction"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "erp_sync_jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          org_id: string
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
          org_id?: string
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
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "erp_sync_map_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      esign_documents: {
        Row: {
          certificate_file_id: string | null
          checksum_sha256: string | null
          created_at: string
          envelope_id: string
          file_id: string | null
          id: string
          signed_at: string | null
        }
        Insert: {
          certificate_file_id?: string | null
          checksum_sha256?: string | null
          created_at?: string
          envelope_id: string
          file_id?: string | null
          id?: string
          signed_at?: string | null
        }
        Update: {
          certificate_file_id?: string | null
          checksum_sha256?: string | null
          created_at?: string
          envelope_id?: string
          file_id?: string | null
          id?: string
          signed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "esign_documents_envelope_id_fkey"
            columns: ["envelope_id"]
            isOneToOne: false
            referencedRelation: "esign_envelopes"
            referencedColumns: ["id"]
          },
        ]
      }
      esign_envelopes: {
        Row: {
          contract_id: string
          created_at: string
          id: string
          payload: Json
          provider: string
          provider_envelope_id: string | null
          signer_count: number
          status: string
          updated_at: string
          webhook_last_event_at: string | null
        }
        Insert: {
          contract_id: string
          created_at?: string
          id?: string
          payload?: Json
          provider?: string
          provider_envelope_id?: string | null
          signer_count?: number
          status: string
          updated_at?: string
          webhook_last_event_at?: string | null
        }
        Update: {
          contract_id?: string
          created_at?: string
          id?: string
          payload?: Json
          provider?: string
          provider_envelope_id?: string | null
          signer_count?: number
          status?: string
          updated_at?: string
          webhook_last_event_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "esign_envelopes_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_allowances: {
        Row: {
          allowance_amount: number
          allowance_name: string
          created_at: string
          estimate_id: string
          id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          allowance_amount?: number
          allowance_name: string
          created_at?: string
          estimate_id: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          allowance_amount?: number
          allowance_name?: string
          created_at?: string
          estimate_id?: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimate_allowances_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_alternates: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          estimate_id: string
          id: string
          selected: boolean
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string | null
          estimate_id: string
          id?: string
          selected?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          estimate_id?: string
          id?: string
          selected?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimate_alternates_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
        ]
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
          org_id: string
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
          org_id?: string
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
          org_id?: string
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
            foreignKeyName: "estimate_lines_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      estimate_templates: {
        Row: {
          created_at: string
          created_by: string | null
          division_id: string | null
          id: string
          is_default: boolean
          payload: Json
          project_type: string | null
          template_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          division_id?: string | null
          id?: string
          is_default?: boolean
          payload: Json
          project_type?: string | null
          template_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          division_id?: string | null
          id?: string
          is_default?: boolean
          payload?: Json
          project_type?: string | null
          template_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimate_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_templates_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
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
          org_id: string
          reason: string | null
          revision_no: number
          snapshot: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          estimate_id: string
          id?: string
          org_id?: string
          reason?: string | null
          revision_no: number
          snapshot: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          estimate_id?: string
          id?: string
          org_id?: string
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
          {
            foreignKeyName: "estimate_versions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          org_id: string
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
          org_id?: string
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
          org_id?: string
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
            foreignKeyName: "estimates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      executive_metrics_cache: {
        Row: {
          computed_at: string
          id: string
          metric_key: string
          metric_value: Json
          org_id: string
        }
        Insert: {
          computed_at?: string
          id?: string
          metric_key: string
          metric_value: Json
          org_id: string
        }
        Update: {
          computed_at?: string
          id?: string
          metric_key?: string
          metric_value?: Json
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "executive_metrics_cache_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_subscriptions: {
        Row: {
          billing_cycle: string | null
          category: string
          created_at: string
          currency: string | null
          division_id: string | null
          id: string
          is_active: boolean | null
          monthly_cost: number
          name: string
          notes: string | null
          org_id: string
          owner_user_id: string | null
          renewal_date: string | null
          updated_at: string
          vendor: string | null
        }
        Insert: {
          billing_cycle?: string | null
          category: string
          created_at?: string
          currency?: string | null
          division_id?: string | null
          id?: string
          is_active?: boolean | null
          monthly_cost: number
          name: string
          notes?: string | null
          org_id: string
          owner_user_id?: string | null
          renewal_date?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          billing_cycle?: string | null
          category?: string
          created_at?: string
          currency?: string | null
          division_id?: string | null
          id?: string
          is_active?: boolean | null
          monthly_cost?: number
          name?: string
          notes?: string | null
          org_id?: string
          owner_user_id?: string | null
          renewal_date?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "executive_subscriptions_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "executive_subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "executive_subscriptions_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_approvals: {
        Row: {
          created_at: string
          decision: string
          expense_id: string
          id: string
          reviewer_notes: string | null
          reviewer_user_id: string | null
        }
        Insert: {
          created_at?: string
          decision: string
          expense_id: string
          id?: string
          reviewer_notes?: string | null
          reviewer_user_id?: string | null
        }
        Update: {
          created_at?: string
          decision?: string
          expense_id?: string
          id?: string
          reviewer_notes?: string | null
          reviewer_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_approvals_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expense_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_approvals_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
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
          org_id: string
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
          org_id?: string
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
          org_id?: string
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
            foreignKeyName: "expense_claims_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      expense_receipts: {
        Row: {
          created_at: string
          expense_id: string
          file_id: string
          id: string
          ocr_payload: Json | null
        }
        Insert: {
          created_at?: string
          expense_id: string
          file_id: string
          id?: string
          ocr_payload?: Json | null
        }
        Update: {
          created_at?: string
          expense_id?: string
          file_id?: string
          id?: string
          ocr_payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_receipts_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expense_claims"
            referencedColumns: ["id"]
          },
        ]
      }
      file_folders: {
        Row: {
          created_at: string
          created_by: string | null
          folder_name: string
          folder_path: string
          id: string
          parent_folder_id: string | null
          project_id: string | null
          updated_at: string
          visibility: Database["public"]["Enums"]["file_visibility"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          folder_name: string
          folder_path: string
          id?: string
          parent_folder_id?: string | null
          project_id?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["file_visibility"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          folder_name?: string
          folder_path?: string
          id?: string
          parent_folder_id?: string | null
          project_id?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["file_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "file_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "file_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_folders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      file_metadata: {
        Row: {
          checksum_sha256: string | null
          created_at: string
          deleted_at: string | null
          file_path: string
          file_size_bytes: number
          filename: string
          folder_id: string | null
          id: string
          is_deleted: boolean
          mime_type: string | null
          original_filename: string
          project_id: string | null
          source_identifier: string | null
          source_system: string | null
          storage_bucket: string
          tags: string[] | null
          updated_at: string
          uploaded_by: string | null
          version_no: number
          visibility: Database["public"]["Enums"]["file_visibility"]
        }
        Insert: {
          checksum_sha256?: string | null
          created_at?: string
          deleted_at?: string | null
          file_path: string
          file_size_bytes: number
          filename: string
          folder_id?: string | null
          id?: string
          is_deleted?: boolean
          mime_type?: string | null
          original_filename: string
          project_id?: string | null
          source_identifier?: string | null
          source_system?: string | null
          storage_bucket: string
          tags?: string[] | null
          updated_at?: string
          uploaded_by?: string | null
          version_no?: number
          visibility?: Database["public"]["Enums"]["file_visibility"]
        }
        Update: {
          checksum_sha256?: string | null
          created_at?: string
          deleted_at?: string | null
          file_path?: string
          file_size_bytes?: number
          filename?: string
          folder_id?: string | null
          id?: string
          is_deleted?: boolean
          mime_type?: string | null
          original_filename?: string
          project_id?: string | null
          source_identifier?: string | null
          source_system?: string | null
          storage_bucket?: string
          tags?: string[] | null
          updated_at?: string
          uploaded_by?: string | null
          version_no?: number
          visibility?: Database["public"]["Enums"]["file_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "file_metadata_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "file_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_metadata_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_metadata_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      file_shares: {
        Row: {
          created_at: string
          expires_at: string | null
          file_id: string
          id: string
          is_active: boolean
          permission_level: string
          shared_by: string | null
          shared_with_portal_actor_id: string | null
          shared_with_user_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          file_id: string
          id?: string
          is_active?: boolean
          permission_level?: string
          shared_by?: string | null
          shared_with_portal_actor_id?: string | null
          shared_with_user_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          file_id?: string
          id?: string
          is_active?: boolean
          permission_level?: string
          shared_by?: string | null
          shared_with_portal_actor_id?: string | null
          shared_with_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "file_shares_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "file_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_shares_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_shares_shared_with_user_id_fkey"
            columns: ["shared_with_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      file_versions: {
        Row: {
          change_note: string | null
          checksum_sha256: string | null
          created_at: string
          file_id: string
          file_path: string
          id: string
          storage_bucket: string
          uploaded_by: string | null
          version_no: number
        }
        Insert: {
          change_note?: string | null
          checksum_sha256?: string | null
          created_at?: string
          file_id: string
          file_path: string
          id?: string
          storage_bucket: string
          uploaded_by?: string | null
          version_no: number
        }
        Update: {
          change_note?: string | null
          checksum_sha256?: string | null
          created_at?: string
          file_id?: string
          file_path?: string
          id?: string
          storage_bucket?: string
          uploaded_by?: string | null
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "file_versions_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "file_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_versions_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_vehicles: {
        Row: {
          acquisition_date: string | null
          assigned_to: string | null
          created_at: string
          created_by: string | null
          division_id: string
          id: string
          insurance_expiry: string | null
          is_active: boolean
          license_plate: string | null
          make: string | null
          model: string | null
          notes: string | null
          org_id: string
          ownership_type: Database["public"]["Enums"]["fleet_ownership_type"]
          status: Database["public"]["Enums"]["fleet_vehicle_status"]
          unit_number: string
          updated_at: string
          vehicle_type: Database["public"]["Enums"]["fleet_vehicle_type"]
          vin: string | null
          year: number | null
        }
        Insert: {
          acquisition_date?: string | null
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          division_id: string
          id?: string
          insurance_expiry?: string | null
          is_active?: boolean
          license_plate?: string | null
          make?: string | null
          model?: string | null
          notes?: string | null
          org_id?: string
          ownership_type?: Database["public"]["Enums"]["fleet_ownership_type"]
          status?: Database["public"]["Enums"]["fleet_vehicle_status"]
          unit_number: string
          updated_at?: string
          vehicle_type?: Database["public"]["Enums"]["fleet_vehicle_type"]
          vin?: string | null
          year?: number | null
        }
        Update: {
          acquisition_date?: string | null
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          division_id?: string
          id?: string
          insurance_expiry?: string | null
          is_active?: boolean
          license_plate?: string | null
          make?: string | null
          model?: string | null
          notes?: string | null
          org_id?: string
          ownership_type?: Database["public"]["Enums"]["fleet_ownership_type"]
          status?: Database["public"]["Enums"]["fleet_vehicle_status"]
          unit_number?: string
          updated_at?: string
          vehicle_type?: Database["public"]["Enums"]["fleet_vehicle_type"]
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fleet_vehicles_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_vehicles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_vehicles_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      icp_lead_matches: {
        Row: {
          computed_at: string
          icp_id: string
          id: string
          lead_id: string
          match_details: Json | null
          match_score: number
          org_id: string | null
        }
        Insert: {
          computed_at?: string
          icp_id: string
          id?: string
          lead_id: string
          match_details?: Json | null
          match_score: number
          org_id?: string | null
        }
        Update: {
          computed_at?: string
          icp_id?: string
          id?: string
          lead_id?: string
          match_details?: Json | null
          match_score?: number
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "icp_lead_matches_icp_id_fkey"
            columns: ["icp_id"]
            isOneToOne: false
            referencedRelation: "ideal_client_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "icp_lead_matches_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      ideal_client_profiles: {
        Row: {
          avg_deal_value: number | null
          avg_project_duration_days: number | null
          company_size_range: Json | null
          confidence_score: number | null
          created_at: string
          description: string | null
          division_id: string | null
          geography_match: Json | null
          id: string
          industry_match: string[] | null
          is_active: boolean | null
          is_auto_generated: boolean | null
          metadata: Json | null
          name: string
          org_id: string | null
          project_types: string[] | null
          project_value_range: Json | null
          repeat_rate_weight: number | null
          sample_size: number | null
          top_sources: string[] | null
          updated_at: string
        }
        Insert: {
          avg_deal_value?: number | null
          avg_project_duration_days?: number | null
          company_size_range?: Json | null
          confidence_score?: number | null
          created_at?: string
          description?: string | null
          division_id?: string | null
          geography_match?: Json | null
          id?: string
          industry_match?: string[] | null
          is_active?: boolean | null
          is_auto_generated?: boolean | null
          metadata?: Json | null
          name: string
          org_id?: string | null
          project_types?: string[] | null
          project_value_range?: Json | null
          repeat_rate_weight?: number | null
          sample_size?: number | null
          top_sources?: string[] | null
          updated_at?: string
        }
        Update: {
          avg_deal_value?: number | null
          avg_project_duration_days?: number | null
          company_size_range?: Json | null
          confidence_score?: number | null
          created_at?: string
          description?: string | null
          division_id?: string | null
          geography_match?: Json | null
          id?: string
          industry_match?: string[] | null
          is_active?: boolean | null
          is_auto_generated?: boolean | null
          metadata?: Json | null
          name?: string
          org_id?: string | null
          project_types?: string[] | null
          project_value_range?: Json | null
          repeat_rate_weight?: number | null
          sample_size?: number | null
          top_sources?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ideal_client_profiles_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      idempotency_keys: {
        Row: {
          actor_user_id: string | null
          created_at: string
          endpoint: string
          expires_at: string
          id: string
          key_value: string
          request_hash: string
          response_body: Json | null
          response_code: number | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          endpoint: string
          expires_at: string
          id?: string
          key_value: string
          request_hash: string
          response_body?: Json | null
          response_code?: number | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          endpoint?: string
          expires_at?: string
          id?: string
          key_value?: string
          request_hash?: string
          response_body?: Json | null
          response_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "idempotency_keys_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          created_at: string
          id: string
          inspection_date: string
          inspection_type: string
          inspector_user_id: string | null
          payload: Json
          project_id: string
          state: Database["public"]["Enums"]["workflow_state"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          inspection_date: string
          inspection_type: string
          inspector_user_id?: string | null
          payload: Json
          project_id: string
          state?: Database["public"]["Enums"]["workflow_state"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          inspection_date?: string
          inspection_type?: string
          inspector_user_id?: string | null
          payload?: Json
          project_id?: string
          state?: Database["public"]["Enums"]["workflow_state"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspections_inspector_user_id_fkey"
            columns: ["inspector_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_bom: {
        Row: {
          assembly_item_id: string
          created_at: string
          created_by: string | null
          division_id: string
          id: string
          is_active: boolean
          org_id: string
          revision: string | null
          updated_at: string
        }
        Insert: {
          assembly_item_id: string
          created_at?: string
          created_by?: string | null
          division_id: string
          id?: string
          is_active?: boolean
          org_id?: string
          revision?: string | null
          updated_at?: string
        }
        Update: {
          assembly_item_id?: string
          created_at?: string
          created_by?: string | null
          division_id?: string
          id?: string
          is_active?: boolean
          org_id?: string
          revision?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_bom_assembly_item_id_fkey"
            columns: ["assembly_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_bom_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_bom_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_bom_lines: {
        Row: {
          bom_id: string
          component_item_id: string
          id: string
          is_critical: boolean
          labor_cost: number | null
          labor_hours: number | null
          notes: string | null
          quantity: number
          sort_order: number
        }
        Insert: {
          bom_id: string
          component_item_id: string
          id?: string
          is_critical?: boolean
          labor_cost?: number | null
          labor_hours?: number | null
          notes?: string | null
          quantity: number
          sort_order?: number
        }
        Update: {
          bom_id?: string
          component_item_id?: string
          id?: string
          is_critical?: boolean
          labor_cost?: number | null
          labor_hours?: number | null
          notes?: string | null
          quantity?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_bom_lines_bom_id_fkey"
            columns: ["bom_id"]
            isOneToOne: false
            referencedRelation: "inventory_bom"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_bom_lines_component_item_id_fkey"
            columns: ["component_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_goods_receipts: {
        Row: {
          created_at: string
          created_by: string | null
          division_id: string
          gr_number: string
          id: string
          location_id: string
          notes: string | null
          org_id: string
          po_id: string
          received_by: string
          received_date: string
          status: Database["public"]["Enums"]["inventory_gr_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          division_id: string
          gr_number: string
          id?: string
          location_id: string
          notes?: string | null
          org_id?: string
          po_id: string
          received_by: string
          received_date?: string
          status?: Database["public"]["Enums"]["inventory_gr_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          division_id?: string
          gr_number?: string
          id?: string
          location_id?: string
          notes?: string | null
          org_id?: string
          po_id?: string
          received_by?: string
          received_date?: string
          status?: Database["public"]["Enums"]["inventory_gr_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_goods_receipts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_goods_receipts_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_goods_receipts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_goods_receipts_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "inventory_purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_goods_receipts_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_gr_lines: {
        Row: {
          condition_notes: string | null
          created_at: string
          gr_id: string
          id: string
          item_id: string
          lot_number: string | null
          po_line_id: string
          qty_received: number
          serial_number: string | null
          spot_id: string | null
          unit_price: number
        }
        Insert: {
          condition_notes?: string | null
          created_at?: string
          gr_id: string
          id?: string
          item_id: string
          lot_number?: string | null
          po_line_id: string
          qty_received: number
          serial_number?: string | null
          spot_id?: string | null
          unit_price: number
        }
        Update: {
          condition_notes?: string | null
          created_at?: string
          gr_id?: string
          id?: string
          item_id?: string
          lot_number?: string | null
          po_line_id?: string
          qty_received?: number
          serial_number?: string | null
          spot_id?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_gr_lines_gr_id_fkey"
            columns: ["gr_id"]
            isOneToOne: false
            referencedRelation: "inventory_goods_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_gr_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_gr_lines_po_line_id_fkey"
            columns: ["po_line_id"]
            isOneToOne: false
            referencedRelation: "inventory_po_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_gr_lines_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "inventory_spots"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_item_categories: {
        Row: {
          created_at: string
          created_by: string | null
          division_id: string
          id: string
          name: string
          org_id: string
          parent_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          division_id: string
          id?: string
          name: string
          org_id?: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          division_id?: string
          id?: string
          name?: string
          org_id?: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_item_categories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_item_categories_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_item_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "inventory_item_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_item_suppliers: {
        Row: {
          created_at: string
          id: string
          is_preferred: boolean
          item_id: string
          lead_days: number | null
          pack_size: number | null
          supplier_id: string
          supplier_part_number: string | null
          supplier_price: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_preferred?: boolean
          item_id: string
          lead_days?: number | null
          pack_size?: number | null
          supplier_id: string
          supplier_part_number?: string | null
          supplier_price?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_preferred?: boolean
          item_id?: string
          lead_days?: number | null
          pack_size?: number | null
          supplier_id?: string
          supplier_part_number?: string | null
          supplier_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_item_suppliers_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_item_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "portal_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          almyta_part_no: number | null
          almyta_short_id: string | null
          barcode: string | null
          category_id: string | null
          cost_catalog_item_id: string | null
          created_at: string
          created_by: string | null
          current_revision: string | null
          default_supplier_id: string | null
          description: string | null
          division_id: string
          id: string
          is_active: boolean
          manufacturer: string | null
          max_stock_level: number | null
          min_stock_level: number | null
          model_number: string | null
          name: string
          org_id: string
          part_number_manufacturer: string | null
          reorder_qty: number | null
          secondary_uom: Database["public"]["Enums"]["inventory_uom"] | null
          secondary_uom_conversion: number | null
          sku: string
          tracking_type: Database["public"]["Enums"]["inventory_tracking_type"]
          unit_of_measure: Database["public"]["Enums"]["inventory_uom"]
          updated_at: string
          valuation_method: Database["public"]["Enums"]["inventory_valuation_method"]
          weight_gross: number | null
          weight_net: number | null
          weight_uom: string | null
        }
        Insert: {
          almyta_part_no?: number | null
          almyta_short_id?: string | null
          barcode?: string | null
          category_id?: string | null
          cost_catalog_item_id?: string | null
          created_at?: string
          created_by?: string | null
          current_revision?: string | null
          default_supplier_id?: string | null
          description?: string | null
          division_id: string
          id?: string
          is_active?: boolean
          manufacturer?: string | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          model_number?: string | null
          name: string
          org_id?: string
          part_number_manufacturer?: string | null
          reorder_qty?: number | null
          secondary_uom?: Database["public"]["Enums"]["inventory_uom"] | null
          secondary_uom_conversion?: number | null
          sku: string
          tracking_type?: Database["public"]["Enums"]["inventory_tracking_type"]
          unit_of_measure?: Database["public"]["Enums"]["inventory_uom"]
          updated_at?: string
          valuation_method?: Database["public"]["Enums"]["inventory_valuation_method"]
          weight_gross?: number | null
          weight_net?: number | null
          weight_uom?: string | null
        }
        Update: {
          almyta_part_no?: number | null
          almyta_short_id?: string | null
          barcode?: string | null
          category_id?: string | null
          cost_catalog_item_id?: string | null
          created_at?: string
          created_by?: string | null
          current_revision?: string | null
          default_supplier_id?: string | null
          description?: string | null
          division_id?: string
          id?: string
          is_active?: boolean
          manufacturer?: string | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          model_number?: string | null
          name?: string
          org_id?: string
          part_number_manufacturer?: string | null
          reorder_qty?: number | null
          secondary_uom?: Database["public"]["Enums"]["inventory_uom"] | null
          secondary_uom_conversion?: number | null
          sku?: string
          tracking_type?: Database["public"]["Enums"]["inventory_tracking_type"]
          unit_of_measure?: Database["public"]["Enums"]["inventory_uom"]
          updated_at?: string
          valuation_method?: Database["public"]["Enums"]["inventory_valuation_method"]
          weight_gross?: number | null
          weight_net?: number | null
          weight_uom?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "inventory_item_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_cost_catalog_item_id_fkey"
            columns: ["cost_catalog_item_id"]
            isOneToOne: false
            referencedRelation: "cost_catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_default_supplier_id_fkey"
            columns: ["default_supplier_id"]
            isOneToOne: false
            referencedRelation: "portal_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_ledger: {
        Row: {
          counterpart_location_id: string | null
          created_at: string
          division_id: string
          id: string
          item_id: string
          location_id: string
          lot_number: string | null
          notes: string | null
          org_id: string
          project_id: string | null
          qty_change: number
          reason_code: string | null
          reference_id: string | null
          reference_type: string | null
          serial_id: string | null
          spot_id: string | null
          transacted_at: string
          transacted_by: string
          transaction_type: Database["public"]["Enums"]["inventory_transaction_type"]
          valuation_rate: number
          value_change: number
        }
        Insert: {
          counterpart_location_id?: string | null
          created_at?: string
          division_id: string
          id?: string
          item_id: string
          location_id: string
          lot_number?: string | null
          notes?: string | null
          org_id?: string
          project_id?: string | null
          qty_change: number
          reason_code?: string | null
          reference_id?: string | null
          reference_type?: string | null
          serial_id?: string | null
          spot_id?: string | null
          transacted_at?: string
          transacted_by: string
          transaction_type: Database["public"]["Enums"]["inventory_transaction_type"]
          valuation_rate?: number
          value_change?: number
        }
        Update: {
          counterpart_location_id?: string | null
          created_at?: string
          division_id?: string
          id?: string
          item_id?: string
          location_id?: string
          lot_number?: string | null
          notes?: string | null
          org_id?: string
          project_id?: string | null
          qty_change?: number
          reason_code?: string | null
          reference_id?: string | null
          reference_type?: string | null
          serial_id?: string | null
          spot_id?: string | null
          transacted_at?: string
          transacted_by?: string
          transaction_type?: Database["public"]["Enums"]["inventory_transaction_type"]
          valuation_rate?: number
          value_change?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_ledger_counterpart_location_id_fkey"
            columns: ["counterpart_location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_ledger_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_ledger_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_ledger_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_ledger_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_ledger_serial_id_fkey"
            columns: ["serial_id"]
            isOneToOne: false
            referencedRelation: "inventory_serials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_ledger_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "inventory_spots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_ledger_transacted_by_fkey"
            columns: ["transacted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_locations: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          division_id: string
          id: string
          is_active: boolean
          linked_vehicle_id: string | null
          location_type: Database["public"]["Enums"]["inventory_location_type"]
          name: string
          org_id: string
          parent_location_id: string | null
          project_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          division_id: string
          id?: string
          is_active?: boolean
          linked_vehicle_id?: string | null
          location_type: Database["public"]["Enums"]["inventory_location_type"]
          name: string
          org_id?: string
          parent_location_id?: string | null
          project_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          division_id?: string
          id?: string
          is_active?: boolean
          linked_vehicle_id?: string | null
          location_type?: Database["public"]["Enums"]["inventory_location_type"]
          name?: string
          org_id?: string
          parent_location_id?: string | null
          project_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_locations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_locations_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_locations_linked_vehicle_id_fkey"
            columns: ["linked_vehicle_id"]
            isOneToOne: false
            referencedRelation: "fleet_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_locations_parent_location_id_fkey"
            columns: ["parent_location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_locations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_lots: {
        Row: {
          created_at: string
          division_id: string
          expiry_date: string | null
          id: string
          initial_qty: number | null
          item_id: string
          lot_number: string
          manufacture_date: string | null
          notes: string | null
          org_id: string
        }
        Insert: {
          created_at?: string
          division_id: string
          expiry_date?: string | null
          id?: string
          initial_qty?: number | null
          item_id: string
          lot_number: string
          manufacture_date?: string | null
          notes?: string | null
          org_id?: string
        }
        Update: {
          created_at?: string
          division_id?: string
          expiry_date?: string | null
          id?: string
          initial_qty?: number | null
          item_id?: string
          lot_number?: string
          manufacture_date?: string | null
          notes?: string | null
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_lots_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_lots_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_po_lines: {
        Row: {
          created_at: string
          description: string
          id: string
          item_id: string
          line_number: number
          line_total: number
          notes: string | null
          po_id: string
          qty_ordered: number
          qty_received: number
          supplier_part_number: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          item_id: string
          line_number: number
          line_total: number
          notes?: string | null
          po_id: string
          qty_ordered: number
          qty_received?: number
          supplier_part_number?: string | null
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          item_id?: string
          line_number?: number
          line_total?: number
          notes?: string | null
          po_id?: string
          qty_ordered?: number
          qty_received?: number
          supplier_part_number?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_po_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_po_lines_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "inventory_purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_purchase_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          delivery_location_id: string | null
          division_id: string
          expected_delivery_date: string | null
          id: string
          notes: string | null
          order_date: string
          org_id: string
          po_number: string
          project_id: string | null
          rfq_bid_id: string | null
          status: Database["public"]["Enums"]["inventory_po_status"]
          subtotal: number
          supplier_id: string
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          delivery_location_id?: string | null
          division_id: string
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          org_id?: string
          po_number: string
          project_id?: string | null
          rfq_bid_id?: string | null
          status?: Database["public"]["Enums"]["inventory_po_status"]
          subtotal?: number
          supplier_id: string
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          delivery_location_id?: string | null
          division_id?: string
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          org_id?: string
          po_number?: string
          project_id?: string | null
          rfq_bid_id?: string | null
          status?: Database["public"]["Enums"]["inventory_po_status"]
          subtotal?: number
          supplier_id?: string
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_purchase_orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_purchase_orders_delivery_location_id_fkey"
            columns: ["delivery_location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_purchase_orders_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_purchase_orders_rfq_bid_id_fkey"
            columns: ["rfq_bid_id"]
            isOneToOne: false
            referencedRelation: "rfq_bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "portal_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_serials: {
        Row: {
          acquisition_cost: number | null
          almyta_rec_id: number | null
          checked_out_to: string | null
          condition_notes: string | null
          created_at: string
          current_location_id: string | null
          current_spot_id: string | null
          division_id: string
          id: string
          item_id: string
          org_id: string
          purchase_date: string | null
          secondary_serial: string | null
          serial_number: string
          status: Database["public"]["Enums"]["serial_status"]
          updated_at: string
          warranty_expiry: string | null
        }
        Insert: {
          acquisition_cost?: number | null
          almyta_rec_id?: number | null
          checked_out_to?: string | null
          condition_notes?: string | null
          created_at?: string
          current_location_id?: string | null
          current_spot_id?: string | null
          division_id: string
          id?: string
          item_id: string
          org_id?: string
          purchase_date?: string | null
          secondary_serial?: string | null
          serial_number: string
          status?: Database["public"]["Enums"]["serial_status"]
          updated_at?: string
          warranty_expiry?: string | null
        }
        Update: {
          acquisition_cost?: number | null
          almyta_rec_id?: number | null
          checked_out_to?: string | null
          condition_notes?: string | null
          created_at?: string
          current_location_id?: string | null
          current_spot_id?: string | null
          division_id?: string
          id?: string
          item_id?: string
          org_id?: string
          purchase_date?: string | null
          secondary_serial?: string | null
          serial_number?: string
          status?: Database["public"]["Enums"]["serial_status"]
          updated_at?: string
          warranty_expiry?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_serials_checked_out_to_fkey"
            columns: ["checked_out_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_serials_current_location_id_fkey"
            columns: ["current_location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_serials_current_spot_id_fkey"
            columns: ["current_spot_id"]
            isOneToOne: false
            referencedRelation: "inventory_spots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_serials_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_serials_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_spots: {
        Row: {
          id: string
          is_active: boolean
          location_id: string
          name: string
          sort_order: number
        }
        Insert: {
          id?: string
          is_active?: boolean
          location_id: string
          name: string
          sort_order?: number
        }
        Update: {
          id?: string
          is_active?: boolean
          location_id?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_spots_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_snapshots: {
        Row: {
          amount_paid: number
          created_at: string
          customer_name: string | null
          due_date: string | null
          erp_docname: string | null
          id: string
          invoice_date: string | null
          invoice_number: string
          payment_link_url: string | null
          project_id: string | null
          snapshot_payload: Json
          status: Database["public"]["Enums"]["invoice_snapshot_status"]
          subtotal_amount: number
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          customer_name?: string | null
          due_date?: string | null
          erp_docname?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number: string
          payment_link_url?: string | null
          project_id?: string | null
          snapshot_payload: Json
          status?: Database["public"]["Enums"]["invoice_snapshot_status"]
          subtotal_amount?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          customer_name?: string | null
          due_date?: string | null
          erp_docname?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string
          payment_link_url?: string | null
          project_id?: string | null
          snapshot_payload?: Json
          status?: Database["public"]["Enums"]["invoice_snapshot_status"]
          subtotal_amount?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      job_cost_snapshots: {
        Row: {
          actual_cost: number
          baseline_budget: number
          committed_cost: number
          created_at: string
          forecast_cost: number
          forecast_margin_pct: number | null
          id: string
          payload: Json
          project_id: string
          revised_budget: number
          snapshot_date: string
        }
        Insert: {
          actual_cost?: number
          baseline_budget?: number
          committed_cost?: number
          created_at?: string
          forecast_cost?: number
          forecast_margin_pct?: number | null
          id?: string
          payload?: Json
          project_id: string
          revised_budget?: number
          snapshot_date: string
        }
        Update: {
          actual_cost?: number
          baseline_budget?: number
          committed_cost?: number
          created_at?: string
          forecast_cost?: number
          forecast_margin_pct?: number | null
          id?: string
          payload?: Json
          project_id?: string
          revised_budget?: number
          snapshot_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_cost_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_docs: {
        Row: {
          category: string | null
          checksum: string | null
          created_at: string
          division_id: string | null
          file_path: string
          id: string
          last_synced_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          checksum?: string | null
          created_at?: string
          division_id?: string | null
          file_path: string
          id?: string
          last_synced_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          checksum?: string | null
          created_at?: string
          division_id?: string | null
          file_path?: string
          id?: string
          last_synced_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_docs_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_embeddings: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          doc_id: string
          embedding: string | null
          id: string
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          doc_id: string
          embedding?: string | null
          id?: string
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          doc_id?: string
          embedding?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_embeddings_doc_id_fkey"
            columns: ["doc_id"]
            isOneToOne: false
            referencedRelation: "knowledge_docs"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_staging: {
        Row: {
          category: string | null
          content_checksum: string
          created_at: string
          division_id: string | null
          edited_content: string | null
          id: string
          org_id: string
          raw_content: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_path: string | null
          source_type: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content_checksum: string
          created_at?: string
          division_id?: string | null
          edited_content?: string | null
          id?: string
          org_id: string
          raw_content: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_path?: string | null
          source_type?: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content_checksum?: string
          created_at?: string
          division_id?: string | null
          edited_content?: string | null
          id?: string
          org_id?: string
          raw_content?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_path?: string | null
          source_type?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_staging_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_staging_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_staging_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_account_matches: {
        Row: {
          account_id: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          is_confirmed: boolean | null
          lead_id: string
          match_score: number
          match_type: string
          org_id: string | null
        }
        Insert: {
          account_id: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          is_confirmed?: boolean | null
          lead_id: string
          match_score: number
          match_type: string
          org_id?: string | null
        }
        Update: {
          account_id?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          is_confirmed?: boolean | null
          lead_id?: string
          match_score?: number
          match_type?: string
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_account_matches_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_account_matches_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_assignment_rules: {
        Row: {
          assigned_user_id: string
          created_at: string
          division_id: string | null
          id: string
          is_active: boolean
          priority: number
          source_channel: string | null
          updated_at: string
        }
        Insert: {
          assigned_user_id: string
          created_at?: string
          division_id?: string | null
          id?: string
          is_active?: boolean
          priority?: number
          source_channel?: string | null
          updated_at?: string
        }
        Update: {
          assigned_user_id?: string
          created_at?: string
          division_id?: string | null
          id?: string
          is_active?: boolean
          priority?: number
          source_channel?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_assignment_rules_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignment_rules_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_score_history: {
        Row: {
          engagement_score: number | null
          fit_score: number | null
          id: string
          intent_score: number | null
          lead_id: string | null
          lead_score: number | null
          recorded_at: string | null
          triggered_by: string | null
        }
        Insert: {
          engagement_score?: number | null
          fit_score?: number | null
          id?: string
          intent_score?: number | null
          lead_id?: string | null
          lead_score?: number | null
          recorded_at?: string | null
          triggered_by?: string | null
        }
        Update: {
          engagement_score?: number | null
          fit_score?: number | null
          id?: string
          intent_score?: number | null
          lead_id?: string | null
          lead_score?: number | null
          recorded_at?: string | null
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_score_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_stage_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_stage: string | null
          id: string
          lead_id: string
          notes: string | null
          to_stage: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_stage?: string | null
          id?: string
          lead_id: string
          notes?: string | null
          to_stage: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_stage?: string | null
          id?: string
          lead_id?: string
          notes?: string | null
          to_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_stage_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_stage_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_workstation_notes: {
        Row: {
          contacted: boolean | null
          contacted_at: string | null
          lead_id: string
          next_followup: string | null
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          contacted?: boolean | null
          contacted_at?: string | null
          lead_id: string
          next_followup?: string | null
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          contacted?: boolean | null
          contacted_at?: string | null
          lead_id?: string
          next_followup?: string | null
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          address: string | null
          assigned_to: string | null
          automation_paused: boolean | null
          city: string | null
          company_name: string
          created_at: string
          current_sequence_id: string | null
          decision_date: string | null
          deleted_at: string | null
          disqualified_reason: string | null
          division_id: string | null
          domain: string | null
          domain_hash: string | null
          engagement_score: number | null
          enrichment_data: Json | null
          enrichment_status: string | null
          estimated_sqft: number | null
          estimated_value: number | null
          external_id: string | null
          fit_score: number | null
          id: string
          industry: string | null
          intent_score: number | null
          is_qualified: boolean | null
          last_automation_at: string | null
          last_touch_at: string | null
          lead_score: number | null
          lost_reason: string | null
          next_followup_at: string | null
          nurture_status: Database["public"]["Enums"]["nurture_status"] | null
          org_id: string
          postal_code: string | null
          project_description: string | null
          project_type: string | null
          province: string | null
          qualified_at: string | null
          qualified_by: string | null
          sequence_step: number | null
          source_channel: string
          source_detail: string | null
          stage_entered_at: string | null
          status: Database["public"]["Enums"]["lead_status"]
          timeline_urgency: string | null
          updated_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          address?: string | null
          assigned_to?: string | null
          automation_paused?: boolean | null
          city?: string | null
          company_name: string
          created_at?: string
          current_sequence_id?: string | null
          decision_date?: string | null
          deleted_at?: string | null
          disqualified_reason?: string | null
          division_id?: string | null
          domain?: string | null
          domain_hash?: string | null
          engagement_score?: number | null
          enrichment_data?: Json | null
          enrichment_status?: string | null
          estimated_sqft?: number | null
          estimated_value?: number | null
          external_id?: string | null
          fit_score?: number | null
          id?: string
          industry?: string | null
          intent_score?: number | null
          is_qualified?: boolean | null
          last_automation_at?: string | null
          last_touch_at?: string | null
          lead_score?: number | null
          lost_reason?: string | null
          next_followup_at?: string | null
          nurture_status?: Database["public"]["Enums"]["nurture_status"] | null
          org_id?: string
          postal_code?: string | null
          project_description?: string | null
          project_type?: string | null
          province?: string | null
          qualified_at?: string | null
          qualified_by?: string | null
          sequence_step?: number | null
          source_channel: string
          source_detail?: string | null
          stage_entered_at?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          timeline_urgency?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          address?: string | null
          assigned_to?: string | null
          automation_paused?: boolean | null
          city?: string | null
          company_name?: string
          created_at?: string
          current_sequence_id?: string | null
          decision_date?: string | null
          deleted_at?: string | null
          disqualified_reason?: string | null
          division_id?: string | null
          domain?: string | null
          domain_hash?: string | null
          engagement_score?: number | null
          enrichment_data?: Json | null
          enrichment_status?: string | null
          estimated_sqft?: number | null
          estimated_value?: number | null
          external_id?: string | null
          fit_score?: number | null
          id?: string
          industry?: string | null
          intent_score?: number | null
          is_qualified?: boolean | null
          last_automation_at?: string | null
          last_touch_at?: string | null
          lead_score?: number | null
          lost_reason?: string | null
          next_followup_at?: string | null
          nurture_status?: Database["public"]["Enums"]["nurture_status"] | null
          org_id?: string
          postal_code?: string | null
          project_description?: string | null
          project_type?: string | null
          province?: string | null
          qualified_at?: string | null
          qualified_by?: string | null
          sequence_step?: number | null
          source_channel?: string
          source_detail?: string | null
          stage_entered_at?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          timeline_urgency?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_leads_sequence"
            columns: ["current_sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "leads_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_qualified_by_fkey"
            columns: ["qualified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_notes: {
        Row: {
          attendees: string[] | null
          content: string | null
          created_at: string
          created_by: string | null
          id: string
          meeting_date: string | null
          project_id: string
          title: string
          updated_at: string
        }
        Insert: {
          attendees?: string[] | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          meeting_date?: string | null
          project_id: string
          title: string
          updated_at?: string
        }
        Update: {
          attendees?: string[] | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          meeting_date?: string | null
          project_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_attachments: {
        Row: {
          created_at: string
          id: string
          record_id: string
          source_file_path: string
          status: string
          target_file_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          record_id: string
          source_file_path: string
          status?: string
          target_file_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          record_id?: string
          source_file_path?: string
          status?: string
          target_file_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "migration_attachments_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "migration_records"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_batches: {
        Row: {
          batch_name: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          source_system: string
          started_at: string | null
          status: string
          summary: Json | null
          updated_at: string
        }
        Insert: {
          batch_name: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          source_system: string
          started_at?: string | null
          status?: string
          summary?: Json | null
          updated_at?: string
        }
        Update: {
          batch_name?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          source_system?: string
          started_at?: string | null
          status?: string
          summary?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "migration_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_conflicts: {
        Row: {
          batch_id: string | null
          conflict_payload: Json
          conflict_type: string
          created_at: string
          entity_type: string | null
          id: string
          record_id: string
          resolution_notes: string | null
          resolution_status: string
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          batch_id?: string | null
          conflict_payload: Json
          conflict_type: string
          created_at?: string
          entity_type?: string | null
          id?: string
          record_id: string
          resolution_notes?: string | null
          resolution_status?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          batch_id?: string | null
          conflict_payload?: Json
          conflict_type?: string
          created_at?: string
          entity_type?: string | null
          id?: string
          record_id?: string
          resolution_notes?: string | null
          resolution_status?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "migration_conflicts_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "migration_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "migration_conflicts_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "migration_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "migration_conflicts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_records: {
        Row: {
          batch_id: string
          created_at: string
          error_message: string | null
          id: string
          source_key: string
          source_payload: Json | null
          source_type: string
          status: string
          target_entity_id: string | null
          target_entity_type: string
          transform_payload: Json | null
          updated_at: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          source_key: string
          source_payload?: Json | null
          source_type: string
          status?: string
          target_entity_id?: string | null
          target_entity_type: string
          transform_payload?: Json | null
          updated_at?: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          source_key?: string
          source_payload?: Json | null
          source_type?: string
          status?: string
          target_entity_id?: string | null
          target_entity_type?: string
          transform_payload?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "migration_records_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "migration_batches"
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
          org_id: string
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
          org_id?: string
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
          org_id?: string
          owner_user_id?: string | null
          planned_date?: string | null
          project_id?: string
          status?: Database["public"]["Enums"]["workflow_state"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
      notes: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          id: string
          is_pinned: boolean
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          id?: string
          is_pinned?: boolean
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          is_pinned?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
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
          org_id: string
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
          org_id?: string
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
          org_id?: string
          push_enabled?: boolean
          quiet_hours?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          org_id: string
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
          org_id?: string
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
          org_id?: string
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
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          org_id: string
          owner_user_id: string | null
          probability_pct: number | null
          source_channel: string | null
          stage: Database["public"]["Enums"]["opportunity_stage"]
          stage_entered_at: string | null
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
          org_id?: string
          owner_user_id?: string | null
          probability_pct?: number | null
          source_channel?: string | null
          stage?: Database["public"]["Enums"]["opportunity_stage"]
          stage_entered_at?: string | null
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
          org_id?: string
          owner_user_id?: string | null
          probability_pct?: number | null
          source_channel?: string | null
          stage?: Database["public"]["Enums"]["opportunity_stage"]
          stage_entered_at?: string | null
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
            foreignKeyName: "opportunities_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      org_settings: {
        Row: {
          branding: Json
          created_at: string
          feature_flags: Json
          id: string
          org_id: string
          updated_at: string
          workflow: Json
        }
        Insert: {
          branding?: Json
          created_at?: string
          feature_flags?: Json
          id?: string
          org_id: string
          updated_at?: string
          workflow?: Json
        }
        Update: {
          branding?: Json
          created_at?: string
          feature_flags?: Json
          id?: string
          org_id?: string
          updated_at?: string
          workflow?: Json
        }
        Relationships: [
          {
            foreignKeyName: "org_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          locale: string
          metadata: Json
          name: string
          slug: string
          status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          locale?: string
          metadata?: Json
          name: string
          slug: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          locale?: string
          metadata?: Json
          name?: string
          slug?: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      outreach: {
        Row: {
          activity_type: string | null
          channel: Database["public"]["Enums"]["outreach_channel"]
          clicked_at: string | null
          contact_id: string | null
          created_by: string | null
          delivery_status: string | null
          direction: string
          id: string
          is_automated: boolean | null
          lead_id: string | null
          message_preview: string | null
          notes: string | null
          occurred_at: string | null
          opened_at: string | null
          outcome: string | null
          outcome_detail: string | null
          replied_at: string | null
          sequence_id: string | null
          sequence_step: number | null
          subject: string | null
        }
        Insert: {
          activity_type?: string | null
          channel: Database["public"]["Enums"]["outreach_channel"]
          clicked_at?: string | null
          contact_id?: string | null
          created_by?: string | null
          delivery_status?: string | null
          direction: string
          id?: string
          is_automated?: boolean | null
          lead_id?: string | null
          message_preview?: string | null
          notes?: string | null
          occurred_at?: string | null
          opened_at?: string | null
          outcome?: string | null
          outcome_detail?: string | null
          replied_at?: string | null
          sequence_id?: string | null
          sequence_step?: number | null
          subject?: string | null
        }
        Update: {
          activity_type?: string | null
          channel?: Database["public"]["Enums"]["outreach_channel"]
          clicked_at?: string | null
          contact_id?: string | null
          created_by?: string | null
          delivery_status?: string | null
          direction?: string
          id?: string
          is_automated?: boolean | null
          lead_id?: string | null
          message_preview?: string | null
          notes?: string | null
          occurred_at?: string | null
          opened_at?: string | null
          outcome?: string | null
          outcome_detail?: string | null
          replied_at?: string | null
          sequence_id?: string | null
          sequence_step?: number | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_export_rows: {
        Row: {
          cost_code: string | null
          created_at: string
          department: string | null
          employee_id: string
          employee_name: string | null
          error_message: string | null
          export_id: string
          hours_overtime: number
          hours_regular: number
          id: string
          pay_rate: number | null
          project_id: string | null
          status: string
        }
        Insert: {
          cost_code?: string | null
          created_at?: string
          department?: string | null
          employee_id: string
          employee_name?: string | null
          error_message?: string | null
          export_id: string
          hours_overtime?: number
          hours_regular?: number
          id?: string
          pay_rate?: number | null
          project_id?: string | null
          status?: string
        }
        Update: {
          cost_code?: string | null
          created_at?: string
          department?: string | null
          employee_id?: string
          employee_name?: string | null
          error_message?: string | null
          export_id?: string
          hours_overtime?: number
          hours_regular?: number
          id?: string
          pay_rate?: number | null
          project_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_export_rows_export_id_fkey"
            columns: ["export_id"]
            isOneToOne: false
            referencedRelation: "payroll_exports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_export_rows_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_exports: {
        Row: {
          batch_id: string | null
          created_at: string
          created_by: string
          division_id: string | null
          error_log: Json | null
          file_url: string | null
          format: string
          id: string
          period_end: string
          period_start: string
          row_count: number
          status: Database["public"]["Enums"]["payroll_export_status"]
          updated_at: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          created_by: string
          division_id?: string | null
          error_log?: Json | null
          file_url?: string | null
          format?: string
          id?: string
          period_end: string
          period_start: string
          row_count?: number
          status?: Database["public"]["Enums"]["payroll_export_status"]
          updated_at?: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          created_by?: string
          division_id?: string | null
          error_log?: Json | null
          file_url?: string | null
          format?: string
          id?: string
          period_end?: string
          period_start?: string
          row_count?: number
          status?: Database["public"]["Enums"]["payroll_export_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_exports_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "timesheet_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_exports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_exports_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          category: string
          created_at: string
          description: string | null
          display_name: string
          id: string
          permission_key: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          permission_key: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          permission_key?: string
        }
        Relationships: []
      }
      photo_annotations: {
        Row: {
          annotation_json: Json
          created_at: string
          created_by: string | null
          id: string
          photo_id: string
        }
        Insert: {
          annotation_json: Json
          created_at?: string
          created_by?: string | null
          id?: string
          photo_id: string
        }
        Update: {
          annotation_json?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          photo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_annotations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_annotations_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photo_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_assets: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          file_id: string
          id: string
          location_point: Json | null
          project_id: string
          taken_at: string | null
          version: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          file_id: string
          id?: string
          location_point?: Json | null
          project_id: string
          taken_at?: string | null
          version?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          file_id?: string
          id?: string
          location_point?: Json | null
          project_id?: string
          taken_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "photo_assets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_assets_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "file_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      po_snapshots: {
        Row: {
          created_at: string
          erp_docname: string | null
          id: string
          po_date: string | null
          po_number: string
          project_id: string | null
          snapshot_payload: Json
          status: Database["public"]["Enums"]["po_snapshot_status"]
          subtotal_amount: number
          supplier_name: string | null
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          erp_docname?: string | null
          id?: string
          po_date?: string | null
          po_number: string
          project_id?: string | null
          snapshot_payload: Json
          status?: Database["public"]["Enums"]["po_snapshot_status"]
          subtotal_amount?: number
          supplier_name?: string | null
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          erp_docname?: string | null
          id?: string
          po_date?: string | null
          po_number?: string
          project_id?: string | null
          snapshot_payload?: Json
          status?: Database["public"]["Enums"]["po_snapshot_status"]
          subtotal_amount?: number
          supplier_name?: string | null
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "po_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          override_value: boolean
          permission_id: string
          reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          override_value: boolean
          permission_id: string
          reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          override_value?: boolean
          permission_id?: string
          reason?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_overrides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_overrides_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_accounts: {
        Row: {
          actor_type: Database["public"]["Enums"]["portal_actor_type"]
          clerk_user_id: string | null
          company_name: string | null
          contact_name: string | null
          created_at: string
          email: string
          id: string
          invited_by: string | null
          org_id: string
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          actor_type: Database["public"]["Enums"]["portal_actor_type"]
          clerk_user_id?: string | null
          company_name?: string | null
          contact_name?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          org_id?: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          actor_type?: Database["public"]["Enums"]["portal_actor_type"]
          clerk_user_id?: string | null
          company_name?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          org_id?: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_accounts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_messages: {
        Row: {
          body: string
          created_at: string
          direction: string
          id: string
          org_id: string
          portal_account_id: string | null
          project_id: string
          read_at: string | null
          sender_user_id: string | null
          subject: string | null
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          direction?: string
          id?: string
          org_id?: string
          portal_account_id?: string | null
          project_id: string
          read_at?: string | null
          sender_user_id?: string | null
          subject?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          direction?: string
          id?: string
          org_id?: string
          portal_account_id?: string | null
          project_id?: string
          read_at?: string | null
          sender_user_id?: string | null
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_messages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_messages_portal_account_id_fkey"
            columns: ["portal_account_id"]
            isOneToOne: false
            referencedRelation: "portal_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_messages_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_permissions: {
        Row: {
          created_at: string
          id: string
          org_id: string
          permission_set: Json
          portal_account_id: string
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id?: string
          permission_set: Json
          portal_account_id: string
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          permission_set?: Json
          portal_account_id?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_permissions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_permissions_portal_account_id_fkey"
            columns: ["portal_account_id"]
            isOneToOne: false
            referencedRelation: "portal_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_permissions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_satisfaction_surveys: {
        Row: {
          created_at: string
          feedback: string | null
          id: string
          portal_account_id: string | null
          project_id: string
          rating: number | null
          submitted_at: string
        }
        Insert: {
          created_at?: string
          feedback?: string | null
          id?: string
          portal_account_id?: string | null
          project_id: string
          rating?: number | null
          submitted_at?: string
        }
        Update: {
          created_at?: string
          feedback?: string | null
          id?: string
          portal_account_id?: string | null
          project_id?: string
          rating?: number | null
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_satisfaction_surveys_portal_account_id_fkey"
            columns: ["portal_account_id"]
            isOneToOne: false
            referencedRelation: "portal_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_satisfaction_surveys_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_view_logs: {
        Row: {
          id: string
          ip_address: unknown
          org_id: string
          portal_account_id: string
          project_id: string
          user_agent: string | null
          viewed_at: string
          viewed_resource_id: string | null
          viewed_resource_type: string
        }
        Insert: {
          id?: string
          ip_address?: unknown
          org_id?: string
          portal_account_id: string
          project_id: string
          user_agent?: string | null
          viewed_at?: string
          viewed_resource_id?: string | null
          viewed_resource_type: string
        }
        Update: {
          id?: string
          ip_address?: unknown
          org_id?: string
          portal_account_id?: string
          project_id?: string
          user_agent?: string | null
          viewed_at?: string
          viewed_resource_id?: string | null
          viewed_resource_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_view_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_view_logs_portal_account_id_fkey"
            columns: ["portal_account_id"]
            isOneToOne: false
            referencedRelation: "portal_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_view_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      privacy_request_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_payload: Json
          event_type: string
          id: string
          privacy_request_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_payload?: Json
          event_type: string
          id?: string
          privacy_request_id: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_payload?: Json
          event_type?: string
          id?: string
          privacy_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "privacy_request_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "privacy_request_events_privacy_request_id_fkey"
            columns: ["privacy_request_id"]
            isOneToOne: false
            referencedRelation: "privacy_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      privacy_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          due_at: string | null
          handled_by: string | null
          id: string
          legal_basis: string | null
          notes: string | null
          request_type: string
          requester_email: string
          requester_name: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          handled_by?: string | null
          id?: string
          legal_basis?: string | null
          notes?: string | null
          request_type: string
          requester_email: string
          requester_name?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          handled_by?: string | null
          id?: string
          legal_basis?: string | null
          notes?: string | null
          request_type?: string
          requester_email?: string
          requester_name?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "privacy_requests_handled_by_fkey"
            columns: ["handled_by"]
            isOneToOne: false
            referencedRelation: "users"
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
          org_id: string
          project_id: string
          safety_notes: string | null
          submitted_at: string | null
          submitted_by: string | null
          sync_client_id: string | null
          updated_at: string
          version: number
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
          org_id?: string
          project_id: string
          safety_notes?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          sync_client_id?: string | null
          updated_at?: string
          version?: number
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
          org_id?: string
          project_id?: string
          safety_notes?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          sync_client_id?: string | null
          updated_at?: string
          version?: number
          weather?: Json | null
          work_summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_daily_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          org_id: string
          project_id: string
          user_id: string
        }
        Insert: {
          allocation_pct?: number | null
          id?: string
          joined_at?: string
          left_at?: string | null
          member_role: string
          org_id?: string
          project_id: string
          user_id: string
        }
        Update: {
          allocation_pct?: number | null
          id?: string
          joined_at?: string
          left_at?: string | null
          member_role?: string
          org_id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          org_id: string
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
          org_id?: string
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
          org_id?: string
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
          {
            foreignKeyName: "projects_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_events: {
        Row: {
          actor_user_id: string | null
          event_payload: Json
          event_type: string
          id: string
          occurred_at: string
          proposal_id: string
        }
        Insert: {
          actor_user_id?: string | null
          event_payload?: Json
          event_type: string
          id?: string
          occurred_at?: string
          proposal_id: string
        }
        Update: {
          actor_user_id?: string | null
          event_payload?: Json
          event_type?: string
          id?: string
          occurred_at?: string
          proposal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_events_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          accepted_at: string | null
          created_at: string
          created_by: string | null
          estimate_id: string
          expires_on: string | null
          id: string
          proposal_number: string
          proposal_payload: Json
          rejected_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["proposal_status"]
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string | null
          estimate_id: string
          expires_on?: string | null
          id?: string
          proposal_number: string
          proposal_payload: Json
          rejected_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string | null
          estimate_id?: string
          expires_on?: string | null
          id?: string
          proposal_number?: string
          proposal_payload?: Json
          rejected_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      reference_data_sets: {
        Row: {
          created_at: string
          id: string
          set_key: string
          set_name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          set_key: string
          set_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          set_key?: string
          set_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      reference_data_values: {
        Row: {
          created_at: string
          data_set_id: string
          id: string
          is_active: boolean
          metadata: Json
          sort_order: number
          updated_at: string
          value_key: string
          value_name: string
        }
        Insert: {
          created_at?: string
          data_set_id: string
          id?: string
          is_active?: boolean
          metadata?: Json
          sort_order?: number
          updated_at?: string
          value_key: string
          value_name: string
        }
        Update: {
          created_at?: string
          data_set_id?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          sort_order?: number
          updated_at?: string
          value_key?: string
          value_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "reference_data_values_data_set_id_fkey"
            columns: ["data_set_id"]
            isOneToOne: false
            referencedRelation: "reference_data_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      rfi_items: {
        Row: {
          closed_at: string | null
          created_at: string
          due_at: string | null
          id: string
          project_id: string
          question_text: string
          requester_user_id: string | null
          responder_user_id: string | null
          rfi_number: string
          status: Database["public"]["Enums"]["rfi_status"]
          title: string
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          project_id: string
          question_text: string
          requester_user_id?: string | null
          responder_user_id?: string | null
          rfi_number: string
          status?: Database["public"]["Enums"]["rfi_status"]
          title: string
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          project_id?: string
          question_text?: string
          requester_user_id?: string | null
          responder_user_id?: string | null
          rfi_number?: string
          status?: Database["public"]["Enums"]["rfi_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfi_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfi_items_requester_user_id_fkey"
            columns: ["requester_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfi_items_responder_user_id_fkey"
            columns: ["responder_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rfi_threads: {
        Row: {
          author_user_id: string | null
          created_at: string
          id: string
          is_official_response: boolean
          message_text: string
          rfi_id: string
        }
        Insert: {
          author_user_id?: string | null
          created_at?: string
          id?: string
          is_official_response?: boolean
          message_text: string
          rfi_id: string
        }
        Update: {
          author_user_id?: string | null
          created_at?: string
          id?: string
          is_official_response?: boolean
          message_text?: string
          rfi_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfi_threads_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfi_threads_rfi_id_fkey"
            columns: ["rfi_id"]
            isOneToOne: false
            referencedRelation: "rfi_items"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_bids: {
        Row: {
          created_at: string
          currency_code: string
          exclusions: string | null
          id: string
          invite_id: string | null
          payload: Json
          rfq_id: string
          status: string
          submitted_at: string | null
          submitted_by_portal_id: string | null
          subtotal_amount: number
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency_code?: string
          exclusions?: string | null
          id?: string
          invite_id?: string | null
          payload?: Json
          rfq_id: string
          status?: string
          submitted_at?: string | null
          submitted_by_portal_id?: string | null
          subtotal_amount?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency_code?: string
          exclusions?: string | null
          id?: string
          invite_id?: string | null
          payload?: Json
          rfq_id?: string
          status?: string
          submitted_at?: string | null
          submitted_by_portal_id?: string | null
          subtotal_amount?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfq_bids_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "rfq_invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_bids_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfq_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_invites: {
        Row: {
          id: string
          invited_at: string
          invited_email: string | null
          portal_account_id: string | null
          rfq_id: string
          status: string
        }
        Insert: {
          id?: string
          invited_at?: string
          invited_email?: string | null
          portal_account_id?: string | null
          rfq_id: string
          status?: string
        }
        Update: {
          id?: string
          invited_at?: string
          invited_email?: string | null
          portal_account_id?: string | null
          rfq_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfq_invites_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfq_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_packages: {
        Row: {
          created_at: string
          created_by: string | null
          due_at: string | null
          id: string
          project_id: string
          rfq_number: string
          scope_summary: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          id?: string
          project_id: string
          rfq_number: string
          scope_summary?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          id?: string
          project_id?: string
          rfq_number?: string
          scope_summary?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfq_packages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_packages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          granted: boolean
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          granted?: boolean
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
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
      safety_forms: {
        Row: {
          created_at: string
          form_date: string
          form_type: string
          id: string
          payload: Json
          project_id: string
          state: Database["public"]["Enums"]["workflow_state"]
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          form_date: string
          form_type: string
          id?: string
          payload: Json
          project_id: string
          state?: Database["public"]["Enums"]["workflow_state"]
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          form_date?: string
          form_type?: string
          id?: string
          payload?: Json
          project_id?: string
          state?: Database["public"]["Enums"]["workflow_state"]
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "safety_forms_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_forms_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_incidents: {
        Row: {
          closed_at: string | null
          corrective_actions: Json | null
          created_at: string
          details: Json
          id: string
          incident_date: string
          project_id: string
          reported_by: string | null
          severity: string
          summary: string
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          corrective_actions?: Json | null
          created_at?: string
          details: Json
          id?: string
          incident_date: string
          project_id: string
          reported_by?: string | null
          severity: string
          summary: string
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          corrective_actions?: Json | null
          created_at?: string
          details?: Json
          id?: string
          incident_date?: string
          project_id?: string
          reported_by?: string | null
          severity?: string
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_incidents_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      scoring_rules: {
        Row: {
          category: string
          created_at: string
          division_id: string | null
          field_name: string
          id: string
          is_active: boolean | null
          name: string
          operator: string
          priority: number | null
          score_impact: number
          updated_at: string
          value: string
        }
        Insert: {
          category: string
          created_at?: string
          division_id?: string | null
          field_name: string
          id?: string
          is_active?: boolean | null
          name: string
          operator: string
          priority?: number | null
          score_impact: number
          updated_at?: string
          value: string
        }
        Update: {
          category?: string
          created_at?: string
          division_id?: string | null
          field_name?: string
          id?: string
          is_active?: boolean | null
          name?: string
          operator?: string
          priority?: number | null
          score_impact?: number
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "scoring_rules_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      selection_choices: {
        Row: {
          chosen_at: string
          chosen_by_user_id: string | null
          id: string
          notes: string | null
          quantity: number
          selection_option_id: string
          selection_sheet_id: string
        }
        Insert: {
          chosen_at?: string
          chosen_by_user_id?: string | null
          id?: string
          notes?: string | null
          quantity?: number
          selection_option_id: string
          selection_sheet_id: string
        }
        Update: {
          chosen_at?: string
          chosen_by_user_id?: string | null
          id?: string
          notes?: string | null
          quantity?: number
          selection_option_id?: string
          selection_sheet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "selection_choices_chosen_by_user_id_fkey"
            columns: ["chosen_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "selection_choices_selection_option_id_fkey"
            columns: ["selection_option_id"]
            isOneToOne: false
            referencedRelation: "selection_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "selection_choices_selection_sheet_id_fkey"
            columns: ["selection_sheet_id"]
            isOneToOne: false
            referencedRelation: "selection_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      selection_options: {
        Row: {
          allowance_amount: number
          created_at: string
          id: string
          option_group: string
          option_name: string
          selection_sheet_id: string
          sort_order: number
          updated_at: string
          upgrade_amount: number
        }
        Insert: {
          allowance_amount?: number
          created_at?: string
          id?: string
          option_group: string
          option_name: string
          selection_sheet_id: string
          sort_order?: number
          updated_at?: string
          upgrade_amount?: number
        }
        Update: {
          allowance_amount?: number
          created_at?: string
          id?: string
          option_group?: string
          option_name?: string
          selection_sheet_id?: string
          sort_order?: number
          updated_at?: string
          upgrade_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "selection_options_selection_sheet_id_fkey"
            columns: ["selection_sheet_id"]
            isOneToOne: false
            referencedRelation: "selection_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      selection_sheets: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          issued_at: string | null
          locked_at: string | null
          project_id: string
          sheet_name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          issued_at?: string | null
          locked_at?: string | null
          project_id: string
          sheet_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          issued_at?: string | null
          locked_at?: string | null
          project_id?: string
          sheet_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "selection_sheets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "selection_sheets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_enrollments: {
        Row: {
          contact_id: string | null
          current_step: number | null
          current_step_id: string | null
          enrolled_at: string | null
          id: string
          lead_id: string | null
          next_step_at: string | null
          sequence_id: string | null
          status: string | null
          trigger_event: Json | null
          trigger_type: string | null
        }
        Insert: {
          contact_id?: string | null
          current_step?: number | null
          current_step_id?: string | null
          enrolled_at?: string | null
          id?: string
          lead_id?: string | null
          next_step_at?: string | null
          sequence_id?: string | null
          status?: string | null
          trigger_event?: Json | null
          trigger_type?: string | null
        }
        Update: {
          contact_id?: string | null
          current_step?: number | null
          current_step_id?: string | null
          enrolled_at?: string | null
          id?: string
          lead_id?: string | null
          next_step_at?: string | null
          sequence_id?: string | null
          status?: string | null
          trigger_event?: Json | null
          trigger_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sequence_enrollments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_enrollments_current_step_id_fkey"
            columns: ["current_step_id"]
            isOneToOne: false
            referencedRelation: "sequence_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_enrollments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_enrollments_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_steps: {
        Row: {
          action_config: Json
          action_type: string
          condition_config: Json | null
          condition_type: string | null
          created_at: string
          delay_days: number | null
          delay_hours: number | null
          false_next_step_id: string | null
          id: string
          position_x: number | null
          position_y: number | null
          sequence_id: string
          step_number: number
          true_next_step_id: string | null
        }
        Insert: {
          action_config: Json
          action_type: string
          condition_config?: Json | null
          condition_type?: string | null
          created_at?: string
          delay_days?: number | null
          delay_hours?: number | null
          false_next_step_id?: string | null
          id?: string
          position_x?: number | null
          position_y?: number | null
          sequence_id: string
          step_number: number
          true_next_step_id?: string | null
        }
        Update: {
          action_config?: Json
          action_type?: string
          condition_config?: Json | null
          condition_type?: string | null
          created_at?: string
          delay_days?: number | null
          delay_hours?: number | null
          false_next_step_id?: string | null
          id?: string
          position_x?: number | null
          position_y?: number | null
          sequence_id?: string
          step_number?: number
          true_next_step_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sequence_steps_false_next_step_id_fkey"
            columns: ["false_next_step_id"]
            isOneToOne: false
            referencedRelation: "sequence_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_steps_true_next_step_id_fkey"
            columns: ["true_next_step_id"]
            isOneToOne: false
            referencedRelation: "sequence_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      sequences: {
        Row: {
          created_at: string
          description: string | null
          division_id: string | null
          id: string
          is_active: boolean | null
          name: string
          status: string
          target_industry: string | null
          trigger_conditions: Json | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          division_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          status?: string
          target_industry?: string | null
          trigger_conditions?: Json | null
          trigger_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          division_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          status?: string
          target_industry?: string | null
          trigger_conditions?: Json | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequences_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      service_call_events: {
        Row: {
          actor_portal_id: string | null
          actor_user_id: string | null
          created_at: string
          event_payload: Json
          event_type: string
          id: string
          service_call_id: string
        }
        Insert: {
          actor_portal_id?: string | null
          actor_user_id?: string | null
          created_at?: string
          event_payload?: Json
          event_type: string
          id?: string
          service_call_id: string
        }
        Update: {
          actor_portal_id?: string | null
          actor_user_id?: string | null
          created_at?: string
          event_payload?: Json
          event_type?: string
          id?: string
          service_call_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_call_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_call_events_service_call_id_fkey"
            columns: ["service_call_id"]
            isOneToOne: false
            referencedRelation: "service_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      service_calls: {
        Row: {
          assigned_to: string | null
          call_number: string
          closed_at: string | null
          created_at: string
          description: string | null
          id: string
          opened_at: string
          priority: string
          project_id: string
          requested_by_portal_id: string | null
          resolved_at: string | null
          status: string
          title: string
          updated_at: string
          warranty_item_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          call_number: string
          closed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          opened_at?: string
          priority?: string
          project_id: string
          requested_by_portal_id?: string | null
          resolved_at?: string | null
          status?: string
          title: string
          updated_at?: string
          warranty_item_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          call_number?: string
          closed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          opened_at?: string
          priority?: string
          project_id?: string
          requested_by_portal_id?: string | null
          resolved_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          warranty_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_calls_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_calls_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_calls_warranty_item_id_fkey"
            columns: ["warranty_item_id"]
            isOneToOne: false
            referencedRelation: "warranty_items"
            referencedColumns: ["id"]
          },
        ]
      }
      site_diary_entries: {
        Row: {
          created_at: string
          created_by: string | null
          entry_at: string
          entry_text: string
          entry_type: string
          id: string
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entry_at: string
          entry_text: string
          entry_type: string
          id?: string
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entry_at?: string
          entry_text?: string
          entry_type?: string
          id?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_diary_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_diary_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      smoke_test_results: {
        Row: {
          checks: Json
          created_at: string
          duration_ms: number | null
          failed_checks: string[]
          id: string
          status: string
        }
        Insert: {
          checks?: Json
          created_at?: string
          duration_ms?: number | null
          failed_checks?: string[]
          id?: string
          status: string
        }
        Update: {
          checks?: Json
          created_at?: string
          duration_ms?: number | null
          failed_checks?: string[]
          id?: string
          status?: string
        }
        Relationships: []
      }
      submittal_distributions: {
        Row: {
          created_at: string
          id: string
          recipient_id: string | null
          recipient_type: string
          sent_at: string | null
          status: string
          submittal_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          recipient_id?: string | null
          recipient_type: string
          sent_at?: string | null
          status?: string
          submittal_id: string
        }
        Update: {
          created_at?: string
          id?: string
          recipient_id?: string | null
          recipient_type?: string
          sent_at?: string | null
          status?: string
          submittal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submittal_distributions_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "submittals"
            referencedColumns: ["id"]
          },
        ]
      }
      submittal_reviews: {
        Row: {
          id: string
          outcome: Database["public"]["Enums"]["submittal_status"]
          review_notes: string | null
          reviewed_at: string
          reviewer_user_id: string | null
          submittal_id: string
        }
        Insert: {
          id?: string
          outcome: Database["public"]["Enums"]["submittal_status"]
          review_notes?: string | null
          reviewed_at?: string
          reviewer_user_id?: string | null
          submittal_id: string
        }
        Update: {
          id?: string
          outcome?: Database["public"]["Enums"]["submittal_status"]
          review_notes?: string | null
          reviewed_at?: string
          reviewer_user_id?: string | null
          submittal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submittal_reviews_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_reviews_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "submittals"
            referencedColumns: ["id"]
          },
        ]
      }
      submittals: {
        Row: {
          created_at: string
          due_at: string | null
          id: string
          project_id: string
          status: Database["public"]["Enums"]["submittal_status"]
          submittal_number: string
          submitted_at: string | null
          submitted_by: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_at?: string | null
          id?: string
          project_id: string
          status?: Database["public"]["Enums"]["submittal_status"]
          submittal_number: string
          submitted_at?: string | null
          submitted_by?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_at?: string | null
          id?: string
          project_id?: string
          status?: Database["public"]["Enums"]["submittal_status"]
          submittal_number?: string
          submitted_at?: string | null
          submitted_by?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          created_at: string
          division_id: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          division_id?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          division_id?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      takeoff_draft_lines: {
        Row: {
          confidence: number
          cost_source: string | null
          created_at: string
          csi_code: string | null
          description: string
          final_line_id: string | null
          id: string
          job_id: string
          notes: string | null
          quantity: number
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          source_pages: number[] | null
          source_regions: Json | null
          trade: string
          unit: string
          unit_cost: number | null
        }
        Insert: {
          confidence: number
          cost_source?: string | null
          created_at?: string
          csi_code?: string | null
          description: string
          final_line_id?: string | null
          id?: string
          job_id: string
          notes?: string | null
          quantity: number
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_pages?: number[] | null
          source_regions?: Json | null
          trade: string
          unit: string
          unit_cost?: number | null
        }
        Update: {
          confidence?: number
          cost_source?: string | null
          created_at?: string
          csi_code?: string | null
          description?: string
          final_line_id?: string | null
          id?: string
          job_id?: string
          notes?: string | null
          quantity?: number
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_pages?: number[] | null
          source_regions?: Json | null
          trade?: string
          unit?: string
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "takeoff_draft_lines_final_line_id_fkey"
            columns: ["final_line_id"]
            isOneToOne: false
            referencedRelation: "estimate_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "takeoff_draft_lines_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "takeoff_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "takeoff_draft_lines_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      takeoff_feedback: {
        Row: {
          corrected_value: Json | null
          created_at: string
          created_by: string | null
          draft_line_id: string | null
          feedback_type: string
          id: string
          job_id: string
          original_value: Json | null
        }
        Insert: {
          corrected_value?: Json | null
          created_at?: string
          created_by?: string | null
          draft_line_id?: string | null
          feedback_type: string
          id?: string
          job_id: string
          original_value?: Json | null
        }
        Update: {
          corrected_value?: Json | null
          created_at?: string
          created_by?: string | null
          draft_line_id?: string | null
          feedback_type?: string
          id?: string
          job_id?: string
          original_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "takeoff_feedback_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "takeoff_feedback_draft_line_id_fkey"
            columns: ["draft_line_id"]
            isOneToOne: false
            referencedRelation: "takeoff_draft_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "takeoff_feedback_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "takeoff_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      takeoff_jobs: {
        Row: {
          completed_at: string | null
          config: Json
          created_at: string
          created_by: string | null
          error_message: string | null
          estimate_id: string
          id: string
          started_at: string | null
          status: string
          summary: Json | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          config?: Json
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          estimate_id: string
          id?: string
          started_at?: string | null
          status?: string
          summary?: Json | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          config?: Json
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          estimate_id?: string
          id?: string
          started_at?: string | null
          status?: string
          summary?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "takeoff_jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "takeoff_jobs_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      takeoff_pages: {
        Row: {
          created_at: string
          extraction_data: Json | null
          id: string
          job_id: string
          page_number: number
          page_type: string
          page_type_confidence: number | null
          plan_id: string
          scale: string | null
          thumbnail_path: string | null
        }
        Insert: {
          created_at?: string
          extraction_data?: Json | null
          id?: string
          job_id: string
          page_number: number
          page_type: string
          page_type_confidence?: number | null
          plan_id: string
          scale?: string | null
          thumbnail_path?: string | null
        }
        Update: {
          created_at?: string
          extraction_data?: Json | null
          id?: string
          job_id?: string
          page_number?: number
          page_type?: string
          page_type_confidence?: number | null
          plan_id?: string
          scale?: string | null
          thumbnail_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "takeoff_pages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "takeoff_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "takeoff_pages_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "takeoff_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      takeoff_plans: {
        Row: {
          created_at: string
          file_id: string | null
          filename: string
          id: string
          job_id: string
          page_count: number | null
          storage_path: string
        }
        Insert: {
          created_at?: string
          file_id?: string | null
          filename: string
          id?: string
          job_id: string
          page_count?: number | null
          storage_path: string
        }
        Update: {
          created_at?: string
          file_id?: string | null
          filename?: string
          id?: string
          job_id?: string
          page_count?: number | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "takeoff_plans_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "file_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "takeoff_plans_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "takeoff_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          author_user_id: string | null
          comment_text: string
          created_at: string
          id: string
          org_id: string
          task_id: string
          updated_at: string
        }
        Insert: {
          author_user_id?: string | null
          comment_text: string
          created_at?: string
          id?: string
          org_id?: string
          task_id: string
          updated_at?: string
        }
        Update: {
          author_user_id?: string | null
          comment_text?: string
          created_at?: string
          id?: string
          org_id?: string
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
            foreignKeyName: "task_comments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      task_dependencies: {
        Row: {
          created_at: string
          dependency_type: string
          depends_on_task_id: string
          id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          dependency_type?: string
          depends_on_task_id: string
          id?: string
          task_id: string
        }
        Update: {
          created_at?: string
          dependency_type?: string
          depends_on_task_id?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_depends_on_task_id_fkey"
            columns: ["depends_on_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_task_id_fkey"
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
          org_id: string
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
          org_id?: string
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
          org_id?: string
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
            foreignKeyName: "tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      time_entries: {
        Row: {
          cost_code: string | null
          created_at: string
          hours_overtime: number
          hours_regular: number
          id: string
          notes: string | null
          project_id: string
          source: string
          task_id: string | null
          updated_at: string
          user_id: string
          version: number
          work_date: string
        }
        Insert: {
          cost_code?: string | null
          created_at?: string
          hours_overtime?: number
          hours_regular?: number
          id?: string
          notes?: string | null
          project_id: string
          source?: string
          task_id?: string | null
          updated_at?: string
          user_id: string
          version?: number
          work_date: string
        }
        Update: {
          cost_code?: string | null
          created_at?: string
          hours_overtime?: number
          hours_regular?: number
          id?: string
          notes?: string | null
          project_id?: string
          source?: string
          task_id?: string | null
          updated_at?: string
          user_id?: string
          version?: number
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheet_batches: {
        Row: {
          adp_export_reference: string | null
          approved_by: string | null
          created_at: string
          division_id: string | null
          exported_at: string | null
          id: string
          period_end: string
          period_start: string
          status: Database["public"]["Enums"]["timesheet_status"]
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          adp_export_reference?: string | null
          approved_by?: string | null
          created_at?: string
          division_id?: string | null
          exported_at?: string | null
          id?: string
          period_end: string
          period_start: string
          status?: Database["public"]["Enums"]["timesheet_status"]
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          adp_export_reference?: string | null
          approved_by?: string | null
          created_at?: string
          division_id?: string | null
          exported_at?: string | null
          id?: string
          period_end?: string
          period_start?: string
          status?: Database["public"]["Enums"]["timesheet_status"]
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_batches_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_batches_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_batches_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      toolbox_talks: {
        Row: {
          attendee_count: number
          created_at: string
          facilitator_user_id: string | null
          id: string
          notes: string | null
          project_id: string
          talk_date: string
          topic: string
          updated_at: string
        }
        Insert: {
          attendee_count?: number
          created_at?: string
          facilitator_user_id?: string | null
          id?: string
          notes?: string | null
          project_id: string
          talk_date: string
          topic: string
          updated_at?: string
        }
        Update: {
          attendee_count?: number
          created_at?: string
          facilitator_user_id?: string | null
          id?: string
          notes?: string | null
          project_id?: string
          talk_date?: string
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "toolbox_talks_facilitator_user_id_fkey"
            columns: ["facilitator_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toolbox_talks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_partner_compliance_docs: {
        Row: {
          compliance_type: string
          created_at: string
          doc_number: string | null
          expires_on: string | null
          file_id: string | null
          id: string
          issued_on: string | null
          portal_account_id: string
          status: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          compliance_type: string
          created_at?: string
          doc_number?: string | null
          expires_on?: string | null
          file_id?: string | null
          id?: string
          issued_on?: string | null
          portal_account_id: string
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          compliance_type?: string
          created_at?: string
          doc_number?: string | null
          expires_on?: string | null
          file_id?: string | null
          id?: string
          issued_on?: string | null
          portal_account_id?: string
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trade_partner_compliance_docs_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_digests: {
        Row: {
          created_at: string | null
          digest_date: string
          email_sent_at: string | null
          id: string
          org_id: string
          read_at: string | null
          sections: Json
          summary: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          digest_date: string
          email_sent_at?: string | null
          id?: string
          org_id: string
          read_at?: string | null
          sections: Json
          summary: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          digest_date?: string
          email_sent_at?: string | null
          id?: string
          org_id?: string
          read_at?: string | null
          sections?: Json
          summary?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_digests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_digests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
          adp_employee_code: string | null
          ai_preferences: Json | null
          avatar_url: string | null
          clerk_user_id: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          locale: string
          org_id: string
          phone: string | null
          status: Database["public"]["Enums"]["user_status"]
          timezone: string
          updated_at: string
        }
        Insert: {
          adp_employee_code?: string | null
          ai_preferences?: Json | null
          avatar_url?: string | null
          clerk_user_id?: string | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          locale?: string
          org_id: string
          phone?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          timezone?: string
          updated_at?: string
        }
        Update: {
          adp_employee_code?: string | null
          ai_preferences?: Json | null
          avatar_url?: string | null
          clerk_user_id?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          locale?: string
          org_id?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_items: {
        Row: {
          created_at: string
          deficiency_id: string | null
          id: string
          project_id: string
          provider_name: string | null
          terms: string | null
          title: string
          updated_at: string
          warranty_end: string
          warranty_start: string
        }
        Insert: {
          created_at?: string
          deficiency_id?: string | null
          id?: string
          project_id: string
          provider_name?: string | null
          terms?: string | null
          title: string
          updated_at?: string
          warranty_end: string
          warranty_start: string
        }
        Update: {
          created_at?: string
          deficiency_id?: string | null
          id?: string
          project_id?: string
          provider_name?: string | null
          terms?: string | null
          title?: string
          updated_at?: string
          warranty_end?: string
          warranty_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "warranty_items_deficiency_id_fkey"
            columns: ["deficiency_id"]
            isOneToOne: false
            referencedRelation: "deficiency_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          event_id: string
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          processing_error: string | null
          processing_status: string
          provider: string
          received_at: string
        }
        Insert: {
          event_id: string
          event_type: string
          id?: string
          payload: Json
          processed_at?: string | null
          processing_error?: string | null
          processing_status?: string
          provider: string
          received_at?: string
        }
        Update: {
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          processing_error?: string | null
          processing_status?: string
          provider?: string
          received_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      inventory_stock_summary: {
        Row: {
          item_id: string | null
          last_transaction_at: string | null
          location_id: string | null
          qty_on_hand: number | null
          spot_id: string | null
          total_value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_ledger_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_ledger_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_ledger_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "inventory_spots"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_stock_summary_secure: {
        Row: {
          item_id: string | null
          location_id: string | null
          spot_id: string | null
          qty_on_hand: number | null
          total_value: number | null
          last_transaction_at: string | null
          item_name: string | null
          item_sku: string | null
          division_id: string | null
          location_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_ledger_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_ledger_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_ledger_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "inventory_spots"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      default_org_id: { Args: never; Returns: string }
      ensure_clerk_user: {
        Args: {
          p_avatar_url?: string
          p_clerk_id: string
          p_email: string
          p_first_name: string
          p_last_name: string
        }
        Returns: {
          adp_employee_code: string | null
          ai_preferences: Json | null
          avatar_url: string | null
          clerk_user_id: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          locale: string
          org_id: string
          phone: string | null
          status: Database["public"]["Enums"]["user_status"]
          timezone: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "users"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_estimating_velocity: {
        Args: { p_division_id?: string }
        Returns: {
          count: number
          status: string
        }[]
      }
      get_pipeline_summary: {
        Args: { p_division_id?: string }
        Returns: {
          count: number
          stage: string
          value: number
        }[]
      }
      get_project_portfolio: {
        Args: { p_division_id?: string }
        Returns: {
          count: number
          status: string
        }[]
      }
      get_subscription_summary: {
        Args: { p_division_id?: string }
        Returns: {
          active_count: number
          expiring_soon_count: number
          total_monthly: number
        }[]
      }
      get_user_permissions: {
        Args: { p_user_id: string }
        Returns: {
          permission_name: string
        }[]
      }
      get_user_role_names: {
        Args: { p_user_id: string }
        Returns: {
          is_primary: boolean
          role_name: string
        }[]
      }
      has_any_role: { Args: { required_roles: string[] }; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      krewpact_divisions: { Args: never; Returns: Json }
      krewpact_org_id: { Args: never; Returns: string }
      krewpact_roles: { Args: never; Returns: Json }
      krewpact_user_id: { Args: never; Returns: string }
      match_knowledge: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          chunk_index: number
          content: string
          doc_id: string
          id: string
          similarity: number
        }[]
      }
      recompute_account_stats: {
        Args: { p_account_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      bidding_source: "merx" | "bids_tenders" | "manual" | "referral"
      bidding_status:
        | "new"
        | "reviewing"
        | "bidding"
        | "submitted"
        | "won"
        | "lost"
        | "expired"
      co_status:
        | "draft"
        | "submitted"
        | "client_review"
        | "approved"
        | "rejected"
        | "void"
      contract_status:
        | "draft"
        | "pending_signature"
        | "signed"
        | "amended"
        | "terminated"
      estimate_status:
        | "draft"
        | "review"
        | "sent"
        | "approved"
        | "rejected"
        | "superseded"
      expense_status: "draft" | "submitted" | "approved" | "rejected" | "posted"
      file_visibility: "internal" | "client" | "trade" | "public"
      fleet_ownership_type: "owned" | "leased" | "rented"
      fleet_vehicle_status: "active" | "maintenance" | "decommissioned"
      fleet_vehicle_type:
        | "truck"
        | "van"
        | "trailer"
        | "heavy_equipment"
        | "other"
      inventory_gr_status: "draft" | "confirmed"
      inventory_location_type: "warehouse" | "job_site" | "vehicle"
      inventory_po_status:
        | "draft"
        | "submitted"
        | "approved"
        | "partially_received"
        | "fully_received"
        | "closed"
        | "cancelled"
      inventory_tracking_type: "none" | "serial" | "lot"
      inventory_transaction_type:
        | "purchase_receipt"
        | "purchase_return"
        | "material_issue"
        | "material_return"
        | "stock_transfer"
        | "stock_adjustment"
        | "scrap"
        | "tool_checkout"
        | "tool_return"
        | "initial_stock"
      inventory_uom:
        | "each"
        | "meter"
        | "foot"
        | "spool"
        | "box"
        | "kg"
        | "lb"
        | "liter"
        | "pack"
        | "roll"
        | "sheet"
        | "pair"
      inventory_valuation_method: "weighted_average" | "specific_identification"
      invoice_snapshot_status:
        | "draft"
        | "submitted"
        | "paid"
        | "overdue"
        | "cancelled"
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "proposal"
        | "negotiation"
        | "won"
        | "lost"
        | "nurture"
      notification_channel: "in_app" | "email" | "push" | "sms"
      notification_state: "queued" | "sent" | "delivered" | "failed" | "read"
      nurture_status:
        | "pool"
        | "flash_response"
        | "active_sprint"
        | "long_drip"
        | "disqualified"
      opportunity_stage:
        | "intake"
        | "site_visit"
        | "estimating"
        | "proposal"
        | "negotiation"
        | "contracted"
        | "closed_lost"
      outreach_channel:
        | "email"
        | "call"
        | "linkedin"
        | "video"
        | "meeting"
        | "text"
        | "site_visit"
      payroll_export_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "reconciled"
      po_snapshot_status:
        | "draft"
        | "submitted"
        | "approved"
        | "received"
        | "closed"
        | "cancelled"
      portal_actor_type: "client" | "trade_partner"
      project_status:
        | "planning"
        | "active"
        | "on_hold"
        | "substantial_complete"
        | "closed"
        | "cancelled"
      proposal_status:
        | "draft"
        | "sent"
        | "viewed"
        | "accepted"
        | "rejected"
        | "expired"
        | "superseded"
      rfi_status: "open" | "responded" | "closed" | "void"
      role_scope: "company" | "division" | "project"
      serial_status:
        | "in_stock"
        | "checked_out"
        | "in_transit"
        | "maintenance"
        | "quarantine"
        | "decommissioned"
      submittal_status:
        | "draft"
        | "submitted"
        | "revise_and_resubmit"
        | "approved"
        | "approved_as_noted"
        | "rejected"
      sync_direction: "outbound" | "inbound"
      sync_status:
        | "queued"
        | "processing"
        | "succeeded"
        | "failed"
        | "dead_letter"
      task_status: "todo" | "in_progress" | "blocked" | "done" | "cancelled"
      timesheet_status:
        | "draft"
        | "submitted"
        | "approved"
        | "rejected"
        | "exported"
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
      bidding_source: ["merx", "bids_tenders", "manual", "referral"],
      bidding_status: [
        "new",
        "reviewing",
        "bidding",
        "submitted",
        "won",
        "lost",
        "expired",
      ],
      co_status: [
        "draft",
        "submitted",
        "client_review",
        "approved",
        "rejected",
        "void",
      ],
      contract_status: [
        "draft",
        "pending_signature",
        "signed",
        "amended",
        "terminated",
      ],
      estimate_status: [
        "draft",
        "review",
        "sent",
        "approved",
        "rejected",
        "superseded",
      ],
      expense_status: ["draft", "submitted", "approved", "rejected", "posted"],
      file_visibility: ["internal", "client", "trade", "public"],
      fleet_ownership_type: ["owned", "leased", "rented"],
      fleet_vehicle_status: ["active", "maintenance", "decommissioned"],
      fleet_vehicle_type: [
        "truck",
        "van",
        "trailer",
        "heavy_equipment",
        "other",
      ],
      inventory_gr_status: ["draft", "confirmed"],
      inventory_location_type: ["warehouse", "job_site", "vehicle"],
      inventory_po_status: [
        "draft",
        "submitted",
        "approved",
        "partially_received",
        "fully_received",
        "closed",
        "cancelled",
      ],
      inventory_tracking_type: ["none", "serial", "lot"],
      inventory_transaction_type: [
        "purchase_receipt",
        "purchase_return",
        "material_issue",
        "material_return",
        "stock_transfer",
        "stock_adjustment",
        "scrap",
        "tool_checkout",
        "tool_return",
        "initial_stock",
      ],
      inventory_uom: [
        "each",
        "meter",
        "foot",
        "spool",
        "box",
        "kg",
        "lb",
        "liter",
        "pack",
        "roll",
        "sheet",
        "pair",
      ],
      inventory_valuation_method: [
        "weighted_average",
        "specific_identification",
      ],
      invoice_snapshot_status: [
        "draft",
        "submitted",
        "paid",
        "overdue",
        "cancelled",
      ],
      lead_status: [
        "new",
        "contacted",
        "qualified",
        "proposal",
        "negotiation",
        "won",
        "lost",
        "nurture",
      ],
      notification_channel: ["in_app", "email", "push", "sms"],
      notification_state: ["queued", "sent", "delivered", "failed", "read"],
      nurture_status: [
        "pool",
        "flash_response",
        "active_sprint",
        "long_drip",
        "disqualified",
      ],
      opportunity_stage: [
        "intake",
        "site_visit",
        "estimating",
        "proposal",
        "negotiation",
        "contracted",
        "closed_lost",
      ],
      outreach_channel: [
        "email",
        "call",
        "linkedin",
        "video",
        "meeting",
        "text",
        "site_visit",
      ],
      payroll_export_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "reconciled",
      ],
      po_snapshot_status: [
        "draft",
        "submitted",
        "approved",
        "received",
        "closed",
        "cancelled",
      ],
      portal_actor_type: ["client", "trade_partner"],
      project_status: [
        "planning",
        "active",
        "on_hold",
        "substantial_complete",
        "closed",
        "cancelled",
      ],
      proposal_status: [
        "draft",
        "sent",
        "viewed",
        "accepted",
        "rejected",
        "expired",
        "superseded",
      ],
      rfi_status: ["open", "responded", "closed", "void"],
      role_scope: ["company", "division", "project"],
      serial_status: [
        "in_stock",
        "checked_out",
        "in_transit",
        "maintenance",
        "quarantine",
        "decommissioned",
      ],
      submittal_status: [
        "draft",
        "submitted",
        "revise_and_resubmit",
        "approved",
        "approved_as_noted",
        "rejected",
      ],
      sync_direction: ["outbound", "inbound"],
      sync_status: [
        "queued",
        "processing",
        "succeeded",
        "failed",
        "dead_letter",
      ],
      task_status: ["todo", "in_progress", "blocked", "done", "cancelled"],
      timesheet_status: [
        "draft",
        "submitted",
        "approved",
        "rejected",
        "exported",
      ],
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
