#!/usr/bin/env python3
"""
ALKNZ Demo Data Seed Script
─────────────────────────────────────────────────────────────────────────────
Populates the database with realistic demo accounts and GCC-focused investor
data so new users can explore every feature of the portal immediately.

Run:
    cd backend && python seed_demo.py

Idempotent: safe to run multiple times (skips if demo emails already exist).
─────────────────────────────────────────────────────────────────────────────
"""

import os
import uuid
import bcrypt
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from pymongo import MongoClient

# ── Config ─────────────────────────────────────────────────────────────────
load_dotenv()
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME   = os.getenv("DB_NAME", "alknz_db")

DEMO_ADMIN_EMAIL    = "admin@demo.alknz.io"
DEMO_ADMIN_PASSWORD = "Demo@Admin1"
DEMO_FM_EMAIL       = "sara@demo.alknz.io"
DEMO_FM_PASSWORD    = "Demo@FM2024"

# ── Helpers ─────────────────────────────────────────────────────────────────
def now_iso():
    return datetime.now(timezone.utc).isoformat()

def future_date(days: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).strftime("%Y-%m-%d")

def past_iso(days: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

def gen_id() -> str:
    return str(uuid.uuid4())

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]

    # Idempotency guard
    if db.users.find_one({"email": DEMO_FM_EMAIL}):
        print("Demo data already exists. Skipping.")
        print(f"  Admin:        {DEMO_ADMIN_EMAIL} / {DEMO_ADMIN_PASSWORD}")
        print(f"  Fund Manager: {DEMO_FM_EMAIL} / {DEMO_FM_PASSWORD}")
        client.close()
        return

    print("Seeding demo data…\n")

    # ── 1. Users ─────────────────────────────────────────────────────────────
    admin_id = gen_id()
    fm_id    = gen_id()

    db.users.insert_many([
        {
            "id": admin_id,
            "first_name": "Demo",
            "last_name": "Admin",
            "email": DEMO_ADMIN_EMAIL,
            "role": "ADMIN",
            "status": "ACTIVE",
            "password_hash": hash_password(DEMO_ADMIN_PASSWORD),
            "must_reset_password": False,
            "avatar_url": None,
            "office_id": None,
            "assigned_funds": [],
            "created_at": now_iso(),
            "updated_at": now_iso(),
            "last_login": None,
        },
        {
            "id": fm_id,
            "first_name": "Sara",
            "last_name": "Al-Rashid",
            "email": DEMO_FM_EMAIL,
            "role": "FUND_MANAGER",
            "status": "ACTIVE",
            "password_hash": hash_password(DEMO_FM_PASSWORD),
            "must_reset_password": False,
            "avatar_url": None,
            "office_id": None,
            "assigned_funds": [],   # updated after fund is created
            "created_at": now_iso(),
            "updated_at": now_iso(),
            "last_login": None,
        },
    ])
    print("  ✓  Users created")

    # ── 2. Fund ───────────────────────────────────────────────────────────────
    fund_id = gen_id()
    db.funds.insert_one({
        "id": fund_id,
        "name": "Watheeq Proptech SPV II",
        "office_id": None,
        "fund_type": "SPV",
        "vintage_year": 2024,
        "currency": "SAR",
        "target_raise": 50_000_000.0,
        "target_date": "2025-12-31",
        "status": "Active",
        "thesis": (
            "A sector-specific vehicle targeting GCC proptech operators and "
            "high-growth real estate platforms with institutional-grade governance "
            "and quarterly LP reporting."
        ),
        "primary_sectors": ["Real Estate", "PropTech", "Infrastructure"],
        "focus_regions": ["GCC", "Saudi Arabia", "UAE"],
        "stage_focus": ["Growth", "Late Stage"],
        "min_commitment": 500_000.0,
        "typical_check_min": 1_000_000.0,
        "typical_check_max": 20_000_000.0,
        "esg_policy": "ESG Integrated",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    })
    # Assign FM
    db.users.update_one({"id": fm_id}, {"$set": {"assigned_funds": [fund_id]}})
    print("  ✓  Fund created and assigned to Sara Al-Rashid")

    # ── 3. Pipeline Stages ────────────────────────────────────────────────────
    DEFAULT_STAGES = [
        ("Prospects",               0,  True),
        ("Investors",               1,  False),
        ("Intro Email",             2,  False),
        ("Opportunity Email",       3,  False),
        ("Phone Call",              4,  False),
        ("First Meeting",           5,  False),
        ("Second Meeting",          6,  False),
        ("Follow Up Email",         7,  False),
        ("Signing Contract",        8,  False),
        ("Signing Subscription",    9,  False),
        ("Letter for Capital Call", 10, False),
        ("Money Transfer",          11, False),
        ("Transfer Date",           12, False),
    ]
    stage_map: dict[str, str] = {}   # stage name → stage id
    db.pipeline_stages.insert_many([
        (lambda sid: stage_map.update({name: sid}) or {
            "id": sid,
            "fund_id": fund_id,
            "name": name,
            "position": pos,
            "is_default": is_def,
            "created_at": now_iso(),
        })(gen_id())
        for name, pos, is_def in DEFAULT_STAGES
    ])
    print("  ✓  Pipeline stages created (13 stages)")

    # ── 4. Investor Profiles ──────────────────────────────────────────────────
    INVESTORS = [
        dict(
            name="Faisal Al-Otaibi", gender="Male", nationality="Saudi Arabia",
            stage="First Meeting", relationship="warm", ticket=2_000_000.0,
            job_title="Managing Director", firm="Al-Otaibi Investment Group",
            sector="Real Estate", city="Riyadh", country="Saudi Arabia", age=48,
            email="f.alotaibi@aoig.com.sa", phone="+966501234567",
            decision_role="decision_maker", intro_path="LinkedIn", wealth="SAR 50M+",
            description=(
                "Senior real estate investor with 20+ years in GCC markets. Focuses on commercial "
                "and residential PropTech plays with a strong interest in NEOM-adjacent ventures. "
                "Previously co-invested in two GCC real estate SPVs."
            ),
            linkedin="https://linkedin.com/in/faisal-alotaibi",
        ),
        dict(
            name="Noura Al-Saud", gender="Female", nationality="Saudi Arabia",
            stage="Second Meeting", relationship="direct", ticket=5_000_000.0,
            job_title="Principal Investor", firm="Kingdom Holding — Personal Portfolio",
            sector="Real Estate", city="Riyadh", country="Saudi Arabia", age=42,
            email="noura.alsaud@kh-invest.com", phone="+966502345678",
            decision_role="decision_maker", intro_path="Direct Introduction", wealth="SAR 100M+",
            description=(
                "High-conviction PropTech investor with a direct mandate from a major Saudi family. "
                "Has co-invested in three previous PropTech SPVs. Expects detailed financial modelling "
                "and scenario analysis before committing."
            ),
            linkedin="https://linkedin.com/in/noura-alsaud-invest",
        ),
        dict(
            name="Mohammed Al-Ghamdi", gender="Male", nationality="Saudi Arabia",
            stage="Prospects", relationship="cold", ticket=10_000_000.0,
            job_title="Chief Investment Officer", firm="Al-Ghamdi Family Office",
            sector="Real Estate", city="Jeddah", country="Saudi Arabia", age=55,
            email="m.alghamdi@agfo.com", phone="+966503456789",
            decision_role="decision_maker", intro_path="Referral", wealth="SAR 400M+",
            description=(
                "Long-established Jeddah family office with SAR 400M+ AUM. Historically invested in "
                "traditional real estate; exploring PropTech as a modernisation play. Requires extensive "
                "due diligence and references from existing LPs."
            ),
            linkedin="https://linkedin.com/in/alghamdi-cio",
        ),
        dict(
            name="Rania Khalil", gender="Female", nationality="UAE",
            stage="Intro Email", relationship="warm", ticket=1_500_000.0,
            job_title="Investment Director", firm="Dubai Future Fund",
            sector="PropTech", city="Dubai", country="UAE", age=37,
            email="r.khalil@dff.ae", phone="+971501234567",
            decision_role="influencer", intro_path="LinkedIn", wealth="AED 10M+",
            description=(
                "Tech-forward investor at one of Dubai's emerging sovereign-adjacent funds. "
                "Has been tracking GCC PropTech since 2021. Interested in the B2B SaaS layer "
                "of property management. Ticket size may scale up post-first-call."
            ),
            linkedin="https://linkedin.com/in/rania-khalil-invest",
        ),
        dict(
            name="Khalid Bin Talal", gender="Male", nationality="Saudi Arabia",
            stage="Opportunity Email", relationship="warm", ticket=8_000_000.0,
            job_title="CEO", firm="Bin Talal Capital",
            sector="Real Estate", city="Riyadh", country="Saudi Arabia", age=51,
            email="k.bintalal@bincapital.com.sa", phone="+966504567890",
            decision_role="decision_maker", intro_path="Warm Introduction", wealth="SAR 200M+",
            description=(
                "Bin Talal Capital manages SAR 200M+ in diversified real estate and private equity. "
                "Khalid personally oversees all alternative investment mandates above SAR 5M. "
                "Responsive to pitch decks and prefers structured presentations."
            ),
            linkedin="https://linkedin.com/in/khalid-bintalal",
        ),
        dict(
            name="Aisha Al-Mansoori", gender="Female", nationality="UAE",
            stage="Phone Call", relationship="warm", ticket=2_500_000.0,
            job_title="Partner", firm="Mansoori Capital Partners",
            sector="Real Estate", city="Abu Dhabi", country="UAE", age=44,
            email="a.almansoori@mansooricap.ae", phone="+971502345678",
            decision_role="decision_maker", intro_path="Conference", wealth="AED 25M+",
            description=(
                "Abu Dhabi-based partner in a boutique real estate private equity firm. Strong network "
                "across MENA institutional LPs. Met at the Future Investment Initiative 2023. "
                "Interested in real estate data and analytics platforms."
            ),
            linkedin="https://linkedin.com/in/aisha-almansoori",
        ),
        dict(
            name="Abdullah Al-Qahtani", gender="Male", nationality="Saudi Arabia",
            stage="Follow Up Email", relationship="direct", ticket=15_000_000.0,
            job_title="Chief Financial Officer", firm="Saudi Infrastructure Corp",
            sector="Infrastructure", city="Riyadh", country="Saudi Arabia", age=49,
            email="a.alqahtani@sic.com.sa", phone="+966505678901",
            decision_role="decision_maker", intro_path="Board Introduction", wealth="Corporate",
            description=(
                "CFO of a major Saudi state-affiliated infrastructure group with direct board mandate "
                "to allocate SAR 50M+ in PropTech and real estate technology annually. "
                "Allocation already approved internally; awaiting final term sheet."
            ),
            linkedin="https://linkedin.com/in/abdullah-alqahtani-cfo",
        ),
        dict(
            name="Layla Hassan", gender="Female", nationality="Bahrain",
            stage="Prospects", relationship="cold", ticket=1_000_000.0,
            job_title="Director", firm="Bahrain Investment Group",
            sector="Real Estate", city="Manama", country="Bahrain", age=39,
            email="l.hassan@big.bh", phone="+97337812345",
            decision_role="influencer", intro_path="LinkedIn", wealth="BHD 1M+",
            description=(
                "Investment director at a Bahrain-based family-backed group. Initial interest from "
                "LinkedIn outreach. Focuses on cross-border GCC real estate opportunities. "
                "Needs to understand the Bahrain regulatory angle before committing."
            ),
            linkedin="https://linkedin.com/in/layla-hassan-bh",
        ),
        dict(
            name="Omar Al-Farsi", gender="Male", nationality="Oman",
            stage="Investors", relationship="warm", ticket=6_000_000.0,
            job_title="Managing Partner", firm="Al-Farsi Investments",
            sector="Real Estate", city="Muscat", country="Oman", age=53,
            email="o.alfarsi@alfarsi-invest.com", phone="+96891234567",
            decision_role="decision_maker", intro_path="Referral", wealth="USD 80M+",
            description=(
                "Second-generation family office managing USD 80M in real estate and private equity. "
                "Previously invested in Watheeq Proptech SPV I. Strong relationship with the firm; "
                "awaiting updated investment memo before confirming participation."
            ),
            linkedin="https://linkedin.com/in/omar-alfarsi",
        ),
        dict(
            name="Dina Al-Rashidi", gender="Female", nationality="Kuwait",
            stage="Signing Contract", relationship="direct", ticket=3_000_000.0,
            job_title="Investment Manager", firm="Kuwait Real Estate Holdings",
            sector="PropTech", city="Kuwait City", country="Kuwait", age=41,
            email="d.alrashidi@kreh.kw", phone="+96566123456",
            decision_role="decision_maker", intro_path="Direct Introduction", wealth="KWD 2M+",
            description=(
                "Committed investor with subscription agreement under review. Signed LOI two weeks ago. "
                "Focused on property management SaaS plays in the Gulf. Wire details on file; "
                "waiting for countersigned documents from legal team."
            ),
            linkedin="https://linkedin.com/in/dina-alrashidi",
        ),
        dict(
            name="Tariq Bin Sultan", gender="Male", nationality="Saudi Arabia",
            stage="Money Transfer", relationship="direct", ticket=20_000_000.0,
            job_title="Managing Director", firm="Riyadh Development Authority",
            sector="Real Estate", city="Riyadh", country="Saudi Arabia", age=47,
            email="t.binsultan@rda.gov.sa", phone="+966507890123",
            decision_role="decision_maker", intro_path="Government Channel", wealth="Corporate",
            description=(
                "Strategic corporate LP with a Vision 2030 mandate to invest in real estate technology. "
                "The largest single allocation in the fund. Wire instructions confirmed; "
                "transfer pending central bank clearance — expected within 5 business days."
            ),
            linkedin="https://linkedin.com/in/tariq-binsultan",
        ),
        dict(
            name="Hessa Al-Dosari", gender="Female", nationality="Qatar",
            stage="First Meeting", relationship="warm", ticket=2_000_000.0,
            job_title="Head of Alternatives", firm="Qatar National Portfolio",
            sector="Real Estate", city="Doha", country="Qatar", age=36,
            email="h.aldosari@qnp.qa", phone="+97450123456",
            decision_role="influencer", intro_path="Conference", wealth="QAR 10M+",
            description=(
                "Rising star in Qatari institutional investing. Heads the alternatives sleeve of a "
                "state-adjacent investment office. First meeting via Zoom — warm intro from a mutual "
                "contact at FII. Preliminary interest confirmed."
            ),
            linkedin="https://linkedin.com/in/hessa-aldosari",
        ),
    ]

    INVESTOR_TYPES = {
        "Mohammed Al-Ghamdi":  "Family Office",
        "Khalid Bin Talal":    "Family Office",
        "Omar Al-Farsi":       "Family Office",
        "Abdullah Al-Qahtani": "Corporate",
        "Tariq Bin Sultan":    "Corporate",
    }

    investor_ids: dict[str, str] = {}
    ts = now_iso()
    investors_to_insert = []
    for inv in INVESTORS:
        iid = gen_id()
        investor_ids[inv["name"]] = iid
        investors_to_insert.append({
            "id": iid,
            "fund_id": fund_id,
            "office_id": None,
            "investor_name": inv["name"],
            "title": "Mr." if inv["gender"] == "Male" else "Ms.",
            "gender": inv["gender"],
            "nationality": inv["nationality"],
            "age": inv["age"],
            "job_title": inv["job_title"],
            "investor_type": INVESTOR_TYPES.get(inv["name"], "Individual"),
            "sector": inv["sector"],
            "country": inv["country"],
            "city": inv["city"],
            "description": inv["description"],
            "website": None,
            "linkedin_url": inv["linkedin"],
            "firm_name": inv["firm"],
            "wealth": inv["wealth"],
            "has_invested_with_alknz": inv["stage"] in ("Money Transfer", "Transfer Date"),
            "has_invested_override": False,
            "previous_alknz_funds": ["Watheeq Proptech SPV I"] if inv["stage"] in ("Money Transfer",) else [],
            "expected_ticket_amount": inv["ticket"],
            "expected_ticket_currency": "SAR",
            "typical_ticket_size": inv["ticket"],
            "investment_size": None,
            "investment_size_currency": "SAR",
            "contact_name": inv["name"],
            "contact_title": inv["job_title"],
            "contact_phone": inv["phone"],
            "contact_email": inv["email"],
            "contact_whatsapp": inv["phone"],
            "alknz_point_of_contact_id": fm_id,
            "relationship_strength": inv["relationship"],
            "decision_role": inv["decision_role"],
            "preferred_intro_path": inv["intro_path"],
            "source": "manual",
            "created_by": fm_id,
            "created_at": ts,
            "updated_at": ts,
        })
    db.investor_profiles.insert_many(investors_to_insert)
    print(f"  ✓  {len(investors_to_insert)} investor profiles created")

    # ── 5. Pipeline Entries ───────────────────────────────────────────────────
    pipeline_entries = []
    for i, inv in enumerate(INVESTORS):
        pipeline_entries.append({
            "id": gen_id(),
            "fund_id": fund_id,
            "investor_id": investor_ids[inv["name"]],
            "stage_id": stage_map[inv["stage"]],
            "position": i,
            "stage_entered_at": past_iso(max(1, 14 - i * 2)),
        })
    db.investor_pipeline.insert_many(pipeline_entries)
    print("  ✓  Pipeline entries created")

    # ── 6. Tasks ──────────────────────────────────────────────────────────────
    TASKS = [
        # Faisal — First Meeting
        ("Faisal Al-Otaibi",   "First Meeting",       "Prepare detailed fund presentation",              "high",   2),
        ("Faisal Al-Otaibi",   "First Meeting",       "Research prior real estate portfolio holdings",   "medium", 4),
        # Noura — Second Meeting
        ("Noura Al-Saud",      "Second Meeting",      "Send financial model (base / bull / bear)",       "high",   1),
        ("Noura Al-Saud",      "Second Meeting",      "Confirm soft commitment amount SAR 5M",           "high",   3),
        ("Noura Al-Saud",      "Second Meeting",      "Share cap table structure and waterfall model",   "medium", 4),
        # Mohammed — Prospects
        ("Mohammed Al-Ghamdi", "Prospects",           "Research Al-Ghamdi Family Office background",    "medium", 5),
        ("Mohammed Al-Ghamdi", "Prospects",           "Identify warm intro path via Jeddah network",    "high",   7),
        # Rania — Intro Email
        ("Rania Khalil",       "Intro Email",         "Draft personalised intro email for DFF",         "high",   1),
        ("Rania Khalil",       "Intro Email",         "Attach teaser deck (PropTech SaaS focus)",       "medium", 2),
        # Khalid — Opportunity Email
        ("Khalid Bin Talal",   "Opportunity Email",   "Send full pitch deck to Bin Talal Capital",      "high",   1),
        ("Khalid Bin Talal",   "Opportunity Email",   "Confirm NDA requirement with legal",             "medium", 3),
        # Aisha — Phone Call
        ("Aisha Al-Mansoori",  "Phone Call",          "Prepare call agenda for Abu Dhabi meeting",      "high",   1),
        ("Aisha Al-Mansoori",  "Phone Call",          "Log call notes and level of interest",           "high",   2),
        # Abdullah — Follow Up Email
        ("Abdullah Al-Qahtani","Follow Up Email",     "Send allocation confirmation summary",            "high",   1),
        ("Abdullah Al-Qahtani","Follow Up Email",     "Address SAR 15M commitment timeline question",   "high",   2),
        # Dina — Signing Contract
        ("Dina Al-Rashidi",    "Signing Contract",    "Send subscription agreement for review",         "high",   1),
        ("Dina Al-Rashidi",    "Signing Contract",    "Confirm entity name and wire instructions",      "high",   2),
        ("Dina Al-Rashidi",    "Signing Contract",    "Collect countersigned subscription documents",   "high",   5),
        # Tariq — Money Transfer
        ("Tariq Bin Sultan",   "Money Transfer",      "Confirm SAR 20M wire instruction sent",         "high",   1),
        ("Tariq Bin Sultan",   "Money Transfer",      "Match incoming funds to investor record",        "high",   3),
        ("Tariq Bin Sultan",   "Money Transfer",      "Update total committed capital figure",          "medium", 4),
        # Hessa — First Meeting
        ("Hessa Al-Dosari",    "First Meeting",       "Send Zoom link and agenda to Hessa",            "high",   1),
        ("Hessa Al-Dosari",    "First Meeting",       "Customise slides for Qatar institutional lens",  "medium", 2),
        # Omar — Investors
        ("Omar Al-Farsi",      "Investors",           "Validate Al-Farsi contact information",         "high",   3),
        ("Omar Al-Farsi",      "Investors",           "Prepare intro blurb referencing SPV I history", "medium", 5),
        # Layla — Prospects
        ("Layla Hassan",       "Prospects",           "Confirm geography alignment with BIG mandate",   "medium", 7),
    ]
    tasks_to_insert = []
    for investor_name, stage_name, title, priority, days in TASKS:
        tasks_to_insert.append({
            "id": gen_id(),
            "fund_id": fund_id,
            "title": title,
            "stage_id": stage_map[stage_name],
            "stage_name": stage_name,
            "investor_id": investor_ids[investor_name],
            "investor_name": investor_name,
            "priority": priority,
            "due_date": future_date(days),
            "status": "open",
            "is_auto_generated": False,
            "created_by": fm_id,
            "created_by_name": "Sara Al-Rashid",
            "created_at": now_iso(),
            "updated_at": now_iso(),
        })
    db.user_tasks.insert_many(tasks_to_insert)
    print(f"  ✓  {len(tasks_to_insert)} tasks created")

    # ── 7. Personas ───────────────────────────────────────────────────────────
    db.investor_personas.insert_many([
        {
            "id": gen_id(),
            "fund_id": fund_id,
            "name": "GCC Real Estate HNWI",
            "description": (
                "High-net-worth individuals from the GCC with a strong real estate background "
                "and preference for direct property-adjacent investments. Typically 40+, Arabic-speaking, "
                "and motivated by Vision 2030-aligned opportunities with familiar asset classes."
            ),
            "target_investor_type": "Individual",
            "target_gender": "Diverse",
            "target_age_min": 40,
            "target_nationalities": ["Saudi Arabia", "UAE", "Kuwait"],
            "target_sectors": ["Real Estate", "Infrastructure"],
            "professional_goals": "Preserve family wealth while participating in the GCC real estate digitisation wave",
            "professional_frustrations": "Lack of institutional-quality deal flow in the mid-market PropTech space",
            "why_invest": "Vision 2030 tailwinds, familiar asset class, and co-investment rights",
            "decision_making_process": "Personal decision with spouse/family consultation; moves quickly when thesis is clear",
            "min_ticket_size": 1_000_000.0,
            "max_ticket_size": 5_000_000.0,
            "created_by": fm_id,
            "created_at": now_iso(),
            "updated_at": now_iso(),
        },
        {
            "id": gen_id(),
            "fund_id": fund_id,
            "name": "Family Office LP",
            "description": (
                "Established GCC family offices with professional investment teams and board-level governance. "
                "Typically investing across multiple alternative asset classes and seeking long-term capital "
                "preservation alongside PropTech exposure as a modernisation play."
            ),
            "target_investor_type": "Family Office",
            "target_gender": "Diverse",
            "target_age_min": 45,
            "target_nationalities": ["Saudi Arabia", "Bahrain", "Qatar", "Oman"],
            "target_sectors": ["Real Estate", "PropTech"],
            "professional_goals": "Diversify AUM into digital real estate infrastructure with a 5–7 year horizon",
            "professional_frustrations": "Lack of GCC-native GPs with institutional reporting and governance standards",
            "why_invest": "Access to a sector-specialist GP with a track record, quarterly reporting, and LPAC governance",
            "decision_making_process": "Investment committee review (4–8 weeks); requires audited financials and legal opinion",
            "min_ticket_size": 5_000_000.0,
            "max_ticket_size": 20_000_000.0,
            "created_by": fm_id,
            "created_at": now_iso(),
            "updated_at": now_iso(),
        },
    ])
    print("  ✓  Personas created (2)")

    # ── 8. Call Logs ─────────────────────────────────────────────────────────
    db.call_logs.insert_many([
        {
            "id": gen_id(),
            "fund_id": fund_id,
            "investor_id": investor_ids["Faisal Al-Otaibi"],
            "investor_name": "Faisal Al-Otaibi",
            "call_datetime": past_iso(3),
            "outcome": "interested",
            "notes": (
                "Faisal confirmed strong alignment with the PropTech thesis. Particularly interested in the "
                "property management SaaS vertical and the NEOM-adjacent plays in the pipeline. Requested a "
                "detailed deck before the first meeting. Positive on the SAR 2M allocation."
            ),
            "next_step": "Send customised deck with PropTech SaaS deep-dive before meeting",
            "task_created": False,
            "task_id": None,
            "created_by": fm_id,
            "created_by_name": "Sara Al-Rashid",
            "created_at": past_iso(3),
            "updated_at": past_iso(3),
        },
        {
            "id": gen_id(),
            "fund_id": fund_id,
            "investor_id": investor_ids["Mohammed Al-Ghamdi"],
            "investor_name": "Mohammed Al-Ghamdi",
            "call_datetime": past_iso(7),
            "outcome": "follow_up_needed",
            "notes": (
                "Cold first call. Mohammed was polite but cautious. The family office has not done PropTech "
                "before. He wants to understand the regulatory framework for digital real estate in Saudi Arabia. "
                "Asked specifically about REGA compliance. Follow-up in 2 weeks with regulatory overview."
            ),
            "next_step": "Send PropTech regulatory overview and REGA 2024 update document",
            "task_created": False,
            "task_id": None,
            "created_by": fm_id,
            "created_by_name": "Sara Al-Rashid",
            "created_at": past_iso(7),
            "updated_at": past_iso(7),
        },
        {
            "id": gen_id(),
            "fund_id": fund_id,
            "investor_id": investor_ids["Dina Al-Rashidi"],
            "investor_name": "Dina Al-Rashidi",
            "call_datetime": past_iso(1),
            "outcome": "connected",
            "notes": (
                "Very positive call. Dina confirmed SAR 3M allocation subject to subscription agreement review. "
                "Wire details already on file. Legal team is reviewing the LPA and expects sign-off within the week."
            ),
            "next_step": "Send subscription agreement and follow-up on legal review",
            "task_created": False,
            "task_id": None,
            "created_by": fm_id,
            "created_by_name": "Sara Al-Rashid",
            "created_at": past_iso(1),
            "updated_at": past_iso(1),
        },
        {
            "id": gen_id(),
            "fund_id": fund_id,
            "investor_id": investor_ids["Omar Al-Farsi"],
            "investor_name": "Omar Al-Farsi",
            "call_datetime": past_iso(5),
            "outcome": "no_answer",
            "notes": (
                "No answer on mobile. Left a voicemail referencing our previous collaboration on SPV I. "
                "Sent a WhatsApp follow-up message with a brief update. Will retry next week."
            ),
            "next_step": "Retry call next Tuesday; send updated investment memo via WhatsApp",
            "task_created": False,
            "task_id": None,
            "created_by": fm_id,
            "created_by_name": "Sara Al-Rashid",
            "created_at": past_iso(5),
            "updated_at": past_iso(5),
        },
    ])
    print("  ✓  Call logs created (4)")

    # ── 9. Email Templates ────────────────────────────────────────────────────
    db.email_templates.insert_many([
        {
            "id": gen_id(),
            "fund_id": fund_id,
            "name": "Introductory Email",
            "subject": "Introducing Watheeq Proptech SPV II — A GCC Real Estate Technology Opportunity",
            "body": (
                "Dear {{investor_name}},\n\n"
                "I hope this message finds you well.\n\n"
                "My name is {{sender_name}} from Watheeq Ventures. I am writing to introduce an exciting "
                "investment opportunity that I believe aligns closely with your investment mandate.\n\n"
                "Watheeq Proptech SPV II is a sector-specific vehicle targeting high-growth GCC PropTech "
                "and real estate technology platforms, with a target raise of SAR 50 million. We are "
                "focusing on companies reshaping property management, transaction platforms, and real "
                "estate data infrastructure across Saudi Arabia and the UAE.\n\n"
                "Given your expertise and market positioning, I believe this opportunity deserves your "
                "attention. I would love to share our investment thesis and portfolio pipeline.\n\n"
                "Would you be open to a 30-minute introductory call this week or next?\n\n"
                "Warm regards,\n{{sender_name}}\nWatheeq Ventures"
            ),
            "category": "Introduction",
            "created_by": fm_id,
            "created_by_name": "Sara Al-Rashid",
            "created_at": now_iso(),
            "updated_at": now_iso(),
        },
        {
            "id": gen_id(),
            "fund_id": fund_id,
            "name": "Follow-Up Email",
            "subject": "Following Up — Watheeq Proptech SPV II",
            "body": (
                "Dear {{investor_name}},\n\n"
                "I wanted to follow up on our recent conversation regarding Watheeq Proptech SPV II.\n\n"
                "As discussed, we are targeting a close date of Q4 2025, and allocation slots are filling "
                "up quickly. I wanted to ensure you have all the materials needed to make a confident decision.\n\n"
                "Attached, please find:\n"
                "  •  Updated investor deck\n"
                "  •  Q3 portfolio performance summary\n"
                "  •  Draft subscription agreement (for reference)\n\n"
                "Please do not hesitate to reach out with any questions. I am happy to arrange a call "
                "at your convenience.\n\n"
                "Warm regards,\n{{sender_name}}\nWatheeq Ventures"
            ),
            "category": "Follow-up",
            "created_by": fm_id,
            "created_by_name": "Sara Al-Rashid",
            "created_at": now_iso(),
            "updated_at": now_iso(),
        },
        {
            "id": gen_id(),
            "fund_id": fund_id,
            "name": "Meeting Request",
            "subject": "Meeting Request — Watheeq Proptech SPV II Deep Dive",
            "body": (
                "Dear {{investor_name}},\n\n"
                "Thank you for your continued interest in Watheeq Proptech SPV II.\n\n"
                "I would love to schedule a detailed 60-minute session to walk you through our portfolio "
                "companies, the GCC PropTech market thesis, and our exit strategy.\n\n"
                "Please let me know your availability for the following slots:\n"
                "  •  [Date Option 1]\n"
                "  •  [Date Option 2]\n"
                "  •  [Date Option 3]\n\n"
                "Alternatively, feel free to book directly: [Calendar Link]\n\n"
                "I look forward to speaking with you.\n\n"
                "Best regards,\n{{sender_name}}\nWatheeq Ventures"
            ),
            "category": "Meeting Request",
            "created_by": fm_id,
            "created_by_name": "Sara Al-Rashid",
            "created_at": now_iso(),
            "updated_at": now_iso(),
        },
        {
            "id": gen_id(),
            "fund_id": fund_id,
            "name": "Capital Call Letter",
            "subject": "Capital Call Notice — Watheeq Proptech SPV II",
            "body": (
                "Dear {{investor_name}},\n\n"
                "As committed, we are pleased to issue this capital call in accordance with your "
                "subscription agreement for Watheeq Proptech SPV II.\n\n"
                "Capital Call Details:\n"
                "  •  Committed Amount:       SAR [Amount]\n"
                "  •  This Call Amount:       SAR [Call Amount]\n"
                "  •  Wire Deadline:          [Date]\n\n"
                "Please wire funds to:\n"
                "  Bank:           [Bank Name]\n"
                "  Account Name:   Watheeq Proptech SPV II\n"
                "  IBAN:           [IBAN]\n"
                "  Reference:      {{investor_name}} / SPV II Capital Call\n\n"
                "Please send a wire confirmation to this email address.\n\n"
                "If you have any questions, please do not hesitate to contact us.\n\n"
                "Warm regards,\n{{sender_name}}\nWatheeq Ventures"
            ),
            "category": "Capital Call",
            "created_by": fm_id,
            "created_by_name": "Sara Al-Rashid",
            "created_at": now_iso(),
            "updated_at": now_iso(),
        },
    ])
    print("  ✓  Email templates created (4)")

    # ── Done ─────────────────────────────────────────────────────────────────
    print()
    print("=" * 58)
    print("  ✅  Demo data seeded successfully!")
    print("=" * 58)
    print(f"  Admin email:    {DEMO_ADMIN_EMAIL}")
    print(f"  Admin password: {DEMO_ADMIN_PASSWORD}")
    print()
    print(f"  FM email:       {DEMO_FM_EMAIL}")
    print(f"  FM password:    {DEMO_FM_PASSWORD}")
    print("=" * 58)
    print()
    print("  Summary:")
    print("    • 1 fund:          Watheeq Proptech SPV II (SAR 50M target)")
    print("    • 12 investors:    GCC / Saudi / UAE / Bahrain / Kuwait / Oman / Qatar")
    print("    • 13 pipeline stages spread across all stages")
    print(f"    • {len(tasks_to_insert)} tasks:  mix of high / medium / low priority")
    print("    • 2 personas:      GCC Real Estate HNWI + Family Office LP")
    print("    • 4 call logs:     interested / follow-up / connected / no-answer")
    print("    • 4 email templates: Intro / Follow-Up / Meeting / Capital Call")

    client.close()


if __name__ == "__main__":
    main()
