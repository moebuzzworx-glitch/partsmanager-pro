'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, FileText, Calendar } from "lucide-react";

export default function ReportsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-headline font-bold">Reports Center</h1>
                <p className="text-muted-foreground mt-2">Generate and download business reports.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-600" />
                            Sales Report
                        </CardTitle>
                        <CardDescription>Monthly revenue and order summary</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Comprehensive breakdown of sales performance, including top products and revenue trends.
                        </p>
                        <Button className="w-full" variant="outline">
                            <FileDown className="mr-2 h-4 w-4" />
                            Download PDF
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-green-600" />
                            Inventory Status
                        </CardTitle>
                        <CardDescription>Current stock levels and valuation</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Detailed report of current inventory, including low stock items and total asset value.
                        </p>
                        <Button className="w-full" variant="outline">
                            <FileDown className="mr-2 h-4 w-4" />
                            Download CSV
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-orange-600" />
                            Supplier Performance
                        </CardTitle>
                        <CardDescription>Order history and fulfillment rates</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Analysis of supplier interactions, purchase history, and delivery timelines.
                        </p>
                        <Button className="w-full" variant="outline">
                            <FileDown className="mr-2 h-4 w-4" />
                            Download PDF
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <div className="mt-8 p-8 border rounded-lg bg-secondary/20 text-center">
                <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <h3 className="text-lg font-semibold">Scheduled Reports</h3>
                <p className="text-sm text-muted-foreground">Automated reporting is coming soon.</p>
            </div>
        </div>
    );
}
