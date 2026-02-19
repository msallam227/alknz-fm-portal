import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { InvestmentIdentityFields, InvestmentContextFields, ContactRelationshipFields } from './InvestorFormFields';

export const CreateInvestorDialog = ({
  open,
  onOpenChange,
  profileData,
  setProfileData,
  allFundsSPVs,
  teamMembers,
  selectedFund,
  onSubmit,
  isSaving
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0A1628] border-[#1A2744] text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-bold">Add New Investor</DialogTitle>
          <DialogDescription className="text-[#94A3B8]">
            Create a new investor profile for {selectedFund?.name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <InvestmentIdentityFields 
            profileData={profileData}
            setProfileData={setProfileData}
            isEditing={true}
            compact={true}
          />
          
          <InvestmentContextFields 
            profileData={profileData}
            setProfileData={setProfileData}
            allFundsSPVs={allFundsSPVs}
            isEditing={true}
            compact={true}
          />
          
          <ContactRelationshipFields 
            profileData={profileData}
            setProfileData={setProfileData}
            teamMembers={teamMembers}
            isEditing={true}
            compact={true}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-transparent border-[#1A2744] text-white hover:bg-[#0047AB]/20"
          >
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isSaving}
            className="text-white"
            style={{ background: 'linear-gradient(135deg, #0047AB 0%, #0052CC 100%)' }}
            data-testid="submit-create-investor"
          >
            {isSaving ? 'Creating...' : 'Create Investor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
