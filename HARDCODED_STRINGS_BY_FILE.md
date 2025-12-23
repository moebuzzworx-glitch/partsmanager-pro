# Quick Reference: Hardcoded Strings by File

This is a quick lookup guide organized by file for implementing translations.

---

## 📁 Files Requiring Updates

### 1. src/app/[locale]/dashboard/stock/page.tsx
**Strings to Translate**: 5

| String | Usage | Line |
|--------|-------|------|
| `"Delete Selected ({count})"` | Button label | 214 |
| `"Product moved to trash"` | Toast description | 123 |
| `"Failed to delete product"` | Toast description | 127 |
| `"{count} product(s) moved to trash"` | Toast description | 174 |
| `"Failed to delete products"` | Toast description | 182 |

---

### 2. src/app/[locale]/dashboard/customers/page.tsx
**Strings to Translate**: 6

| String | Usage | Line |
|--------|-------|------|
| `"Manage your customer information."` | Page subtitle | 139 |
| `"Search customers..."` | Placeholder | 150 |
| `"Customers"` | Table title | 145 |
| `"Name"` | Table header | 164 |
| `"Email"` | Table header | 165 |
| `"Phone"` | Table header | 166 |

---

### 3. src/app/[locale]/dashboard/suppliers/page.tsx
**Strings to Translate**: 6

| String | Usage | Line |
|--------|-------|------|
| `"Manage your supplier information."` | Page subtitle | 142 |
| `"Search suppliers..."` | Placeholder | 152 |
| `"Suppliers"` | Table title | 147 |
| `"Name"` | Table header | 178 |
| `"Email"` | Table header | 179 |
| `"Phone"` | Table header | 180 |

---

### 4. src/app/[locale]/dashboard/invoices/page.tsx
**Strings to Translate**: 18

| String | Usage | Line |
|--------|-------|------|
| `"Generate and manage invoices."` | Page subtitle | 240 |
| `"Invoices"` | Table title | 249 |
| `"Search by invoice number or client name..."` | Placeholder | 252 |
| `"Sort by..."` | Select placeholder | 254 |
| `"Newest First"` | Select option | 256 |
| `"Oldest First"` | Select option | 257 |
| `"Invoice Number"` | Table header | 260 |
| `"Client"` | Table header | 261 |
| `"Date"` | Table header | 262 |
| `"Amount"` | Table header | 263 |
| `"Status"` | Table header | 264 |
| `"Actions"` | Table header | 265 |
| `"Paid"` | Badge text | 295 |
| `"Unpaid"` | Badge text | 295 |
| `"Download"` | Button label | 298 |
| `"Invoice regenerated and downloaded successfully."` | Toast | 111 |
| `"Failed to regenerate invoice. Please try again."` | Toast | 117 |
| `"Invoice marked as {status}."` | Toast | 187 |

---

### 5. src/app/[locale]/settings/page.tsx
**Strings to Translate**: 1

| String | Usage | Line |
|--------|-------|------|
| `"Manage your company details including registration numbers and bank information."` | Page/Form description | 27 |

---

### 6. src/app/[locale]/settings/company-info-modal.tsx
**Strings to Translate**: 3

| String | Usage | Line |
|--------|-------|------|
| `"NIF Number"` | Placeholder | 322 |
| `"NIS Number"` | Placeholder | 351 |
| `"Bank Account RIB"` | Placeholder | 366 |

---

### 7. src/components/dashboard/add-customer-dialog.tsx
**Strings to Translate**: 4

| String | Usage | Line |
|--------|-------|------|
| `"Registration Code"` | Placeholder | 223 |
| `"NIS Number"` | Placeholder | 237 |
| `"NIF Number"` | Placeholder | 253 |
| `"Bank Account RIB"` | Placeholder | 282 |

---

### 8. src/components/dashboard/edit-customer-dialog.tsx
**Strings to Translate**: 7

| String | Usage | Line |
|--------|-------|------|
| `"Edit Customer"` | Dialog title | 163 |
| `"You do not have permission to edit customers."` | Permission error | 114 |
| `"Registration Code"` | Placeholder | 235 |
| `"NIS Number"` | Placeholder | 249 |
| `"NIF Number"` | Placeholder | 265 |
| `"Bank Account RIB"` | Placeholder | 294 |
| `"Are you sure you want to delete this invoice? This action cannot be undone."` | Confirmation | 147 |

---

### 9. src/components/dashboard/add-supplier-dialog.tsx
**Strings to Translate**: 6

| String | Usage | Line |
|--------|-------|------|
| `"Add New Supplier"` | Dialog title | 151 |
| `"You do not have permission to add suppliers."` | Permission error | 95 |
| `"Contact Name (Optional)"` | Form label | 178 |
| `"Registration Code"` | Placeholder | 237 |
| `"NIS Number"` | Placeholder | 251 |
| `"NIF Number"` | Placeholder | 267 |

