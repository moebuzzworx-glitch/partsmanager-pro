import { Firestore, doc, getDoc, setDoc } from 'firebase/firestore';

export interface AppSettings {
  companyName: string;
  address: string;
  phone: string;
  rc: string;
  nif: string;
  art: string;
  nis: string;
  rib: string;
  profitMargin: number;
  lastInvoiceNumber: {
    year: number;
    number: number;
  };
}

const DEFAULT_SETTINGS: AppSettings = {
  companyName: 'Your Company',
  address: '',
  phone: '',
  rc: '',
  nif: '',
  art: '',
  nis: '',
  rib: '',
  profitMargin: 25,
  lastInvoiceNumber: {
    year: new Date().getFullYear(),
    number: 0,
  },
};

/**
 * Fetch user settings from Firestore
 * Falls back to defaults if not found
 */
export async function getUserSettings(
  firestore: Firestore,
  userId: string
): Promise<AppSettings> {
  try {
    const settingsRef = doc(firestore, 'settings', userId);
    const settingsSnap = await getDoc(settingsRef);

    if (settingsSnap.exists()) {
      return { ...DEFAULT_SETTINGS, ...settingsSnap.data() };
    }

    // Return defaults if settings don't exist
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error fetching settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save user settings to Firestore
 */
export async function saveUserSettings(
  firestore: Firestore,
  userId: string,
  settings: Partial<AppSettings>
): Promise<void> {
  try {
    const settingsRef = doc(firestore, 'settings', userId);
    await setDoc(settingsRef, settings, { merge: true });
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
}

/**
 * Get the next invoice number
 */
export function getNextInvoiceNumber(settings: AppSettings): string {
  const currentYear = new Date().getFullYear();
  let nextNumber = 1;

  if (settings.lastInvoiceNumber.year === currentYear) {
    nextNumber = settings.lastInvoiceNumber.number + 1;
  }

  const paddedNumber = nextNumber.toString().padStart(4, '0');
  return `FAC-${currentYear}-${paddedNumber}`;
}

/**
 * Update invoice number in settings after creating invoice
 */
export async function updateLastInvoiceNumber(
  firestore: Firestore,
  userId: string,
  settings: AppSettings
): Promise<void> {
  const currentYear = new Date().getFullYear();
  let newNumber = 1;

  if (settings.lastInvoiceNumber.year === currentYear) {
    newNumber = settings.lastInvoiceNumber.number + 1;
  }

  await saveUserSettings(firestore, userId, {
    lastInvoiceNumber: {
      year: currentYear,
      number: newNumber,
    },
  });
}
