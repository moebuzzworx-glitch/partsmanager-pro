/**
 * User Management Utilities
 * 
 * Functions for admins to manage users (create, read, update, delete)
 * Only accessible by admins through Firestore security rules
 */

import { 
  Firestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query,
  Query,
  QueryConstraint,
  where,
  orderBy,
  Timestamp 
} from 'firebase/firestore';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  subscription: 'trial' | 'premium';
  role: 'user' | 'admin';
  emailVerified: boolean;
  status?: 'active' | 'suspended';
  createdAt?: Timestamp;
  lastLoginAt?: Timestamp;
  trialStartDate?: Timestamp;
  premiumExpiryDate?: Timestamp;
}

/**
 * Fetch all users from Firestore
 * @param firestore - Firestore instance
 * @returns Array of all users
 */
export async function fetchAllUsers(firestore: Firestore): Promise<UserProfile[]> {
  try {
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    const users: UserProfile[] = [];
    snapshot.forEach((doc) => {
      users.push({
        id: doc.id,
        ...doc.data(),
      } as UserProfile);
    });

    return users;
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

/**
 * Fetch a specific user by ID
 * @param firestore - Firestore instance
 * @param userId - User ID to fetch
 * @returns User profile or null if not found
 */
export async function fetchUserById(
  firestore: Firestore,
  userId: string
): Promise<UserProfile | null> {
  try {
    const userRef = doc(firestore, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return null;
    }

    return {
      id: userSnap.id,
      ...userSnap.data(),
    } as UserProfile;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

/**
 * Update user information
 * @param firestore - Firestore instance
 * @param userId - User ID to update
 * @param data - User data to update
 * @returns true if successful, false otherwise
 */
export async function updateUser(
  firestore: Firestore,
  userId: string,
  data: Partial<UserProfile>
): Promise<boolean> {
  try {
    const userRef = doc(firestore, 'users', userId);
    const updateData = { ...data };
    
    // Remove id field if present
    delete updateData.id;
    
    await updateDoc(userRef, updateData);
    return true;
  } catch (error) {
    console.error('Error updating user:', error);
    return false;
  }
}

/**
 * Create a new user account
 * @param firestore - Firestore instance
 * @param userId - UID from Firebase Auth
 * @param userData - User profile data
 * @returns true if successful, false otherwise
 */
export async function createUser(
  firestore: Firestore,
  userId: string,
  userData: {
    email: string;
    name: string;
    subscription: 'trial' | 'premium';
    role?: 'user' | 'admin';
    emailVerified?: boolean;
    status?: 'active' | 'suspended';
  }
): Promise<boolean> {
  try {
    const userRef = doc(firestore, 'users', userId);
    const now = Timestamp.now();
    
    // Calculate trial or premium expiry dates
    let trialStartDate = undefined;
    let premiumExpiryDate = undefined;

    if (userData.subscription === 'trial') {
      trialStartDate = now;
    } else if (userData.subscription === 'premium') {
      // Premium expires 365 days from now
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 365);
      premiumExpiryDate = Timestamp.fromDate(expiryDate);
    }

    const newUser: any = {
      email: userData.email,
      name: userData.name,
      subscription: userData.subscription,
      role: userData.role || 'user',
      emailVerified: userData.emailVerified ?? true, // Auto-verify admin-created users
      status: userData.status || 'active',
      createdAt: now,
      lastLoginAt: now,
      ...(trialStartDate && { trialStartDate }),
      ...(premiumExpiryDate && { premiumExpiryDate }),
    };

    await setDoc(userRef, newUser);
    return true;
  } catch (error) {
    console.error('Error creating user:', error);
    return false;
  }
}

/**
 * Delete a user account
 * Admins cannot delete other admin accounts (prevented by Firestore rules)
 * @param firestore - Firestore instance
 * @param userId - User ID to delete
 * @returns true if successful, false otherwise
 */
export async function deleteUser(
  firestore: Firestore,
  userId: string
): Promise<boolean> {
  try {
    const userRef = doc(firestore, 'users', userId);
    await deleteDoc(userRef);
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    return false;
  }
}

/**
 * Change user subscription tier
 * @param firestore - Firestore instance
 * @param userId - User ID
 * @param subscription - New subscription tier (trial/premium)
 * @returns true if successful, false otherwise
 */
export async function changeUserSubscription(
  firestore: Firestore,
  userId: string,
  subscription: 'trial' | 'premium'
): Promise<boolean> {
  try {
    const userRef = doc(firestore, 'users', userId);
    const now = Timestamp.now();
    
    const updateData: any = {
      subscription,
    };

    // Update expiry dates based on subscription type
    if (subscription === 'trial') {
      updateData.trialStartDate = now;
      updateData.premiumExpiryDate = null;
    } else if (subscription === 'premium') {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 365);
      updateData.premiumExpiryDate = Timestamp.fromDate(expiryDate);
      updateData.trialStartDate = null;
    }

    await updateDoc(userRef, updateData);
    return true;
  } catch (error) {
    console.error('Error changing user subscription:', error);
    return false;
  }
}

/**
 * Change user role
 * @param firestore - Firestore instance
 * @param userId - User ID
 * @param role - New role (user/admin)
 * @returns true if successful, false otherwise
 */
export async function changeUserRole(
  firestore: Firestore,
  userId: string,
  role: 'user' | 'admin'
): Promise<boolean> {
  try {
    const userRef = doc(firestore, 'users', userId);
    await updateDoc(userRef, { role });
    return true;
  } catch (error) {
    console.error('Error changing user role:', error);
    return false;
  }
}

/**
 * Suspend or activate a user account
 * @param firestore - Firestore instance
 * @param userId - User ID
 * @param status - New status (active/suspended)
 * @returns true if successful, false otherwise
 */
export async function changeUserStatus(
  firestore: Firestore,
  userId: string,
  status: 'active' | 'suspended'
): Promise<boolean> {
  try {
    const userRef = doc(firestore, 'users', userId);
    await updateDoc(userRef, { status });
    return true;
  } catch (error) {
    console.error('Error changing user status:', error);
    return false;
  }
}

/**
 * Get user statistics for admin dashboard
 * @param firestore - Firestore instance
 * @returns Statistics object
 */
export async function getUserStatistics(firestore: Firestore): Promise<{
  totalUsers: number;
  premiumUsers: number;
  trialUsers: number;
  adminUsers: number;
  suspendedUsers: number;
}> {
  try {
    const users = await fetchAllUsers(firestore);
    
    return {
      totalUsers: users.length,
      premiumUsers: users.filter(u => u.subscription === 'premium').length,
      trialUsers: users.filter(u => u.subscription === 'trial').length,
      adminUsers: users.filter(u => u.role === 'admin').length,
      suspendedUsers: users.filter(u => u.status === 'suspended').length,
    };
  } catch (error) {
    console.error('Error getting user statistics:', error);
    return {
      totalUsers: 0,
      premiumUsers: 0,
      trialUsers: 0,
      adminUsers: 0,
      suspendedUsers: 0,
    };
  }
}
