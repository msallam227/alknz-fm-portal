// Fund Manager Components Barrel Export
export { InvestorList } from './InvestorList';
export { InvestorProfile } from './InvestorProfile';
export { InvestorMiniProfile } from './InvestorMiniProfile';
export { CreateInvestorDialog } from './CreateInvestorDialog';
export { DeleteInvestorDialog } from './DeleteInvestorDialog';
export { InvestmentIdentityFields, InvestmentContextFields, ContactRelationshipFields } from './InvestorFormFields';
export { PipelineBoard } from './PipelineBoard';
export { PipelineCard } from './PipelineCard';
export { CapitalOverview } from './CapitalOverview';
export { TaskManager } from './TaskManager';
export { CommunicationCenter } from './CommunicationCenter';
export { EvidenceBlock } from './EvidenceBlock';
export { ResearchCapture } from './ResearchCapture';
export { PersonaManager } from './PersonaManager';
export { 
  INVESTOR_TYPES, 
  GENDERS, 
  TITLES, 
  SECTORS, 
  CURRENCIES,
  RELATIONSHIP_STRENGTHS,
  DECISION_ROLES,
  getRelationshipStrengthConfig,
  getDecisionRoleConfig,
  emptyProfile,
  getInitials,
  formatCurrency
} from './constants';
