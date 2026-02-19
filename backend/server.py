from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse, RedirectResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import secrets
import string
import jwt
import bcrypt
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import shutil
import httpx
import json
import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Anthropic (optional — enables AI-powered persona matching)
try:
    import anthropic as _anthropic_lib
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

# Google Gmail API (optional — enables Gmail integration)
try:
    from google_auth_oauthlib.flow import Flow
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request as GoogleRequest
    from googleapiclient.discovery import build as google_build
    GMAIL_AVAILABLE = True
except ImportError:
    GMAIL_AVAILABLE = False

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'alknz-portal-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Gmail OAuth Configuration
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/gmail/callback")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/userinfo.email",
]

# Create uploads directory
UPLOADS_DIR = ROOT_DIR / 'uploads' / 'avatars'
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# Create the main app
app = FastAPI(title="ALKNZ Portal API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ============== MODELS ==============

class UserBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    role: str = "FUND_MANAGER"
    status: str = "ACTIVE"
    office_id: Optional[str] = None

class UserCreate(UserBase):
    pass

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    office_id: Optional[str] = None
    assigned_funds: Optional[List[str]] = None

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    password_hash: str = ""
    must_reset_password: bool = True
    avatar_url: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    last_login: Optional[str] = None
    assigned_funds: List[str] = []

class UserResponse(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: str
    role: str
    status: str
    office_id: Optional[str]
    avatar_url: Optional[str]
    must_reset_password: bool
    created_at: str
    updated_at: str
    last_login: Optional[str]
    assigned_funds: List[str]

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    token: str
    user: UserResponse

class PasswordResetResponse(BaseModel):
    new_password: str
    message: str

class ChangePasswordRequest(BaseModel):
    new_password: str

class ChangePasswordResponse(BaseModel):
    message: str
    user: UserResponse

# Fund Models
class FundBase(BaseModel):
    name: str
    office_id: Optional[str] = None
    fund_type: str = "Fund"
    vintage_year: Optional[int] = None
    currency: str = "USD"
    target_raise: Optional[float] = None
    target_date: Optional[str] = None  # Target fundraising deadline (ISO date string)
    status: str = "Draft"
    thesis: Optional[str] = None
    primary_sectors: List[str] = []
    focus_regions: List[str] = []
    stage_focus: List[str] = []
    min_commitment: Optional[float] = None
    typical_check_min: Optional[float] = None
    typical_check_max: Optional[float] = None
    esg_policy: str = "None"

class FundCreate(FundBase):
    pass

class FundUpdate(BaseModel):
    name: Optional[str] = None
    fund_type: Optional[str] = None
    vintage_year: Optional[int] = None
    currency: Optional[str] = None
    target_raise: Optional[float] = None
    target_date: Optional[str] = None
    status: Optional[str] = None
    thesis: Optional[str] = None
    primary_sectors: Optional[List[str]] = None
    focus_regions: Optional[List[str]] = None
    stage_focus: Optional[List[str]] = None
    min_commitment: Optional[float] = None
    typical_check_min: Optional[float] = None
    typical_check_max: Optional[float] = None
    esg_policy: Optional[str] = None

class Fund(FundBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Investor Models - Investment Identity
class InvestorIdentityBase(BaseModel):
    # Scoping
    fund_id: str
    office_id: Optional[str] = None
    # Investment Identity fields
    investor_name: str
    title: Optional[str] = None  # Mr., Ms., Dr., etc.
    gender: Optional[str] = None  # Male, Female, Other, Prefer not to say
    nationality: Optional[str] = None
    age: Optional[int] = None
    job_title: Optional[str] = None
    investor_type: str = "Individual"  # Individual, Family Office, Institution, etc.
    sector: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    description: Optional[str] = None  # Long text
    website: Optional[str] = None
    # Identity extras (captured by Chrome Extension)
    linkedin_url: Optional[str] = None
    firm_name: Optional[str] = None
    # Investment Context fields
    wealth: Optional[str] = None  # Text description of wealth
    has_invested_with_alknz: Optional[bool] = None  # Yes/No - can be auto-populated or overridden
    has_invested_override: Optional[bool] = None  # True if manually overridden by FM
    previous_alknz_funds: List[str] = []  # List of fund IDs they've invested in before
    expected_ticket_amount: Optional[float] = None  # Expected investment amount
    expected_ticket_currency: str = "USD"  # Currency for expected ticket
    typical_ticket_size: Optional[float] = None  # Their typical investment size (optional)
    investment_size: Optional[float] = None  # ACTUAL committed/deployed investment amount
    investment_size_currency: str = "USD"  # Currency for investment size
    # Contact & Relationship fields
    contact_name: Optional[str] = None  # Point of Contact Name
    contact_title: Optional[str] = None  # Point of Contact Title
    contact_phone: Optional[str] = None  # Phone Number
    contact_email: Optional[str] = None  # Email
    contact_whatsapp: Optional[str] = None  # WhatsApp
    alknz_point_of_contact_id: Optional[str] = None  # User ID of ALKNZ relationship owner
    # Relationship Intelligence fields
    relationship_strength: Optional[str] = "unknown"  # cold, warm, direct, unknown
    decision_role: Optional[str] = "unknown"  # decision_maker, influencer, gatekeeper, unknown
    preferred_intro_path: Optional[str] = None  # text field for intro path
    # Source tracking
    source: Optional[str] = "manual"  # manual, spreadsheet_import, chrome_extension

class InvestorIdentityCreate(InvestorIdentityBase):
    pass

class InvestorIdentityUpdate(BaseModel):
    investor_name: Optional[str] = None
    title: Optional[str] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None
    age: Optional[int] = None
    job_title: Optional[str] = None
    investor_type: Optional[str] = None
    sector: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    # Identity extras (captured by Chrome Extension)
    linkedin_url: Optional[str] = None
    firm_name: Optional[str] = None
    # Investment Context fields
    wealth: Optional[str] = None
    has_invested_with_alknz: Optional[bool] = None
    has_invested_override: Optional[bool] = None
    previous_alknz_funds: Optional[List[str]] = None
    expected_ticket_amount: Optional[float] = None
    expected_ticket_currency: Optional[str] = None
    typical_ticket_size: Optional[float] = None
    investment_size: Optional[float] = None
    investment_size_currency: Optional[str] = None
    # Contact & Relationship fields
    contact_name: Optional[str] = None
    contact_title: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    contact_whatsapp: Optional[str] = None
    alknz_point_of_contact_id: Optional[str] = None
    # Relationship Intelligence fields
    relationship_strength: Optional[str] = "unknown"  # cold, warm, direct, unknown
    decision_role: Optional[str] = "unknown"  # decision_maker, influencer, gatekeeper, unknown
    preferred_intro_path: Optional[str] = None  # text field for intro path
    # Source tracking
    source: Optional[str] = None  # manual, spreadsheet_import, chrome_extension

class InvestorIdentity(InvestorIdentityBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_by: Optional[str] = None  # User ID who created
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Legacy Investor Models (keeping for backward compatibility)
class InvestorBase(BaseModel):
    investor_name: str
    investor_type: str = "Individual"
    firm_name: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    website: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    decision_role: str = "Unknown"
    relationship_strength: Optional[int] = None
    notes: Optional[str] = None
    preferred_sectors: List[str] = []
    preferred_regions: List[str] = []
    preferred_stages: List[str] = []
    typical_ticket_min: Optional[float] = None
    typical_ticket_max: Optional[float] = None
    esg_requirement: str = "None"
    office_id: Optional[str] = None

class InvestorCreate(InvestorBase):
    pass

class Investor(InvestorBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Pipeline Models
class PipelineBase(BaseModel):
    fund_id: str
    investor_id: str
    owner_user_id: str
    stage: str = "NotContacted"
    expected_ticket: Optional[float] = None
    committed_amount: Optional[float] = None
    funded_amount: Optional[float] = None
    decline_reason: Optional[str] = None
    next_step: Optional[str] = None
    next_step_due_date: Optional[str] = None

class PipelineCreate(PipelineBase):
    pass

class Pipeline(PipelineBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Interaction Models
class InteractionBase(BaseModel):
    fund_id: str
    investor_id: str
    user_id: str
    channel: str = "Email"
    direction: str = "Outbound"
    summary: str
    occurred_at: str

class InteractionCreate(InteractionBase):
    pass

class Interaction(InteractionBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    metadata_json: Optional[dict] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Office Models
class OfficeBase(BaseModel):
    name: str
    location: Optional[str] = None

class Office(OfficeBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Fund Assignment Model
class FundAssignment(BaseModel):
    user_id: str
    fund_ids: List[str]

# ============== INVESTOR FUND ASSIGNMENT MODELS ==============
# This allows one investor to be assigned to multiple funds with fund-specific data

class InvestorFundAssignmentBase(BaseModel):
    investor_id: str
    fund_id: str
    assigned_manager_id: Optional[str] = None  # Fund Manager owner for this fund
    initial_stage_id: Optional[str] = None  # Initial pipeline stage (default: "Investors")
    # Fund-specific capital data
    expected_ticket_amount: Optional[float] = None
    expected_ticket_currency: str = "USD"
    investment_size: Optional[float] = None
    investment_size_currency: str = "USD"

class InvestorFundAssignmentCreate(BaseModel):
    investor_id: str
    fund_assignments: List[dict]  # List of {fund_id, assigned_manager_id, initial_stage_id}

class InvestorFundAssignment(InvestorFundAssignmentBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    assigned_by: str  # Admin user ID who made the assignment
    assigned_by_name: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ============== INVESTOR ASSIGNMENT REQUEST MODELS ==============
# Fund Managers request investors from global list, Admin approves/denies

class InvestorAssignmentRequestBase(BaseModel):
    investor_id: str
    requested_fund_id: str
    reason: Optional[str] = None  # Why FM wants this investor

class InvestorAssignmentRequestCreate(InvestorAssignmentRequestBase):
    pass

class InvestorAssignmentRequest(InvestorAssignmentRequestBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    requested_by_user_id: str
    requested_by_name: Optional[str] = None
    status: str = "pending"  # pending, approved, denied
    admin_response_by: Optional[str] = None  # Admin user ID who responded
    admin_response_by_name: Optional[str] = None
    denial_reason: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    resolved_at: Optional[str] = None

# ============== RESEARCH CAPTURE MODELS ==============

class ResearchCaptureBase(BaseModel):
    # Basic investor info captured from web
    investor_name: Optional[str] = None
    firm_name: Optional[str] = None
    investor_type: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    # Contact info
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    website_url: Optional[str] = None
    # Additional captured data
    job_title: Optional[str] = None
    notes: Optional[str] = None
    # Source info
    source_url: Optional[str] = None  # URL where data was captured
    source_page_title: Optional[str] = None

class ResearchCaptureCreate(ResearchCaptureBase):
    fund_id: Optional[str] = None  # Which fund this capture is for (optional — assigned at Accept time)
    api_key: Optional[str] = None  # For Chrome extension authentication

class ResearchCaptureUpdate(BaseModel):
    investor_name: Optional[str] = None
    firm_name: Optional[str] = None
    investor_type: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    website_url: Optional[str] = None
    job_title: Optional[str] = None
    notes: Optional[str] = None

class ResearchCapture(ResearchCaptureBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    external_id: Optional[str] = None  # ID from external API (ALKNZ Replit)
    fund_id: Optional[str] = None
    captured_by_user_id: Optional[str] = None  # User who captured via extension
    captured_by_name: Optional[str] = None
    status: str = "pending"  # pending, accepted, rejected
    processed_by_user_id: Optional[str] = None  # Fund Manager who accepted/rejected
    processed_by_name: Optional[str] = None
    created_investor_id: Optional[str] = None  # ID of investor created on accept
    rejection_reason: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    processed_at: Optional[str] = None

# ============== INVESTOR PERSONA MODELS ==============

class InvestorPersonaBase(BaseModel):
    name: str
    description: Optional[str] = None
    target_investor_type: Optional[str] = None   # Individual, Family Office, Institution, Corporate, Angel
    target_gender: Optional[str] = None           # Male, Female, Diverse
    target_age_min: Optional[int] = None          # minimum age, e.g. 45
    target_nationalities: Optional[List[str]] = []
    target_sectors: Optional[List[str]] = []
    professional_goals: Optional[str] = None
    professional_frustrations: Optional[str] = None
    why_invest: Optional[str] = None
    decision_making_process: Optional[str] = None
    min_ticket_size: Optional[float] = None
    max_ticket_size: Optional[float] = None

class InvestorPersonaCreate(InvestorPersonaBase):
    pass

class InvestorPersonaUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    target_investor_type: Optional[str] = None
    target_gender: Optional[str] = None
    target_age_min: Optional[int] = None
    target_nationalities: Optional[List[str]] = None
    target_sectors: Optional[List[str]] = None
    professional_goals: Optional[str] = None
    professional_frustrations: Optional[str] = None
    why_invest: Optional[str] = None
    decision_making_process: Optional[str] = None
    min_ticket_size: Optional[float] = None
    max_ticket_size: Optional[float] = None

class InvestorPersona(InvestorPersonaBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    fund_id: str
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PersonaMatchRequest(BaseModel):
    investor_id: str

# ============== PIPELINE STAGES & INVESTOR PIPELINE MODELS ==============

# Default pipeline stages for new funds
DEFAULT_PIPELINE_STAGES = [
    {"name": "Prospects",               "position": 0,  "is_default": True},
    {"name": "Investors",               "position": 1,  "is_default": False},
    {"name": "Intro Email",             "position": 2,  "is_default": False},
    {"name": "Opportunity Email",       "position": 3,  "is_default": False},
    {"name": "Phone Call",              "position": 4,  "is_default": False},
    {"name": "First Meeting",           "position": 5,  "is_default": False},
    {"name": "Second Meeting",          "position": 6,  "is_default": False},
    {"name": "Follow Up Email",         "position": 7,  "is_default": False},
    {"name": "Signing Contract",        "position": 8,  "is_default": False},
    {"name": "Signing Subscription",    "position": 9,  "is_default": False},
    {"name": "Letter for Capital Call", "position": 10, "is_default": False},
    {"name": "Money Transfer",          "position": 11, "is_default": False},
    {"name": "Transfer Date",           "position": 12, "is_default": False},
]

class PipelineStageBase(BaseModel):
    fund_id: str
    name: str
    position: int = 0
    is_default: bool = False

class PipelineStageCreate(PipelineStageBase):
    pass

class PipelineStageUpdate(BaseModel):
    name: Optional[str] = None
    position: Optional[int] = None
    is_default: Optional[bool] = None

class PipelineStage(PipelineStageBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class InvestorPipelineBase(BaseModel):
    fund_id: str
    investor_id: str
    stage_id: str  # Single source of truth for pipeline status
    position: int = 0  # Position within the stage (for ordering in kanban)

class InvestorPipelineCreate(InvestorPipelineBase):
    pass

class InvestorPipelineUpdate(BaseModel):
    stage_id: Optional[str] = None
    position: Optional[int] = None

class InvestorPipeline(InvestorPipelineBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    stage_entered_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    last_interaction_date: Optional[str] = None
    next_step: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ============== INVESTOR NOTES MODELS ==============

class InvestorNoteBase(BaseModel):
    investor_id: str
    content: str

class InvestorNoteCreate(InvestorNoteBase):
    pass

class InvestorNote(InvestorNoteBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_by: str  # User ID who created the note
    created_by_name: Optional[str] = None  # Denormalized for display
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ============== EMAIL TEMPLATE MODELS ==============

class EmailTemplateBase(BaseModel):
    name: str
    subject: str
    body: str
    category: str = "General"

class EmailTemplateCreate(EmailTemplateBase):
    pass

class EmailTemplateUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    category: Optional[str] = None

class EmailTemplate(EmailTemplateBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    fund_id: str
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ============== FEEDBACK MODELS ==============

class UserFeedbackCreate(BaseModel):
    # Section 1: User Context
    s1_role: Optional[str] = None
    s1_capital_frequency: Optional[str] = None
    s1_current_tools: Optional[List[str]] = []
    # Section 2: Overall Experience
    s2_intuitiveness: Optional[int] = None
    s2_confusing: Optional[str] = None
    s2_powerful: Optional[str] = None
    s2_daily_blocker: Optional[str] = None
    s2_would_miss: Optional[str] = None
    s2_would_miss_why: Optional[str] = None
    # Section 3: Pipeline
    s3_stages_logical: Optional[str] = None
    s3_missing_stages: Optional[str] = None
    s3_unnecessary_stages: Optional[str] = None
    s3_expected_auto_tasks: Optional[str] = None
    s3_tasks_made_sense: Optional[str] = None
    s3_task_preference: Optional[str] = None
    s3_missing_intro_email: Optional[str] = None
    s3_missing_first_meeting: Optional[str] = None
    s3_missing_due_diligence: Optional[str] = None
    s3_missing_capital_call: Optional[str] = None
    # Section 4: Task Manager
    s4_system_manual_clear: Optional[str] = None
    s4_task_scope: Optional[List[str]] = []
    s4_auto_assign_by: Optional[List[str]] = []
    s4_priority_clear: Optional[str] = None
    s4_recurring_tasks: Optional[str] = None
    # Section 5: Capital Overview
    s5_reflects_reality: Optional[str] = None
    s5_missing_metrics: Optional[List[str]] = []
    s5_partner_presentation: Optional[str] = None
    # Section 6: Investor Profiles
    s6_persona_useful: Optional[str] = None
    s6_wanted_scores: Optional[List[str]] = []
    s6_missing_fields: Optional[List[str]] = []
    # Section 7: Research Capture
    s7_workflow_clear: Optional[str] = None
    s7_auto_capture: Optional[List[str]] = []
    s7_auto_assign_persona: Optional[str] = None
    # Section 8: Communication Center
    s8_would_connect_gmail: Optional[str] = None
    s8_email_automation: Optional[List[str]] = []
    s8_call_logs_scoring: Optional[str] = None
    # Section 9: Automation & AI
    s9_ai_features: Optional[List[str]] = []
    s9_automation_comfort: Optional[str] = None
    # Section 10: Strategic Questions
    s10_monthly_cost: Optional[str] = None
    s10_replace_excel: Optional[str] = None
    s10_institutional_grade: Optional[str] = None
    s10_irreplaceable_feature: Optional[str] = None
    s10_unfinished: Optional[str] = None
    # Section 11: Priorities
    s11_ranking: Optional[List[str]] = []
    # Optional: Dev Feedback
    dev_stage_conversion: Optional[str] = None
    dev_auto_probability: Optional[str] = None
    dev_dynamic_forecast: Optional[List[str]] = []

class UserFeedback(UserFeedbackCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_email: str
    user_name: str
    user_role: str
    submitted_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ============== GMAIL MODELS ==============

class GmailCredentialsSave(BaseModel):
    client_id: str
    client_secret: str
    redirect_uri: str = "http://localhost:8000/api/gmail/callback"

class GmailSendRequest(BaseModel):
    to: str
    subject: str
    body: str
    cc: Optional[str] = None
    investor_id: Optional[str] = None
    investor_name: Optional[str] = None

# ============== HELPERS ==============

def generate_password(length=12):
    """Generate a secure random password"""
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, email: str, role: str) -> str:
    """Create a JWT token"""
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Decode JWT token and return current user"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(user: dict = Depends(get_current_user)):
    """Require admin role"""
    if user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ============== AUTH ROUTES ==============

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Authenticate user and return JWT token"""
    user = await db.users.find_one({"email": request.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(request.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if user.get("status") != "ACTIVE":
        raise HTTPException(status_code=401, detail="Account is inactive")
    
    # Update last login
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    token = create_token(user["id"], user["email"], user["role"])
    
    user_response = UserResponse(**user)
    return LoginResponse(token=token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    """Get current user profile"""
    return UserResponse(**user)

@api_router.post("/auth/change-password", response_model=ChangePasswordResponse)
async def change_password(request: ChangePasswordRequest, user: dict = Depends(get_current_user)):
    """Change password for current user (used for forced password reset)"""
    if len(request.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "password_hash": hash_password(request.new_password),
            "must_reset_password": False,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return ChangePasswordResponse(
        message="Password changed successfully",
        user=UserResponse(**updated_user)
    )

# ============== USER ROUTES ==============

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(admin: dict = Depends(require_admin)):
    """Get all users (admin only)"""
    users = await db.users.find({}, {"_id": 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

@api_router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, admin: dict = Depends(require_admin)):
    """Get user by ID (admin only)"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(**user)

@api_router.post("/users", response_model=dict)
async def create_user(user_data: UserCreate, admin: dict = Depends(require_admin)):
    """Create a new user with auto-generated password (admin only)"""
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Generate password
    password = generate_password()
    
    # Create user
    user = User(
        **user_data.model_dump(),
        password_hash=hash_password(password),
        must_reset_password=True
    )
    
    await db.users.insert_one(user.model_dump())
    
    return {
        "user": UserResponse(**user.model_dump()),
        "generated_password": password,
        "message": "User created successfully. Please copy the password."
    }

@api_router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, user_data: UserUpdate, admin: dict = Depends(require_admin)):
    """Update user (admin only)"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_dict = {k: v for k, v in user_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.users.update_one({"id": user_id}, {"$set": update_dict})
    
    updated_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    return UserResponse(**updated_user)

@api_router.post("/users/{user_id}/reset-password", response_model=PasswordResetResponse)
async def reset_user_password(user_id: str, admin: dict = Depends(require_admin)):
    """Reset user password (admin only)"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_password = generate_password()
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "password_hash": hash_password(new_password),
            "must_reset_password": True,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return PasswordResetResponse(
        new_password=new_password,
        message="Password reset successfully. Please copy the new password."
    )

@api_router.post("/users/{user_id}/deactivate", response_model=UserResponse)
async def deactivate_user(user_id: str, admin: dict = Depends(require_admin)):
    """Deactivate user (admin only)"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "status": "INACTIVE",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    updated_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    return UserResponse(**updated_user)

@api_router.post("/users/{user_id}/activate", response_model=UserResponse)
async def activate_user(user_id: str, admin: dict = Depends(require_admin)):
    """Activate user (admin only)"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "status": "ACTIVE",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    updated_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    return UserResponse(**updated_user)

@api_router.post("/users/{user_id}/avatar")
async def upload_avatar(user_id: str, file: UploadFile = File(...), admin: dict = Depends(require_admin)):
    """Upload user avatar (admin only)"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    # Save file
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{user_id}.{file_ext}"
    file_path = UPLOADS_DIR / filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    avatar_url = f"/api/avatars/{filename}"
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "avatar_url": avatar_url,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"avatar_url": avatar_url, "message": "Avatar uploaded successfully"}

@api_router.get("/avatars/{filename}")
async def get_avatar(filename: str):
    """Get avatar file"""
    file_path = UPLOADS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Avatar not found")
    return FileResponse(file_path)

# ============== ADMIN ALL INVESTORS ==============

INVESTOR_SOURCES = ["manual", "spreadsheet_import", "chrome_extension"]
INVESTOR_SOURCE_LABELS = {
    "manual": "Manual",
    "spreadsheet_import": "Spreadsheet Import",
    "chrome_extension": "Chrome Extension"
}

@api_router.get("/admin/all-investors")
async def get_all_investors(
    search: Optional[str] = None,
    source: Optional[str] = None,
    investor_type: Optional[str] = None,
    country: Optional[str] = None,
    assigned: Optional[str] = None,  # "assigned", "unassigned", or None for all
    fund_id: Optional[str] = None,
    sort_by: Optional[str] = "created_at",  # created_at, latest_evidence, investor_name
    sort_order: Optional[str] = "desc",
    admin: dict = Depends(require_admin)
):
    """Get all investors with evidence count and assigned funds (admin only)"""
    
    # Get all investors
    query = {}
    
    # Apply filters
    if source and source in INVESTOR_SOURCES:
        query["source"] = source
    
    if investor_type:
        query["investor_type"] = investor_type
    
    if country:
        query["country"] = country
    
    investors = await db.investor_profiles.find(query, {"_id": 0}).to_list(10000)
    
    # Get all pipeline entries to determine fund assignments
    all_pipeline = await db.investor_pipeline.find({}, {"_id": 0}).to_list(10000)
    pipeline_by_investor = {}
    for p in all_pipeline:
        inv_id = p.get("investor_id")
        if inv_id not in pipeline_by_investor:
            pipeline_by_investor[inv_id] = []
        pipeline_by_investor[inv_id].append(p.get("fund_id"))
    
    # Get all funds for names
    funds = await db.funds.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)
    fund_names = {f["id"]: f["name"] for f in funds}
    
    # Get evidence counts for all investors
    evidence_pipeline = [
        {"$group": {
            "_id": "$investor_id",
            "count": {"$sum": 1},
            "latest_date": {"$max": "$captured_date"}
        }}
    ]
    evidence_stats = await db.evidence_entries.aggregate(evidence_pipeline).to_list(10000)
    evidence_by_investor = {e["_id"]: {"count": e["count"], "latest_date": e["latest_date"]} for e in evidence_stats}
    
    # Build enriched investor list
    enriched_investors = []
    for inv in investors:
        inv_id = inv.get("id")
        
        # Get assigned funds
        assigned_fund_ids = pipeline_by_investor.get(inv_id, [])
        # Also check if fund_id is directly on the investor
        if inv.get("fund_id") and inv.get("fund_id") not in assigned_fund_ids:
            assigned_fund_ids.append(inv.get("fund_id"))
        
        assigned_fund_ids = list(set(assigned_fund_ids))  # Remove duplicates
        assigned_fund_names = [fund_names.get(fid, "Unknown") for fid in assigned_fund_ids]
        
        # Filter by assigned/unassigned
        is_assigned = len(assigned_fund_ids) > 0
        if assigned == "assigned" and not is_assigned:
            continue
        if assigned == "unassigned" and is_assigned:
            continue
        
        # Filter by specific fund
        if fund_id and fund_id not in assigned_fund_ids:
            continue
        
        # Get evidence stats
        evidence_info = evidence_by_investor.get(inv_id, {"count": 0, "latest_date": None})
        
        # Apply search filter
        if search:
            search_lower = search.lower()
            searchable = f"{inv.get('investor_name', '')} {inv.get('job_title', '')} {inv.get('contact_email', '')} {inv.get('city', '')} {inv.get('country', '')}".lower()
            if search_lower not in searchable:
                continue
        
        enriched = {
            "id": inv_id,
            "investor_name": inv.get("investor_name"),
            "job_title": inv.get("job_title"),  # Firm name / job title
            "investor_type": inv.get("investor_type"),
            "country": inv.get("country"),
            "city": inv.get("city"),
            "contact_email": inv.get("contact_email"),
            "contact_phone": inv.get("contact_phone"),
            "source": inv.get("source", "manual"),
            "source_label": INVESTOR_SOURCE_LABELS.get(inv.get("source", "manual"), "Manual"),
            "created_at": inv.get("created_at"),
            "evidence_count": evidence_info["count"],
            "latest_evidence_date": evidence_info["latest_date"],
            "assigned_funds_count": len(assigned_fund_ids),
            "assigned_fund_ids": assigned_fund_ids,
            "assigned_fund_names": assigned_fund_names,
            "relationship_strength": inv.get("relationship_strength"),
            "decision_role": inv.get("decision_role")
        }
        enriched_investors.append(enriched)
    
    # Sort
    if sort_by == "latest_evidence":
        enriched_investors.sort(
            key=lambda x: x.get("latest_evidence_date") or "",
            reverse=(sort_order == "desc")
        )
    elif sort_by == "investor_name":
        enriched_investors.sort(
            key=lambda x: (x.get("investor_name") or "").lower(),
            reverse=(sort_order == "desc")
        )
    elif sort_by == "evidence_count":
        enriched_investors.sort(
            key=lambda x: x.get("evidence_count", 0),
            reverse=(sort_order == "desc")
        )
    else:  # created_at
        enriched_investors.sort(
            key=lambda x: x.get("created_at") or "",
            reverse=(sort_order == "desc")
        )
    
    # Get unique countries and investor types for filter options
    all_countries = list(set(inv.get("country") for inv in investors if inv.get("country")))
    all_investor_types = list(set(inv.get("investor_type") for inv in investors if inv.get("investor_type")))
    
    return {
        "total": len(enriched_investors),
        "investors": enriched_investors,
        "filter_options": {
            "sources": [{"value": s, "label": INVESTOR_SOURCE_LABELS[s]} for s in INVESTOR_SOURCES],
            "countries": sorted(all_countries),
            "investor_types": sorted(all_investor_types),
            "funds": [{"id": f["id"], "name": f["name"]} for f in funds]
        }
    }

# ============== ADMIN DUPLICATE INVESTOR MANAGEMENT ==============

class DuplicateInvestorGroup(BaseModel):
    investor_name: str
    count: int
    investors: List[dict]

@api_router.get("/admin/duplicate-investors")
async def get_duplicate_investors(admin: dict = Depends(require_admin)):
    """Find potential duplicate investors across all funds (admin only)"""
    # Get all investors
    all_investors = await db.investor_profiles.find({}, {"_id": 0}).to_list(10000)
    
    # Get all funds for names
    funds = await db.funds.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)
    fund_names = {f["id"]: f["name"] for f in funds}
    
    # Group by lowercase name
    name_groups = {}
    for inv in all_investors:
        name_key = inv.get("investor_name", "").strip().lower()
        if not name_key:
            continue
        if name_key not in name_groups:
            name_groups[name_key] = []
        name_groups[name_key].append({
            "id": inv.get("id"),
            "investor_name": inv.get("investor_name"),
            "investor_type": inv.get("investor_type"),
            "contact_email": inv.get("contact_email"),
            "contact_phone": inv.get("contact_phone"),
            "fund_id": inv.get("fund_id"),
            "fund_name": fund_names.get(inv.get("fund_id"), "Unknown"),
            "source": inv.get("source", "manual"),
            "created_at": inv.get("created_at")
        })
    
    # Filter to only groups with duplicates
    duplicates = []
    for name, investors in name_groups.items():
        if len(investors) > 1:
            duplicates.append({
                "investor_name": investors[0].get("investor_name"),
                "count": len(investors),
                "investors": sorted(investors, key=lambda x: x.get("created_at", ""))
            })
    
    # Sort by count (most duplicates first)
    duplicates.sort(key=lambda x: x["count"], reverse=True)
    
    return {
        "total_duplicate_groups": len(duplicates),
        "total_duplicate_records": sum(d["count"] for d in duplicates),
        "duplicates": duplicates
    }

class MergeInvestorsRequest(BaseModel):
    keep_investor_id: str
    delete_investor_ids: List[str]

@api_router.post("/admin/merge-investors")
async def merge_investors(merge_data: MergeInvestorsRequest, admin: dict = Depends(require_admin)):
    """Merge duplicate investors - keep one, delete others, reassign related data (admin only)"""
    keep_id = merge_data.keep_investor_id
    delete_ids = merge_data.delete_investor_ids
    
    # Verify keep investor exists
    keep_investor = await db.investor_profiles.find_one({"id": keep_id}, {"_id": 0})
    if not keep_investor:
        raise HTTPException(status_code=404, detail="Investor to keep not found")
    
    # Verify all delete investors exist
    for del_id in delete_ids:
        del_investor = await db.investor_profiles.find_one({"id": del_id}, {"_id": 0})
        if not del_investor:
            raise HTTPException(status_code=404, detail=f"Investor to delete ({del_id}) not found")
    
    # Reassign related data from deleted investors to kept investor
    reassigned = {
        "evidence_entries": 0,
        "investor_notes": 0,
        "investor_pipeline": 0,
        "call_logs": 0,
        "user_tasks": 0
    }
    
    for del_id in delete_ids:
        # Reassign evidence entries
        result = await db.evidence_entries.update_many(
            {"investor_id": del_id},
            {"$set": {"investor_id": keep_id}}
        )
        reassigned["evidence_entries"] += result.modified_count
        
        # Reassign investor notes
        result = await db.investor_notes.update_many(
            {"investor_id": del_id},
            {"$set": {"investor_id": keep_id}}
        )
        reassigned["investor_notes"] += result.modified_count
        
        # Delete duplicate pipeline entries (keep only original investor's pipeline)
        result = await db.investor_pipeline.delete_many({"investor_id": del_id})
        reassigned["investor_pipeline"] += result.deleted_count
        
        # Reassign call logs
        result = await db.call_logs.update_many(
            {"investor_id": del_id},
            {"$set": {"investor_id": keep_id, "investor_name": keep_investor.get("investor_name")}}
        )
        reassigned["call_logs"] += result.modified_count
        
        # Reassign user tasks
        result = await db.user_tasks.update_many(
            {"investor_id": del_id},
            {"$set": {"investor_id": keep_id, "investor_name": keep_investor.get("investor_name")}}
        )
        reassigned["user_tasks"] += result.modified_count
        
        # Delete the duplicate investor profile
        await db.investor_profiles.delete_one({"id": del_id})
    
    return {
        "message": f"Successfully merged {len(delete_ids)} duplicate investors into '{keep_investor.get('investor_name')}'",
        "kept_investor_id": keep_id,
        "deleted_investor_ids": delete_ids,
        "reassigned_data": reassigned
    }

@api_router.delete("/admin/investor/{investor_id}")
async def admin_delete_investor(investor_id: str, admin: dict = Depends(require_admin)):
    """Delete an investor and all related data (admin only)"""
    # Verify investor exists
    investor = await db.investor_profiles.find_one({"id": investor_id}, {"_id": 0})
    if not investor:
        raise HTTPException(status_code=404, detail="Investor not found")
    
    deleted = {
        "evidence_entries": 0,
        "investor_notes": 0,
        "investor_pipeline": 0,
        "call_logs": 0,
        "user_tasks": 0
    }
    
    # Delete related data
    result = await db.evidence_entries.delete_many({"investor_id": investor_id})
    deleted["evidence_entries"] = result.deleted_count
    
    result = await db.investor_notes.delete_many({"investor_id": investor_id})
    deleted["investor_notes"] = result.deleted_count
    
    result = await db.investor_pipeline.delete_many({"investor_id": investor_id})
    deleted["investor_pipeline"] = result.deleted_count
    
    result = await db.call_logs.delete_many({"investor_id": investor_id})
    deleted["call_logs"] = result.deleted_count
    
    result = await db.user_tasks.delete_many({"investor_id": investor_id})
    deleted["user_tasks"] = result.deleted_count
    
    # Delete the investor
    await db.investor_profiles.delete_one({"id": investor_id})
    
    return {
        "message": f"Successfully deleted investor '{investor.get('investor_name')}' and all related data",
        "deleted_data": deleted
    }

# ============== INVESTOR FUND ASSIGNMENT ROUTES (ADMIN ONLY) ==============

@api_router.get("/investors/{investor_id}/assignments")
async def get_investor_assignments(investor_id: str, user: dict = Depends(get_current_user)):
    """Get all fund assignments for an investor"""
    # Verify investor exists
    investor = await db.investor_profiles.find_one({"id": investor_id}, {"_id": 0})
    if not investor:
        raise HTTPException(status_code=404, detail="Investor not found")
    
    # Get all funds for names
    funds = await db.funds.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)
    fund_map = {f["id"]: f["name"] for f in funds}
    
    # Get all users for manager names
    users = await db.users.find({}, {"_id": 0, "id": 1, "first_name": 1, "last_name": 1}).to_list(1000)
    user_map = {u["id"]: f"{u.get('first_name', '')} {u.get('last_name', '')}".strip() for u in users}
    
    # Get assignments from investor_fund_assignments collection
    assignments = await db.investor_fund_assignments.find(
        {"investor_id": investor_id}, {"_id": 0}
    ).to_list(1000)
    
    # Also check for legacy assignment via fund_id in investor profile
    legacy_fund_id = investor.get("fund_id")
    legacy_exists = legacy_fund_id and not any(a.get("fund_id") == legacy_fund_id for a in assignments)
    
    if legacy_exists:
        # Include the original fund as an assignment
        pipeline_entry = await db.investor_pipeline.find_one(
            {"investor_id": investor_id, "fund_id": legacy_fund_id}, {"_id": 0}
        )
        stage_id = pipeline_entry.get("stage_id") if pipeline_entry else None
        
        legacy_assignment = {
            "id": f"legacy-{investor_id}-{legacy_fund_id}",
            "investor_id": investor_id,
            "fund_id": legacy_fund_id,
            "fund_name": fund_map.get(legacy_fund_id, "Unknown"),
            "assigned_manager_id": investor.get("alknz_point_of_contact_id"),
            "assigned_manager_name": user_map.get(investor.get("alknz_point_of_contact_id"), ""),
            "stage_id": stage_id,
            "expected_ticket_amount": investor.get("expected_ticket_amount"),
            "expected_ticket_currency": investor.get("expected_ticket_currency", "USD"),
            "investment_size": investor.get("investment_size"),
            "investment_size_currency": investor.get("investment_size_currency", "USD"),
            "is_legacy": True,
            "created_at": investor.get("created_at")
        }
        assignments.insert(0, legacy_assignment)
    
    # Enrich assignments with fund names and manager names
    for assignment in assignments:
        if "fund_name" not in assignment:
            assignment["fund_name"] = fund_map.get(assignment.get("fund_id"), "Unknown")
        if "assigned_manager_name" not in assignment:
            assignment["assigned_manager_name"] = user_map.get(assignment.get("assigned_manager_id"), "")
    
    return {
        "investor_id": investor_id,
        "investor_name": investor.get("investor_name"),
        "assignments": assignments,
        "total_funds": len(assignments)
    }

@api_router.post("/admin/investor-fund-assignments")
async def create_investor_fund_assignments(
    assignment_data: InvestorFundAssignmentCreate, 
    admin: dict = Depends(require_admin)
):
    """Assign an investor to one or more funds (Admin only)"""
    investor_id = assignment_data.investor_id
    
    # Verify investor exists
    investor = await db.investor_profiles.find_one({"id": investor_id}, {"_id": 0})
    if not investor:
        raise HTTPException(status_code=404, detail="Investor not found")
    
    # Get admin name for audit
    admin_name = f"{admin.get('first_name', '')} {admin.get('last_name', '')}".strip() or admin.get('email')
    
    created_assignments = []
    already_assigned = []
    
    for fund_assignment in assignment_data.fund_assignments:
        fund_id = fund_assignment.get("fund_id")
        assigned_manager_id = fund_assignment.get("assigned_manager_id")
        initial_stage_id = fund_assignment.get("initial_stage_id")
        
        # Verify fund exists
        fund = await db.funds.find_one({"id": fund_id}, {"_id": 0})
        if not fund:
            continue
        
        # Check if already assigned (either via new system or legacy)
        existing_assignment = await db.investor_fund_assignments.find_one({
            "investor_id": investor_id,
            "fund_id": fund_id
        })
        
        # Also check legacy assignment
        legacy_assignment = investor.get("fund_id") == fund_id
        
        # Check if investor already has pipeline entry in this fund
        existing_pipeline = await db.investor_pipeline.find_one({
            "investor_id": investor_id,
            "fund_id": fund_id
        })
        
        if existing_assignment or (legacy_assignment and existing_pipeline):
            already_assigned.append({
                "fund_id": fund_id,
                "fund_name": fund.get("name"),
                "reason": "Already assigned to this fund"
            })
            continue
        
        # Get or create initial stage
        if not initial_stage_id:
            # Default to "Investors" stage
            default_stage = await db.pipeline_stages.find_one({
                "fund_id": fund_id,
                "name": "Investors"
            }, {"_id": 0})
            if default_stage:
                initial_stage_id = default_stage.get("id")
        
        # Create the assignment record
        assignment = InvestorFundAssignment(
            investor_id=investor_id,
            fund_id=fund_id,
            assigned_manager_id=assigned_manager_id,
            initial_stage_id=initial_stage_id,
            assigned_by=admin.get("id"),
            assigned_by_name=admin_name
        )
        
        await db.investor_fund_assignments.insert_one(assignment.model_dump())
        
        # Create pipeline entry for this fund
        if initial_stage_id:
            # Get current max position in the stage
            max_pos_result = await db.investor_pipeline.find_one(
                {"fund_id": fund_id, "stage_id": initial_stage_id},
                sort=[("position", -1)]
            )
            new_position = (max_pos_result.get("position", -1) if max_pos_result else -1) + 1
            
            pipeline_entry = InvestorPipeline(
                fund_id=fund_id,
                investor_id=investor_id,
                stage_id=initial_stage_id,
                position=new_position
            )
            await db.investor_pipeline.insert_one(pipeline_entry.model_dump())
        
        created_assignments.append({
            "assignment_id": assignment.id,
            "fund_id": fund_id,
            "fund_name": fund.get("name"),
            "assigned_manager_id": assigned_manager_id,
            "initial_stage_id": initial_stage_id
        })
    
    return {
        "message": f"Assigned '{investor.get('investor_name')}' to {len(created_assignments)} fund(s)",
        "investor_id": investor_id,
        "investor_name": investor.get("investor_name"),
        "created_assignments": created_assignments,
        "already_assigned": already_assigned
    }

@api_router.delete("/admin/investor-fund-assignments/{assignment_id}")
async def delete_investor_fund_assignment(assignment_id: str, admin: dict = Depends(require_admin)):
    """Remove an investor from a fund (Admin only)"""
    # Find the assignment
    assignment = await db.investor_fund_assignments.find_one({"id": assignment_id}, {"_id": 0})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    investor_id = assignment.get("investor_id")
    fund_id = assignment.get("fund_id")
    
    # Delete related pipeline entry
    await db.investor_pipeline.delete_many({
        "investor_id": investor_id,
        "fund_id": fund_id
    })
    
    # Delete fund-specific tasks
    await db.user_tasks.delete_many({
        "investor_id": investor_id,
        "fund_id": fund_id
    })
    
    # Delete the assignment
    await db.investor_fund_assignments.delete_one({"id": assignment_id})
    
    return {
        "message": "Successfully removed investor from fund",
        "deleted_assignment_id": assignment_id,
        "investor_id": investor_id,
        "fund_id": fund_id
    }

@api_router.get("/admin/funds/{fund_id}/fund-managers")
async def get_fund_managers_for_fund(fund_id: str, admin: dict = Depends(require_admin)):
    """Get all fund managers assigned to a specific fund (Admin only)"""
    # Verify fund exists
    fund = await db.funds.find_one({"id": fund_id}, {"_id": 0})
    if not fund:
        raise HTTPException(status_code=404, detail="Fund not found")
    
    # Get all users who have this fund in their assigned_funds
    users = await db.users.find(
        {"assigned_funds": fund_id, "role": "FUND_MANAGER"},
        {"_id": 0, "id": 1, "first_name": 1, "last_name": 1, "email": 1, "avatar_url": 1}
    ).to_list(1000)
    
    return {
        "fund_id": fund_id,
        "fund_name": fund.get("name"),
        "fund_managers": users
    }

# ============== INVESTOR ASSIGNMENT REQUEST ROUTES ==============

@api_router.get("/global-investors")
async def get_global_investors(
    search: Optional[str] = None,
    investor_type: Optional[str] = None,
    country: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get global investor list with restricted preview for Fund Managers"""
    # Build query
    query = {}
    if search:
        query["$or"] = [
            {"investor_name": {"$regex": search, "$options": "i"}},
            {"job_title": {"$regex": search, "$options": "i"}},
            {"country": {"$regex": search, "$options": "i"}},
            {"city": {"$regex": search, "$options": "i"}}
        ]
    if investor_type and investor_type != "all":
        query["investor_type"] = investor_type
    if country and country != "all":
        query["country"] = country
    
    # Fetch investors
    all_investors = await db.investor_profiles.find(query, {"_id": 0}).to_list(1000)
    
    # Get fund names for assigned funds display
    funds = await db.funds.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)
    fund_map = {f["id"]: f["name"] for f in funds}
    
    # Get all fund assignments
    all_assignments = await db.investor_fund_assignments.find({}, {"_id": 0, "investor_id": 1, "fund_id": 1}).to_list(10000)
    assignments_by_investor = {}
    for a in all_assignments:
        inv_id = a.get("investor_id")
        if inv_id not in assignments_by_investor:
            assignments_by_investor[inv_id] = []
        assignments_by_investor[inv_id].append(a.get("fund_id"))
    
    # Build restricted preview list
    restricted_investors = []
    for inv in all_investors:
        inv_id = inv.get("id")
        
        # Get assigned fund IDs (legacy + new assignments)
        assigned_fund_ids = []
        legacy_fund = inv.get("fund_id")
        if legacy_fund:
            assigned_fund_ids.append(legacy_fund)
        assigned_fund_ids.extend(assignments_by_investor.get(inv_id, []))
        assigned_fund_ids = list(set(assigned_fund_ids))  # Remove duplicates
        
        # Restricted preview fields only
        restricted_investors.append({
            "id": inv_id,
            "investor_name": inv.get("investor_name"),
            "job_title": inv.get("job_title"),  # Firm name equivalent
            "investor_type": inv.get("investor_type"),
            "country": inv.get("country"),
            "city": inv.get("city"),
            "assigned_funds_count": len(assigned_fund_ids),
            "assigned_fund_names": [fund_map.get(fid, "Unknown") for fid in assigned_fund_ids]
        })
    
    # Get filter options
    all_types = list(set(inv.get("investor_type") for inv in all_investors if inv.get("investor_type")))
    all_countries = list(set(inv.get("country") for inv in all_investors if inv.get("country")))
    
    return {
        "investors": restricted_investors,
        "total": len(restricted_investors),
        "filter_options": {
            "investor_types": sorted(all_types),
            "countries": sorted(all_countries)
        }
    }

@api_router.post("/investor-requests")
async def create_investor_request(
    request_data: InvestorAssignmentRequestCreate,
    user: dict = Depends(get_current_user)
):
    """Fund Manager requests an investor to be assigned to their fund"""
    investor_id = request_data.investor_id
    fund_id = request_data.requested_fund_id
    
    # Verify investor exists
    investor = await db.investor_profiles.find_one({"id": investor_id}, {"_id": 0})
    if not investor:
        raise HTTPException(status_code=404, detail="Investor not found")
    
    # Verify fund exists and user has access to it
    fund = await db.funds.find_one({"id": fund_id}, {"_id": 0})
    if not fund:
        raise HTTPException(status_code=404, detail="Fund not found")
    
    if user.get("role") != "ADMIN":
        if fund_id not in user.get("assigned_funds", []):
            raise HTTPException(status_code=403, detail="You don't have access to this fund")
    
    # Check if investor is already assigned to this fund
    existing_assignment = await db.investor_fund_assignments.find_one({
        "investor_id": investor_id,
        "fund_id": fund_id
    })
    legacy_assignment = investor.get("fund_id") == fund_id
    existing_pipeline = await db.investor_pipeline.find_one({
        "investor_id": investor_id,
        "fund_id": fund_id
    })
    
    if existing_assignment or (legacy_assignment and existing_pipeline):
        raise HTTPException(
            status_code=400, 
            detail=f"'{investor.get('investor_name')}' is already assigned to '{fund.get('name')}'"
        )
    
    # Check if there's already a pending request for this investor+fund
    existing_request = await db.investor_requests.find_one({
        "investor_id": investor_id,
        "requested_fund_id": fund_id,
        "status": "pending"
    })
    if existing_request:
        raise HTTPException(
            status_code=400, 
            detail=f"A request for '{investor.get('investor_name')}' to '{fund.get('name')}' is already pending"
        )
    
    # Create the request
    user_name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() or user.get('email')
    request = InvestorAssignmentRequest(
        investor_id=investor_id,
        requested_fund_id=fund_id,
        reason=request_data.reason,
        requested_by_user_id=user.get("id"),
        requested_by_name=user_name
    )
    
    await db.investor_requests.insert_one(request.model_dump())
    
    return {
        "message": f"Request submitted for '{investor.get('investor_name')}' to be assigned to '{fund.get('name')}'",
        "request_id": request.id,
        "investor_name": investor.get("investor_name"),
        "fund_name": fund.get("name"),
        "status": "pending"
    }

@api_router.get("/investor-requests")
async def get_my_investor_requests(user: dict = Depends(get_current_user)):
    """Get current user's investor requests"""
    # Fund Managers see their own requests
    if user.get("role") != "ADMIN":
        requests = await db.investor_requests.find(
            {"requested_by_user_id": user.get("id")},
            {"_id": 0}
        ).sort("created_at", -1).to_list(1000)
    else:
        # Admins see all requests
        requests = await db.investor_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Enrich with investor and fund names
    investor_ids = list(set(r.get("investor_id") for r in requests))
    fund_ids = list(set(r.get("requested_fund_id") for r in requests))
    
    investors = await db.investor_profiles.find(
        {"id": {"$in": investor_ids}},
        {"_id": 0, "id": 1, "investor_name": 1}
    ).to_list(1000)
    investor_map = {inv["id"]: inv["investor_name"] for inv in investors}
    
    funds = await db.funds.find(
        {"id": {"$in": fund_ids}},
        {"_id": 0, "id": 1, "name": 1}
    ).to_list(1000)
    fund_map = {f["id"]: f["name"] for f in funds}
    
    for req in requests:
        req["investor_name"] = investor_map.get(req.get("investor_id"), "Unknown")
        req["fund_name"] = fund_map.get(req.get("requested_fund_id"), "Unknown")
    
    return {
        "requests": requests,
        "total": len(requests)
    }

@api_router.get("/admin/investor-requests")
async def get_all_investor_requests(
    status: Optional[str] = None,
    admin: dict = Depends(require_admin)
):
    """Get all investor assignment requests (Admin only)"""
    query = {}
    if status and status != "all":
        query["status"] = status
    
    requests = await db.investor_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Enrich with investor and fund names
    investor_ids = list(set(r.get("investor_id") for r in requests))
    fund_ids = list(set(r.get("requested_fund_id") for r in requests))
    
    investors = await db.investor_profiles.find(
        {"id": {"$in": investor_ids}},
        {"_id": 0, "id": 1, "investor_name": 1, "investor_type": 1}
    ).to_list(1000)
    investor_map = {inv["id"]: inv for inv in investors}
    
    funds = await db.funds.find(
        {"id": {"$in": fund_ids}},
        {"_id": 0, "id": 1, "name": 1}
    ).to_list(1000)
    fund_map = {f["id"]: f["name"] for f in funds}
    
    for req in requests:
        inv_data = investor_map.get(req.get("investor_id"), {})
        req["investor_name"] = inv_data.get("investor_name", "Unknown")
        req["investor_type"] = inv_data.get("investor_type", "Unknown")
        req["fund_name"] = fund_map.get(req.get("requested_fund_id"), "Unknown")
    
    # Count by status
    pending_count = len([r for r in requests if r.get("status") == "pending"])
    approved_count = len([r for r in requests if r.get("status") == "approved"])
    denied_count = len([r for r in requests if r.get("status") == "denied"])
    
    return {
        "requests": requests,
        "total": len(requests),
        "counts": {
            "pending": pending_count,
            "approved": approved_count,
            "denied": denied_count
        }
    }

@api_router.put("/admin/investor-requests/{request_id}/approve")
async def approve_investor_request(
    request_id: str,
    assigned_manager_id: Optional[str] = None,
    initial_stage_id: Optional[str] = None,
    admin: dict = Depends(require_admin)
):
    """Approve an investor assignment request (Admin only)"""
    # Find the request
    request = await db.investor_requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if request.get("status") != "pending":
        raise HTTPException(status_code=400, detail=f"Request is already {request.get('status')}")
    
    investor_id = request.get("investor_id")
    fund_id = request.get("requested_fund_id")
    
    # Verify investor still exists
    investor = await db.investor_profiles.find_one({"id": investor_id}, {"_id": 0})
    if not investor:
        raise HTTPException(status_code=404, detail="Investor no longer exists")
    
    # Verify fund still exists
    fund = await db.funds.find_one({"id": fund_id}, {"_id": 0})
    if not fund:
        raise HTTPException(status_code=404, detail="Fund no longer exists")
    
    # Double-check not already assigned
    existing_assignment = await db.investor_fund_assignments.find_one({
        "investor_id": investor_id,
        "fund_id": fund_id
    })
    legacy_assignment = investor.get("fund_id") == fund_id
    existing_pipeline = await db.investor_pipeline.find_one({
        "investor_id": investor_id,
        "fund_id": fund_id
    })
    
    if existing_assignment or (legacy_assignment and existing_pipeline):
        # Update request as already assigned (approved by system)
        await db.investor_requests.update_one(
            {"id": request_id},
            {"$set": {
                "status": "approved",
                "admin_response_by": admin.get("id"),
                "admin_response_by_name": f"{admin.get('first_name', '')} {admin.get('last_name', '')}".strip(),
                "resolved_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {
            "message": f"'{investor.get('investor_name')}' was already assigned to '{fund.get('name')}'",
            "status": "approved"
        }
    
    # Default assigned manager to the requester if not specified
    if not assigned_manager_id:
        assigned_manager_id = request.get("requested_by_user_id")
    
    # Get default stage if not specified
    if not initial_stage_id:
        default_stage = await db.pipeline_stages.find_one({
            "fund_id": fund_id,
            "name": "Investors"
        }, {"_id": 0})
        if default_stage:
            initial_stage_id = default_stage.get("id")
    
    # Create the assignment (same logic as admin assign)
    admin_name = f"{admin.get('first_name', '')} {admin.get('last_name', '')}".strip() or admin.get('email')
    assignment = InvestorFundAssignment(
        investor_id=investor_id,
        fund_id=fund_id,
        assigned_manager_id=assigned_manager_id,
        initial_stage_id=initial_stage_id,
        assigned_by=admin.get("id"),
        assigned_by_name=admin_name
    )
    
    await db.investor_fund_assignments.insert_one(assignment.model_dump())
    
    # Create pipeline entry
    if initial_stage_id:
        max_pos_result = await db.investor_pipeline.find_one(
            {"fund_id": fund_id, "stage_id": initial_stage_id},
            sort=[("position", -1)]
        )
        new_position = (max_pos_result.get("position", -1) if max_pos_result else -1) + 1
        
        pipeline_entry = InvestorPipeline(
            fund_id=fund_id,
            investor_id=investor_id,
            stage_id=initial_stage_id,
            position=new_position
        )
        await db.investor_pipeline.insert_one(pipeline_entry.model_dump())
    
    # Update request status
    await db.investor_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": "approved",
            "admin_response_by": admin.get("id"),
            "admin_response_by_name": admin_name,
            "resolved_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "message": f"Request approved. '{investor.get('investor_name')}' is now assigned to '{fund.get('name')}'",
        "status": "approved",
        "assignment_id": assignment.id,
        "investor_name": investor.get("investor_name"),
        "fund_name": fund.get("name"),
        "assigned_manager_id": assigned_manager_id
    }

@api_router.put("/admin/investor-requests/{request_id}/deny")
async def deny_investor_request(
    request_id: str,
    denial_reason: Optional[str] = None,
    admin: dict = Depends(require_admin)
):
    """Deny an investor assignment request (Admin only)"""
    # Find the request
    request = await db.investor_requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if request.get("status") != "pending":
        raise HTTPException(status_code=400, detail=f"Request is already {request.get('status')}")
    
    admin_name = f"{admin.get('first_name', '')} {admin.get('last_name', '')}".strip() or admin.get('email')
    
    # Update request status
    await db.investor_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": "denied",
            "admin_response_by": admin.get("id"),
            "admin_response_by_name": admin_name,
            "denial_reason": denial_reason or "Request denied by admin",
            "resolved_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Get names for response
    investor = await db.investor_profiles.find_one({"id": request.get("investor_id")}, {"_id": 0, "investor_name": 1})
    fund = await db.funds.find_one({"id": request.get("requested_fund_id")}, {"_id": 0, "name": 1})
    
    return {
        "message": f"Request denied for '{investor.get('investor_name', 'Unknown')}' to '{fund.get('name', 'Unknown')}'",
        "status": "denied",
        "denial_reason": denial_reason or "Request denied by admin"
    }

# ============== FUND ROUTES ==============

@api_router.get("/funds", response_model=List[Fund])
async def get_funds(user: dict = Depends(get_current_user)):
    """Get all funds (Admin sees all, Fund Manager sees only assigned funds)"""
    if user.get("role") == "ADMIN":
        # Admin sees all funds
        funds = await db.funds.find({}, {"_id": 0}).to_list(1000)
    else:
        # Fund Manager sees only assigned funds
        assigned_fund_ids = user.get("assigned_funds", [])
        if not assigned_fund_ids:
            return []
        funds = await db.funds.find({"id": {"$in": assigned_fund_ids}}, {"_id": 0}).to_list(1000)
    return [Fund(**f) for f in funds]

@api_router.get("/funds/{fund_id}", response_model=Fund)
async def get_fund(fund_id: str, user: dict = Depends(get_current_user)):
    """Get fund by ID (Fund Manager can only access assigned funds)"""
    fund = await db.funds.find_one({"id": fund_id}, {"_id": 0})
    if not fund:
        raise HTTPException(status_code=404, detail="Fund not found")
    
    # Check access for non-admin users
    if user.get("role") != "ADMIN":
        if fund_id not in user.get("assigned_funds", []):
            raise HTTPException(status_code=403, detail="You don't have access to this fund")
    
    return Fund(**fund)

@api_router.post("/funds", response_model=Fund)
async def create_fund(fund_data: FundCreate, admin: dict = Depends(require_admin)):
    """Create a new fund (admin only)"""
    fund = Fund(**fund_data.model_dump())
    await db.funds.insert_one(fund.model_dump())
    return fund

@api_router.put("/funds/{fund_id}", response_model=Fund)
async def update_fund(fund_id: str, fund_data: FundUpdate, admin: dict = Depends(require_admin)):
    """Update fund (admin only)"""
    fund = await db.funds.find_one({"id": fund_id}, {"_id": 0})
    if not fund:
        raise HTTPException(status_code=404, detail="Fund not found")
    
    update_dict = {k: v for k, v in fund_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.funds.update_one({"id": fund_id}, {"$set": update_dict})
    
    updated_fund = await db.funds.find_one({"id": fund_id}, {"_id": 0})
    return Fund(**updated_fund)

@api_router.delete("/funds/{fund_id}")
async def delete_fund(fund_id: str, admin: dict = Depends(require_admin)):
    """Delete fund (admin only)"""
    result = await db.funds.delete_one({"id": fund_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Fund not found")
    return {"message": "Fund deleted successfully"}

# ============== FUND ASSIGNMENT ROUTES ==============

@api_router.post("/assignments")
async def assign_funds_to_user(assignment: FundAssignment, admin: dict = Depends(require_admin)):
    """Assign funds to a user (admin only)"""
    user = await db.users.find_one({"id": assignment.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one(
        {"id": assignment.user_id},
        {"$set": {
            "assigned_funds": assignment.fund_ids,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Funds assigned successfully", "fund_ids": assignment.fund_ids}

@api_router.get("/assignments/{user_id}")
async def get_user_fund_assignments(user_id: str, admin: dict = Depends(require_admin)):
    """Get fund assignments for a user (admin only)"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    fund_ids = user.get("assigned_funds", [])
    funds = await db.funds.find({"id": {"$in": fund_ids}}, {"_id": 0}).to_list(100)
    
    return {"user_id": user_id, "funds": funds}

# ============== INVESTOR ROUTES ==============

@api_router.get("/investors", response_model=List[Investor])
async def get_investors(user: dict = Depends(get_current_user)):
    """Get all investors"""
    investors = await db.investors.find({}, {"_id": 0}).to_list(1000)
    return [Investor(**i) for i in investors]

@api_router.post("/investors", response_model=Investor)
async def create_investor(investor_data: InvestorCreate, admin: dict = Depends(require_admin)):
    """Create a new investor (admin only)"""
    investor = Investor(**investor_data.model_dump())
    await db.investors.insert_one(investor.model_dump())
    return investor

@api_router.put("/investors/{investor_id}", response_model=Investor)
async def update_investor(investor_id: str, investor_data: dict, admin: dict = Depends(require_admin)):
    """Update investor (admin only)"""
    investor = await db.investors.find_one({"id": investor_id}, {"_id": 0})
    if not investor:
        raise HTTPException(status_code=404, detail="Investor not found")
    
    update_dict = {k: v for k, v in investor_data.items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.investors.update_one({"id": investor_id}, {"$set": update_dict})
    
    updated = await db.investors.find_one({"id": investor_id}, {"_id": 0})
    return Investor(**updated)

@api_router.delete("/investors/{investor_id}")
async def delete_investor(investor_id: str, admin: dict = Depends(require_admin)):
    """Delete investor (admin only)"""
    result = await db.investors.delete_one({"id": investor_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Investor not found")
    return {"message": "Investor deleted successfully"}

# ============== INVESTOR PROFILE ROUTES (Fund Manager Access) ==============

@api_router.get("/investor-profiles/fund/{fund_id}", response_model=List[InvestorIdentity])
async def get_investor_profiles_by_fund(fund_id: str, user: dict = Depends(get_current_user)):
    """Get investor profiles for a specific fund (Fund Manager can access assigned funds)"""
    # Check if user has access to this fund
    if user.get("role") != "ADMIN":
        if fund_id not in user.get("assigned_funds", []):
            raise HTTPException(status_code=403, detail="You don't have access to this fund")
    
    profiles = await db.investor_profiles.find({"fund_id": fund_id}, {"_id": 0}).to_list(1000)
    return [InvestorIdentity(**p) for p in profiles]

@api_router.get("/investor-profiles/{profile_id}", response_model=InvestorIdentity)
async def get_investor_profile(profile_id: str, user: dict = Depends(get_current_user)):
    """Get a specific investor profile"""
    profile = await db.investor_profiles.find_one({"id": profile_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Investor profile not found")
    
    # Check if user has access to this fund
    if user.get("role") != "ADMIN":
        if profile.get("fund_id") not in user.get("assigned_funds", []):
            raise HTTPException(status_code=403, detail="You don't have access to this investor")
    
    return InvestorIdentity(**profile)

@api_router.post("/investor-profiles", response_model=InvestorIdentity)
async def create_investor_profile(profile_data: InvestorIdentityCreate, user: dict = Depends(get_current_user)):
    """Create a new investor profile (Fund Manager can create for assigned funds)"""
    # Check if user has access to this fund
    if user.get("role") != "ADMIN":
        if profile_data.fund_id not in user.get("assigned_funds", []):
            raise HTTPException(status_code=403, detail="You don't have access to this fund")
    
    # Check for duplicate investors within the same fund
    existing = await db.investor_profiles.find_one({
        "fund_id": profile_data.fund_id,
        "investor_name": {"$regex": f"^{profile_data.investor_name}$", "$options": "i"}
    }, {"_id": 0})
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"An investor named '{profile_data.investor_name}' already exists in this fund. Please use a different name or update the existing investor."
        )
    
    profile = InvestorIdentity(
        **profile_data.model_dump(),
        created_by=user.get("id")
    )
    await db.investor_profiles.insert_one(profile.model_dump())
    return profile

@api_router.put("/investor-profiles/{profile_id}", response_model=InvestorIdentity)
async def update_investor_profile(profile_id: str, profile_data: InvestorIdentityUpdate, user: dict = Depends(get_current_user)):
    """Update an investor profile (Fund Manager can update for assigned funds)"""
    profile = await db.investor_profiles.find_one({"id": profile_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Investor profile not found")
    
    # Check if user has access to this fund
    if user.get("role") != "ADMIN":
        if profile.get("fund_id") not in user.get("assigned_funds", []):
            raise HTTPException(status_code=403, detail="You don't have access to this investor")
    
    update_dict = {k: v for k, v in profile_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.investor_profiles.update_one({"id": profile_id}, {"$set": update_dict})
    
    updated = await db.investor_profiles.find_one({"id": profile_id}, {"_id": 0})
    return InvestorIdentity(**updated)

@api_router.delete("/investor-profiles/{profile_id}")
async def delete_investor_profile(profile_id: str, user: dict = Depends(get_current_user)):
    """Delete an investor profile (Fund Manager can delete for assigned funds)"""
    profile = await db.investor_profiles.find_one({"id": profile_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Investor profile not found")
    
    # Check if user has access to this fund
    if user.get("role") != "ADMIN":
        if profile.get("fund_id") not in user.get("assigned_funds", []):
            raise HTTPException(status_code=403, detail="You don't have access to this investor")
    
    await db.investor_profiles.delete_one({"id": profile_id})
    return {"message": "Investor profile deleted successfully"}

@api_router.get("/my-funds")
async def get_my_assigned_funds(user: dict = Depends(get_current_user)):
    """Get funds assigned to current user"""
    fund_ids = user.get("assigned_funds", [])
    if not fund_ids:
        return []
    
    funds = await db.funds.find({"id": {"$in": fund_ids}}, {"_id": 0}).to_list(100)
    return [Fund(**f) for f in funds]

@api_router.get("/all-funds-spvs")
async def get_all_funds_spvs(user: dict = Depends(get_current_user)):
    """Get all funds/SPVs for the ALKNZ Fund/SPV dropdown (historical investments)"""
    funds = await db.funds.find({}, {"_id": 0, "id": 1, "name": 1, "fund_type": 1}).to_list(1000)
    return funds

@api_router.get("/team-members")
async def get_team_members(office_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Get team members (Admins + Fund Managers) for ALKNZ Point of Contact dropdown.
    If office_id is provided, filter by that office. Otherwise return all active team members."""
    query = {"status": "ACTIVE", "role": {"$in": ["ADMIN", "FUND_MANAGER"]}}
    
    # Scope by office if provided
    if office_id:
        query["office_id"] = office_id
    
    users = await db.users.find(query, {
        "_id": 0, 
        "id": 1, 
        "first_name": 1, 
        "last_name": 1, 
        "email": 1, 
        "role": 1,
        "office_id": 1
    }).to_list(1000)
    
    return users

@api_router.get("/investor-profiles/{profile_id}/check-history")
async def check_investor_history(profile_id: str, user: dict = Depends(get_current_user)):
    """Check if investor has historical investments with ALKNZ (from pipeline data)"""
    profile = await db.investor_profiles.find_one({"id": profile_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Investor profile not found")
    
    # Check if user has access
    if user.get("role") != "ADMIN":
        if profile.get("fund_id") not in user.get("assigned_funds", []):
            raise HTTPException(status_code=403, detail="You don't have access to this investor")
    
    # Look for any committed/funded pipeline entries for this investor
    # This would be populated from the fundraising platform
    investor_name = profile.get("investor_name", "").lower()
    
    # Search in pipeline for matching investor (by name similarity)
    pipeline_entries = await db.pipeline.find({
        "stage": {"$in": ["Committed", "Funded"]}
    }, {"_id": 0}).to_list(1000)
    
    # Also check legacy investors collection
    legacy_investors = await db.investors.find({}, {"_id": 0}).to_list(1000)
    
    # Find matching historical investments
    historical_funds = []
    for entry in pipeline_entries:
        # Check if this pipeline entry's investor matches
        investor_id = entry.get("investor_id")
        if investor_id:
            legacy = next((inv for inv in legacy_investors if inv.get("id") == investor_id), None)
            if legacy and legacy.get("investor_name", "").lower() == investor_name:
                historical_funds.append(entry.get("fund_id"))
    
    has_history = len(historical_funds) > 0
    
    return {
        "has_invested_before": has_history,
        "historical_fund_ids": list(set(historical_funds))
    }

# ============== PIPELINE ROUTES ==============

@api_router.get("/pipeline", response_model=List[Pipeline])
async def get_pipeline(user: dict = Depends(get_current_user)):
    """Get all pipeline items"""
    pipeline = await db.pipeline.find({}, {"_id": 0}).to_list(1000)
    return [Pipeline(**p) for p in pipeline]

@api_router.post("/pipeline", response_model=Pipeline)
async def create_pipeline(pipeline_data: PipelineCreate, admin: dict = Depends(require_admin)):
    """Create pipeline item (admin only)"""
    pipeline = Pipeline(**pipeline_data.model_dump())
    await db.pipeline.insert_one(pipeline.model_dump())
    return pipeline

@api_router.put("/pipeline/{pipeline_id}", response_model=Pipeline)
async def update_pipeline(pipeline_id: str, pipeline_data: dict, admin: dict = Depends(require_admin)):
    """Update pipeline item (admin only)"""
    item = await db.pipeline.find_one({"id": pipeline_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Pipeline item not found")
    
    update_dict = {k: v for k, v in pipeline_data.items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.pipeline.update_one({"id": pipeline_id}, {"$set": update_dict})
    
    updated = await db.pipeline.find_one({"id": pipeline_id}, {"_id": 0})
    return Pipeline(**updated)

# ============== INTERACTION ROUTES ==============

@api_router.get("/interactions", response_model=List[Interaction])
async def get_interactions(user: dict = Depends(get_current_user)):
    """Get all interactions"""
    interactions = await db.interactions.find({}, {"_id": 0}).to_list(1000)
    return [Interaction(**i) for i in interactions]

@api_router.post("/interactions", response_model=Interaction)
async def create_interaction(interaction_data: InteractionCreate, user: dict = Depends(get_current_user)):
    """Create interaction"""
    interaction = Interaction(**interaction_data.model_dump())
    await db.interactions.insert_one(interaction.model_dump())
    return interaction

# ============== OFFICE ROUTES ==============

@api_router.get("/offices", response_model=List[Office])
async def get_offices(user: dict = Depends(get_current_user)):
    """Get all offices"""
    offices = await db.offices.find({}, {"_id": 0}).to_list(100)
    return [Office(**o) for o in offices]

@api_router.post("/offices", response_model=Office)
async def create_office(office_data: OfficeBase, admin: dict = Depends(require_admin)):
    """Create office (admin only)"""
    office = Office(**office_data.model_dump())
    await db.offices.insert_one(office.model_dump())
    return office

# ============== DASHBOARD STATS ==============

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    """Get dashboard statistics including capital metrics aggregated from all funds"""
    
    # Basic counts
    users_count = await db.users.count_documents({})
    funds_count = await db.funds.count_documents({})
    investors_count = await db.investor_profiles.count_documents({})
    active_users = await db.users.count_documents({"status": "ACTIVE"})
    active_funds = await db.funds.count_documents({"status": "Active"})
    
    # Count active fund managers
    active_fund_managers = await db.users.count_documents({
        "role": "FUND_MANAGER", 
        "status": "ACTIVE"
    })
    
    # Aggregate capital metrics from all funds using the same logic as capital-overview
    total_deployed_capital = 0.0
    total_potential_capital = 0.0
    capital_in_final_stages = 0.0
    
    # Get all funds
    all_funds = await db.funds.find({}, {"_id": 0}).to_list(100)
    
    # Stage name classifications
    deployed_stage_names = ["Money Transfer", "Transfer Date"]
    final_stage_names = ["Signing Contract", "Signing Subscription", "Letter for Capital Call"]
    excluded_stage_names = ["declined"]  # Excluded from potential
    
    for fund in all_funds:
        fund_id = fund.get("id")
        if not fund_id:
            continue
        
        # Get all investor profiles for this fund
        profiles = await db.investor_profiles.find({"fund_id": fund_id}, {"_id": 0}).to_list(1000)
        profiles_map = {p["id"]: p for p in profiles}
        
        # Get pipeline entries for this fund (this is the correct collection!)
        pipeline_entries = await db.investor_pipeline.find({"fund_id": fund_id}, {"_id": 0}).to_list(1000)
        
        # Get pipeline stages for this fund
        stages = await db.pipeline_stages.find({"fund_id": fund_id}, {"_id": 0}).to_list(100)
        stages_map = {s["id"]: s for s in stages}
        
        # Categorize stage IDs by type
        deployed_stage_ids = set()
        final_stage_ids = set()
        excluded_stage_ids = set()
        potential_stage_ids = set()
        
        for stage in stages:
            stage_name = stage.get("name", "")
            stage_id = stage.get("id")
            if stage_name in deployed_stage_names:
                deployed_stage_ids.add(stage_id)
            elif stage_name in final_stage_names:
                final_stage_ids.add(stage_id)
            elif stage_name.lower() in excluded_stage_names:
                excluded_stage_ids.add(stage_id)
            else:
                potential_stage_ids.add(stage_id)
        
        # Process each pipeline entry
        for pipeline_entry in pipeline_entries:
            stage_id = pipeline_entry.get("stage_id")
            investor_id = pipeline_entry.get("investor_id")
            profile = profiles_map.get(investor_id)
            
            if not profile:
                continue
            
            # Get amounts from profile
            investment_size = profile.get("investment_size")
            expected_ticket = profile.get("expected_ticket_amount")
            
            # Convert to float safely
            try:
                investment_size = float(investment_size) if investment_size else 0.0
            except (ValueError, TypeError):
                investment_size = 0.0
            
            try:
                expected_ticket = float(expected_ticket) if expected_ticket else 0.0
            except (ValueError, TypeError):
                expected_ticket = 0.0
            
            # Categorize based on stage
            if stage_id in deployed_stage_ids:
                # Deployed capital - use investment_size
                if investment_size > 0:
                    total_deployed_capital += investment_size
            elif stage_id in final_stage_ids:
                # Capital in final stages - use expected_ticket or investment_size
                if expected_ticket > 0:
                    capital_in_final_stages += expected_ticket
                elif investment_size > 0:
                    capital_in_final_stages += investment_size
            elif stage_id in potential_stage_ids:
                # Potential capital - use expected_ticket or investment_size
                if expected_ticket > 0:
                    total_potential_capital += expected_ticket
                elif investment_size > 0:
                    total_potential_capital += investment_size
            # Excluded stages are not counted
    
    return {
        "total_users": users_count,
        "total_funds": funds_count,
        "total_investors": investors_count,
        "active_users": active_users,
        "active_funds": active_funds,
        "active_fund_managers": active_fund_managers,
        "total_deployed_capital": round(total_deployed_capital, 2),
        "total_potential_capital": round(total_potential_capital, 2),
        "capital_in_final_stages": round(capital_in_final_stages, 2)
    }


@api_router.get("/dashboard/fund-performance")
async def get_fund_performance(user: dict = Depends(get_current_user)):
    """Get detailed fund performance snapshot for the admin dashboard"""
    
    # Get all funds
    all_funds = await db.funds.find({}, {"_id": 0}).to_list(100)
    
    # Stage name classifications
    deployed_stage_names = ["Money Transfer", "Transfer Date"]
    final_stage_names = ["Signing Contract", "Signing Subscription", "Letter for Capital Call"]
    excluded_stage_names = ["declined"]
    
    fund_performances = []
    
    for fund in all_funds:
        fund_id = fund.get("id")
        if not fund_id:
            continue
        
        fund_name = fund.get("name", "Unknown Fund")
        target_capital = fund.get("target_raise") or 0
        
        # Get all investor profiles for this fund
        profiles = await db.investor_profiles.find({"fund_id": fund_id}, {"_id": 0}).to_list(1000)
        profiles_map = {p["id"]: p for p in profiles}
        
        # Get pipeline entries for this fund
        pipeline_entries = await db.investor_pipeline.find({"fund_id": fund_id}, {"_id": 0}).to_list(1000)
        
        # Get pipeline stages for this fund
        stages = await db.pipeline_stages.find({"fund_id": fund_id}, {"_id": 0}).to_list(100)
        stages_map = {s["id"]: s for s in stages}
        
        # Categorize stage IDs by type
        deployed_stage_ids = set()
        final_stage_ids = set()
        excluded_stage_ids = set()
        
        for stage in stages:
            stage_name = stage.get("name", "")
            stage_id = stage.get("id")
            if stage_name in deployed_stage_names:
                deployed_stage_ids.add(stage_id)
            elif stage_name in final_stage_names:
                final_stage_ids.add(stage_id)
            elif stage_name.lower() in excluded_stage_names:
                excluded_stage_ids.add(stage_id)
        
        # Calculate metrics
        deployed_capital = 0.0
        capital_in_final_stages = 0.0
        active_investors = 0
        investment_sizes = []
        last_close_date = None
        investors_in_deployed = 0
        investors_in_final = 0
        largest_investor_amount = 0.0
        
        for pipeline_entry in pipeline_entries:
            stage_id = pipeline_entry.get("stage_id")
            investor_id = pipeline_entry.get("investor_id")
            profile = profiles_map.get(investor_id)
            
            if not profile:
                continue
            
            active_investors += 1
            
            # Get amounts from profile
            investment_size = profile.get("investment_size")
            expected_ticket = profile.get("expected_ticket_amount")
            
            # Convert to float safely
            try:
                investment_size = float(investment_size) if investment_size else 0.0
            except (ValueError, TypeError):
                investment_size = 0.0
            
            try:
                expected_ticket = float(expected_ticket) if expected_ticket else 0.0
            except (ValueError, TypeError):
                expected_ticket = 0.0
            
            # Categorize based on stage
            if stage_id in deployed_stage_ids:
                investors_in_deployed += 1
                if investment_size > 0:
                    deployed_capital += investment_size
                    investment_sizes.append(investment_size)
                    if investment_size > largest_investor_amount:
                        largest_investor_amount = investment_size
                    
                    # Track last close date
                    stage_entered = pipeline_entry.get("stage_entered_at")
                    if stage_entered:
                        try:
                            entered_dt = datetime.fromisoformat(stage_entered.replace('Z', '+00:00'))
                            if last_close_date is None or entered_dt > last_close_date:
                                last_close_date = entered_dt
                        except:
                            pass
                            
            elif stage_id in final_stage_ids:
                investors_in_final += 1
                if expected_ticket > 0:
                    capital_in_final_stages += expected_ticket
                elif investment_size > 0:
                    capital_in_final_stages += investment_size
        
        # Calculate derived metrics
        percent_of_goal = (deployed_capital / target_capital * 100) if target_capital > 0 else 0
        avg_investment_size = sum(investment_sizes) / len(investment_sizes) if investment_sizes else 0
        
        # Calculate time since last close
        days_since_last_close = None
        if last_close_date:
            delta = datetime.now(timezone.utc) - last_close_date
            days_since_last_close = delta.days
        
        # Calculate alerts
        alerts = []
        
        # Alert 1: Fund behind target (less than 50% and has a target)
        if target_capital > 0 and percent_of_goal < 50:
            alerts.append({
                "type": "behind_target",
                "severity": "warning",
                "message": f"Only {percent_of_goal:.0f}% of target achieved"
            })
        
        # Alert 2: Stalled final-stage capital (investors in final stages for over 30 days with no movement)
        if capital_in_final_stages > 0 and days_since_last_close is not None and days_since_last_close > 30:
            alerts.append({
                "type": "stalled_final_stage",
                "severity": "warning", 
                "message": f"No closes in {days_since_last_close} days with ${capital_in_final_stages:,.0f} in final stages"
            })
        elif capital_in_final_stages > 0 and days_since_last_close is None:
            alerts.append({
                "type": "stalled_final_stage",
                "severity": "info",
                "message": f"${capital_in_final_stages:,.0f} in final stages awaiting first close"
            })
        
        # Alert 3: Investor concentration risk (single investor > 40% of deployed capital)
        if deployed_capital > 0 and largest_investor_amount > 0:
            concentration_pct = (largest_investor_amount / deployed_capital) * 100
            if concentration_pct > 40:
                alerts.append({
                    "type": "concentration_risk",
                    "severity": "critical" if concentration_pct > 60 else "warning",
                    "message": f"Top investor represents {concentration_pct:.0f}% of deployed capital"
                })
        
        fund_performances.append({
            "fund_id": fund_id,
            "fund_name": fund_name,
            "target_capital": target_capital,
            "deployed_capital": round(deployed_capital, 2),
            "percent_of_goal": round(percent_of_goal, 1),
            "capital_in_final_stages": round(capital_in_final_stages, 2),
            "active_investors": active_investors,
            "investors_in_deployed": investors_in_deployed,
            "investors_in_final": investors_in_final,
            "average_investment_size": round(avg_investment_size, 2),
            "days_since_last_close": days_since_last_close,
            "alerts": alerts,
            "status": fund.get("status", "Unknown")
        })
    
    # Sort by deployed capital descending
    fund_performances.sort(key=lambda x: x["deployed_capital"], reverse=True)
    
    return {
        "funds": fund_performances,
        "generated_at": datetime.now(timezone.utc).isoformat()
    }


@api_router.get("/dashboard/investor-intelligence")
async def get_investor_intelligence(user: dict = Depends(get_current_user)):
    """Get aggregated investor intelligence insights for admin dashboard"""
    
    # Get all investor profiles
    all_investors = await db.investor_profiles.find({}, {"_id": 0}).to_list(10000)
    
    # Get all pipeline entries to determine stage distribution
    all_pipeline = await db.investor_pipeline.find({}, {"_id": 0}).to_list(10000)
    
    # Get all pipeline stages across all funds
    all_stages = await db.pipeline_stages.find({}, {"_id": 0}).to_list(1000)
    stages_map = {s["id"]: s.get("name", "Unknown") for s in all_stages}
    
    # 1. Investor Geography (by country)
    geography = {}
    for inv in all_investors:
        country = inv.get("country") or "Unknown"
        if country not in geography:
            geography[country] = {"count": 0, "capital": 0}
        geography[country]["count"] += 1
        ticket = inv.get("expected_ticket_amount") or inv.get("investment_size") or 0
        try:
            ticket = float(ticket)
        except:
            ticket = 0
        geography[country]["capital"] += ticket
    
    # Sort by count descending, take top 10
    geography_list = [
        {"country": k, "count": v["count"], "capital": round(v["capital"], 2)}
        for k, v in sorted(geography.items(), key=lambda x: x[1]["count"], reverse=True)
    ][:10]
    
    # 2. Investor Type Distribution
    investor_types = {}
    ticket_by_type = {}
    for inv in all_investors:
        inv_type = inv.get("investor_type") or "Unknown"
        if inv_type not in investor_types:
            investor_types[inv_type] = 0
            ticket_by_type[inv_type] = []
        investor_types[inv_type] += 1
        
        ticket = inv.get("expected_ticket_amount") or inv.get("investment_size") or 0
        try:
            ticket = float(ticket)
            if ticket > 0:
                ticket_by_type[inv_type].append(ticket)
        except:
            pass
    
    type_distribution = [
        {"type": k, "count": v, "percentage": round(v / len(all_investors) * 100, 1) if all_investors else 0}
        for k, v in sorted(investor_types.items(), key=lambda x: x[1], reverse=True)
    ]
    
    # 3. Average Ticket Size by Investor Type
    avg_ticket_by_type = [
        {
            "type": inv_type,
            "average_ticket": round(sum(tickets) / len(tickets), 2) if tickets else 0,
            "count": len(tickets)
        }
        for inv_type, tickets in sorted(ticket_by_type.items(), key=lambda x: sum(x[1]) / len(x[1]) if x[1] else 0, reverse=True)
        if tickets  # Only include types with ticket data
    ]
    
    # 4. Fit Score Distribution (using relationship_strength as proxy if no dedicated fit score)
    # Create distribution buckets: Excellent, Good, Fair, Poor, Unknown
    fit_scores = {"Excellent": 0, "Good": 0, "Fair": 0, "Poor": 0, "Unknown": 0}
    for inv in all_investors:
        strength = inv.get("relationship_strength", "unknown")
        if strength == "direct":
            fit_scores["Excellent"] += 1
        elif strength == "warm":
            fit_scores["Good"] += 1
        elif strength == "cold":
            fit_scores["Fair"] += 1
        else:
            fit_scores["Unknown"] += 1
    
    fit_distribution = [
        {"score": k, "count": v, "percentage": round(v / len(all_investors) * 100, 1) if all_investors else 0}
        for k, v in fit_scores.items()
    ]
    
    # 5. Investor Stage Distribution
    stage_counts = {}
    for pipeline in all_pipeline:
        stage_id = pipeline.get("stage_id")
        stage_name = stages_map.get(stage_id, "Unknown")
        if stage_name not in stage_counts:
            stage_counts[stage_name] = 0
        stage_counts[stage_name] += 1
    
    # Define stage order
    stage_order = [
        "Investors", "Intro Email", "Opportunity Email", "Phone Call", 
        "First Meeting", "Second Meeting", "Follow Up Email",
        "Signing Contract", "Signing Subscription", "Letter for Capital Call",
        "Money Transfer", "Transfer Date", "Declined"
    ]
    
    stage_distribution = []
    for stage_name in stage_order:
        if stage_name in stage_counts:
            stage_distribution.append({
                "stage": stage_name,
                "count": stage_counts[stage_name],
                "percentage": round(stage_counts[stage_name] / len(all_pipeline) * 100, 1) if all_pipeline else 0
            })
    
    # Add any stages not in the predefined order
    for stage_name, count in stage_counts.items():
        if stage_name not in stage_order:
            stage_distribution.append({
                "stage": stage_name,
                "count": count,
                "percentage": round(count / len(all_pipeline) * 100, 1) if all_pipeline else 0
            })
    
    return {
        "total_investors": len(all_investors),
        "geography": geography_list,
        "investor_types": type_distribution,
        "avg_ticket_by_type": avg_ticket_by_type,
        "fit_score_distribution": fit_distribution,
        "stage_distribution": stage_distribution,
        "generated_at": datetime.now(timezone.utc).isoformat()
    }


@api_router.get("/dashboard/execution-health")
async def get_execution_health(user: dict = Depends(get_current_user)):
    """Get execution health and bottleneck metrics for admin dashboard"""
    
    now = datetime.now(timezone.utc)
    
    # Get all fund managers
    fund_managers = await db.users.find({"role": "FUND_MANAGER", "status": "ACTIVE"}, {"_id": 0}).to_list(100)
    fm_map = {fm["id"]: f"{fm.get('first_name', '')} {fm.get('last_name', '')}".strip() for fm in fund_managers}
    
    # Get all funds
    all_funds = await db.funds.find({}, {"_id": 0}).to_list(100)
    
    # Get all user tasks
    all_tasks = await db.user_tasks.find({}, {"_id": 0}).to_list(10000)
    
    # Get task due dates
    all_due_dates = await db.task_due_dates.find({}, {"_id": 0}).to_list(10000)
    due_dates_map = {t["task_id"]: t.get("due_date") for t in all_due_dates}
    
    # Get all call logs (for response time and meetings)
    all_call_logs = await db.call_logs.find({}, {"_id": 0}).to_list(10000)
    
    # 1. Tasks per Fund Manager
    tasks_by_fm = {}
    for fm_id, fm_name in fm_map.items():
        tasks_by_fm[fm_id] = {"name": fm_name, "total": 0, "open": 0, "completed": 0, "overdue": 0}
    
    total_overdue = 0
    overdue_by_priority = {"high": 0, "medium": 0, "low": 0}
    
    for task in all_tasks:
        created_by = task.get("created_by")
        if created_by in tasks_by_fm:
            tasks_by_fm[created_by]["total"] += 1
            if task.get("status") == "completed":
                tasks_by_fm[created_by]["completed"] += 1
            else:
                tasks_by_fm[created_by]["open"] += 1
                
                # Check if overdue
                due_date = task.get("due_date") or due_dates_map.get(task.get("id"))
                if due_date:
                    try:
                        due_dt = datetime.strptime(due_date[:10], '%Y-%m-%d').replace(tzinfo=timezone.utc)
                        if now > due_dt:
                            tasks_by_fm[created_by]["overdue"] += 1
                            total_overdue += 1
                            priority = task.get("priority", "medium").lower()
                            if priority in overdue_by_priority:
                                overdue_by_priority[priority] += 1
                    except:
                        pass
    
    tasks_per_fm = [
        {"fund_manager": v["name"], "total": v["total"], "open": v["open"], "completed": v["completed"], "overdue": v["overdue"]}
        for _, v in sorted(tasks_by_fm.items(), key=lambda x: x[1]["total"], reverse=True)
        if v["total"] > 0
    ]
    
    # 2. Overdue Tasks Summary
    overdue_summary = {
        "total": total_overdue,
        "by_priority": overdue_by_priority
    }
    
    # 3. Average Investor Response Time (based on pipeline stage changes)
    # Use call logs to calculate average time between calls per investor
    response_times = []
    investor_calls = {}
    for log in all_call_logs:
        inv_id = log.get("investor_id")
        if inv_id:
            if inv_id not in investor_calls:
                investor_calls[inv_id] = []
            call_dt = log.get("call_datetime")
            if call_dt:
                try:
                    dt = datetime.fromisoformat(call_dt.replace('Z', '+00:00'))
                    investor_calls[inv_id].append(dt)
                except:
                    pass
    
    for inv_id, calls in investor_calls.items():
        if len(calls) >= 2:
            calls.sort()
            for i in range(1, len(calls)):
                delta = (calls[i] - calls[i-1]).days
                response_times.append(delta)
    
    avg_response_time = round(sum(response_times) / len(response_times), 1) if response_times else None
    
    # 4. Meetings Scheduled vs Completed (based on call log outcomes)
    meetings_scheduled = 0
    meetings_completed = 0
    for log in all_call_logs:
        outcome = log.get("outcome", "").lower()
        if "meeting" in outcome or outcome in ["connected", "interested", "follow-up needed"]:
            meetings_scheduled += 1
            if outcome in ["connected", "interested"]:
                meetings_completed += 1
    
    # Also count call logs with certain outcomes as meetings
    meeting_stages = ["First Meeting", "Second Meeting"]
    for pipeline in await db.investor_pipeline.find({}, {"_id": 0}).to_list(10000):
        stage_id = pipeline.get("stage_id")
        stage = await db.pipeline_stages.find_one({"id": stage_id}, {"_id": 0})
        if stage and stage.get("name") in meeting_stages:
            meetings_completed += 1
    
    # 5. Bottlenecks by Category
    # Analyze tasks and stages to identify bottlenecks
    bottleneck_categories = {
        "Legal": {"count": 0, "capital_blocked": 0},
        "IC": {"count": 0, "capital_blocked": 0},  # Investment Committee
        "Documentation": {"count": 0, "capital_blocked": 0},
        "Compliance": {"count": 0, "capital_blocked": 0},
        "Other": {"count": 0, "capital_blocked": 0}
    }
    
    # Categorize based on task titles and stage names
    legal_keywords = ["contract", "legal", "agreement", "signing"]
    ic_keywords = ["ic", "committee", "approval", "review"]
    doc_keywords = ["document", "paperwork", "form", "subscription"]
    compliance_keywords = ["compliance", "kyc", "aml", "verify", "verification"]
    
    # Check tasks for bottlenecks
    for task in all_tasks:
        if task.get("status") == "completed":
            continue
        title = (task.get("title") or "").lower()
        stage_name = (task.get("stage_name") or "").lower()
        
        categorized = False
        for keyword in legal_keywords:
            if keyword in title or keyword in stage_name:
                bottleneck_categories["Legal"]["count"] += 1
                categorized = True
                break
        if not categorized:
            for keyword in ic_keywords:
                if keyword in title or keyword in stage_name:
                    bottleneck_categories["IC"]["count"] += 1
                    categorized = True
                    break
        if not categorized:
            for keyword in doc_keywords:
                if keyword in title or keyword in stage_name:
                    bottleneck_categories["Documentation"]["count"] += 1
                    categorized = True
                    break
        if not categorized:
            for keyword in compliance_keywords:
                if keyword in title or keyword in stage_name:
                    bottleneck_categories["Compliance"]["count"] += 1
                    categorized = True
                    break
    
    # Check pipeline stages for capital blocked in bottleneck stages
    bottleneck_stages = ["Signing Contract", "Signing Subscription", "Letter for Capital Call"]
    for pipeline in await db.investor_pipeline.find({}, {"_id": 0}).to_list(10000):
        stage_id = pipeline.get("stage_id")
        stage = await db.pipeline_stages.find_one({"id": stage_id}, {"_id": 0})
        if stage and stage.get("name") in bottleneck_stages:
            investor = await db.investor_profiles.find_one({"id": pipeline.get("investor_id")}, {"_id": 0})
            if investor:
                capital = investor.get("expected_ticket_amount") or investor.get("investment_size") or 0
                try:
                    capital = float(capital)
                except:
                    capital = 0
                
                stage_name = stage.get("name", "")
                if "contract" in stage_name.lower():
                    bottleneck_categories["Legal"]["capital_blocked"] += capital
                elif "subscription" in stage_name.lower():
                    bottleneck_categories["Documentation"]["capital_blocked"] += capital
                elif "capital call" in stage_name.lower():
                    bottleneck_categories["Compliance"]["capital_blocked"] += capital
    
    bottlenecks = [
        {
            "category": k,
            "task_count": v["count"],
            "capital_blocked": round(v["capital_blocked"], 2)
        }
        for k, v in bottleneck_categories.items()
        if v["count"] > 0 or v["capital_blocked"] > 0
    ]
    
    # Sort by capital blocked
    bottlenecks.sort(key=lambda x: x["capital_blocked"], reverse=True)
    
    return {
        "tasks_per_fund_manager": tasks_per_fm,
        "overdue_tasks": overdue_summary,
        "avg_response_time_days": avg_response_time,
        "meetings": {
            "scheduled": meetings_scheduled,
            "completed": meetings_completed,
            "completion_rate": round(meetings_completed / meetings_scheduled * 100, 1) if meetings_scheduled > 0 else 0
        },
        "bottlenecks": bottlenecks,
        "generated_at": datetime.now(timezone.utc).isoformat()
    }


# ============== LOOKUP DATA ==============

@api_router.get("/lookups/sectors")
async def get_sectors():
    """Get available sectors"""
    return ["Technology", "Healthcare", "Fintech", "Consumer", "Enterprise", "AI/ML", "Crypto/Web3", "Climate", "Real Estate", "Infrastructure"]

@api_router.get("/lookups/regions")
async def get_regions():
    """Get available regions"""
    return ["North America", "Europe", "MENA", "Asia Pacific", "Latin America", "Africa", "Global"]

@api_router.get("/lookups/stages")
async def get_stages():
    """Get available investment stages"""
    return ["Pre-Seed", "Seed", "Series A", "Series B", "Series C+", "Growth", "Late Stage"]

# ============== PIPELINE STAGES ROUTES ==============

@api_router.get("/funds/{fund_id}/pipeline-stages")
async def get_pipeline_stages(fund_id: str, user: dict = Depends(get_current_user)):
    """Get all pipeline stages for a fund"""
    stages = await db.pipeline_stages.find({"fund_id": fund_id}, {"_id": 0}).to_list(100)
    
    # If no stages exist, create default stages for this fund
    if not stages:
        stages = []
        for default_stage in DEFAULT_PIPELINE_STAGES:
            stage = PipelineStage(
                fund_id=fund_id,
                name=default_stage["name"],
                position=default_stage["position"],
                is_default=default_stage["is_default"]
            )
            await db.pipeline_stages.insert_one(stage.model_dump())
            stages.append(stage.model_dump())
    
    # Sort by position
    stages.sort(key=lambda x: x.get("position", 0))
    return stages

@api_router.post("/funds/{fund_id}/pipeline-stages")
async def create_pipeline_stage(fund_id: str, stage_data: PipelineStageCreate, user: dict = Depends(get_current_user)):
    """Create a new pipeline stage for a fund"""
    # Verify fund_id matches
    if stage_data.fund_id != fund_id:
        raise HTTPException(status_code=400, detail="Fund ID mismatch")
    
    # Get current max position
    existing_stages = await db.pipeline_stages.find({"fund_id": fund_id}, {"_id": 0}).to_list(100)
    max_position = max([s.get("position", 0) for s in existing_stages], default=-1)
    
    stage = PipelineStage(
        fund_id=fund_id,
        name=stage_data.name,
        position=max_position + 1,
        is_default=False
    )
    await db.pipeline_stages.insert_one(stage.model_dump())
    return stage.model_dump()

@api_router.put("/pipeline-stages/{stage_id}")
async def update_pipeline_stage(stage_id: str, stage_data: PipelineStageUpdate, user: dict = Depends(get_current_user)):
    """Update a pipeline stage"""
    stage = await db.pipeline_stages.find_one({"id": stage_id}, {"_id": 0})
    if not stage:
        raise HTTPException(status_code=404, detail="Pipeline stage not found")
    
    update_dict = {k: v for k, v in stage_data.model_dump().items() if v is not None}
    if update_dict:
        await db.pipeline_stages.update_one({"id": stage_id}, {"$set": update_dict})
    
    updated = await db.pipeline_stages.find_one({"id": stage_id}, {"_id": 0})
    return updated

@api_router.delete("/pipeline-stages/{stage_id}")
async def delete_pipeline_stage(stage_id: str, user: dict = Depends(get_current_user)):
    """Delete a pipeline stage (only if no investors are in it)"""
    stage = await db.pipeline_stages.find_one({"id": stage_id}, {"_id": 0})
    if not stage:
        raise HTTPException(status_code=404, detail="Pipeline stage not found")
    
    # Check if any investors are in this stage
    investors_in_stage = await db.investor_pipeline.count_documents({"stage_id": stage_id})
    if investors_in_stage > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete stage with {investors_in_stage} investors. Move them first.")
    
    await db.pipeline_stages.delete_one({"id": stage_id})
    return {"message": "Pipeline stage deleted"}

# ============== INVESTOR PIPELINE ROUTES ==============

@api_router.get("/funds/{fund_id}/investor-pipeline")
async def get_investor_pipeline(fund_id: str, user: dict = Depends(get_current_user)):
    """Get all investor pipeline entries for a fund"""
    pipeline = await db.investor_pipeline.find({"fund_id": fund_id}, {"_id": 0}).to_list(1000)
    return pipeline

@api_router.get("/investor-pipeline/{investor_id}")
async def get_investor_pipeline_status(investor_id: str, user: dict = Depends(get_current_user)):
    """Get pipeline status for a specific investor (single source of truth)"""
    pipeline_entry = await db.investor_pipeline.find_one({"investor_id": investor_id}, {"_id": 0})
    
    if not pipeline_entry:
        return {"investor_id": investor_id, "stage_id": None, "stage_name": None}
    
    # Get the stage details
    stage = await db.pipeline_stages.find_one({"id": pipeline_entry.get("stage_id")}, {"_id": 0})
    
    return {
        "investor_id": investor_id,
        "stage_id": pipeline_entry.get("stage_id"),
        "stage_name": stage.get("name") if stage else None,
        "position": pipeline_entry.get("position", 0),
        "updated_at": pipeline_entry.get("updated_at")
    }

@api_router.post("/investor-pipeline")
async def add_investor_to_pipeline(pipeline_data: InvestorPipelineCreate, user: dict = Depends(get_current_user)):
    """Add an investor to the pipeline (or update if already exists)"""
    # Check if investor already has a pipeline entry for this fund
    existing = await db.investor_pipeline.find_one({
        "fund_id": pipeline_data.fund_id,
        "investor_id": pipeline_data.investor_id
    }, {"_id": 0})
    
    if existing:
        # Update existing entry
        update_dict = {
            "stage_id": pipeline_data.stage_id,
            "position": pipeline_data.position,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.investor_pipeline.update_one(
            {"id": existing["id"]},
            {"$set": update_dict}
        )
        updated = await db.investor_pipeline.find_one({"id": existing["id"]}, {"_id": 0})
        return updated
    
    # Create new entry
    pipeline_entry = InvestorPipeline(**pipeline_data.model_dump())
    await db.investor_pipeline.insert_one(pipeline_entry.model_dump())
    # Auto-generate tasks for the initial stage
    new_stage_doc = await db.pipeline_stages.find_one({"id": pipeline_data.stage_id}, {"_id": 0})
    investor_doc = await db.investor_profiles.find_one({"id": pipeline_data.investor_id}, {"_id": 0})
    await auto_generate_stage_tasks(
        pipeline_data.fund_id, pipeline_data.stage_id,
        new_stage_doc["name"] if new_stage_doc else "",
        pipeline_data.investor_id,
        investor_doc.get("investor_name", "") if investor_doc else "",
        user["id"]
    )
    return pipeline_entry.model_dump()

@api_router.put("/investor-pipeline/{pipeline_id}")
async def update_investor_pipeline(pipeline_id: str, update_data: InvestorPipelineUpdate, user: dict = Depends(get_current_user)):
    """Update an investor's pipeline status (move to different stage)"""
    pipeline_entry = await db.investor_pipeline.find_one({"id": pipeline_id}, {"_id": 0})
    if not pipeline_entry:
        raise HTTPException(status_code=404, detail="Pipeline entry not found")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.investor_pipeline.update_one({"id": pipeline_id}, {"$set": update_dict})
    
    updated = await db.investor_pipeline.find_one({"id": pipeline_id}, {"_id": 0})
    return updated

@api_router.delete("/investor-pipeline/{pipeline_id}")
async def remove_investor_from_pipeline(pipeline_id: str, user: dict = Depends(get_current_user)):
    """Remove an investor from the pipeline"""
    pipeline_entry = await db.investor_pipeline.find_one({"id": pipeline_id}, {"_id": 0})
    if not pipeline_entry:
        raise HTTPException(status_code=404, detail="Pipeline entry not found")
    
    await db.investor_pipeline.delete_one({"id": pipeline_id})
    return {"message": "Investor removed from pipeline"}

async def auto_generate_stage_tasks(
    fund_id: str, stage_id: str, stage_name: str,
    investor_id: str, investor_name: str, created_by_id: str
):
    """Bulk-create stage checklist tasks for an investor entering a new stage.
    Skips if auto tasks already exist for this investor+stage combination."""
    task_defs = STAGE_AUTO_TASKS.get(stage_name, [])
    if not task_defs:
        return
    # Idempotency: skip if already generated for this investor+stage
    existing_count = await db.user_tasks.count_documents({
        "investor_id": investor_id,
        "stage_id": stage_id,
        "is_auto_generated": True
    })
    if existing_count > 0:
        return
    due_days = STAGE_DUE_DAYS.get(stage_name, 5)
    due_date = (datetime.now(timezone.utc) + timedelta(days=due_days)).strftime('%Y-%m-%d')
    tasks_to_insert = []
    for td in task_defs:
        task = UserTask(
            fund_id=fund_id,
            title=td["title"],
            stage_id=stage_id,
            stage_name=stage_name,
            investor_id=investor_id,
            investor_name=investor_name,
            priority=td["priority"],
            due_date=due_date,
            created_by=created_by_id,
            created_by_name="Auto-Generated",
            is_auto_generated=True,
        )
        tasks_to_insert.append(task.model_dump())
    if tasks_to_insert:
        await db.user_tasks.insert_many(tasks_to_insert)

@api_router.put("/investor-pipeline/move/{investor_id}")
async def move_investor_in_pipeline(
    investor_id: str, 
    fund_id: str,
    new_stage_id: str, 
    new_position: int = 0,
    user: dict = Depends(get_current_user)
):
    """Move an investor to a different stage in the pipeline"""
    # Find or create pipeline entry
    pipeline_entry = await db.investor_pipeline.find_one({
        "fund_id": fund_id,
        "investor_id": investor_id
    }, {"_id": 0})
    
    if not pipeline_entry:
        # Create new entry
        new_entry = InvestorPipeline(
            fund_id=fund_id,
            investor_id=investor_id,
            stage_id=new_stage_id,
            position=new_position
        )
        await db.investor_pipeline.insert_one(new_entry.model_dump())
        # Auto-generate tasks for the initial stage
        new_stage_doc = await db.pipeline_stages.find_one({"id": new_stage_id}, {"_id": 0})
        investor_doc = await db.investor_profiles.find_one({"id": investor_id}, {"_id": 0})
        await auto_generate_stage_tasks(
            fund_id, new_stage_id,
            new_stage_doc["name"] if new_stage_doc else "",
            investor_id,
            investor_doc.get("investor_name", "") if investor_doc else "",
            user["id"]
        )
        return new_entry.model_dump()

    # Update existing entry - track stage change time
    update_dict = {
        "stage_id": new_stage_id,
        "position": new_position,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    # Update stage_entered_at if stage is changing
    stage_changed = pipeline_entry.get("stage_id") != new_stage_id
    if stage_changed:
        update_dict["stage_entered_at"] = datetime.now(timezone.utc).isoformat()

    await db.investor_pipeline.update_one({"id": pipeline_entry["id"]}, {"$set": update_dict})

    # Auto-generate tasks when investor enters a new stage
    if stage_changed:
        new_stage_doc = await db.pipeline_stages.find_one({"id": new_stage_id}, {"_id": 0})
        investor_doc = await db.investor_profiles.find_one({"id": investor_id}, {"_id": 0})
        await auto_generate_stage_tasks(
            fund_id, new_stage_id,
            new_stage_doc["name"] if new_stage_doc else "",
            investor_id,
            investor_doc.get("investor_name", "") if investor_doc else "",
            user["id"]
        )

    updated = await db.investor_pipeline.find_one({"id": pipeline_entry["id"]}, {"_id": 0})
    return updated

# ============== ENHANCED INVESTOR PROFILE WITH PIPELINE STATUS ==============

@api_router.get("/investor-profiles-with-pipeline/fund/{fund_id}")
async def get_investor_profiles_with_pipeline(fund_id: str, user: dict = Depends(get_current_user)):
    """Get all investor profiles for a fund with their pipeline status"""
    # Get profiles with legacy fund_id assignment
    legacy_profiles = await db.investor_profiles.find({"fund_id": fund_id}, {"_id": 0}).to_list(1000)
    legacy_ids = {p["id"] for p in legacy_profiles}
    
    # Get profiles assigned via investor_fund_assignments (new system)
    fund_assignments = await db.investor_fund_assignments.find({"fund_id": fund_id}, {"_id": 0}).to_list(1000)
    assigned_investor_ids = [a["investor_id"] for a in fund_assignments if a["investor_id"] not in legacy_ids]
    
    # Fetch additional profiles from assignments
    additional_profiles = []
    if assigned_investor_ids:
        additional_profiles = await db.investor_profiles.find(
            {"id": {"$in": assigned_investor_ids}}, 
            {"_id": 0}
        ).to_list(1000)
    
    # Combine all profiles
    profiles = legacy_profiles + additional_profiles
    
    # Get pipeline entries for this fund
    pipeline_entries = await db.investor_pipeline.find({"fund_id": fund_id}, {"_id": 0}).to_list(1000)
    pipeline_map = {p["investor_id"]: p for p in pipeline_entries}
    
    # Get pipeline stages for this fund
    stages = await db.pipeline_stages.find({"fund_id": fund_id}, {"_id": 0}).to_list(100)
    stages_map = {s["id"]: s for s in stages}
    
    # Enrich profiles with pipeline status
    for profile in profiles:
        pipeline_entry = pipeline_map.get(profile["id"])
        if pipeline_entry:
            stage = stages_map.get(pipeline_entry.get("stage_id"))
            profile["pipeline_stage_id"] = pipeline_entry.get("stage_id")
            profile["pipeline_stage_name"] = stage.get("name") if stage else None
            profile["pipeline_position"] = pipeline_entry.get("position", 0)
            profile["pipeline_stage_entered_at"] = pipeline_entry.get("stage_entered_at")
            profile["pipeline_last_interaction_date"] = pipeline_entry.get("last_interaction_date")
            profile["pipeline_next_step"] = pipeline_entry.get("next_step")
        else:
            profile["pipeline_stage_id"] = None
            profile["pipeline_stage_name"] = None
            profile["pipeline_position"] = None
            profile["pipeline_stage_entered_at"] = None
            profile["pipeline_last_interaction_date"] = None
            profile["pipeline_next_step"] = None
    
    return profiles

# ============== INVESTOR NOTES ROUTES ==============

@api_router.get("/investor-notes/{investor_id}")
async def get_investor_notes(investor_id: str, limit: int = 5, user: dict = Depends(get_current_user)):
    """Get notes for an investor (most recent first)"""
    notes = await db.investor_notes.find(
        {"investor_id": investor_id}, 
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return notes

@api_router.post("/investor-notes")
async def create_investor_note(note_data: InvestorNoteCreate, user: dict = Depends(get_current_user)):
    """Add a note to an investor"""
    # Verify investor exists
    investor = await db.investor_profiles.find_one({"id": note_data.investor_id}, {"_id": 0})
    if not investor:
        raise HTTPException(status_code=404, detail="Investor not found")
    
    # Create note with user info
    note = InvestorNote(
        investor_id=note_data.investor_id,
        content=note_data.content,
        created_by=user.get("id"),
        created_by_name=f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
    )
    await db.investor_notes.insert_one(note.model_dump())
    
    # Update last_interaction_date in pipeline
    await db.investor_pipeline.update_many(
        {"investor_id": note_data.investor_id},
        {"$set": {"last_interaction_date": datetime.now(timezone.utc).isoformat()}}
    )
    
    return note.model_dump()

@api_router.delete("/investor-notes/{note_id}")
async def delete_investor_note(note_id: str, user: dict = Depends(get_current_user)):
    """Delete a note (only creator or admin can delete)"""
    note = await db.investor_notes.find_one({"id": note_id}, {"_id": 0})
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    # Only creator or admin can delete
    if note.get("created_by") != user.get("id") and user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized to delete this note")
    
    await db.investor_notes.delete_one({"id": note_id})
    return {"message": "Note deleted"}

# ============== CAPITAL OVERVIEW API ==============

@api_router.get("/funds/{fund_id}/capital-overview")
async def get_capital_overview(fund_id: str, user: dict = Depends(get_current_user)):
    """
    Get capital overview metrics for a fund.
    - Deployed Capital: Sum of investment_size for investors in 'Money Transfer' or 'Transfer Date' stages
    - Includes validation for missing investment sizes
    - Compares against fund target_raise
    """
    # Get the fund to get target_raise
    fund = await db.funds.find_one({"id": fund_id}, {"_id": 0})
    if not fund:
        raise HTTPException(status_code=404, detail="Fund not found")
    
    # Get all investor profiles for this fund
    profiles = await db.investor_profiles.find({"fund_id": fund_id}, {"_id": 0}).to_list(1000)
    profiles_map = {p["id"]: p for p in profiles}
    
    # Get pipeline entries for this fund
    pipeline_entries = await db.investor_pipeline.find({"fund_id": fund_id}, {"_id": 0}).to_list(1000)
    
    # Get pipeline stages for this fund
    stages = await db.pipeline_stages.find({"fund_id": fund_id}, {"_id": 0}).to_list(100)
    stages_map = {s["id"]: s for s in stages}
    
    # Categorize stages
    deployed_stage_ids = set()  # Money Transfer, Transfer Date
    excluded_stage_ids = set()  # Declined (excluded from potential)
    potential_stage_ids = set()  # All other active stages
    
    for stage in stages:
        stage_name = stage.get("name", "")
        if stage_name in ["Money Transfer", "Transfer Date"]:
            deployed_stage_ids.add(stage["id"])
        elif stage_name.lower() == "declined":
            excluded_stage_ids.add(stage["id"])
        else:
            potential_stage_ids.add(stage["id"])
    
    # Calculate deployed capital AND potential capital
    deployed_capital = 0.0
    deployed_investors = []
    missing_investment_size = []
    
    potential_capital = 0.0
    potential_investors = []
    missing_expected_ticket = []
    
    for pipeline_entry in pipeline_entries:
        stage_id = pipeline_entry.get("stage_id")
        investor_id = pipeline_entry.get("investor_id")
        profile = profiles_map.get(investor_id)
        
        if not profile:
            continue
            
        stage_name = stages_map.get(stage_id, {}).get("name", "Unknown")
        
        # Check if in deployed stages (Money Transfer, Transfer Date)
        if stage_id in deployed_stage_ids:
            investment_size = profile.get("investment_size")
            
            investor_info = {
                "id": investor_id,
                "investor_name": profile.get("investor_name"),
                "investor_type": profile.get("investor_type"),
                "pipeline_stage": stage_name,
                "investment_size": investment_size,
                "investment_size_currency": profile.get("investment_size_currency", "USD")
            }
            
            if investment_size is not None and investment_size > 0:
                deployed_capital += investment_size
                deployed_investors.append(investor_info)
            else:
                missing_investment_size.append(investor_info)
        
        # Check if in potential stages (all active stages except deployed and declined)
        elif stage_id in potential_stage_ids:
            expected_ticket = profile.get("expected_ticket_amount")
            
            investor_info = {
                "id": investor_id,
                "investor_name": profile.get("investor_name"),
                "investor_type": profile.get("investor_type"),
                "pipeline_stage": stage_name,
                "expected_ticket_amount": expected_ticket,
                "expected_ticket_currency": profile.get("expected_ticket_currency", "USD")
            }
            
            if expected_ticket is not None and expected_ticket > 0:
                potential_capital += expected_ticket
                potential_investors.append(investor_info)
            else:
                missing_expected_ticket.append(investor_info)
    
    # Calculate target comparison
    target_raise = fund.get("target_raise") or 0
    target_reached = deployed_capital >= target_raise if target_raise > 0 else False
    progress_percentage = (deployed_capital / target_raise * 100) if target_raise > 0 else 0
    
    # Calculate days remaining to target date
    target_date = fund.get("target_date")
    days_remaining = None
    if target_date:
        try:
            # Handle both date-only and datetime formats
            if 'T' in target_date:
                target_dt = datetime.fromisoformat(target_date.replace('Z', '+00:00'))
            else:
                # Date only - parse as date and make it timezone aware
                target_dt = datetime.strptime(target_date, '%Y-%m-%d').replace(tzinfo=timezone.utc)
            
            now = datetime.now(timezone.utc)
            delta = target_dt - now
            days_remaining = delta.days
        except Exception as e:
            print(f"Error parsing target_date: {e}")
            days_remaining = None
    
    return {
        "fund_id": fund_id,
        "fund_name": fund.get("name"),
        "fund_currency": fund.get("currency", "USD"),
        # Deployed Capital metrics
        "deployed_capital": deployed_capital,
        "deployed_investor_count": len(deployed_investors),
        "deployed_investors": deployed_investors,
        "missing_investment_size_count": len(missing_investment_size),
        "missing_investment_size_investors": missing_investment_size,
        "total_investors_in_deployed_stages": len(deployed_investors) + len(missing_investment_size),
        # Potential Capital metrics
        "potential_capital": potential_capital,
        "potential_investor_count": len(potential_investors),
        "potential_investors": potential_investors,
        "missing_expected_ticket_count": len(missing_expected_ticket),
        "missing_expected_ticket_investors": missing_expected_ticket,
        "total_investors_in_potential_stages": len(potential_investors) + len(missing_expected_ticket),
        # Target metrics
        "target_raise": target_raise,
        "target_date": target_date,
        "days_remaining": days_remaining,
        "target_reached": target_reached,
        "progress_percentage": round(progress_percentage, 1)
    }

# ============== TASK MANAGER API ==============

class TaskDueDateUpdate(BaseModel):
    task_id: str
    due_date: Optional[str] = None  # ISO date string

# User-created task models
class UserTaskCreate(BaseModel):
    title: str
    stage_id: str
    stage_name: str  # Denormalized for display
    investor_id: Optional[str] = None
    investor_name: Optional[str] = None  # Denormalized for display
    priority: str = "medium"  # low, medium, high
    due_date: Optional[str] = None
    is_auto_generated: bool = False

class UserTaskUpdate(BaseModel):
    title: Optional[str] = None
    stage_id: Optional[str] = None
    stage_name: Optional[str] = None
    investor_id: Optional[str] = None
    investor_name: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[str] = None  # open, completed
    is_auto_generated: Optional[bool] = None

class UserTask(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    fund_id: str
    title: str
    stage_id: str
    stage_name: str
    investor_id: Optional[str] = None
    investor_name: Optional[str] = None
    priority: str = "medium"
    due_date: Optional[str] = None
    status: str = "open"  # open, completed
    is_auto_generated: bool = False
    created_by: str
    created_by_name: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Task templates by pipeline stage
TASK_TEMPLATES = {
    "Investors": [
        "Review investor profile",
        "Research investor background",
        "Add to outreach list"
    ],
    "Intro Email": [
        "Send intro email",
        "Follow up on intro email",
        "Personalize intro message"
    ],
    "Opportunity Email": [
        "Send opportunity details",
        "Follow up on opportunity email",
        "Share fund deck"
    ],
    "Phone Call": [
        "Schedule phone call",
        "Log call outcome",
        "Prepare call talking points"
    ],
    "First Meeting": [
        "Send meeting follow-up",
        "Schedule second meeting",
        "Share meeting materials"
    ],
    "Second Meeting": [
        "Prepare detailed presentation",
        "Send follow-up summary",
        "Address investor questions"
    ],
    "Follow Up Email": [
        "Send follow-up email",
        "Share additional materials",
        "Schedule next touchpoint"
    ],
    "Signing Contract": [
        "Send contract",
        "Follow up on signature",
        "Review contract terms"
    ],
    "Signing Subscription": [
        "Send subscription documents",
        "Follow up on subscription",
        "Verify subscription details"
    ],
    "Letter for Capital Call": [
        "Prepare capital call letter",
        "Send capital call notice",
        "Follow up on capital call"
    ],
    "Money Transfer": [
        "Verify transfer details",
        "Confirm wire instructions",
        "Track transfer status"
    ],
    "Transfer Date": [
        "Confirm transfer received",
        "Send confirmation receipt",
        "Update investor records"
    ]
}

# Auto-generated tasks per pipeline stage (title + priority per task)
STAGE_AUTO_TASKS = {
    "Prospects": [
        {"title": "Research investor background", "priority": "medium"},
        {"title": "Confirm check size range", "priority": "high"},
        {"title": "Confirm sector alignment", "priority": "high"},
        {"title": "Confirm geography alignment", "priority": "medium"},
        {"title": "Review prior portfolio", "priority": "medium"},
        {"title": "Identify warm intro path", "priority": "medium"},
        {"title": "Assign relationship owner", "priority": "high"},
    ],
    "Investors": [
        {"title": "Validate contact information", "priority": "high"},
        {"title": "Identify decision maker", "priority": "high"},
        {"title": "Map internal champion", "priority": "medium"},
        {"title": "Log relationship strength (1-5)", "priority": "medium"},
        {"title": "Tag investor type (Institutional / Family Office / Individual)", "priority": "medium"},
        {"title": "Assign outreach strategy", "priority": "medium"},
        {"title": "Prepare intro blurb", "priority": "medium"},
    ],
    "Intro Email": [
        {"title": "Draft personalized intro email", "priority": "high"},
        {"title": "Attach teaser (if applicable)", "priority": "medium"},
        {"title": "Confirm warm intro path", "priority": "medium"},
        {"title": "Send intro email", "priority": "high"},
        {"title": "Log send date", "priority": "medium"},
        {"title": "Set follow-up reminder (5-7 days)", "priority": "medium"},
    ],
    "Opportunity Email": [
        {"title": "Send pitch deck", "priority": "high"},
        {"title": "Send one-pager", "priority": "high"},
        {"title": "Send data room access", "priority": "medium"},
        {"title": "Log materials shared", "priority": "medium"},
        {"title": "Confirm NDA (if required)", "priority": "medium"},
        {"title": "Schedule call", "priority": "high"},
        {"title": "Log engagement score", "priority": "medium"},
    ],
    "Phone Call": [
        {"title": "Prepare call agenda", "priority": "high"},
        {"title": "Review investor notes", "priority": "medium"},
        {"title": "Confirm call participants", "priority": "medium"},
        {"title": "Log meeting notes", "priority": "high"},
        {"title": "Log objections", "priority": "medium"},
        {"title": "Assign follow-up owner", "priority": "medium"},
        {"title": "Schedule first meeting", "priority": "high"},
    ],
    "First Meeting": [
        {"title": "Prepare detailed presentation", "priority": "high"},
        {"title": "Customize slides for investor", "priority": "high"},
        {"title": "Identify potential objections", "priority": "medium"},
        {"title": "Log meeting notes", "priority": "high"},
        {"title": "Log level of interest (Hot / Warm / Cold)", "priority": "high"},
        {"title": "Identify decision timeline", "priority": "medium"},
        {"title": "Schedule second meeting", "priority": "high"},
    ],
    "Second Meeting": [
        {"title": "Send financial model", "priority": "high"},
        {"title": "Share cap table", "priority": "high"},
        {"title": "Share legal structure", "priority": "medium"},
        {"title": "Share performance reports", "priority": "medium"},
        {"title": "Answer follow-up questions", "priority": "high"},
        {"title": "Log DD checklist", "priority": "medium"},
        {"title": "Confirm soft commitment amount", "priority": "high"},
    ],
    "Follow Up Email": [
        {"title": "Send summary email", "priority": "high"},
        {"title": "Address objections", "priority": "high"},
        {"title": "Confirm allocation size", "priority": "high"},
        {"title": "Confirm timeline", "priority": "medium"},
        {"title": "Request subscription agreement", "priority": "high"},
    ],
    "Signing Contract": [
        {"title": "Send subscription agreement", "priority": "high"},
        {"title": "Confirm entity name", "priority": "high"},
        {"title": "Confirm allocation amount", "priority": "high"},
        {"title": "Confirm wire instructions", "priority": "high"},
        {"title": "Collect signed docs", "priority": "high"},
        {"title": "Upload signed docs", "priority": "medium"},
    ],
    "Signing Subscription": [
        {"title": "Confirm countersignature", "priority": "high"},
        {"title": "Confirm compliance review", "priority": "high"},
        {"title": "Confirm AML/KYC", "priority": "high"},
        {"title": "Confirm transfer instructions", "priority": "high"},
    ],
    "Letter for Capital Call": [
        {"title": "Draft capital call letter", "priority": "high"},
        {"title": "Confirm transfer details", "priority": "high"},
        {"title": "Send capital call", "priority": "high"},
        {"title": "Confirm receipt of confirmation", "priority": "medium"},
    ],
    "Money Transfer": [
        {"title": "Confirm transfer initiated", "priority": "high"},
        {"title": "Confirm bank confirmation", "priority": "high"},
        {"title": "Match funds to investor", "priority": "high"},
        {"title": "Log amount received", "priority": "high"},
        {"title": "Update total raised", "priority": "medium"},
    ],
    "Transfer Date": [
        {"title": "Confirm funds settled", "priority": "high"},
        {"title": "Update capital table", "priority": "high"},
        {"title": "Notify finance", "priority": "medium"},
        {"title": "Send confirmation email", "priority": "medium"},
        {"title": "Send thank-you note", "priority": "low"},
        {"title": "Mark investor as Active", "priority": "high"},
    ],
}

# Due date offsets (days from today) per stage
STAGE_DUE_DAYS = {
    "Prospects": 3, "Investors": 3, "Intro Email": 3,
    "Opportunity Email": 5, "Phone Call": 5, "First Meeting": 7,
    "Second Meeting": 10, "Follow Up Email": 5, "Signing Contract": 7,
    "Signing Subscription": 7, "Letter for Capital Call": 10,
    "Money Transfer": 14, "Transfer Date": 7,
}

@api_router.get("/funds/{fund_id}/tasks")
async def get_fund_tasks(fund_id: str, user: dict = Depends(get_current_user)):
    """
    Get system-generated tasks for a fund.
    Tasks are derived from validation issues (missing data that blocks accurate reporting).
    """
    # Get the fund
    fund = await db.funds.find_one({"id": fund_id}, {"_id": 0})
    if not fund:
        raise HTTPException(status_code=404, detail="Fund not found")
    
    # Get all investor profiles for this fund
    profiles = await db.investor_profiles.find({"fund_id": fund_id}, {"_id": 0}).to_list(1000)
    profiles_map = {p["id"]: p for p in profiles}
    
    # Get pipeline entries for this fund
    pipeline_entries = await db.investor_pipeline.find({"fund_id": fund_id}, {"_id": 0}).to_list(1000)
    
    # Get pipeline stages for this fund
    stages = await db.pipeline_stages.find({"fund_id": fund_id}, {"_id": 0}).to_list(100)
    stages_map = {s["id"]: s for s in stages}
    
    # Get task due dates from database
    task_due_dates = await db.task_due_dates.find({"fund_id": fund_id}, {"_id": 0}).to_list(1000)
    due_dates_map = {t["task_id"]: t.get("due_date") for t in task_due_dates}
    
    # Categorize stages
    deployed_stage_ids = set()
    excluded_stage_ids = set()
    potential_stage_ids = set()
    
    for stage in stages:
        stage_name = stage.get("name", "")
        if stage_name in ["Money Transfer", "Transfer Date"]:
            deployed_stage_ids.add(stage["id"])
        elif stage_name.lower() == "declined":
            excluded_stage_ids.add(stage["id"])
        else:
            potential_stage_ids.add(stage["id"])
    
    tasks = []
    now = datetime.now(timezone.utc)
    
    for pipeline_entry in pipeline_entries:
        stage_id = pipeline_entry.get("stage_id")
        investor_id = pipeline_entry.get("investor_id")
        profile = profiles_map.get(investor_id)
        
        if not profile:
            continue
        
        stage = stages_map.get(stage_id, {})
        stage_name = stage.get("name", "Unknown")
        investor_name = profile.get("investor_name", "Unknown Investor")
        
        # Task 1: Missing Investment Size for deployed stages
        if stage_id in deployed_stage_ids:
            investment_size = profile.get("investment_size")
            if investment_size is None or investment_size <= 0:
                task_id = f"missing_investment_size_{investor_id}"
                due_date = due_dates_map.get(task_id)
                is_overdue = False
                if due_date:
                    try:
                        due_dt = datetime.strptime(due_date, '%Y-%m-%d').replace(tzinfo=timezone.utc)
                        is_overdue = now > due_dt
                    except:
                        pass
                
                tasks.append({
                    "id": task_id,
                    "type": "missing_investment_size",
                    "description": f"Add Investment Size for {investor_name}",
                    "detail": "Investment Size is required for accurate Deployed Capital reporting",
                    "investor_id": investor_id,
                    "investor_name": investor_name,
                    "investor_type": profile.get("investor_type"),
                    "pipeline_stage": stage_name,
                    "stage_id": stage_id,
                    "status": "open",
                    "due_date": due_date,
                    "is_overdue": is_overdue,
                    "priority": "high"
                })
        
        # Task 2: Missing Expected Ticket for potential stages
        elif stage_id in potential_stage_ids:
            expected_ticket = profile.get("expected_ticket_amount")
            if expected_ticket is None or expected_ticket <= 0:
                task_id = f"missing_expected_ticket_{investor_id}"
                due_date = due_dates_map.get(task_id)
                is_overdue = False
                if due_date:
                    try:
                        due_dt = datetime.strptime(due_date, '%Y-%m-%d').replace(tzinfo=timezone.utc)
                        is_overdue = now > due_dt
                    except:
                        pass
                
                tasks.append({
                    "id": task_id,
                    "type": "missing_expected_ticket",
                    "description": f"Add Expected Ticket Size for {investor_name}",
                    "detail": "Expected Ticket Size is required for accurate Potential Capital reporting",
                    "investor_id": investor_id,
                    "investor_name": investor_name,
                    "investor_type": profile.get("investor_type"),
                    "pipeline_stage": stage_name,
                    "stage_id": stage_id,
                    "status": "open",
                    "due_date": due_date,
                    "is_overdue": is_overdue,
                    "priority": "medium"
                })
        
        # Task 3: Missing contact information for investors in later stages
        if stage_name in ["Phone Call", "First Meeting", "Second Meeting", "Follow Up Email", 
                          "Signing Contract", "Signing Subscription", "Letter for Capital Call",
                          "Money Transfer", "Transfer Date"]:
            contact_email = profile.get("contact_email")
            contact_phone = profile.get("contact_phone")
            if not contact_email and not contact_phone:
                task_id = f"missing_contact_{investor_id}"
                due_date = due_dates_map.get(task_id)
                is_overdue = False
                if due_date:
                    try:
                        due_dt = datetime.strptime(due_date, '%Y-%m-%d').replace(tzinfo=timezone.utc)
                        is_overdue = now > due_dt
                    except:
                        pass
                
                tasks.append({
                    "id": task_id,
                    "type": "missing_contact",
                    "description": f"Add contact info for {investor_name}",
                    "detail": "Email or phone number needed for investor communication",
                    "investor_id": investor_id,
                    "investor_name": investor_name,
                    "investor_type": profile.get("investor_type"),
                    "pipeline_stage": stage_name,
                    "stage_id": stage_id,
                    "status": "open",
                    "due_date": due_date,
                    "is_overdue": is_overdue,
                    "priority": "low"
                })
        
        # Task 4: Unknown Relationship Strength
        relationship_strength = profile.get("relationship_strength", "unknown")
        if relationship_strength == "unknown" or not relationship_strength:
            task_id = f"unknown_relationship_strength_{investor_id}"
            due_date = due_dates_map.get(task_id)
            is_overdue = False
            if due_date:
                try:
                    due_dt = datetime.strptime(due_date, '%Y-%m-%d').replace(tzinfo=timezone.utc)
                    is_overdue = now > due_dt
                except:
                    pass
            
            tasks.append({
                "id": task_id,
                "type": "unknown_relationship_strength",
                "description": f"Set relationship strength for {investor_name}",
                "detail": "Relationship strength is unknown - set to Cold, Warm, or Direct",
                "investor_id": investor_id,
                "investor_name": investor_name,
                "investor_type": profile.get("investor_type"),
                "pipeline_stage": stage_name,
                "stage_id": stage_id,
                "status": "open",
                "due_date": due_date,
                "is_overdue": is_overdue,
                "priority": "medium"
            })
        
        # Task 5: Unknown Decision Role
        decision_role = profile.get("decision_role", "unknown")
        if decision_role == "unknown" or not decision_role:
            task_id = f"unknown_decision_role_{investor_id}"
            due_date = due_dates_map.get(task_id)
            is_overdue = False
            if due_date:
                try:
                    due_dt = datetime.strptime(due_date, '%Y-%m-%d').replace(tzinfo=timezone.utc)
                    is_overdue = now > due_dt
                except:
                    pass
            
            tasks.append({
                "id": task_id,
                "type": "unknown_decision_role",
                "description": f"Set decision role for {investor_name}",
                "detail": "Decision role is unknown - set to Decision Maker, Influencer, or Gatekeeper",
                "investor_id": investor_id,
                "investor_name": investor_name,
                "investor_type": profile.get("investor_type"),
                "pipeline_stage": stage_name,
                "stage_id": stage_id,
                "status": "open",
                "due_date": due_date,
                "is_overdue": is_overdue,
                "priority": "medium"
            })
    
    # Sort tasks: overdue first, then by priority
    priority_order = {"high": 0, "medium": 1, "low": 2}
    tasks.sort(key=lambda t: (not t["is_overdue"], priority_order.get(t["priority"], 3)))
    
    return {
        "fund_id": fund_id,
        "total_tasks": len(tasks),
        "overdue_count": len([t for t in tasks if t["is_overdue"]]),
        "tasks": tasks
    }

@api_router.put("/tasks/due-date")
async def update_task_due_date(data: TaskDueDateUpdate, user: dict = Depends(get_current_user)):
    """Update or set a due date for a task"""
    # Extract fund_id from task_id (format: type_investorId)
    # We need to find the investor to get the fund_id
    parts = data.task_id.split("_")
    if len(parts) < 3:
        raise HTTPException(status_code=400, detail="Invalid task ID format")
    
    investor_id = parts[-1]
    investor = await db.investor_profiles.find_one({"id": investor_id}, {"_id": 0})
    if not investor:
        raise HTTPException(status_code=404, detail="Investor not found")
    
    fund_id = investor.get("fund_id")
    
    # Upsert the due date
    await db.task_due_dates.update_one(
        {"task_id": data.task_id, "fund_id": fund_id},
        {"$set": {
            "task_id": data.task_id,
            "fund_id": fund_id,
            "due_date": data.due_date,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": user.get("id")
        }},
        upsert=True
    )
    
    return {"message": "Due date updated", "task_id": data.task_id, "due_date": data.due_date}

# ============== USER-CREATED TASKS API ==============

@api_router.get("/task-templates")
async def get_task_templates(user: dict = Depends(get_current_user)):
    """Get task templates organized by pipeline stage"""
    return TASK_TEMPLATES

@api_router.get("/funds/{fund_id}/user-tasks")
async def get_user_tasks(fund_id: str, include_completed: bool = False, user: dict = Depends(get_current_user)):
    """Get user-created tasks for a fund"""
    query = {"fund_id": fund_id}
    if not include_completed:
        query["status"] = "open"
    
    tasks = await db.user_tasks.find(query, {"_id": 0}).to_list(1000)
    
    # Calculate overdue status for each task
    now = datetime.now(timezone.utc)
    for task in tasks:
        task["is_overdue"] = False
        if task.get("due_date") and task.get("status") == "open":
            try:
                due_dt = datetime.strptime(task["due_date"], '%Y-%m-%d').replace(tzinfo=timezone.utc)
                task["is_overdue"] = now > due_dt
            except:
                pass
        task["is_user_created"] = True  # Mark as user-created
    
    # Sort: overdue first, then by priority
    priority_order = {"high": 0, "medium": 1, "low": 2}
    tasks.sort(key=lambda t: (not t.get("is_overdue", False), priority_order.get(t.get("priority", "medium"), 1)))
    
    return {
        "fund_id": fund_id,
        "total_tasks": len(tasks),
        "overdue_count": len([t for t in tasks if t.get("is_overdue")]),
        "tasks": tasks
    }

@api_router.post("/funds/{fund_id}/user-tasks")
async def create_user_task(fund_id: str, task_data: UserTaskCreate, user: dict = Depends(get_current_user)):
    """Create a user task for a fund"""
    # Verify fund exists
    fund = await db.funds.find_one({"id": fund_id}, {"_id": 0})
    if not fund:
        raise HTTPException(status_code=404, detail="Fund not found")
    
    # If investor_id is provided, verify it exists and get name
    investor_name = task_data.investor_name
    if task_data.investor_id:
        investor = await db.investor_profiles.find_one({"id": task_data.investor_id}, {"_id": 0})
        if not investor:
            raise HTTPException(status_code=404, detail="Investor not found")
        investor_name = investor.get("investor_name")
    
    task = UserTask(
        fund_id=fund_id,
        title=task_data.title,
        stage_id=task_data.stage_id,
        stage_name=task_data.stage_name,
        investor_id=task_data.investor_id,
        investor_name=investor_name,
        priority=task_data.priority,
        due_date=task_data.due_date,
        created_by=user.get("id"),
        created_by_name=f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
    )
    
    await db.user_tasks.insert_one(task.model_dump())
    
    result = task.model_dump()
    result["is_user_created"] = True
    result["is_overdue"] = False
    
    return result

@api_router.put("/user-tasks/{task_id}")
async def update_user_task(task_id: str, task_data: UserTaskUpdate, user: dict = Depends(get_current_user)):
    """Update a user task"""
    task = await db.user_tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_dict = {k: v for k, v in task_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # If investor_id is being updated, also update investor_name
    if "investor_id" in update_dict and update_dict["investor_id"]:
        investor = await db.investor_profiles.find_one({"id": update_dict["investor_id"]}, {"_id": 0})
        if investor:
            update_dict["investor_name"] = investor.get("investor_name")
    
    await db.user_tasks.update_one({"id": task_id}, {"$set": update_dict})
    
    updated = await db.user_tasks.find_one({"id": task_id}, {"_id": 0})
    updated["is_user_created"] = True
    
    # Calculate overdue status
    updated["is_overdue"] = False
    if updated.get("due_date") and updated.get("status") == "open":
        try:
            due_dt = datetime.strptime(updated["due_date"], '%Y-%m-%d').replace(tzinfo=timezone.utc)
            updated["is_overdue"] = datetime.now(timezone.utc) > due_dt
        except:
            pass
    
    return updated

@api_router.put("/user-tasks/{task_id}/complete")
async def complete_user_task(task_id: str, user: dict = Depends(get_current_user)):
    """Mark a user task as complete"""
    task = await db.user_tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    await db.user_tasks.update_one(
        {"id": task_id},
        {"$set": {
            "status": "completed",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Task marked as complete", "task_id": task_id}

@api_router.put("/user-tasks/{task_id}/reopen")
async def reopen_user_task(task_id: str, user: dict = Depends(get_current_user)):
    """Reopen a completed user task"""
    task = await db.user_tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    await db.user_tasks.update_one(
        {"id": task_id},
        {"$set": {
            "status": "open",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Task reopened", "task_id": task_id}

@api_router.delete("/user-tasks/{task_id}")
async def delete_user_task(task_id: str, user: dict = Depends(get_current_user)):
    """Delete a user task"""
    result = await db.user_tasks.delete_one({"id": task_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {"message": "Task deleted", "task_id": task_id}

@api_router.get("/funds/{fund_id}/all-tasks")
async def get_all_tasks(fund_id: str, user: dict = Depends(get_current_user)):
    """Get combined system-generated and user-created tasks for a fund"""
    # Get system tasks
    system_response = await get_fund_tasks(fund_id, user)
    system_tasks = system_response["tasks"]
    
    # Mark system tasks
    for task in system_tasks:
        task["is_user_created"] = False
    
    # Get user tasks
    user_response = await get_user_tasks(fund_id, False, user)
    user_tasks = user_response["tasks"]
    
    # Combine and sort
    all_tasks = system_tasks + user_tasks
    priority_order = {"high": 0, "medium": 1, "low": 2}
    all_tasks.sort(key=lambda t: (not t.get("is_overdue", False), priority_order.get(t.get("priority", "medium"), 1)))
    
    total_count = len(all_tasks)
    overdue_count = len([t for t in all_tasks if t.get("is_overdue")])
    
    return {
        "fund_id": fund_id,
        "total_tasks": total_count,
        "system_tasks_count": len(system_tasks),
        "user_tasks_count": len(user_tasks),
        "overdue_count": overdue_count,
        "tasks": all_tasks
    }

# ============== CALL LOGS API ==============

CALL_OUTCOMES = [
    "no_answer",
    "connected",
    "interested",
    "not_interested",
    "follow_up_needed"
]

CALL_OUTCOME_LABELS = {
    "no_answer": "No Answer",
    "connected": "Connected",
    "interested": "Interested",
    "not_interested": "Not Interested",
    "follow_up_needed": "Follow-up Needed"
}

class CallLogCreate(BaseModel):
    investor_id: str
    call_datetime: str  # ISO datetime string
    outcome: str
    notes: Optional[str] = None
    next_step: Optional[str] = None
    create_task: bool = False
    task_title: Optional[str] = None
    task_priority: Optional[str] = "medium"
    task_due_date: Optional[str] = None

class CallLogUpdate(BaseModel):
    call_datetime: Optional[str] = None
    outcome: Optional[str] = None
    notes: Optional[str] = None
    next_step: Optional[str] = None

class CallLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    fund_id: str
    investor_id: str
    investor_name: str
    call_datetime: str
    outcome: str
    notes: Optional[str] = None
    next_step: Optional[str] = None
    task_created: bool = False
    task_id: Optional[str] = None
    created_by: str
    created_by_name: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

@api_router.get("/call-outcomes")
async def get_call_outcomes(user: dict = Depends(get_current_user)):
    """Get available call outcome options"""
    return {
        "outcomes": CALL_OUTCOMES,
        "labels": CALL_OUTCOME_LABELS
    }

@api_router.get("/funds/{fund_id}/call-logs")
async def get_call_logs(
    fund_id: str, 
    investor_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get call logs for a fund with optional filters"""
    query = {"fund_id": fund_id}
    
    if investor_id:
        query["investor_id"] = investor_id
    
    if start_date:
        query["call_datetime"] = query.get("call_datetime", {})
        query["call_datetime"]["$gte"] = start_date
    
    if end_date:
        if "call_datetime" not in query:
            query["call_datetime"] = {}
        query["call_datetime"]["$lte"] = end_date
    
    call_logs = await db.call_logs.find(query, {"_id": 0}).sort("call_datetime", -1).to_list(1000)
    
    return {
        "fund_id": fund_id,
        "total": len(call_logs),
        "call_logs": call_logs
    }

@api_router.get("/call-logs/{call_log_id}")
async def get_call_log(call_log_id: str, user: dict = Depends(get_current_user)):
    """Get a single call log"""
    call_log = await db.call_logs.find_one({"id": call_log_id}, {"_id": 0})
    if not call_log:
        raise HTTPException(status_code=404, detail="Call log not found")
    return call_log

@api_router.post("/funds/{fund_id}/call-logs")
async def create_call_log(fund_id: str, data: CallLogCreate, user: dict = Depends(get_current_user)):
    """Create a call log entry, optionally creating a follow-up task"""
    # Verify fund exists
    fund = await db.funds.find_one({"id": fund_id}, {"_id": 0})
    if not fund:
        raise HTTPException(status_code=404, detail="Fund not found")
    
    # Get investor info
    investor = await db.investor_profiles.find_one({"id": data.investor_id}, {"_id": 0})
    if not investor:
        raise HTTPException(status_code=404, detail="Investor not found")
    
    investor_name = investor.get("investor_name", "Unknown")
    
    # Validate outcome
    if data.outcome not in CALL_OUTCOMES:
        raise HTTPException(status_code=400, detail=f"Invalid outcome. Must be one of: {CALL_OUTCOMES}")
    
    # Create the call log
    call_log = CallLog(
        fund_id=fund_id,
        investor_id=data.investor_id,
        investor_name=investor_name,
        call_datetime=data.call_datetime,
        outcome=data.outcome,
        notes=data.notes,
        next_step=data.next_step,
        created_by=user.get("id"),
        created_by_name=f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
    )
    
    task_id = None
    
    # Create follow-up task if requested
    if data.create_task:
        # Get investor's current pipeline stage
        pipeline_entry = await db.investor_pipeline.find_one(
            {"fund_id": fund_id, "investor_id": data.investor_id},
            {"_id": 0}
        )
        
        stage_id = None
        stage_name = "Investors"
        
        if pipeline_entry:
            stage_id = pipeline_entry.get("stage_id")
            # Get stage name
            stage = await db.pipeline_stages.find_one({"id": stage_id}, {"_id": 0})
            if stage:
                stage_name = stage.get("name", "Investors")
        else:
            # Get default stage
            default_stage = await db.pipeline_stages.find_one(
                {"fund_id": fund_id, "order": 0},
                {"_id": 0}
            )
            if default_stage:
                stage_id = default_stage.get("id")
                stage_name = default_stage.get("name", "Investors")
        
        # Create task
        task_title = data.task_title or f"Follow up with {investor_name}"
        task = UserTask(
            fund_id=fund_id,
            title=task_title,
            stage_id=stage_id or "",
            stage_name=stage_name,
            investor_id=data.investor_id,
            investor_name=investor_name,
            priority=data.task_priority or "medium",
            due_date=data.task_due_date,
            created_by=user.get("id"),
            created_by_name=f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
        )
        
        await db.user_tasks.insert_one(task.model_dump())
        task_id = task.id
        
        # Update call log with task info
        call_log.task_created = True
        call_log.task_id = task_id
    
    await db.call_logs.insert_one(call_log.model_dump())
    
    result = call_log.model_dump()
    result["outcome_label"] = CALL_OUTCOME_LABELS.get(data.outcome, data.outcome)
    
    return result

@api_router.put("/call-logs/{call_log_id}")
async def update_call_log(call_log_id: str, data: CallLogUpdate, user: dict = Depends(get_current_user)):
    """Update a call log"""
    call_log = await db.call_logs.find_one({"id": call_log_id}, {"_id": 0})
    if not call_log:
        raise HTTPException(status_code=404, detail="Call log not found")
    
    update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if "outcome" in update_dict and update_dict["outcome"] not in CALL_OUTCOMES:
        raise HTTPException(status_code=400, detail=f"Invalid outcome. Must be one of: {CALL_OUTCOMES}")
    
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.call_logs.update_one({"id": call_log_id}, {"$set": update_dict})
    
    updated = await db.call_logs.find_one({"id": call_log_id}, {"_id": 0})
    updated["outcome_label"] = CALL_OUTCOME_LABELS.get(updated.get("outcome", ""), updated.get("outcome", ""))
    
    return updated

@api_router.delete("/call-logs/{call_log_id}")
async def delete_call_log(call_log_id: str, user: dict = Depends(get_current_user)):
    """Delete a call log"""
    call_log = await db.call_logs.find_one({"id": call_log_id}, {"_id": 0})
    if not call_log:
        raise HTTPException(status_code=404, detail="Call log not found")
    
    # Note: We don't delete the associated task - it remains as a standalone task
    
    result = await db.call_logs.delete_one({"id": call_log_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Call log not found")
    
    return {"message": "Call log deleted", "call_log_id": call_log_id}

# ============== EVIDENCE & SOURCES API ==============

CONFIDENCE_LEVELS = ["low", "medium", "high", "verified"]

CONFIDENCE_LABELS = {
    "low": "Low",
    "medium": "Medium",
    "high": "High",
    "verified": "Verified"
}

class EvidenceEntryCreate(BaseModel):
    source_title: str
    source_url: Optional[str] = None
    selected_text: Optional[str] = None
    notes: Optional[str] = None
    confidence: str = "medium"  # low, medium, high, verified

class EvidenceEntryUpdate(BaseModel):
    source_title: Optional[str] = None
    source_url: Optional[str] = None
    selected_text: Optional[str] = None
    notes: Optional[str] = None
    confidence: Optional[str] = None

class EvidenceEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    investor_id: str
    source_title: str
    source_url: Optional[str] = None
    selected_text: Optional[str] = None
    notes: Optional[str] = None
    confidence: str = "medium"
    captured_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    captured_by: str  # user id
    captured_by_name: Optional[str] = None
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

@api_router.get("/confidence-levels")
async def get_confidence_levels(user: dict = Depends(get_current_user)):
    """Get available confidence level options"""
    return {
        "levels": CONFIDENCE_LEVELS,
        "labels": CONFIDENCE_LABELS
    }

@api_router.get("/investors/{investor_id}/evidence")
async def get_investor_evidence(investor_id: str, user: dict = Depends(get_current_user)):
    """Get all evidence entries for an investor (newest first)"""
    # Verify investor exists
    investor = await db.investor_profiles.find_one({"id": investor_id}, {"_id": 0})
    if not investor:
        raise HTTPException(status_code=404, detail="Investor not found")
    
    evidence_entries = await db.evidence_entries.find(
        {"investor_id": investor_id},
        {"_id": 0}
    ).sort("captured_date", -1).to_list(1000)
    
    return {
        "investor_id": investor_id,
        "investor_name": investor.get("investor_name", "Unknown"),
        "total": len(evidence_entries),
        "evidence": evidence_entries
    }

@api_router.get("/evidence/{evidence_id}")
async def get_evidence_entry(evidence_id: str, user: dict = Depends(get_current_user)):
    """Get a single evidence entry"""
    entry = await db.evidence_entries.find_one({"id": evidence_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Evidence entry not found")
    return entry

@api_router.post("/investors/{investor_id}/evidence")
async def create_evidence_entry(investor_id: str, data: EvidenceEntryCreate, user: dict = Depends(get_current_user)):
    """Create a new evidence entry for an investor (append-only)"""
    # Verify investor exists
    investor = await db.investor_profiles.find_one({"id": investor_id}, {"_id": 0})
    if not investor:
        raise HTTPException(status_code=404, detail="Investor not found")
    
    # Validate confidence level
    if data.confidence not in CONFIDENCE_LEVELS:
        raise HTTPException(status_code=400, detail=f"Invalid confidence level. Must be one of: {CONFIDENCE_LEVELS}")
    
    entry = EvidenceEntry(
        investor_id=investor_id,
        source_title=data.source_title,
        source_url=data.source_url,
        selected_text=data.selected_text,
        notes=data.notes,
        confidence=data.confidence,
        captured_by=user.get("id"),
        captured_by_name=f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
    )
    
    await db.evidence_entries.insert_one(entry.model_dump())
    
    result = entry.model_dump()
    result["confidence_label"] = CONFIDENCE_LABELS.get(data.confidence, data.confidence)
    
    return result

@api_router.put("/evidence/{evidence_id}")
async def update_evidence_entry(evidence_id: str, data: EvidenceEntryUpdate, user: dict = Depends(get_current_user)):
    """Update an evidence entry (keeps original captured_date and captured_by)"""
    entry = await db.evidence_entries.find_one({"id": evidence_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Evidence entry not found")
    
    update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if "confidence" in update_dict and update_dict["confidence"] not in CONFIDENCE_LEVELS:
        raise HTTPException(status_code=400, detail=f"Invalid confidence level. Must be one of: {CONFIDENCE_LEVELS}")
    
    # Only update updated_at, preserve captured_date and captured_by
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.evidence_entries.update_one({"id": evidence_id}, {"$set": update_dict})
    
    updated = await db.evidence_entries.find_one({"id": evidence_id}, {"_id": 0})
    updated["confidence_label"] = CONFIDENCE_LABELS.get(updated.get("confidence", ""), updated.get("confidence", ""))
    
    return updated

@api_router.delete("/evidence/{evidence_id}")
async def delete_evidence_entry(evidence_id: str, user: dict = Depends(get_current_user)):
    """Delete an evidence entry"""
    result = await db.evidence_entries.delete_one({"id": evidence_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Evidence entry not found")
    
    return {"message": "Evidence entry deleted", "evidence_id": evidence_id}

# Chrome Extension Integration endpoint (public-friendly for extension use)
@api_router.post("/investors/{investor_id}/evidence/capture")
async def capture_evidence_from_extension(investor_id: str, data: EvidenceEntryCreate, user: dict = Depends(get_current_user)):
    """
    Capture evidence from Chrome extension.
    This endpoint is designed for Chrome extension integration.
    It appends a new evidence entry without modifying any existing investor fields.
    """
    return await create_evidence_entry(investor_id, data, user)

# ============== RESEARCH CAPTURE ROUTES ==============

@api_router.post("/research-capture")
async def create_research_capture(data: ResearchCaptureCreate, user: dict = Depends(get_current_user)):
    """
    Create a new research capture entry from Chrome extension.
    Fund Managers can review and accept/reject these captures.
    """
    # Verify user has access to the fund
    fund = await db.funds.find_one({"id": data.fund_id}, {"_id": 0})
    if not fund:
        raise HTTPException(status_code=404, detail="Fund not found")
    
    # Check if user is assigned to this fund
    db_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if user["role"] != "ADMIN" and data.fund_id not in db_user.get("assigned_funds", []):
        raise HTTPException(status_code=403, detail="Not authorized for this fund")
    
    # Create the research capture record
    capture = ResearchCapture(
        **data.model_dump(exclude={"api_key"}),
        captured_by_user_id=user["id"],
        captured_by_name=f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
    )
    
    await db.research_captures.insert_one(capture.model_dump())
    
    return {**capture.model_dump(), "fund_name": fund.get("name")}

@api_router.get("/research-capture")
async def list_research_captures(
    fund_id: str,
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """
    List research captures for a user (shown across all their assigned funds).
    Captures are user-centric, not fund-specific.
    Fund managers see their own captures in ANY fund they're assigned to.
    Admins can see all captures.
    """
    # Verify user has access to the fund
    db_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if user["role"] != "ADMIN" and fund_id not in db_user.get("assigned_funds", []):
        raise HTTPException(status_code=403, detail="Not authorized for this fund")
    
    # Build query - captures are user-centric, shown in all funds user has access to
    if user["role"] != "ADMIN":
        # Fund managers see their own captures (regardless of which fund they were synced from)
        query = {"captured_by_user_id": user["id"]}
    else:
        # Admins see all captures
        query = {}
    
    if status:
        query["status"] = status
    
    captures = await db.research_captures.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Get counts by status
    base_query = {"captured_by_user_id": user["id"]} if user["role"] != "ADMIN" else {}
    
    total = await db.research_captures.count_documents(base_query)
    pending_count = await db.research_captures.count_documents({**base_query, "status": "pending"})
    accepted_count = await db.research_captures.count_documents({**base_query, "status": "accepted"})
    rejected_count = await db.research_captures.count_documents({**base_query, "status": "rejected"})
    
    return {
        "captures": captures,
        "total": total,
        "pending": pending_count,
        "accepted": accepted_count,
        "rejected": rejected_count,
        "filtered_by_user": user["role"] != "ADMIN",
        "user_email": db_user.get("email")
    }

@api_router.get("/research-capture/{capture_id}")
async def get_research_capture(capture_id: str, user: dict = Depends(get_current_user)):
    """Get a single research capture by ID."""
    capture = await db.research_captures.find_one({"id": capture_id}, {"_id": 0})
    if not capture:
        raise HTTPException(status_code=404, detail="Research capture not found")
    
    # Verify user has access to the fund
    db_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if user["role"] != "ADMIN" and capture["fund_id"] not in db_user.get("assigned_funds", []):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return capture

@api_router.put("/research-capture/{capture_id}")
async def update_research_capture(capture_id: str, data: ResearchCaptureUpdate, user: dict = Depends(get_current_user)):
    """Update a research capture record (edit before accepting)."""
    capture = await db.research_captures.find_one({"id": capture_id}, {"_id": 0})
    if not capture:
        raise HTTPException(status_code=404, detail="Research capture not found")
    
    if capture["status"] != "pending":
        raise HTTPException(status_code=400, detail="Can only edit pending captures")
    
    # Verify user has access
    db_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if user["role"] != "ADMIN" and capture["fund_id"] not in db_user.get("assigned_funds", []):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.research_captures.update_one({"id": capture_id}, {"$set": update_data})
    
    updated = await db.research_captures.find_one({"id": capture_id}, {"_id": 0})
    return updated

@api_router.post("/research-capture/{capture_id}/accept")
async def accept_research_capture(
    capture_id: str, 
    fund_id: str,  # Fund to create the investor in
    user: dict = Depends(get_current_user)
):
    """
    Accept a research capture and create a new investor profile.
    The investor is created in the specified fund (the one currently selected by the user).
    The investor will appear in Investor Profiles and Admin's global pool.
    """
    capture = await db.research_captures.find_one({"id": capture_id}, {"_id": 0})
    if not capture:
        raise HTTPException(status_code=404, detail="Research capture not found")
    
    if capture["status"] != "pending":
        raise HTTPException(status_code=400, detail="Capture already processed")
    
    # Verify user has access to the target fund
    db_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if user["role"] != "ADMIN" and fund_id not in db_user.get("assigned_funds", []):
        raise HTTPException(status_code=403, detail="Not authorized for this fund")
    
    # Check for duplicate investor by name
    if capture.get("investor_name"):
        existing = await db.investor_profiles.find_one({
            "investor_name": {"$regex": f"^{capture['investor_name']}$", "$options": "i"}
        })
        if existing:
            raise HTTPException(
                status_code=400, 
                detail=f"Investor '{capture['investor_name']}' already exists in the system"
            )
    
    # Get fund info for office_id (use the selected fund, not the capture's original fund)
    fund = await db.funds.find_one({"id": fund_id}, {"_id": 0})
    
    # Get default pipeline stage for the selected fund
    default_stage = await db.pipeline_stages.find_one(
        {"fund_id": fund_id, "is_default": True},
        {"_id": 0}
    )
    if not default_stage:
        # Create default stages if they don't exist
        for stage_data in DEFAULT_PIPELINE_STAGES:
            stage = PipelineStage(fund_id=fund_id, **stage_data)
            await db.pipeline_stages.insert_one(stage.model_dump())
        default_stage = await db.pipeline_stages.find_one(
            {"fund_id": fund_id, "is_default": True},
            {"_id": 0}
        )
    
    # Create the investor profile
    investor_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    investor_profile = {
        "id": investor_id,
        "investor_name": capture.get("investor_name") or "Unknown",
        "firm_name": capture.get("firm_name"),
        "investor_type": capture.get("investor_type"),
        "country": capture.get("country"),
        "city": capture.get("city"),
        "contact_email": capture.get("contact_email"),
        "contact_phone": capture.get("contact_phone"),
        "linkedin_url": capture.get("linkedin_url"),
        "website": capture.get("website_url"),
        "job_title": capture.get("job_title"),
        "notes": capture.get("notes"),
        "source": "research_capture",
        "source_url": capture.get("source_url"),
        "fund_id": fund_id,  # Use the selected fund, not capture's original fund
        "office_id": fund.get("office_id") if fund else None,
        "created_by_user_id": user["id"],
        "owner_user_id": user["id"],
        "created_at": now,
        "updated_at": now
    }
    
    await db.investor_profiles.insert_one(investor_profile)
    
    # Create fund assignment for the selected fund
    assignment = {
        "id": str(uuid.uuid4()),
        "investor_id": investor_id,
        "fund_id": fund_id,  # Use the selected fund
        "owner_user_id": user["id"],
        "pipeline_stage_id": default_stage["id"] if default_stage else None,
        "position": 0,
        "created_at": now,
        "updated_at": now
    }
    await db.investor_fund_assignments.insert_one(assignment)
    
    # Update the capture record
    await db.research_captures.update_one(
        {"id": capture_id},
        {"$set": {
            "status": "accepted",
            "processed_by_user_id": user["id"],
            "processed_by_name": f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
            "created_investor_id": investor_id,
            "accepted_to_fund_id": fund_id,  # Track which fund the investor was added to
            "processed_at": now,
            "updated_at": now
        }}
    )
    
    return {
        "message": "Research capture accepted",
        "capture_id": capture_id,
        "investor_id": investor_id,
        "investor_name": investor_profile["investor_name"],
        "fund_id": fund_id,
        "fund_name": fund.get("name") if fund else None
    }

@api_router.post("/research-capture/{capture_id}/reject")
async def reject_research_capture(
    capture_id: str,
    reason: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Reject a research capture. It will not be added to investor profiles."""
    capture = await db.research_captures.find_one({"id": capture_id}, {"_id": 0})
    if not capture:
        raise HTTPException(status_code=404, detail="Research capture not found")
    
    if capture["status"] != "pending":
        raise HTTPException(status_code=400, detail="Capture already processed")
    
    # Verify user has access
    db_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if user["role"] != "ADMIN" and capture["fund_id"] not in db_user.get("assigned_funds", []):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.research_captures.update_one(
        {"id": capture_id},
        {"$set": {
            "status": "rejected",
            "processed_by_user_id": user["id"],
            "processed_by_name": f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
            "rejection_reason": reason,
            "processed_at": now,
            "updated_at": now
        }}
    )
    
    return {"message": "Research capture rejected", "capture_id": capture_id}

@api_router.delete("/research-capture/{capture_id}")
async def delete_research_capture(capture_id: str, user: dict = Depends(get_current_user)):
    """Delete a research capture record."""
    capture = await db.research_captures.find_one({"id": capture_id}, {"_id": 0})
    if not capture:
        raise HTTPException(status_code=404, detail="Research capture not found")
    
    # Verify user has access
    db_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if user["role"] != "ADMIN" and capture["fund_id"] not in db_user.get("assigned_funds", []):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.research_captures.delete_one({"id": capture_id})
    
    return {"message": "Research capture deleted", "capture_id": capture_id}

# ============== ALKNZ REPLIT CAPTURE API INTEGRATION ==============

# External API Configuration
ALKNZ_REPLIT_API_BASE_URL = "https://data-linker-mariamsallam05.replit.app"
ALKNZ_REPLIT_API_TOKEN = "ALKNZN92J2gwnDy1vKfzm1yool73YzxFqhE7A"

async def get_replit_api_headers():
    """Get default headers for ALKNZ Replit API requests."""
    return {
        "Authorization": f"Bearer {ALKNZ_REPLIT_API_TOKEN}",
        "Content-Type": "application/json"
    }

@api_router.get("/external-captures/verify")
async def verify_replit_api_connection(user: dict = Depends(get_current_user)):
    """Verify connection to the ALKNZ Replit Capture API."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            headers = await get_replit_api_headers()
            response = await client.get(
                f"{ALKNZ_REPLIT_API_BASE_URL}/api/metrics",
                headers=headers
            )
            response.raise_for_status()
            data = response.json()
            
            return {
                "success": True,
                "api_status": "connected",
                "base_url": ALKNZ_REPLIT_API_BASE_URL,
                "metrics": data.get("data", {})
            }
    except httpx.HTTPError as e:
        return {
            "success": False,
            "api_status": "error",
            "error": str(e)
        }

@api_router.get("/external-captures")
async def fetch_external_captures(
    fund_id: str,
    page: int = 1,
    page_size: int = 50,
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """
    Fetch captures from the external ALKNZ Replit API.
    This is the single source of truth for Chrome extension data.
    """
    # Verify user has access to the fund
    db_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if user["role"] != "ADMIN" and fund_id not in db_user.get("assigned_funds", []):
        raise HTTPException(status_code=403, detail="Not authorized for this fund")
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            headers = await get_replit_api_headers()
            params = {"page": page, "pageSize": page_size}
            if status:
                params["status"] = status
            
            response = await client.get(
                f"{ALKNZ_REPLIT_API_BASE_URL}/api/captures",
                headers=headers,
                params=params
            )
            response.raise_for_status()
            data = response.json()
            
            if not data.get("success"):
                raise HTTPException(status_code=500, detail="External API returned error")
            
            # Transform external captures to our format
            external_captures = data.get("data", [])
            transformed_captures = []
            
            for ec in external_captures:
                transformed = {
                    "id": ec.get("id") or str(uuid.uuid4()),
                    "external_id": ec.get("id"),  # Keep reference to external ID
                    "fund_id": fund_id,
                    "investor_name": ec.get("investor_name") or ec.get("name"),
                    "firm_name": ec.get("firm_name") or ec.get("company"),
                    "investor_type": ec.get("investor_type") or ec.get("type"),
                    "country": ec.get("country"),
                    "city": ec.get("city"),
                    "contact_email": ec.get("contact_email") or ec.get("email"),
                    "contact_phone": ec.get("contact_phone") or ec.get("phone"),
                    "linkedin_url": ec.get("linkedin_url") or ec.get("linkedin"),
                    "website_url": ec.get("website_url") or ec.get("website"),
                    "job_title": ec.get("job_title") or ec.get("title"),
                    "notes": ec.get("notes"),
                    "source_url": ec.get("source_url") or ec.get("sourceUrl"),
                    "source_page_title": ec.get("source_page_title") or ec.get("pageTitle"),
                    "status": ec.get("status", "pending"),
                    "captured_by_name": ec.get("captured_by") or "Chrome Extension",
                    "created_at": ec.get("created_at") or ec.get("createdAt") or datetime.now(timezone.utc).isoformat(),
                    "updated_at": ec.get("updated_at") or ec.get("updatedAt") or datetime.now(timezone.utc).isoformat(),
                    "is_external": True  # Flag to identify external captures
                }
                transformed_captures.append(transformed)
            
            # Get counts from external API
            pagination = data.get("pagination", {})
            
            return {
                "captures": transformed_captures,
                "total": pagination.get("total", len(transformed_captures)),
                "page": pagination.get("page", page),
                "page_size": pagination.get("pageSize", page_size),
                "total_pages": pagination.get("totalPages", 1),
                "source": "external_api"
            }
            
    except httpx.HTTPError as e:
        logger.error(f"External API error: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch from external API: {str(e)}")

@api_router.post("/external-captures/{external_id}/import")
async def import_external_capture(
    external_id: str,
    fund_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Import a capture from the external API into our local database.
    This creates a local copy that can then be accepted/rejected.
    """
    # Verify user has access to the fund
    db_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if user["role"] != "ADMIN" and fund_id not in db_user.get("assigned_funds", []):
        raise HTTPException(status_code=403, detail="Not authorized for this fund")
    
    # Check if already imported
    existing = await db.research_captures.find_one({"external_id": external_id}, {"_id": 0})
    if existing:
        return {"message": "Already imported", "capture": existing}
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            headers = await get_replit_api_headers()
            response = await client.get(
                f"{ALKNZ_REPLIT_API_BASE_URL}/api/captures/{external_id}",
                headers=headers
            )
            response.raise_for_status()
            data = response.json()
            
            if not data.get("success"):
                raise HTTPException(status_code=404, detail="Capture not found in external API")
            
            ec = data.get("data", {})
            
            # Create local capture record
            capture = ResearchCapture(
                external_id=external_id,
                fund_id=fund_id,
                investor_name=ec.get("investor_name") or ec.get("name"),
                firm_name=ec.get("firm_name") or ec.get("company"),
                investor_type=ec.get("investor_type") or ec.get("type"),
                country=ec.get("country"),
                city=ec.get("city"),
                contact_email=ec.get("contact_email") or ec.get("email"),
                contact_phone=ec.get("contact_phone") or ec.get("phone"),
                linkedin_url=ec.get("linkedin_url") or ec.get("linkedin"),
                website_url=ec.get("website_url") or ec.get("website"),
                job_title=ec.get("job_title") or ec.get("title"),
                notes=ec.get("notes"),
                source_url=ec.get("source_url") or ec.get("sourceUrl"),
                source_page_title=ec.get("source_page_title") or ec.get("pageTitle"),
                captured_by_user_id=user["id"],
                captured_by_name=ec.get("captured_by") or "Chrome Extension"
            )
            
            await db.research_captures.insert_one(capture.model_dump())
            
            return {
                "message": "Capture imported successfully",
                "capture": capture.model_dump()
            }
            
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch from external API: {str(e)}")

@api_router.get("/external-captures/sync")
async def sync_external_captures(
    fund_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Sync data from the external ALKNZ Replit API to local database.
    Only imports captures that match the current user's email (captured_by field).
    Fetches from BOTH:
    - /api/captures (pending captures from Chrome extension)
    - /api/investors (verified Address Book entries)
    """
    # Verify user has access to the fund
    db_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if user["role"] != "ADMIN" and fund_id not in db_user.get("assigned_funds", []):
        raise HTTPException(status_code=403, detail="Not authorized for this fund")
    
    # Get user's email to filter captures
    user_email = db_user.get("email", "").lower()
    
    imported_count = 0
    skipped_count = 0
    filtered_count = 0  # Captures belonging to other users
    errors = []
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = await get_replit_api_headers()
            
            # 1. Fetch from /api/captures (pending Chrome extension captures)
            try:
                captures_response = await client.get(
                    f"{ALKNZ_REPLIT_API_BASE_URL}/api/captures",
                    headers=headers,
                    params={"pageSize": 100}
                )
                captures_response.raise_for_status()
                captures_data = captures_response.json()
                
                if captures_data.get("success"):
                    for ec in captures_data.get("data", []):
                        external_id = f"capture_{ec.get('id')}"
                        if not ec.get('id'):
                            continue
                        
                        # Filter by user email - only import captures from this user
                        captured_by_email = (ec.get("captured_by") or "").lower()
                        if captured_by_email and captured_by_email != user_email:
                            filtered_count += 1
                            continue
                        
                        # Check if already imported
                        existing = await db.research_captures.find_one({"external_id": external_id}, {"_id": 0})
                        if existing:
                            skipped_count += 1
                            continue
                        
                        # Extract investor data from payload if present
                        payload = ec.get("payload", {})
                        
                        capture = ResearchCapture(
                            external_id=external_id,
                            fund_id=fund_id,
                            investor_name=payload.get("investor_name") or ec.get("investor_name") or payload.get("name"),
                            firm_name=payload.get("firm_name") or ec.get("firm_name") or payload.get("company"),
                            investor_type=payload.get("investor_type") or ec.get("investor_type"),
                            country=payload.get("location_country") or ec.get("country"),
                            city=payload.get("location_city") or ec.get("city"),
                            contact_email=payload.get("email") or ec.get("contact_email"),
                            contact_phone=payload.get("phone") or ec.get("contact_phone"),
                            linkedin_url=payload.get("linkedin") or ec.get("linkedin_url"),
                            website_url=payload.get("website") or ec.get("website_url"),
                            job_title=payload.get("job_title") or ec.get("job_title"),
                            notes=payload.get("description") or ec.get("notes") or ec.get("selected_text"),
                            source_url=ec.get("source_url"),
                            source_page_title=ec.get("source_title"),
                            captured_by_user_id=user["id"],
                            captured_by_name=ec.get("captured_by") or "Chrome Extension",
                            status="pending"  # Mark as pending for review
                        )
                        
                        await db.research_captures.insert_one(capture.model_dump())
                        imported_count += 1
            except Exception as e:
                errors.append(f"Captures sync error: {str(e)}")
            
            # 2. Fetch from /api/investors (Address Book - verified entries)
            try:
                investors_response = await client.get(
                    f"{ALKNZ_REPLIT_API_BASE_URL}/api/investors",
                    headers=headers,
                    params={"pageSize": 100}
                )
                investors_response.raise_for_status()
                investors_data = investors_response.json()
                
                if investors_data.get("success"):
                    for inv in investors_data.get("data", []):
                        external_id = f"investor_{inv.get('id')}"
                        if not inv.get('id'):
                            continue
                        
                        # Check if already imported
                        existing = await db.research_captures.find_one({"external_id": external_id}, {"_id": 0})
                        if existing:
                            skipped_count += 1
                            continue
                        
                        capture = ResearchCapture(
                            external_id=external_id,
                            fund_id=fund_id,
                            investor_name=inv.get("investor_name") or inv.get("name"),
                            firm_name=inv.get("firm_name"),
                            investor_type=inv.get("investor_type"),
                            country=inv.get("location_country") or inv.get("country"),
                            city=inv.get("location_city") or inv.get("city"),
                            contact_email=inv.get("email"),
                            contact_phone=inv.get("phone"),
                            linkedin_url=inv.get("linkedin"),
                            website_url=inv.get("website"),
                            job_title=inv.get("job_title"),
                            notes=inv.get("description"),
                            source_url=inv.get("website"),
                            source_page_title=f"Address Book: {inv.get('investor_name', 'Unknown')}",
                            captured_by_user_id=user["id"],
                            captured_by_name=inv.get("alknz_owner") or "Address Book",
                            status="pending"  # Mark as pending for review (even verified entries need local approval)
                        )
                        
                        await db.research_captures.insert_one(capture.model_dump())
                        imported_count += 1
            except Exception as e:
                errors.append(f"Investors sync error: {str(e)}")
            
            return {
                "message": "Sync completed",
                "imported": imported_count,
                "skipped": skipped_count,
                "filtered_other_users": filtered_count,
                "user_email": user_email,
                "errors": errors if errors else None,
                "sources": ["captures", "investors"]
            }
            
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Failed to sync from external API: {str(e)}")

# ---------------------------------------------------------------------------
# Extension v12 API — endpoints consumed by the Chrome extension
# ---------------------------------------------------------------------------

@api_router.get("/metrics")
async def get_metrics():
    """Public health/stats endpoint used by extension 'Test Connection' button."""
    total_investors = await db.investor_profiles.count_documents({})
    total_captures  = await db.research_captures.count_documents({})
    return {"success": True, "data": {"total_investors": total_investors, "total_captures": total_captures}}


class ExtensionPersonPayload(BaseModel):
    """Nested payload object sent by the Chrome extension."""
    investor_name: Optional[str] = None
    firm_name: Optional[str] = None
    job_title: Optional[str] = None
    investor_type: Optional[str] = None
    location_city: Optional[str] = None
    location_country: Optional[str] = None
    linkedin_url: Optional[str] = None
    website: Optional[str] = None
    emails: Optional[List[str]] = []
    phones: Optional[List[str]] = []
    notes: Optional[str] = None
    model_config = ConfigDict(extra="allow")


class ExtensionCaptureRequest(BaseModel):
    """Request body sent by the Chrome extension when uploading a captured investor."""
    capture_type: Optional[str] = "NEW_INVESTOR"
    source_url: Optional[str] = None
    source_title: Optional[str] = None
    selected_text: Optional[str] = None
    captured_by: Optional[str] = None
    confidence: Optional[str] = None
    page_type: Optional[str] = None
    payload: Optional[ExtensionPersonPayload] = None
    model_config = ConfigDict(extra="allow")


@api_router.get("/v1/people/lookup")
async def lookup_person(linkedin_url: str = "", user: dict = Depends(get_current_user)):
    """Conflict check: called before upload to warn if another team member already captured this profile."""
    if not linkedin_url:
        return {"exists": False, "captured_by_others": []}
    captures = await db.research_captures.find(
        {"linkedin_url": linkedin_url}, {"_id": 0}
    ).to_list(20)
    others = [
        {"name": c.get("captured_by_name"), "date": c.get("created_at")}
        for c in captures
        if c.get("captured_by_user_id") != user["id"]
    ]
    return {"exists": len(captures) > 0, "captured_by_others": others}


@api_router.post("/v1/people")
@api_router.post("/capture")
async def extension_capture_person(
    body: ExtensionCaptureRequest,
    user: dict = Depends(get_current_user)
):
    """
    Primary upload endpoint called by the Chrome extension.
    Maps the extension's nested payload to a ResearchCapture document.
    fund_id is None — the fund manager assigns it later via the Accept flow.
    Registered on both /v1/people (primary) and /capture (legacy fallback).
    """
    p = body.payload or ExtensionPersonPayload()
    first_email = (p.emails or [None])[0] if p.emails else None
    first_phone = (p.phones or [None])[0] if p.phones else None
    full_name = (
        (user.get("first_name") or "") + " " + (user.get("last_name") or "")
    ).strip() or user.get("email", "")

    capture = ResearchCapture(
        fund_id=None,
        investor_name=p.investor_name,
        firm_name=p.firm_name,
        job_title=p.job_title,
        investor_type=p.investor_type,
        city=p.location_city,
        country=p.location_country,
        linkedin_url=p.linkedin_url,
        website_url=p.website,
        contact_email=first_email,
        contact_phone=first_phone,
        notes=p.notes,
        source_url=body.source_url,
        source_page_title=body.source_title,
        captured_by_user_id=user["id"],
        captured_by_name=full_name,
        status="pending"
    )
    await db.research_captures.insert_one(capture.model_dump())
    return {"success": True, "id": capture.id, "action": "created"}


@api_router.get("/v1/people/{person_id}/recommendations")
async def get_person_recommendations(
    person_id: str,
    limit: int = 5,
    user: dict = Depends(get_current_user)
):
    """Post-upload recommendations card. Returns empty list — hides the card in the extension."""
    return {"recommendations": []}


@api_router.get("/v1/people/{person_id}/next-steps")
async def get_person_next_steps(person_id: str, user: dict = Depends(get_current_user)):
    """Post-upload next-steps card. Returns 404 — extension hides the card on 404."""
    raise HTTPException(status_code=404, detail="Not found")


# ============== INVESTOR PERSONA HELPERS ==============

def _score_rule_based(investor: dict, persona: dict) -> dict:
    """Score investor vs persona using weighted field matching. Returns {score, matched_fields, unmatched_fields}."""
    total_w = 0
    earned_w = 0
    matched = []
    unmatched = []

    GCC = {"saudi arabia", "uae", "united arab emirates", "qatar", "bahrain", "oman", "kuwait"}

    if persona.get("target_investor_type"):
        total_w += 35
        if (investor.get("investor_type") or "").lower() == persona["target_investor_type"].lower():
            earned_w += 35
            matched.append("Investor type")
        else:
            unmatched.append("Investor type")

    if persona.get("target_nationalities"):
        total_w += 25
        inv_nat = (investor.get("nationality") or "").lower()
        targets = [n.lower() for n in persona["target_nationalities"]]
        hit = inv_nat in targets or ("gcc" in targets and inv_nat in GCC)
        if hit:
            earned_w += 25
            matched.append("Nationality")
        else:
            unmatched.append("Nationality")

    if persona.get("target_sectors"):
        total_w += 20
        inv_s = (investor.get("sector") or "").lower()
        targets = [s.lower() for s in persona["target_sectors"]]
        if any(t and (t in inv_s or inv_s in t) for t in targets):
            earned_w += 20
            matched.append("Sector")
        else:
            unmatched.append("Sector")

    if persona.get("target_gender") and persona["target_gender"].lower() != "diverse":
        total_w += 10
        if (investor.get("gender") or "").lower() == persona["target_gender"].lower():
            earned_w += 10
            matched.append("Gender")
        else:
            unmatched.append("Gender")

    if persona.get("target_age_min") is not None:
        total_w += 10
        inv_age = investor.get("age")
        if inv_age is not None and inv_age >= persona["target_age_min"]:
            earned_w += 10
            matched.append("Age group")
        else:
            unmatched.append("Age group")

    score = round(earned_w / total_w * 100) if total_w > 0 else 0
    return {"score": score, "matched_fields": matched, "unmatched_fields": unmatched}


async def _score_with_ai(investor: dict, personas: list) -> list:
    """Score investor against all personas using Claude AI. Returns list of match results."""
    if not ANTHROPIC_AVAILABLE or not ANTHROPIC_API_KEY:
        return []
    client = _anthropic_lib.Anthropic(api_key=ANTHROPIC_API_KEY)
    investor_summary = {
        "name": investor.get("investor_name"),
        "investor_type": investor.get("investor_type"),
        "nationality": investor.get("nationality"),
        "country": investor.get("country"),
        "sector": investor.get("sector"),
        "gender": investor.get("gender"),
        "age": investor.get("age"),
        "wealth": investor.get("wealth"),
        "job_title": investor.get("job_title"),
        "description": investor.get("description"),
        "typical_ticket_size": investor.get("typical_ticket_size"),
    }
    personas_summary = [
        {
            "id": p["id"],
            "name": p["name"],
            "description": p.get("description"),
            "target_investor_type": p.get("target_investor_type"),
            "target_gender": p.get("target_gender"),
            "target_age_min": p.get("target_age_min"),
            "target_nationalities": p.get("target_nationalities"),
            "target_sectors": p.get("target_sectors"),
            "professional_goals": p.get("professional_goals"),
            "professional_frustrations": p.get("professional_frustrations"),
            "why_invest": p.get("why_invest"),
            "decision_making_process": p.get("decision_making_process"),
        }
        for p in personas
    ]
    prompt = (
        f"You are an investor analyst for a venture capital fund.\n"
        f"Score how well this investor matches each investor persona.\n\n"
        f"INVESTOR:\n{json.dumps(investor_summary, indent=2)}\n\n"
        f"PERSONAS:\n{json.dumps(personas_summary, indent=2)}\n\n"
        f"For each persona return:\n"
        f"- persona_id: the persona id\n"
        f"- score: integer 0-100\n"
        f"- reasoning: 1-2 sentences\n"
        f"- matched_attributes: list of attribute names that match\n"
        f"- gap_attributes: list of attributes that don't match\n\n"
        f"Return ONLY a valid JSON array, no markdown:\n"
        f'[{{"persona_id":"...","score":85,"reasoning":"...","matched_attributes":[...],"gap_attributes":[...]}}]'
    )
    msg = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    text = msg.content[0].text.strip()
    if text.startswith("```"):
        text = "\n".join(text.split("\n")[1:])
        text = text.rstrip("`").strip()
    return json.loads(text)


# ============== INVESTOR PERSONA ENDPOINTS ==============

@api_router.get("/funds/{fund_id}/personas")
async def list_personas(fund_id: str, user: dict = Depends(get_current_user)):
    """List all personas for a fund."""
    personas = await db.investor_personas.find({"fund_id": fund_id}, {"_id": 0}).to_list(100)
    return {"personas": personas}


@api_router.post("/funds/{fund_id}/personas")
async def create_persona(fund_id: str, body: InvestorPersonaCreate, user: dict = Depends(get_current_user)):
    """Create a new investor persona for a fund."""
    persona = InvestorPersona(
        **body.model_dump(),
        fund_id=fund_id,
        created_by=user["id"],
    )
    await db.investor_personas.insert_one(persona.model_dump())
    return {"success": True, "persona": persona.model_dump()}


@api_router.put("/funds/{fund_id}/personas/{persona_id}")
async def update_persona(
    fund_id: str,
    persona_id: str,
    body: InvestorPersonaUpdate,
    user: dict = Depends(get_current_user),
):
    """Update an existing persona."""
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.investor_personas.update_one(
        {"id": persona_id, "fund_id": fund_id},
        {"$set": updates},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Persona not found")
    updated = await db.investor_personas.find_one({"id": persona_id}, {"_id": 0})
    return {"success": True, "persona": updated}


@api_router.delete("/funds/{fund_id}/personas/{persona_id}")
async def delete_persona(fund_id: str, persona_id: str, user: dict = Depends(get_current_user)):
    """Delete a persona."""
    result = await db.investor_personas.delete_one({"id": persona_id, "fund_id": fund_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Persona not found")
    return {"success": True}


@api_router.post("/funds/{fund_id}/personas/match")
async def match_investor_to_personas(
    fund_id: str,
    body: PersonaMatchRequest,
    user: dict = Depends(get_current_user),
):
    """Score an investor against all fund personas. Uses Claude AI if API key is set, else rule-based."""
    investor = await db.investor_profiles.find_one({"id": body.investor_id}, {"_id": 0})
    if not investor:
        raise HTTPException(status_code=404, detail="Investor not found")

    personas = await db.investor_personas.find({"fund_id": fund_id}, {"_id": 0}).to_list(100)
    if not personas:
        return {"matches": [], "method": "none"}

    # Try AI scoring first
    if ANTHROPIC_AVAILABLE and ANTHROPIC_API_KEY:
        try:
            ai_results = await _score_with_ai(investor, personas)
            persona_map = {p["id"]: p["name"] for p in personas}
            matches = [
                {
                    "persona_id": r["persona_id"],
                    "persona_name": persona_map.get(r["persona_id"], "Unknown"),
                    "score": r.get("score", 0),
                    "reasoning": r.get("reasoning", ""),
                    "matched_fields": r.get("matched_attributes", []),
                    "unmatched_fields": r.get("gap_attributes", []),
                }
                for r in ai_results
            ]
            return {"matches": sorted(matches, key=lambda x: x["score"], reverse=True), "method": "ai"}
        except Exception:
            pass  # Fall through to rule-based

    # Rule-based fallback
    matches = []
    for persona in personas:
        result = _score_rule_based(investor, persona)
        matches.append({
            "persona_id": persona["id"],
            "persona_name": persona["name"],
            "score": result["score"],
            "reasoning": "",
            "matched_fields": result["matched_fields"],
            "unmatched_fields": result["unmatched_fields"],
        })
    return {"matches": sorted(matches, key=lambda x: x["score"], reverse=True), "method": "rule_based"}


@api_router.post("/funds/{fund_id}/personas/suggest")
async def suggest_personas(fund_id: str, user: dict = Depends(get_current_user)):
    """Suggest new personas based on investors not well matched to existing personas."""
    personas = await db.investor_personas.find({"fund_id": fund_id}, {"_id": 0}).to_list(100)
    investors = await db.investor_profiles.find({"fund_id": fund_id}, {"_id": 0}).to_list(500)

    if not investors:
        return {"suggestions": []}

    # Find investors with low match to any existing persona
    unmatched_investors = []
    for investor in investors:
        if not personas:
            unmatched_investors.append(investor)
            continue
        scores = [_score_rule_based(investor, p)["score"] for p in personas]
        if max(scores) < 50:
            unmatched_investors.append(investor)

    if not unmatched_investors:
        return {"suggestions": []}

    # Try AI suggestion
    if ANTHROPIC_AVAILABLE and ANTHROPIC_API_KEY and len(unmatched_investors) > 0:
        try:
            client = _anthropic_lib.Anthropic(api_key=ANTHROPIC_API_KEY)
            inv_summaries = [
                {
                    "investor_type": i.get("investor_type"),
                    "nationality": i.get("nationality"),
                    "sector": i.get("sector"),
                    "gender": i.get("gender"),
                    "age": i.get("age"),
                    "wealth": i.get("wealth"),
                    "job_title": i.get("job_title"),
                }
                for i in unmatched_investors[:50]
            ]
            existing_names = [p["name"] for p in personas]
            prompt = (
                f"You are an investor segmentation analyst.\n"
                f"These investors don't match any existing persona well.\n"
                f"Existing personas: {json.dumps(existing_names)}\n"
                f"Unmatched investors:\n{json.dumps(inv_summaries, indent=2)}\n\n"
                f"Identify 2-3 new investor persona archetypes from this data.\n"
                f"Return ONLY valid JSON array:\n"
                f'[{{"suggested_name":"...","description":"...","target_investor_type":"...","target_nationalities":[...],'
                f'"target_sectors":[...],"target_gender":"...","target_age_min":null,"professional_goals":"...","why_invest":"...",'
                f'"count":5,"example_investors":["name or description"]}}]'
            )
            msg = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=1500,
                messages=[{"role": "user", "content": prompt}],
            )
            text = msg.content[0].text.strip()
            if text.startswith("```"):
                text = "\n".join(text.split("\n")[1:]).rstrip("`").strip()
            suggestions = json.loads(text)
            return {"suggestions": suggestions, "method": "ai"}
        except Exception:
            pass

    # Rule-based fallback: cluster by (investor_type, nationality)
    from collections import Counter
    cluster_key = lambda i: (i.get("investor_type", ""), i.get("nationality", ""), i.get("sector", ""))
    counts = Counter(cluster_key(i) for i in unmatched_investors)
    suggestions = []
    for (itype, nat, sector), count in counts.most_common(3):
        if count < 1:
            continue
        name_parts = [p for p in [itype, nat, sector] if p]
        suggestions.append({
            "suggested_name": " — ".join(name_parts) if name_parts else "Investor Archetype",
            "description": f"{count} investor(s) share this profile but don't match existing personas.",
            "target_investor_type": itype or None,
            "target_nationalities": [nat] if nat else [],
            "target_sectors": [sector] if sector else [],
            "count": count,
            "example_investors": [
                i.get("investor_name", "Unknown")
                for i in unmatched_investors
                if cluster_key(i) == (itype, nat, sector)
            ][:3],
        })
    return {"suggestions": suggestions, "method": "rule_based"}


# ============== ADMIN PERSONA ANALYTICS ENDPOINTS ==============

@api_router.get("/admin/personas/all")
async def admin_get_all_personas(user: dict = Depends(get_current_user)):
    """Admin: all personas across all funds."""
    if user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")
    personas = await db.investor_personas.find({}, {"_id": 0}).to_list(1000)
    return {"personas": personas}


@api_router.get("/admin/personas/analytics")
async def admin_persona_analytics(user: dict = Depends(get_current_user)):
    """Admin: platform-wide persona health analytics."""
    if user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")

    funds = await db.funds.find({}, {"_id": 0}).to_list(200)
    all_personas = await db.investor_personas.find({}, {"_id": 0}).to_list(1000)
    all_investors = await db.investor_profiles.find({}, {"_id": 0}).to_list(5000)

    fund_id_to_name = {f["id"]: f["name"] for f in funds}
    persona_by_fund = {}
    for p in all_personas:
        persona_by_fund.setdefault(p["fund_id"], []).append(p)
    investor_by_fund = {}
    for inv in all_investors:
        investor_by_fund.setdefault(inv["fund_id"], []).append(inv)

    total_matched = 0
    total_unmatched = 0
    per_fund = []
    top_persona_counts = {}  # persona_id -> {name, fund_name, count, total_score}

    for fund in funds:
        fid = fund["id"]
        personas = persona_by_fund.get(fid, [])
        investors = investor_by_fund.get(fid, [])
        matched_count = 0
        unmatched_count = 0
        score_sum = 0

        for inv in investors:
            if not personas:
                unmatched_count += 1
                continue
            scores = []
            for p in personas:
                r = _score_rule_based(inv, p)
                scores.append((p["id"], r["score"]))
                top_pid, top_score = max(scores, key=lambda x: x[1])
            if top_score >= 50:
                matched_count += 1
                score_sum += top_score
                # Track persona counts
                if top_pid not in top_persona_counts:
                    pname = next((p["name"] for p in personas if p["id"] == top_pid), "Unknown")
                    top_persona_counts[top_pid] = {
                        "persona_id": top_pid,
                        "persona_name": pname,
                        "fund_name": fund_id_to_name.get(fid, ""),
                        "investor_count": 0,
                        "total_score": 0,
                    }
                top_persona_counts[top_pid]["investor_count"] += 1
                top_persona_counts[top_pid]["total_score"] += top_score
            else:
                unmatched_count += 1

        total_matched += matched_count
        total_unmatched += unmatched_count
        avg_score = round(score_sum / matched_count) if matched_count > 0 else 0
        per_fund.append({
            "fund_id": fid,
            "fund_name": fund_id_to_name.get(fid, ""),
            "persona_count": len(personas),
            "investor_count": len(investors),
            "matched_count": matched_count,
            "unmatched_count": unmatched_count,
            "avg_match_score": avg_score,
        })

    # Top personas sorted by investor_count
    top_personas = sorted(top_persona_counts.values(), key=lambda x: x["investor_count"], reverse=True)[:10]
    for tp in top_personas:
        tp["avg_score"] = round(tp["total_score"] / tp["investor_count"]) if tp["investor_count"] > 0 else 0
        del tp["total_score"]

    # Unmatched breakdown by investor_type
    from collections import Counter
    unmatched_investors = [
        inv for inv in all_investors
        if not investor_by_fund.get(inv["fund_id"])
        or not persona_by_fund.get(inv["fund_id"])
        or max(
            (_score_rule_based(inv, p)["score"] for p in persona_by_fund.get(inv["fund_id"], [])),
            default=0
        ) < 50
    ]
    type_counts = Counter(i.get("investor_type", "Unknown") for i in unmatched_investors)
    unmatched_breakdown = [
        {"investor_type": itype, "count": count}
        for itype, count in type_counts.most_common(10)
    ]

    return {
        "platform": {
            "total_personas": len(all_personas),
            "funds_with_personas": len([f for f in funds if persona_by_fund.get(f["id"])]),
            "total_funds": len(funds),
            "total_investors": len(all_investors),
            "matched_investors": total_matched,
            "unmatched_investors": total_unmatched,
        },
        "per_fund": per_fund,
        "top_personas": top_personas,
        "unmatched_breakdown": unmatched_breakdown,
    }


# ============== EMAIL TEMPLATE ROUTES ==============

@api_router.get("/funds/{fund_id}/email-templates")
async def list_email_templates(fund_id: str, user: dict = Depends(get_current_user)):
    templates = await db.email_templates.find(
        {"fund_id": fund_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    return {"templates": templates}

@api_router.post("/funds/{fund_id}/email-templates")
async def create_email_template(fund_id: str, data: EmailTemplateCreate, user: dict = Depends(get_current_user)):
    template = EmailTemplate(
        fund_id=fund_id,
        name=data.name,
        subject=data.subject,
        body=data.body,
        category=data.category,
        created_by=user["id"],
        created_by_name=f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
    )
    await db.email_templates.insert_one(template.model_dump())
    return template.model_dump()

@api_router.put("/email-templates/{template_id}")
async def update_email_template(template_id: str, data: EmailTemplateUpdate, user: dict = Depends(get_current_user)):
    existing = await db.email_templates.find_one({"id": template_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Template not found")
    update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.email_templates.update_one({"id": template_id}, {"$set": update_dict})
    updated = await db.email_templates.find_one({"id": template_id}, {"_id": 0})
    return updated

@api_router.delete("/email-templates/{template_id}")
async def delete_email_template(template_id: str, user: dict = Depends(get_current_user)):
    await db.email_templates.delete_one({"id": template_id})
    return {"success": True}

# ============== GMAIL HELPERS ==============

def _build_gmail_flow(client_id: str, client_secret: str, redirect_uri: str):
    """Build an OAuth2 flow from explicit credentials (not env vars)."""
    client_config = {
        "web": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [redirect_uri],
        }
    }
    flow = Flow.from_client_config(client_config, scopes=GMAIL_SCOPES)
    flow.redirect_uri = redirect_uri
    return flow

def _build_gmail_service(connection: dict, client_id: str, client_secret: str):
    """Build an authenticated Gmail service from stored tokens + credentials."""
    credentials = Credentials(
        token=connection["access_token"],
        refresh_token=connection.get("refresh_token"),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=client_id,
        client_secret=client_secret,
    )
    if credentials.expired and credentials.refresh_token:
        credentials.refresh(GoogleRequest())
    return google_build("gmail", "v1", credentials=credentials)

async def _load_user_gmail_creds(user_id: str):
    """Load per-user stored Gmail credentials from DB, fall back to env."""
    stored = await db.gmail_credentials.find_one({"user_id": user_id}, {"_id": 0})
    client_id = (stored or {}).get("client_id") or GOOGLE_CLIENT_ID
    client_secret = (stored or {}).get("client_secret") or GOOGLE_CLIENT_SECRET
    redirect_uri = (stored or {}).get("redirect_uri") or GOOGLE_REDIRECT_URI
    return client_id, client_secret, redirect_uri, bool(stored)

# ============== GMAIL ROUTES ==============

@api_router.post("/gmail/credentials")
async def save_gmail_credentials(data: GmailCredentialsSave, user: dict = Depends(get_current_user)):
    """Save user's Google OAuth2 credentials to DB — no .env editing needed."""
    await db.gmail_credentials.update_one(
        {"user_id": user["id"]},
        {"$set": {
            "user_id": user["id"],
            "client_id": data.client_id,
            "client_secret": data.client_secret,
            "redirect_uri": data.redirect_uri,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"success": True}

@api_router.get("/gmail/status")
async def get_gmail_status(user: dict = Depends(get_current_user)):
    connection = await db.gmail_connections.find_one({"user_id": user["id"]}, {"_id": 0})
    client_id, client_secret, _, has_stored = await _load_user_gmail_creds(user["id"])
    has_credentials = bool(client_id and client_secret and GMAIL_AVAILABLE)
    if not connection:
        return {"connected": False, "gmail_email": None, "has_credentials": has_credentials}
    return {
        "connected": True,
        "gmail_email": connection.get("gmail_email"),
        "connected_at": connection.get("connected_at"),
        "has_credentials": has_credentials,
    }

@api_router.get("/gmail/auth-url")
async def get_gmail_auth_url(user: dict = Depends(get_current_user)):
    if not GMAIL_AVAILABLE:
        raise HTTPException(400, "Google API libraries not installed")
    client_id, client_secret, redirect_uri, _ = await _load_user_gmail_creds(user["id"])
    if not client_id or not client_secret:
        raise HTTPException(400, "Gmail credentials not saved. Enter your Google Client ID and Secret first.")
    flow = _build_gmail_flow(client_id, client_secret, redirect_uri)
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        state=user["id"],
        prompt="consent",
    )
    return {"auth_url": auth_url}

@app.get("/api/gmail/callback")
async def gmail_oauth_callback(code: str = None, state: str = None, error: str = None):
    """OAuth2 redirect from Google — not JWT-protected. state = user_id."""
    frontend_url = FRONTEND_URL
    if error or not code or not state:
        return RedirectResponse(f"{frontend_url}?gmail_error={error or 'missing_params'}")
    try:
        client_id, client_secret, redirect_uri, _ = await _load_user_gmail_creds(state)
        if not client_id or not client_secret:
            return RedirectResponse(f"{frontend_url}?gmail_error=no_credentials")
        flow = _build_gmail_flow(client_id, client_secret, redirect_uri)
        flow.fetch_token(code=code)
        credentials = flow.credentials
        userinfo_service = google_build("oauth2", "v2", credentials=credentials)
        userinfo = userinfo_service.userinfo().get().execute()
        gmail_email = userinfo.get("email", "")
        await db.gmail_connections.update_one(
            {"user_id": state},
            {"$set": {
                "user_id": state,
                "access_token": credentials.token,
                "refresh_token": credentials.refresh_token,
                "token_expiry": credentials.expiry.isoformat() if credentials.expiry else None,
                "gmail_email": gmail_email,
                "connected_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True,
        )
        return RedirectResponse(f"{frontend_url}?gmail_connected=true")
    except Exception as e:
        logger.error(f"Gmail OAuth callback error: {e}")
        return RedirectResponse(f"{frontend_url}?gmail_error=auth_failed")

@api_router.delete("/gmail/disconnect")
async def disconnect_gmail(user: dict = Depends(get_current_user)):
    await db.gmail_connections.delete_one({"user_id": user["id"]})
    return {"success": True}

@api_router.get("/gmail/messages")
async def get_gmail_messages(
    fund_id: str = None,
    investor_id: str = None,
    limit: int = 30,
    user: dict = Depends(get_current_user),
):
    if not GMAIL_AVAILABLE:
        raise HTTPException(400, "Google API libraries not installed")
    connection = await db.gmail_connections.find_one({"user_id": user["id"]}, {"_id": 0})
    if not connection:
        raise HTTPException(400, "Gmail not connected")
    client_id, client_secret, _, _ = await _load_user_gmail_creds(user["id"])
    try:
        service = _build_gmail_service(connection, client_id, client_secret)
        query = ""
        if investor_id:
            investor = await db.investor_profiles.find_one({"id": investor_id}, {"_id": 0})
            if investor and investor.get("contact_email"):
                e = investor["contact_email"]
                query = f"from:{e} OR to:{e}"
        results = service.users().messages().list(userId="me", maxResults=limit, q=query).execute()

        investor_email_map = {}
        if fund_id:
            fund_investors = await db.investor_profiles.find(
                {"fund_id": fund_id, "contact_email": {"$exists": True, "$ne": ""}},
                {"_id": 0, "id": 1, "investor_name": 1, "contact_email": 1},
            ).to_list(500)
            for inv in fund_investors:
                if inv.get("contact_email"):
                    investor_email_map[inv["contact_email"].lower()] = {
                        "id": inv["id"], "name": inv["investor_name"]
                    }

        messages = []
        for msg_ref in results.get("messages", []):
            msg = service.users().messages().get(
                userId="me",
                id=msg_ref["id"],
                format="metadata",
                metadataHeaders=["Subject", "From", "To", "Date"],
            ).execute()
            headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
            from_raw = headers.get("From", "")
            to_raw = headers.get("To", "")
            linked_investor = None
            for email_addr, inv_info in investor_email_map.items():
                if email_addr in from_raw.lower() or email_addr in to_raw.lower():
                    linked_investor = inv_info
                    break
            messages.append({
                "id": msg_ref["id"],
                "thread_id": msg.get("threadId"),
                "subject": headers.get("Subject", "(No Subject)"),
                "from": from_raw,
                "to": to_raw,
                "date": headers.get("Date", ""),
                "snippet": msg.get("snippet", ""),
                "is_read": "UNREAD" not in msg.get("labelIds", []),
                "linked_investor": linked_investor,
            })
        return {"messages": messages, "total": len(messages)}
    except Exception as e:
        logger.error(f"Gmail fetch error: {e}")
        raise HTTPException(500, f"Failed to fetch emails: {str(e)}")

@api_router.post("/gmail/send")
async def send_gmail(data: GmailSendRequest, user: dict = Depends(get_current_user)):
    if not GMAIL_AVAILABLE:
        raise HTTPException(400, "Google API libraries not installed")
    connection = await db.gmail_connections.find_one({"user_id": user["id"]}, {"_id": 0})
    if not connection:
        raise HTTPException(400, "Gmail not connected")
    client_id, client_secret, _, _ = await _load_user_gmail_creds(user["id"])
    try:
        service = _build_gmail_service(connection, client_id, client_secret)
        message = MIMEMultipart("alternative")
        message["to"] = data.to
        message["subject"] = data.subject
        if data.cc:
            message["cc"] = data.cc
        message.attach(MIMEText(data.body, "plain"))
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        result = service.users().messages().send(userId="me", body={"raw": raw}).execute()
        await db.sent_emails.insert_one({
            "id": str(uuid.uuid4()),
            "message_id": result["id"],
            "user_id": user["id"],
            "investor_id": data.investor_id,
            "investor_name": data.investor_name,
            "to": data.to,
            "subject": data.subject,
            "body": data.body,
            "sent_at": datetime.now(timezone.utc).isoformat(),
        })
        return {"success": True, "message_id": result["id"]}
    except Exception as e:
        logger.error(f"Gmail send error: {e}")
        raise HTTPException(500, f"Failed to send email: {str(e)}")

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== STARTUP EVENT ==============

async def migrate_add_prospects_stage():
    """Add 'Prospects' stage as position 0 to any existing fund that doesn't have it.
    Shifts all existing stages up by 1 to make room."""
    funds = await db.funds.find({}, {"_id": 0, "id": 1}).to_list(1000)
    for fund in funds:
        existing = await db.pipeline_stages.find_one(
            {"fund_id": fund["id"], "name": "Prospects"}
        )
        if not existing:
            # Shift all existing stages up by 1
            existing_stages = await db.pipeline_stages.find(
                {"fund_id": fund["id"]}, {"_id": 0}
            ).to_list(100)
            for s in existing_stages:
                await db.pipeline_stages.update_one(
                    {"id": s["id"]},
                    {"$set": {"position": s["position"] + 1}}
                )
            # Insert Prospects at position 0
            stage = PipelineStage(
                fund_id=fund["id"], name="Prospects", position=0, is_default=False
            )
            await db.pipeline_stages.insert_one(stage.model_dump())
            logger.info(f"Added Prospects stage to fund {fund['id']}")

# ============== FEEDBACK ENDPOINTS ==============

@api_router.post("/feedback")
async def submit_feedback(data: UserFeedbackCreate, user: dict = Depends(get_current_user)):
    feedback = UserFeedback(
        **data.model_dump(),
        user_id=user["id"],
        user_email=user.get("email", ""),
        user_name=f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
        user_role=user.get("role", ""),
    )
    await db.user_feedback.insert_one(feedback.model_dump())
    return {"success": True, "id": feedback.id}

@api_router.get("/admin/feedback")
async def get_all_feedback(user: dict = Depends(get_current_user)):
    if user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin only")
    responses = await db.user_feedback.find({}, {"_id": 0}).sort("submitted_at", -1).to_list(1000)
    return {"responses": responses, "total": len(responses)}

@app.on_event("startup")
async def startup_event():
    """Seed admin user on startup and run migrations"""
    admin_email = "khaled@alknzventures.com"
    admin_password = "Admin123!"

    existing_admin = await db.users.find_one({"email": admin_email})
    if not existing_admin:
        admin_user = User(
            first_name="Khaled",
            last_name="Admin",
            email=admin_email,
            role="ADMIN",
            status="ACTIVE",
            password_hash=hash_password(admin_password),
            must_reset_password=False
        )
        await db.users.insert_one(admin_user.model_dump())
        logger.info(f"Admin user created: {admin_email}")
    else:
        logger.info(f"Admin user already exists: {admin_email}")

    # Run migrations
    await migrate_add_prospects_stage()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
