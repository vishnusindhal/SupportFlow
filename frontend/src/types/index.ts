export interface User {
  id: string;
  email: string;
  display_name: string;
  is_active: boolean;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

export interface Membership {
  id: string;
  user_id: string;
  organization_id: string;
  role: "owner" | "admin" | "agent" | "viewer";
  status: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
  organization: Organization;
  membership: Membership;
}

export interface MeResponse {
  user: User;
  membership: Membership;
}

export interface Session {
  accessToken: string;
  user: User;
  organization: Organization;
  membership: Membership;
}

export interface TemplateSummary {
  id: string;
  industry_key: string;
  version: number;
  display_name: string;
  is_active: boolean;
}

export interface TemplateDetail extends TemplateSummary {
  config: Record<string, unknown>;
}

export interface OnboardingStatus {
  is_completed: boolean;
  company_profile?: {
    company_name?: string;
    timezone?: string;
  } | null;
  selected_template_id?: string | null;
}

export interface CompanyConfigResponse {
  id: string;
  organization_id: string;
  template_id: string;
  template_version: number;
  company_profile: {
    company_name?: string;
    timezone?: string;
    [key: string]: unknown;
  };
  config: {
    assistant?: {
      name?: string;
      tone?: string;
      handoff_enabled?: boolean;
    };
    intents?: Array<{ key: string; label: string }>;
    entities?: Array<{ key: string; type: string; pattern?: string }>;
    default_rules?: Array<{ name: string; when: string; action: string }>;
    faqs?: Array<{ question: string; answer: string }>;
    menu?: {
      welcome: string;
      options: string[];
    };
    [key: string]: unknown;
  };
  updated_at: string;
}

export interface CompanyDocument {
  id: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  status: "pending" | "ready" | "failed";
  error_code?: string | null;
  created_at: string;
  processed_at?: string | null;
}

export interface RetrievedChunk {
  chunk_id: string;
  document_id: string;
  content: string;
  metadata: {
    source_filename?: string;
    embedding_model?: string;
    [key: string]: unknown;
  };
  score: number;
}

export interface SourceReference {
  chunk_id: string;
  document_id: string;
  document_name: string;
  excerpt: string;
  metadata?: Record<string, unknown>;
}

export interface ChatResponse {
  conversation_id: string;
  message_id: string;
  answer: string;
  sources: SourceReference[];
  fallback: boolean;
  escalation_offered: boolean;
  intent?: string | null;
  current_state: string;
  action: string;
}

export interface Conversation {
  id: string;
  channel: string;
  status: string;
  current_state?: string;
  created_at?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  intent?: string | null;
  entities?: Record<string, unknown>;
  created_at?: string;
}

export interface FlowOption {
  label: string;
  next_state: string;
}

export interface FlowState {
  prompt: string;
  options: Record<string, FlowOption>;
  terminal?: boolean;
}

export interface FlowConfig {
  version: number;
  initial_state: string;
  states: Record<string, FlowState>;
}

export interface FlowResponse {
  version: number;
  flow: FlowConfig | null;
  updated_at?: string;
}

export type RuleOperator = "equals" | "not_equals" | "greater_than" | "less_than" | "contains" | "in";
export type RuleActionType = "escalate" | "require_approval" | "route_to_team" | "auto_respond" | "set_priority";

export interface RuleCondition {
  field: string;
  operator: RuleOperator;
  value: unknown;
}

export interface RuleAction {
  type: RuleActionType;
  message?: string | null;
  team?: string | null;
  priority?: "low" | "normal" | "high" | "urgent" | null;
}

export interface RuleInput {
  name: string;
  conditions: RuleCondition[];
  logic: "all" | "any";
  action: RuleAction;
  priority: number;
  enabled: boolean;
}

export interface CompanyRule extends RuleInput {
  id: string;
  organization_id: string;
}

export interface RuleTraceItem {
  rule_id: string;
  name: string;
  matched: boolean;
  conditions: Array<{
    field: string;
    operator: string;
    expected: unknown;
    actual: unknown;
    matched: boolean;
  }>;
}

export interface RuleEvaluation {
  matched: boolean;
  rule_id?: string | null;
  rule_name?: string | null;
  action?: RuleAction | null;
  trace: RuleTraceItem[];
}
