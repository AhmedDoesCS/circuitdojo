// Each exercise belongs immediately before its existing build. Passing that
// build remains evidence of the block's skills when the curriculum expands.
const choose = (anchor, slug, title, prompt, options, reasons, explanation) => ({
  anchor, kind: 'choose', slug, title, prompt,
  options: options.map((label, i) => ({ id: `part-${i}`, label })),
  reasons: reasons.map((label, i) => ({ id: `reason-${i}`, label })),
  correctOption: 'part-0', correctReason: 'reason-0', explanation,
  hint: 'Check every stated limit, then choose the reason that explains your choice.',
});
const trace = (anchor, slug, title, netName, explanation) => ({
  anchor, templateId: anchor, kind: 'trace', slug, title, netName,
  prompt: `Select every wire segment on the ${netName} net. Stop at component terminals: a component separates nets.`,
  explanation, hint: 'Follow connected copper and matching net labels. Do not cross through a component body.',
});

export const FOUNDATION_EXTRAS = [
  choose('led_current_limit', 'resistor-rating-choice', 'Choose a resistor that can handle the heat',
    'A 100 ohm resistor carries 40 mA continuously. The design requires a rated power of at least twice the calculated dissipation. Choose the smallest suitable rating from these candidates.',
    ['100 ohm, 0.5 W', '100 ohm, 0.25 W', '100 ohm, 0.125 W'],
    ['It dissipates 0.16 W, so the required rating is at least 0.32 W.', 'A resistor rating must equal its dissipation exactly.', 'Resistance alone determines whether a resistor overheats.'],
    'I squared times R is 0.04 squared times 100 = 0.16 W. Twice that is 0.32 W; 0.5 W is the smallest offered rating that meets this requirement.'),
  choose('voltage_divider', 'divider-tolerance-choice', 'Choose a tighter divider pair',
    'A divider requires two 10 kilohm resistors, each within 1% of nominal. These are the available parts. Which pair meets the purchasing specification?',
    ['Two 10 kilohm, 1% resistors', 'Two 10 kilohm, 5% resistors', 'Two 1 kilohm, 1% resistors'],
    ['Both nominal resistance and tolerance meet the specification.', 'Any equal pair meets every divider requirement.', 'A smaller resistance always gives a more accurate ratio.'],
    'Both requirements matter. Equal nominal ratios do not waive resistance or tolerance limits; individual tolerances can push the ratio in opposite directions.'),
  choose('button_pulldown', 'pulldown-budget-choice', 'Keep the button current within budget',
    'A closed button connects 3.3 V across its pull-down resistor. Static current must not exceed 0.5 mA. Choose the lowest resistance offered that meets that limit. Ignore input leakage for this exercise.',
    ['10 kilohm', '4.7 kilohm', '1 kilohm'],
    ['3.3 V / 10 kilohm is 0.33 mA, below the limit.', 'Larger resistors always draw more current.', 'The input pin removes all current through the resistor.'],
    'The minimum resistance is 3.3 / 0.0005 = 6.6 kilohm. Of these candidates, only 10 kilohm meets the current budget.'),
  choose('rail_bypass_pair', 'capacitor-voltage-choice', 'Read the capacitor voltage rating',
    'A bulk capacitor must provide 100 microfarads on a rail that can reach 12 V. The purchasing rule requires a voltage rating at least 1.5 times that maximum. Select the lowest rated candidate that qualifies.',
    ['100 microfarads, 25 V', '100 microfarads, 16 V', '100 microfarads, 10 V'],
    ['The required rating is at least 18 V.', 'The voltage rating is the voltage the capacitor generates.', 'Capacitance makes the voltage rating irrelevant.'],
    '12 times 1.5 = 18 V. The 25 V candidate qualifies. This is a stated design margin, not a claim that the same margin fits every capacitor technology.'),
  trace('led_current_limit', 'trace-led-return', 'Find the LED return net', 'GND',
    'The return wire joins the LED cathode to ground. The LED and resistor each separate their terminal nets.'),
  trace('voltage_divider', 'trace-divider-output', 'Find the divider output net', 'VOUT',
    'VOUT joins the lower terminal of the upper resistor to the upper terminal of the lower resistor. Neither resistor body is part of that wire net.'),
  trace('button_pulldown', 'trace-button-input', 'Find the button signal net', 'BTN',
    'BTN is the junction of the button and pull-down. It remains a distinct net from ground even though a resistor connects them.'),
  trace('button_pullup', 'trace-active-low-input', 'Find the active-low signal net', 'nBTN',
    'nBTN lies between the pull-up and the button. Closing the button pulls it low; the schematic net stops at the switch terminal.'),
  trace('rail_bypass_pair', 'trace-shared-return', 'Follow the shared capacitor return', 'GND',
    'Every ground symbol names the same electrical net. Select all of its branches, including returns drawn separately. Capacitors separate the supply net from the ground net.'),
];
