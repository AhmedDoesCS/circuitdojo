import { useReducer, useCallback, useMemo } from 'react';
import { createDocument, deserializeDocument } from '../schematic/model.js';
import * as edit from '../schematic/edit.js';

/**
 * Editor state with undo/redo.
 *
 * History is a stack of whole-document snapshots. Schematics at this scale are
 * a few kilobytes of JSON, so snapshotting is far simpler, and far less
 * bug-prone, than maintaining inverse operations for every edit.
 */

const HISTORY_LIMIT = 80;

function initial(doc, clipboard = null) {
  return { doc: doc || createDocument(), past: [], future: [], selection: [], clipboard };
}

function commit(state, nextDoc, selection = state.selection) {
  if (nextDoc === state.doc) return state;
  return {
    ...state,
    doc: nextDoc,
    past: [...state.past, state.doc].slice(-HISTORY_LIMIT),
    future: [],
    selection,
  };
}

function reducer(state, action) {
  switch (action.type) {
    // The clipboard outlives the sheet: copying from one challenge and pasting
    // into the next is the whole point of having one.
    case 'load':
      return initial(deserializeDocument(action.doc), state.clipboard);

    case 'clear':
      return initial(createDocument(), state.clipboard);

    case 'place': {
      const { doc, component } = edit.placeComponent(
        state.doc,
        action.symbolId,
        action.unitId,
        action.x,
        action.y,
        { rot: action.rot || 0, mirror: !!action.mirror }
      );
      return commit(state, doc, [component.id]);
    }

    case 'add_wires':
      return commit(state, edit.addWires(state.doc, action.segments), []);

    case 'toggle_junction':
      return commit(state, edit.toggleJunction(state.doc, action.x, action.y));

    case 'add_label':
      return commit(state, edit.addLabel(state.doc, action.x, action.y, action.text));

    case 'toggle_noconnect':
      return commit(state, edit.toggleNoConnect(state.doc, action.x, action.y));

    case 'move':
      return commit(
        state,
        edit.moveItems(state.doc, action.ids, action.dx, action.dy, { dragWires: action.dragWires !== false })
      );

    case 'rotate':
      return commit(state, edit.rotateItems(state.doc, action.ids));

    case 'mirror':
      return commit(state, edit.mirrorItems(state.doc, action.ids, action.axis || 'x'));

    case 'duplicate': {
      const { doc, ids } = edit.duplicateItems(state.doc, action.ids);
      return commit(state, doc, ids);
    }

    case 'copy': {
      const clip = edit.copySelection(state.doc, action.ids);
      return clip ? { ...state, clipboard: clip } : state;
    }

    case 'cut': {
      const clip = edit.copySelection(state.doc, action.ids);
      if (!clip) return state;
      return { ...commit(state, edit.deleteItems(state.doc, action.ids), []), clipboard: clip };
    }

    case 'paste': {
      const clip = action.clip || state.clipboard;
      if (!clip) return state;
      const { doc, ids } = edit.pasteClipboard(state.doc, clip, action.x, action.y);
      if (!ids.length) return state;
      return { ...commit(state, doc, ids), clipboard: clip };
    }

    case 'delete':
      return commit(state, edit.deleteItems(state.doc, action.ids), []);

    case 'update':
      return commit(state, edit.updateItem(state.doc, action.id, action.patch));

    case 'rename_ref':
      return commit(state, edit.renameRef(state.doc, action.oldRef, action.newRef));

    case 'select':
      return { ...state, selection: action.ids };

    case 'select_all': {
      const { doc } = state;
      return {
        ...state,
        selection: [
          ...doc.components.map((c) => c.id),
          ...doc.wires.map((w) => w.id),
          ...doc.junctions.map((j) => j.id),
          ...doc.labels.map((l) => l.id),
          ...doc.noConnects.map((n) => n.id),
        ],
      };
    }

    case 'undo': {
      if (!state.past.length) return state;
      const previous = state.past[state.past.length - 1];
      return {
        ...state,
        doc: previous,
        past: state.past.slice(0, -1),
        future: [state.doc, ...state.future].slice(0, HISTORY_LIMIT),
        selection: [],
      };
    }

    case 'redo': {
      if (!state.future.length) return state;
      const [next, ...rest] = state.future;
      return {
        ...state,
        doc: next,
        past: [...state.past, state.doc].slice(-HISTORY_LIMIT),
        future: rest,
        selection: [],
      };
    }

    default:
      return state;
  }
}

export default function useSchematic(initialDoc) {
  const [state, dispatch] = useReducer(reducer, initialDoc, initial);

  const api = useMemo(
    () => ({
      place: (symbolId, unitId, x, y, opts = {}) =>
        dispatch({ type: 'place', symbolId, unitId, x, y, rot: opts.rot, mirror: opts.mirror }),
      addWires: (segments) => dispatch({ type: 'add_wires', segments }),
      toggleJunction: (x, y) => dispatch({ type: 'toggle_junction', x, y }),
      addLabel: (x, y, text) => dispatch({ type: 'add_label', x, y, text }),
      toggleNoConnect: (x, y) => dispatch({ type: 'toggle_noconnect', x, y }),
      move: (ids, dx, dy, opts = {}) =>
        dispatch({ type: 'move', ids, dx, dy, dragWires: opts.dragWires !== false }),
      rotate: (ids) => dispatch({ type: 'rotate', ids }),
      mirror: (ids, axis = 'x') => dispatch({ type: 'mirror', ids, axis }),
      duplicate: (ids) => dispatch({ type: 'duplicate', ids }),
      copy: (ids) => dispatch({ type: 'copy', ids }),
      cut: (ids) => dispatch({ type: 'cut', ids }),
      paste: (x, y, clip = null) => dispatch({ type: 'paste', x, y, clip }),
      selectAll: () => dispatch({ type: 'select_all' }),
      remove: (ids) => dispatch({ type: 'delete', ids }),
      update: (id, patch) => dispatch({ type: 'update', id, patch }),
      renameRef: (oldRef, newRef) => dispatch({ type: 'rename_ref', oldRef, newRef }),
      select: (ids) => dispatch({ type: 'select', ids }),
      undo: () => dispatch({ type: 'undo' }),
      redo: () => dispatch({ type: 'redo' }),
      load: (doc) => dispatch({ type: 'load', doc }),
      clear: () => dispatch({ type: 'clear' }),
    }),
    []
  );

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  return {
    doc: state.doc,
    selection: state.selection,
    clipboard: state.clipboard,
    canUndo,
    canRedo,
    ...api,
    selectedItems: useCallback(
      () => collectSelected(state.doc, state.selection),
      [state.doc, state.selection]
    ),
  };
}

function collectSelected(doc, ids) {
  const set = new Set(ids);
  return {
    components: doc.components.filter((c) => set.has(c.id)),
    wires: doc.wires.filter((w) => set.has(w.id)),
    labels: doc.labels.filter((l) => set.has(l.id)),
    junctions: doc.junctions.filter((j) => set.has(j.id)),
  };
}
