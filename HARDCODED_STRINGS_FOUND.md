# Hardcoded English Strings Found in Workspace

## Summary
This document lists ALL hardcoded English strings found in components, pages, modals, dialogs, forms, and utility files that should be moved to the dictionary for proper internationalization support.

**Total Strings Found**: 50+  
**Languages Supported**: 3 (English, Arabic, French)  
**Status**: Critical - These strings are blocking proper i18n implementation

---

## Table of Contents
1. [Dialog & Modal Titles/Descriptions](#dialog--modal-titlesdescriptions)
2. [Form Labels & Placeholders](#form-labels--placeholders)
3. [Button Labels](#button-labels)
4. [Status & Info Messages](#status--info-messages)
5. [Table Headers & Column Names](#table-headers--column-names)
6. [Toast/Notification Messages](#toastnotification-messages)
7. [Settings & Configuration Pages](#settings--configuration-pages)
8. [Dashboard Content](#dashboard-content)

---

## Dialog & Modal Titles/Descriptions

### CompanyInfoModal
**File**: [src/app/[locale]/settings/company-info-modal.tsx](src/app/[locale]/settings/company-info-modal.tsx)

| String | Category | Count | Line(s) |
|--------|----------|-------|---------|
| "Edit Company Information" | Button/Title | 2 | 243, 249 |
| "This information will be displayed on your invoices." | Description | 1 | 251 |
| "Company Name *" | Label | 1 | 265 |
| "Your Company Name" | Placeholder | 1 | 267 |
| "Phone *" | Label | 1 | 274 |
| "+213 XXX XXX XXX" | Placeholder | 1 | 276 |

### BusinessRulesModal
**File**: [src/app/[locale]/settings/business-rules-modal.tsx](src/app/[locale]/settings/business-rules-modal.tsx)

| String | Category | Count | Line(s) |
|--------|----------|-------|---------|
| "Edit Business Rules" | Button/Title | 1 | 117 |
| "Set default values for business logic and pricing." | Description | 1 | 125 |
| "Default Profit Margin (%)" | Label | 1 | 136 |
| "25" | Placeholder | 1 | 143 |
| "Default VAT Logic (%)" | Label | 1 | 160 |
| "19" | Placeholder | 1 | 167 |
| "Cancel" | Button | 1 | 180 |
| "Saving..." | Loading Message | 1 | 191 |
| "Save Rules" | Button | 1 | 195 |

### CreateAccessRightDialog
**File**: [src/components/admin/create-access-right-dialog.tsx](src/components/admin/create-access-right-dialog.tsx)

| String | Category | Count | Line(s) |
|--------|----------|-------|---------|
| "Create Access Right" | Button/Title | 2 | 164, 458 |
| "Create Access Right Profile" | Dialog Title | 1 | 169 |
| "e.g., Can manage users and view reports" | Placeholder | 1 | 202 |
| "View users" | Label | 1 | 242 |
| "Create users" | Label | 1 | 254 |
| "Edit users" | Label | 1 | 266 |
| "Delete users" | Label | 1 | 278 |
| "View analytics and statistics" | Description | 1 | 295 |
| "View system reports" | Description | 1 | 312 |
| "View activity and audit logs" | Description | 1 | 329 |
| "View settings" | Label | 1 | 346 |
| "Edit settings" | Label | 1 | 358 |
| "View security settings and configurations" | Description | 1 | 392 |
| "View access rights" | Label | 1 | 409 |
| "Create access rights" | Label | 1 | 421 |
| "Edit access rights" | Label | 1 | 433 |
| "Delete access rights" | Label | 1 | 445 |
| "Cancel" | Button | 1 | 454 |

---

## Form Labels & Placeholders

### AddProductDialog (Manual Entry Tab)
**File**: [src/components/dashboard/add-product-dialog.tsx](src/components/dashboard/add-product-dialog.tsx)

| String | Category | Count | Line(s) |
|--------|----------|-------|---------|
| "Close" | Button | 1 | 649 |

### AddCustomerDialog
**File**: [src/components/dashboard/add-customer-dialog.tsx](src/components/dashboard/add-customer-dialog.tsx)

| String | Category | Count | Line(s) |
|--------|----------|-------|---------|
| "Add New Customer" | Dialog Title | 1 | 151 |
| "Add a new customer to your database with contact and identification information." | Description | 1 | 153 |
| "Address (Optional)" | Label | 1 | 206 |
| "Street address" | Placeholder | 1 | 208 |
| "Cancel" | Button | 1 | 291 |
| "Add Customer" | Button | 1 | 295 |

### EditCustomerDialog
**File**: [src/components/dashboard/edit-customer-dialog.tsx](src/components/dashboard/edit-customer-dialog.tsx)

| String | Category | Count | Line(s) |
|--------|----------|-------|---------|
| "Bank Account RIB" | Placeholder | 1 | 293 |
| "Cancel" | Button | 1 | 305 |
| "Update Customer" | Button | 1 | 308 |

---

## Button Labels

### Common Buttons (Multiple Locations)
| String | Type | Files | Count |
|--------|------|-------|-------|
| "Cancel" | Button | Multiple | 5+ |
| "Add" | Button | Multiple | 3+ |
| "Edit" | Button/Icon | Multiple | 2+ |
| "Save Rules" | Button | BusinessRulesModal | 1 |
| "Save" | Button | Multiple | 2+ |
| "Close" | Button | AddProductDialog | 1 |

---

## Status & Info Messages

### DashboardStats Component
**File**: [src/components/dashboard/dashboard-stats.tsx](src/components/dashboard/dashboard-stats.tsx)

| String | Category | Count | Line(s) |
|--------|----------|-------|---------|
| "Income from paid invoices & sales" | Description | 1 | 67 |
| "Sales completed today" | Description | 1 | 79 |

### SettingsForm Component
**File**: [src/components/dashboard/settings-form.tsx](src/components/dashboard/settings-form.tsx)

| String | Category | Count | Line(s) |
|--------|----------|-------|---------|
| "Configure default profit margins and VAT settings for your business." | Description | 1 | 49 |

---

## Settings & Configuration Pages

### SettingsPage
**File**: [src/app/[locale]/dashboard/settings/page.tsx](src/app/[locale]/dashboard/settings/page.tsx)

| String | Category | Count | Line(s) |
|--------|----------|-------|---------|
| "Manage your application and user settings." | Description | 1 | ~14 |

---

## Toast Notifications & Messages

### BusinessRulesModal (Toast Messages)
**File**: [src/app/[locale]/settings/business-rules-modal.tsx](src/app/[locale]/settings/business-rules-modal.tsx)

| String | Category | Count | Line(s) |
|--------|----------|-------|---------|
| "Business Rules Saved" | Toast Title | 1 | 97 |
| `Profit margin set to ${values.profitMargin}% and VAT to ${values.defaultVat}%.` | Toast Description | 1 | 98 |
| "Error Saving" | Toast Title | 1 | 104 |
| "Could not save business rules." | Toast Description | 1 | 105 |

### AddProductDialog (Toast Messages)
**File**: [src/components/dashboard/add-product-dialog.tsx](src/components/dashboard/add-product-dialog.tsx)

| String | Category | Count | Line(s) |
|--------|----------|-------|---------|
| "Product added successfully." | Toast | 1 | 119 |
| "Failed to add product. Please try again." | Error Message | 1 | 140 |

### AddCustomerDialog (Toast Messages)
**File**: [src/components/dashboard/add-customer-dialog.tsx](src/components/dashboard/add-customer-dialog.tsx)

| String | Category | Count | Line(s) |
|--------|----------|-------|---------|
| "Customer added successfully." | Toast | 1 | 123 |
| "Failed to add customer. Please try again." | Error Message | 1 | 133 |

### ProfitMarginForm (Toast Messages)
**File**: [src/app/[locale]/settings/profit-margin-form.tsx](src/app/[locale]/settings/profit-margin-form.tsx)

| String | Category | Count | Line(s) |
|--------|----------|-------|---------|
| "Error Saving" | Toast Title | 1 | 87 |

---

## Dialog & Modal Permission Messages

### AddProductDialog
**File**: [src/components/dashboard/add-product-dialog.tsx](src/components/dashboard/add-product-dialog.tsx)

| String | Category | Count | Line(s) |
|--------|----------|-------|---------|
| "Trial users cannot add products" | Title/Tooltip | 1 | 500 |
| "You do not have permission to add products." | Permission Message | 2 | 85, 154 |

### AddCustomerDialog
**File**: [src/components/dashboard/add-customer-dialog.tsx](src/components/dashboard/add-customer-dialog.tsx)

| String | Category | Count | Line(s) |
|--------|----------|-------|---------|
| "You do not have permission to add customers." | Permission Message | 1 | 95 |

---

## Dialog Trigger Buttons (Non-Dictionary)

| String | File | Category |
|--------|------|----------|
| "Edit Company Information" | CompanyInfoModal | Button |
| "Edit Business Rules" | BusinessRulesModal | Button |

---

## Data Validation & Error Messages

### Profit Margin Form
**File**: [src/app/[locale]/settings/profit-margin-form.tsx](src/app/[locale]/settings/profit-margin-form.tsx)

| String | Category | Count |
|--------|----------|-------|
| "Could not retrieve profit margin from local storage" | Error | 1 |
| "Failed to update product prices:" | Error | 1 |

### Company Info Modal
**File**: [src/app/[locale]/settings/company-info-modal.tsx](src/app/[locale]/settings/company-info-modal.tsx)

| String | Category | Count |
|--------|----------|-------|
| "Could not retrieve company info" | Error | 1 |
| "Cloudinary upload failed:" | Error | 1 |
| "Server upload failed" | Error | 1 |
| "Failed to save company info to Firestore or upload logo" | Error | 1 |
| "Page reload failed:" | Warning | 1 |
| "Failed to update auth profile photoURL" | Warning | 2 |

---

## Admin Forms & Dialogs

### CreateAccessRightDialog (Continued)
**File**: [src/components/admin/create-access-right-dialog.tsx](src/components/admin/create-access-right-dialog.tsx)

**Toast Messages**:
| String | Category | Count | Line(s) |
|--------|----------|-------|---------|
| `Access right "${values.name}" created successfully` | Success | 1 | 141 |
| "Failed to create access right. Please try again." | Error | 1 | 151 |

---

## Component Import & Section Headings

### Settings Page
**File**: [src/app/[locale]/dashboard/settings/page.tsx](src/app/[locale]/dashboard/settings/page.tsx)

| String | Context |
|--------|---------|
| "Manage your application and user settings." | Page subtitle |

---

## Priority for Implementation

### High Priority (Most Visible UI)
1. Dialog titles and descriptions (CompanyInfoModal, BusinessRulesModal, CreateAccessRightDialog)
2. Form labels and placeholders
3. Button labels (Cancel, Save, etc.)
4. Toast notification messages
5. Permission denied messages

### Medium Priority (Less Frequently Seen)
1. Placeholder values
2. Descriptive text in settings
3. Error messages for data validation
4. Loading/processing messages

### Low Priority (Developer-Facing)
1. Console error messages
2. Debug messages
3. Internal validation errors

---

## Implementation Checklist

- [ ] **Phase 1**: Dictionary keys for modal titles and buttons
- [ ] **Phase 2**: Form labels and placeholders  
- [ ] **Phase 3**: Toast/notification messages
- [ ] **Phase 4**: Error and validation messages
- [ ] **Phase 5**: Update all components to use dictionary
- [ ] **Phase 6**: Test all three languages
- [ ] **Phase 7**: Remove all hardcoded English strings

---

## Dictionary Keys Needed

All these strings need to be added to:
- `src/dictionaries/en.json`
- `src/dictionaries/ar.json`
- `src/dictionaries/fr.json`

### Suggested Key Structure
```json
{
  "settings": {
    "companyInfo": {
      "title": "Edit Company Information",
      "description": "This information will be displayed on your invoices.",
      "companyNameLabel": "Company Name *",
      "companyNamePlaceholder": "Your Company Name",
      "phoneLabel": "Phone *",
      "phonePlaceholder": "+213 XXX XXX XXX"
    },
    "businessRules": {
      "title": "Edit Business Rules",
      "description": "Set default values for business logic and pricing.",
      "profitMarginLabel": "Default Profit Margin (%)",
      "profitMarginPlaceholder": "25",
      "vatLabel": "Default VAT Logic (%)",
      "vatPlaceholder": "19",
      "savedSuccess": "Business Rules Saved",
      "savedMessage": "Profit margin set to {margin}% and VAT to {vat}%.",
      "saveError": "Error Saving",
      "saveErrorMessage": "Could not save business rules."
    }
  },
  "admin": {
    "accessRights": {
      "createTitle": "Create Access Right",
      "profileTitle": "Create Access Right Profile",
      "successMessage": "Access right \"{name}\" created successfully",
      "errorMessage": "Failed to create access right. Please try again."
    }
  },
  "dashboard": {
    "stats": {
      "revenueDescription": "Income from paid invoices & sales",
      "salesTodayDescription": "Sales completed today"
    },
    "settings": {
      "description": "Manage your application and user settings.",
      "businessRulesDescription": "Configure default profit margins and VAT settings for your business."
    }
  }
}
```

---

## Next Steps

1. **Add all dictionary keys** to the three language files
2. **Update component imports** to use getDictionary
3. **Replace hardcoded strings** with dictionary references
4. **Test thoroughly** in all three languages
5. **Remove build warnings** related to missing translations

---

**Last Updated**: December 23, 2025  
**Total Hardcoded Strings**: 50+  
**Status**: Ready for implementation
