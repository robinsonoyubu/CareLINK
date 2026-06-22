export type UserRole = "admin" | "professional" | "organization" | "client";

export type ProfessionType =
  | "nurse"
  | "nurse_assistant"
  | "caregiver"
  | "physiotherapist"
  | "doctor";

export type WorkforceStatus =
  | "available"
  | "assigned"
  | "on_leave"
  | "under_review"
  | "resigned"
  | "contract_completed"
  | "suspended";

export type AssignmentStatus =
  | "pending"
  | "active"
  | "completed"
  | "cancelled";

export type ServiceType =
  | "home_care"
  | "nursing"
  | "caregiver"
  | "physiotherapy"
  | "staffing"
  | "outsourcing";

export type ServiceDuration =
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "live_in";

export type OrganizationType =
  | "hospital"
  | "clinic"
  | "hmo"
  | "ngo"
  | "school"
  | "nursing_home";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  phone?: string;
  date_of_birth?: string;
  address?: string;
  gender?: "male" | "female" | "other";
  nin?: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Professional {
  id: string;
  profile_id: string;
  profile?: Profile;
  profession: ProfessionType;
  specialty?: string;
  years_of_experience: number;
  preferred_location?: string;
  phone_number?: string;
  bio?: string;
  workforce_status: WorkforceStatus;
  availability: ServiceDuration[];
  rating?: number;
  total_assignments: number;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  profile_id: string;
  profile?: Profile;
  type: OrganizationType;
  name: string;
  registration_number?: string;
  website?: string;
  contact_person: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  profile_id: string;
  profile?: Profile;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  medical_notes?: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Assignment {
  id: string;
  professional_id: string;
  professional?: Professional;
  client_id?: string;
  client?: Client;
  organization_id?: string;
  organization?: Organization;
  service_type: ServiceType;
  duration_type: ServiceDuration;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  status: AssignmentStatus;
  hourly_rate?: number;
  total_cost?: number;
  location?: string;
  notes?: string;
  assigned_by: string;
  created_at: string;
  updated_at: string;
}

export interface Scorecard {
  id: string;
  professional_id: string;
  assignment_id?: string;
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
  notes?: string;
  created_by: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender?: Profile;
  content: string;
  message_type: "text" | "file" | "system";
  file_url?: string;
  is_read: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: "assignment" | "booking" | "payment" | "reminder" | "system";
  is_read: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface Document {
  id: string;
  owner_id: string;
  document_type:
    | "certificate"
    | "license"
    | "recommendation"
    | "government_id"
    | "passport"
    | "cv"
    | "cover_letter"
    | "other";
  name: string;
  file_url: string;
  is_verified: boolean;
  expires_at?: string;
  created_at: string;
}

export interface Payment {
  id: string;
  client_id?: string;
  organization_id?: string;
  assignment_id?: string;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "refunded";
  provider: "stripe" | "paystack";
  provider_reference?: string;
  invoice_url?: string;
  paid_at?: string;
  created_at: string;
}

export interface DashboardStats {
  total_professionals: number;
  available_professionals: number;
  active_assignments: number;
  total_clients: number;
  total_organizations: number;
  monthly_revenue: number;
  pending_verifications: number;
  open_requests: number;
}

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
  badge?: number;
}
