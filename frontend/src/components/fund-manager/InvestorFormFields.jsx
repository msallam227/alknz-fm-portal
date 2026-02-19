import React from 'react';
import { User, Briefcase, Phone, Users, Target, Route, Globe, Building, Linkedin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  INVESTOR_TYPES,
  GENDERS,
  TITLES,
  SECTORS,
  CURRENCIES,
  RELATIONSHIP_STRENGTHS,
  DECISION_ROLES,
  formatCurrency
} from './constants';

// Unified form field that supports both edit and view modes.
// displayValue is optional — only pass it when the view-mode display differs from the raw value
// (e.g. a formatted currency string). Otherwise value is shown directly.
const FormField = ({
  label,
  value,
  displayValue,
  onChange,
  type = 'text',
  placeholder,
  isEditing,
  className = '',
  testId,
  icon: Icon,
  required = false,
  helpText,
  badge
}) => (
  <div className={`space-y-2 ${className}`}>
    <Label className="text-white flex items-center gap-1">
      {Icon && <Icon className="h-3 w-3" />}
      {label}
      {required && isEditing && <span className="text-[#EF4444]">*</span>}
      {badge}
    </Label>
    {isEditing ? (
      <Input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="bg-[#02040A]/60 border-[#1A2744] text-white"
        placeholder={placeholder}
        data-testid={testId}
      />
    ) : (
      <p className="text-[#94A3B8] py-2">{displayValue || value || '-'}</p>
    )}
    {helpText && isEditing && (
      <p className="text-xs text-[#475569]">{helpText}</p>
    )}
  </div>
);

