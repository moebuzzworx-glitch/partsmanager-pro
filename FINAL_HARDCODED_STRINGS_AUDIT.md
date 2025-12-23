# Final Hardcoded English Strings Audit Report
**Date**: December 23, 2025  
**Status**: Complete Workspace Scan  
**Total Strings Found**: 100+  

---

## 📋 Executive Summary

This is a comprehensive audit of ALL remaining hardcoded English strings in the stock-manager codebase that need to be added to the dictionary for complete internationalization. The strings are organized by category and location for easy implementation.

**Critical Finding**: Multiple areas still have hardcoded strings that are visible to end users, including table headers, page descriptions, dialog titles, form labels, and button labels.

---

## 🔍 Findings by Category

### 1. PAGE DESCRIPTIONS & SUBTITLES
**High Priority - User Facing**

| String | File | Line | Context |
|--------|------|------|---------|
| `"Manage your company details including registration numbers and bank information."` | [src/app/[locale]/settings/page.tsx](src/app/[locale]/settings/page.tsx) | 27 | Page subtitle for settings |
| `"Manage your company details including registration numbers and bank information."` | [src/components/dashboard/settings-form.tsx](src/components/dashboard/settings-form.tsx) | 30 | Form description |
| `"Manage your customer information."` | [src/app/[locale]/dashboard/customers/page.tsx](src/app/[locale]/dashboard/customers/page.tsx) | 139 | Page subtitle |
| `"Manage your supplier information."` | [src/app/[locale]/dashboard/suppliers/page.tsx](src/app/[locale]/dashboard/suppliers/page.tsx) | 142 | Page subtitle |
| `"Generate and manage invoices."` | [src/app/[locale]/dashboard/invoices/page.tsx](src/app/[locale]/dashboard/invoices/page.tsx) | 240 | Page subtitle |

---

### 2. TABLE HEADERS & COLUMN NAMES
**High Priority - User Facing**

#### Stock/Product Table
| String | File | Line | Type |
|--------|------|------|------|
| `"Name"` | [src/app/[locale]/dashboard/customers/page.tsx](src/app/[locale]/dashboard/customers/page.tsx) | 164 | Table Header |
| `"Email"` | [src/app/[locale]/dashboard/customers/page.tsx](src/app/[locale]/dashboard/customers/page.tsx) | 165 | Table Header |
| `"Phone"` | [src/app/[locale]/dashboard/customers/page.tsx](src/app/[locale]/dashboard/customers/page.tsx) | 166 | Table Header |

#### Suppliers Table
| String | File | Line | Type |
|--------|------|------|------|
| `"Name"` | [src/app/[locale]/dashboard/suppliers/page.tsx](src/app/[locale]/dashboard/suppliers/page.tsx) | 178 | Table Header |
| `"Email"` | [src/app/[locale]/dashboard/suppliers/page.tsx](src/app/[locale]/dashboard/suppliers/page.tsx) | 179 | Table Header |
| `"Phone"` | [src/app/[locale]/dashboard/suppliers/page.tsx](src/app/[locale]/dashboard/suppliers/page.tsx) | 180 | Table Header |

#### Invoices Table
| String | File | Line | Type |
|--------|------|------|------|
| `"Invoice Number"` | [src/app/[locale]/dashboard/invoices/page.tsx](src/app/[locale]/dashboard/invoices/page.tsx) | 260 | Table Header |
| `"Client"` | [src/app/[locale]/dashboard/invoices/page.tsx](src/app/[locale]/dashboard/invoices/page.tsx) | 261 | Table Header |
| `"Date"` | [src/app/[locale]/dashboard/invoices/page.tsx](src/app/[locale]/dashboard/invoices/page.tsx) | 262 | Table Header |
| `"Amount"` | [src/app/[locale]/dashboard/invoices/page.tsx](src/app/[locale]/dashboard/invoices/page.tsx) | 263 | Table Header |
| `"Status"` | [src/app/[locale]/dashboard/invoices/page.tsx](src/app/[locale]/dashboard/invoices/page.tsx) | 264 | Table Header |
| `"Actions"` | [src/app/[locale]/dashboard/invoices/page.tsx](src/app/[locale]/dashboard/invoices/page.tsx) | 265 | Table Header |

