"use client";

import { useCallback, useRef, useState } from "react";

export interface ReorderDragProps {
  readonly draggable: boolean;
  readonly onDragStart: (e: React.DragEvent) => void;
  readonly onDragOver: (e: React.DragEvent) => void;
  readonly onDragLeave: (e: React.DragEvent) => void;
  readonly onDrop: (e: React.DragEvent) => void;
  readonly onDragEnd: () => void;
  readonly isDragging: boolean;
  readonly dropPlacement?: "above" | "below";
  readonly onMoveUp: () => void;
  readonly onMoveDown: () => void;
  readonly canMoveUp: boolean;
  readonly canMoveDown: boolean;
}

export function usePanelSectionOrder<T extends string>(
  storageKey: string,
  defaultOrder: readonly T[],
  disabled = false,
) {
  const [order, setOrder] = useState<readonly T[]>(() => {
    if (typeof window === "undefined") return defaultOrder;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as unknown;
        if (Array.isArray(parsed)) {
          // Filter only valid items that belong to defaultOrder
          const valid = parsed.filter((id): id is T => defaultOrder.includes(id as T));
          // Append any missing items from defaultOrder that might not have been in stored JSON
          const missing = defaultOrder.filter((id) => !valid.includes(id));
          if (valid.length > 0) {
            return [...valid, ...missing];
          }
        }
      }
    } catch {
      // Ignore JSON parse or storage reading error
    }
    return defaultOrder;
  });

  const [draggingId, setDraggingId] = useState<T | null>(null);
  const draggingIdRef = useRef<T | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: T; placement: "above" | "below" } | null>(null);

  const moveSection = useCallback(
    (sourceId: T, targetId: T, placement: "above" | "below") => {
      if (sourceId === targetId) return;
      setOrder((prev) => {
        const items = prev.filter((id) => id !== sourceId);
        const targetIndex = items.indexOf(targetId);
        if (targetIndex === -1) return prev;
        const insertIndex = placement === "above" ? targetIndex : targetIndex + 1;
        const next = [...items.slice(0, insertIndex), sourceId, ...items.slice(insertIndex)];
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // Ignore storage write error
        }
        return next;
      });
    },
    [storageKey],
  );

  const moveUp = useCallback(
    (id: T) => {
      setOrder((prev) => {
        const index = prev.indexOf(id);
        if (index <= 0) return prev;
        const next = [...prev];
        const prevItem = next[index - 1]!;
        next[index - 1] = id;
        next[index] = prevItem;
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // Ignore
        }
        return next;
      });
    },
    [storageKey],
  );

  const moveDown = useCallback(
    (id: T) => {
      setOrder((prev) => {
        const index = prev.indexOf(id);
        if (index === -1 || index >= prev.length - 1) return prev;
        const next = [...prev];
        const nextItem = next[index + 1]!;
        next[index + 1] = id;
        next[index] = nextItem;
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // Ignore
        }
        return next;
      });
    },
    [storageKey],
  );

  const resetOrder = useCallback(() => {
    setOrder(defaultOrder);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignore
    }
  }, [defaultOrder, storageKey]);

  const getDragProps = useCallback(
    (id: T): ReorderDragProps => {
      const index = order.indexOf(id);
      const isDragging = draggingId === id;
      const dropPlacement = dropTarget?.id === id ? dropTarget.placement : undefined;

      return {
        draggable: !disabled,
        onDragStart: (e: React.DragEvent) => {
          if (disabled) return;
          e.dataTransfer.setData("text/plain", id);
          e.dataTransfer.effectAllowed = "move";
          draggingIdRef.current = id;
          setDraggingId(id);
        },
        onDragOver: (e: React.DragEvent) => {
          const activeDragId = draggingIdRef.current ?? draggingId;
          if (disabled || !activeDragId || activeDragId === id) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          const rect = e.currentTarget.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          const placement: "above" | "below" = e.clientY < midY ? "above" : "below";
          if (dropTarget?.id !== id || dropTarget?.placement !== placement) {
            setDropTarget({ id, placement });
          }
        },
        onDragLeave: (e: React.DragEvent) => {
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          if (dropTarget?.id === id) {
            setDropTarget(null);
          }
        },
        onDrop: (e: React.DragEvent) => {
          e.preventDefault();
          const source =
            (e.dataTransfer.getData("text/plain") as T) || draggingIdRef.current || draggingId;
          if (source && dropTarget && source !== dropTarget.id) {
            moveSection(source, dropTarget.id, dropTarget.placement);
          }
          draggingIdRef.current = null;
          setDraggingId(null);
          setDropTarget(null);
        },
        onDragEnd: () => {
          draggingIdRef.current = null;
          setDraggingId(null);
          setDropTarget(null);
        },
        isDragging,
        dropPlacement,
        onMoveUp: () => moveUp(id),
        onMoveDown: () => moveDown(id),
        canMoveUp: index > 0,
        canMoveDown: index !== -1 && index < order.length - 1,
      };
    },
    [disabled, draggingId, dropTarget, moveDown, moveSection, moveUp, order],
  );

  return {
    order,
    draggingId,
    dropTarget,
    moveSection,
    moveUp,
    moveDown,
    resetOrder,
    getDragProps,
  };
}
