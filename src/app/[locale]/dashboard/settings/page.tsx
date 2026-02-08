import { getDictionary } from "@/lib/dictionaries";
import { Locale } from "@/lib/config";
import { SettingsProvider } from "@/contexts/settings-context";
import { SettingsForm } from "@/components/dashboard/settings-form";

export default async function SettingsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const dictionary = await getDictionary(locale);

  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <SettingsProvider>
      <div className="space-y-8 max-w-full overflow-hidden" dir={dir}>
        <div>
          <h1 className="text-3xl font-headline font-bold">{dictionary.dashboard.settings}</h1>
          <p className="text-muted-foreground">{dictionary?.settings?.description || 'Manage your application and user settings.'}</p>
        </div>
        <SettingsForm dictionary={dictionary} dir={dir} />
      </div>
    </SettingsProvider>
  );
}