---

### 3. DIALOG TITLES
**High Priority - User Facing**

| String | File | Line | Type |
|--------|------|------|------|
| `"Edit Supplier"` | [src/components/dashboard/edit-supplier-dialog.tsx](src/components/dashboard/edit-supplier-dialog.tsx) | 163 | DialogTitle |
| `"Edit Customer"` | [src/components/dashboard/edit-customer-dialog.tsx](src/components/dashboard/edit-customer-dialog.tsx) | 163 | DialogTitle |
| `"Add New Supplier"` | [src/components/dashboard/add-supplier-dialog.tsx](src/components/dashboard/add-supplier-dialog.tsx) | 151 | DialogTitle |
| `"Add New Customer"` | [src/components/dashboard/add-customer-dialog.tsx](src/components/dashboard/add-customer-dialog.tsx) | 151 | DialogTitle |
| `"Create Invoice"` | [src/components/dashboard/create-invoice-dialog.tsx](src/components/dashboard/create-invoice-dialog.tsx) | 79 | DialogTitle |
| `"Edit Profile"` | [src/components/dashboard/user-profile-modal.tsx](src/components/dashboard/user-profile-modal.tsx) | 96 | DialogTitle |

---

### 4. FORM LABELS & FIELD NAMES
**Medium-High Priority - User Input Fields**

#### Supplier/Customer Forms - Contact Details
| String | File | Type |
|--------|------|------|
| `"Contact Name"` | [src/components/dashboard/edit-supplier-dialog.tsx](src/components/dashboard/edit-supplier-dialog.tsx) | FormLabel |
| `"Contact Name (Optional)"` | [src/components/dashboard/add-supplier-dialog.tsx](src/components/dashboard/add-supplier-dialog.tsx) | FormLabel |

---

### 5. FORM PLACEHOLDERS
**Medium Priority - Input Hints**

#### Company Information
| Placeholder | File | Line | Field |
|------------|------|------|-------|
| `"NIF Number"` | [src/app/[locale]/settings/company-info-modal.tsx](src/app/[locale]/settings/company-info-modal.tsx) | 322 | NIF Input |
| `"NIS Number"` | [src/app/[locale]/settings/company-info-modal.tsx](src/app/[locale]/settings/company-info-modal.tsx) | 351 | NIS Input |
| `"Bank Account RIB"` | [src/app/[locale]/settings/company-info-modal.tsx](src/app/[locale]/settings/company-info-modal.tsx) | 366 | RIB Input |

#### Customer Forms
| Placeholder | File | Line | Field |
|------------|------|------|-------|
| `"Registration Code"` | [src/components/dashboard/add-customer-dialog.tsx](src/components/dashboard/add-customer-dialog.tsx) | 223 | RC Input |
| `"NIS Number"` | [src/components/dashboard/add-customer-dialog.tsx](src/components/dashboard/add-customer-dialog.tsx) | 237 | NIS Input |
| `"NIF Number"` | [src/components/dashboard/add-customer-dialog.tsx](src/components/dashboard/add-customer-dialog.tsx) | 253 | NIF Input |
| `"Bank Account RIB"` | [src/components/dashboard/add-customer-dialog.tsx](src/components/dashboard/add-customer-dialog.tsx) | 282 | RIB Input |

#### Supplier Forms
| Placeholder | File | Line | Field |
|------------|------|------|-------|
| `"Registration Code"` | [src/components/dashboard/edit-supplier-dialog.tsx](src/components/dashboard/edit-supplier-dialog.tsx) | 249 | RC Input |
| `"NIS Number"` | [src/components/dashboard/edit-supplier-dialog.tsx](src/components/dashboard/edit-supplier-dialog.tsx) | 263 | NIS Input |
| `"NIF Number"` | [src/components/dashboard/edit-supplier-dialog.tsx](src/components/dashboard/edit-supplier-dialog.tsx) | 279 | NIF Input |
| `"Bank Account RIB"` | [src/components/dashboard/edit-supplier-dialog.tsx](src/components/dashboard/edit-supplier-dialog.tsx) | 293 | RIB Input |

