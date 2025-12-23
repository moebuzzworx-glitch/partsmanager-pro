 'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirebase } from '@/firebase/provider';
import { fetchUserById, changeUserSubscription } from '@/lib/user-management';
import { useToast } from '@/hooks/use-toast';

export function BillingPanel({ dictionary }: { dictionary?: any }) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [profile, setProfile] = React.useState<any | null>(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user || !firestore) return;
      try {
        const p = await fetchUserById(firestore, user.uid);
        if (mounted) setProfile(p);
      } catch (e) {
        console.error('Failed to fetch user profile for billing', e);
      }
    })();
    return () => { mounted = false };
  }, [user, firestore]);

  async function handleRenew() {
    if (!user || !firestore) return;
    setLoading(true);
    try {
      const ok = await changeUserSubscription(firestore, user.uid, 'premium');
      if (ok) {
        toast({ title: dictionary?.billing?.renewalSuccess || 'Subscription Renewed', description: dictionary?.billing?.renewalSuccessMessage || 'Your subscription has been renewed for 1 year.' });
        const p = await fetchUserById(firestore, user.uid);
        setProfile(p);
      } else {
        toast({ title: dictionary?.billing?.renewalError || 'Renewal Failed', description: dictionary?.billing?.renewalErrorMessage || 'Could not renew subscription.', variant: 'destructive' });
      }
    } catch (e) {
      console.error('Renew failed', e);
      toast({ title: dictionary?.table?.error || 'Error', description: dictionary?.billing?.renewalUnexpectedError || 'Unexpected error during renewal.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card dir="inherit">
      <CardHeader>
        <CardTitle>{dictionary?.billing?.title || 'Subscription'}</CardTitle>
        <CardDescription>{dictionary?.billing?.description || 'Manage your plan and renewal.'}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm">{dictionary?.billing?.plan || 'Plan:'} <strong>{profile?.subscription ?? 'unknown'}</strong></p>
            {profile?.premiumExpiryDate ? (
              <p className="text-sm">{dictionary?.billing?.expires || 'Expires:'} {new Date(profile.premiumExpiryDate.seconds * 1000).toLocaleDateString()}</p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button onClick={handleRenew} disabled={loading}>
              {loading ? dictionary?.billing?.processing || 'Processing...' : dictionary?.billing?.renewButton || 'Renew / Upgrade to Premium'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
