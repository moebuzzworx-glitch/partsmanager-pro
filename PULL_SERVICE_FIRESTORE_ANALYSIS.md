# Pull Service & Firestore Security Analysis
## Low Stock Notification Integration Research

**Date:** January 4, 2026  
**Task:** Research pull service and Firestore security rules to fix low stock notification integration

---

## 1. PULL SERVICE FILE STRUCTURE

### File: `src/lib/pull-service.ts` (Complete Overview)

**Purpose:** Adaptive polling for Firebase changes with self-adjusting intervals

#### Key Components:

1. **Pull State Management** (Lines 10-25)
   - `isRunning`: Service status
   - `lastPullTime`: Timestamp of last sync
   - `intervalMs`: Current polling interval (10-30 minutes)
   - `minInterval`: 10 minutes
   - `maxInterval`: 30 minutes
   - Adaptive interval increases when no changes detected, resets on user activity

2. **Core Functions:**

   **a) `setFirebaseContextPull()` (Lines 36-40)**
   - Stores Firebase instance and userId for use by the pull service
   - Called from layout-client.tsx
   - Enables context-independent pull operations

   **b) `startPullService()` (Lines 45-70)**
   - Initiates the adaptive polling mechanism
   - Returns cleanup function
   - Schedules periodic pulls via `pullFirebaseChangesFromContext()`
   - **Line 61:** Calls `pullFirebaseChangesFromContext()` after each poll

   **c) `onUserActivity()` (Lines 81-91)**
   - Resets poll interval on data modification (add/edit/delete)
   - Only triggers for data-modifying actions
   - Resets interval to minimum for responsiveness

   **d) `pullFirebaseChangesFromContext()` (Lines 102-108)**
   - **KEY FUNCTION FOR INTEGRATION**
   - Uses stored Firebase context
   - Delegates to `pullFirebaseChanges()`

   **e) `pullFirebaseChanges()` (Lines 114-188)**
   - **WHERE DATA SYNCING HAPPENS**
   - **WHERE NOTIFICATION TRIGGER SHOULD BE ADDED**

#### Data Sync Flow - Lines 114-188:

```
1. Lines 119-120: Get current timestamp
2. Lines 123-129: Query products filtered by userId
3. Lines 131-144: Fetch all products, filter by updatedAt in memory
4. Lines 148-162: Save updates to IndexedDB
   - Line 154: Products saved using saveProduct()
5. Lines 165-179: Handle sync completion
   - If updates found: Reset interval to minimum
   - If no updates: Increase interval by 10 minutes
6. Line 182: Update lastPullTime
```

**⚠️ SYNC COMPLETION POINT:** Lines 165-179
- After all products are saved to IndexedDB
- After interval adjustment
- Before function returns

---

## 2. CURRENT FIRESTORE SECURITY RULES

### Products Collection Rules (Lines 254-284)

```firestore
match /products/{productId} {
  allow read: if isEmailVerified() && resource.data.userId == request.auth.uid;
  allow create: if isEmailVerified() && 
                   request.resource.data.userId == request.auth.uid &&
                   request.resource.data.version != null &&
                   request.resource.data.updatedAt != null;
  allow update: if isEmailVerified() && 
                   resource.data.userId == request.auth.uid && 
                   request.resource.data.userId == request.auth.uid &&
                   request.resource.data.version != null &&
                   request.resource.data.updatedAt != null;
  allow delete: if isEmailVerified() && resource.data.userId == request.auth.uid;
}
```

**Current Permissions:**
- ✅ **READ:** Only user's own products (`userId == request.auth.uid`)
- ✅ **CREATE:** Only user's own products
- ✅ **UPDATE:** Only user's own products
- ✅ **DELETE:** Only user's own products
- ✅ **Requirements:** version, updatedAt fields, emailVerified user

### Users Collection Rules (Lines 139-179)

