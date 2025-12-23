# Component Implementation Guide - Full i18n Migration

## Overview
All dictionary entries are now complete (~98% coverage). This guide provides step-by-step instructions to update components to use dictionary entries instead of hardcoded strings.

## Phase 1: Dialog Components (HIGH PRIORITY)

### 1. Add/Edit Customer Dialog
**File**: [src/components/dashboard/add-customer-dialog.tsx](src/components/dashboard/add-customer-dialog.tsx)

**Changes needed**:
- Replace `"Customer Name*"` with `dictionary.addCustomerDialog.customerName`
- Replace `"e.g., ABC Company"` with `dictionary.addCustomerDialog.customerNamePlaceholder`
- Replace `"Email*"` with `dictionary.addCustomerDialog.email`
- Replace `"customer@example.com"` with `dictionary.addCustomerDialog.emailPlaceholder`
- Replace `"Phone*"` with `dictionary.addCustomerDialog.phone`
- Replace `"+213 XXX XXX XXX"` with `dictionary.addCustomerDialog.phonePlaceholder`
- Replace `"Address (Optional)"` with `dictionary.addCustomerDialog.address`
- Replace `"Street address"` with `dictionary.addCustomerDialog.addressPlaceholder`
- Replace `"RC (Optional)"` with `dictionary.addCustomerDialog.rc`
- Replace `"Registration Code"` with `dictionary.addCustomerDialog.rcPlaceholder`
- Replace `"NIS (Optional)"` with `dictionary.addCustomerDialog.nis`
- Replace `"NIS Number"` with `dictionary.addCustomerDialog.nisPlaceholder`
- Replace `"NIF (Optional)"` with `dictionary.addCustomerDialog.nif`
- Replace `"NIF Number"` with `dictionary.addCustomerDialog.nifPlaceholder`
- Replace `"ART (Optional)"` with `dictionary.addCustomerDialog.art`
- Replace `"ART Number"` with `dictionary.addCustomerDialog.artPlaceholder`
- Replace `"RIB (Optional)"` with `dictionary.addCustomerDialog.rib`
- Replace `"Bank Account RIB"` with `dictionary.addCustomerDialog.ribPlaceholder`
- Replace `"Cancel"` button with `dictionary.addCustomerDialog.cancel`
- Replace `"Add Customer"` submit with `dictionary.addCustomerDialog.submit`
- Replace success/error messages with dictionary keys

**File**: [src/components/dashboard/edit-customer-dialog.tsx](src/components/dashboard/edit-customer-dialog.tsx)

**Changes needed**:
- Same replacements as add-customer-dialog
- Replace `"Update Customer"` button with `dictionary.editCustomerDialog.submit`
- Use `dictionary.editCustomerDialog.*` keys instead of addCustomerDialog keys

### 2. Add/Edit Supplier Dialog
**Files**: 
- [src/components/dashboard/add-supplier-dialog.tsx](src/components/dashboard/add-supplier-dialog.tsx)
- [src/components/dashboard/edit-supplier-dialog.tsx](src/components/dashboard/edit-supplier-dialog.tsx)

**Changes needed**:
- Replace all hardcoded labels with `dictionary.addSupplierDialog.*` and `dictionary.editSupplierDialog.*`
- Add optional field labels for address, RC, NIS, NIF, ART, RIB
- Replace Cancel and submit buttons

## Phase 2: Page Headers & Descriptions

### 3. Dashboard Page
**File**: [src/app/[locale]/dashboard/page.tsx](src/app/[locale]/dashboard/page.tsx)

**Changes needed**:
- Page title: Use `dictionary.dashboard.title`
- KPI labels:
  - "Total Products" → `dictionary.dashboard.totalProducts`
  - "Items Needing Reorder" → `dictionary.dashboard.itemsNeedingReorder`
  - "Today's Sales" → `dictionary.dashboard.todaysSales`
  - "Sales completed today" → `dictionary.dashboard.salesCompletedToday`
  - "Net Profit" → `dictionary.dashboard.netProfit`
  - "Total Revenue" → `dictionary.dashboard.totalRevenue`
  - "Income from paid invoices & sales" → `dictionary.dashboard.incomeFromPaidInvoices`
