'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  automaticStockAdjustment,
  type AutomaticStockAdjustmentOutput,
} from '@/ai/flows/automatic-stock-adjustment';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bot, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function StockAdjustmentTool() {
  const [supplierList, setSupplierList] = useState('');
  const [adjustments, setAdjustments] = useState<AutomaticStockAdjustmentOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!supplierList.trim()) {
      toast({
        title: 'Input Required',
        description: "Please paste the supplier's product list.",
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setAdjustments(null);

    try {
      const result = await automaticStockAdjustment({ supplierProductList: supplierList });
      setAdjustments(result);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error Processing List',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleApplyAdjustments = () => {
    toast({
        title: 'Adjustments Applied',
        description: 'Stock levels have been successfully updated.',
    });
    setAdjustments(null);
    setSupplierList('');
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-full">
                <Bot className="w-6 h-6 text-primary" />
            </div>
            <div>
                <CardTitle>Automatic Stock Adjustment</CardTitle>
                <CardDescription>
                Paste a supplier's product list (e.g., from an email or text file) to
                automatically generate stock adjustments.
                </CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Textarea
          placeholder="e.g., Excavator Bucket: 10 units, Hydraulic Cylinder: 25 units..."
          value={supplierList}
          onChange={(e) => setSupplierList(e.target.value)}
          rows={6}
          disabled={isLoading}
        />
        <Button onClick={handleSubmit} disabled={isLoading} className="w-full sm:w-auto">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Process List'
          )}
        </Button>
      </CardContent>

      {adjustments && adjustments.adjustments.length > 0 && (
        <CardFooter className="flex-col items-start gap-4">
            <h3 className="font-semibold font-headline text-lg">Suggested Adjustments</h3>
          <div className="w-full border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Quantity Change</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustments.adjustments.map((adj, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{adj.productName}</TableCell>
                    <TableCell>
                      <Badge variant={adj.quantityChange > 0 ? 'default' : 'destructive'}>
                        {adj.quantityChange > 0 ? `+${adj.quantityChange}` : adj.quantityChange}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{adj.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Button onClick={handleApplyAdjustments} className="w-full sm:w-auto">Apply Adjustments</Button>
        </CardFooter>
      )}
    </Card>
  );
}
