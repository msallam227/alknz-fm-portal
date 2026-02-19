import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export const DeleteInvestorDialog = ({
  open,
  onOpenChange,
  investorName,
  onConfirm
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-[#0A1628] border-[#1A2744]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">Delete Investor Profile</AlertDialogTitle>
          <AlertDialogDescription className="text-[#94A3B8]">
            Are you sure you want to delete &ldquo;{investorName}&rdquo;? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-transparent border-[#1A2744] text-white hover:bg-[#0047AB]/20">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-[#EF4444] hover:bg-[#DC2626] text-white"
            data-testid="confirm-delete-investor"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
