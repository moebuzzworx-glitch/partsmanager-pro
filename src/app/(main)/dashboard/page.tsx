
'use client';

import React from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Boxes,
  ShoppingBasket,
  Receipt,
  Users,
  Building,
  ArrowRight,
  PlusCircle,
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Product, Customer, Supplier } from '@/lib/types';

const actionCards = [
  {
    title: 'Add New Sale',
    description: 'Record a new transaction with a customer.',
    icon: Receipt,
    href: '/sales',
    color: 'text-primary'
  },
  {
    title: 'Add New Purchase',
    description: 'Log a new stock acquisition from a supplier.',
    icon: ShoppingBasket,
    href: '/purchases',
    color: 'text-accent'
  },
];

export default function DashboardPage() {
  const firestore = useFirestore();
  const productsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore]);
  const { data: products } = useCollection<Product>(productsCollection);

  const customersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'customers') : null, [firestore]);
  const { data: customers } = useCollection<Customer>(customersCollection);

  const suppliersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'suppliers') : null, [firestore]);
  const { data: suppliers } = useCollection<Supplier>(suppliersCollection);

  const statCards = [
    {
      title: 'Total Products',
      value: products?.length ?? 0,
      icon: Boxes,
      color: 'text-sky-500',
    },
    {
      title: 'Total Customers',
      value: customers?.length ?? 0,
      icon: Users,
      color: 'text-amber-500',
    },
    {
      title: 'Total Suppliers',
      value: suppliers?.length ?? 0,
      icon: Building,
      color: 'text-emerald-500',
    },
  ];


  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Dashboard" description="Welcome back, Admin! Here's your store overview." />
      <main className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="grid gap-6">
          <div className="grid md:grid-cols-3 gap-6">
            {statCards.map((card) => (
              <Card key={card.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold font-headline">{card.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {actionCards.map((card) => (
              <Card key={card.title} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className={`rounded-lg p-3 bg-muted ${card.color}`}>
                      <card.icon className="h-6 w-6 text-background" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{card.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{card.description}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow flex items-end">
                    <Link href={card.href} className="w-full">
                        <Button className="w-full" variant="default">
                            <PlusCircle className="mr-2 h-4 w-4" /> Go to {card.title.split(' ')[2]}
                        </Button>
                    </Link>
                </CardContent>
              </Card>
            ))}
          </div>
          
        </div>
      </main>
    </div>
  );
}
