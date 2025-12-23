# Dictionary Structure Recommendations

This document provides recommended dictionary key structures and sample entries for all identified hardcoded strings.

---

## 📚 Recommended Dictionary Structure

### Root Structure
```json
{
  "common": { ... },
  "dashboard": { ... },
  "stockPage": { ... },
  "customersPage": { ... },
  "suppliersPage": { ... },
  "invoicesPage": { ... },
  "settings": { ... },
  "forms": { ... },
  "messages": { ... }
}
```

---

## 🔑 Detailed Key Structures & Samples

### 1. Dashboard Pages (stockPage, customersPage, etc.)

```json
{
  "stockPage": {
    "title": "Stock",
    "description": "Manage your product inventory and stock levels.",
    "tableHeaders": {
      "designation": "Designation",
      "reference": "Reference",
      "brand": "Brand",
      "stock": "Stock",
      "purchasePrice": "Purchase Price",
      "sellingPrice": "Selling Price"
    },
    "buttons": {
      "deleteSelected": "Delete Selected"
    },
    "messages": {
      "noProductsFound": "No products found. Add one to get started!",
      "noProductsMatch": "No products match your search.",
      "productMovedToTrash": "Product moved to trash",
      "failedToDelete": "Failed to delete product",
      "productsMovedToTrash": "{count} product(s) moved to trash"
    }
  },
  
  "customersPage": {
    "title": "Customers",
    "description": "Manage your customer information.",
    "tableHeaders": {
      "name": "Name",
      "email": "Email",
      "phone": "Phone"
    },
    "searchPlaceholder": "Search customers...",
    "messages": {
      "noCustomersFound": "No customers found. Add one to get started!",
      "noCustomersMatch": "No customers match your search."
    },
    "footerText": "Showing <strong>1-{count}</strong> of <strong>{total}</strong> customers"
  },
  
  "suppliersPage": {
    "title": "Suppliers",
    "description": "Manage your supplier information.",
    "tableHeaders": {
      "name": "Name",
      "email": "Email",
      "phone": "Phone"
    },
    "searchPlaceholder": "Search suppliers...",
    "messages": {
      "noSuppliersFound": "No suppliers found. Add one to get started!",
      "noSuppliersMatch": "No suppliers match your search."
    }
  },
  
  "invoicesPage": {
    "title": "Invoices",
    "description": "Generate and manage invoices.",
    "tableHeaders": {
      "invoiceNumber": "Invoice Number",
      "client": "Client",
      "date": "Date",
      "amount": "Amount",
      "status": "Status",
      "actions": "Actions"
    },
    "searchPlaceholder": "Search by invoice number or client name...",
    "sortOptions": {
      "label": "Sort by...",
      "newest": "Newest First",
      "oldest": "Oldest First"
    },
    "statusBadges": {
      "paid": "Paid",
      "unpaid": "Unpaid"
    },
    "buttons": {
      "download": "Download"
    },
    "messages": {
      "noInvoicesFound": "No invoices found. Create one to get started!",
      "noInvoicesMatch": "No invoices match your search.",
      "regeneratedSuccess": "Invoice regenerated and downloaded successfully.",
      "regeneratedError": "Failed to regenerate invoice. Please try again.",
      "markedAs": "Invoice marked as {status}.",
      "deletedSuccess": "Invoice deleted successfully.",
      "deletedError": "Failed to delete invoice.",
      "statusUpdateError": "Failed to update invoice status."
    },
    "tooltips": {
      "proformaCannotBePaid": "Proforma invoices cannot be marked as paid",
      "markAsPaid": "Mark as Paid",
      "markAsUnpaid": "Mark as Unpaid"
    }
  }
}
```

---

### 2. Settings & Configuration Pages

```json
{
  "settings": {
    "title": "Settings",
    "description": "Manage your application and user settings.",
    "companyInfo": {
      "title": "Company Information",
      "description": "Manage your company details including registration numbers and bank information.",
      "fields": {
        "nif": "NIF Number",
        "nis": "NIS Number",
        "rib": "Bank Account RIB"
      },
      "placeholders": {
        "nif": "NIF Number",
        "nis": "NIS Number",
        "rib": "Bank Account RIB"
      }
    }
  }
}
```

---

### 3. Customer & Supplier Dialogs

