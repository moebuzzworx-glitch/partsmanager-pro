
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
import { useEffect } from 'react';
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
    } catch (error) {
        console.error("Could not retrieve company info from local storage", error);
    }
  }, [form]);

  function onSubmit(values: CompanyInfo) {
    try {
        localStorage.setItem('companyInfo', JSON.stringify(values));
        toast({
          title: 'Information Saved',
          description: 'Your company details have been updated.',
        });
    } catch (error) {
        toast({
            title: 'Error Saving',
            description: 'Could not save company information.',
            variant: 'destructive',
        });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
