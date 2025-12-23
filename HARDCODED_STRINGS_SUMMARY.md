# Hardcoded Strings Summary Report

## Quick Overview

**Total Hardcoded English Strings Found**: 50+  
**Files Affected**: 8-10 main component files  
**Priority Level**: HIGH - Blocking proper i18n support

---

## Categories of Strings Found

### 1. Dialog & Modal Titles/Descriptions (12 strings)
- "Edit Company Information" (2x)
- "This information will be displayed on your invoices."
- "Edit Business Rules" 
- "Set default values for business logic and pricing."
- "Create Access Right"
- "Create Access Right Profile"
- "Add New Customer"
- "Add a new customer to your database with contact and identification information."
- + 3 more

### 2. Form Labels & Placeholders (18 strings)
- "Company Name *"
- "Your Company Name"
- "Phone *"
- "+213 XXX XXX XXX"
- "Default Profit Margin (%)"
- "Default VAT Logic (%)"
- "Address (Optional)"
- "Street address"
- "Bank Account RIB"
- "25", "19" (placeholder values)
- + 8 more permission/checkbox labels

### 3. Button Labels (8 strings)
- "Cancel" (5+ occurrences)
- "Save Rules"
- "Save" 
- "Close"
- "Add Customer"
- "Update Customer"
- "Add"
- "Edit"

### 4. Toast & Notification Messages (8 strings)
- "Business Rules Saved"
- "Profit margin set to {X}% and VAT to {Y}%."
- "Error Saving"
- "Could not save business rules."
- "Product added successfully."
- "Failed to add product. Please try again."
- "Customer added successfully."
- "Failed to add customer. Please try again."

### 5. Permission & Error Messages (6 strings)
- "Trial users cannot add products"
- "You do not have permission to add products." (2x)
- "You do not have permission to add customers."
- "You do not have permission to edit suppliers."
- "You do not have permission to edit customers."

### 6. Settings & Configuration Text (4 strings)
- "Manage your application and user settings."
- "Configure default profit margins and VAT settings for your business."
- "Income from paid invoices & sales"
- "Sales completed today"

### 7. Admin Panel Strings (6 strings)
- "View users"
- "Create users"
- "Edit users"
- "Delete users"
- "View analytics and statistics"
- "View system reports"
- + more permissions labels

---

## Files Requiring Updates

| File | Strings Found | Priority |
|------|---------------|----------|
| [src/app/[locale]/settings/company-info-modal.tsx](src/app/[locale]/settings/company-info-modal.tsx) | 6 | HIGH |
| [src/app/[locale]/settings/business-rules-modal.tsx](src/app/[locale]/settings/business-rules-modal.tsx) | 9 | HIGH |
| [src/components/admin/create-access-right-dialog.tsx](src/components/admin/create-access-right-dialog.tsx) | 18 | HIGH |
| [src/components/dashboard/add-product-dialog.tsx](src/components/dashboard/add-product-dialog.tsx) | 3 | HIGH |
| [src/components/dashboard/add-customer-dialog.tsx](src/components/dashboard/add-customer-dialog.tsx) | 6 | HIGH |
| [src/components/dashboard/edit-customer-dialog.tsx](src/components/dashboard/edit-customer-dialog.tsx) | 3 | HIGH |
| [src/app/[locale]/settings/profit-margin-form.tsx](src/app/[locale]/settings/profit-margin-form.tsx) | 3 | MEDIUM |
| [src/components/dashboard/dashboard-stats.tsx](src/components/dashboard/dashboard-stats.tsx) | 2 | MEDIUM |
| [src/components/dashboard/settings-form.tsx](src/components/dashboard/settings-form.tsx) | 1 | MEDIUM |
| [src/app/[locale]/dashboard/settings/page.tsx](src/app/[locale]/dashboard/settings/page.tsx) | 1 | MEDIUM |

---

## Critical Strings (Most Important to Fix)

1. **Modal Titles** - Users see these immediately
2. **Form Labels** - Required for proper UX
3. **Button Labels** - Essential for navigation
4. **Error Messages** - Users need to understand errors
5. **Success Messages** - Feedback on actions

---

## Implementation Impact

### What's Already in Dictionary
✅ Dashboard titles and navigation  
✅ Product/Customer/Supplier dialog base structure  
✅ Log sale/purchase dialogs  
✅ User management dialogs  
✅ Common actions (save, cancel, delete)  

### What's Missing
❌ Company info settings form  
❌ Business rules settings  
❌ Access rights creation form labels  
❌ Permission-related messages  
❌ Some form placeholders  
❌ Some toast messages  

---

## Recommended Next Steps

### Phase 1: Critical UI Elements (1 day)
1. Add all modal titles and descriptions to dictionary
2. Add all button labels to dictionary
3. Update 3-4 most-used components

### Phase 2: Forms & Settings (1 day)
1. Add all form labels and placeholders
2. Add permission messages
3. Update settings forms

### Phase 3: Messages & Notifications (1 day)
1. Add all toast/notification messages
2. Add error and validation messages
3. Add success messages

### Phase 4: Testing & Finalization (0.5 days)
1. Test all three languages
2. Verify UI looks correct
3. Clean up any remaining hardcoded strings

---

## Statistics

| Metric | Count |
|--------|-------|
| Total Hardcoded Strings | 50+ |
| Components Affected | 10 |
| Dialog Titles | 12 |
| Form Labels | 18 |
| Button Labels | 8 |
| Messages (Toast/Error) | 8 |
| Permission Messages | 6 |
| Other Text | 4+ |

---

## How to Use This Report

1. **For Implementation**: Reference `HARDCODED_STRINGS_FOUND.md` for complete details
2. **For Tracking**: Use the files table to prioritize work
3. **For Testing**: Verify each string exists in all 3 language dictionaries
4. **For QA**: Check that all hardcoded strings are replaced

---

## Success Criteria

✅ All 50+ strings moved to dictionary  
✅ All three languages (EN, AR, FR) have translations  
✅ No hardcoded English strings in component files  
✅ All features work in all languages  
✅ No console warnings about missing translations  

---

**Generated**: December 23, 2025  
**For**: Stock Manager Application  
**Language Support**: English, Arabic, French