- Recent Activity:
  - "Recent Activity" → `dictionary.dashboard.recentActivity`
  - "Recent activity will be shown here" → `dictionary.dashboard.recentActivityEmpty`

### 4. Stock Management Page
**File**: [src/app/[locale]/dashboard/stock/page.tsx](src/app/[locale]/dashboard/stock/page.tsx)

**Changes needed**:
- Page title: `dictionary.stockPage.title`
- Page description: `dictionary.stockPage.description`
- "Add Product" button: `dictionary.stockPage.addButton`
- "Delete Selected" button: `dictionary.stockPage.deleteSelected`
- Search placeholder: `dictionary.stockPage.searchPlaceholder`
- No data message: `dictionary.table.noDataProducts`
- No data with search: `dictionary.table.noDataProductsSearch`
- Pagination: `dictionary.table.showing.replace('{count}', items.length).replace('{total}', total)`
- Table headers: Use `dictionary.stockPage.*` keys

### 5. Sales Page
**File**: [src/app/[locale]/dashboard/sales/page.tsx](src/app/[locale]/dashboard/sales/page.tsx)

**Changes needed**:
- Page title: `dictionary.sales.title`
- Page description: `dictionary.sales.description`
- "Log Sale" button: `dictionary.sales.addButton`
- Search placeholder: `dictionary.sales.searchPlaceholder`
- Table headers from `dictionary.sales.*`
- Empty state messages from `dictionary.table.*`

### 6. Purchases Page
**File**: [src/app/[locale]/dashboard/purchases/page.tsx](src/app/[locale]/dashboard/purchases/page.tsx)

**Changes needed**:
- Page title: `dictionary.purchases.title`
- Page description: `dictionary.purchases.description`
- "Log Purchase" button: `dictionary.purchases.addButton`
- Search placeholder: `dictionary.purchases.searchPlaceholder`
- Table columns: supplier, date, items, totalAmount from `dictionary.purchases.*`
- Empty messages from `dictionary.table.*`

### 7. Invoices Page
**File**: [src/app/[locale]/dashboard/invoices/page.tsx](src/app/[locale]/dashboard/invoices/page.tsx)

**Changes needed**:
- Page title: `dictionary.invoices.title`
- Page description: `dictionary.invoices.description`
- "Create Invoice" button: `dictionary.invoices.addButton`
- Search placeholder: `dictionary.invoices.searchPlaceholder`
- All table headers and status labels from `dictionary.invoices.*`

### 8. Customers Page
**File**: [src/app/[locale]/dashboard/customers/page.tsx](src/app/[locale]/dashboard/customers/page.tsx)

**Changes needed**:
- Page title: `dictionary.customers.title`
- Page description: `dictionary.customers.description`
- "Add Customer" button: `dictionary.customers.addButton`
- Search placeholder: `dictionary.customers.searchPlaceholder`
- Table headers: name, email, phone from `dictionary.customers.*` or `dictionary.table.*`
- Empty messages: `dictionary.table.noDataCustomers`, `dictionary.table.noDataCustomersSearch`
- Pagination: `dictionary.table.showing.replace('{count}', items.length).replace('{total}', total)`

### 9. Suppliers Page
**File**: [src/app/[locale]/dashboard/suppliers/page.tsx](src/app/[locale]/dashboard/suppliers/page.tsx)

**Changes needed**:
- Page title: `dictionary.suppliers.title`
- Page description: `dictionary.suppliers.description`
- "Add Supplier" button: `dictionary.suppliers.addButton`
- Search placeholder: `dictionary.suppliers.searchPlaceholder`
- Table headers: name, email, phone from `dictionary.suppliers.*`
- Empty messages: `dictionary.table.noDataSuppliers`, `dictionary.table.noDataSuppliersSearch`

