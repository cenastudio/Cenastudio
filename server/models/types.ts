export interface DbUser {
  id: number;
  email: string;
  password_hash: string;
  role: "user" | "admin";
  name?: string | null;
  avatar_url?: string | null;
  email_verified?: number;
  github_id?: string | null;
  created_at: string;
}

export interface DbClient {
  id: number;
  user_id: number;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  segment: string;
  status: string;
  workflow_stage: string;
  notes: string | null;
  total_spent: number;
  first_contact_at: string | null;
  last_contact_at: string | null;
  created_at: string;
  updated_at: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  website?: string | null;
  linkedin?: string | null;
  instagram?: string | null;
  industry?: string | null;
  company_size?: string | null;
  annual_revenue?: number | null;
  contact_person?: string | null;
  contact_role?: string | null;
  billing_cycle?: string | null;
  payment_method?: string | null;
  tax_id?: string | null;
}

export interface DbProject {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  status: string;
  client_id: number | null;
  metadata_json: string;
  created_at: string;
  updated_at: string;
}

export interface DbProjectState {
  id: number;
  project_id: number;
  tool_id: string;
  form_data: string;
  output_data: string | null;
  updated_at: string;
}

export interface DbTool {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  is_active: number;
  icon?: string | null;
  tags?: string | null;
  slug?: string | null;
  processing_time?: string | null;
  placeholder?: string | null;
  prompt_role?: string | null;
  updated_at: string;
  created_at?: string;
}

export interface DbOpportunity {
  id: number;
  user_id: number;
  client_id: number | null;
  title: string;
  stage: string;
  estimated_value: number | null;
  probability: number;
  expected_close_date: string | null;
  lost_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbInteraction {
  id: number;
  user_id: number;
  client_id: number;
  opportunity_id: number | null;
  type: string;
  subject: string | null;
  notes: string | null;
  next_follow_up: string | null;
  created_at: string;
}

export interface DbProjectMember {
  id: number;
  project_id: number;
  user_id: number | null;
  role: string;
  permissions: string;
  created_at: string;
}

export interface DbCount {
  c: number;
}

export interface DbCountByCount {
  count: number;
}

export interface DbNotification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: number | null;
  read: number;
  metadata: string | null; // JSON stored as string in SQLite
  created_at: string;
}

export interface DbSum {
  s: number;
  total?: number;
}
