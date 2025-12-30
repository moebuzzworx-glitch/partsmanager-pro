
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
import { ProgressModal } from '@/components/ui/progress-modal';
import { getDictionary } from '@/lib/dictionaries';
import { useFirebase } from '@/firebase/provider';
import { doc, getDoc, addDoc, collection } from 'firebase/firestore';
import { User as AppUser } from '@/lib/types';
import { canWrite, getExportRestrictionMessage } from '@/lib/trial-utils';
import { useToast } from '@/hooks/use-toast';
import { importProductsViaAPI } from '@/lib/api-bulk-operations';
import { hybridImportProducts } from '@/lib/hybrid-import';
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

/**
 * Multi-language column header mapping with all supported synonyms
 * Supports: English, French, Arabic
 */
const COLUMN_HEADERS_MAP = {
  designation: {
    en: ['designation', 'name', 'product name', 'product', 'description', 'libelle', 'designations'],
    fr: ['désignation', 'nom', 'nom du produit', 'produit', 'description', 'libellé', 'designation', 'désignations'],
    ar: ['التسمية', 'الاسم', 'اسم المنتج', 'المنتج', 'الوصف', 'التسميات'],
  },
  reference: {
    en: ['reference', 'ref', 'reference number', 'code', 'sku', 'product code', 'part number'],
    fr: ['référence', 'réf', 'numéro de référence', 'code', 'sku', 'code produit', 'numéro de pièce'],
    ar: ['المرجع', 'رقم المرجع', 'الرمز', 'كود', 'كود المنتج', 'رقم الجزء'],
  },
  brand: {
    en: ['brand', 'manufacturer', 'maker', 'marque', 'supplier', 'vendor'],
    fr: ['marque', 'fabricant', 'producteur', 'constructeur', 'fournisseur'],
    ar: ['العلامة التجارية', 'الصانع', 'المصنع', 'المورد'],
  },
  stock: {
    en: ['stock', 'quantity', 'qty', 'inventory', 'amount', 'count', 'quantité'],
    fr: ['stock', 'quantité', 'qté', 'inventaire', 'montant', 'nombre', 'stock initial'],
    ar: ['المخزون', 'الكمية', 'المخزون الفعلي', 'العدد', 'الكمية المتاحة'],
  },
  purchasePrice: {
    en: ['purchase price', 'cost', 'unit cost', 'purchase cost', 'buying price', 'cost price', 'unit price'],
    fr: ['prix d\'achat', 'coût', 'coût unitaire', 'prix d\'achat unitaire', 'prix de revient', 'prix d\'achat unitaire'],
    ar: ['سعر الشراء', 'التكلفة', 'سعر الوحدة', 'تكلفة الشراء', 'تكلفة الوحدة'],
  },
};

