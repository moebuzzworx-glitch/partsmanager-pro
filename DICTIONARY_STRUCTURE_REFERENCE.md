# Complete Dictionary Structure Reference

## Dictionary Hierarchy

```
root
├── appName
├── landing
├── auth
├── dashboard
├── stockPage
├── addProductDialog
├── logSaleDialog
├── logPurchaseDialog
├── addSupplierDialog (NEW)
├── editSupplierDialog (NEW)
├── addCustomerDialog (NEW)
├── editCustomerDialog (NEW)
├── userManagement (NEW)
│   ├── addUserDialog
│   └── editUserDialog
├── accessRights (NEW)
├── common (NEW)
├── profileModal (NEW)
├── billingPanel (NEW)
└── settings (NEW)
```

## Detailed Key Mapping

### appName
```
appName: "PartsManager Pro"
```

### landing
```
landing:
  ├── title: "Revolutionize Your Parts Management"
  ├── subtitle: "Streamline your inventory..."
  ├── cta: "Get Started"
  ├── login: "Sign In"
  ├── featuresTitle: "Powerful Features, Simple Interface"
  ├── featureStock: "Stock Management"
  ├── featureStockDesc: "Effortlessly track products..."
  ├── featureBilling: "Billing & Invoicing"
  ├── featureBillingDesc: "Generate professional..."
  ├── featureCrm: "Customer & Supplier CRM"
  └── featureCrmDesc: "Manage contacts..."
```

### auth
```
auth:
  ├── loginTitle: "Welcome Back!"
  ├── loginSubtitle: "Sign in to access your dashboard."
  ├── signupTitle: "Create an Account"
  ├── signupSubtitle: "Join us and streamline..."
  ├── emailLabel: "Email"
  ├── passwordLabel: "Password"
  ├── loginButton: "Login"
  ├── signupButton: "Sign Up"
  ├── logout: "Logout"
  ├── noAccount: "Don't have an account?"
  └── haveAccount: "Already have an account?"
```

### dashboard
```
dashboard:
  ├── title: "Dashboard"
  ├── stock: "Stock"
  ├── purchases: "Purchases"
  ├── sales: "Sales"
  ├── customers: "Customers"
  ├── suppliers: "Suppliers"
  ├── invoices: "Invoices"
  ├── trash: "Trash"
  ├── settings: "Settings"
  ├── expiringSoon: "Your subscription is expiring soon!..."
  ├── totalProducts: "Total Products"
  ├── revenue: "Total Revenue"
  ├── salesToday: "Sales Today"
  ├── lowStockItems: "Low Stock Items"
  └── addProduct: "Add Product"
```

### stockPage
```
stockPage:
  ├── title: "Stock Management"
  ├── description: "Manage your inventory..."
  ├── searchPlaceholder: "Search products..."
  ├── product: "Product"
  ├── designation: "Designation"
  ├── reference: "Reference"
  ├── brand: "Brand"
  ├── stock: "Stock"
  ├── purchasePrice: "Purchase Price"
  ├── sellingPrice: "Selling Price"
  ├── sku: "SKU"
  ├── category: "Category"
  ├── quantity: "Quantity"
  ├── price: "Price"
  ├── status: "Status"
  ├── actions: "Actions"
  ├── inStock: "In Stock"
  ├── lowStock: "Low Stock"
  ├── outOfStock: "Out of Stock"
  ├── edit: "Edit"
  └── delete: "Delete"
```

### addProductDialog
```
addProductDialog:
  ├── title: "Add New Product"
  ├── description: "Add a single product manually..."
  ├── manualEntry: "Manual Entry"
  ├── batchImport: "Batch Import"
  ├── designation: "Designation"
  ├── designationPlaceholder: "e.g., Excavator Bucket"
  ├── reference: "Reference (Unique ID)"
  ├── referencePlaceholder: "e.g., EB-HD-001"
  ├── brand: "Brand"
  ├── brandPlaceholder: "e.g., CAT"
  ├── quantity: "Quantity to Add"
  ├── purchasePrice: "Purchase Price (DZD)"
  ├── submit: "Add/Update Product"
  ├── batchDescription: "Drag and drop..."
  ├── downloadTemplate: "Download Template"
  └── uploadFile: "Upload File"
```

