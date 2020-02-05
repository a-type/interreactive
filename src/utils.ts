import { useRef, Ref, useCallback, MutableRefObject } from 'react';
import { KeyCode } from './types';

export const generateId = (base?: string): string => {
  return `${base || 'generated'}-${Math.floor(Math.random() * 100000000)}`;
};

export const useRefOrProvided = <T extends any>(
  providedRef: Ref<T> | null | undefined
): Ref<T> => {
  const internalRef = useRef<T>(null);
  return providedRef || internalRef;
};

export const assignRef = <T>(ref: Ref<T>, el: T) => {
  if (typeof ref === 'function') {
    ref(el);
  } else {
    (ref as MutableRefObject<T>).current = el;
  }
};

export const useCombinedRefs = <T>(
  refA: Ref<T> | undefined,
  refB: Ref<T> | undefined
) => {
  const finalRef = useCallback(
    (el: T) => {
      refA && assignRef(refA, el);
      refB && assignRef(refB, el);
    },
    [refA, refB]
  );
  return finalRef;
};

export const useIdOrGenerated = (
  providedId?: string,
  idBase?: string
): string => {
  const generatedId = useRef<string>(generateId(idBase));
  if (providedId) {
    return providedId;
  } else {
    return generatedId.current;
  }
};

export const getNextIndex = (
  currentIndex: number,
  length: number,
  wrap?: boolean
) => {
  if (currentIndex + 1 < length) {
    return currentIndex + 1;
  }
  if (!wrap) {
    return length - 1;
  }
  return currentIndex + 1 - length;
};

export const getPreviousIndex = (
  currentIndex: number,
  length: number,
  wrap?: boolean
) => {
  if (currentIndex > 0) {
    return currentIndex - 1;
  }
  if (!wrap) {
    return 0;
  }
  return length + (currentIndex - 1);
};

export const getMovementKeys = (axis: 'horizontal' | 'vertical' | 'both') => {
  switch (axis) {
    case 'horizontal':
      return {
        next: [KeyCode.ArrowRight],
        previous: [KeyCode.ArrowLeft],
        nextSibling: [KeyCode.ArrowDown],
        previousSibling: [KeyCode.ArrowUp],
      };
    case 'vertical':
      return {
        next: [KeyCode.ArrowDown],
        previous: [KeyCode.ArrowUp],
        nextSibling: [KeyCode.ArrowRight],
        previousSibling: [KeyCode.ArrowLeft],
      };
    case 'both':
      return {
        next: [KeyCode.ArrowDown, KeyCode.ArrowRight],
        previous: [KeyCode.ArrowUp, KeyCode.ArrowLeft],
        nextSibling: [],
        previousSibling: [],
      };
  }
};

export const walkSubtree = (root: Node, visitor: (el: Node) => any) => {
  visitor(root);
  let child = root.firstChild;
  while (child) {
    walkSubtree(child, visitor);
    child = child.nextSibling;
  }
};
