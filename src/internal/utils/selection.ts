import { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import {
  getClosestValidDeepIndex,
  resolveIndexLocation,
  getOffsetDeepIndex,
  getUpwardDeepIndex,
  getDownwardDeepIndex,
} from './indexing';
import {
  getElementKey,
  isElementRow,
  getElementManualCoordinates,
} from './attributes';
import { DeepOrderingNode, DeepIndex } from './types';
import { isHtmlElement } from './guards';
import { PARENT_CONTAINER_ATTRIBUTE, INITIAL_INDEX } from '../constants';

type ElementMap = {
  [key: string]: {
    element: HTMLElement;
    index: DeepIndex;
  };
};

type OrderingDiscoveryContext = {
  crossContainerBoundaries?: boolean;
  parentIndex: DeepIndex;
  crossAxisRowPosition: number;
};
/**
 * Mutates a master DeepOrderingNode tree and ElementMap. Traverses
 * the DOM tree and fills in the parallel DeepOrdering tree, and
 * documents the key lookup for each item element.
 */
export const discoverOrderingStructure = (
  parent: DeepOrderingNode,
  elementMap: ElementMap,
  root: Node,
  {
    crossContainerBoundaries,
    parentIndex,
    crossAxisRowPosition,
  }: OrderingDiscoveryContext = {
    parentIndex: [],
    crossAxisRowPosition: 0,
  }
): void => {
  // parent ordering node represents the root node.
  // assume root node has already been processed.

  let currentCrossAxisRowPosition = crossAxisRowPosition;

  root.childNodes.forEach(node => {
    // bail if text node or other non-html node
    if (!isHtmlElement(node)) {
      return;
    }

    // bail if reaching a child container (indicated by attr)
    // and cross container boundaries is false
    if (
      !crossContainerBoundaries &&
      node.hasAttribute(PARENT_CONTAINER_ATTRIBUTE)
    ) {
      return;
    }

    // check if child is a selectable item
    const key = getElementKey(node);

    if (key) {
      // the user may specify manual coordinates for an element. this allows them
      // to place the element anywhere within the 2d grid of children of the parent
      // node context. the user can't today specify a "z" coordinate (i.e. break out
      // of the natural DOM inheritance structure and put a child element above or
      // beside its parent in ordering)
      const [
        manualXCoordinate,
        manualYCoordinate,
      ] = getElementManualCoordinates(node);

      // resolve the final coordinates
      const finalY = manualYCoordinate ?? currentCrossAxisRowPosition;
      if (!parent.children[finalY]) {
        parent.children[finalY] = [];
      }
      const naturalX = parent.children[finalY].length;
      const finalX = manualXCoordinate ?? naturalX;

      const childIndex: DeepIndex = [...parentIndex, [finalX, finalY]];

      elementMap[key] = {
        element: node,
        index: childIndex,
      };

      const newOrderingNode = {
        key,
        children: [],
      };

      discoverOrderingStructure(newOrderingNode, elementMap, node, {
        parentIndex: childIndex,
        crossAxisRowPosition: 0,
        crossContainerBoundaries,
      });
      parent.children[finalY][finalX] = newOrderingNode;
    } else {
      // if not, continue traversing downward...
      // kind of a 'skip level'
      discoverOrderingStructure(parent, elementMap, node, {
        parentIndex,
        crossAxisRowPosition: currentCrossAxisRowPosition,
        crossContainerBoundaries,
      });

      if (isElementRow(node)) {
        currentCrossAxisRowPosition = currentCrossAxisRowPosition + 1;
      }
    }
  });
};

export const useSelectableChildren = ({
  observeDeep,
  itemCount,
  wrap,
  crossContainerBoundaries,
  initialSelectedIndex = INITIAL_INDEX,
  onSelect,
}: {
  observeDeep?: boolean;
  itemCount?: number;
  wrap?: boolean;
  crossContainerBoundaries?: boolean;
  initialSelectedIndex?: DeepIndex;
  onSelect?: (
    element: HTMLElement | null,
    key: string,
    index: DeepIndex
  ) => void;
} = {}) => {
  const elementKeyMapRef = useRef<ElementMap>({});
  const [selectionDeepIndex, setSelectionDeepIndex] = useState<DeepIndex>(
    initialSelectedIndex
  );
  const [deepOrderingTree, setDeepOrderingTree] = useState<DeepOrderingNode>({
    key: null,
    children: [],
  });

  const rescan = useCallback(
    (container: HTMLElement) => {
      const newOrdering: DeepOrderingNode = {
        key: null,
        children: [],
      };
      const newElementMap: ElementMap = {};

      discoverOrderingStructure(newOrdering, newElementMap, container, {
        crossContainerBoundaries,
        parentIndex: [],
        crossAxisRowPosition: 0,
      });

      setDeepOrderingTree(newOrdering);
      elementKeyMapRef.current = newElementMap;

      console.debug(
        `Rescan selection update: old value is ${JSON.stringify(
          selectionDeepIndex
        )}`
      );
      const newSelectedDeepIndex = getClosestValidDeepIndex(
        selectionDeepIndex,
        newOrdering
      );

      console.debug(`
      Rescan complete.

      New Ordering:
        ${JSON.stringify(newOrdering)}

      New Selected Index:
        ${JSON.stringify(newSelectedDeepIndex)}
      `);

      setSelectionDeepIndex(newSelectedDeepIndex);
    },
    [selectionDeepIndex, setSelectionDeepIndex, setDeepOrderingTree]
  );

  // static reference to a mutation observer
  const childObserverRef = useRef<MutationObserver | null>(
    new MutationObserver(mutations => {
      rescan(mutations[0].target as HTMLElement);
    })
  );

  const internalContainerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    childObserverRef.current = new MutationObserver(() => {
      if (internalContainerRef.current) {
        rescan(internalContainerRef.current);
      }
    });
    if (internalContainerRef.current) {
      childObserverRef.current.observe(internalContainerRef.current, {
        childList: true,
        subtree: observeDeep,
      });
    }
    return () => {
      childObserverRef.current && childObserverRef.current.disconnect();
    };
  }, [rescan, internalContainerRef, observeDeep]);

  const handleContainerElement = useCallback(
    (el: HTMLElement | null) => {
      internalContainerRef.current = el;
      const { current: childObserver } = childObserverRef;
      if (el === null) {
        // clear any previous observation
        childObserver && childObserver.disconnect();
      } else {
        rescan(el); // do an initial scan
        childObserver &&
          childObserver.observe(el, {
            childList: true,
            subtree: observeDeep,
          });
      }
    },
    [childObserverRef, observeDeep, internalContainerRef]
  );

  const findElementIndex = useCallback(
    (searchKey: string) => {
      return elementKeyMapRef.current[searchKey]?.index ?? null;
    },
    [elementKeyMapRef]
  );

  const getKeyFromIndex = useCallback(
    (index: DeepIndex) => {
      const orderingNode = resolveIndexLocation(deepOrderingTree, index);
      if (!orderingNode || !orderingNode.key) return null;
      return orderingNode.key;
    },
    [deepOrderingTree]
  );

  const getElement = useCallback(
    (index: DeepIndex) => {
      const key = getKeyFromIndex(index);
      if (!key) return null;
      const lookup = elementKeyMapRef.current[key];
      return lookup.element || null;
    },
    [getKeyFromIndex, elementKeyMapRef]
  );

  const setSelection = useCallback(
    (indexOrUpdater: DeepIndex | ((current: DeepIndex) => DeepIndex)) => {
      if (indexOrUpdater === null) debugger;
      // FIXME: evaluate if a setter fn with side-effects is a terrible idea
      setSelectionDeepIndex(current => {
        const index =
          typeof indexOrUpdater === 'function'
            ? indexOrUpdater(current)
            : indexOrUpdater;
        if (index.length === 0) {
          return index;
        }
        const orderingNode = resolveIndexLocation(deepOrderingTree, index);
        if (!orderingNode?.key) {
          console.warn(
            `Set selection to index ${JSON.stringify(
              index
            )}, but no item was discovered at that position`
          );
          return index;
        }
        const lookup = elementKeyMapRef.current[orderingNode.key];
        onSelect && onSelect(lookup.element, orderingNode.key, index);

        return index;
      });
    },
    [deepOrderingTree, elementKeyMapRef, onSelect]
  );

  const finalItemCount =
    itemCount !== undefined
      ? itemCount
      : Object.keys(elementKeyMapRef.current || {}).length;

  const goToNext = useCallback(() => {
    setSelection(current =>
      getOffsetDeepIndex(current, deepOrderingTree, [1, 0], wrap)
    );
  }, [setSelection, deepOrderingTree, wrap]);

  const goToPrevious = useCallback(() => {
    setSelection(current =>
      getOffsetDeepIndex(current, deepOrderingTree, [-1, 0], wrap)
    );
  }, [setSelection, deepOrderingTree, wrap]);

  const goToNextOrthogonal = useCallback(() => {
    setSelection(current =>
      getOffsetDeepIndex(current, deepOrderingTree, [0, 1], wrap)
    );
  }, [setSelection, deepOrderingTree, wrap]);

  const goToPreviousOrthogonal = useCallback(() => {
    setSelection(current =>
      getOffsetDeepIndex(current, deepOrderingTree, [0, -1], wrap)
    );
  }, [setSelection, deepOrderingTree, wrap]);

  const goUp = useCallback(() => {
    setSelection(current => getUpwardDeepIndex(current));
  }, [setSelection]);

  const goDown = useCallback(() => {
    setSelection(current => getDownwardDeepIndex(current, deepOrderingTree));
  }, [setSelection, deepOrderingTree]);

  // lookup the selected item key based on the index
  const selectedKey = useMemo(() => getKeyFromIndex(selectionDeepIndex), [
    getKeyFromIndex,
    selectionDeepIndex,
  ]);

  return {
    handleContainerElement,
    selectionDeepIndex,
    findElementIndex,
    getElement,
    itemCount: finalItemCount,
    goToNext,
    goToPrevious,
    goToNextOrthogonal,
    goToPreviousOrthogonal,
    goUp,
    goDown,
    setSelectionDeepIndex: setSelection,
    selectedKey,
  };
};
