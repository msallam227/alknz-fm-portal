// Investor form constants and default values

export const INVESTOR_TYPES = [
  "Individual",
  "Family Office",
  "Institution",
  "Corporate",
  "Sovereign Wealth Fund",
  "Pension Fund",
  "Endowment",
  "Foundation",
  "Fund of Funds",
  "Other"
];

export const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];

export const TITLES = ["Mr.", "Ms.", "Mrs.", "Dr.", "Prof.", "Sir", "Dame", ""];

export const SECTORS = [
  "Technology",
  "Healthcare",
  "Fintech",
  "Consumer",
  "Enterprise",
  "AI/ML",
  "Crypto/Web3",
  "Climate",
  "Real Estate",
  "Infrastructure",
  "Energy",
  "Manufacturing",
  "Other"
];

export const CURRENCIES = ["USD", "EUR", "GBP", "AED", "SAR", "CHF", "JPY", "CNY"];

// Relationship Intelligence constants
export const RELATIONSHIP_STRENGTHS = [
  { value: "cold", label: "Cold", color: "text-[#94A3B8]", bg: "bg-[#94A3B8]/10" },
  { value: "warm", label: "Warm", color: "text-[#F59E0B]", bg: "bg-[#F59E0B]/10" },
  { value: "direct", label: "Direct", color: "text-[#22C55E]", bg: "bg-[#22C55E]/10" },
  { value: "unknown", label: "Unknown", color: "text-[#EF4444]", bg: "bg-[#EF4444]/10" }
];

export const DECISION_ROLES = [
  { value: "decision_maker", label: "Decision Maker", color: "text-[#22C55E]", bg: "bg-[#22C55E]/10" },
  { value: "influencer", label: "Influencer", color: "text-[#3B82F6]", bg: "bg-[#3B82F6]/10" },
  { value: "gatekeeper", label: "Gatekeeper", color: "text-[#F59E0B]", bg: "bg-[#F59E0B]/10" },
  { value: "unknown", label: "Unknown", color: "text-[#EF4444]", bg: "bg-[#EF4444]/10" }
];

export const getRelationshipStrengthConfig = (value) => {
  return RELATIONSHIP_STRENGTHS.find(r => r.value === value) || RELATIONSHIP_STRENGTHS[3];
};

export const getDecisionRoleConfig = (value) => {
  return DECISION_ROLES.find(r => r.value === value) || DECISION_ROLES[3];
};

export const emptyProfile = {
  investor_name: '',
  title: '',
  gender: '',
  nationality: '',
  age: '',
  job_title: '',
  investor_type: 'Individual',
  sector: '',
  country: '',
  city: '',
  description: '',
  website: '',
  // Investment Context
  wealth: '',
  has_invested_with_alknz: null,
  has_invested_override: false,
  previous_alknz_funds: [],
  expected_ticket_amount: '',
  expected_ticket_currency: 'USD',
  typical_ticket_size: '',
  investment_size: null,
  investment_size_currency: 'USD',
  // Identity extras (from extension)
  linkedin_url: '',
  firm_name: '',
  // Contact & Relationship
  contact_name: '',
  contact_title: '',
  contact_phone: '',
  contact_email: '',
  contact_whatsapp: '',
  alknz_point_of_contact_id: '',
  // Relationship Intelligence
  relationship_strength: 'unknown',
  decision_role: 'unknown',
  preferred_intro_path: ''
};

export const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

// Valid ISO 4217 currency codes
const VALID_CURRENCY_CODES = new Set([
  'USD', 'EUR', 'GBP', 'AED', 'SAR', 'CHF', 'JPY', 'CNY', 'INR', 'CAD', 'AUD', 
  'SGD', 'HKD', 'KRW', 'MYR', 'THB', 'PHP', 'IDR', 'VND', 'TWD', 'BRL', 'MXN',
  'ZAR', 'RUB', 'TRY', 'PLN', 'SEK', 'NOK', 'DKK', 'NZD', 'ILS', 'EGP', 'KWD',
  'QAR', 'BHD', 'OMR', 'JOD', 'PKR', 'BDT', 'LKR', 'NGN', 'KES', 'GHS', 'TZS'
]);

export const getStageTextColor = (stageName) => {
  const stageColors = {
    'Investors': 'text-[#94A3B8]',
    'Intro Email': 'text-[#60A5FA]',
    'Opportunity Email': 'text-[#A78BFA]',
    'Phone Call': 'text-[#FBBF24]',
    'First Meeting': 'text-[#F472B6]',
    'Second Meeting': 'text-[#4ADE80]',
    'Follow Up Email': 'text-[#34D399]',
    'Signing Contract': 'text-[#FB923C]',
    'Signing Subscription': 'text-[#22D3EE]',
    'Letter for Capital Call': 'text-[#A78BFA]',
    'Money Transfer': 'text-[#2DD4BF]',
    'Transfer Date': 'text-[#A3E635]',
  };
  return stageColors[stageName] || 'text-white';
};

export const formatCurrency = (amount, currency = 'USD') => {
  if (!amount) return '-';
  
  // Validate currency code - if invalid, default to USD
  const validCurrency = typeof currency === 'string' && 
    currency.length === 3 && 
    VALID_CURRENCY_CODES.has(currency.toUpperCase()) 
      ? currency.toUpperCase() 
      : 'USD';
  
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: validCurrency,
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount);
  } catch (e) {
    // Fallback for any other errors
    return `$${Number(amount).toLocaleString()}`;
  }
};