```json
{
  "addCustomerDialog": {
    "title": "Add New Customer",
    "description": "Add a new customer to your database with contact and identification information.",
    "fields": {
      "name": "Customer Name",
      "email": "Email",
      "phone": "Phone",
      "address": "Address (Optional)",
      "rc": "Registration Code (RC)",
      "nis": "NIS Number",
      "nif": "NIF Number",
      "art": "ART Number",
      "rib": "Bank Account RIB"
    },
    "placeholders": {
      "name": "e.g., ABC Company",
      "email": "customer@example.com",
      "phone": "+213 XXX XXX XXX",
      "address": "Street address",
      "rc": "Registration Code",
      "nis": "NIS Number",
      "nif": "NIF Number",
      "art": "ART Number",
      "rib": "Bank Account RIB"
    },
    "buttons": {
      "cancel": "Cancel",
      "add": "Add Customer"
    }
  },
  
  "editCustomerDialog": {
    "title": "Edit Customer",
    "fields": {
      "name": "Customer Name",
      "email": "Email",
      "phone": "Phone",
      "address": "Address (Optional)",
      "rc": "Registration Code (RC)",
      "nis": "NIS Number",
      "nif": "NIF Number",
      "art": "ART Number",
      "rib": "Bank Account RIB"
    },
    "placeholders": {
      "name": "e.g., ABC Company",
      "email": "customer@example.com",
      "phone": "+213 XXX XXX XXX",
      "address": "Street address",
      "rc": "Registration Code",
      "nis": "NIS Number",
      "nif": "NIF Number",
      "art": "ART Number",
      "rib": "Bank Account RIB"
    },
    "buttons": {
      "cancel": "Cancel",
      "update": "Update Customer"
    },
    "messages": {
      "permissionDenied": "You do not have permission to edit customers."
    }
  },
  
  "addSupplierDialog": {
    "title": "Add New Supplier",
    "description": "Add a new supplier to your database with contact and identification information.",
    "fields": {
      "name": "Supplier Name",
      "contactName": "Contact Name (Optional)",
      "email": "Email",
      "phone": "Phone",
      "address": "Address",
      "rc": "Registration Code (RC)",
      "nis": "NIS Number",
      "nif": "NIF Number",
      "rib": "Bank Account RIB"
    },
    "placeholders": {
      "name": "e.g., XYZ Imports",
      "contactName": "Name of contact person",
      "email": "supplier@example.com",
      "phone": "+213 XXX XXX XXX",
      "address": "Street address",
      "rc": "Registration Code",
      "nis": "NIS Number",
      "nif": "NIF Number",
      "rib": "Bank Account RIB"
    },
    "buttons": {
      "cancel": "Cancel",
      "add": "Add Supplier"
    }
  },
  
  "editSupplierDialog": {
    "title": "Edit Supplier",
    "fields": {
      "name": "Supplier Name",
      "contactName": "Contact Name",
      "email": "Email",
      "phone": "Phone",
      "address": "Address",
      "rc": "Registration Code (RC)",
      "nis": "NIS Number",
      "nif": "NIF Number",
      "rib": "Bank Account RIB"
    },
    "placeholders": {
      "name": "e.g., ABC Supply Co",
      "contactName": "Contact person name",
      "email": "supplier@example.com",
      "phone": "+213 XXX XXX XXX",
      "address": "Street address",
      "rc": "Registration Code",
      "nis": "NIS Number",
      "nif": "NIF Number",
      "rib": "Bank Account RIB"
    },
    "buttons": {
      "cancel": "Cancel",
      "update": "Update Supplier"
    },
    "messages": {
      "permissionDenied": "You do not have permission to edit suppliers."
    }
  }
}
```

---

### 4. Invoice & Product Dialogs

```json
{
  "createInvoiceDialog": {
    "title": "Create Invoice"
  },
  
  "addProductDialog": {
    "messages": {
      "permissionDenied": "You do not have permission to add products.",
      "trialRestriction": "Trial users cannot add products"
    }
  }
}
```

---

### 5. User Profile & Settings

```json
{
  "userProfile": {
    "editDialogTitle": "Edit Profile",
    "messages": {
      "profileUpdated": "Profile updated"
    }
  }
}
```

---

### 6. Permissions & Restrictions

```json
{
  "permissions": {
    "addCustomers": "You do not have permission to add customers.",
    "editCustomers": "You do not have permission to edit customers.",
    "addSuppliers": "You do not have permission to add suppliers.",
    "editSuppliers": "You do not have permission to edit suppliers.",
    "addProducts": "You do not have permission to add products.",
    "exportInvoices": "You do not have permission to export invoices."
  },
  
  "trial": {
    "addOrModify": "Trial users cannot add or modify data. Upgrade to Premium to unlock this feature.",
    "exportData": "Trial users cannot export data. Upgrade to Premium to unlock this feature.",
    "exportInvoices": "Trial users cannot export invoices. Please upgrade to premium to enable exports.",
    "addProducts": "Trial users cannot add products"
  }
}
```

---

### 7. Confirmations & Dialogs

```json
{
  "confirmations": {
    "deleteInvoice": "Are you sure you want to delete this invoice? This action cannot be undone.",
    "deleteProducts": "Delete {count} product(s)? They will be moved to trash."
  }
}
```

