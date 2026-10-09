// Placeholder types — replace by running:
// npx supabase gen types typescript --project-id <YOUR_PROJECT_ID> > src/types/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/* eslint-disable @typescript-eslint/no-explicit-any */
type LooseTable = {
  Row: Record<string, any>;
  Insert: Record<string, any>;
  Update: Record<string, any>;
  Relationships: [];
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: "admin" | "professional" | "organization" | "client" | "provider";
          avatar_url: string | null;
          phone: string | null;
          date_of_birth: string | null;
          address: string | null;
          gender: "male" | "female" | "other" | null;
          nin: string | null;
          is_verified: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: "admin" | "professional" | "organization" | "client" | "provider";
          avatar_url?: string | null;
          phone?: string | null;
          date_of_birth?: string | null;
          address?: string | null;
          gender?: "male" | "female" | "other" | null;
          nin?: string | null;
          is_verified?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      professionals: {
        Row: {
          id: string;
          profile_id: string;
          profession: "nurse" | "nurse_assistant" | "caregiver" | "physiotherapist" | "doctor" | "pharmacist" | "laboratory_scientist" | "paramedic" | "occupational_therapist" | "other";
          specialty: string | null;
          years_of_experience: number;
          preferred_location: string | null;
          phone_number: string | null;
          bio: string | null;
          workforce_status: "available" | "assigned" | "on_leave" | "under_review" | "resigned" | "contract_completed" | "suspended";
          availability: string[];
          rating: number | null;
          total_assignments: number;
          is_verified: boolean;
          marital_status: "single" | "married" | "divorced" | "widowed" | "other" | null;
          application_status: "submitted" | "under_review" | "rgh_verification" | "verified" | "rejected";
          rejection_reason: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          skills: string[];
          qualifications: string[];
          verified_medlink_months: number;
          rating_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          profession: "nurse" | "nurse_assistant" | "caregiver" | "physiotherapist" | "doctor" | "pharmacist" | "laboratory_scientist" | "paramedic" | "occupational_therapist" | "other";
          specialty?: string | null;
          years_of_experience?: number;
          preferred_location?: string | null;
          phone_number?: string | null;
          bio?: string | null;
          workforce_status?: "available" | "assigned" | "on_leave" | "under_review" | "resigned" | "contract_completed" | "suspended";
          availability?: string[];
          rating?: number | null;
          total_assignments?: number;
          is_verified?: boolean;
          marital_status?: "single" | "married" | "divorced" | "widowed" | "other" | null;
          application_status?: "submitted" | "under_review" | "rgh_verification" | "verified" | "rejected";
          rejection_reason?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          skills?: string[];
          qualifications?: string[];
        };
        Update: Partial<Database["public"]["Tables"]["professionals"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "professionals_profile_id_fkey"; columns: ["profile_id"]; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ];
      };
      organizations: {
        Row: {
          id: string;
          profile_id: string;
          type: "hospital" | "clinic" | "hmo" | "ngo" | "school" | "nursing_home";
          name: string;
          registration_number: string | null;
          website: string | null;
          contact_person: string;
          contact_email: string | null;
          contact_phone: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          country: string;
          is_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          type: "hospital" | "clinic" | "hmo" | "ngo" | "school" | "nursing_home";
          name: string;
          registration_number?: string | null;
          website?: string | null;
          contact_person: string;
          contact_email?: string | null;
          contact_phone?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          country?: string;
          is_verified?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["organizations"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "organizations_profile_id_fkey"; columns: ["profile_id"]; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ];
      };
      clients: {
        Row: {
          id: string;
          profile_id: string;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          medical_notes: string | null;
          is_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          medical_notes?: string | null;
          is_verified?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["clients"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "clients_profile_id_fkey"; columns: ["profile_id"]; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ];
      };
      assignments: {
        Row: {
          id: string;
          professional_id: string | null;
          client_id: string | null;
          organization_id: string | null;
          service_type: string;
          duration_type: string;
          title: string;
          description: string | null;
          requirements: string | null;
          start_date: string;
          end_date: string | null;
          status: "pending" | "active" | "completed" | "cancelled";
          hourly_rate: number | null;
          total_cost: number | null;
          location: string;
          notes: string | null;
          assigned_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          professional_id?: string | null;
          client_id?: string | null;
          organization_id?: string | null;
          service_type: string;
          duration_type: string;
          title: string;
          description?: string | null;
          requirements?: string | null;
          start_date: string;
          end_date?: string | null;
          status?: "pending" | "active" | "completed" | "cancelled";
          hourly_rate?: number | null;
          total_cost?: number | null;
          location: string;
          notes?: string | null;
          assigned_by: string;
        };
        Update: Partial<Database["public"]["Tables"]["assignments"]["Insert"]>;
        Relationships: [];
      };
      scorecards: {
        Row: {
          id: string;
          professional_id: string;
          assignment_id: string | null;
          period_month: number;
          period_year: number;
          attendance: number;
          punctuality: number;
          professionalism: number;
          communication: number;
          clinical_competence: number;
          teamwork: number;
          patient_care: number;
          overall_score: number;
          notes: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          professional_id: string;
          assignment_id?: string | null;
          period_month: number;
          period_year: number;
          attendance: number;
          punctuality: number;
          professionalism: number;
          communication: number;
          clinical_competence: number;
          teamwork: number;
          patient_care: number;
          notes?: string | null;
          created_by: string;
        };
        Update: Partial<Database["public"]["Tables"]["scorecards"]["Insert"]>;
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          message_type: "text" | "file" | "system";
          file_url: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          conversation_id: string;
          sender_id: string;
          content: string;
          message_type?: "text" | "file" | "system";
          file_url?: string | null;
          is_read?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["messages"]["Insert"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          profile_id: string;
          title: string;
          message: string;
          type:
            | "assignment" | "booking" | "payment" | "reminder" | "system" | "performance" | "message" | "alert"
            | "chat" | "result" | "prescription" | "order" | "dispatch" | "waitlist" | "earn" | "attendance" | "dispute" | "verification";
          is_read: boolean;
          link_url: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          profile_id: string;
          title: string;
          message: string;
          type:
            | "assignment" | "booking" | "payment" | "reminder" | "system" | "performance" | "message" | "alert"
            | "chat" | "result" | "prescription" | "order" | "dispatch" | "waitlist" | "earn" | "attendance" | "dispute" | "verification";
          is_read?: boolean;
          link_url?: string | null;
          metadata?: Json | null;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          owner_id: string;
          document_type: string;
          name: string;
          file_url: string;
          is_verified: boolean;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          owner_id: string;
          document_type: string;
          name: string;
          file_url: string;
          is_verified?: boolean;
          expires_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["documents"]["Insert"]>;
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          payer_id: string | null;
          client_id: string | null;
          organization_id: string | null;
          assignment_id: string | null;
          amount: number;
          currency: string;
          status: "pending" | "paid" | "failed" | "refunded";
          payment_method: "stripe" | "paystack" | "bank_transfer" | "cash";
          provider_reference: string | null;
          invoice_url: string | null;
          paid_at: string | null;
          created_at: string;
        };
        Insert: {
          payer_id?: string | null;
          client_id?: string | null;
          organization_id?: string | null;
          assignment_id?: string | null;
          amount: number;
          currency?: string;
          status?: "pending" | "paid" | "failed" | "refunded";
          payment_method: "stripe" | "paystack" | "bank_transfer" | "cash";
          provider_reference?: string | null;
          invoice_url?: string | null;
          paid_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["payments"]["Insert"]>;
        Relationships: [];
      };
      guarantors: {
        Row: {
          id: string;
          professional_id: string;
          full_name: string;
          phone: string;
          residential_address: string;
          occupation: string;
          relationship: string;
          government_id_url: string | null;
          passport_url: string | null;
          email: string | null;
          created_at: string;
        };
        Insert: {
          professional_id: string;
          full_name: string;
          phone: string;
          residential_address: string;
          occupation: string;
          relationship: string;
          government_id_url?: string | null;
          passport_url?: string | null;
          email?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["guarantors"]["Insert"]>;
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          type: "direct" | "group" | "assignment_team" | "provider";
          name: string | null;
          assignment_id: string | null;
          participant_ids: string[];
          chat_kind: "pharmacist" | "diagnostic" | "hospital" | "ambulance" | null;
          provider_id: string | null;
          booking_id: string | null;
          service_id: string | null;
          context_label: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          type: "direct" | "group" | "assignment_team" | "provider";
          name?: string | null;
          assignment_id?: string | null;
          participant_ids?: string[];
          chat_kind?: "pharmacist" | "diagnostic" | "hospital" | "ambulance" | null;
          provider_id?: string | null;
          booking_id?: string | null;
          service_id?: string | null;
          context_label?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["conversations"]["Insert"]>;
        Relationships: [];
      };
      recommendations: {
        Row: {
          id: string;
          professional_id: string;
          created_by: string;
          title: string;
          content: string;
          letter_url: string | null;
          is_public: boolean;
          created_at: string;
        };
        Insert: {
          professional_id: string;
          created_by: string;
          title: string;
          content: string;
          letter_url?: string | null;
          is_public?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["recommendations"]["Insert"]>;
        Relationships: [];
      };
      blog_posts: {
        Row: {
          id: string;
          slug: string;
          title: string;
          excerpt: string | null;
          content: string;
          cover_image_url: string | null;
          category: string | null;
          tags: string[];
          author_id: string | null;
          is_published: boolean;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          slug: string;
          title: string;
          excerpt?: string | null;
          content: string;
          cover_image_url?: string | null;
          category?: string | null;
          tags?: string[];
          author_id?: string | null;
          is_published?: boolean;
          published_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["blog_posts"]["Insert"]>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          resource_type: string | null;
          resource_id: string | null;
          old_values: Json | null;
          new_values: Json | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          user_id?: string | null;
          action: string;
          resource_type?: string | null;
          resource_id?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          ip_address?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
        Relationships: [];
      };
      schedules: {
        Row: {
          id: string;
          assignment_id: string;
          professional_id: string;
          date: string;
          start_time: string;
          end_time: string;
          status: "scheduled" | "completed" | "missed" | "cancelled";
          notes: string | null;
          created_at: string;
        };
        Insert: {
          assignment_id: string;
          professional_id: string;
          date: string;
          start_time: string;
          end_time: string;
          status?: "scheduled" | "completed" | "missed" | "cancelled";
          notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["schedules"]["Insert"]>;
        Relationships: [];
      };
      // MedLINK v8 tables (migration 007). Loosely typed until types are regenerated
      // with `supabase gen types`; callers cast rows to local shapes.
      professional_credentials: LooseTable;
      professional_application_events: LooseTable;
      organization_members: LooseTable;
      facility_staff: LooseTable;
      service_providers: LooseTable;
      provider_members: LooseTable;
      provider_services: LooseTable;
      provider_doctors: LooseTable;
      provider_availability: LooseTable;
      bookings: LooseTable;
      booking_events: LooseTable;
      transfer_payments: LooseTable;
      reviews: LooseTable;
      disputes: LooseTable;
      dispute_events: LooseTable;
      earn_settings: LooseTable;
      ad_campaigns: LooseTable;
      ad_impressions: LooseTable;
      payout_accounts: LooseTable;
      coin_wallets: LooseTable;
      withdrawals: LooseTable;
      coin_ledger: LooseTable;
      game_sessions: LooseTable;
      game_perks: LooseTable;
      gist_posts: LooseTable;
      gist_reactions: LooseTable;
      gist_comments: LooseTable;
      gist_follows: LooseTable;
      gist_reports: LooseTable;
      facility_sites: LooseTable;
      shifts: LooseTable;
      face_enrollments: LooseTable;
      attendance_events: LooseTable;
      attendance_corrections: LooseTable;
      calendar_integrations: LooseTable;
      calendar_event_links: LooseTable;
      privacy_consents: LooseTable;
    };
    Views: {
      gist_post_stats: { Row: { post_id: string; thumbs_up: number; thumbs_down: number; comments: number }; Relationships: [] };
    };
    Functions: {
      start_ad_impression: { Args: { p_campaign: string; p_placement: string; p_game?: string | null }; Returns: string };
      complete_ad_impression: { Args: { p_impression: string }; Returns: Json };
      request_withdrawal: { Args: { p_reference: string }; Returns: string };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
