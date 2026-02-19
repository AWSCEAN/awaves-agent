import { useRef, useCallback } from 'react';

/**
 * Detects a downward swipe gesture and calls onClose when the drag
 * distance exceeds the threshold (default 80px).
 */
export function useSwipeDown(onClose: () => void, threshold = 80) {
  const startY = useRef<number | null>(null);
  const isDragging = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging.current || startY.current === null) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > threshold) {
        isDragging.current = false;
        startY.current = null;
        onClose();
      }
    },
    [onClose, threshold]
  );

  const onTouchEnd = useCallback(() => {
    isDragging.current = false;
    startY.current = null;
  }, []);

  return { onTouchStart, onTouchMove, onTouchEnd };
}