---

### 8. Toast Messages & Feedback

```json
{
  "toasts": {
    "success": "Success",
    "error": "Error",
    "stock": {
      "productMovedToTrash": "Product moved to trash",
      "failedToDelete": "Failed to delete product",
      "productsMovedToTrash": "{count} product(s) moved to trash",
      "failedToDeleteProducts": "Failed to delete products",
      "deleteError": "An error occurred while deleting the product(s)"
    },
    "invoices": {
      "regeneratedSuccess": "Invoice regenerated and downloaded successfully.",
      "regeneratedError": "Failed to regenerate invoice. Please try again.",
      "deletedSuccess": "Invoice deleted successfully.",
      "deletedError": "Failed to delete invoice.",
      "markedAsPaid": "Invoice marked as paid.",
      "markedAsUnpaid": "Invoice marked as unpaid.",
      "updateError": "Failed to update invoice status."
    }
  }
}
```

---

## 🌍 Language-Specific Considerations

### English (en.json)
- Standard English terminology
- Professional business language
- Use "Customer", "Supplier", "Product"

### Arabic (ar.json)
- RTL text direction
- Business terms translated appropriately:
  - "Customer" → "العميل" (al-amil)
  - "Supplier" → "المورد" (al-mawrid)
  - "Invoice" → "فاتورة" (fatūrah)
  - "Registration Code" → "رمز التسجيل" (ramz al-tasji'l)
  - "NIS Number" → "رقم رقم التعريف الوطني" (raqam al-ta'rif al-watani)
  - "NIF Number" → "رقم النموذج الموحد" (raqam al-namuzaj al-muwahha)
  - "RIB" → "بطاقة الحساب الدولية" (bitaqat al-hisab al-duwaliah)

### French (fr.json)
- Standard French business terminology
- Use "Client", "Fournisseur", "Produit"
- Professional tone
- "Numéro d'enregistrement" for RC
- "Numéro d'identification national" for NIS
- "Numéro d'identification fiscale" for NIF
- "IBAN" for RIB (International Bank Account Number)

---

## 📝 Implementation Example

### Before (Hardcoded):
```tsx
<TableHeader>
  <TableRow>
    <TableHead>Name</TableHead>
    <TableHead>Email</TableHead>
    <TableHead>Phone</TableHead>
  </TableRow>
</TableHeader>
```

### After (Using Dictionary):
```tsx
<TableHeader>
  <TableRow>
    <TableHead>{dictionary.customersPage?.tableHeaders?.name || 'Name'}</TableHead>
    <TableHead>{dictionary.customersPage?.tableHeaders?.email || 'Email'}</TableHead>
    <TableHead>{dictionary.customersPage?.tableHeaders?.phone || 'Phone'}</TableHead>
  </TableRow>
</TableHeader>
```

### Dictionary Entry (en.json):
```json
{
  "customersPage": {
    "tableHeaders": {
      "name": "Name",
      "email": "Email",
      "phone": "Phone"
    }
  }
}
```

---

## ✅ Key Principles

1. **Flat is Better Than Nested** - Avoid excessively deep nesting
2. **Descriptive Keys** - Use clear, self-documenting key names
3. **Consistency** - Use same terminology across all languages
4. **Grouping** - Group related strings together (tableHeaders, buttons, messages, etc.)
5. **Placeholders** - Use `{variable}` for dynamic content
6. **Fallbacks** - Always provide fallback English text in code
7. **Testing** - Test all strings in all 3 languages

---

## 📋 File Update Checklist

- [ ] Add all 94 strings to `src/dictionaries/en.json`
- [ ] Add corresponding Arabic translations to `src/dictionaries/ar.json`
- [ ] Add corresponding French translations to `src/dictionaries/fr.json`
- [ ] Update all components to use dictionary entries
- [ ] Test English version displays correctly
- [ ] Test Arabic version (RTL layout)
- [ ] Test French version (text width/formatting)
- [ ] Verify no hardcoded strings remain visible

---

## 🔗 Related Documentation

- [FINAL_HARDCODED_STRINGS_AUDIT.md](FINAL_HARDCODED_STRINGS_AUDIT.md) - Complete audit with all strings
- [HARDCODED_STRINGS_BY_FILE.md](HARDCODED_STRINGS_BY_FILE.md) - Strings organized by component file
- [src/dictionaries/en.json](src/dictionaries/en.json) - English dictionary (main reference)
- [src/lib/dictionaries.ts](src/lib/dictionaries.ts) - Dictionary loading utility

---

**Last Updated**: December 23, 2025
**Total Keys Recommended**: 94
**Total Entries (with RTL/FR variants)**: 282 (94 × 3 languages)
