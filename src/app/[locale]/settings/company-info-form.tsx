
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { useFirebase } from '@/firebase/provider';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { saveUserSettings, getUserSettings } from '@/lib/settings-utils';
import { Save } from 'lucide-react';

const companyInfoSchema = z.object({
  companyName: z.string().min(1, 'Company name is required.'),
  address: z.string().min(1, 'Address is required.'),
  phone: z.string().min(1, 'Phone number is required.'),
  rc: z.string().min(1, 'R.C is required.'),
  nif: z.string().min(1, 'NIF is required.'),
  art: z.string().optional(),
  nis: z.string().optional(),
  rib: z.string().optional(),
});

export type CompanyInfo = z.infer<typeof companyInfoSchema>;

export function CompanyInfoForm() {
  const { toast } = useToast();
  const { firebaseApp, firestore, user } = useFirebase();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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
    try {
      const storedInfo = localStorage.getItem('companyInfo');
      if (storedInfo) {
        form.reset(JSON.parse(storedInfo));
      }
      // if user settings exist in Firestore, prefer them
      (async () => {
        try {
          if (firestore && user) {
            const settings = await getUserSettings(firestore, user.uid);
            if (settings) {
              form.reset({
                companyName: settings.companyName || '',
                address: settings.address || '',
                phone: settings.phone || '',
                rc: settings.rc || '',
                nif: settings.nif || '',
                art: settings.art || '',
                nis: settings.nis || '',
                rib: settings.rib || '',
              });
              if ((settings as any).logoUrl) setPreviewUrl((settings as any).logoUrl);
            }
          }
        } catch (e) {
          // ignore
        }
      })();
    } catch (error) {
        console.error("Could not retrieve company info from local storage", error);
    }
  }, [form]);

  async function onSubmit(values: CompanyInfo) {
    try {
      // If a logo file was selected and Firebase is available, upload it
      let uploadedLogoUrl: string | undefined;
      if (logoFile && firebaseApp && user) {
        try {
          const storage = getStorage(firebaseApp as any);
          const sRef = storageRef(storage, `logos/${user.uid}/${Date.now()}_${logoFile.name}`);
          await uploadBytes(sRef, logoFile);
          uploadedLogoUrl = await getDownloadURL(sRef);
        } catch (err) {
          console.error('Logo upload failed', err);
          toast({ title: dictionary?.errors?.title, description: dictionary?.errors?.uploadFailed, variant: 'destructive' });
        }
      }

      // Save to Firestore settings if available
      if (firestore && user) {
        const savePayload: any = {
          companyName: values.companyName,
          address: values.address,
          phone: values.phone,
          rc: values.rc,
          nif: values.nif,
          art: values.art,
          nis: values.nis,
          rib: values.rib,
        };
        if (uploadedLogoUrl) savePayload.logoUrl = uploadedLogoUrl;
        await saveUserSettings(firestore, user.uid, savePayload);
      }

      // Always persist locally for the invoice generator fallback
      const localSave: any = { ...values };
      if (uploadedLogoUrl) localSave.logoUrl = uploadedLogoUrl;
      localStorage.setItem('companyInfo', JSON.stringify(localSave));
      if (uploadedLogoUrl) setPreviewUrl(uploadedLogoUrl);

      toast({
        title: 'Information Saved',
        description: 'Your company details have been updated.',
      });
    } catch (error) {
      console.error(error);
      toast({
        title: dictionary?.errors?.title,
        description: dictionary?.errors?.saveFailed,
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2">
              <FormLabel>Company Logo (optional)</FormLabel>
              <div className="flex items-center gap-4">
                <input type="file" accept="image/*" onChange={onLogoChange} />
                {previewUrl ? (
                  <img src={previewUrl} alt="logo preview" className="h-12 w-12 object-contain rounded" />
                ) : null}
              </div>
            </div>
            <FormField
            control={form.control}
            name="companyName"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Company Name *</FormLabel>
                <FormControl>
                    <Input {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Address *</FormLabel>
                <FormControl>
                    <Input {...field} />
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
                <FormLabel>Phone *</FormLabel>
                <FormControl>
                    <Input {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="rc"
            render={({ field }) => (
                <FormItem>
                <FormLabel>R.C (Registre de Commerce) *</FormLabel>
                <FormControl>
                    <Input {...field} />
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
                <FormLabel>NIF (Numéro d'Identification Fiscale) *</FormLabel>
                <FormControl>
                    <Input {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="art"
            render={({ field }) => (
                <FormItem>
                <FormLabel>ART (Article d'imposition)</FormLabel>
                <FormControl>
                    <Input {...field} />
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
                <FormLabel>NIS (Numéro d'Identification Statistique)</FormLabel>
                <FormControl>
                    <Input {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="rib"
            render={({ field }) => (
                <FormItem>
                <FormLabel>RIB (Relevé d'Identité Bancaire)</FormLabel>
                <FormControl>
                    <Input {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <Button type="submit">
            <Save />
            Save Information
        </Button>
      </form>
    </Form>
  );
}
