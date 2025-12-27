'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface ProgressModalProps {
  isOpen: boolean;
  progress: number; // 0-100
  title: string;
  message: string;
  onCancel?: () => void;
  isCancelable?: boolean;
  isIndeterminate?: boolean; // Show animated bar without specific percentage
}

export function ProgressModal({
  isOpen,
  progress,
  title,
  message,
  onCancel,
  isCancelable = false,
  isIndeterminate = false,
}: ProgressModalProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{title}</span>
            {isCancelable && onCancel && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onCancel}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{message}</p>
          
          <div className="space-y-2">
            <Progress 
              value={isIndeterminate ? 50 : progress} 
              className={isIndeterminate ? 'animate-pulse' : ''}
            />
            {!isIndeterminate && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Processing...</span>
                <span className="text-sm font-semibold text-foreground">{Math.round(progress)}%</span>
              </div>
            )}
            {isIndeterminate && (
              <div className="text-center">
                <span className="text-xs text-muted-foreground">Processing...</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
