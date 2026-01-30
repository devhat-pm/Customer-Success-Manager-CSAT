// Customer User Types
export interface CustomerUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  job_title?: string;
  phone?: string;
  customer_id: string;
  customer_name?: string;
  role?: 'admin' | 'user';
  is_primary_contact: boolean;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface Customer {
  id: string;
  company_name: string;
  industry?: string;
  contact_email?: string;
  contact_phone?: string;
  deployed_products?: string[];
  portal_enabled: boolean;
}

export interface CustomerUserContext {
  customer_user: CustomerUser;
  customer: Customer;
  customer_id: string;
  company_name: string;
}

// Auth Types
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignupData {
  token: string;
  password: string;
  full_name: string;
  job_title?: string;
  phone?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    full_name?: string;
    job_title?: string;
    phone?: string;
    is_primary_contact?: boolean;
  };
  company: {
    id: string;
    name: string;
    logo_url?: string;
    industry?: string;
  };
}

export interface InvitationValidation {
  valid: boolean;
  message?: string;
  email?: string;
  customer_id?: string;
  customer_name?: string;
  expires_at?: string;
}

// Ticket Types
export enum ProductType {
  MonetX = 'MonetX',
  MonetX_Recon = 'MonetX_Recon',
  SupportX = 'SupportX',
  PartnerLearn = 'PartnerLearn',
  AgentShield = 'AgentShield',
  ToolshubPro = 'ToolshubPro',
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  WAITING_CUSTOMER = 'waiting_customer',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum CreatorType {
  STAFF = 'staff',
  CUSTOMER = 'customer',
}

export interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  product: ProductType;
  priority: TicketPriority;
  status: TicketStatus;
  sla_breached: boolean;
  customer_visible_notes?: string;
  created_by_type: CreatorType;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  comment_count: number;
}

export interface TicketDetail extends Ticket {
  comments: TicketComment[];
  company_name: string;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  comment_text: string;
  commenter_type: CreatorType;
  commenter_name?: string;
  commenter_customer_user_id?: string;
  commenter_staff_user_id?: string;
  is_internal: boolean;
  attachments: string[];
  created_at: string;
}

export interface CreateTicketData {
  subject: string;
  description: string;
  product: string;
  priority: TicketPriority;
}

export interface CreateCommentData {
  comment_text: string;
  attachments?: string[];
}

export interface TicketListResponse {
  tickets: Ticket[];
  total: number;
  skip: number;
  limit: number;
}

export interface TicketStats {
  total_tickets: number;
  open_tickets: number;
  in_progress_tickets: number;
  resolved_tickets: number;
  closed_tickets: number;
  active_tickets: number;
}

// Survey Types
export enum SurveyType {
  CSAT = 'csat',
  NPS = 'nps',
  CES = 'ces',
  ONBOARDING = 'onboarding',
  FEATURE = 'feature',
  TICKET_FOLLOWUP = 'ticket_followup',
  QUARTERLY_REVIEW = 'quarterly_review',
  GENERAL_FEEDBACK = 'general_feedback',
  PRODUCT_FEEDBACK = 'product_feedback',
}

export enum SurveyRequestStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export interface SurveyRequest {
  id: string;
  customer_id: string;
  survey_type: SurveyType;
  status: SurveyRequestStatus;
  linked_ticket_id?: string;
  linked_ticket_number?: string;
  unique_survey_token: string;
  custom_message?: string;
  created_at: string;
  expires_at: string;
  completed_at?: string;
}

export interface SurveySubmission {
  score: number;
  feedback_text?: string;
  anonymous?: boolean;
}

export interface PublicSurveySubmission {
  score: number;
  feedback_text?: string;
  submitter_name?: string;
  submitter_email?: string;
}

export interface CSATSurvey {
  id: string;
  customer_id: string;
  survey_type: SurveyType;
  score: number;
  feedback_text?: string;
  submitted_by_name?: string;
  submitted_at: string;
  linked_ticket_id?: string;
}

export interface PendingSurvey {
  id: string;
  survey_type: SurveyType;
  linked_ticket_number?: string;
  linked_ticket_subject?: string;
  survey_url: string;
  token: string;
  expires_at: string;
  custom_message?: string;
}

export interface FeedbackHistory {
  surveys: CSATSurvey[];
  total: number;
  skip: number;
  limit: number;
}

// Dashboard Types
export interface HealthScore {
  overall_score: number;
  health_status: 'healthy' | 'at_risk' | 'attention_needed';
  trend: 'improving' | 'stable' | 'declining';
  health_message: string;
  last_calculated?: string;
}

export interface TicketsSummary {
  open_count: number;
  in_progress_count: number;
  resolved_this_month: number;
  recent_tickets: RecentTicket[];
}

export interface RecentTicket {
  id: string;
  ticket_number: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  created_at: string;
}

export interface DeployedProduct {
  product_name: string;
  version?: string;
  deployment_date?: string;
  status: 'active' | 'inactive' | 'pending';
  documentation_url?: string;
  release_notes_url?: string;
}

export interface CustomerProducts {
  products: DeployedProduct[];
  total_count: number;
}

export interface ActivityItem {
  id: string;
  activity_type: string;
  description: string;
  created_at: string;
  related_entity_type?: string;
  related_entity_id?: string;
}

export interface RecentActivity {
  activities: ActivityItem[];
  total: number;
}

export interface PendingSurveys {
  surveys: PendingSurvey[];
  count: number;
}

export interface ContractInfo {
  contract_start_date?: string;
  contract_end_date?: string;
  contract_type?: string;
  account_manager_name?: string;
  account_manager_email?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'normal' | 'important';
  start_date: string;
  end_date?: string;
}

export interface AnnouncementsList {
  announcements: Announcement[];
  count: number;
}

export interface CustomerDashboard {
  welcome_message: string;
  company_name: string;
  health_score?: HealthScore;
  tickets_summary: TicketsSummary;
  products: CustomerProducts;
  recent_activity: RecentActivity;
  pending_surveys: PendingSurveys;
  contract_info: ContractInfo;
  announcements: AnnouncementsList;
}

// Product Types for Product Page
export interface ProductDetail extends DeployedProduct {
  description?: string;
  features?: string[];
  support_email?: string;
  support_phone?: string;
}

// Profile Types
export interface ProfileUpdate {
  full_name?: string;
  job_title?: string;
  phone?: string;
}

export interface PasswordChange {
  current_password: string;
  new_password: string;
}

// API Response Types
export interface ApiError {
  detail: string;
}

export interface MessageResponse {
  message: string;
}

// Pagination
export interface PaginationParams {
  skip?: number;
  limit?: number;
}

// Filter Types
export interface TicketFilters extends PaginationParams {
  status?: TicketStatus;
  product?: ProductType;
  date_from?: string;
  date_to?: string;
  search?: string;
}

// Customer Product Types (for Products page)
export interface CustomerProduct {
  id: string;
  product_name: string;
  version?: string;
  status: 'active' | 'pending' | 'suspended' | 'inactive';
  deployed_at: string;
  expires_at?: string;
  license_type?: string;
  usage_limit?: number;
  current_usage?: number;
  features?: string[];
  documentation_url?: string;
  release_notes_url?: string;
}

// Feedback Types (for Feedback page)
export interface FeedbackHistoryItem {
  id: string;
  feedback_type: string;
  product?: string;
  rating: number;
  feedback_text: string;
  response?: string;
  submitted_at: string;
}

export interface SurveyDetails {
  id: string;
  survey_type: SurveyType;
  linked_ticket_number?: string;
  linked_ticket_subject?: string;
  custom_message?: string;
  expires_at: string;
}