export function AddProductDialog({ dictionary, onProductAdded }: { dictionary: Dictionary; onProductAdded?: () => void }) {
  const d = dictionary.addProductDialog;
  const { user, firestore } = useFirebase();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [userDoc, setUserDoc] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');
  const [importProgress, setImportProgress] = useState(0);
  const [localProgress, setLocalProgress] = useState(0);
  const [localMessage, setLocalMessage] = useState('');
  const [firebaseProgress, setFirebaseProgress] = useState(0);
  const [firebaseMessage, setFirebaseMessage] = useState('');
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

    // Helper function to find column value using multi-language mapping
    const getColumnValue = (row: ProductRow, fieldName: keyof typeof COLUMN_HEADERS_MAP): string => {
      // Get all possible column names for this field (all languages + synonyms)
      const possibleNames = Object.values(COLUMN_HEADERS_MAP[fieldName]).flat();
      
      // Try to find matching key in row (case-insensitive)
      const key = Object.keys(row).find(k => {
        const normalized = k.trim().toLowerCase();
        return possibleNames.some(name => name.toLowerCase() === normalized);
      });
      
      if (!key) {
        console.warn(`[Header Mapping] Could not find column for '${fieldName}'`);
        console.warn(`[Header Mapping] Available row keys:`, Object.keys(row));
        console.warn(`[Header Mapping] Expected one of:`, possibleNames);
        return '';
      }
      
      return key ? String(row[key] || '').trim() : '';
    };

    // Helper function to get numeric value from row
    const getNumericValue = (row: ProductRow, fieldName: keyof typeof COLUMN_HEADERS_MAP): number => {
      // Get all possible column names for this field (all languages + synonyms)
      const possibleNames = Object.values(COLUMN_HEADERS_MAP[fieldName]).flat();
      
      // Try to find matching key in row (case-insensitive)
      const key = Object.keys(row).find(k => {
        const normalized = k.trim().toLowerCase();
        return possibleNames.some(name => name.toLowerCase() === normalized);
      });
      
      if (!key) {
        console.warn(`[Header Mapping] Could not find column for '${fieldName}' in row keys:`, Object.keys(row));
        console.warn(`[Header Mapping] Expected one of:`, possibleNames);
        return 0;
      }
      const value = row[key];
      
      // Handle both string and number types
      if (typeof value === 'number') {
        return isNaN(value) ? 0 : value;
      }
      
      const parsed = parseFloat(String(value || '').trim());
      return isNaN(parsed) ? 0 : parsed;
    };

    // Function to generate unique reference when missing
    const generateReference = (designation: string, rowIndex: number): string => {
      // Create a reference from the first 3 letters of designation + timestamp + row index
      const prefix = designation.substring(0, 3).toUpperCase();
      const timestamp = Date.now().toString().slice(-5); // Last 5 digits of timestamp
      const suffix = String(rowIndex).padStart(3, '0');
      return `${prefix}-${timestamp}-${suffix}`;
    };

    // Function to process products from parsed data - OPTIMIZED with batch operations and progress tracking
    const processProducts = async (products: ProductRow[]) => {
      let successCount = 0;
      let errorCount = 0;
      let updateCount = 0;
      const errors: string[] = [];
      const productsRef = collection(firestore, 'products');

      // STEP 1: Parse all rows first (fast, synchronous)
      const parsedRows = products.map((row, i) => {
        const designation = getColumnValue(row, 'designation').trim();
        let reference = getColumnValue(row, 'reference').trim();
        const brand = getColumnValue(row, 'brand').trim();
        const stock = getNumericValue(row, 'stock');
        const purchasePrice = getNumericValue(row, 'purchasePrice');

        // Debug: Log first row to verify extraction
        if (i === 0) {
          console.log(`[Parse Row 0] designation="${designation}" reference="${reference}" brand="${brand}" stock=${stock} purchasePrice=${purchasePrice}`);
        }

        // Validate required fields
        if (!designation) {
          errors.push(`Row ${i + 1}: Missing Designation`);
          return { error: true, rowIndex: i };
        }

        // Generate reference if missing
        if (!reference) {
          reference = generateReference(designation, i + 1);
        }

        return {
          error: false,
          rowIndex: i,
          designation,
          reference,
          brand: brand || null,
          stock: stock || 0,
          purchasePrice: purchasePrice || 0,
        };
      });

      // Count errors from parsing
      errorCount = errors.length;
      const validRows = parsedRows.filter(r => !r.error);

      if (validRows.length === 0) {
        setImportStatus('error');
        setImportMessage('No valid products to import');
        toast({
          title: 'Error',
          description: 'All rows have errors',
          variant: 'destructive',
        });
        return;
      }

      // Update progress
      setImportMessage(`Preparing ${validRows.length} products...`);
      setImportProgress(10);

      // Convert rows to API format
      const productsToImport = validRows.map((row: any, index: number) => {
        // purchasePrice is already numeric from parsedRows
        const purchasePrice = parseFloat(row.purchasePrice) || 0;
        const price = purchasePrice > 0 ? purchasePrice * 1.25 : 0;
        
        // Log first 3 rows for debugging
        if (index < 3) {
          console.log(`[Import Debug] Row ${index}:`, {
            name: row.designation,
            purchasePriceRaw: row.purchasePrice,
            purchasePriceNumber: purchasePrice,
            price,
            fullRow: row,
          });
        }
        
        return {
          name: row.designation,
          reference: row.reference,
          brand: row.brand,
          stock: row.stock,
          purchasePrice,
          price,
          isDeleted: false,
        };
      });

      try {
        // Use hybrid import: local storage first, Firebase sync in background
        setLocalMessage('Saving to local storage...');
        setFirebaseMessage('Ready to sync...');
        
        const result = await hybridImportProducts(
          user,
          productsToImport,
          (progress, message) => {
            setLocalProgress(progress);
            setLocalMessage(message);
            const combined = Math.round((progress * 0.5) / 100) * 100; // Local is 50% of progress
            setImportProgress(combined);
          },
          (progress, message) => {
            setFirebaseProgress(progress);
            setFirebaseMessage(message);
            const combined = 50 + Math.round((progress * 0.5) / 100) * 100; // Firebase is 50% of progress
            setImportProgress(combined);
          }
        );

        successCount = result.localSaved;
        const message = result.message;
        
        setImportStatus(result.error ? 'error' : 'success');
        setImportMessage(message);
        setImportProgress(100);

        if (!result.error) {
          toast({
            title: 'Success',
            description: message,
          });
          setOpen(false);
          if (onProductAdded) {
            onProductAdded();
          }
        } else {
          // Partial success - data is saved locally, sync failed
          toast({
            title: 'Partial Success',
            description: message,
            variant: 'destructive',
          });
          setOpen(false);
          if (onProductAdded) {
            onProductAdded();
          }
        }
      } catch (error: any) {
        console.error('Import error:', error);
        setImportStatus('error');
        const errorMessage = error.message || 'Failed to import products';
        setImportMessage(errorMessage);
        toast({
          title: 'Import Error',
          description: errorMessage,
          variant: 'destructive',
        });
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
          
          // Debug: Show which headers would match each field
          const debugHeaderMapping = {
            designation: getColumnValue(products[0], 'designation'),
            reference: getColumnValue(products[0], 'reference'),
            brand: getColumnValue(products[0], 'brand'),
            stock: getNumericValue(products[0], 'stock'),
            purchasePrice: getNumericValue(products[0], 'purchasePrice'),
          };
          console.log('Detected field values:', debugHeaderMapping);
          
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
    <>
      <ProgressModal
        isOpen={importStatus === 'processing'}
        progress={importProgress}
        title="Importing Products"
        message={importMessage}
        isCancelable={false}
      />
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
                <div className="space-y-4 py-8">
                  {/* Local Storage Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Local Storage</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{localProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${localProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{localMessage}</p>
                  </div>

                  {/* Firebase Sync Progress */}
                  {firebaseProgress > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Firebase Sync</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">{firebaseProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${firebaseProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{firebaseMessage}</p>
                    </div>
                  )}

                  {/* Overall Progress */}
                  <div className="space-y-2 pt-2 border-t dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Overall Progress</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{importProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div
                        className="bg-purple-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${importProgress}%` }}
                      />
                    </div>
                  </div>
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
    </>
  );
}
