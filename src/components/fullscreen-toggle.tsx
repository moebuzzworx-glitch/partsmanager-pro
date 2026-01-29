'use client';

import * as React from 'react';
import { Maximize, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

export function FullScreenToggle() {
    const [isFullscreen, setIsFullscreen] = React.useState(false);

    React.useEffect(() => {
        function onFullscreenChange() {
            setIsFullscreen(!!document.fullscreenElement);
        }

        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((e) => {
                console.error(`Error attempting to enable fullscreen mode: ${e.message} (${e.name})`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleFullscreen}
                        className="hidden md:inline-flex"
                        aria-label="Toggle Fullscreen"
                    >
                        {isFullscreen ? (
                            <Minimize className="h-[1.2rem] w-[1.2rem]" />
                        ) : (
                            <Maximize className="h-[1.2rem] w-[1.2rem]" />
                        )}
                        <span className="sr-only">Toggle Fullscreen</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
