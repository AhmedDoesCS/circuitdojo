/**
 * Concept taxonomy: the backbone of levelling, theory and generation.
 *
 * Every concept carries:
 *   level      1 (no prior electronics) → 8 (industry practice)
 *   domain     which branch of the discipline it belongs to
 *   prereq     concepts that should come first (used to gate generation)
 *   formulas   the maths, ALWAYS shown to the learner: theory must never be
 *              the barrier, only the reason
 *   applies    how the maths turns into a design decision
 *   standards  the safety / efficiency practice a professional would apply
 *   refs       where to read more
 *
 * Challenge templates reference concepts by id. That single link gives us
 * per-concept mastery, level estimation, theory cards and hint generation
 * without duplicating content per challenge.
 */

export const DOMAINS = {
  fundamentals: 'Fundamentals',
  passives: 'Passive components',
  power: 'Power & regulation',
  analog: 'Analog design',
  digital: 'Digital logic',
  signal: 'Signal chain',
  sensors: 'Sensing & instrumentation',
  comms: 'Communication buses',
  timing: 'Timing & oscillators',
  mechatronics: 'Motors & actuators',
  mcu: 'Microcontroller hardware',
  safety: 'Safety & protection',
  emc: 'EMC & integrity',
  mixed: 'Mixed-signal systems',
};

const C = (concept) => concept;

