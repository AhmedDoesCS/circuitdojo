/**
 * Keyboard map, modelled on KiCad's schematic editor.
 *
 * Anyone who has used eeschema should be able to work here without looking
 * anything up: same letters, same meanings. This file is the single source of
 * truth: the canvas reads it to dispatch, and the shortcuts sheet renders it.
 */

export const SHORTCUT_GROUPS = [
  {
    group: 'Place',
    items: [
      { keys: ['A'], action: 'add_component', label: 'Add a component (opens the parts search)' },
      { keys: ['P'], action: 'add_power', label: 'Add a power symbol' },
      { keys: ['W'], action: 'tool_wire', label: 'Draw wires' },
      { keys: ['J'], action: 'tool_junction', label: 'Place a junction dot' },
      { keys: ['L'], action: 'tool_label', label: 'Place a net label' },
      { keys: ['Q'], action: 'tool_noconnect', label: 'Place a no-connect flag' },
      { keys: ['Enter'], action: 'confirm', label: 'Place the part on the cursor / drop what you are moving' },
      { keys: ['Ins'], action: 'repeat_last', label: 'Place another of the part you placed last' },
      { keys: ['Esc'], action: 'cancel', label: 'Cancel the current action / back to Select' },
    ],
  },
  {
    group: 'Edit',
    items: [
      { keys: ['G'], action: 'drag', label: 'Drag the selection: attached wires stretch to follow' },
      { keys: ['M'], action: 'move', label: 'Move the selection and leave its wires behind' },
      { keys: ['R'], action: 'rotate', label: 'Rotate 90°' },
      { keys: ['X'], action: 'mirror_x', label: 'Mirror horizontally' },
      { keys: ['Y'], action: 'mirror_y', label: 'Mirror vertically' },
      { keys: ['E'], action: 'edit_properties', label: 'Edit properties of the selected part' },
      { keys: ['V'], action: 'edit_value', label: 'Edit the value field' },
      { keys: ['U'], action: 'edit_reference', label: 'Edit the reference designator' },
      { keys: ['Ctrl', 'C'], action: 'copy', label: 'Copy the selection' },
      { keys: ['Ctrl', 'X'], action: 'cut', label: 'Cut the selection' },
      { keys: ['Ctrl', 'V'], action: 'paste', label: 'Paste at the cursor' },
      { keys: ['Ctrl', 'D'], action: 'duplicate', label: 'Duplicate the selection' },
      { keys: ['Del'], action: 'delete', label: 'Delete the selection' },
      { keys: ['←', '↑', '→', '↓'], action: 'nudge', label: 'Nudge the selection one grid step' },
      { keys: ['Ctrl', 'A'], action: 'select_all', label: 'Select everything' },
      { keys: ['Ctrl', 'Z'], action: 'undo', label: 'Undo' },
      { keys: ['Ctrl', 'Shift', 'Z'], action: 'redo', label: 'Redo' },
    ],
  },
  {
    group: 'View',
    items: [
      { keys: ['F'], action: 'zoom_fit', label: 'Zoom to fit the sheet' },
      { keys: ['+'], action: 'zoom_in', label: 'Zoom in' },
      { keys: ['-'], action: 'zoom_out', label: 'Zoom out' },
      { keys: ['Scroll'], action: null, label: 'Zoom around the pointer' },
      { keys: ['Middle drag'], action: null, label: 'Pan the sheet' },
      { keys: ['S'], action: 'tool_select', label: 'Select tool' },
    ],
  },
  {
    group: 'Challenge',
    items: [
      { keys: ['Ctrl', 'Enter'], action: 'run_check', label: 'Run the check' },
      { keys: ['B'], action: 'toggle_brief', label: 'Show or hide the brief' },
      { keys: ['H'], action: 'toggle_hints', label: 'Show hints (after a failed check)' },
      { keys: ['?'], action: 'toggle_shortcuts', label: 'This shortcut sheet' },
    ],
  },
];

/** Flat lookup of every bound action, for documentation and tests. */
export const ALL_SHORTCUTS = SHORTCUT_GROUPS.flatMap((g) => g.items.map((i) => ({ ...i, group: g.group })));

/**
 * Resolve a keyboard event to an action id.
 * Returns null when the key is not bound, or when the user is typing.
 */
export function resolveShortcut(event) {
  const target = event.target;
  const typing =
    target &&
    (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable);
  if (typing) return null;

  const ctrl = event.ctrlKey || event.metaKey;
  const key = event.key;
  const lower = typeof key === 'string' ? key.toLowerCase() : '';

  if (ctrl) {
    if (lower === 'z') return event.shiftKey ? 'redo' : 'undo';
    if (lower === 'y') return 'redo';
    if (lower === 'c') return 'copy';
    if (lower === 'x') return 'cut';
    if (lower === 'v') return 'paste';
    if (lower === 'd') return 'duplicate';
    if (lower === 'a') return 'select_all';
    if (key === 'Enter') return 'run_check';
    return null;
  }

  switch (key) {
    case 'Escape':
      return 'cancel';
    case 'Enter':
      return 'confirm';
    case 'Insert':
      return 'repeat_last';
    case 'Delete':
    case 'Backspace':
      return 'delete';
    case 'ArrowLeft':
      return 'nudge_left';
    case 'ArrowRight':
      return 'nudge_right';
    case 'ArrowUp':
      return 'nudge_up';
    case 'ArrowDown':
      return 'nudge_down';
    case '+':
    case '=':
      return 'zoom_in';
    case '-':
    case '_':
      return 'zoom_out';
    case '?':
      return 'toggle_shortcuts';
    default:
      break;
  }

  switch (lower) {
    case 'a':
      return 'add_component';
    case 'p':
      return 'add_power';
    case 'w':
      return 'tool_wire';
    case 'j':
      return 'tool_junction';
    case 'l':
      return 'tool_label';
    case 'q':
      return 'tool_noconnect';
    case 's':
      return 'tool_select';
    case 'm':
      return 'move';
    case 'g':
      return 'drag';
    case 'r':
      return 'rotate';
    case 'x':
      return 'mirror_x';
    case 'y':
      return 'mirror_y';
    case 'e':
      return 'edit_properties';
    case 'v':
      return 'edit_value';
    case 'u':
      return 'edit_reference';
    case 'f':
      return 'zoom_fit';
    case 'b':
      return 'toggle_brief';
    case 'h':
      return 'toggle_hints';
    default:
      return null;
  }
}
