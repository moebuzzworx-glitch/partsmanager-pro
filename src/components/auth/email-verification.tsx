'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase/provider';
import { resendVerificationEmail, handleEmailVerificationComplete } from '@/firebase/auth-functions';
import { getVerificationResendCooldownSeconds } from '@/lib/trial-utils';
import { Loader2, Mail } from 'lucide-react';

export function EmailVerificationComponent() {
  const router = useRouter();
  const { toast } = useToast();
  const { auth, firestore, user, isUserLoading } = useFirebase();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Check verification status periodically
  useEffect(() => {
    if (!user || isUserLoading) return;

    const checkVerification = async () => {
      setIsChecking(true);
      try {
        // Reload user to get updated emailVerified status
        await user.reload();

        if (user.emailVerified) {
          // Email verified - update Firestore and redirect
          if (auth && firestore) {
            await handleEmailVerificationComplete(auth, firestore, user);
          }
          
          toast({
            title: 'Email Verified!',
            description: 'Your email has been verified. Welcome to the trial!',
          });
          
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Error checking verification:', error);
      } finally {
        setIsChecking(false);
      }
    };

    // Check immediately and then every 5 seconds
    checkVerification();
    const interval = setInterval(checkVerification, 5000);

    return () => clearInterval(interval);
  }, [user, isUserLoading, auth, firestore, router, toast]);

  // Countdown for resend button
  useEffect(() => {
    if (!user || !firestore) return;

    const calculateCooldown = async () => {
      try {
        // Get user doc from Firestore to check verificationSentAt
        const { doc, getDoc } = await import('firebase/firestore');
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          if (userData.verificationSentAt) {
            const lastSentTime = new Date(userData.verificationSentAt.toDate());
            const timeSinceLastSend = Date.now() - lastSentTime.getTime();
            const cooldownMs = 60 * 1000;
            
            const remaining = Math.max(0, Math.ceil((cooldownMs - timeSinceLastSend) / 1000));
            setCooldownSeconds(remaining);

            if (remaining > 0) {
              const timer = setInterval(() => {
                setCooldownSeconds(prev => {
                  if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                  }
                  return prev - 1;
                });
              }, 1000);

              return () => clearInterval(timer);
            }
          }
        }
      } catch (error) {
        console.error('Error calculating cooldown:', error);
      }
    };

    const unsubscribe = calculateCooldown();
    return () => {
      if (unsubscribe) unsubscribe.then(unsub => unsub?.());
    };
  }, [user, firestore]);

  async function handleResendEmail() {
    if (!auth || !firestore || !user) return;

    try {
      setIsLoading(true);
      await resendVerificationEmail(auth, firestore, user);
      
      toast({
        title: 'Email Sent',
        description: 'Verification email has been resent. Check your inbox.',
      });

      setCooldownSeconds(60);
    } catch (error: any) {
      console.error('Resend error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to resend verification email.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (isUserLoading || isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Checking verification status...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">No user logged in</p>
          <Button onClick={() => router.push('/login')}>Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="flex justify-center">
          <Mail className="h-12 w-12 text-muted-foreground" />
        </div>
        
        <div>
          <h1 className="text-2xl font-bold mb-2">Verify Your Email</h1>
          <p className="text-sm text-muted-foreground">
            We've sent a verification link to <strong>{user.email}</strong>
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-900 dark:text-blue-200">
            Click the link in your email to verify your account and start your 5-day trial.
          </p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-4">
            Didn't receive the email? Check your spam folder or resend it below.
          </p>
          
          <Button
            onClick={handleResendEmail}
            disabled={isLoading || cooldownSeconds > 0}
            variant="outline"
            className="w-full"
          >
            {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {cooldownSeconds > 0
              ? `Resend in ${cooldownSeconds}s`
              : 'Resend Verification Email'}
          </Button>
        </div>

        <div>
          <Button
            onClick={() => router.push('/login')}
            variant="ghost"
            className="w-full text-xs"
          >
            Back to Login
          </Button>
        </div>
      </div>
    </div>
  );
}