export const CONCEPTS = [
  // ---------------------------------------------------------------- level 1
  C({
    id: 'ohms_law',
    name: "Ohm's law",
    domain: 'fundamentals',
    level: 1,
    prereq: [],
    formulas: [
      { expr: 'V = I · R', note: 'Voltage across a resistor equals current through it times its resistance.' },
      { expr: 'I = V / R', note: 'Rearranged to find current.' },
      { expr: 'R = V / I', note: 'Rearranged to size a resistor.' },
    ],
    applies:
      'Sizing any series resistor starts here: decide the voltage the resistor must drop, decide the current you want, divide.',
    standards: 'Check the resistor can dissipate the power: P = V·I. A 0805 chip resistor is good for about 0.125W.',
    refs: [{ title: 'Ohm\'s law', where: 'Any introductory text; Horowitz & Hill, The Art of Electronics §1.2' }],
  }),
  C({
    id: 'power_dissipation',
    name: 'Power dissipation',
    domain: 'fundamentals',
    level: 1,
    prereq: ['ohms_law'],
    formulas: [
      { expr: 'P = V · I = I²·R = V²/R', note: 'Three equivalent forms: use whichever quantities you know.' },
    ],
    applies: 'Every resistor, regulator and transistor turns some power into heat. Size parts so they stay within rating.',
    standards: 'Derate: run passives at ≤50% of their rated power for reliable long-term operation.',
    refs: [{ title: 'Power ratings and derating', where: 'Vishay/Yageo resistor datasheets, "power derating curve"' }],
  }),
  C({
    id: 'series_parallel',
    name: 'Series and parallel combinations',
    domain: 'fundamentals',
    level: 1,
    prereq: ['ohms_law'],
    formulas: [
      { expr: 'R_series = R1 + R2 + ...', note: 'Same current through each.' },
      { expr: '1/R_parallel = 1/R1 + 1/R2 + ...', note: 'Same voltage across each.' },
      { expr: 'C_parallel = C1 + C2, 1/C_series = 1/C1 + 1/C2', note: 'Capacitors behave the opposite way round.' },
    ],
    applies: 'Recognising which elements share a node (parallel) versus share a current path (series) is how you read any schematic.',
    refs: [{ title: 'Series and parallel circuits', where: 'Art of Electronics §1.2.2' }],
  }),
  C({
    id: 'led_drive',
    name: 'LED current limiting',
    domain: 'passives',
    level: 1,
    prereq: ['ohms_law'],
    formulas: [
      { expr: 'R = (V_supply − V_f) / I_f', note: 'The resistor drops whatever the LED does not.' },
      { expr: 'P_R = (V_supply − V_f) · I_f', note: 'Power in the resistor.' },
    ],
    applies:
      'An LED has no internal current limit: its current rises exponentially with voltage, so a series resistor sets the operating point.',
    standards: 'Indicator LEDs are bright at 2-5mA on modern parts; do not default to 20mA and waste power.',
    refs: [{ title: 'Driving LEDs', where: 'Any LED datasheet: look for the I-V curve and "typical forward voltage"' }],
  }),
  C({
    id: 'ground_reference',
    name: 'Ground and return paths',
    domain: 'fundamentals',
    level: 1,
    prereq: [],
    formulas: [{ expr: 'V_node is always relative to a reference node', note: 'Voltage is a difference, never absolute.' }],
    applies: 'Every supply needs a return. A circuit with no ground symbol has no defined levels and no current path.',
    standards: 'One ground reference per sheet unless you deliberately split analog and power grounds at a single point.',
    refs: [{ title: 'Grounding', where: 'Henry Ott, Electromagnetic Compatibility Engineering, ch. 3' }],
  }),
  C({
    id: 'schematic_conventions',
    name: 'Schematic conventions',
    domain: 'fundamentals',
    level: 1,
    prereq: [],
    formulas: [],
    applies:
      'Junction dots mean connection; crossings without a dot do not. Power symbols declare rails; net labels only name nodes.',
    standards: 'Signals flow left to right, power at the top, ground at the bottom. Reference designators: R, C, D, Q, U, SW, J, L.',
    refs: [{ title: 'IEEE 315 symbols', where: 'IEEE Std 315-1975, graphic symbols for electrical diagrams' }],
  }),

  // ---------------------------------------------------------------- level 2
  C({
    id: 'voltage_divider',
    name: 'Voltage dividers',
    domain: 'passives',
    level: 2,
    prereq: ['ohms_law', 'series_parallel'],
    formulas: [
      { expr: 'V_out = V_in · R2 / (R1 + R2)', note: 'R2 is the bottom (ground-side) resistor.' },
      { expr: 'R1 = R2 · (V_in − V_out) / V_out', note: 'Rearranged to size the top resistor.' },
      { expr: 'R_thevenin = R1 ∥ R2', note: 'The output impedance the next stage sees.' },
    ],
    applies:
      'Dividers set reference voltages and scale signals into an ADC range. They only hold their voltage when lightly loaded.',
    standards: 'Keep divider current ≥ 10× the current drawn by the load, or buffer the midpoint with an op-amp.',
    refs: [{ title: 'Thévenin equivalents', where: 'Art of Electronics §1.2.5-1.2.6' }],
  }),
  C({
    id: 'pull_resistors',
    name: 'Pull-up and pull-down resistors',
    domain: 'digital',
    level: 2,
    prereq: ['voltage_divider'],
    formulas: [
      { expr: 'I_pull = V_rail / R_pull', note: 'Current wasted while the switch holds the node at the other rail.' },
      { expr: 't_rise ≈ 2.2 · R_pull · C_load', note: '10-90% rise time on an open-drain node.' },
    ],
    applies:
      'A pull resistor defines a node when nothing is driving it. One leg on the node, the other on a rail, never in series with the signal.',
    standards: '10k is the general-purpose default. Go lower (1-4.7k) for noise immunity or speed, higher (47-100k) to save power.',
    refs: [{ title: 'CMOS input requirements', where: 'TI SCHA004, "Designing With Logic"' }],
  }),
  C({
    id: 'capacitor_basics',
    name: 'Capacitors and charge storage',
    domain: 'passives',
    level: 2,
    prereq: ['ohms_law'],
    formulas: [
      { expr: 'Q = C · V', note: 'Charge stored.' },
      { expr: 'I = C · dV/dt', note: 'Current is proportional to rate of voltage change.' },
      { expr: 'X_C = 1 / (2π f C)', note: 'Impedance falls with frequency.' },
    ],
    applies: 'Capacitors block DC and pass AC: they filter, decouple, time and couple.',
    standards: 'Derate ceramics: an X7R rated 16V loses much of its capacitance near that voltage. Choose 2× the working voltage.',
    refs: [{ title: 'Ceramic capacitor DC bias', where: 'Murata/TDK "DC bias characteristics" application notes' }],
  }),
  C({
    id: 'decoupling',
    name: 'Decoupling and bulk capacitance',
    domain: 'emc',
    level: 2,
    prereq: ['capacitor_basics'],
    formulas: [
      { expr: 'ΔV = I · Δt / C', note: 'Rail droop when a chip draws a current pulse.' },
      { expr: 'f_res = 1 / (2π√(L·C))', note: 'Self-resonance: above it a capacitor looks inductive.' },
    ],
    applies:
      '100nF right at each IC supplies the fast switching current spike locally; 10µF+ of bulk rides out slower load changes.',
    standards: 'One 100nF per supply pin, placed within a few millimetres of the pin, with the shortest possible loop to ground.',
    refs: [{ title: 'Decoupling practice', where: 'TI SCAA048, "PCB Design Guidelines for Reduced EMI"' }],
  }),
  C({
    id: 'diode_behaviour',
    name: 'Diodes, rectification and clamping',
    domain: 'passives',
    level: 2,
    prereq: ['ohms_law'],
    formulas: [
      { expr: 'V_f ≈ 0.7V (silicon), 0.3V (Schottky)', note: 'Forward drop when conducting.' },
      { expr: 'I = I_S(e^(V/nV_T) − 1)', note: 'The Shockley equation: why a diode cannot limit its own current.' },
    ],
    applies: 'Diodes steer current one way: rectifiers, reverse-polarity protection, flyback clamps and voltage references.',
    standards: 'Any inductive load (relay, motor, solenoid) needs a flyback diode across it or the switching device dies.',
    refs: [{ title: 'Diode circuits', where: 'Art of Electronics §1.6' }],
  }),

  // ---------------------------------------------------------------- level 3
  C({
    id: 'rc_time_constant',
    name: 'RC time constants and filters',
    domain: 'signal',
    level: 3,
    prereq: ['capacitor_basics'],
    formulas: [
      { expr: 'τ = R · C', note: 'Time to reach 63% of the final value.' },
      { expr: 'f_c = 1 / (2π R C)', note: 'The −3dB corner frequency.' },
      { expr: 'V(t) = V_final(1 − e^(−t/τ))', note: 'Charging curve.' },
    ],
    applies: 'Low-pass: series R, shunt C. High-pass: series C, shunt R. Debouncing, anti-aliasing and slew limiting are all RC.',
    standards: 'Place an anti-alias filter below half your sample rate (Nyquist) before any ADC.',
    refs: [{ title: 'RC filters', where: 'Art of Electronics §1.7' }],
  }),
  C({
    id: 'logic_gates',
    name: 'Logic gates and truth tables',
    domain: 'digital',
    level: 3,
    prereq: ['pull_resistors'],
    formulas: [
      { expr: 'AND: Y = A·B   OR: Y = A+B   NOT: Y = /A', note: 'Boolean primitives.' },
      { expr: 'NAND and NOR are universal', note: 'Any function can be built from either alone.' },
    ],
    applies: 'Combinational logic turns input conditions into an output condition without memory.',
    standards: 'Tie every unused input to a defined level; never leave a CMOS input floating, even on a gate you do not use.',
    refs: [{ title: '74HC family', where: 'Nexperia 74HC00 datasheet; TI SCLA013 "Logic Guide"' }],
  }),
  C({
    id: 'logic_levels',
    name: 'Logic levels and noise margin',
    domain: 'digital',
    level: 3,
    prereq: ['logic_gates'],
    formulas: [
      { expr: 'NM_H = V_OH − V_IH,  NM_L = V_IL − V_OL', note: 'Noise margin: headroom before a level is misread.' },
      { expr: '74HC: V_IH = 0.7·VCC, V_IL = 0.3·VCC', note: 'CMOS thresholds scale with the supply.' },
    ],
    applies: 'Interfacing 3.3V logic to a 5V CMOS input fails because 3.3V < 0.7·5V. Use 74HCT, a level shifter, or match rails.',
    standards: 'Keep at least a few hundred millivolts of noise margin; do not design at the threshold.',
    refs: [{ title: 'Logic level compatibility', where: 'TI SCHA004, "Designing With Logic", §2' }],
  }),
  C({
    id: 'multi_unit_ics',
    name: 'Multi-unit ICs and power pins',
    domain: 'digital',
    level: 3,
    prereq: ['logic_gates', 'decoupling'],
    formulas: [],
    applies:
      'Gate symbols on a sheet are units of one physical package. The silicon is powered through the package supply pins, drawn as a separate power unit.',
    standards: 'Every package gets its supply pins wired and its own decoupling capacitor, no exceptions.',
    refs: [{ title: 'Schematic units', where: 'KiCad documentation, "Symbols with multiple units"' }],
  }),
  C({
    id: 'switch_debounce',
    name: 'Contact bounce and debouncing',
    domain: 'digital',
    level: 3,
    prereq: ['rc_time_constant', 'pull_resistors'],
    formulas: [
      { expr: 'τ = R·C, choose τ ≈ 5-20ms', note: 'Longer than the bounce, shorter than human perception.' },
    ],
    applies: 'A mechanical contact makes and breaks for milliseconds. Filter it in hardware or debounce it in firmware, but do one.',
    standards: 'Follow an RC filter with a Schmitt-trigger input; a slow ramp into an ordinary gate causes output oscillation.',
    refs: [{ title: 'Debouncing', where: 'Jack Ganssle, "A Guide to Debouncing"' }],
  }),
  C({
    id: 'transistor_switch',
    name: 'Transistor as a switch',
    domain: 'analog',
    level: 3,
    prereq: ['diode_behaviour', 'ohms_law'],
    formulas: [
      { expr: 'I_C = β · I_B (BJT, active region)', note: 'For switching, drive 5-10× harder than β requires to saturate.' },
      { expr: 'R_base = (V_drive − V_BE) / I_B', note: 'Base resistor sizing, V_BE ≈ 0.7V.' },
      { expr: 'P = I_load² · R_DS(on) (MOSFET)', note: 'Conduction loss in a MOSFET switch.' },
    ],
    applies: 'A logic pin can only source a few milliamps; a transistor lets it control amps.',
    standards: 'Logic-level MOSFETs need V_GS(th) well below your drive voltage: check R_DS(on) *at your actual V_GS*.',
    refs: [{ title: 'Transistor switches', where: 'Art of Electronics §2.2; ON Semi AND9083' }],
  }),

  // ---------------------------------------------------------------- level 4
  C({
    id: 'linear_regulation',
    name: 'Linear regulation',
    domain: 'power',
    level: 4,
    prereq: ['decoupling', 'power_dissipation'],
    formulas: [
      { expr: 'P_dissipated = (V_in − V_out) · I_out', note: 'All of it becomes heat.' },
      { expr: 'η = V_out / V_in', note: 'Best-case efficiency of any linear regulator.' },
      { expr: 'T_j = T_a + P · θ_JA', note: 'Junction temperature, the number that decides if it survives.' },
    ],
    applies: 'Linear regulators are quiet and simple but waste the voltage difference as heat. Ideal for low-current analog rails.',
    standards: 'Respect dropout (≈2V for a 78xx, 0.3V for a modern LDO) and check θ_JA against the worst-case ambient.',
    refs: [{ title: 'LM7805 datasheet', where: 'TI LM340/LM7805, "Application Information"' }],
  }),
  C({
    id: 'opamp_feedback',
    name: 'Op-amp negative feedback',
    domain: 'analog',
    level: 4,
    prereq: ['voltage_divider'],
    formulas: [
      { expr: 'Non-inverting gain = 1 + Rf/Rg', note: 'Never less than 1.' },
      { expr: 'Inverting gain = −Rf/Rin', note: 'Input impedance equals Rin.' },
      { expr: 'Buffer: gain = 1', note: 'Output tied to the inverting input.' },
    ],
    applies:
      'Two rules solve almost every op-amp circuit: no current enters the inputs, and the output moves until both inputs match.',
    standards: 'Check the output swing your part can actually reach, and keep the signal inside the input common-mode range.',
    refs: [{ title: 'Op-amp circuits', where: 'Art of Electronics ch. 4; TI SLOA011 "Op Amps for Everyone"' }],
  }),
  C({
    id: 'opamp_practical',
    name: 'Op-amp non-idealities',
    domain: 'analog',
    level: 4,
    prereq: ['opamp_feedback'],
    formulas: [
      { expr: 'GBW = gain × bandwidth', note: 'A 1MHz part at a gain of 100 gives you 10kHz.' },
      { expr: 'V_error = V_os + I_bias · R_source', note: 'DC error at the output, times the gain.' },
      { expr: 'Slew limit: f_max = SR / (2π·V_peak)', note: 'Large signals hit slew rate before bandwidth.' },
    ],
    applies: 'Real op-amps have offset, bias current, finite bandwidth and limited swing: that is what turns a textbook circuit into a design.',
    standards: 'Single-supply parts cannot output 0V unless they are rail-to-rail; bias the input to mid-rail for AC signals.',
    refs: [{ title: 'Op-amp specifications', where: 'TI SLOA011, ch. 8-12' }],
  }),
  C({
    id: 'input_protection',
    name: 'Input protection and clamping',
    domain: 'safety',
    level: 4,
    prereq: ['diode_behaviour'],
    formulas: [
      { expr: 'I_clamp = (V_fault − V_rail − V_f) / R_series', note: 'Series resistance sets the clamp current.' },
      { expr: 'Keep I_clamp ≤ 10mA into an IC clamp diode', note: 'Typical absolute maximum for MCU pins.' },
    ],
    applies: 'Anything leaving the board can come back with the wrong voltage. A series resistor plus clamp diodes keeps that fault away from the silicon.',
    standards: 'TVS diodes on connectors for ESD (IEC 61000-4-2); series resistor sized so the clamp survives the worst case.',
    refs: [{ title: 'ESD protection', where: 'TI SLVA680, "System-Level ESD Protection Guide"' }],
  }),

  // ---------------------------------------------------------------- level 5
  C({
    id: 'sensor_interface',
    name: 'Resistive sensor interfacing',
    domain: 'sensors',
    level: 5,
    prereq: ['voltage_divider', 'opamp_feedback'],
    formulas: [
      { expr: 'V_out = V_ref · R_sensor / (R_sensor + R_fixed)', note: 'Divider output.' },
      { expr: 'Best sensitivity when R_fixed ≈ R_sensor at the temperature of interest', note: 'Centres the output near mid-rail.' },
      { expr: 'β equation: 1/T = 1/T0 + (1/β)·ln(R/R0)', note: 'NTC thermistor resistance versus temperature.' },
    ],
    applies: 'Turn a resistance change into a voltage the ADC can read, then buffer it so sampling does not disturb the reading.',
    standards: 'Ratiometric measurement: power the divider from the same reference the ADC uses, and supply noise cancels out.',
    refs: [{ title: 'Thermistor measurement', where: 'TI SBAA338, "Temperature sensing with NTC thermistors"' }],
  }),
  C({
    id: 'adc_frontend',
    name: 'ADC front ends',
    domain: 'mixed',
    level: 5,
    prereq: ['rc_time_constant', 'opamp_practical'],
    formulas: [
      { expr: 'LSB = V_ref / 2^n', note: 'Resolution of one code.' },
      { expr: 'f_sample > 2·f_signal', note: 'Nyquist: filter everything above it away first.' },
      { expr: 'R_source · C_sample ≪ t_acquisition', note: 'The sampling capacitor must charge fully within the acquisition window.' },
    ],
    applies: 'An ADC input is a switched capacitor, not a voltmeter. It needs a low-impedance source and a band-limited signal.',
    standards: 'Keep source impedance below the datasheet maximum (often ≤10kΩ); add an anti-alias filter before sampling.',
    refs: [{ title: 'ADC driving', where: 'Microchip AN693; TI SBAA359 "ADC input driving"' }],
  }),
  C({
    id: 'instrumentation',
    name: 'Differential and instrumentation amplifiers',
    domain: 'sensors',
    level: 5,
    prereq: ['opamp_practical'],
    formulas: [
      { expr: 'V_out = A·(V+ − V−)', note: 'Only the difference is amplified.' },
      { expr: 'CMRR = 20·log10(A_diff / A_cm) dB', note: 'How well common-mode noise is rejected.' },
      { expr: '3-op-amp in-amp gain = 1 + 2R1/R_gain', note: 'One resistor sets gain.' },
    ],
    applies: 'Small differential signals riding on noise: bridges, shunts, thermocouples: need difference amplification, not single-ended gain.',
    standards: 'Matched resistors set CMRR: 0.1% parts give roughly 60dB. Provide a DC path for the input bias currents.',
    refs: [{ title: 'In-amp design', where: 'Analog Devices, "A Designer\'s Guide to Instrumentation Amplifiers"' }],
  }),
  C({
    id: 'current_sensing',
    name: 'Current sensing',
    domain: 'sensors',
    level: 5,
    prereq: ['instrumentation', 'power_dissipation'],
    formulas: [
      { expr: 'V_shunt = I_load · R_shunt', note: 'Keep it small enough not to disturb the load.' },
      { expr: 'P_shunt = I² · R_shunt', note: 'Shunt heating, and its tempco changes the reading.' },
      { expr: 'Typical V_shunt full scale: 25-100mV', note: 'A compromise between loss and signal size.' },
    ],
    applies: 'Low-side sensing is simple but breaks the ground path; high-side needs an amplifier that tolerates the rail as common mode.',
    standards: 'Kelvin (4-wire) connections to the shunt, or trace resistance becomes part of your measurement.',
    refs: [{ title: 'Current sense amplifiers', where: 'TI SBOA165, "Getting started with current sense amplifiers"' }],
  }),

  // ---------------------------------------------------------------- level 6
  C({
    id: 'i2c_bus',
    name: 'I²C bus design',
    domain: 'comms',
    level: 6,
    prereq: ['pull_resistors', 'logic_levels'],
    formulas: [
      { expr: 'R_pull(max) = t_r / (0.8473 · C_bus)', note: 'Rise-time limit: 1µs at 100kHz, 300ns at 400kHz.' },
      { expr: 'R_pull(min) = (V_dd − 0.4V) / 3mA', note: 'The target must still be able to pull the line low.' },
    ],
    applies: 'Open-drain devices only pull down; the pull-ups create every rising edge, so they set the maximum bus speed.',
    standards: 'NXP UM10204 defines timing, addressing and the 400pF total bus capacitance limit.',
    refs: [{ title: 'I²C specification', where: 'NXP UM10204, "I2C-bus specification and user manual"' }],
  }),
  C({
    id: 'spi_bus',
    name: 'SPI and synchronous serial',
    domain: 'comms',
    level: 6,
    prereq: ['logic_levels'],
    formulas: [
      { expr: 'f_max limited by round-trip delay and trace length', note: 'Clock skew and propagation matter above ~10MHz.' },
      { expr: 'Series termination R ≈ Z0 − R_out', note: 'Damps ringing on fast edges over long traces.' },
    ],
    applies: 'Push-pull, point-to-point, one chip-select per device. No pull-ups needed, but idle chip-selects must be defined.',
    standards: 'Pull /CS high with a resistor so a device is never selected while the MCU is in reset.',
    refs: [{ title: 'SPI block guide', where: 'Motorola/NXP SPI Block Guide V03.06' }],
  }),
  C({
    id: 'level_shifting',
    name: 'Level shifting between rails',
    domain: 'comms',
    level: 6,
    prereq: ['logic_levels', 'transistor_switch'],
    formulas: [
      { expr: 'MOSFET translator: V_GS = V_low_rail', note: 'The classic bidirectional I²C shifter.' },
      { expr: 'Divider shifter only works one way (high → low)', note: 'And only at low speed.' },
    ],
    applies: 'Mixed 1.8/3.3/5V systems need translation that respects direction, speed and open-drain versus push-pull.',
    standards: 'Never feed 5V into a 3.3V pin without translation: even briefly, the clamp diode conducts into the rail.',
    refs: [{ title: 'Level translation', where: 'NXP AN10441, "Level shifting techniques in I2C-bus design"' }],
  }),
  C({
    id: 'oscillators',
    name: 'Oscillators and clocking',
    domain: 'timing',
    level: 6,
    prereq: ['rc_time_constant'],
    formulas: [
      { expr: '555 astable: f = 1.44 / ((R1 + 2R2)·C)', note: 'Charge through R1+R2, discharge through R2.' },
      { expr: '555 monostable: t = 1.1 · R · C', note: 'One-shot pulse width.' },
      { expr: 'Crystal load caps: C_L = (C1·C2)/(C1+C2) + C_stray', note: 'Wrong load caps means the wrong frequency.' },
    ],
    applies: 'Timing comes from an RC (cheap, ±10%), a crystal (±20ppm) or a silicon oscillator: pick by the accuracy the job needs.',
    standards: 'Keep crystal traces short and guarded by ground; a 10nF cap on 555 pin 5 keeps supply noise out of the threshold.',
    refs: [{ title: 'NE555 datasheet', where: 'TI SA555/NE555, "Detailed Design Procedure"' }],
  }),

  // ---------------------------------------------------------------- level 7
  C({
    id: 'motor_drive',
    name: 'Motor and inductive-load drive',
    domain: 'mechatronics',
    level: 7,
    prereq: ['transistor_switch', 'diode_behaviour'],
    formulas: [
      { expr: 'V_L = −L · di/dt', note: 'Why interrupting inductor current produces a destructive spike.' },
      { expr: 'Flyback diode I_F ≥ I_load, V_R ≥ 2× rail', note: 'Sizing the clamp.' },
      { expr: 'I_stall = V / R_winding', note: 'The worst-case current your switch must survive.' },
    ],
    applies: 'Motors, relays and solenoids store energy in a magnetic field; the switch must have somewhere to send that energy.',
    standards: 'Always fit a flyback path. Separate motor and logic supplies, or the commutation noise resets your MCU.',
    refs: [{ title: 'Driving inductive loads', where: 'ON Semi AND8153; TI SLVA321' }],
  }),
  C({
    id: 'isolation',
    name: 'Isolation and optocoupling',
    domain: 'safety',
    level: 7,
    prereq: ['led_drive', 'transistor_switch'],
    formulas: [
      { expr: 'CTR = I_C / I_F', note: 'Current transfer ratio: sets the LED drive you need.' },
      { expr: 'R_LED = (V_drive − V_f) / I_F', note: 'The input side is just an LED.' },
      { expr: 'R_pullup = (V_out_rail − V_CE(sat)) / I_C', note: 'Output side is an open-collector transistor.' },
    ],
    applies: 'Isolation breaks the ground connection between domains: mains-referenced circuits, noisy motor drives, long cable runs.',
    standards: 'CTR degrades with age: design for the datasheet minimum, not typical. Respect creepage/clearance under IEC 60950/62368.',
    refs: [{ title: 'Optocoupler design', where: 'Vishay AN 6001, "Optocoupler Designer\'s Guide"' }],
  }),
  C({
    id: 'switching_supplies',
    name: 'Switch-mode power conversion',
    domain: 'power',
    level: 7,
    prereq: ['linear_regulation', 'capacitor_basics'],
    formulas: [
      { expr: 'Buck: V_out = D · V_in', note: 'D is the duty cycle.' },
      { expr: 'ΔI_L = (V_in − V_out)·D / (L·f_sw)', note: 'Inductor ripple current: target 30% of I_out.' },
      { expr: 'ΔV_out ≈ ΔI_L / (8·f_sw·C_out) + ΔI_L·ESR', note: 'Output ripple.' },
    ],
    applies: 'Switchers convert efficiently but generate noise. Layout, not the schematic: decides whether the design works.',
    standards: 'Keep the input capacitor loop tiny; it carries the highest di/dt on the board. Follow the datasheet layout exactly.',
    refs: [{ title: 'Buck converter design', where: 'TI SLVA477, "Basic Calculation of a Buck Converter\'s Power Stage"' }],
  }),
  C({
    id: 'emc_practice',
    name: 'EMC and signal integrity',
    domain: 'emc',
    level: 7,
    prereq: ['decoupling', 'oscillators'],
    formulas: [
      { expr: 'Loop area ∝ radiated emission', note: 'Minimise the area enclosed by a current and its return.' },
      { expr: 'Z0 ≈ 50Ω typical for a controlled-impedance trace', note: 'Match when the edge rate makes the trace a transmission line.' },
      { expr: 't_r < 2 × propagation delay → treat as transmission line', note: 'The rule of thumb for when termination matters.' },
    ],
    applies: 'Return current follows the path of least impedance, directly under the trace at high frequency. Break that path and you radiate.',
    standards: 'Continuous ground reference under signals; series termination on fast edges; ferrites and π-filters on cables.',
    refs: [{ title: 'EMC engineering', where: 'Henry Ott, Electromagnetic Compatibility Engineering' }],
  }),
  C({
    id: 'mcu_hardware_contract',
    name: 'MCU hardware contracts',
    domain: 'mcu',
    // Level 4: knowing that /RESET needs a pull-up, that every pin needs a
    // defined state and that decoupling belongs at the pin is junior-design
    // work, well before bus design or firmware-heavy systems.
    level: 4,
    prereq: ['decoupling', 'pull_resistors'],
    formulas: [
      { expr: 'I_pin(max) typically 20-40mA, total port current limited too', note: 'Check both per-pin and per-package limits.' },
      { expr: 'V_IH = 0.7·VDD for most CMOS MCU inputs', note: 'Sensor outputs must reach it.' },
    ],
    applies:
      'Firmware behaviour is a contract the hardware must support: which pins are outputs, which need internal or external pulls, what state they hold during reset.',
    standards:
      'Every unused pin gets a defined state. /RESET always pulled up. Boot/strap pins must be at their required level at power-up, before any code runs.',
    refs: [{ title: 'Hardware design checklists', where: 'Microchip AN2519; ST AN4488 "Getting started with STM32 hardware development"' }],
  }),

  // ---------------------------------------------------------------- level 8
  C({
    id: 'mixed_signal_partitioning',
    name: 'Mixed-signal partitioning',
    domain: 'mixed',
    level: 8,
    prereq: ['adc_frontend', 'emc_practice', 'switching_supplies'],
    formulas: [
      { expr: 'SNR_max = 6.02·n + 1.76 dB', note: 'Ideal ADC signal-to-noise for n bits: noise you add eats into it.' },
      { expr: 'Ferrite + capacitor π filter for analog rails', note: 'Isolate the analog supply from digital switching noise.' },
    ],
    applies: 'Analog and digital sections share a board but must not share return currents. Partition supplies, grounds and layout deliberately.',
    standards: 'Single-point connection between analog and digital ground, placed at the converter. Never route digital signals over the analog return.',
    refs: [{ title: 'Mixed-signal grounding', where: 'Analog Devices MT-031, "Grounding Data Converters"' }],
  }),
  C({
    id: 'reliability_design',
    name: 'Reliability, derating and worst case',
    domain: 'safety',
    level: 8,
    prereq: ['power_dissipation', 'linear_regulation'],
    formulas: [
      { expr: 'Worst case = tolerance stack, not typical values', note: 'Add tolerances in the direction that hurts.' },
      { expr: 'Arrhenius: rate doubles roughly every 10°C', note: 'Heat is the enemy of lifetime.' },
      { expr: 'Electrolytic life: L = L0 · 2^((T0 − T)/10)', note: 'Capacitor lifetime versus temperature.' },
    ],
    applies: 'A design that works at nominal values but fails at the tolerance corners is not a design: it is a prototype.',
    standards: 'Derate voltage to 80%, power to 50%, and verify the design at min/max supply, temperature and component tolerance.',
    refs: [{ title: 'Derating guidelines', where: 'NASA EEE-INST-002; MIL-HDBK-1547' }],
  }),
  C({
    id: 'protection_systems',
    name: 'System protection',
    domain: 'safety',
    level: 8,
    prereq: ['input_protection', 'diode_behaviour'],
    formulas: [
      { expr: 'Reverse polarity: P = I² · R_DS(on) for a P-FET', note: 'Far more efficient than a series diode.' },
      { expr: 'Fuse I²t must be below the protected part\'s I²t', note: 'The fuse has to blow first.' },
      { expr: 'TVS V_clamp < absolute-max of what it protects', note: 'And V_reverse-standoff above the normal operating voltage.' },
    ],
    applies: 'Real products survive reversed supplies, shorted outputs, ESD at connectors and inductive kickback from anything they drive.',
    standards: 'Layer protection: TVS at the connector, series impedance, then the clamp at the device. Fuse in the supply path.',
    refs: [{ title: 'Circuit protection', where: 'Littelfuse Selection Guides; TI SLVA689' }],
  }),
];

const BY_ID = new Map(CONCEPTS.map((c) => [c.id, c]));

export function getConcept(id) {
  return BY_ID.get(id) || null;
}

export function conceptsByLevel(level) {
  return CONCEPTS.filter((c) => c.level === level);
}

export function conceptsUpToLevel(level) {
  return CONCEPTS.filter((c) => c.level <= level);
}

/** The theory card for a challenge: merged formulas, application and reading. */
export function theoryFor(conceptIds = []) {
  const concepts = conceptIds.map(getConcept).filter(Boolean);
  return concepts.map((c) => ({
    id: c.id,
    name: c.name,
    domain: DOMAINS[c.domain] || c.domain,
    formulas: c.formulas,
    applies: c.applies,
    standards: c.standards,
    refs: c.refs,
  }));
}

export const CONCEPT_COUNT = CONCEPTS.length;