---

### 10. src/components/dashboard/edit-supplier-dialog.tsx
**Strings to Translate**: 7

| String | Usage | Line |
|--------|-------|------|
| `"Edit Supplier"` | Dialog title | 163 |
| `"You do not have permission to edit suppliers."` | Permission error | 114 |
| `"Contact Name"` | Form label | 218 |
| `"Registration Code"` | Placeholder | 249 |
| `"NIS Number"` | Placeholder | 263 |
| `"NIF Number"` | Placeholder | 279 |
| `"Bank Account RIB"` | Placeholder | 293 |

---

### 11. src/components/dashboard/create-invoice-dialog.tsx
**Strings to Translate**: 1

| String | Usage | Line |
|--------|-------|------|
| `"Create Invoice"` | Dialog title | 79 |

---

### 12. src/components/dashboard/add-product-dialog.tsx
**Strings to Translate**: 2

| String | Usage | Line |
|--------|-------|------|
| `"Trial users cannot add products"` | Button tooltip | 500 |
| `"You do not have permission to add products."` | Permission error | 85, 154 |

---

### 13. src/components/dashboard/user-profile-modal.tsx
**Strings to Translate**: 2

| String | Usage | Line |
|--------|-------|------|
| `"Edit Profile"` | Dialog title | 96 |
| `"Profile updated"` | Toast title | 59 |

---

### 14. src/components/dashboard/settings-form.tsx
**Strings to Translate**: 1

| String | Usage | Line |
|--------|-------|------|
| `"Manage your company details including registration numbers and bank information."` | Form description | 30 |

---

### 15. src/components/dashboard/create-invoice-form.tsx
**Strings to Translate**: 1

| String | Usage | Line |
|--------|-------|------|
| `"You do not have permission to export invoices."` | Permission error | 162 |

---

### 16. src/components/dashboard/invoice-generator.ts
**Strings to Translate**: 2

| String | Usage | Line |
|--------|-------|------|
| `"Trial users cannot export invoices. Please upgrade to premium to enable exports."` | Error message | 38 |
| `"You do not have permission to export invoices."` | Permission error | 40 |

---

### 17. src/lib/trial-utils.ts
**Strings to Translate**: 2

| String | Usage | Line |
|--------|-------|------|
| `"Trial users cannot export data. Upgrade to Premium to unlock this feature."` | Trial restriction | 150 |
| `"Trial users cannot add or modify data. Upgrade to Premium to unlock this feature."` | Trial restriction | 167 |

---

## 🎯 Implementation Steps

### For Each File:

1. **Identify the dictionary key structure** needed
   - Example: `dictionary.stockPage.tableHeaders.name`
   - Example: `dictionary.invoices.status.paid`

2. **Add strings to all 3 dictionaries**:
   - `src/dictionaries/en.json`
   - `src/dictionaries/ar.json`
   - `src/dictionaries/fr.json`

3. **Update component** to use dictionary:
   ```typescript
   // Before:
   <TableHead>Name</TableHead>
   
   // After:
   <TableHead>{dictionary.customersPage.tableHeaders?.name || 'Name'}</TableHead>
   ```

4. **Test in all languages** to verify:
   - Text displays correctly
   - RTL layout works for Arabic
   - No missing translations

---

## 📋 Master Checklist

- [ ] **Empty States** (8 strings) - HIGH PRIORITY
- [ ] **Page Descriptions** (5 strings) - HIGH PRIORITY  
- [ ] **Table Headers** (12 strings) - HIGH PRIORITY
- [ ] **Dialog Titles** (6 strings) - HIGH PRIORITY
- [ ] **Toast Messages** (16 strings) - MEDIUM PRIORITY
- [ ] **Permission Messages** (10 strings) - HIGH PRIORITY
- [ ] **Form Placeholders** (19 strings) - MEDIUM PRIORITY
- [ ] **Button Labels** (4 strings) - MEDIUM PRIORITY
- [ ] **Search Placeholders** (4 strings) - MEDIUM PRIORITY
- [ ] **Button Tooltips** (4 strings) - LOW PRIORITY
- [ ] **Form Labels** (2 strings) - MEDIUM PRIORITY
- [ ] **Invoice Labels** (2 strings) - MEDIUM PRIORITY

---

## 🔗 Related Files

- Dictionary files: `src/dictionaries/`
  - [src/dictionaries/en.json](src/dictionaries/en.json)
  - [src/dictionaries/ar.json](src/dictionaries/ar.json)
  - [src/dictionaries/fr.json](src/dictionaries/fr.json)

- Dictionary utility: [src/lib/dictionaries.ts](src/lib/dictionaries.ts)

- Main audit report: [FINAL_HARDCODED_STRINGS_AUDIT.md](FINAL_HARDCODED_STRINGS_AUDIT.md)

---

**Last Updated**: December 23, 2025
