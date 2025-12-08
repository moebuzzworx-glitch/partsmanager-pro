
import { PageHeader } from '@/components/page-header';
import { CompanyInfoForm } from './company-info-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RestoreData } from './restore-data';
import { ProfitMarginForm } from './profit-margin-form';

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Settings"
        description="Manage your company information and application preferences."
      />
      <main className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>
                This information will be displayed on your invoices.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CompanyInfoForm />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
                <CardTitle>Business Rules</CardTitle>
                <CardDescription>
                    Set default values for business logic like pricing.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ProfitMarginForm />
            </CardContent>
          </Card>

          <RestoreData />

        </div>
      </main>
    </div>
  );
}
