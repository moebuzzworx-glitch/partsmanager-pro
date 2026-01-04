'use client';

import { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  enableNotificationSound,
  disableNotificationSound,
  setNotificationSoundVolume,
  getNotificationSoundConfig,
  testNotificationSound,
} from '@/lib/notification-sound';

interface NotificationSoundSettingsProps {
  dictionary?: any;
}

export function NotificationSoundSettings({ dictionary }: NotificationSoundSettingsProps) {
  const [enabled, setEnabled] = useState(true);
  const [volume, setVolume] = useState(0.5);
  const [mounted, setMounted] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const config = getNotificationSoundConfig();
    setEnabled(config.enabled);
    setVolume(config.volume);
    setMounted(true);
  }, []);

  const handleToggle = () => {
    const newState = !enabled;
    setEnabled(newState);
    if (newState) {
      enableNotificationSound();
    } else {
      disableNotificationSound();
    }
  };

  const handleVolumeChange = (newVolume: number[]) => {
    const vol = newVolume[0];
    setVolume(vol);
    setNotificationSoundVolume(vol);
  };

  const handleTest = async () => {
    await testNotificationSound();
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggle}
          className="gap-2"
        >
          {enabled ? (
            <>
              <Volume2 className="h-4 w-4" />
              <span>{dictionary?.settings?.notificationSoundOn || 'Sound On'}</span>
            </>
          ) : (
            <>
              <VolumeX className="h-4 w-4" />
              <span>{dictionary?.settings?.notificationSoundOff || 'Sound Off'}</span>
            </>
          )}
        </Button>
      </div>

      {enabled && (
        <div className="flex items-center gap-2 flex-1 max-w-xs">
          <span className="text-xs text-muted-foreground">
            {dictionary?.settings?.volume || 'Volume'}
          </span>
          <Slider
            value={[volume]}
            onValueChange={handleVolumeChange}
            min={0}
            max={1}
            step={0.1}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-8">
            {Math.round(volume * 100)}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTest}
            className="text-xs"
          >
            {dictionary?.settings?.test || 'Test'}
          </Button>
        </div>
      )}
    </div>
  );
}