### logSaleDialog
```
logSaleDialog:
  ├── logSale: "Log Sale"
  ├── title: "Log a New Sale"
  ├── description: "Add products and a customer..."
  ├── customer: "Customer"
  ├── customerPlaceholder: "Search or create a customer..."
  ├── noCustomerFound: "No customer found."
  ├── newCustomer: "(New Customer)"
  ├── product: "Product"
  ├── productPlaceholder: "Search for a product..."
  ├── noProductFound: "No product found."
  ├── quantity: "Quantity"
  ├── price: "Price"
  ├── total: "Total"
  └── submit: "Log Sale"
```

### logPurchaseDialog
```
logPurchaseDialog:
  ├── logPurchase: "Log Purchase"
  ├── title: "Log a New Purchase"
  ├── description: "Add products and a supplier..."
  ├── supplier: "Supplier"
  ├── supplierPlaceholder: "Search or create a supplier..."
  ├── noSupplierFound: "No supplier found."
  ├── newSupplier: "(New Supplier)"
  ├── itemDescription: "Item Description"
  ├── itemDescriptionPlaceholder: "e.g., Detergent..."
  ├── addItem: "Add Item"
  ├── quantity: "Quantity"
  ├── price: "Unit Price"
  ├── total: "Total"
  └── submit: "Log Purchase"
```

### addSupplierDialog (NEW)
```
addSupplierDialog:
  ├── title: "Add New Supplier"
  ├── description: "Add a new supplier to your database..."
  ├── supplierName: "Supplier Name"
  ├── supplierNamePlaceholder: "e.g., XYZ Imports"
  ├── contactName: "Contact Name (Optional)"
  ├── contactNamePlaceholder: "Name of contact person"
  ├── email: "Email"
  ├── emailPlaceholder: "supplier@example.com"
  ├── phone: "Phone"
  ├── phonePlaceholder: "+213 XXX XXX XXX"
  ├── submit: "Add Supplier"
  ├── addSuccess: "Supplier added successfully."
  ├── addError: "Failed to add supplier. Please try again."
  ├── validationNameRequired: "Supplier name is required"
  ├── validationEmailRequired: "Valid email is required"
  ├── validationPhoneRequired: "Phone number is required"
  └── validationNameMinLength: "Name must be at least 3 characters"
```

### editSupplierDialog (NEW)
```
editSupplierDialog:
  ├── title: "Edit Supplier"
  ├── description: "Update supplier information..."
  ├── supplierName: "Supplier Name"
  ├── contactName: "Contact Name (Optional)"
  ├── email: "Email"
  ├── phone: "Phone"
  ├── submit: "Update Supplier"
  ├── updateSuccess: "Supplier updated successfully."
  └── updateError: "Failed to update supplier. Please try again."
```

### addCustomerDialog (NEW)
```
addCustomerDialog:
  ├── title: "Add New Customer"
  ├── description: "Add a new customer to your database..."
  ├── customerName: "Customer Name"
  ├── customerNamePlaceholder: "e.g., ABC Company"
  ├── contactName: "Contact Name (Optional)"
  ├── contactNamePlaceholder: "Name of contact person"
  ├── email: "Email"
  ├── emailPlaceholder: "customer@example.com"
  ├── phone: "Phone"
  ├── phonePlaceholder: "+213 XXX XXX XXX"
  ├── submit: "Add Customer"
  ├── addSuccess: "Customer added successfully."
  ├── addError: "Failed to add customer. Please try again."
  ├── validationNameRequired: "Customer name is required"
  ├── validationEmailRequired: "Valid email is required"
  ├── validationPhoneRequired: "Phone number is required"
  └── validationNameMinLength: "Name must be at least 3 characters"
```

### editCustomerDialog (NEW)
```
editCustomerDialog:
  ├── title: "Edit Customer"
  ├── description: "Update customer information..."
  ├── customerName: "Customer Name"
  ├── contactName: "Contact Name (Optional)"
  ├── email: "Email"
  ├── phone: "Phone"
  ├── submit: "Update Customer"
  ├── updateSuccess: "Customer updated successfully."
  └── updateError: "Failed to update customer. Please try again."
```

