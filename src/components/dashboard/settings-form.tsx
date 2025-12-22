'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanyInfoModal } from '@/app/[locale]/settings/company-info-modal';
import { BusinessRulesModal } from '@/app/[locale]/settings/business-rules-modal';
import { BillingPanel } from './billing-panel';


export function SettingsForm() {
    return (
        <Tabs defaultValue="company">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="company">Company</TabsTrigger>
                <TabsTrigger value="business">Business</TabsTrigger>
                <TabsTrigger value="billing">Billing</TabsTrigger>
            </TabsList>

            <TabsContent value="company">
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                        <CardTitle>Company Information</CardTitle>
                        <CardDescription>
                            This information will be displayed on your invoices.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Manage your company details including registration numbers and bank information.
                            </p>
                            <CompanyInfoModal />
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="business">
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                        <CardTitle>Business Rules</CardTitle>
                        <CardDescription>
                            Set default values for business logic like pricing.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Configure default profit margins and VAT settings for your business.
                            </p>
                            <BusinessRulesModal />
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="billing">
                <BillingPanel />
            </TabsContent>
        </Tabs>
    )
}
