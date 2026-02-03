'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanyInfoModal } from '@/app/[locale]/settings/company-info-modal';
import { BusinessRulesModal } from '@/app/[locale]/settings/business-rules-modal';
import { JuridicTermsModal } from '@/app/[locale]/settings/juridic-terms-modal';
import { BillingPanel } from './billing-panel';
import { NotificationSoundSettings } from '@/components/notification-sound-settings';
import { SecuritySettings } from './security-settings';


export function SettingsForm({ dictionary }: { dictionary?: any }) {
    return (
        <div dir="inherit">
            <Tabs defaultValue="company">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto">
                    <TabsTrigger value="company">{dictionary?.settings?.companyTab || 'Company'}</TabsTrigger>
                    <TabsTrigger value="business">{dictionary?.settings?.businessTab || 'Business'}</TabsTrigger>
                    <TabsTrigger value="notifications">{dictionary?.settings?.notificationsTab || 'Notifications'}</TabsTrigger>
                    <TabsTrigger value="subscription">{dictionary?.settings?.subscriptionTab || 'Subscription'}</TabsTrigger>
                    <TabsTrigger value="security">{dictionary?.settings?.securityTab || 'Security'}</TabsTrigger>
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
                                <div className="pt-4 border-t">
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Configure terms for "Facture à termes" invoices.
                                    </p>
                                    <JuridicTermsModal dictionary={dictionary} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="notifications" dir="inherit">
                    <Card className="hover:shadow-md transition-shadow" dir="inherit">
                        <CardHeader>
                            <CardTitle>{dictionary?.settings?.notificationsTitle || 'Notification Settings'}</CardTitle>
                            <CardDescription>
                                {dictionary?.settings?.notificationsDescription || 'Control how you receive notifications.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent dir="inherit">
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-medium mb-4">{dictionary?.settings?.soundSettings || 'Sound Settings'}</h3>
                                    <NotificationSoundSettings dictionary={dictionary} />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {dictionary?.settings?.notificationsSubtext || 'Notification sounds will play for all notification types including low stock alerts, system messages, and updates.'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="subscription" dir="inherit">
                    <BillingPanel dictionary={dictionary} />
                </TabsContent>

                <TabsContent value="security" dir="inherit">
                    <SecuritySettings dictionary={dictionary} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