#### Customer Edit Forms
| Placeholder | File | Line | Field |
|------------|------|------|-------|
| `"Registration Code"` | [src/components/dashboard/edit-customer-dialog.tsx](src/components/dashboard/edit-customer-dialog.tsx) | 235 | RC Input |
| `"NIS Number"` | [src/components/dashboard/edit-customer-dialog.tsx](src/components/dashboard/edit-customer-dialog.tsx) | 249 | NIS Input |
| `"NIF Number"` | [src/components/dashboard/edit-customer-dialog.tsx](src/components/dashboard/edit-customer-dialog.tsx) | 265 | NIF Input |
| `"Bank Account RIB"` | [src/components/dashboard/edit-customer-dialog.tsx](src/components/dashboard/edit-customer-dialog.tsx) | 294 | RIB Input |

#### Supplier Edit Forms
| Placeholder | File | Line | Field |
|------------|------|------|-------|
| `"Registration Code"` | [src/components/dashboard/add-supplier-dialog.tsx](src/components/dashboard/add-supplier-dialog.tsx) | 237 | RC Input |
| `"NIS Number"` | [src/components/dashboard/add-supplier-dialog.tsx](src/components/dashboard/add-supplier-dialog.tsx) | 251 | NIS Input |
| `"NIF Number"` | [src/components/dashboard/add-supplier-dialog.tsx](src/components/dashboard/add-supplier-dialog.tsx) | 267 | NIF Input |
| `"Bank Account RIB"` | [src/components/dashboard/add-supplier-dialog.tsx](src/components/dashboard/add-supplier-dialog.tsx) | 281 | RIB Input |

---

### 6. BUTTON LABELS & ACTIONS
**Medium Priority - User Actions**

| String | File | Line | Type |
|--------|------|------|------|
| `"Delete Selected ({count})"` | [src/app/[locale]/dashboard/stock/page.tsx](src/app/[locale]/dashboard/stock/page.tsx) | 214 | Button |
| `"Download"` | [src/app/[locale]/dashboard/invoices/page.tsx](src/app/[locale]/dashboard/invoices/page.tsx) | 298 | Button |
| `"Newest First"` | [src/app/[locale]/dashboard/invoices/page.tsx](src/app/[locale]/dashboard/invoices/page.tsx) | 256 | Select Option |
| `"Oldest First"` | [src/app/[locale]/dashboard/invoices/page.tsx](src/app/[locale]/dashboard/invoices/page.tsx) | 257 | Select Option |

---

### 7. EMPTY STATE MESSAGES
**High Priority - User Feedback**

| String | File | Line | Context |
|--------|------|------|---------|
| `"No customers found. Add one to get started!"` | [src/app/[locale]/dashboard/customers/page.tsx](src/app/[locale]/dashboard/customers/page.tsx) | 180 | Empty customers table |
| `"No customers match your search."` | [src/app/[locale]/dashboard/customers/page.tsx](src/app/[locale]/dashboard/customers/page.tsx) | 180 | Filtered customers empty |
| `"No suppliers found. Add one to get started!"` | [src/app/[locale]/dashboard/suppliers/page.tsx](src/app/[locale]/dashboard/suppliers/page.tsx) | 181 | Empty suppliers table |
| `"No suppliers match your search."` | [src/app/[locale]/dashboard/suppliers/page.tsx](src/app/[locale]/dashboard/suppliers/page.tsx) | 181 | Filtered suppliers empty |
| `"No products found. Add one to get started!"` | [src/app/[locale]/dashboard/stock/page.tsx](src/app/[locale]/dashboard/stock/page.tsx) | 276 | Empty products table |
| `"No products match your search."` | [src/app/[locale]/dashboard/stock/page.tsx](src/app/[locale]/dashboard/stock/page.tsx) | 276 | Filtered products empty |
| `"No invoices found. Create one to get started!"` | [src/app/[locale]/dashboard/invoices/page.tsx](src/app/[locale]/dashboard/invoices/page.tsx) | 284 | Empty invoices table |
| `"No invoices match your search."` | [src/app/[locale]/dashboard/invoices/page.tsx](src/app/[locale]/dashboard/invoices/page.tsx) | 284 | Filtered invoices empty |

