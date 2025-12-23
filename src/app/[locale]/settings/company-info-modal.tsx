 'use client';

import { useState, useEffect } from 'react';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { saveUserSettings, getUserSettings } from '@/lib/settings-utils';
import { useFirebase } from '@/firebase/provider';
import { updateProfile } from 'firebase/auth';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Save, Edit } from 'lucide-react';
 

const getCompanyInfoSchema = (dictionary?: any) => z.object({
  companyName: z.string().min(1, dictionary?.settings?.companyNameRequired || 'Company name is required.'),
  address: z.string().min(1, dictionary?.settings?.addressRequired || 'Address is required.'),
  phone: z.string().min(1, dictionary?.settings?.phoneRequired || 'Phone number is required.'),
  rc: z.string().min(1, dictionary?.settings?.rcRequired || 'R.C is required.'),
  nif: z.string().min(1, dictionary?.settings?.nifRequired || 'NIF is required.'),
  art: z.string().optional(),
  nis: z.string().optional(),
  rib: z.string().optional(),
});

export type CompanyInfo = z.infer<ReturnType<typeof getCompanyInfoSchema>>;

export function CompanyInfoModal({ dictionary }: { dictionary?: any }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { firestore, user, isUserLoading, firebaseApp, auth } = useFirebase() as any;
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const companyInfoSchema = getCompanyInfoSchema(dictionary);
  const form = useForm<CompanyInfo>({
    resolver: zodResolver(companyInfoSchema),
    defaultValues: {
      companyName: '',
      address: '',
      phone: '',
      rc: '',
      nif: '',
      art: '',
      nis: '',
      rib: '',
    },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (user && firestore && !isUserLoading) {
          const settings = await getUserSettings(firestore, user.uid);
          const info = {
            companyName: settings.companyName || '',
            address: settings.address || '',
            phone: settings.phone || '',
            rc: settings.rc || '',
            nif: settings.nif || '',
            art: settings.art || '',
            nis: settings.nis || '',
            rib: settings.rib || '',
          };
          if (!cancelled) form.reset(info);
          if ((settings as any).logoUrl) setPreviewUrl((settings as any).logoUrl);
          return;
        }

        // Fallback to localStorage
        const storedInfo = localStorage.getItem('companyInfo');
        if (storedInfo && !cancelled) {
          form.reset(JSON.parse(storedInfo));
        }
      } catch (error) {
        console.error('Could not retrieve company info', error);
      }
    })();
    return () => { cancelled = true };
  }, [form]);

  async function onSubmit(values: CompanyInfo) {
    try {
      let uploadedLogoUrl: string | undefined;
      try {
          // If a new logo file was selected, upload it
          if (logoFile) {
            // Prefer Cloudinary unsigned upload when configured
            if (
              process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
              process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
            ) {
              const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
              const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
              const url = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;
              const fd = new FormData();
              fd.append('file', logoFile);
              fd.append('upload_preset', preset);
              const r = await fetch(url, { method: 'POST', body: fd });
              if (!r.ok) throw new Error('Cloudinary upload failed: ' + await r.text());
              const jj = await r.json();
              uploadedLogoUrl = jj.secure_url;
              setPreviewUrl(uploadedLogoUrl);
              // Update Firebase Auth profile photoURL (best-effort)
              try { if (auth && auth.currentUser && uploadedLogoUrl) { await updateProfile(auth.currentUser, { photoURL: uploadedLogoUrl }); try { await auth.currentUser.getIdToken(true); } catch {} } } catch (e) { console.warn('Failed to update auth profile photoURL', e); }
            } else if (process.env.NEXT_PUBLIC_USE_SERVER_UPLOAD === 'true') {
              const toBase64 = (file: File) => new Promise<string>((res, rej) => {
                const reader = new FileReader();
                reader.onload = () => res((reader.result as string).split(',')[1]);
                reader.onerror = rej;
                reader.readAsDataURL(file);
              });
              const base64 = await toBase64(logoFile);
              const resp = await fetch('/.netlify/functions/upload-logo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: logoFile.name, contentType: logoFile.type, data: base64, uid: user?.uid }),
              });
              if (!resp.ok) throw new Error('Server upload failed');
              const j = await resp.json();
              uploadedLogoUrl = j.url;
              setPreviewUrl(uploadedLogoUrl);
              // Update Firebase Auth profile photoURL so header/avatar updates (best-effort)
              try {
                if (auth && auth.currentUser && uploadedLogoUrl) {
                  await updateProfile(auth.currentUser, { photoURL: uploadedLogoUrl });
                  try { await auth.currentUser.getIdToken(true); } catch {}
                }
              } catch (e) {
                console.warn('Failed to update auth profile photoURL', e);
              }
            } else if (firebaseApp && user) {
              const storage = getStorage(firebaseApp as any);
              const sRef = storageRef(storage, `logos/${user.uid}/${Date.now()}_${logoFile.name}`);
              await uploadBytes(sRef, logoFile);
              uploadedLogoUrl = await getDownloadURL(sRef);
              setPreviewUrl(uploadedLogoUrl);
              // Update Firebase Auth profile photoURL so header/avatar updates
              try {
                if (auth && auth.currentUser && uploadedLogoUrl) {
                  await updateProfile(auth.currentUser, { photoURL: uploadedLogoUrl });
                  try { await auth.currentUser.getIdToken(true); } catch {}
                }
              } catch (e) {
                console.warn('Failed to update auth profile photoURL', e);
              }
            }
          }

          // Persist settings to Firestore when available
          if (user && firestore) {
            const payload: any = {
              companyName: values.companyName,
              address: values.address,
              phone: values.phone,
              rc: values.rc,
              nif: values.nif,
              art: values.art,
              nis: values.nis,
              rib: values.rib,
            };
            if (uploadedLogoUrl) payload.logoUrl = uploadedLogoUrl;
            await saveUserSettings(firestore, user.uid, payload);
          }
      } catch (e) {
        console.error('Failed to save company info to Firestore or upload logo', e);
        throw e;
      }

      // Always persist locally
      const localSave: any = { ...values };
      if (uploadedLogoUrl) localSave.logoUrl = uploadedLogoUrl;
      localStorage.setItem('companyInfo', JSON.stringify(localSave));

      // Force auth token refresh so onIdTokenChanged listeners update (avatar/displayName)
      try {
        if (auth && auth.currentUser && typeof auth.currentUser.getIdToken === 'function') {
          await auth.currentUser.getIdToken(true);
        }
      } catch (e) {
        // ignore
      }

      // Emit a global event so other components can re-fetch settings if needed
      try {
        window.dispatchEvent(new CustomEvent('app:settings-updated', { detail: { uid: user?.uid } }));
      } catch (e) {
        // ignore when SSR or unavailable
      }

      toast({
        title: dictionary?.settings?.saveSuccess || 'Information Saved',
        description: dictionary?.settings?.saveSuccessMessage || 'Your company details have been updated.',
      });
      setOpen(false);

      // Reload the page after a brief delay so modal closes first
      setTimeout(() => {
        try {
          window.location.reload();
        } catch (e) {
          console.warn('Page reload failed:', e);
        }
      }, 300);
    } catch (error) {
      toast({
        title: dictionary?.settings?.saveError || 'Error Saving',
        description: dictionary?.settings?.saveErrorMessage || 'Could not save company information.',
        variant: 'destructive',
      });
    }
  }

  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (f) {
      setLogoFile(f);
      setPreviewUrl(URL.createObjectURL(f));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <Edit className="mr-2 h-4 w-4" />
          {dictionary?.settings?.editCompanyButton || 'Edit Company Information'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dictionary?.settings?.editDialogTitle || 'Edit Company Information'}</DialogTitle>
          <DialogDescription>
            {dictionary?.settings?.editDialogDescription || 'This information will be displayed on your invoices.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" dir="inherit">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dictionary?.settings?.companyName || 'Company Name'} *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={dictionary?.settings?.companyNamePlaceholder || 'Your Company Name'} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dictionary?.settings?.phone || 'Phone'} *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={dictionary?.settings?.phonePlaceholder || '+213 XXX XXX XXX'} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dictionary?.settings?.address || 'Address'} *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={dictionary?.settings?.addressPlaceholder || 'Street address'} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dictionary?.settings?.rc || 'R.C (Registre de Commerce)'} *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={dictionary?.settings?.rcPlaceholder || 'RC Number'} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nif"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dictionary?.settings?.nif || 'NIF (Numéro d\'Identification Fiscale)'} *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={dictionary?.settings?.nifPlaceholder || 'NIF Number'} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="art"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dictionary?.settings?.art || 'ART (Article d\'imposition)'}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={dictionary?.settings?.artPlaceholder || 'ART Number'} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dictionary?.settings?.nis || 'NIS (Numéro d\'Identification Statistique)'}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={dictionary?.settings?.nisPlaceholder || 'NIS Number'} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="rib"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dictionary?.settings?.rib || 'RIB (Relevé d\'Identité Bancaire)'}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={dictionary?.settings?.ribPlaceholder || 'Bank Account RIB'} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="col-span-1 md:col-span-2">
              <FormLabel>{dictionary?.settings?.logo || 'Company Logo'} ({dictionary?.table?.optional || 'optional'})</FormLabel>
              <div className="flex items-center gap-4">
                <input type="file" accept="image/*" onChange={onLogoChange} />
                {previewUrl ? (
                  <img src={previewUrl} alt="logo preview" className="h-12 w-12 object-contain rounded" />
                ) : null}
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {dictionary?.settings?.cancelButton || 'Cancel'}
              </Button>
              <Button type="submit">
                <Save className="mr-2 h-4 w-4" />
                {dictionary?.settings?.saveButton || 'Save Information'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