```firestore
// User reading own profile
match /users/{uid} {
  allow read: if isSignedIn() && request.auth.uid == uid;
  allow create: if isSignedIn() && request.auth.uid == uid;
  allow update: if isSignedIn() && request.auth.uid == uid && 
                !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role','subscription']);
  allow delete: if false;
}

// Admin user management
match /users/{uid} {
  allow read: if isAdmin();
  allow create: if isAdmin();
  allow update: if isAdmin();
  allow delete: if isAdmin() && resource.data.role != 'admin';
}
```

**Current Permissions:**
- ✅ **Regular Users:** Can only read their own profile
- ✅ **Admins:** Can read all user profiles, create, update any user
- ✅ **Admin Protection:** Cannot delete other admin accounts

### Notifications Collection Rules (Lines 354-371)

```firestore
match /notifications/{notificationId} {
  allow read: if isSignedIn() && resource.data.userId == request.auth.uid;
  allow create: if isAdmin() || (isSignedIn() && request.resource.data.userId == request.auth.uid);
  allow update: if isSignedIn() && resource.data.userId == request.auth.uid;
  allow delete: if isAdmin() || (isSignedIn() && resource.data.userId == request.auth.uid);
}
```

**Current Permissions:**
- ✅ **READ:** Users can read notifications sent to them
- ✅ **CREATE:** Admins can create for any user, users can create for themselves
- ✅ **UPDATE:** Users and admins can update their own notifications

---

## 3. CURRENT PERMISSIONS ANALYSIS

### What's Currently Allowed:
1. ✅ Users can read their own products
2. ✅ Users can read their own profile
3. ✅ Admins can read all users
4. ✅ Admins can create notifications for any user
5. ✅ Admins can read all admin data