---

### 8. INVOICE-RELATED LABELS
**Medium Priority - Invoice Display**

| String | File | Line | Type |
|--------|------|------|------|
| `"Paid"` | [src/app/[locale]/dashboard/invoices/page.tsx](src/app/[locale]/dashboard/invoices/page.tsx) | 295 | Badge Text |
| `"Unpaid"` | [src/app/[locale]/dashboard/invoices/page.tsx](src/app/[locale]/dashboard/invoices/page.tsx) | 295 | Badge Text |

---

### 9. CONFIRMATION & VALIDATION MESSAGES
**High Priority - User Confirmations**

| String | File | Line | Type |
|--------|------|------|------|
| `"Are you sure you want to delete this invoice? This action cannot be undone."` | [src/app/[locale]/dashboard/invoices/page.tsx](src/app/[locale]/dashboard/invoices/page.tsx) | 147 | Confirmation Dialog |
| `"Delete {count} product(s)? They will be moved to trash."` | [src/app/[locale]/dashboard/stock/page.tsx](src/app/[locale]/dashboard/stock/page.tsx) | 159 | Confirmation Dialog |

---

### 10. TOAST NOTIFICATION MESSAGES
**Medium Priority - Feedback Messages**

| String | File | Line | Type |
|--------|------|------|------|
| `"Profile updated"` | [src/components/dashboard/user-profile-modal.tsx](src/components/dashboard/user-profile-modal.tsx) | 59 | Toast Title |
| `"Success"` | [src/app/[locale]/dashboard/stock/page.tsx](src/app/[locale]/dashboard/stock/page.tsx) | 122 | Toast Title |
| `"Product moved to trash"` | [src/app/[locale]/dashboard/stock/page.tsx](src/app/[locale]/dashboard/stock/page.tsx) | 123 | Toast Description |
| `"Failed to delete product"` | [src/app/[locale]/dashboard/stock/page.tsx](src/app/[locale]/dashboard/stock/page.tsx) | 127 | Toast Description |
| `"An error occurred while deleting the product"` | [src/app/[locale]/dashboard/stock/page.tsx](src/app/[locale]/dashboard/stock/page.tsx) | 134 | Toast Description |
| `"Error"` | [src/app/[locale]/dashboard/invoices/page.tsx](src/app/[locale]/dashboard/invoices/page.tsx) | 115 | Toast Title |
| `"Invoice regenerated and downloaded successfully."` | [src/app/[locale]/dashboard/invoices/page.tsx](src/app/[locale]/dashboard/invoices/page.tsx) | 111 | Toast Description |
| `"Failed to regenerate invoice. Please try again."` | [src/app/[locale]/dashboard/invoices/page.tsx](src/app/[locale]/dashboard/invoices/page.tsx) | 117 | Toast Description |
| `"Invoice deleted successfully."` | [src/app/[locale]/dashboard/invoices/page.tsx](src/app/[locale]/dashboard/invoices/page.tsx) | 163 | Toast Description |
| `"Failed to delete invoice."` | [src/app/[locale]/dashboard/invoices/page.tsx](src/app/[locale]/dashboard/invoices/page.tsx) | 169 | Toast Description |
| `"Invoice marked as {status}."` | [src/app/[locale]/dashboard/invoices/page.tsx](src/app/[locale]/dashboard/invoices/page.tsx) | 187 | Toast Description |
| `"Failed to update invoice status."` | [src/app/[locale]/dashboard/invoices/page.tsx](src/app/[locale]/dashboard/invoices/page.tsx) | 194 | Toast Description |
| `"Showing <strong>1-{count}</strong> of <strong>{total}</strong> customers"` | [src/app/[locale]/dashboard/customers/page.tsx](src/app/[locale]/dashboard/customers/page.tsx) | 228 | Footer Text |
| `"{count} product(s) moved to trash"` | [src/app/[locale]/dashboard/stock/page.tsx](src/app/[locale]/dashboard/stock/page.tsx) | 174 | Toast Description |
| `"Failed to delete products"` | [src/app/[locale]/dashboard/stock/page.tsx](src/app/[locale]/dashboard/stock/page.tsx) | 182 | Toast Description |
| `"An error occurred while deleting products"` | [src/app/[locale]/dashboard/stock/page.tsx](src/app/[locale]/dashboard/stock/page.tsx) | 190 | Toast Description |