### userManagement (NEW)
```
userManagement:
  ├── title: "User Management"
  ├── description: "Manage users, roles, and access rights."
  ├── addUserDialog:
  │   ├── title: "Create User"
  │   ├── description: "Create a new user account..."
  │   ├── userName: "User name"
  │   ├── userNamePlaceholder: "user@example.com"
  │   ├── email: "Email"
  │   ├── emailPlaceholder: "user@example.com"
  │   ├── subscription: "Subscription"
  │   ├── subscriptionTrial: "Trial (Free - 5 days)"
  │   ├── subscriptionPremium: "Premium (5000 DA/year)"
  │   ├── role: "Role"
  │   ├── roleAdmin: "Admin"
  │   ├── roleUser: "User"
  │   ├── status: "Status"
  │   ├── statusActive: "Active"
  │   ├── statusInactive: "Inactive"
  │   ├── submit: "Create User"
  │   ├── createSuccess: "User created successfully."
  │   ├── createError: "Failed to create user. Please try again."
  │   ├── validationNameRequired: "Name is required"
  │   ├── validationEmailRequired: "Valid email is required"
  │   ├── validationSubscriptionRequired: "Select a valid subscription"
  │   ├── validationRoleRequired: "Select a valid role"
  │   └── validationStatusRequired: "Select a valid status"
  └── editUserDialog:
      ├── title: "Edit User"
      ├── description: "Update user information, subscription..."
      ├── basicInformation: "Basic Information"
      ├── name: "Name"
      ├── namePlaceholder: "e.g., Content Manager"
      ├── email: "Email"
      ├── subscription: "Subscription"
      ├── role: "Role"
      ├── status: "Status"
      ├── submit: "Update User"
      ├── updateSuccess: "User [name] updated successfully."
      └── updateError: "Failed to update user. Please try again."
```

### accessRights (NEW)
```
accessRights:
  ├── title: "Create Access Right"
  ├── description: "Define what admin pages..."
  ├── createSuccess: "Access right \"[name]\" created successfully"
  ├── createError: "Failed to create access right. Please try again."
  └── loadError: "Could not load access rights templates"
```

### common (NEW - Global Strings)
```
common:
  ├── cancel: "Cancel"
  ├── save: "Save"
  ├── update: "Update"
  ├── delete: "Delete"
  ├── close: "Close"
  ├── add: "Add"
  ├── edit: "Edit"
  ├── submit: "Submit"
  ├── loading: "Loading..."
  ├── saving: "Saving..."
  ├── updating: "Updating..."
  ├── processing: "Processing..."
  ├── success: "Success"
  ├── error: "Error"
  ├── warning: "Warning"
  ├── firebaseNotInitialized: "Firestore not initialized."
  ├── permissionDenied: "Permission Denied"
  ├── currency: "DZD"
  ├── reference: "Ref:"
  └── stockLabel: "Stock:"
```

### profileModal (NEW)
```
profileModal:
  ├── title: "Edit Profile"
  ├── description: "Change your display name or password..."
  ├── displayName: "Display Name"
  └── updateSuccess: "Profile updated"
```

### billingPanel (NEW)
```
billingPanel:
  ├── plan: "Plan:"
  ├── expires: "Expires:"
  ├── renewButton: "Renew / Upgrade to Premium"
  └── processing: "Processing..."
```

### settings (NEW)
```
settings:
  ├── defaultProfitMargin: "Default Profit Margin (%)"
  └── savingAndUpdating: "Saving and Updating Products..."
```

## Quick Access Examples

### By Page/Component
**Login Page**: `auth.*`
**Dashboard**: `dashboard.*`
**Stock Page**: `stockPage.*`
**Add Product**: `addProductDialog.*`
**Log Sale**: `logSaleDialog.*`
**Log Purchase**: `logPurchaseDialog.*`
**Add Supplier**: `addSupplierDialog.*`
**Edit Supplier**: `editSupplierDialog.*`
**Add Customer**: `addCustomerDialog.*`
**Edit Customer**: `editCustomerDialog.*`
**User Management**: `userManagement.*`
**Access Rights**: `accessRights.*`
**Common**: `common.*` (used everywhere)
**Profile Modal**: `profileModal.*`
**Billing**: `billingPanel.*`
**Settings**: `settings.*`

### By Type
**Titles**: `*.title`
**Descriptions**: `*.description`
**Labels**: `*.label` or `*.{fieldName}`
**Placeholders**: `*.{fieldName}Placeholder`
**Success Messages**: `*.{action}Success`
**Error Messages**: `*.{action}Error`
**Validation**: `*.validation*`
**Buttons**: `common.*Action` or specific dialog buttons

---

**Last Updated**: December 23, 2025
**Total Keys**: 267+
**Languages**: 3 (English, Arabic, French)