### What's NOT Currently Allowed:
1. ❌ Regular users reading ALL products (other users')
2. ❌ Regular users reading ALL users (needed for admin notification creation)
3. ❌ Backend functions reading across users' data
4. ❌ System-level queries for low stock detection across all users

---

## 4. REQUIREMENTS FOR LOW STOCK NOTIFICATION INTEGRATION

### What Needs to be Accessible:

The `sendLowStockNotifications()` function needs to:

1. **Read ALL products** (Lines 237-244 of low-stock-notifications.ts)
   ```typescript
   const lowStockQuery = query(
     productsRef,
     where('stock', '<', threshold)
   );
   const snapshot = await getDocs(lowStockQuery);
   ```
   - Currently: ❌ Users can't read other users' products
   - Needed: Read all products regardless of userId (system operation)

2. **Read ALL users** (Line 250 of low-stock-notifications.ts)
   ```typescript
   const usersRef = collection(firestore, 'users');
   const usersSnapshot = await getDocs(usersRef);
   const userIds = usersSnapshot.docs.map((doc) => doc.id);
   ```
   - Currently: ❌ Regular users can't read other users' profiles
   - Needed: Read all userIds to create notifications for each user

3. **Create notifications for each user** (Lines 253-262)
   ```typescript
   for (const userId of userIds) {
     const notificationId = await createGroupedLowStockNotification(firestore, userId, lowStockProducts);
   }
   ```
   - Currently: ✅ Function runs as admin (can create for any user)
   - Status: Already supported

---

## 5. CURRENT IMPLEMENTATION PATTERN

### Who Calls Low Stock Notifications?

**File:** `src/components/dashboard/dashboard-stats.tsx` (Lines 39-41)

```typescript
sendLowStockNotifications(firestore, 10).catch(error => 
  console.warn('Failed to send low stock notifications:', error)
);
```

**Execution Context:**
- Runs in client component
- Runs with authenticated user's Firebase credentials
- User may not be an admin
- User's read permissions are restricted to their own data

**Problem:** Regular users cannot read all products and all users needed for the low stock system operation.

---

## 6. SUGGESTED SYSTEM-LEVEL ACCESS PATTERN

### Option 1: Admin-Only Operation (RECOMMENDED)
- Move `sendLowStockNotifications()` to a Firestore scheduled function
- Function runs with admin privileges
- Can read all products and all users
- Creates notifications without client permission issues

### Option 2: Service Account Pattern
- Use backend function with service account authentication
- Service account bypasses Firestore rules
- Can be called from client
- More secure than Option 1

### Option 3: Update Firestore Rules (NOT RECOMMENDED)
- Grant "read all products" to verified users
- Grant "read users list" to verified users
- Exposes all users' data to all clients
- Security risk for multi-tenant system

### Option 4: Query Per-User Pattern (WORKAROUND)
- Client reads only their own products
- Pull service detects low stock for own products
- Triggers notification creation for own products
- Less comprehensive (doesn't alert users about others' low stock)

---

## 7. INTEGRATION RECOMMENDATIONS

### Where to Add Notification Trigger:

**File:** `src/lib/pull-service.ts`
**Function:** `pullFirebaseChanges()`
**Location:** Lines 165-179 (after syncing completes, before interval adjustment)

```typescript
// After: Save updates to IndexedDB (lines 148-162)
if (updates.length > 0) {
  for (const product of updates) {
    try {
      await saveProduct(product, userId);
    } catch (err) {
      console.warn('[Pull] Failed to save product to IndexedDB:', product.id, err);
    }
  }

  // 🔴 ADD HERE: Check for low stock products and create notifications
  // Option A: For current user's products only
  // Option B: Call a backend function that does system-level check
  
  // Reset to minimum interval since we found changes
  pullState.intervalMs = pullState.minInterval;
  pullState.noChangeCount = 0;
  console.log('[Pull] Changes detected, reset interval to', pullState.minInterval);
}
```

---

## 8. FIRESTORE RULES NEEDED

### Minimal Addition (For Backend Function Approach):

Add to firestore.rules for server-side operations:

```firestore
// Allow server (Cloud Functions) to read all products for system operations
match /products/{productId} {
  // ... existing user rules ...
  
  // System-level read for low stock detection (Cloud Functions only)
  allow read: if isSignedIn() && resource.data.userId == request.auth.uid || 
              isSystemFunction();
}

// Allow server to read all users for notification system
match /users/{uid} {
  // ... existing user rules ...
  
  // System-level read for notification creation (Cloud Functions only)
  allow read: if isSignedIn() && request.auth.uid == uid || 
              isSystemFunction();
}

// Helper function
function isSystemFunction() {
  // Identify requests from Cloud Functions/backend
  return get(/databases/$(database)/documents/systemConfig/metadata).data.isSystemOperation == true;
}
```

---

## 9. SUMMARY TABLE

| Aspect | Current Status | Required for Low Stock | Issue |
|--------|----------------|------------------------|-------|
| Read own products | ✅ Allowed | ✅ Yes | Works for pull service |
| Read ALL products | ❌ Denied | ✅ Yes | BLOCKS low stock detection |
| Read own profile | ✅ Allowed | ✅ No | Not needed |
| Read ALL users | ❌ Denied | ✅ Yes | BLOCKS notification creation |
| Create notifications | ✅ Allowed (admin) | ✅ Yes | Works if user is admin |
| Products updatedAt | ✅ Present | ✅ Yes | Supports conflict resolution |
| Products version | ✅ Present | ✅ Yes | Supports conflict resolution |

---

## 10. NEXT STEPS

1. **Decide on implementation approach:**
   - Use Cloud Function (recommended)
   - Use backend service account
   - Update Firestore rules (not recommended)

2. **If using Cloud Function:**
   - Create scheduled Cloud Function
   - Deploy to Firebase project
   - Ensure it has admin access

3. **If updating rules:**
   - Add system function detection
   - Test thoroughly to ensure no security holes

4. **Update pull service:**
   - Add notification trigger at sync completion
   - Handle success/failure appropriately

5. **Test integration:**
   - Verify low stock notifications are created
   - Verify multi-user scenarios work
   - Test with various notification cooldown periods

---

## References

- **Pull Service:** `src/lib/pull-service.ts` (Lines 114-188)
- **Low Stock Logic:** `src/lib/low-stock-notifications.ts` (Lines 217-277)
- **Current Caller:** `src/components/dashboard/dashboard-stats.tsx` (Lines 39-41)
- **Firestore Rules:** `firestore.rules` (Complete)
- **Notifications Collection:** Lines 354-371 in firestore.rules
