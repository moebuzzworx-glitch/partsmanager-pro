'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanyInfoModal } from '@/app/[locale]/settings/company-info-modal';
import { BusinessRulesModal } from '@/app/[locale]/settings/business-rules-modal';
import { BillingPanel } from './billing-panel';


export function SettingsForm({ dictionary }: { dictionary?: any }) {
    return (
        <div dir="inherit">
            <Tabs defaultValue="company">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="company">{dictionary?.settings?.companyTab || 'Company'}</TabsTrigger>
                    <TabsTrigger value="business">{dictionary?.settings?.businessTab || 'Business'}</TabsTrigger>
                    <TabsTrigger value="subscription">{dictionary?.settings?.subscriptionTab || 'Subscription'}</TabsTrigger>
                </TabsList>

            <TabsContent value="company" dir="inherit">
                <Card className="hover:shadow-md transition-shadow" dir="inherit">
                    <CardHeader>
                        <CardTitle>{dictionary?.settings?.companyTitle || 'Company Information'}</CardTitle>
                        <CardDescription>
                            {dictionary?.settings?.companyDescription || 'This information will be displayed on your invoices.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent dir="inherit">
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                {dictionary?.settings?.companySubtext || 'Manage your company details including registration numbers and bank information.'}
                            </p>
                            <CompanyInfoModal dictionary={dictionary} />
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="business" dir="inherit">
                <Card className="hover:shadow-md transition-shadow" dir="inherit">
                    <CardHeader>
                        <CardTitle>{dictionary?.settings?.businessTitle || 'Business Rules'}</CardTitle>
                        <CardDescription>
                            {dictionary?.settings?.businessDescription || 'Set default values for business logic like pricing.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent dir="inherit">
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                {dictionary?.settings?.businessSubtext || 'Configure default profit margins and VAT settings for your business.'}
                            </p>
                            <BusinessRulesModal dictionary={dictionary} />
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="subscription" dir="inherit">
                <BillingPanel dictionary={dictionary} />
            </TabsContent>
        </Tabs>
        </div>
    )
}
