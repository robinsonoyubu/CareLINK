import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerProfessionalSchema = z.object({
  full_name: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().min(10, "Valid phone number required"),
  profession: z.enum(["nurse", "nurse_assistant", "caregiver", "physiotherapist", "doctor"]),
  specialty: z.string().optional(),
  years_of_experience: z.coerce.number().min(0),
  bio: z.string().optional(),
});

export const registerOrganizationSchema = z.object({
  full_name: z.string().min(2, "Contact person name required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().min(10, "Valid phone number required"),
  name: z.string().min(2, "Organization name required"),
  type: z.enum(["hospital", "clinic", "hmo", "ngo", "school", "nursing_home"]),
  registration_number: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  address: z.string().min(5, "Address is required"),
  contact_person: z.string().min(2, "Contact person required"),
});

export const registerClientSchema = z.object({
  full_name: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().min(10, "Valid phone number required"),
  address: z.string().min(5, "Address is required"),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  medical_notes: z.string().optional(),
});

export const assignmentSchema = z.object({
  professional_id: z.string().uuid("Select a professional"),
  service_type: z.enum(["home_care", "nursing", "caregiver", "physiotherapy", "staffing", "outsourcing"]),
  duration_type: z.enum(["hourly", "daily", "weekly", "monthly", "live_in"]),
  title: z.string().min(2, "Title is required"),
  description: z.string().optional(),
  start_date: z.string(),
  end_date: z.string().optional(),
  location: z.string().min(2, "Location is required"),
  hourly_rate: z.coerce.number().optional(),
  notes: z.string().optional(),
});

export const scorecardSchema = z.object({
  professional_id: z.string().uuid(),
  period_month: z.coerce.number().min(1).max(12),
  period_year: z.coerce.number().min(2020).max(2100),
  attendance: z.coerce.number().min(0).max(100),
  punctuality: z.coerce.number().min(0).max(100),
  professionalism: z.coerce.number().min(0).max(100),
  communication: z.coerce.number().min(0).max(100),
  clinical_competence: z.coerce.number().min(0).max(100),
  teamwork: z.coerce.number().min(0).max(100),
  patient_care: z.coerce.number().min(0).max(100),
  notes: z.string().optional(),
});

export const cvGeneratorSchema = z.object({
  profession: z.enum(["nurse", "nurse_assistant", "caregiver", "physiotherapist", "doctor"]),
  template: z.enum(["standard", "international", "nhs_uk"]),
  full_name: z.string().min(2),
  years_of_experience: z.coerce.number().min(0),
  specialty: z.string().optional(),
  skills: z.array(z.string()),
  education: z.string(),
  certifications: z.string().optional(),
  professional_summary: z.string().optional(),
});

export const careerDocSchema = z.object({
  doc_type: z.enum(["cover_letter", "nhs_statement", "interview_prep", "career_guidance", "recommendation_letter"]),
  profession: z.string().min(2),
  full_name: z.string().min(2),
  years_of_experience: z.coerce.number().min(0).optional(),
  specialty: z.string().optional(),
  // Free-form context: job/role description, career goals, supervisor info, etc.
  details: z.string().min(1),
});

export type CareerDocInput = z.infer<typeof careerDocSchema>;

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterProfessionalInput = z.infer<typeof registerProfessionalSchema>;
export type RegisterOrganizationInput = z.infer<typeof registerOrganizationSchema>;
export type RegisterClientInput = z.infer<typeof registerClientSchema>;
export type AssignmentInput = z.infer<typeof assignmentSchema>;
export type ScorecardInput = z.infer<typeof scorecardSchema>;
export type CVGeneratorInput = z.infer<typeof cvGeneratorSchema>;