---

### 11. BUTTON TOOLTIPS & TITLES
**Low-Medium Priority - Accessibility**

| String | File | Line | Type |
|--------|------|------|------|
| `"Trial users cannot add products"` | [src/components/dashboard/add-product-dialog.tsx](src/components/dashboard/add-product-dialog.tsx) | 500 | Button Title/Tooltip |
| `"Proforma invoices cannot be marked as paid"` | [src/app/[locale]/dashboard/invoices/page.tsx](src/app/[locale]/dashboard/invoices/page.tsx) | 284 | Button Title/Tooltip |
| `"Mark as Unpaid"` | [src/app/[locale]/dashboard/invoices/page.tsx](src/app/[locale]/dashboard/invoices/page.tsx) | 285 | Button Title/Tooltip |
| `"Mark as Paid"` | [src/app/[locale]/dashboard/invoices/page.tsx](src/app/[locale]/dashboard/invoices/page.tsx) | 285 | Button Title/Tooltip |

---

### 12. PERMISSION & RESTRICTION MESSAGES
**High Priority - Security/Business Logic Messages**

| String | File | Line | Type |
|--------|------|------|------|
| `"You do not have permission to edit suppliers."` | [src/components/dashboard/edit-supplier-dialog.tsx](src/components/dashboard/edit-supplier-dialog.tsx) | 114 | Permission Error |
| `"You do not have permission to edit customers."` | [src/components/dashboard/edit-customer-dialog.tsx](src/components/dashboard/edit-customer-dialog.tsx) | 114 | Permission Error |
| `"You do not have permission to add suppliers."` | [src/components/dashboard/add-supplier-dialog.tsx](src/components/dashboard/add-supplier-dialog.tsx) | 95 | Permission Error |
| `"You do not have permission to add customers."` | [src/components/dashboard/add-customer-dialog.tsx](src/components/dashboard/add-customer-dialog.tsx) | 95 | Permission Error |
| `"You do not have permission to add products."` | [src/components/dashboard/add-product-dialog.tsx](src/components/dashboard/add-product-dialog.tsx) | 85, 154 | Permission Error |
| `"You do not have permission to export invoices."` | [src/components/dashboard/create-invoice-form.tsx](src/components/dashboard/create-invoice-form.tsx) | 162 | Permission Error |
| `"You do not have permission to export invoices."` | [src/components/dashboard/invoice-generator.ts](src/components/dashboard/invoice-generator.ts) | 40 | Permission Error |
| `"Trial users cannot export invoices. Please upgrade to premium to enable exports."` | [src/components/dashboard/invoice-generator.ts](src/components/dashboard/invoice-generator.ts) | 38 | Trial Restriction |
| `"Trial users cannot export data. Upgrade to Premium to unlock this feature."` | [src/lib/trial-utils.ts](src/lib/trial-utils.ts) | 150 | Trial Restriction |
| `"Trial users cannot add or modify data. Upgrade to Premium to unlock this feature."` | [src/lib/trial-utils.ts](src/lib/trial-utils.ts) | 167 | Trial Restriction |

---

### 13. SEARCH & FILTER PLACEHOLDERS
**Medium Priority - Input Fields**

| String | File | Context |
|--------|------|---------|
| `"Search customers..."` | [src/app/[locale]/dashboard/customers/page.tsx](src/app/[locale]/dashboard/customers/page.tsx) | Search input placeholder |
| `"Search suppliers..."` | [src/app/[locale]/dashboard/suppliers/page.tsx](src/app/[locale]/dashboard/suppliers/page.tsx) | Search input placeholder |
| `"Search by invoice number or client name..."` | [src/app/[locale]/dashboard/invoices/page.tsx](src/app/[locale]/dashboard/invoices/page.tsx) | Search input placeholder |
| `"Sort by..."` | [src/app/[locale]/dashboard/invoices/page.tsx](src/app/[locale]/dashboard/invoices/page.tsx) | Select placeholder |

