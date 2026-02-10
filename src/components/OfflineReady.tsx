'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/**
 * CORE APP ROUTES TO PRECACHE
 * Using Next.js <Link prefetch={true}> ensures that not just the HTML,
 * but the necessary JS chunks and RSC payloads are fetched.
 * The Service Worker will then cache these resources.
 */
const ROUTES_TO_CACHE = [
    '/dashboard',
    '/dashboard/invoices',
    '/dashboard/create-invoice',
    '/dashboard/products',
    '/dashboard/stock',
    '/dashboard/sales',
    '/dashboard/clients',
    '/dashboard/settings',
    '/scan',
];

export function OfflineReady() {
    const [shouldLoad, setShouldLoad] = useState(false);

    useEffect(() => {
        // Delay prefetching to avoid impacting initial page load performance
        const timer = setTimeout(() => {
            // Only run if we haven't done this recently (e.g. this session)
            if (!sessionStorage.getItem('offline_precache_done')) {
                setShouldLoad(true);
                console.log('[OfflineReady] Prefetching routes for offline support...');
                sessionStorage.setItem('offline_precache_done', 'true');
            }
        }, 4000);

        return () => clearTimeout(timer);
    }, []);

    if (!shouldLoad) return null;

    return (
        <div style={{ display: 'none' }} aria-hidden="true">
            {ROUTES_TO_CACHE.map((route) => (
                <Link key={route} href={route} prefetch={true}>
                    {route}
                </Link>
            ))}
        </div>
    );
}
