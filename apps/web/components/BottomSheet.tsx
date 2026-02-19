'use client';

import { useRef, useCallback } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';

interface BottomSheetProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  side: 'left' | 'right';
  desktopWidth: string; // e.g. 'w-96' or 'w-[420px]'
  mobileMaxHeight?: string; // e.g. 'max-h-[60vh]'
  showLocationPrompt?: boolean;
  desktopAnimation?: string; // e.g. 'animate-slide-in-right'
}

export default function BottomSheet({
  children,
  isOpen,
  onClose,
  side,
  desktopWidth,
  mobileMaxHeight = 'max-h-[60vh]',
  showLocationPrompt = false,
  desktopAnimation = '',
}: BottomSheetProps) {
  const isMobile = useIsMobile();
  const startY = useRef<number | null>(null);
  const currentY = useRef<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startY.current === null) return;
    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;
    if (diff > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${diff}px)`;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (startY.current !== null && currentY.current !== null) {
      const diff = currentY.current - startY.current;
      if (diff > 100) {
        onClose();
      }
    }
    if (sheetRef.current) {
      sheetRef.current.style.transform = '';
    }
    startY.current = null;
    currentY.current = null;
  }, [onClose]);

  if (!isOpen) return null;

  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/20 z-30"
          onClick={onClose}
        />
        {/* Bottom sheet */}
        <div
          ref={sheetRef}
          className={`fixed bottom-0 left-0 right-0 ${mobileMaxHeight} bg-white shadow-xl z-40 flex flex-col rounded-t-2xl animate-slide-up pb-safe`}
        >
          {/* Drag handle — swipe-to-dismiss target only */}
          <div
            className="flex justify-center pt-3 pb-1 flex-shrink-0 cursor-grab active:cursor-grabbing"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="w-10 h-1 bg-sand-300 rounded-full" />
          </div>
          {/* Scrollable content — pb-16 ensures content clears the fixed MobileTabBar (h-14) */}
          <div className="overflow-y-auto flex-1 pb-16">
            {children}
          </div>
        </div>
      </>
    );
  }

  // Desktop: original side panel
  const topOffset = showLocationPrompt ? 'top-[100px]' : 'top-14';
  const sideClass = side === 'left' ? 'left-0' : 'right-0';
  const animation = desktopAnimation || (side === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left');

  return (
    <div
      className={`fixed ${sideClass} bottom-0 ${desktopWidth} bg-white shadow-xl z-40 flex flex-col ${animation} transition-all duration-300 ${topOffset}`}
    >
      {children}
    </div>
  );
}
