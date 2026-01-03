'use client';

import React, { useState } from 'react';
import { isTrialExpired } from '@/lib/trial-utils';
import { User as AppUser } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface TrialButtonLockProps {
  user: AppUser | null;
  disabled?: boolean;
  children: React.ReactElement;
}

/**
 * Wrapper component that shows upgrade dialog when expired trial users click buttons
 * Allows the action to proceed for active trial or premium users
 */
export function TrialButtonLock({
  user,
  disabled = false,
  children,
}: TrialButtonLockProps) {
  const [showDialog, setShowDialog] = useState(false);
  const router = useRouter();
  
  // Check if trial has expired
  const isTrialUsed = user?.subscription === 'trial' && isTrialExpired(user);
  
  const handleClick = (e: React.MouseEvent) => {
    // Check if user is in an expired state (either time-based or status-based)
    const isExpired = (isTrialUsed || user?.subscription === 'expired');
    
    if (isExpired) {
      e.preventDefault();
      e.stopPropagation();
      setShowDialog(true);
    }
  };

  return (
    <>
      {React.cloneElement(children, {
        disabled: disabled,
        onClick: handleClick,
      } as any)}
      
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>🎉 Upgrade to Premium</DialogTitle>
          </DialogHeader>
          
          <DialogDescription className="space-y-4 pt-2">
            <p>
              Your free trial has ended, but your journey doesn't have to! 🚀
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <p className="font-semibold text-blue-900">Premium Benefits:</p>
              <ul className="text-sm text-blue-800 space-y-1 ml-4">
                <li>✅ Unlimited product management</li>
                <li>✅ Export invoices & reports</li>
                <li>✅ Full data synchronization</li>
                <li>✅ Priority support</li>
              </ul>
            </div>
            
            <p className="text-sm text-gray-600">
              Upgrade now and unlock all features. Your data is safe and waiting for you!
            </p>
          </DialogDescription>
          
          <DialogFooter className="flex gap-2 justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
            >
              Maybe Later
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                setShowDialog(false);
                router.push('/en/settings');
              }}
            >
              Upgrade Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