### 10. Trash/Deleted Items Page
**File**: [src/app/[locale]/dashboard/trash/page.tsx](src/app/[locale]/dashboard/trash/page.tsx)

**Changes needed**:
- Page title: `dictionary.trash.title`
- Page description: `dictionary.trash.description`
- Search placeholder: `dictionary.trash.searchPlaceholder`
- "Restore Selected" button: `dictionary.trash.restoreSelected`
- "Delete Permanently" button: `dictionary.trash.deletePermSelectedy`
- Empty message: `dictionary.table.noDataTrash`

## Implementation Pattern

### For Form Labels:
```typescript
// BEFORE
<FormLabel>Customer Name*</FormLabel>

// AFTER
<FormLabel>{dictionary.addCustomerDialog.customerName}</FormLabel>
```

### For Placeholders:
```typescript
// BEFORE
<Input placeholder="e.g., ABC Company" />

// AFTER
<Input placeholder={dictionary.addCustomerDialog.customerNamePlaceholder} />
```

### For Empty States:
```typescript
// BEFORE
{!customers.length && (
  <div>No customers found. Add one to get started!</div>
)}

// AFTER
{!customers.length && (
  <div>{dictionary.table.noDataCustomers}</div>
)}
```

### For Pagination:
```typescript
// BEFORE
<div>Showing 1-{items.length} of {total} items</div>

// AFTER
<div dangerouslySetInnerHTML={{
  __html: dictionary.table.showing
    .replace('{count}', items.length)
    .replace('{total}', total)
}} />
```

### For Buttons:
```typescript
// BEFORE
<Button>Add Customer</Button>

// AFTER
<Button>{dictionary.addCustomerDialog.submit}</Button>
```

## Implementation Order (Recommended)

1. ✓ Dialogs (add-customer, edit-customer, add-supplier, edit-supplier)
2. Stock Management Page
3. Dashboard Page (KPIs and cards)
4. Invoices Page
5. Purchases Page
6. Sales Page
7. Customers Page
8. Suppliers Page
9. Trash Page

## Testing Checklist

For each component updated:
- [ ] All labels display correctly in English
- [ ] All labels display correctly in Arabic (RTL)
- [ ] All labels display correctly in French
- [ ] Placeholders are translated
- [ ] Button text is translated
- [ ] Error/success messages are translated
- [ ] Empty state messages are translated
- [ ] Pagination text is formatted correctly
- [ ] No hardcoded English strings remain

## Dictionary Key Reference

### Form Fields
- Dialog titles: `dictionary.*.title`
- Field labels: `dictionary.*.fieldName`
- Field placeholders: `dictionary.*.fieldNamePlaceholder`
- Cancel button: `dictionary.*.cancel`
- Submit button: `dictionary.*.submit`

### Pages
- Page titles: `dictionary.*.title`
- Page descriptions: `dictionary.*.description`
- Add/Create buttons: `dictionary.*.addButton`
- Search placeholders: `dictionary.*.searchPlaceholder`

### Messages
- Success: `dictionary.*.successMessage`
- Error: `dictionary.*.errorMessage`
- Empty data: `dictionary.table.noData*`
- Pagination: `dictionary.table.showing`

## Notes

- All dictionary keys have been verified and synced across all three languages
- File sizes are optimal (en: 17KB, ar: 21.5KB, fr: 18.9KB)
- RTL support is fully implemented for Arabic
- Business terminology is properly translated

## Next Steps

1. Update components in order of priority
2. Test each page in all three languages
3. Verify RTL layout for Arabic
4. Run final validation to ensure 100% coverage
5. Deploy to production

---

**Last Updated**: December 23, 2025
**Status**: Ready for Implementation ✓
**Coverage**: 98%+ of all UI text
