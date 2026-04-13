export type ProjectStatus = "active" | "completed" | "archived";
export type ItemSeverity = "critical" | "major" | "minor";
export type ItemStatus = "open" | "in_progress" | "completed";
export type ChangeOrderStatus = "draft" | "sent" | "signed" | "rejected";
export type SignatureStatus = "pending" | "signed" | "expired";

export interface Project {
  id: string;
  user_id: string;
  name: string;
  address: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface PunchItem {
  id: string;
  project_id: string;
  item_number: number;
  room: string;
  description: string;
  severity: ItemSeverity;
  status: ItemStatus;
  assigned_trade: string | null;
  photo_urls: string[];
  notes: string | null;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
}

export interface LineItem {
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  subtotal: number;
}

export interface ChangeOrder {
  id: string;
  project_id: string;
  description: string;
  requested_by: string;
  line_items: LineItem[];
  total_cost: number;
  status: ChangeOrderStatus;
  audio_url: string | null;
  transcript: string | null;
  signature_token: string | null;
  signature_url: string | null;
  signed_by: string | null;
  signed_at: string | null;
  pdf_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface Walkthrough {
  id: string;
  project_id: string;
  audio_url: string;
  transcript: string;
  type: "punchlist" | "change_order";
  processed_at: string;
}

export interface Signature {
  id: string;
  document_type: "punchlist" | "change_order";
  document_id: string;
  token: string;
  signer_name: string | null;
  signer_email: string | null;
  signature_image_url: string | null;
  status: SignatureStatus;
  signed_at: string | null;
  expires_at: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_sub_id: string;
  plan_tier: "project" | "unlimited";
  status: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
}

export interface TranscribePunchlistResult {
  items: Array<{
    number: number;
    room: string;
    description: string;
    severity: "CRITICAL" | "MAJOR" | "MINOR";
    assigned_trade?: string;
  }>;
  room_summary: Record<string, number>;
  total_items: number;
  critical_count: number;
  major_count: number;
  minor_count: number;
}

export interface TranscribeChangeOrderResult {
  description: string;
  requested_by: string;
  verbal_approval: boolean;
  line_items: LineItem[];
  total: number;
  notes: string;
}
