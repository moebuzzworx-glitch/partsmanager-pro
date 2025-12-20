/**
 * Helper script for creating admin users in Firestore manually via Firebase Console
 * 
 * This script is for reference on how to create admin users.
 * Follow these steps in Firebase Console:
 * 
 * 1. Go to Firebase Console > Your Project > Authentication
 * 2. Create a user via "Add user" button with:
 *    - Email: your-admin@example.com
 *    - Password: (set a secure password)
 * 3. Copy the User UID from the user list
 * 4. Go to Firestore Database
 * 5. Create a new document in the "users" collection with the User UID as the document ID
 * 6. Add these fields:
 */

export const adminUserTemplate = {
  uid: "USER_UID_HERE", // Copy from Firebase Auth user list
  email: "admin@example.com",
  role: "admin",
  subscription: "premium",
  emailVerified: true,
  authMethod: "email",
  createdAt: new Date("2025-12-16"), // Current date
  // Note: trialStartDate is NOT needed for admins - only for trial users
};

/**
 * Steps to create an admin user:
 * 
 * 1. Authentication Setup:
 *    - Go to Firebase Console > Authentication
 *    - Click "Add user"
 *    - Enter admin email and set a strong password
 *    - Note the generated User UID
 * 
 * 2. Firestore Setup:
 *    - Go to Firestore Database
 *    - Click "Start collection" (if users doesn't exist)
 *    - Collection ID: "users"
 *    - Document ID: [paste the User UID from step 1]
 *    - Add these 6 fields ONLY:
 *      - email (string): admin@example.com
 *      - role (string): "admin"
 *      - subscription (string): "premium"
 *      - emailVerified (boolean): true
 *      - authMethod (string): "email"
 *      - createdAt (timestamp): now
 * 
 * 3. Test:
 *    - Try logging in with admin email/password at: /en/admin/login
 *    - You should have access to the admin dashboard
 * 
 * Example Firebase CLI command (requires firebase-tools):
 * firebase firestore:set /users/{UID} --data='{
 *   "email": "admin@example.com",
 *   "role": "admin",
 *   "subscription": "premium",
 *   "emailVerified": true,
 *   "authMethod": "email",
 *   "createdAt": new Date()
 * }'
 */
