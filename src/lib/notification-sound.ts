/**
 * Notification Sound Management
 * Handles playing notification sounds across the application
 */

interface NotificationSoundConfig {
  enabled: boolean;
  volume: number; // 0-1
  soundUrl: string;
}

let soundConfig: NotificationSoundConfig = {
  enabled: true,
  volume: 0.5,
  soundUrl: '/notification-sound.mp3', // Default notification sound
};

/**
 * Initialize notification sound configuration from localStorage
 */
export function initNotificationSound(): void {
  if (typeof window === 'undefined') return;
  
  try {
    const saved = localStorage.getItem('notificationSoundConfig');
    if (saved) {
      const parsed = JSON.parse(saved);
      soundConfig = { ...soundConfig, ...parsed };
    }
  } catch (error) {
    console.warn('Failed to load notification sound config:', error);
  }
}

/**
 * Play notification sound
 * @param type - Type of notification (default, success, warning, error)
 */
export async function playNotificationSound(type: 'default' | 'success' | 'warning' | 'error' = 'default'): Promise<void> {
  if (typeof window === 'undefined') return;
  
  // Don't play if disabled
  if (!soundConfig.enabled) {
    return;
  }

  try {
    // Map notification types to sound URLs if needed
    // For now, we'll use the default sound for all types
    const soundUrl = soundConfig.soundUrl;

    const audio = new Audio(soundUrl);
    audio.volume = soundConfig.volume;
    
    // Play the sound
    const playPromise = audio.play();
    
    // Handle potential autoplay restrictions
    if (playPromise !== undefined) {
      await playPromise.catch((error) => {
        // Autoplay might be blocked by browser
        console.debug('Notification sound blocked (autoplay policy):', error);
      });
    }
  } catch (error) {
    console.warn('Failed to play notification sound:', error);
  }
}

/**
 * Enable notification sounds
 */
export function enableNotificationSound(): void {
  soundConfig.enabled = true;
  saveConfig();
}

/**
 * Disable notification sounds
 */
export function disableNotificationSound(): void {
  soundConfig.enabled = false;
  saveConfig();
}

/**
 * Set notification sound volume (0-1)
 */
export function setNotificationSoundVolume(volume: number): void {
  soundConfig.volume = Math.max(0, Math.min(1, volume));
  saveConfig();
}

/**
 * Get current notification sound configuration
 */
export function getNotificationSoundConfig(): Readonly<NotificationSoundConfig> {
  return { ...soundConfig };
}

/**
 * Save configuration to localStorage
 */
function saveConfig(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('notificationSoundConfig', JSON.stringify(soundConfig));
  } catch (error) {
    console.warn('Failed to save notification sound config:', error);
  }
}

/**
 * Test notification sound (play at current settings)
 */
export async function testNotificationSound(): Promise<void> {
  await playNotificationSound('default');
}
