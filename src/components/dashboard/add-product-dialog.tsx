
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { getDictionary } from '@/lib/dictionaries';
import { useFirebase } from '@/firebase/provider';
import { doc, getDoc, addDoc, collection } from 'firebase/firestore';
import { User as AppUser } from '@/lib/types';
import { canWrite, getExportRestrictionMessage } from '@/lib/trial-utils';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';

type Dictionary = Awaited<ReturnType<typeof getDictionary>>;

interface ProductRow {
  designation?: string;
  reference?: string;
  brand?: string;
  stock?: string | number;
  purchasePrice?: string | number;
  [key: string]: any;
}

export function AddProductDialog({ dictionary, onProductAdded }: { dictionary: Dictionary; onProductAdded?: () => void }) {
  const d = dictionary.addProductDialog;
  const { user, firestore } = useFirebase();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [userDoc, setUserDoc] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');
  const [formData, setFormData] = useState({
    designation: '',
    reference: '',
    brand: '',
    quantity: '0',
    purchasePrice: '0',
  });

  // Fetch user document to check permissions
  useEffect(() => {
    if (!user || !firestore) return;

    const fetchUserDoc = async () => {
      try {
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setUserDoc(userDocSnap.data() as AppUser);
        }
      } catch (error) {
        console.error('Error fetching user document:', error);
      }
    };

    fetchUserDoc();
  }, [user, firestore]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check permissions
    if (!canWrite(userDoc)) {
      const message = getExportRestrictionMessage(userDoc) || 'You do not have permission to add products.';
      toast({
        title: 'Permission Denied',
        description: message,
        variant: 'destructive',
      });
      return;
    }

    if (!firestore) {
      toast({
        title: 'Error',
        description: 'Firestore not initialized.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const productsRef = collection(firestore, 'products');
      await addDoc(productsRef, {
        name: formData.designation,
        reference: formData.reference,
        brand: formData.brand,
        stock: parseInt(formData.quantity),
        purchasePrice: parseFloat(formData.purchasePrice),
        price: parseFloat(formData.purchasePrice) * 1.25, // Default 25% markup
        createdAt: new Date(),
      });

      toast({
        title: 'Success',
        description: 'Product added successfully.',
      });

      // Reset form
      setFormData({
        designation: '',
        reference: '',
        brand: '',
        quantity: '0',
        purchasePrice: '0',
      });
      setOpen(false);
      
      // Call the callback if provided
      if (onProductAdded) {
        onProductAdded();
      }
    } catch (error: any) {
      console.error('Error adding product:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add product. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check permissions
    if (!canWrite(userDoc)) {
      const message = getExportRestrictionMessage(userDoc) || 'You do not have permission to add products.';
      toast({
        title: 'Permission Denied',
        description: message,
        variant: 'destructive',
      });
      return;
    }

    if (!firestore) {
      toast({
        title: 'Error',
        description: 'Firestore not initialized.',
        variant: 'destructive',
      });
      return;
    }

    setImportStatus('processing');
    setImportMessage('Processing file...');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const products = results.data as ProductRow[];
          
          if (products.length === 0) {
            setImportStatus('error');
            setImportMessage('No products found in file.');
            toast({
              title: 'Error',
              description: 'File is empty',
              variant: 'destructive',
            });
            return;
          }

          // Helper function to find column value case-insensitively
          const getColumnValue = (row: ProductRow, columnName: string): string => {
            const key = Object.keys(row).find(k => k.toLowerCase() === columnName.toLowerCase());
            return key ? String(row[key] || '') : '';
          };

          // Validate and import products
          let successCount = 0;
          let errorCount = 0;
          const errors: string[] = [];

          for (let i = 0; i < products.length; i++) {
            try {
              const row = products[i];
              
              // Extract values flexibly (case-insensitive)
              const designation = getColumnValue(row, 'Designation').trim();
              const reference = getColumnValue(row, 'Reference').trim();
              const brand = getColumnValue(row, 'Brand').trim();
              const stockStr = getColumnValue(row, 'Stock').trim();
              const priceStr = getColumnValue(row, 'Purchase Price').trim();

              // Validate required fields
              if (!designation) {
                errors.push(`Row ${i + 1}: Missing Designation`);
                errorCount++;
                continue;
              }

              const stock = parseInt(stockStr) || 0;
              const purchasePrice = parseFloat(priceStr) || 0;

              if (purchasePrice <= 0) {
                errors.push(`Row ${i + 1}: Invalid Purchase Price`);
                errorCount++;
                continue;
              }

              // Add to Firestore
              const productsRef = collection(firestore, 'products');
              await addDoc(productsRef, {
                name: designation,
                reference: reference || null,
                brand: brand || null,
                stock: stock,
                purchasePrice: purchasePrice,
                price: purchasePrice * 1.25, // Default 25% markup
                createdAt: new Date(),
              });

              successCount++;
            } catch (error: any) {
              errors.push(`Row ${i + 1}: ${error.message}`);
              errorCount++;
            }
          }

          // Report results
          const message = `Successfully imported ${successCount} products${errorCount > 0 ? `, ${errorCount} errors` : ''}`;
          setImportStatus(errorCount === 0 ? 'success' : 'error');
          setImportMessage(message);

          if (errorCount === 0) {
            toast({
              title: 'Success',
              description: `Imported ${successCount} products successfully`,
            });
            setOpen(false);
            if (onProductAdded) {
              onProductAdded();
            }
          } else {
            toast({
              title: 'Partial Import',
              description: message,
              variant: 'destructive',
            });
            console.log('Import errors:', errors);
          }
        } catch (error: any) {
          setImportStatus('error');
          setImportMessage(`Error processing file: ${error.message}`);
          toast({
            title: 'Error',
            description: 'Failed to process file',
            variant: 'destructive',
          });
        }
      },
      error: (error: any) => {
        setImportStatus('error');
        setImportMessage(`Error reading file: ${error.message}`);
        toast({
          title: 'Error',
          description: 'Failed to read file',
          variant: 'destructive',
        });
      },
    });
  };

  const downloadTemplate = () => {
    const template = [
      ['Designation', 'Reference', 'Brand', 'Stock', 'Purchase Price'],
      ['Excavator Bucket', 'EB-HD-001', 'CAT', '5', '1500.00'],
      ['Hydraulic Hose', 'HH-001', 'Parker', '20', '250.00'],
    ];
    const csv = template.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Show message if user can't write
  if (!canWrite(userDoc)) {
    return (
      <Button disabled title="Trial users cannot add products">
        <PlusCircle className="mr-2" />
        {dictionary.dashboard.addProduct}
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2" />
          {dictionary.dashboard.addProduct}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{d.title}</DialogTitle>
          <DialogDescription>{d.description}</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="manual">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">{d.manualEntry}</TabsTrigger>
            <TabsTrigger value="batchImport">{d.batchImport}</TabsTrigger>
          </TabsList>
          <TabsContent value="manual">
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="designation">{d.designation}</Label>
                <Input
                  id="designation"
                  placeholder={d.designationPlaceholder}
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  disabled={isLoading}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reference">{d.reference}</Label>
                <Input
                  id="reference"
                  placeholder={d.referencePlaceholder}
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  disabled={isLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="brand">{d.brand}</Label>
                <Input
                  id="brand"
                  placeholder={d.brandPlaceholder}
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  disabled={isLoading}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="quantity">{d.quantity}</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    disabled={isLoading}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="purchase-price">{d.purchasePrice}</Label>
                  <Input
                    id="purchase-price"
                    type="number"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {d.submit}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
          <TabsContent value="batchImport">
            <div className="space-y-4 py-4">
              {importStatus === 'idle' && (
                <>
                  <div className="flex flex-col items-center justify-center space-y-4 py-8 border-2 border-dashed rounded-lg p-6 cursor-pointer hover:bg-muted/50 transition"
                    onClick={() => document.getElementById('file-input')?.click()}>
                    <Upload className="h-12 w-12 text-muted-foreground" />
                    <p className="text-center text-muted-foreground text-sm">{d.batchDescription}</p>
                    <input
                      id="file-input"
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={importStatus === 'processing'}
                    />
                  </div>
                  <Button variant="outline" className="w-full" onClick={downloadTemplate}>
                    {d.downloadTemplate}
                  </Button>
                </>
              )}
              
              {importStatus === 'processing' && (
                <div className="flex items-center justify-center space-x-2 py-8">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>{importMessage}</span>
                </div>
              )}

              {importStatus === 'success' && (
                <div className="flex items-start space-x-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900 dark:text-green-100">{importMessage}</p>
                  </div>
                </div>
              )}

              {importStatus === 'error' && (
                <div className="flex items-start space-x-3 p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900 dark:text-red-100">{importMessage}</p>
                  </div>
                </div>
              )}

              <DialogFooter>
                {importStatus !== 'processing' && (
                  <Button 
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setImportStatus('idle');
                      setImportMessage('');
                      if (importStatus === 'success') setOpen(false);
                    }}
                  >
                    {importStatus === 'success' ? 'Close' : 'Cancel'}
                  </Button>
                )}
              </DialogFooter>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