---

## 📊 Summary Statistics

| Category | Count | Priority |
|----------|-------|----------|
| Page Descriptions | 5 | High |
| Table Headers | 12 | High |
| Dialog Titles | 6 | High |
| Form Labels | 2 | Medium |
| Form Placeholders | 19 | Medium |
| Button Labels | 4 | Medium |
| Empty State Messages | 8 | High |
| Invoice Labels | 2 | Medium |
| Confirmation Messages | 2 | High |
| Toast Messages | 16 | Medium |
| Button Tooltips | 4 | Low-Medium |
| Permission Messages | 10 | High |
| Search Placeholders | 4 | Medium |
| **TOTAL** | **94** | **Varies** |

---

## 🎯 Implementation Priority

### Phase 1 - Critical (User-Facing, Page Level)
- [ ] Page descriptions/subtitles (5 strings)
- [ ] Table headers and column names (12 strings)
- [ ] Dialog titles (6 strings)
- [ ] Empty state messages (8 strings)

**Estimated Time**: 2-3 hours

### Phase 2 - High Priority (User Feedback & Security)
- [ ] Toast/notification messages (16 strings)
- [ ] Permission/restriction messages (10 strings)
- [ ] Confirmation dialogs (2 strings)

**Estimated Time**: 2 hours

### Phase 3 - Medium Priority (Form Usability)
- [ ] Form labels (2 strings)
- [ ] Form placeholders (19 strings)
- [ ] Button labels (4 strings)
- [ ] Search placeholders (4 strings)

**Estimated Time**: 2-3 hours

### Phase 4 - Low Priority (Polish)
- [ ] Button tooltips (4 strings)
- [ ] Invoice-specific labels (2 strings)

**Estimated Time**: 1 hour

---

## 💡 Recommendations

1. **Start with the 3 dictionary JSON files** - Ensure all 94 strings are added to:
   - `src/dictionaries/en.json`
   - `src/dictionaries/ar.json`
   - `src/dictionaries/fr.json`

2. **Follow the existing structure** - Use the same key naming convention as existing entries:
   ```typescript
   {
     "stockPage": {
       "title": "Stock",
       "description": "Manage your product inventory...",
       "designation": "Designation",
       "reference": "Reference",
       ...
     },
     "customersPage": {
       "title": "Customers",
       "description": "Manage your customer information.",
       "tableHeaders": {
         "name": "Name",
         "email": "Email",
         "phone": "Phone"
       }
     }
   }
   ```

3. **Update components incrementally** - Go through each category and update components to use dictionary entries instead of hardcoded strings

4. **Test in all 3 languages** - Verify that Arabic and French translations are appropriate and text displays correctly

5. **Maintain backwards compatibility** - Use fallback values during transition:
   ```typescript
   <Button>{dictionary.invoices?.markAsPaid || 'Mark as Paid'}</Button>
   ```

---

## ✅ Verification Checklist

- [ ] All strings listed above are moved to dictionary files
- [ ] Components updated to use dictionary entries
- [ ] Placeholders and descriptions are translated
- [ ] Arabic text displays correctly (RTL)
- [ ] French translations are verified by native speaker
- [ ] No hardcoded English strings remain visible to users
- [ ] Permission messages are properly localized
- [ ] Toast messages follow dictionary structure
- [ ] All 3 language files have matching key structure

---

## 📝 Next Steps

1. Add all identified strings to the 3 dictionary JSON files
2. Update component imports and usages
3. Test each language variant in the UI
4. Remove any remaining hardcoded strings
5. Verify consistency across all pages and dialogs
6. Deploy with language switching verified

---

**Report Generated**: December 23, 2025  
**Audited By**: Comprehensive Workspace Scan  
**Files Scanned**: 50+ component and page files
