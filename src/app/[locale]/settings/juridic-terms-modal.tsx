'use client';

import { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase/provider';
import { getUserSettings, saveUserSettings } from '@/lib/settings-utils';
import { Save, Sparkles, Loader2, FileText } from 'lucide-react';
import { enhanceJuridicTerms } from '@/app/actions/juridic-terms-ai';

const formSchema = z.object({
    juridicTerms: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function JuridicTermsModal({ dictionary }: { dictionary?: any }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const { toast } = useToast();

    const { firestore, user, isUserLoading } = useFirebase();

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            juridicTerms: '',
        },
    });

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (user && firestore && !isUserLoading) {
                const settings = await getUserSettings(firestore, user.uid);
                if (!cancelled) {
                    form.reset({
                        juridicTerms: settings.juridicTerms || '',
                    });
                }
            }
        })();
        return () => { cancelled = true };
    }, [user, firestore, isUserLoading, form]);

    async function handleEnhance() {
        const currentText = form.getValues('juridicTerms');
        if (!currentText || currentText.trim().length === 0) {
            toast({ title: 'Empty Content', description: 'Please enter some terms first.', variant: 'destructive' });
            return;
        }

        setIsEnhancing(true);
        try {
            const result = await enhanceJuridicTerms(currentText);
            if (result.success && result.data) {
                form.setValue('juridicTerms', result.data);
                toast({ title: 'Enhanced', description: 'Terms translated and polished into French.' });
            } else {
                toast({ title: 'AI Error', description: result.error || 'Failed to enhance terms', variant: 'destructive' });
            }
        } catch (e) {
            toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' });
        } finally {
            setIsEnhancing(false);
        }
    }

    async function onSubmit(values: FormData) {
        setIsLoading(true);
        try {
            if (user && firestore) {
                await saveUserSettings(firestore, user.uid, {
                    juridicTerms: values.juridicTerms,
                });
            }

            toast({
                title: 'Saved',
                description: 'Juridic terms updated successfully.',
            });
            setOpen(false);
        } catch (error) {
            console.error('Failed to save terms:', error);
            toast({
                title: 'Error Saving',
                description: 'Could not save terms.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full justify-start mt-2">
                    <FileText className="mr-2 h-4 w-4" />
                    {dictionary?.settings?.juridicTermsModalTitle || 'Edit Juridic Terms'}
                </Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[600px] max-h-[85vh] overflow-y-auto p-4 sm:p-6">
                <DialogHeader>
                    <DialogTitle>{dictionary?.settings?.juridicTermsModalTitle || 'Edit Juridic Terms'}</DialogTitle>
                    <DialogDescription>
                        {dictionary?.settings?.juridicTermsModalDescription || 'Define the legal terms and conditions that will appear on your term invoices.'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="juridicTerms"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{dictionary?.settings?.juridicTermsLabel || 'Juridic Terms'}</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            {...field}
                                            placeholder={dictionary?.settings?.juridicTermsPlaceholder || "Enter terms here..."}
                                            className="min-h-[200px] font-mono text-sm"
                                            disabled={isLoading || isEnhancing}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex gap-2 justify-end">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={handleEnhance}
                                disabled={isLoading || isEnhancing}
                                className="gap-2"
                            >
                                {isEnhancing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-purple-600" />}
                                {dictionary?.settings?.enhanceAI || 'Enhance & Translate (AI)'}
                            </Button>
                        </div>

                        <DialogFooter className="mt-6">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                {dictionary?.settings?.cancelButton || 'Cancel'}
                            </Button>
                            <Button type="submit" disabled={isLoading || isEnhancing}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {dictionary?.common?.saving || 'Saving...'}
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        {dictionary?.settings?.saveTerms || 'Save Terms'}
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
