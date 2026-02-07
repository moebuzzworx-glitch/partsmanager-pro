'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirebase } from '@/firebase/provider';
import { fetchUserById, changeUserSubscription } from '@/lib/user-management';
import { useToast } from '@/hooks/use-toast';
import { PaymentDialog } from './payment-dialog';
import { CreditCard, Sparkles, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

// Pricing in DZD
const FIRST_PURCHASE_PRICE = 25000; // 20,000 DZD lifetime + 5,000 DZD first year after-sales = 25,000 DZD
const RENEWAL_PRICE = 5000; // 5,000 DZD per year for after-sales service renewal

type PaymentType = 'FIRST_PURCHASE' | 'RENEWAL';

export function BillingPanel({ dictionary }: { dictionary?: any }) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [profile, setProfile] = React.useState<any | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);
  const [paymentType, setPaymentType] = React.useState<PaymentType>('FIRST_PURCHASE');

  // Fetch user profile
  const fetchProfile = React.useCallback(async () => {
    console.log('🔍 [BillingPanel] Fetching profile...', { user: user?.uid, firestore: !!firestore });
    if (!user || !firestore) {
      console.warn('🔍 [BillingPanel] Missing user or firestore', { user: !!user, firestore: !!firestore });
      return;
    }
    try {
      const p = await fetchUserById(firestore, user.uid);
      console.log('🔍 [BillingPanel] Profile fetched:', p);
      setProfile(p);

      if (!p) {
        console.error('🔍 [BillingPanel] Profile is null - user document may not exist in Firestore');
      }
    } catch (e) {
      console.error('🔍 [BillingPanel] Failed to fetch user profile for billing', e);
    }
  }, [user, firestore]);

  React.useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Listen for payment success/failure in URL params
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');

    if (paymentStatus === 'success') {
      // Payment successful - refresh profile to show updated subscription
      toast({
        title: dictionary?.billing?.paymentSuccess || 'Payment Successful!',
        description: dictionary?.billing?.activating || 'Your subscription is being activated...',
      });

      // Refresh after a short delay to allow webhook to process
      setTimeout(() => {
        fetchProfile();
      }, 2000);

      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (paymentStatus === 'failed') {
      toast({
        title: dictionary?.billing?.paymentFailed || 'Payment Failed',
        description: dictionary?.billing?.tryAgain || 'Please try again or contact support.',
        variant: 'destructive',
      });

      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [fetchProfile, toast, dictionary]);

  // Determine subscription status
  const isTrial = profile?.subscription === 'trial';

  // A user is "premium" if their subscription is 'premium' OR 'expired'
  // (since expired users were once premium and own the license)
  const isPremiumRaw = profile?.subscription === 'premium';
  const isExplicitlyExpired = profile?.subscription === 'expired';

  // For backward compatibility with existing code
  const isPremium = isPremiumRaw || isExplicitlyExpired;

  const hasExpiryDate = !!profile?.premiumExpiryDate;

  // Check if after-sales service has expired
  let afterSalesExpired = false;

  // Case 1: Explicitly marked as 'expired' in subscription field
  if (isExplicitlyExpired) {
    afterSalesExpired = true;
  }
  // Case 2: Marked as 'premium' but date has passed
  else if (isPremium && hasExpiryDate) {
    try {
      let expiryDate: Date;
      if (profile.premiumExpiryDate.seconds) {
        expiryDate = new Date(profile.premiumExpiryDate.seconds * 1000);
      } else if (typeof profile.premiumExpiryDate.toDate === 'function') {
        expiryDate = profile.premiumExpiryDate.toDate();
      } else {
        expiryDate = new Date(profile.premiumExpiryDate);
      }
      afterSalesExpired = expiryDate < new Date();

      // Debug log
      console.log('🔍 [BillingPanel] Expiry Check:', {
        sub: profile.subscription,
        expiry: expiryDate.toISOString(),
        now: new Date().toISOString(),
        expired: afterSalesExpired
      });
    } catch (e) {
      console.error('Error parsing expiry date:', e);
      afterSalesExpired = false;
    }
  }

  // Premium with active after-sales (not expired)
  const isPremiumActive = isPremium && hasExpiryDate && !afterSalesExpired;

  // Should show payment button?
  // 1. Trial users - need to purchase
  // 2. Premium users with expired after-sales - need to renew
  const shouldShowPaymentButton = isTrial || afterSalesExpired;

  // Determine which payment type
  const currentPaymentType: PaymentType = isTrial ? 'FIRST_PURCHASE' : 'RENEWAL';
  const currentPaymentAmount = isTrial ? FIRST_PURCHASE_PRICE : RENEWAL_PRICE;

  // Open payment dialog
  function handlePayWithCard() {
    setPaymentType(currentPaymentType);
    setPaymentDialogOpen(true);
  }

  // Manual renewal (for admin/testing only)
  async function handleManualRenew() {
    if (!user || !firestore) return;
    setLoading(true);
    try {
      // For both trial and expired premium, activate premium subscription
      const ok = await changeUserSubscription(firestore, user.uid, 'premium');
      if (ok) {
        toast({
          title: dictionary?.billing?.renewalSuccess || 'Subscription Activated',
          description: isTrial
            ? (dictionary?.billing?.purchaseSuccessMessage || 'Your license has been activated. Welcome to Premium!')
            : (dictionary?.billing?.renewalSuccessMessage || 'Your after-sales service has been renewed for 1 year.')
        });
        // Refresh profile
        await fetchProfile();
      } else {
        toast({ title: dictionary?.billing?.renewalError || 'Activation Failed', variant: 'destructive' });
      }
    } catch (e) {
      console.error('Activation failed', e);
      toast({ title: dictionary?.table?.error || 'Error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  // Manual refresh for admin-modified subscriptions
  async function handleRefreshStatus() {
    setLoading(true);
    try {
      await fetchProfile();
      toast({
        title: dictionary?.billing?.refreshed || 'Status Refreshed',
        description: dictionary?.billing?.refreshedDesc || 'Subscription status has been updated.',
      });
    } catch (e) {
      console.error('Refresh failed', e);
      toast({ title: dictionary?.table?.error || 'Error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Card dir="inherit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {dictionary?.billing?.title || 'Subscription'}
          </CardTitle>
          <CardDescription>{dictionary?.billing?.description || 'Manage your license and after-sales service.'}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Current Status Card */}
            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{dictionary?.billing?.currentStatus || 'Current Status'}</p>
                  <p className="text-2xl font-bold capitalize mt-1">
                    {isTrial && (dictionary?.billing?.trialMode || 'Trial Mode')}
                    {isPremiumActive && (dictionary?.billing?.premiumActive || 'Premium (Active)')}
                    {afterSalesExpired && (dictionary?.billing?.premiumExpired || 'Premium (Service Expired)')}
                    {!profile && 'Loading...'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefreshStatus}
                    disabled={loading}
                    className="h-8 px-2"
                    title={dictionary?.billing?.refresh || 'Refresh status'}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={loading ? 'animate-spin' : ''}>
                      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                      <path d="M16 16h5v5" />
                    </svg>
                  </Button>
                  {isTrial && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full">
                      <Clock className="h-3 w-3" />
                      {dictionary?.billing?.trial || 'Trial'}
                    </span>
                  )}
                  {isPremiumActive && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                      <CheckCircle className="h-3 w-3" />
                      {dictionary?.billing?.active || 'Active'}
                    </span>
                  )}
                  {afterSalesExpired && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded-full">
                      <AlertTriangle className="h-3 w-3" />
                      {dictionary?.billing?.expired || 'Expired'}
                    </span>
                  )}
                </div>
              </div>

              {/* Show expiry date for premium users */}
              {isPremium && hasExpiryDate && (() => {
                try {
                  let expiryDate: Date;
                  if (profile.premiumExpiryDate.seconds) {
                    expiryDate = new Date(profile.premiumExpiryDate.seconds * 1000);
                  } else if (typeof profile.premiumExpiryDate.toDate === 'function') {
                    expiryDate = profile.premiumExpiryDate.toDate();
                  } else {
                    expiryDate = new Date(profile.premiumExpiryDate);
                  }

                  return (
                    <p className="text-sm text-muted-foreground mt-3">
                      {afterSalesExpired
                        ? (dictionary?.billing?.expiredOn || 'After-sales service expired on:')
                        : (dictionary?.billing?.expiresOn || 'After-sales service valid until:')} {' '}
                      <span className={`font-medium ${afterSalesExpired ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {expiryDate.toLocaleDateString()}
                      </span>
                    </p>
                  );
                } catch (e) {
                  return null;
                }
              })()}
            </div>

            {/* Payment Options - Only show when needed */}
            {shouldShowPaymentButton && (
              <>
                {/* Pricing Info */}
                <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                  {isTrial ? (
                    // First Purchase Pricing
                    <div className="space-y-3">
                      <p className="font-semibold text-lg">{dictionary?.billing?.firstPurchase || 'Lifetime License + 1 Year Service'}</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>{dictionary?.billing?.lifetimeLicense || 'Lifetime Software License'}</span>
                          <span className="font-medium">20,000 DZD</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{dictionary?.billing?.firstYearService || 'First Year After-Sales Service'}</span>
                          <span className="font-medium">5,000 DZD</span>
                        </div>
                        <div className="border-t pt-2 flex justify-between text-base font-bold">
                          <span>{dictionary?.billing?.total || 'Total'}</span>
                          <span className="text-primary">{FIRST_PURCHASE_PRICE.toLocaleString()} DZD</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {dictionary?.billing?.oneTimeNote || 'One-time purchase. After-sales service renews annually at 5,000 DZD/year.'}
                      </p>
                    </div>
                  ) : (
                    // Renewal Pricing
                    <div className="space-y-3">
                      <p className="font-semibold text-lg">{dictionary?.billing?.renewService || 'Renew After-Sales Service'}</p>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-muted-foreground">{dictionary?.billing?.annualService || 'Annual after-sales service renewal'}</p>
                        </div>
                        <div className="text-end">
                          <p className="text-2xl font-bold text-primary">{RENEWAL_PRICE.toLocaleString()} DZD</p>
                          <p className="text-xs text-muted-foreground">{dictionary?.billing?.perYear || '/ year'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handlePayWithCard}
                    className="flex-1 gap-2"
                    variant="default"
                    size="lg"
                  >
                    <CreditCard className="h-4 w-4" />
                    {isTrial
                      ? (dictionary?.billing?.purchaseNow || 'Purchase Now (CIB/Edahabia)')
                      : (dictionary?.billing?.renewNow || 'Renew Now (CIB/Edahabia)')
                    }
                  </Button>
                </div>

                {/* Admin Manual Activation (hidden for regular users, or show only in dev) */}
                {process.env.NODE_ENV === 'development' && (
                  <Button
                    onClick={handleManualRenew}
                    disabled={loading}
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs opacity-50"
                  >
                    {loading ? 'Processing...' : '[DEV] Manual Activation'}
                  </Button>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  {dictionary?.billing?.securePayment || 'Secure payment powered by Chargily Pay'}
                </p>
              </>
            )}

            {/* Premium Active - No payment needed */}
            {isPremiumActive && (
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="font-semibold text-green-800 dark:text-green-300">
                      {dictionary?.billing?.allGood || 'You\'re all set!'}
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-400">
                      {dictionary?.billing?.serviceActive || 'Your license and after-sales service are active.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Dialog with 3D Card */}
      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        amount={currentPaymentAmount}
        clientName={profile?.displayName || profile?.email || 'Customer'}
        invoiceNumber={`${paymentType}-${user?.uid?.slice(0, 8) || 'USER'}-${Date.now()}`}
        onPaymentInitiated={() => {
          // Payment initiated - user will be redirected to Chargily
          // The invoice number contains payment type for webhook processing:
          // - FIRST_PURCHASE-xxx = New license purchase
          // - RENEWAL-xxx = After-sales renewal
        }}
        dictionary={dictionary}
      />
    </>
  );
}
