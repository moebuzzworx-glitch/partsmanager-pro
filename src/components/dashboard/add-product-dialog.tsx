
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
import { doc, getDoc, addDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { User as AppUser } from '@/lib/types';
import { canWrite, getExportRestrictionMessage } from '@/lib/trial-utils';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

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
      if (!user?.uid) {
        toast({
          title: 'Error',
          description: 'User ID not available. Please log in again.',
          variant: 'destructive',
        });
        return;
      }

      const productsRef = collection(firestore, 'products');
      await addDoc(productsRef, {
        name: formData.designation,
        reference: formData.reference,
        brand: formData.brand,
        stock: parseInt(formData.quantity),
        purchasePrice: parseFloat(formData.purchasePrice),
        price: parseFloat(formData.purchasePrice) * 1.25, // Default 25% markup
        userId: user.uid, // ← Add userId for per-user isolation
        createdAt: new Date(),
        isDeleted: false,
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

    // Helper function to find column value case-insensitively and trim whitespace
    const getColumnValue = (row: ProductRow, columnName: string): string => {
      // Try exact match first
      if (row[columnName]) {
        return String(row[columnName] || '').trim();
      }
      
      // Try case-insensitive match
      const key = Object.keys(row).find(k => 
        k.trim().toLowerCase() === columnName.trim().toLowerCase()
      );
      
      if (key) {
        return String(row[key] || '').trim();
      }
      
      // If still not found, try partial matching (for flexibility)
      const lowerColumnName = columnName.trim().toLowerCase();
      const partialKey = Object.keys(row).find(k => 
        k.trim().toLowerCase().includes(lowerColumnName) || 
        lowerColumnName.includes(k.trim().toLowerCase())
      );
      
      return partialKey ? String(row[partialKey] || '').trim() : '';
    };

    // Function to generate unique reference when missing
    const generateReference = (designation: string, rowIndex: number): string => {
      // Create a reference from the first 3 letters of designation + timestamp + row index
      const prefix = designation.substring(0, 3).toUpperCase();
      const timestamp = Date.now().toString().slice(-5); // Last 5 digits of timestamp
      const suffix = String(rowIndex).padStart(3, '0');
      return `${prefix}-${timestamp}-${suffix}`;
    };

    // Function to process products from parsed data
    const processProducts = async (products: ProductRow[]) => {
      let successCount = 0;
      let errorCount = 0;
      let updateCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < products.length; i++) {
        try {
          const row = products[i];
          
          // Extract values flexibly (case-insensitive)
          const designation = getColumnValue(row, 'Designation').trim();
          let reference = getColumnValue(row, 'Reference').trim();
          const brand = getColumnValue(row, 'Brand').trim();
          const stockStr = getColumnValue(row, 'Stock').trim();
          const priceStr = getColumnValue(row, 'Purchase Price').trim();

          // Validate required fields
          if (!designation) {
            errors.push(`Row ${i + 1}: Missing Designation`);
            errorCount++;
            continue;
          }

          // Generate reference if missing
          if (!reference) {
            reference = generateReference(designation, i + 1);
          }

          const stock = parseInt(stockStr) || 0;
          const purchasePrice = parseFloat(priceStr) || 0;

          // Purchase price can be 0 for unknown costs

          // Check if product already exists by reference or designation
          const productsRef = collection(firestore, 'products');
          let existingProductId: string | null = null;
          let existingProduct: any = null;

          // First try to find by reference
          if (reference) {
            const referenceQuery = query(productsRef, where('reference', '==', reference), where('userId', '==', user?.uid));
            const referenceSnapshot = await getDocs(referenceQuery);
            if (!referenceSnapshot.empty) {
              existingProductId = referenceSnapshot.docs[0].id;
              existingProduct = referenceSnapshot.docs[0].data();
            }
          }

          // If not found by reference, try by designation
          if (!existingProductId) {
            const designationQuery = query(productsRef, where('name', '==', designation), where('userId', '==', user?.uid));
            const designationSnapshot = await getDocs(designationQuery);
            if (!designationSnapshot.empty) {
              existingProductId = designationSnapshot.docs[0].id;
              existingProduct = designationSnapshot.docs[0].data();
            }
          }

          if (existingProductId && existingProduct) {
            // Update existing product: add stock and update price
            const currentStock = existingProduct.stock || 0;
            const newStock = currentStock + stock;
            const newPrice = purchasePrice * 1.25; // Default 25% markup
            
            const existingProductRef = doc(firestore, 'products', existingProductId);
            await updateDoc(existingProductRef, {
              stock: newStock,
              purchasePrice: purchasePrice,
              price: newPrice,
              updatedAt: new Date(),
              isDeleted: false,
            });

            updateCount++;
          } else {
            // Create new product
            await addDoc(productsRef, {
              name: designation,
              reference: reference,
              brand: brand || null,
              stock: stock,
              purchasePrice: purchasePrice,
              price: purchasePrice * 1.25, // Default 25% markup
              userId: user?.uid, // ← Add userId for per-user isolation
              createdAt: new Date(),
              isDeleted: false,
            });

            successCount++;
          }
        } catch (error: any) {
          errors.push(`Row ${i + 1}: ${error.message}`);
          errorCount++;
        }
      }

      // Report results
      const totalProcessed = successCount + updateCount;
      const message = `Processed ${totalProcessed} products (${successCount} new, ${updateCount} updated)${errorCount > 0 ? `, ${errorCount} errors` : ''}`;
      setImportStatus(errorCount === 0 ? 'success' : 'error');
      setImportMessage(message);

      if (errorCount === 0) {
        toast({
          title: 'Success',
          description: message,
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
    };

    setImportStatus('processing');
    setImportMessage('Processing file...');

    // Check if file is Excel or CSV
    const isExcelFile = file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.type.includes('spreadsheet');
    
    if (isExcelFile) {
      // Handle Excel files
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result as ArrayBuffer;
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Get first sheet
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as ProductRow[];
          
          console.log('Excel Column Headers:', jsonData.length > 0 ? Object.keys(jsonData[0]) : []);
          console.log('First row data:', jsonData[0]);
          
          await processProducts(jsonData);
        } catch (error: any) {
          setImportStatus('error');
          setImportMessage(`Error reading Excel file: ${error.message}`);
          toast({
            title: 'Error',
            description: 'Failed to read Excel file',
            variant: 'destructive',
          });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Handle CSV files
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        complete: async (results) => {
        try {
          let products = results.data as ProductRow[];
          
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

          // Log column headers for debugging
          console.log('CSV Column Headers:', Object.keys(products[0]));
          console.log('First row data:', products[0]);
          
          // If first row appears to be data (not headers), try parsing without headers
          const firstRowKeys = Object.keys(products[0]);
          const hasProperHeaders = firstRowKeys.some(key => 
            key.toLowerCase().includes('designation') || 
            key.toLowerCase().includes('reference') ||
            key.toLowerCase().includes('brand') ||
            key.toLowerCase().includes('stock') ||
            key.toLowerCase().includes('price')
          );
          
          // If headers don't look right, reparse without header detection
          if (!hasProperHeaders && firstRowKeys.some(k => k.includes('field') || /^\d+$/.test(k))) {
            console.log('Headers appear malformed, reparsing without header detection...');
            
            // Reparse without header option
            return new Promise<void>((resolve) => {
              Papa.parse(file, {
                header: false,
                skipEmptyLines: true,
                dynamicTyping: false,
                complete: async (resultsNoHeader) => {
                  try {
                    const rows = resultsNoHeader.data as any[];
                    
                    if (rows.length === 0) {
                      setImportStatus('error');
                      setImportMessage('No data found in file.');
                      resolve();
                      return;
                    }
                    
                    // Convert array-based rows to object-based using first row as headers
                    const headerRow = rows[0];
                    const dataProducts = rows.slice(1).map((row: any[]) => {
                      const obj: ProductRow = {};
                      headerRow.forEach((header, index) => {
                        obj[header || `column_${index}`] = row[index];
                      });
                      return obj;
                    });
                    
                    products = dataProducts;
                    console.log('Reparsed CSV Column Headers:', headerRow);
                    console.log('First data row:', products[0]);
                    
                    await processProducts(products);
                    resolve();
                  } catch (error) {
                    console.error('Error in reparse:', error);
                    setImportStatus('error');
                    setImportMessage('Error processing file.');
                    resolve();
                  }
                },
                error: (error: any) => {
                  setImportStatus('error');
                  setImportMessage(`Error reading file: ${error.message}`);
                  resolve();
                },
              });
            });
          }
          
          await processProducts(products);
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
    }
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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
