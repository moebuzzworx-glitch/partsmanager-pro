
'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Product } from '@/lib/types';
import { useFirestore } from '@/firebase';
import { addProductOrUpdateStock } from '@/firebase/atomic-updates';
import * as XLSX from 'xlsx';

interface BatchImportCardProps {
  onProductsAdded: () => void;
  existingProducts: Product[];
}

const getProfitMargin = (): number => {
    try {
        const storedMargin = localStorage.getItem('profitMargin');
        if (storedMargin) {
            const margin = parseFloat(storedMargin);
            if (!isNaN(margin)) {
                return margin;
            }
        }
    } catch (error) {
        console.error("Could not retrieve profit margin from local storage", error);
    }
    // Defaulting to 25% if nothing is stored or if it's invalid
    return 25;
};

export function BatchImportCard({ onProductsAdded, existingProducts }: BatchImportCardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const firestore = useFirestore();

  const handleFileSelect = (selectedFile: File | null) => {
    if (selectedFile) {
      if (!['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'].includes(selectedFile.type) && !selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.xlsx')) {
        toast({
            title: "Invalid File Type",
            description: "Please upload a CSV or Excel file.",
            variant: "destructive"
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files ? e.target.files[0] : null);
  };
  
  const onDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files ? e.dataTransfer.files[0] : null);
  }, []);
  
  const handleRemoveFile = () => {
      setFile(null);
  }

  const handleUpload = async () => {
    if (!file || !firestore) return;
    setIsLoading(true);
    toast({
        title: "Upload Started",
        description: `Processing ${file.name}...`,
    });

    try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'buffer' });
        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const rows = data.slice(1); // Assuming header row
        
        const margin = getProfitMargin();
        const markup = 1 + (margin / 100);
        let productsProcessedCount = 0;

        for (const row of rows as any[]) {
            if (!row || row.length === 0) continue;
            
            const [designation, reference, quantity, purchasePrice, brand] = row;
            
            if (!designation) continue; // Skip empty rows

            const productData: Omit<Product, 'id'> = {
                name: designation || '',
                reference: reference || '',
                stock: parseInt(quantity, 10) || 0,
                purchasePrice: parseFloat(purchasePrice) || 0,
                brand: brand || '',
                price: (parseFloat(purchasePrice) || 0) * markup,
                deletedAt: null,
            };

            // Use the atomic operation for each product
            await addProductOrUpdateStock(firestore, productData, existingProducts);
            productsProcessedCount++;
        }
        
        onProductsAdded();
        toast({
            title: "Batch Import Successful",
            description: `${productsProcessedCount} products have been added or updated.`
        });
        setFile(null);

    } catch (error) {
        console.error("Batch import failed", error);
        toast({
            title: "Batch Import Failed",
            description: "An error occurred during the batch import process. Please ensure the file format is correct.",
            variant: "destructive"
        })
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Card
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={cn("transition-colors", (isDragging || isLoading) ? "border-primary bg-primary/10" : "")}
    >
      <CardHeader>
        <CardTitle>Batch Import</CardTitle>
        <CardDescription>Import products in bulk using a CSV or Excel file.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center gap-4 text-center border-2 border-dashed border-muted-foreground/30 rounded-lg p-12">
        <input type="file" ref={fileInputRef} onChange={onFileChange} className="hidden" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" disabled={isLoading} />
        {isLoading ? (
             <div className="flex flex-col items-center gap-4 text-primary">
                <Loader2 className="w-12 h-12 animate-spin" />
                <p className="font-medium">Processing...</p>
                <p className='text-sm text-muted-foreground'>This may take a few moments.</p>
            </div>
        ) : file ? (
            <div className="flex flex-col items-center gap-4">
                <FileText className="w-12 h-12 text-primary" />
                <p className="font-medium">{file.name}</p>
                <div className="flex gap-2">
                    <Button onClick={handleUpload}>Upload and Process</Button>
                    <Button variant="ghost" size="icon" onClick={handleRemoveFile}>
                        <X className="w-4 h-4"/>
                    </Button>
                </div>
            </div>
        ) : (
          <>
            <div className={cn("p-3 bg-muted rounded-full transition-colors", isDragging ? 'bg-primary/20' : '')}>
              <Upload className={cn("w-8 h-8 text-muted-foreground transition-colors", isDragging ? 'text-primary' : '')} />
            </div>
            <p className="text-muted-foreground">
                {isDragging ? "Drop the file to upload" : "Drag & drop your file here or click to browse"}
            </p>
            <Button variant="outline" onClick={onButtonClick}>
              Select File
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
