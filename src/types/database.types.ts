// Placeholder types — replace by running:
// npx supabase gen types typescript --project-id <YOUR_PROJECT_ID> > src/types/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: "admin" | "professional" | "organization" | "client";
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
          role?: "admin" | "professional" | "organization" | "client";
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
          profession: "nurse" | "nurse_assistant" | "caregiver" | "physiotherapist" | "doctor";
          specialty: string | null;
          years_of_experience: number;
          preferred_location: string | null;
          notification_number: string | null;
          bio: string | null;
          workforce_status: "available" | "assigned" | "on_leave" | "under_review" | "resigned" | "contract_completed" | "suspended";
          availability: string[];
          rating: number | null;
          total_assignments: number;
          is_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          profession: "nurse" | "nurse_assistant" | "caregiver" | "physiotherapist" | "doctor";
          specialty?: string | null;
          years_of_experience?: number;
          preferred_location?: string | null;
          notification_number?: string | null;
          bio?: string | null;
          workforce_status?: "available" | "assigned" | "on_leave" | "under_review" | "resigned" | "contract_completed" | "suspended";
          availability?: string[];
          rating?: number | null;
          total_assignments?: number;
          is_verified?: boolean;
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
          org_type: "hospital" | "clinic" | "hmo" | "ngo" | "school" | "nursing_home";
          organization_name: string;
          registration_number: string | null;
          website: string | null;
          contact_person: string;
          is_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          org_type: "hospital" | "clinic" | "hmo" | "ngo" | "school" | "nursing_home";
          organization_name: string;
          registration_number?: string | null;
          website?: string | null;
          contact_person: string;
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
          user_id: string;
          title: string;
          body: string;
          type: "assignment" | "booking" | "payment" | "reminder" | "system";
          is_read: boolean;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          title: string;
          body: string;
          type: "assignment" | "booking" | "payment" | "reminder" | "system";
          is_read?: boolean;
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
          client_id: string | null;
          organization_id: string | null;
          assignment_id: string | null;
          amount: number;
          currency: string;
          status: "pending" | "paid" | "failed" | "refunded";
          provider: "stripe" | "paystack";
          provider_reference: string | null;
          invoice_url: string | null;
          paid_at: string | null;
          created_at: string;
        };
        Insert: {
          client_id?: string | null;
          organization_id?: string | null;
          assignment_id?: string | null;
          amount: number;
          currency?: string;
          status?: "pending" | "paid" | "failed" | "refunded";
          provider: "stripe" | "paystack";
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
        };
        Update: Partial<Database["public"]["Tables"]["guarantors"]["Insert"]>;
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          type: "direct" | "group" | "assignment_team";
          name: string | null;
          assignment_id: string | null;
          participant_ids: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          type: "direct" | "group" | "assignment_team";
          name?: string | null;
          assignment_id?: string | null;
          participant_ids?: string[];
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