// displayValue removed — view mode renders value directly.
const SelectField = ({
  label,
  value,
  options,
  onChange,
  isEditing,
  className = '',
  testId,
  icon: Icon,
  required = false,
  badge,
  renderOption,
  placeholder = 'Select'
}) => (
  <div className={`space-y-2 ${className}`}>
    <Label className="text-white flex items-center gap-1">
      {Icon && <Icon className="h-3 w-3" />}
      {label}
      {required && isEditing && <span className="text-[#EF4444]">*</span>}
      {badge}
    </Label>
    {isEditing ? (
      <Select value={value || ''} onValueChange={onChange}>
        <SelectTrigger
          className="bg-[#02040A]/60 border-[#1A2744] text-white"
          data-testid={testId}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="bg-[#0A1628] border-[#1A2744]">
          {options.map(opt => (
            <SelectItem
              key={typeof opt === 'object' ? opt.value : opt}
              value={typeof opt === 'object' ? opt.value : opt}
              className="text-white focus:bg-[#0047AB]/20"
            >
              {renderOption ? renderOption(opt) : (typeof opt === 'object' ? opt.label : opt)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ) : (
      <p className="text-[#94A3B8] py-2">{value || '-'}</p>
    )}
  </div>
);

// ============== INVESTMENT IDENTITY SECTION ==============
export const InvestmentIdentityFields = ({
  profileData,
  setProfileData,
  isEditing = true,
  compact = false
}) => {
  const gridCols = compact ? "grid-cols-3" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
  const updateField = (field, value) => setProfileData({ ...profileData, [field]: value });

  return (
    <div className={`border border-[#1A2744] rounded-lg p-4 ${compact ? '' : 'mb-6'}`}
      style={{ background: isEditing ? undefined : 'rgba(10, 22, 40, 0.6)' }}
    >
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
        <User className="h-4 w-4 text-[#00A3FF]" />
        Investment Identity
      </h3>
      <div className={`grid ${gridCols} gap-4`}>
        {/* Investor Name */}
        <FormField
          label="Investor Name"
          value={profileData.investor_name}
          onChange={(v) => updateField('investor_name', v)}
          isEditing={isEditing}
          className={compact ? 'col-span-3 sm:col-span-2' : 'col-span-full md:col-span-2'}
          placeholder="Full name"
          testId="investor-name-input"
          required
        />

        {/* Title */}
        <SelectField
          label="Title"
          value={profileData.title}
          options={TITLES.map(t => t || 'none')}
          onChange={(v) => updateField('title', v === 'none' ? '' : v)}
          isEditing={isEditing}
          testId="edit-title"
          renderOption={(opt) => opt === 'none' ? 'None' : opt}
        />

        {/* Gender */}
        <SelectField
          label="Gender"
          value={profileData.gender}
          options={GENDERS}
          onChange={(v) => updateField('gender', v)}
          isEditing={isEditing}
          testId="edit-gender"
        />

        {/* Nationality */}
        <FormField
          label="Nationality"
          value={profileData.nationality}
          onChange={(v) => updateField('nationality', v)}
          isEditing={isEditing}
          placeholder="e.g., American"
          testId="edit-nationality"
        />

        {/* Age */}
        <FormField
          label="Age"
          value={profileData.age}
          onChange={(v) => updateField('age', v)}
          isEditing={isEditing}
          type="number"
          placeholder="e.g., 45"
          testId="edit-age"
        />

        {/* Job Title */}
        <FormField
          label="Job Title"
          value={profileData.job_title}
          onChange={(v) => updateField('job_title', v)}
          isEditing={isEditing}
          placeholder="e.g., CEO"
          testId="edit-job-title"
        />

        {/* Firm / Company */}
        <FormField
          label="Firm / Company"
          value={profileData.firm_name}
          onChange={(v) => updateField('firm_name', v)}
          isEditing={isEditing}
          placeholder="e.g., Sequoia Capital"
          icon={Building}
          testId="edit-firm-name"
        />

        {/* Investor Type */}
        <SelectField
          label="Investor Type"
          value={profileData.investor_type}
          options={INVESTOR_TYPES}
          onChange={(v) => updateField('investor_type', v)}
          isEditing={isEditing}
          testId="edit-investor-type"
        />

        {/* Sector */}
        <SelectField
          label="Sector"
          value={profileData.sector}
          options={SECTORS}
          onChange={(v) => updateField('sector', v)}
          isEditing={isEditing}
          testId="edit-sector"
          placeholder="Select sector"
        />

        {/* Location: City + Country */}
        <div className="space-y-2">
          <Label className="text-white flex items-center gap-1">
            <Globe className="h-3 w-3" /> Location
          </Label>
          {isEditing ? (
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={profileData.city || ''}
                onChange={(e) => updateField('city', e.target.value)}
                className="bg-[#02040A]/60 border-[#1A2744] text-white"
                placeholder="City"
                data-testid="edit-city"
              />
              <Input
                value={profileData.country || ''}
                onChange={(e) => updateField('country', e.target.value)}
                className="bg-[#02040A]/60 border-[#1A2744] text-white"
                placeholder="Country"
                data-testid="edit-country"
              />
            </div>
          ) : (
            <p className="text-[#94A3B8] py-2">
              {profileData.city || profileData.country
                ? `${profileData.city || ''}${profileData.city && profileData.country ? ', ' : ''}${profileData.country || ''}`
                : '-'
              }
            </p>
          )}
        </div>

        {/* Website */}
        <div className="space-y-2">
          <Label className="text-white flex items-center gap-1">
            <Building className="h-3 w-3" /> Website
          </Label>
          {isEditing ? (
            <Input
              value={profileData.website || ''}
              onChange={(e) => updateField('website', e.target.value)}
              className="bg-[#02040A]/60 border-[#1A2744] text-white"
              placeholder="https://..."
              data-testid="edit-website"
            />
          ) : (
            <p className="text-[#94A3B8] py-2">
              {profileData.website ? (
                <a href={profileData.website} target="_blank" rel="noopener noreferrer" className="text-[#00A3FF] hover:underline">
                  {profileData.website}
                </a>
              ) : '-'}
            </p>
          )}
        </div>

        {/* LinkedIn URL */}
        <div className="space-y-2">
          <Label className="text-white flex items-center gap-1">
            <Linkedin className="h-3 w-3" /> LinkedIn URL
          </Label>
          {isEditing ? (
            <Input
              value={profileData.linkedin_url || ''}
              onChange={(e) => updateField('linkedin_url', e.target.value)}
              className="bg-[#02040A]/60 border-[#1A2744] text-white"
              placeholder="https://linkedin.com/in/..."
              data-testid="edit-linkedin-url"
            />
          ) : (
            <p className="text-[#94A3B8] py-2">
              {profileData.linkedin_url ? (
                <a href={profileData.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-[#0077B5] hover:underline">
                  {profileData.linkedin_url}
                </a>
              ) : '-'}
            </p>
          )}
        </div>

        {/* Description */}
        <div className={`${compact ? 'col-span-3' : 'col-span-full'} space-y-2`}>
          <Label className="text-white">Description</Label>
          {isEditing ? (
            <Textarea
              value={profileData.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              className="bg-[#02040A]/60 border-[#1A2744] text-white min-h-[80px]"
              placeholder="Brief description of the investor..."
              data-testid="edit-description"
            />
          ) : (
            <p className="text-[#94A3B8] py-2 whitespace-pre-wrap">{profileData.description || '-'}</p>
          )}
        </div>
      </div>
    </div>
  );
};

// ============== INVESTMENT CONTEXT SECTION ==============
export const InvestmentContextFields = ({
  profileData,
  setProfileData,
  allFundsSPVs = [],
  historicalData = null,
  isEditing = true,
  compact = false,
  getFundName = (id) => id
}) => {
  const gridCols = compact ? "grid-cols-3" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
  const updateField = (field, value) => setProfileData({ ...profileData, [field]: value });

  return (
    <div className="border border-[#1A2744] rounded-lg p-4"
      style={{ background: isEditing ? undefined : 'rgba(10, 22, 40, 0.6)' }}
    >
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
        <Briefcase className="h-4 w-4 text-[#00A3FF]" />
        Investment Context
      </h3>
      <div className={`grid ${gridCols} gap-4`}>
        {/* Wealth */}
        <FormField
          label="Wealth"
          value={profileData.wealth}
          onChange={(v) => updateField('wealth', v)}
          isEditing={isEditing}
          placeholder="e.g., High Net Worth"
          testId="edit-wealth"
        />

        {/* Has Invested with ALKNZ Before */}
        <div className="space-y-2">
          <Label className="text-white flex items-center gap-2">
            Has Invested with ALKNZ Before
            {historicalData?.has_invested_before && !profileData.has_invested_override && (
              <span className="text-xs bg-[#22C55E]/20 text-[#22C55E] px-2 py-0.5 rounded">
                Auto-detected
              </span>
            )}
            {profileData.has_invested_override && (
              <span className="text-xs bg-[#F59E0B]/20 text-[#F59E0B] px-2 py-0.5 rounded">
                Overridden
              </span>
            )}
          </Label>
          {isEditing ? (
            <Select
              value={profileData.has_invested_with_alknz === true ? 'yes' : profileData.has_invested_with_alknz === false ? 'no' : 'unknown'}
              onValueChange={(value) => setProfileData({
                ...profileData,
                has_invested_with_alknz: value === 'yes' ? true : value === 'no' ? false : null,
                has_invested_override: value !== 'unknown'
              })}
            >
              <SelectTrigger className="bg-[#02040A]/60 border-[#1A2744] text-white" data-testid="edit-has-invested">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent className="bg-[#0A1628] border-[#1A2744]">
                <SelectItem value="unknown" className="text-white focus:bg-[#0047AB]/20">Unknown</SelectItem>
                <SelectItem value="yes" className="text-white focus:bg-[#0047AB]/20">Yes</SelectItem>
                <SelectItem value="no" className="text-white focus:bg-[#0047AB]/20">No</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <p className="text-[#94A3B8] py-2">
              {profileData.has_invested_with_alknz === true ? (
                <span className="text-[#22C55E]">Yes</span>
              ) : profileData.has_invested_with_alknz === false ? (
                <span className="text-[#EF4444]">No</span>
              ) : (
                '-'
              )}
            </p>
          )}
        </div>

        {/* ALKNZ Fund/SPV (Previous) */}
        <div className="space-y-2">
          <Label className="text-white">ALKNZ Fund/SPV (Previous)</Label>
          {isEditing ? (
            <Select
              value={profileData.previous_alknz_funds?.[0] || 'none'}
              onValueChange={(value) => setProfileData({
                ...profileData,
                previous_alknz_funds: value === 'none' ? [] : [value]
              })}
            >
              <SelectTrigger className="bg-[#02040A]/60 border-[#1A2744] text-white" data-testid="edit-previous-funds">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent className="bg-[#0A1628] border-[#1A2744]">
                <SelectItem value="none" className="text-white focus:bg-[#0047AB]/20">None</SelectItem>
                {allFundsSPVs.map(fund => (
                  <SelectItem key={fund.id} value={fund.id} className="text-white focus:bg-[#0047AB]/20">
                    {fund.name} ({fund.fund_type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-[#94A3B8] py-2">
              {profileData.previous_alknz_funds?.length > 0
                ? profileData.previous_alknz_funds.map(fid => getFundName(fid)).join(', ')
                : '-'
              }
            </p>
          )}
        </div>

        {/* Expected Ticket Size */}
        <div className={`${compact ? 'col-span-2' : ''} space-y-2`}>
          <Label className="text-white">Expected Ticket Size</Label>
          {isEditing ? (
            <div className="flex gap-2">
              <Input
                type="number"
                value={profileData.expected_ticket_amount || ''}
                onChange={(e) => updateField('expected_ticket_amount', e.target.value)}
                className="bg-[#02040A]/60 border-[#1A2744] text-white flex-1"
                placeholder="e.g., 500000"
                data-testid="edit-expected-ticket"
              />
              <Select
                value={profileData.expected_ticket_currency || 'USD'}
                onValueChange={(v) => updateField('expected_ticket_currency', v)}
              >
                <SelectTrigger className="bg-[#02040A]/60 border-[#1A2744] text-white w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0A1628] border-[#1A2744]">
                  {CURRENCIES.map(c => (
                    <SelectItem key={c} value={c} className="text-white focus:bg-[#0047AB]/20">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="text-[#94A3B8] py-2">
              {formatCurrency(profileData.expected_ticket_amount, profileData.expected_ticket_currency)}
            </p>
          )}
        </div>

        {/* Investment Size (Actual Committed) */}
        <div className={`${compact ? 'col-span-2' : ''} space-y-2`}>
          <Label className="text-white flex items-center gap-2">
            Investment Size (Actual)
            <span className="text-xs bg-[#22C55E]/20 text-[#22C55E] px-2 py-0.5 rounded">
              Capital Tracking
            </span>
          </Label>
          {isEditing ? (
            <div className="flex gap-2">
              <Input
                type="number"
                value={profileData.investment_size || ''}
                onChange={(e) => updateField('investment_size', e.target.value ? parseFloat(e.target.value) : null)}
                className="bg-[#02040A]/60 border-[#1A2744] text-white flex-1"
                placeholder="e.g., 500000"
                data-testid="edit-investment-size"
              />
              <Select
                value={profileData.investment_size_currency || 'USD'}
                onValueChange={(v) => updateField('investment_size_currency', v)}
              >
                <SelectTrigger className="bg-[#02040A]/60 border-[#1A2744] text-white w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0A1628] border-[#1A2744]">
                  {CURRENCIES.map(c => (
                    <SelectItem key={c} value={c} className="text-white focus:bg-[#0047AB]/20">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="text-[#94A3B8] py-2">
              {profileData.investment_size
                ? formatCurrency(profileData.investment_size, profileData.investment_size_currency || 'USD')
                : '-'
              }
            </p>
          )}
          <p className="text-xs text-[#475569]">
            The actual committed investment amount (used in Capital Overview)
          </p>
        </div>

        {/* Typical Ticket Size — displayValue used here to show formatted currency in view mode */}
        <FormField
          label="Typical Ticket Size (Optional)"
          value={profileData.typical_ticket_size}
          displayValue={profileData.typical_ticket_size
            ? formatCurrency(profileData.typical_ticket_size, profileData.expected_ticket_currency || 'USD')
            : '-'}
          onChange={(v) => updateField('typical_ticket_size', v)}
          isEditing={isEditing}
          type="number"
          placeholder="e.g., 250000"
          testId="edit-typical-ticket"
        />
      </div>
    </div>
  );
};

// ============== CONTACT & RELATIONSHIP SECTION ==============
export const ContactRelationshipFields = ({
  profileData,
  setProfileData,
  teamMembers = [],
  isEditing = true,
  compact = false,
  getTeamMemberName = (id) => id
}) => {
  const gridCols = compact ? "grid-cols-3" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
  const updateField = (field, value) => setProfileData({ ...profileData, [field]: value });

  return (
    <div className="border border-[#1A2744] rounded-lg p-4"
      style={{ background: isEditing ? undefined : 'rgba(10, 22, 40, 0.6)' }}
    >
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
        <Phone className="h-4 w-4 text-[#00A3FF]" />
        Contact & Relationship
      </h3>
      <div className={`grid ${gridCols} gap-4`}>
        {/* Point of Contact Name */}
        <FormField
          label="Point of Contact Name"
          value={profileData.contact_name}
          onChange={(v) => updateField('contact_name', v)}
          isEditing={isEditing}
          placeholder="e.g., John Smith"
          testId="edit-contact-name"
        />

        {/* Point of Contact Title */}
        <FormField
          label="Point of Contact Title"
          value={profileData.contact_title}
          onChange={(v) => updateField('contact_title', v)}
          isEditing={isEditing}
          placeholder="e.g., Investment Director"
          testId="edit-contact-title"
        />

        {/* Phone Number */}
        <div className="space-y-2">
          <Label className="text-white flex items-center gap-1">
            <Phone className="h-3 w-3" /> Phone Number
          </Label>
          {isEditing ? (
            <Input
              value={profileData.contact_phone || ''}
              onChange={(e) => updateField('contact_phone', e.target.value)}
              className="bg-[#02040A]/60 border-[#1A2744] text-white"
              placeholder="+1 234 567 8900"
              data-testid="edit-contact-phone"
            />
          ) : (
            <p className="text-[#94A3B8] py-2">
              {profileData.contact_phone ? (
                <a href={`tel:${profileData.contact_phone}`} className="text-[#00A3FF] hover:underline">
                  {profileData.contact_phone}
                </a>
              ) : '-'}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label className="text-white flex items-center gap-1">
            Email
          </Label>
          {isEditing ? (
            <Input
              type="email"
              value={profileData.contact_email || ''}
              onChange={(e) => updateField('contact_email', e.target.value)}
              className="bg-[#02040A]/60 border-[#1A2744] text-white"
              placeholder="contact@example.com"
              data-testid="edit-contact-email"
            />
          ) : (
            <p className="text-[#94A3B8] py-2">
              {profileData.contact_email ? (
                <a href={`mailto:${profileData.contact_email}`} className="text-[#00A3FF] hover:underline">
                  {profileData.contact_email}
                </a>
              ) : '-'}
            </p>
          )}
        </div>

        {/* WhatsApp */}
        <div className="space-y-2">
          <Label className="text-white">WhatsApp</Label>
          {isEditing ? (
            <Input
              value={profileData.contact_whatsapp || ''}
              onChange={(e) => updateField('contact_whatsapp', e.target.value)}
              className="bg-[#02040A]/60 border-[#1A2744] text-white"
              placeholder="+1 234 567 8900"
              data-testid="edit-contact-whatsapp"
            />
          ) : (
            <p className="text-[#94A3B8] py-2">
              {profileData.contact_whatsapp ? (
                <a href={`https://wa.me/${profileData.contact_whatsapp.replace(/[^0-9]/g, '')}`}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="text-[#25D366] hover:underline">
                  {profileData.contact_whatsapp}
                </a>
              ) : '-'}
            </p>
          )}
        </div>

        {/* ALKNZ Point of Contact */}
        <div className="space-y-2">
          <Label className="text-white">ALKNZ Point of Contact</Label>
          {isEditing ? (
            <Select
              value={profileData.alknz_point_of_contact_id || 'none'}
              onValueChange={(value) => updateField('alknz_point_of_contact_id', value === 'none' ? '' : value)}
            >
              <SelectTrigger className="bg-[#02040A]/60 border-[#1A2744] text-white" data-testid="edit-alknz-poc">
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent className="bg-[#0A1628] border-[#1A2744]">
                <SelectItem value="none" className="text-white focus:bg-[#0047AB]/20">None</SelectItem>
                {teamMembers.map(member => (
                  <SelectItem key={member.id} value={member.id} className="text-white focus:bg-[#0047AB]/20">
                    {member.first_name} {member.last_name} ({member.role === 'ADMIN' ? 'Admin' : 'FM'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-[#94A3B8] py-2">
              {profileData.alknz_point_of_contact_id
                ? getTeamMemberName(profileData.alknz_point_of_contact_id)
                : '-'
              }
            </p>
          )}
        </div>

        {/* Relationship Intelligence Section Header */}
        <div className={`${compact ? 'col-span-3' : 'col-span-full'} mt-4 pt-4 border-t border-[#1A2744]`}>
          <h4 className="text-[#94A3B8] text-sm font-medium flex items-center gap-2 mb-4">
            <Users className="h-4 w-4" />
            Relationship Intelligence
          </h4>
        </div>

        {/* Relationship Strength */}
        <div className="space-y-2">
          <Label className="text-white flex items-center gap-2">
            <Target className="h-3 w-3 text-[#94A3B8]" />
            Relationship Strength
            {(profileData.relationship_strength === 'unknown' || !profileData.relationship_strength) && isEditing && (
              <span className="text-xs bg-[#EF4444]/20 text-[#EF4444] px-2 py-0.5 rounded">
                Required
              </span>
            )}
          </Label>
          {isEditing ? (
            <Select
              value={profileData.relationship_strength || 'unknown'}
              onValueChange={(v) => updateField('relationship_strength', v)}
            >
              <SelectTrigger
                className={`bg-[#02040A]/60 border-[#1A2744] text-white ${
                  profileData.relationship_strength === 'unknown' || !profileData.relationship_strength
                    ? 'border-[#EF4444]/50' : ''
                }`}
                data-testid="relationship-strength-select"
              >
                <SelectValue placeholder="Select strength" />
              </SelectTrigger>
              <SelectContent className="bg-[#0A1628] border-[#1A2744]">
                {RELATIONSHIP_STRENGTHS.map(rs => (
                  <SelectItem key={rs.value} value={rs.value} className="text-white focus:bg-[#0047AB]/20">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${rs.bg.replace('/10', '')}`}></span>
                      <span className={rs.value === 'unknown' ? 'text-[#EF4444]' : ''}>{rs.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className={`py-2 ${
              profileData.relationship_strength === 'cold' ? 'text-[#94A3B8]' :
              profileData.relationship_strength === 'warm' ? 'text-[#F59E0B]' :
              profileData.relationship_strength === 'direct' ? 'text-[#22C55E]' :
              'text-[#EF4444]'
            }`}>
              {profileData.relationship_strength === 'cold' ? 'Cold' :
               profileData.relationship_strength === 'warm' ? 'Warm' :
               profileData.relationship_strength === 'direct' ? 'Direct' :
               'Unknown'}
            </p>
          )}
          {isEditing && (
            <p className="text-xs text-[#475569]">
              Indicates strength of relationship with the investor
            </p>
          )}
        </div>

        {/* Decision Role */}
        <div className="space-y-2">
          <Label className="text-white flex items-center gap-2">
            <User className="h-3 w-3 text-[#94A3B8]" />
            Decision Role
            {(profileData.decision_role === 'unknown' || !profileData.decision_role) && isEditing && (
              <span className="text-xs bg-[#EF4444]/20 text-[#EF4444] px-2 py-0.5 rounded">
                Required
              </span>
            )}
          </Label>
          {isEditing ? (
            <Select
              value={profileData.decision_role || 'unknown'}
              onValueChange={(v) => updateField('decision_role', v)}
            >
              <SelectTrigger
                className={`bg-[#02040A]/60 border-[#1A2744] text-white ${
                  profileData.decision_role === 'unknown' || !profileData.decision_role
                    ? 'border-[#EF4444]/50' : ''
                }`}
                data-testid="decision-role-select"
              >
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent className="bg-[#0A1628] border-[#1A2744]">
                {DECISION_ROLES.map(dr => (
                  <SelectItem key={dr.value} value={dr.value} className="text-white focus:bg-[#0047AB]/20">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${dr.bg.replace('/10', '')}`}></span>
                      <span className={dr.value === 'unknown' ? 'text-[#EF4444]' : ''}>{dr.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className={`py-2 ${
              profileData.decision_role === 'decision_maker' ? 'text-[#22C55E]' :
              profileData.decision_role === 'influencer' ? 'text-[#3B82F6]' :
              profileData.decision_role === 'gatekeeper' ? 'text-[#F59E0B]' :
              'text-[#EF4444]'
            }`}>
              {profileData.decision_role === 'decision_maker' ? 'Decision Maker' :
               profileData.decision_role === 'influencer' ? 'Influencer' :
               profileData.decision_role === 'gatekeeper' ? 'Gatekeeper' :
               'Unknown'}
            </p>
          )}
          {isEditing && (
            <p className="text-xs text-[#475569]">
              Investor&apos;s role in the investment decision
            </p>
          )}
        </div>

        {/* Preferred Intro Path */}
        <div className="space-y-2">
          <Label className="text-white flex items-center gap-2">
            <Route className="h-3 w-3 text-[#94A3B8]" />
            Preferred Intro Path
          </Label>
          {isEditing ? (
            <Input
              value={profileData.preferred_intro_path || ''}
              onChange={(e) => updateField('preferred_intro_path', e.target.value)}
              className="bg-[#02040A]/60 border-[#1A2744] text-white"
              placeholder="e.g., via GP referral, assistant email first"
              data-testid="preferred-intro-path-input"
            />
          ) : (
            <p className="text-[#94A3B8] py-2">{profileData.preferred_intro_path || '-'}</p>
          )}
          {isEditing && (
            <p className="text-xs text-[#475569]">
              Best way to be introduced to this investor
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
