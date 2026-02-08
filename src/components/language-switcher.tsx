'use client'

import * as React from 'react';
import { usePathname } from 'next/navigation'
import { i18n } from '@/lib/config'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Globe } from 'lucide-react'

export function LanguageSwitcher() {
  const pathName = usePathname()
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const redirectedPathName = (locale: string) => {
    if (!pathName) return '/'
    const segments = pathName.split('/')
    segments[1] = locale
    return segments.join('/')
  }

  if (!isMounted) {
    return null;
  }

  const handleLocaleChange = (locale: string) => {
    window.location.href = redirectedPathName(locale);
  };

  const locale = pathName?.split('/')[1] || 'en';
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <DropdownMenu dir={dir}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Globe className="h-5 w-5" />
          <span className="sr-only">Switch language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {i18n.locales.map((locale) => {
          return (
            <DropdownMenuItem key={locale} onClick={() => handleLocaleChange(locale)}>
              {locale.toUpperCase()}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
