import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SymbolView from './SymbolView.jsx';
import { GRID, snap, routeOrthogonal, key } from '../schematic/geometry.js';
import { pinAt, itemAt, itemsInRect, attachmentPoints, wireSnap } from '../schematic/edit.js';
import { extractNetlist, isPinConnected } from '../schematic/netlist.js';
import { documentBounds } from '../schematic/model.js';
import { getSymbol } from '../schematic/symbols/index.js';
import { resolveShortcut } from '../lib/shortcuts.js';

/**
 * The SVG schematic canvas.
 *
 * All hit-testing happens in world coordinates against the document rather
 * than through DOM event targets: it keeps behaviour identical for wires,
 * pins and bodies, and it is what makes grid snapping exact.
 */

const MIN_ZOOM = 0.35;
const MAX_ZOOM = 6;

export default function SchematicCanvas({
  schematic,
  tool,
  setTool,
  placing,
  setPlacing,
  highlights = [],
  onStatus,
  onAppAction,
}) {
  const { doc, selection } = schematic;
  const svgRef = useRef(null);
  const [view, setView] = useState({ x: 260, y: 140, zoom: 1.6 });
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [draft, setDraft] = useState(null); // { points: [{x,y}] }
  const [drag, setDrag] = useState(null);
  // Keyboard move: the selection follows the cursor until a click.
  // `dragWires` distinguishes KiCad's G (wires stretch) from M (wires stay).
  const [keyMove, setKeyMove] = useState(null);
  // The last part placed, so Insert can place another without a trip to the palette.
  const lastPlaced = useRef(null);
  const [ghost, setGhost] = useState({ rot: 0, mirror: false });
  const [labelPrompt, setLabelPrompt] = useState(null);
  const [labelText, setLabelText] = useState('');
  const cursorRef = useRef({ x: 0, y: 0 });
  const zoomToFitRef = useRef(null);

  // Live connectivity, so pins can be drawn as connected (green) or not (orange).
  const netlist = useMemo(() => extractNetlist(doc), [doc]);
  const connectedPins = useMemo(() => {
    const set = new Set();
    for (const p of netlist.pins) {
      if (isPinConnected(netlist, p)) set.add(`${p.componentId}:${p.num}`);
    }
    return set;
  }, [netlist]);

  /**
   * Net highlighting.
   *
   * Hovering anything conductive lights up everything electrically joined to
   * it. KiCad has this for navigation on a crowded board; here it is the
   * teaching tool, because the one thing a beginner cannot see is which things
   * the *checker* considers connected. "These two look joined but are two nets"
   * stops being an argument with the results panel and becomes something you
   * can point at.
   */
  const netOfPoint = useMemo(() => {
    const map = new Map();
    for (const net of netlist.nets) for (const k of net.points) map.set(k, net.id);
    return map;
  }, [netlist]);
  const [hoverNet, setHoverNet] = useState(null);
  const hoveredNet = hoverNet ? netlist.netById(hoverNet) : null;

  /**
   * Labels that are naming nothing.
   *
   * A net label a few units off the wire renders exactly like one sitting on
   * it: same dot, same text, same colour. It is the only item on the sheet
   * whose entire purpose can fail with no visible difference, and the learner
   * is then told "that net is not in your schematic" while looking straight at
   * it. Marked the way an unconnected pin is, because it is the same fault.
   */
  const danglingLabels = useMemo(() => {
    const set = new Set();
    for (const l of doc.labels) {
      const net = netlist.netById(netOfPoint.get(key(l.x, l.y)));
      if (!net || (net.pins.length === 0 && net.wireCount === 0)) set.add(l.id);
    }
    return set;
  }, [doc.labels, netlist, netOfPoint]);

  const toWorld = useCallback(
    (event) => {
      const rect = svgRef.current.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left - view.x) / view.zoom,
        y: (event.clientY - rect.top - view.y) / view.zoom,
      };
    },
    [view]
  );

  const toScreen = useCallback(
    (p) => ({ x: p.x * view.zoom + view.x, y: p.y * view.zoom + view.y }),
    [view]
  );

  /**
   * Snap a world point.
   *
   * Pins win over everything, so wires land on pins exactly. `preferWires` then
   * catches a click near a run and pulls it onto the copper, which is what
   * makes naming a node work when you aim at the wire rather than at the pixel.
   */
  const snapWorld = useCallback(
    (p, { preferPins = true, preferWires = false } = {}) => {
      if (preferPins) {
        const pin = pinAt(doc, p.x, p.y, GRID * 0.8);
        if (pin) return { x: pin.x, y: pin.y, pin };
      }
      if (preferWires) {
        // Deliberately looser than the pin tolerance. Aiming at a 2px line is
        // not the skill being taught, and the cost of missing is an annotation
        // that silently does nothing.
        const onWire = wireSnap(doc, p.x, p.y, GRID * 2);
        if (onWire) return { ...onWire, pin: null };
      }
      return { x: snap(p.x), y: snap(p.y), pin: null };
    },
    [doc]
  );

  // ---------------------------------------------------------------- pointer
  /** Pointer capture keeps drags alive outside the SVG; failure is harmless. */
  const capturePointer = (event) => {
    try {
      svgRef.current?.setPointerCapture(event.pointerId);
    } catch {
      /* pointer already released, or a synthetic event */
    }
  };

  const handlePointerDown = (event) => {
    if (labelPrompt) return;
    const world = toWorld(event);

    // A keyboard move is in flight: this click drops the selection.
    if (keyMove) {
      if (event.button === 0) dropKeyMove();
      return;
    }

    const isPan = event.button === 1 || event.button === 2 || tool === 'pan';

    if (isPan) {
      setDrag({ mode: 'pan', startX: event.clientX, startY: event.clientY, origin: { ...view } });
      capturePointer(event);
      return;
    }
    if (event.button !== 0) return;

    if (tool === 'place' && placing) {
      commitPlace(snapWorld(world, { preferPins: false }));
      return;
    }

    if (tool === 'wire') {
      advanceWire(snapWorld(world));
      return;
    }

    if (tool === 'junction') {
      const p = snapWorld(world, { preferPins: false });
      schematic.toggleJunction(p.x, p.y);
      return;
    }

    if (tool === 'noconnect') {
      const p = snapWorld(world);
      schematic.toggleNoConnect(p.x, p.y);
      return;
    }

    if (tool === 'label') {
      // A label names a net, so it must land on one.
      const p = snapWorld(world, { preferWires: true });
      setLabelPrompt({ x: p.x, y: p.y });
      setLabelText('');
      return;
    }

    // --- select tool ---
    const hit = itemAt(doc, world.x, world.y);
    if (hit) {
      const already = selection.includes(hit.item.id);
      let nextSelection;
      if (event.shiftKey) {
        nextSelection = already ? selection.filter((id) => id !== hit.item.id) : [...selection, hit.item.id];
      } else {
        nextSelection = already ? selection : [hit.item.id];
      }
      schematic.select(nextSelection);
      setDrag({ mode: 'move', start: world, delta: { x: 0, y: 0 }, ids: nextSelection });
    } else {
      if (!event.shiftKey) schematic.select([]);
      setDrag({ mode: 'band', start: world, current: world });
    }
    svgRef.current.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const world = toWorld(event);
    setCursor(world);
    cursorRef.current = world;

    if (keyMove) {
      setKeyMove((m) =>
        m ? { ...m, delta: { x: snap(world.x - m.origin.x), y: snap(world.y - m.origin.y) } } : m
      );
      return;
    }

    if (!drag) {
      // Only while nothing is in flight: a highlight that follows a drag is
      // noise on top of the thing being dragged.
      const hit = tool === 'select' || tool === 'wire' ? itemAt(doc, world.x, world.y) : null;
      const next = netAtHit(doc, netOfPoint, hit, world);
      if (next !== hoverNet) setHoverNet(next);
      return;
    }
    if (drag.mode === 'pan') {
      setView((v) => ({
        ...v,
        x: drag.origin.x + (event.clientX - drag.startX),
        y: drag.origin.y + (event.clientY - drag.startY),
      }));
    } else if (drag.mode === 'move') {
      setDrag({ ...drag, delta: { x: snap(world.x - drag.start.x), y: snap(world.y - drag.start.y) } });
    } else if (drag.mode === 'band') {
      setDrag({ ...drag, current: world });
    }
  };

  const handlePointerUp = (event) => {
    if (!drag) return;
    if (drag.mode === 'move' && (drag.delta.x || drag.delta.y)) {
      schematic.move(drag.ids, drag.delta.x, drag.delta.y);
    } else if (drag.mode === 'band') {
      const ids = itemsInRect(doc, drag.start.x, drag.start.y, drag.current.x, drag.current.y);
      if (ids.length) schematic.select(event.shiftKey ? [...new Set([...selection, ...ids])] : ids);
    }
    setDrag(null);
  };

  const handleWheel = useCallback(
    (event) => {
      event.preventDefault();
      const rect = svgRef.current.getBoundingClientRect();
      const sx = event.clientX - rect.left;
      const sy = event.clientY - rect.top;
      setView((v) => {
        const factor = Math.exp(-event.deltaY * 0.0015);
        const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom * factor));
        const k = zoom / v.zoom;
        return { zoom, x: sx - (sx - v.x) * k, y: sy - (sy - v.y) * k };
      });
    },
    []
  );

  // Keep the orientation while placing several of the same part, but start a
  // different part upright: carrying a rotation across parts is surprising.
  useEffect(() => {
    setGhost({ rot: 0, mirror: false });
  }, [placing?.symbolId, placing?.unitId]);

  // Wheel must be a non-passive native listener to be able to preventDefault.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return undefined;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  /**
   * Drop the part on the cursor. The one place a placement is committed, so a
   * click, Enter and Insert cannot drift apart.
   *
   * The ghost's orientation is what the student sees, so it is what gets placed.
   */
  const commitPlace = useCallback(
    (p) => {
      const part = placingRef.current;
      if (!part) return;
      const g = ghostRef.current;
      schematic.place(part.symbolId, part.unitId, p.x, p.y, { rot: g.rot, mirror: g.mirror });
      lastPlaced.current = { ...part, rot: g.rot, mirror: g.mirror };
    },
    [schematic]
  );

  /**
   * Commit the net label being typed. Shared by Enter and by clicking away,
   * so the two cannot disagree about whether the name was kept.
   */
  const commitLabel = useCallback((text) => {
    const prompt = labelPromptRef.current;
    if (!prompt) return;
    // The caller passes the field's own value where it has one. Reading a ref
    // that is only refreshed on render loses whatever was typed in the same
    // tick as the commit, which is exactly what a fast typist does.
    const name = String(text ?? labelTextRef.current).trim();
    if (name) schematic.addLabel(prompt.x, prompt.y, name);
    setLabelPrompt(null);
    setLabelText('');
  }, [schematic]);

  /** Commit an in-flight keyboard move at its current offset. */
  const dropKeyMove = useCallback(() => {
    const m = keyMoveRef.current;
    if (!m) return;
    if (m.delta.x || m.delta.y) schematic.move(m.ids, m.delta.x, m.delta.y, { dragWires: m.dragWires });
    setKeyMove(null);
  }, [schematic]);

  /**
   * Extend the wire run to `p`: the one place a wire point is committed, so
   * clicking and pressing W do exactly the same thing.
   */
  const advanceWire = useCallback(
    (p) => {
      const current = draftRef.current;
      if (!current) {
        setDraft({ points: [{ x: p.x, y: p.y }] });
        return;
      }
      const last = current.points[current.points.length - 1];
      const path = routeOrthogonal(last, { x: p.x, y: p.y }, Math.abs(p.x - last.x) >= Math.abs(p.y - last.y));
      const segments = [];
      for (let i = 0; i < path.length - 1; i++) {
        segments.push({ x1: path[i].x, y1: path[i].y, x2: path[i + 1].x, y2: path[i + 1].y });
      }
      if (segments.length) schematic.addWires(segments);
      // Landing on a pin, an existing junction or an existing wire end finishes
      // the run: the same "one wire, one purpose" flow as a real EDA tool.
      const endsRun = !!p.pin || endpointExists(schematic.doc, p);
      setDraft(endsRun ? null : { points: [...current.points, { x: p.x, y: p.y }] });
    },
    [schematic]
  );

  /* The key listener is registered once, so anything it reads lives in a ref. */
  const toolRef = useRef(tool);
  const draftRef = useRef(draft);
  const placingRef = useRef(placing);
  const keyMoveRef = useRef(keyMove);
  const labelPromptRef = useRef(labelPrompt);
  const labelTextRef = useRef(labelText);
  const selectionRef = useRef(selection);
  const snapWorldRef = useRef(snapWorld);
  const advanceWireRef = useRef(advanceWire);
  const ghostRef = useRef(ghost);
  const commitPlaceRef = useRef(commitPlace);
  const dropKeyMoveRef = useRef(dropKeyMove);
  toolRef.current = tool;
  draftRef.current = draft;
  placingRef.current = placing;
  keyMoveRef.current = keyMove;
  labelPromptRef.current = labelPrompt;
  labelTextRef.current = labelText;
  selectionRef.current = selection;
  snapWorldRef.current = snapWorld;
  advanceWireRef.current = advanceWire;
  ghostRef.current = ghost;
  commitPlaceRef.current = commitPlace;
  dropKeyMoveRef.current = dropKeyMove;

  // ---------------------------------------------------------------- keyboard
  /**
   * KiCad-style bindings, dispatched from the shared map in lib/shortcuts.js.
   * The intent is that the mouse becomes optional: place with A/P, wire with W,
   * move with M, rotate with R, edit values with V, all without leaving the
   * home row.
   *
   * ## Press it again to act
   *
   * A tool key does two different things depending on where you already are.
   * The first press *enters* the tool; pressing it again *performs* the tool's
   * action at the cursor, exactly as a click would. `W W` starts a wire and
   * every further `W` drops a corner, so a whole run can be routed without the
   * mouse button. This is how KiCad behaves and it is the difference between
   * shortcuts that select a mode and shortcuts that do the work.
   *
   * ## Escape unwinds one layer at a time
   *
   * Escape used to reset everything at once. It now cancels the innermost
   * thing in progress: the wire you are drawing, the part on the cursor, the
   * selection, and only drops back to the select tool once there is nothing
   * left to cancel. Two taps to leave a tool, which is what muscle memory from
   * any EDA package expects.
   *
   * The refs exist because this listener is registered once and would otherwise
   * close over the tool and draft as they were on mount.
   */
  useEffect(() => {
    const onKey = (event) => {
      const action = resolveShortcut(event);
      if (!action) return;

      /** Enter the tool, or act with it when already there. */
      const toolKey = (name, act) => {
        event.preventDefault();
        if (toolRef.current === name) act();
        else {
          setTool(name);
          setPlacing(null);
        }
      };

      // Actions the app owns rather than the canvas.
      if (['add_component', 'add_power', 'run_check', 'toggle_brief', 'toggle_hints', 'toggle_shortcuts'].includes(action)) {
        event.preventDefault();
        onAppAction?.(action);
        return;
      }
      if (['edit_properties', 'edit_value', 'edit_reference'].includes(action)) {
        if (!selection.length) return;
        event.preventDefault();
        onAppAction?.(action);
        return;
      }

      switch (action) {
        // Unwind one layer per press, innermost first.
        case 'cancel':
          event.preventDefault();
          if (labelPromptRef.current) setLabelPrompt(null);
          else if (draftRef.current) setDraft(null);
          else if (keyMoveRef.current) setKeyMove(null);
          else if (placingRef.current) setPlacing(null);
          else if (selectionRef.current.length) schematic.select([]);
          else setTool('select');
          break;

        case 'delete':
          if (selection.length) {
            event.preventDefault();
            schematic.remove(selection);
          }
          break;

        case 'rotate':
          if (placing) setGhost((g) => ({ ...g, rot: (g.rot + 90) % 360 }));
          else if (selection.length) schematic.rotate(selection);
          break;

        case 'mirror_x':
          if (placing) setGhost((g) => ({ ...g, mirror: !g.mirror }));
          else if (selection.length) schematic.mirror(selection, 'x');
          break;

        case 'mirror_y':
          if (placing) setGhost((g) => ({ ...g, rot: (g.rot + 180) % 360, mirror: !g.mirror }));
          else if (selection.length) schematic.mirror(selection, 'y');
          break;

        /**
         * Enter finishes whatever is in flight, in the same order Escape
         * cancels it. Reaching for the mouse purely to commit something you
         * have already positioned with the keyboard is the slowest gesture in
         * the editor.
         */
        case 'confirm':
          // Only claim Enter when there is something to confirm: otherwise it
          // still belongs to whatever button or dialog has focus.
          if (keyMoveRef.current) {
            event.preventDefault();
            dropKeyMoveRef.current();
          } else if (placingRef.current) {
            event.preventDefault();
            commitPlaceRef.current(snapWorldRef.current(cursorRef.current, { preferPins: false }));
          } else if (draftRef.current) {
            event.preventDefault();
            setDraft(null);
          }
          break;

        // Insert re-arms the last part placed, KiCad's "repeat last item".
        case 'repeat_last':
          event.preventDefault();
          if (lastPlaced.current) {
            const { symbolId, unitId, rot, mirror } = lastPlaced.current;
            setPlacing({ symbolId, unitId });
            setGhost({ rot, mirror });
          }
          break;

        case 'move':
        case 'drag':
          // Attach the selection to the cursor; the next click (or Enter) drops it.
          if (selection.length) {
            event.preventDefault();
            setTool('select');
            setKeyMove({
              origin: { ...cursorRef.current },
              ids: selection,
              delta: { x: 0, y: 0 },
              dragWires: action === 'drag',
            });
          }
          break;

        case 'duplicate':
          if (selection.length) {
            event.preventDefault();
            schematic.duplicate(selection);
          }
          break;

        case 'copy':
          if (selection.length) {
            event.preventDefault();
            schematic.copy(selection);
          }
          break;

        case 'cut':
          if (selection.length) {
            event.preventDefault();
            schematic.cut(selection);
          }
          break;

        /**
         * Paste lands at the cursor, not back where it was copied from: the
         * pointer is already where the copy is wanted.
         */
        case 'paste': {
          event.preventDefault();
          const p = snapWorldRef.current(cursorRef.current, { preferPins: false });
          schematic.paste(p.x, p.y);
          break;
        }

        case 'select_all':
          event.preventDefault();
          schematic.selectAll();
          break;

        case 'undo':
          event.preventDefault();
          schematic.undo();
          break;
        case 'redo':
          event.preventDefault();
          schematic.redo();
          break;

        case 'nudge_left':
        case 'nudge_right':
        case 'nudge_up':
        case 'nudge_down': {
          if (!selection.length) return;
          event.preventDefault();
          const step = event.shiftKey ? GRID * 5 : GRID;
          const dx = action === 'nudge_left' ? -step : action === 'nudge_right' ? step : 0;
          const dy = action === 'nudge_up' ? -step : action === 'nudge_down' ? step : 0;
          schematic.move(selection, dx, dy);
          break;
        }

        case 'tool_wire':
          toolKey('wire', () => advanceWireRef.current(snapWorldRef.current(cursorRef.current)));
          break;
        case 'tool_junction':
          toolKey('junction', () => {
            const p = snapWorldRef.current(cursorRef.current, { preferPins: false });
            schematic.toggleJunction(p.x, p.y);
          });
          break;
        case 'tool_noconnect':
          toolKey('noconnect', () => {
            const p = snapWorldRef.current(cursorRef.current);
            schematic.toggleNoConnect(p.x, p.y);
          });
          break;
        case 'tool_label':
          toolKey('label', () => {
            const p = snapWorldRef.current(cursorRef.current, { preferWires: true });
            setLabelPrompt({ x: p.x, y: p.y });
            setLabelText('');
          });
          break;
        // Select has no "act again": a second S would have to guess what to
        // select, and guessing at the selection is how work gets lost.
        case 'tool_select':
          setTool('select');
          setPlacing(null);
          break;

        case 'zoom_fit':
          zoomToFitRef.current?.();
          break;
        case 'zoom_in':
          setView((v) => ({ ...v, zoom: Math.min(MAX_ZOOM, v.zoom * 1.25) }));
          break;
        case 'zoom_out':
          setView((v) => ({ ...v, zoom: Math.max(MIN_ZOOM, v.zoom / 1.25) }));
          break;

        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [schematic, selection, placing, setPlacing, setTool, onAppAction]);

  // Report the cursor position and net count to the status bar.
  useEffect(() => {
    onStatus?.({
      x: Math.round(cursor.x / GRID),
      y: Math.round(cursor.y / GRID),
      zoom: view.zoom,
      nets: netlist.nets.filter((n) => n.pins.length > 0).length,
      // Naming the net under the cursor turns "is this connected?" into a
      // reading rather than a guess.
      hoverNet: hoveredNet ? { name: hoveredNet.name, pins: hoveredNet.pins.length } : null,
    });
  }, [cursor, view.zoom, netlist, hoveredNet, onStatus]);

  // Expose zoom-to-fit to the keyboard handler without a stale closure.
  useEffect(() => {
    zoomToFitRef.current = zoomToFit;
  });

  const zoomToFit = () => {
    const bounds = documentBounds(doc);
    const rect = svgRef.current.getBoundingClientRect();
    if (!bounds || !rect.width) {
      setView({ x: rect.width / 2, y: rect.height / 2, zoom: 1.6 });
      return;
    }
    const pad = 80;
    const zoom = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, Math.min((rect.width - pad) / (bounds.w || 1), (rect.height - pad) / (bounds.h || 1)))
    );
    setView({
      zoom,
      x: rect.width / 2 - (bounds.x + bounds.w / 2) * zoom,
      y: rect.height / 2 - (bounds.y + bounds.h / 2) * zoom,
    });
  };

  // ---------------------------------------------------------------- rendering
  const snapped = snapWorld(cursor, {
    preferPins: tool === 'wire' || tool === 'noconnect' || tool === 'label',
    preferWires: tool === 'label',
  });
  const moveDelta = keyMove ? keyMove.delta : drag?.mode === 'move' ? drag.delta : { x: 0, y: 0 };
  const selectionSet = new Set(selection);
  const showPinDots = tool === 'wire' || tool === 'select';

  /**
   * Which wire ends the moving selection is towing.
   *
   * The preview has to agree with the commit or the drag lies: you would let go
   * expecting the wire to have stretched and find it had not. Both read the
   * same `attachmentPoints`.
   */
  const movingIds = keyMove ? keyMove.ids : drag?.mode === 'move' ? drag.ids : null;
  const towing = keyMove ? keyMove.dragWires : drag?.mode === 'move';
  const anchors = useMemo(
    () => (movingIds && towing ? attachmentPoints(doc, movingIds) : null),
    [doc, movingIds, towing]
  );
  const NO_DELTA = { x: 0, y: 0 };
  const endDelta = (w, x, y) => {
    if (selectionSet.has(w.id)) return moveDelta;
    if (!anchors || !(moveDelta.x || moveDelta.y)) return NO_DELTA;
    return anchors.has(key(x, y)) ? moveDelta : NO_DELTA;
  };

  const draftPreview = useMemo(() => {
    if (!draft) return [];
    const last = draft.points[draft.points.length - 1];
    const target = { x: snapped.x, y: snapped.y };
    const path = routeOrthogonal(last, target, Math.abs(target.x - last.x) >= Math.abs(target.y - last.y));
    return path;
  }, [draft, snapped.x, snapped.y]);

  const ghostComponent =
    placing && tool === 'place'
      ? {
          id: '__ghost',
          symbolId: placing.symbolId,
          unitId: placing.unitId,
          ref: '?',
          value: getSymbol(placing.symbolId)?.defaultValue || '',
          x: snap(cursor.x),
          y: snap(cursor.y),
          rot: ghost.rot,
          mirror: ghost.mirror,
        }
      : null;

  return (
    <div className="relative h-full w-full overflow-hidden sheet">
      <svg
        ref={svgRef}
        className="h-full w-full touch-none"
        style={{ cursor: cursorFor(tool, drag) }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onContextMenu={(e) => e.preventDefault()}
        onDoubleClick={() => setDraft(null)}
      >
        <defs>
          <pattern id="grid" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
            <circle cx={0} cy={0} r={0.6} fill="var(--grid-dot)" />
          </pattern>
        </defs>

        <g transform={`translate(${view.x}, ${view.y}) scale(${view.zoom})`}>
          {view.zoom > 0.75 && <rect x={-5000} y={-5000} width={12000} height={12000} fill="url(#grid)" />}

          {/* Wires */}
          {doc.wires.map((w) => {
            const sel = selectionSet.has(w.id);
            const a = endDelta(w, w.x1, w.y1);
            const b = endDelta(w, w.x2, w.y2);
            const lit = !sel && hoverNet && netOfPoint.get(key(w.x1, w.y1)) === hoverNet;
            return (
              <line
                key={w.id}
                x1={w.x1 + a.x}
                y1={w.y1 + a.y}
                x2={w.x2 + b.x}
                y2={w.y2 + b.y}
                stroke={sel ? 'var(--sch-selected)' : 'var(--sch-wire)'}
                strokeWidth={lit ? 4.2 : 2.2}
                strokeOpacity={lit ? 0.45 : 1}
                strokeLinecap="round"
              />
            );
          })}

          {/* The lit net drawn again on top, so the colour is the wire's own
              and the halo underneath is what reads as "this whole net". */}
          {hoverNet &&
            doc.wires
              .filter((w) => netOfPoint.get(key(w.x1, w.y1)) === hoverNet && !selectionSet.has(w.id))
              .map((w) => (
                <line
                  key={`lit-${w.id}`}
                  x1={w.x1 + endDelta(w, w.x1, w.y1).x}
                  y1={w.y1 + endDelta(w, w.x1, w.y1).y}
                  x2={w.x2 + endDelta(w, w.x2, w.y2).x}
                  y2={w.y2 + endDelta(w, w.x2, w.y2).y}
                  stroke="var(--sch-wire)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              ))}

          {/* Every pin on the lit net, including the ones far away, which is
              the whole point: a net is not what is near your cursor. */}
          {hoveredNet &&
            hoveredNet.pins.map((p) => (
              <circle
                key={`np-${p.componentId}-${p.num}`}
                cx={p.x}
                cy={p.y}
                r={5}
                fill="none"
                stroke="rgb(var(--accent))"
                strokeWidth="1.8"
                opacity="0.75"
              />
            ))}

          {/* Junction dots */}
          {doc.junctions.map((j) => {
            const sel = selectionSet.has(j.id);
            const d = sel ? moveDelta : { x: 0, y: 0 };
            return (
              <circle
                key={j.id}
                cx={j.x + d.x}
                cy={j.y + d.y}
                r={3.6}
                fill={sel ? 'var(--sch-selected)' : 'var(--sch-wire)'}
              />
            );
          })}

          {/* No-connect markers */}
          {doc.noConnects.map((n) => {
            const sel = selectionSet.has(n.id);
            const d = sel ? moveDelta : { x: 0, y: 0 };
            return (
              <g key={n.id} stroke={sel ? 'var(--sch-selected)' : 'var(--sch-nc)'} strokeWidth="2">
                <line x1={n.x + d.x - 5} y1={n.y + d.y - 5} x2={n.x + d.x + 5} y2={n.y + d.y + 5} />
                <line x1={n.x + d.x - 5} y1={n.y + d.y + 5} x2={n.x + d.x + 5} y2={n.y + d.y - 5} />
              </g>
            );
          })}

          {/* Components */}
          {doc.components.map((c) => {
            const sel = selectionSet.has(c.id);
            const d = sel ? moveDelta : { x: 0, y: 0 };
            return (
              <SymbolView
                key={c.id}
                component={{ ...c, x: c.x + d.x, y: c.y + d.y }}
                selected={sel}
                showPinDots={showPinDots}
                connectedPins={connectedPins}
              />
            );
          })}

          {/* Net labels */}
          {doc.labels.map((l) => {
            const sel = selectionSet.has(l.id);
            const d = sel ? moveDelta : { x: 0, y: 0 };
            const dangling = danglingLabels.has(l.id);
            const colour = sel
              ? 'var(--sch-selected)'
              : dangling
                ? 'var(--sch-pin-free)'
                : 'var(--sch-label)';
            return (
              <g key={l.id}>
                {dangling ? (
                  // The hollow square an EDA tool puts on an unconnected end.
                  <rect
                    x={l.x + d.x - 3.2}
                    y={l.y + d.y - 3.2}
                    width={6.4}
                    height={6.4}
                    fill="none"
                    stroke={colour}
                    strokeWidth="1.4"
                  />
                ) : (
                  <circle cx={l.x + d.x} cy={l.y + d.y} r={2.2} fill={colour} />
                )}
                <text
                  x={l.x + d.x + 6}
                  y={l.y + d.y - 5}
                  fontSize="11"
                  fill={colour}
                  className="font-mono"
                >
                  {l.text}
                </text>
                {dangling && (
                  <text
                    x={l.x + d.x + 6}
                    y={l.y + d.y + 8}
                    fontSize="7.5"
                    fill={colour}
                    className="font-mono"
                    opacity="0.85"
                  >
                    not on a net
                  </text>
                )}
              </g>
            );
          })}

          {/* Wire being drawn */}
          {draftPreview.length > 1 && (
            <polyline
              points={draftPreview.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="var(--sch-wire)"
              strokeWidth="2"
              strokeDasharray="6 4"
              opacity="0.8"
            />
          )}

          {/* Placement ghost */}
          {ghostComponent && <SymbolView component={ghostComponent} ghost showAnnotations={false} />}

          {/* Snap cursor */}
          {(tool === 'wire' || tool === 'junction' || tool === 'label' || tool === 'noconnect') && (
            <circle
              cx={snapped.x}
              cy={snapped.y}
              r={snapped.pin ? 4.5 : 3}
              fill="none"
              stroke={snapped.pin ? 'var(--sch-pin-open)' : 'var(--sch-cursor)'}
              strokeWidth="1.5"
            />
          )}

          {/* Rubber-band selection */}
          {drag?.mode === 'band' && (
            <rect
              x={Math.min(drag.start.x, drag.current.x)}
              y={Math.min(drag.start.y, drag.current.y)}
              width={Math.abs(drag.current.x - drag.start.x)}
              height={Math.abs(drag.current.y - drag.start.y)}
              fill="var(--sch-selected)"
              fillOpacity="0.08"
              stroke="var(--sch-selected)"
              strokeDasharray="4 3"
            />
          )}

          {/* Check-result markers: deliberately loud: an unmet requirement
              should be impossible to miss on a busy sheet. */}
          {highlights.map((h, i) => {
            // "!" in red means this is wrong. "+" in amber means something is
            // meant to be here and is not: the same distinction the results
            // panel draws between Wrong and Missing.
            const missing = h.tone === 'warn';
            const colour = missing ? 'rgb(var(--warn))' : 'rgb(var(--bad))';
            return (
              <g key={i}>
                <circle cx={h.x} cy={h.y} r={13} fill={colour} fillOpacity="0.10" />
                <circle
                  cx={h.x}
                  cy={h.y}
                  r={7}
                  fill="none"
                  stroke={colour}
                  strokeWidth="2.2"
                  strokeDasharray={missing ? '3 2.6' : undefined}
                />
                {!missing && (
                  <circle
                    className="highlight-pulse"
                    cx={h.x}
                    cy={h.y}
                    r={7}
                    fill="none"
                    stroke={colour}
                    strokeWidth="1.6"
                  />
                )}
                <g transform={`translate(${h.x + 11}, ${h.y - 11})`}>
                  <circle r="7" fill={colour} />
                  <text
                    y="3"
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="700"
                    fill="#fff"
                    className="font-mono"
                  >
                    {missing ? '+' : '!'}
                  </text>
                </g>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Inline net-label entry */}
      {labelPrompt && (
        <div
          className="absolute z-20"
          style={{ left: toScreen(labelPrompt).x + 8, top: toScreen(labelPrompt).y - 14 }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              commitLabel();
            }}
          >
            <input
              autoFocus
              value={labelText}
              onChange={(e) => setLabelText(e.target.value)}
              onKeyDown={(e) => {
                // Escape unmounts the field, and removing a focused element does
                // not fire blur, so this cancels cleanly without committing.
                if (e.key === 'Escape') {
                  setLabelPrompt(null);
                  setLabelText('');
                }
              }}
              // Clicking away keeps what was typed. Discarding it was the same
              // trap the property fields had: you name a node, look at the
              // sheet, and the name is silently gone.
              onBlur={(e) => commitLabel(e.target.value)}
              placeholder="net name"
              className="field w-36 font-mono text-xs"
            />
          </form>
        </div>
      )}

      {/* Floating zoom controls */}
      <div className="panel-pill absolute bottom-4 right-4 flex flex-col overflow-hidden p-1">
        <button
          className="ibtn h-8 w-8"
          title="Zoom in"
          onClick={() => setView((v) => ({ ...v, zoom: Math.min(MAX_ZOOM, v.zoom * 1.25) }))}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2.5v9M2.5 7h9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>
        <button
          className="ibtn h-8 w-8"
          title="Zoom out"
          onClick={() => setView((v) => ({ ...v, zoom: Math.max(MIN_ZOOM, v.zoom / 1.25) }))}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2.5 7h9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>
        <button className="ibtn h-8 w-8 font-mono text-[9.5px] font-semibold uppercase" title="Zoom to fit" onClick={zoomToFit}>
          Fit
        </button>
      </div>

      {/* Transient hint for the active gesture, centred under the top chrome. */}
      {(draft || keyMove || (placing && tool === 'place')) && (
        <div className="panel-pill animate-fade-in pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 px-4 py-2 text-[12px] text-zinc-700">
          {keyMove
            ? `${keyMove.dragWires ? 'Dragging: wires follow' : 'Moving: wires stay put'}: click or Enter to drop, R rotates, Esc cancels`
            : draft
              ? 'Drawing a wire: click for a corner, double-click or Esc to finish'
              : `Placing ${getSymbol(placing.symbolId)?.name}${
                  placing.unitId !== 'A' ? ` [${placing.unitId}]` : ''
                }: click or Enter to place, R rotates, X mirrors, Esc cancels`}
        </div>
      )}
    </div>
  );
}

/** The net under the cursor, from whatever kind of item was hit. */
function netAtHit(doc, netOfPoint, hit, world) {
  if (!hit) return null;
  if (hit.kind === 'wire') return netOfPoint.get(key(hit.item.x1, hit.item.y1)) ?? null;
  if (hit.kind === 'junction' || hit.kind === 'label') {
    return netOfPoint.get(key(hit.item.x, hit.item.y)) ?? null;
  }
  if (hit.kind === 'component') {
    const pin = pinAt(doc, world.x, world.y, GRID * 1.6);
    return pin ? netOfPoint.get(key(pin.x, pin.y)) ?? null : null;
  }
  return null;
}

function endpointExists(doc, p) {
  const k = key(p.x, p.y);
  return (
    doc.wires.some((w) => key(w.x1, w.y1) === k || key(w.x2, w.y2) === k) ||
    doc.junctions.some((j) => key(j.x, j.y) === k)
  );
}

function cursorFor(tool, drag) {
  if (drag?.mode === 'pan') return 'grabbing';
  switch (tool) {
    case 'wire':
    case 'junction':
    case 'noconnect':
    case 'label':
      return 'crosshair';
    case 'place':
      return 'copy';
    default:
      return 'default';
  }
}
