/**
 * Spec generator.
 *
 * Turns a catalogue listing into a complete 12-section project specification
 * without shipping any per-project text.
 *
 * How it works: each listing is matched to an archetype by scanning its title
 * and site categories. The archetype supplies the engineering substance — the
 * build phases, bill of materials, fault modes, safety notes — and the
 * generator substitutes the real project title, branch and level. The result is
 * a usable build plan scaffold, not a hand-researched write-up: entries that
 * land on the same archetype share structure and differ mainly by title and
 * category.
 *
 * Everything below is original text written for this project.
 */

import type {
  BOMItem,
  BuildPhase,
  Project,
  ProjectDescription,
  TroubleshootingItem,
} from '../types';
import type { CatalogueEntry } from './catalogue';

/* ------------------------------------------------------------------ helpers */

const rupees = (n: number) => String(n);

interface Archetype {
  key: string;
  label: string;
  branch: Project['branch'];
  category: string;
  level: Project['level'];
  duration: string;
  keywords: string[];
  cats: string[];
  overview: (t: string) => string;
  problem: (t: string) => string;
  objectives: string[];
  prereqs: string[];
  architecture: (t: string) => string;
  phases: { title: string; desc: string; duration: string; tasks: string[] }[];
  bom: BOMItem[];
  validation: string[];
  faults: TroubleshootingItem[];
  extensions: string[];
  safety: string[];
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const lower = (s: string) => s.toLowerCase();

/* -------------------------------------------------------------- archetypes */

const ARCHETYPES: Archetype[] = [
  {
    key: 'iot-sensor',
    label: 'IoT & Sensor Node',
    branch: 'Electronics',
    category: 'IoT & Sensor Networks',
    level: 'Intermediate',
    duration: '4-5 weeks',
    keywords: [
      'iot', 'sensor', 'monitor', 'smart', 'weather', 'temperature', 'humidity',
      'gas', 'water level', 'detection system', 'tracking', 'telemetry',
      'environment', 'air quality', 'soil', 'data logger', 'remote monitoring',
    ],
    cats: ['Electronics Projects', 'Hardware Projects'],
    overview: (t) =>
      `${cap(t)} is a field-deployed sensing node that measures its target quantity, applies calibration, and reports readings to a remote endpoint without human retrieval. The build forces attention to the three things that decide whether a sensor node survives outside the lab: sensor warm-up behaviour, average current draw, and what happens when the network disappears.`,
    problem: (t) =>
      `Manual measurement of the quantity in "${t}" depends on someone being present at the right moment, so readings are sparse and rarely defensible. Cheap continuous measurement exists but is usually treated as a toy, because most designs fail on power budget, drift, or connectivity rather than on the measurement itself. The practical gap is a node that runs unattended for weeks, records a defensible number, and says so honestly when it cannot.`,
    objectives: [
      'Calibrate analog and digital sensors against a known reference and store coefficients in non-volatile memory',
      'Compute average current draw and use duty cycling to reach a defensible milliamp-hour budget',
      'Buffer readings locally with sequence numbers so dropped samples are detectable rather than silent',
      'Publish a documented, versioned payload over a network link with reconnect and backoff behaviour',
      'Detect and flag sensor faults instead of reporting a plausible-looking wrong number',
    ],
    prereqs: [
      'Embedded C or C++ and reading a datasheet end to end',
      'I2C, SPI and ADC peripherals on a development board',
      'Multimeter, breadboard and soldering of through-hole parts',
      'Any Wi-Fi, LoRa or cellular enabled board (ESP32 recommended)',
    ],
    architecture: (t) =>
      `Sensor head feeds the microcontroller ADC and digital buses. Firmware samples on a fixed schedule, discards the first reading after power-up, calibrates against stored coefficients, then writes a record containing timestamp, value, battery voltage and sequence number. Records buffer to flash when the link is down and flush on reconnect. A remote broker accepts the payload and a small service stores history and evaluates threshold rules, raising an alert when "${t}" exceeds its configured limits.`,
    phases: [
      {
        title: 'Sensor bring-up and calibration',
        desc: 'Prove each sensor reads something plausible before writing any application logic.',
        duration: '1 week',
        tasks: [
          'Read raw ADC counts at three or more known reference points',
          'Fit a calibration curve and store the coefficients',
          'Measure sensor warm-up drift over ten minutes and choose a settling delay',
          'Characterise repeatability by taking twenty readings at a fixed point',
        ],
      },
      {
        title: 'Power budget and duty cycling',
        desc: 'Decide what the node may draw, then design the sleep cycle to meet it.',
        duration: '1 week',
        tasks: [
          'Measure current for every subsystem separately, awake and idle',
          'Implement a non-blocking scheduler with no delay-based timing',
          'Enter deep sleep between samples and verify wake reliability over many cycles',
          'Calculate expected battery life and record the assumption behind it',
        ],
      },
      {
        title: 'Logging with fault detection',
        desc: 'Make the record complete and honest, including when a sample is bad.',
        duration: '1 week',
        tasks: [
          'Define a fixed-width record and write it atomically',
          'Add sequence numbers and a checksum per record',
          'Flag out-of-range or stuck readings as suspect rather than storing them as valid',
          'Write a reader that reports gaps and suspect records separately',
        ],
      },
      {
        title: 'Connectivity and alerting',
        desc: 'Deliver data when the link works and survive when it does not.',
        duration: '1 week',
        tasks: [
          'Publish a versioned JSON payload on a documented topic',
          'Implement reconnect with exponential backoff',
          'Verify buffered records flush in order after an outage',
          'Raise a threshold alert and confirm it fires within one sampling interval',
        ],
      },
    ],
    bom: [
      { component: 'Wi-Fi microcontroller board', specification: 'ESP32 or equivalent, 4 MB flash', quantity: 1, estimatedCost: rupees(450) },
      { component: 'Primary sensor module', specification: 'Matched to the measured quantity, 3.3 V', quantity: 1, estimatedCost: rupees(380) },
      { component: 'Secondary/reference sensor', specification: 'For cross-checking drift', quantity: 1, estimatedCost: rupees(320) },
      { component: 'Li-ion cell and holder', specification: '3.7 V 2600 mAh protected', quantity: 1, estimatedCost: rupees(280) },
      { component: 'Charging module', specification: 'TP4056 with protection, 1 A', quantity: 1, estimatedCost: rupees(70) },
      { component: 'Power-gating MOSFET', specification: 'Logic-level N-channel plus gate resistor', quantity: 2, estimatedCost: rupees(60), notes: 'Cuts sensor idle current' },
      { component: 'Level shifter', specification: 'Bidirectional, if any module runs at 5 V', quantity: 1, estimatedCost: rupees(110) },
      { component: 'Waterproof enclosure', specification: 'IP65 ABS with cable gland', quantity: 1, estimatedCost: rupees(350) },
      { component: 'Vented PTFE membrane', specification: 'Water resistant, vapour permeable', quantity: 1, estimatedCost: rupees(90), notes: 'Essential for gas and humidity sensing' },
      { component: 'Wiring, headers, standoffs', specification: '22 AWG silicone, 0.1 in headers', quantity: 1, estimatedCost: rupees(200) },
    ],
    validation: [
      'Calibrated reading matches the reference within a stated tolerance across the operating range',
      'Stuck or out-of-range readings are flagged rather than stored as valid',
      'Measured average current meets the calculated battery-life budget',
      'Every scheduled sample produces a record or a visible gap marker',
      'Data buffered during an outage is delivered in order after reconnection',
      'A threshold alert fires within one sampling interval of the event',
      'Node survives a 72-hour run without an unexpected reset',
      'Configuration and counters survive a power cycle',
    ],
    faults: [
      { issue: 'Readings sit at an extreme value', cause: 'Sensor unpowered, shorted, or reading outside its calibrated span', solution: 'Check the power-gate gate voltage, then verify the sensor in a known reference condition' },
      { issue: 'Board resets during transmission', cause: 'Supply voltage collapsing as the radio draws current', solution: 'Add bulk capacitance at the 3.3 V rail and retest under load' },
      { issue: 'Connects then immediately disconnects', cause: 'Client keep-alive shorter than the broker timeout', solution: 'Raise the client keep-alive and set the broker timeout above twice that value' },
      { issue: 'Values drift steadily over hours', cause: 'Warm-up incomplete, or the sensor is self-heating', solution: 'Extend the settling delay, move the sensor away from regulators, and re-calibrate' },
      { issue: 'No data after a field deployment', cause: 'Enclosure sealed the vent, so the sensor sees stale trapped air', solution: 'Fit a vented membrane and repeat a 24-hour comparison against an open reference' },
    ],
    extensions: [
      'Add solar harvesting with a small panel and maximum-power-point tracking',
      'Replace Wi-Fi with LoRa to extend range to several kilometres',
      'Add a local display for readouts with no phone required',
      'Drive an actuator directly from the threshold rule for fully automatic operation',
      'Train a small forecasting model on the collected history',
      'Add a second node to measure spatial variation rather than a single point',
    ],
    safety: [
      'Never immerse the controller board or any module electronics',
      'Do not charge a lithium cell without a protection circuit',
      'Keep mains-voltage equipment away from the low-voltage analog front end',
      'Use a vented enclosure, or humidity and gas readings will be biased',
      'Confirm the node is safe to leave unattended before deploying it in weather',
    ],
  },

  {
    key: 'robotics',
    label: 'Robot & Autonomous Vehicle',
    branch: 'Mechanical',
    category: 'Robotics & Mechatronics',
    level: 'Advanced',
    duration: '6-8 weeks',
    keywords: [
      'robot', 'rover', 'drone', 'bot', 'vehicle', 'gripper', 'robotic arm',
      'autonomous', 'line follower', 'obstacle', 'solver', 'hexapod', 'quadcopter',
      'servo', 'automated', 'arm', 'crawler',
    ],
    cats: ['Mechanical Projects', 'Hardware Projects', 'Electronics Projects'],
    overview: (t) =>
      `${cap(t)} is a mobile or manipulator platform that must convert sensing into coordinated physical motion. The engineering is not in the individual actuator; it is in the coupling between perception, planning and the mechanics, where a small control error compounds into a trajectory that misses the target entirely.`,
    problem: (t) =>
      `A demonstration of "${t}" usually works on a bench and fails on the floor. Wheels slip, battery voltage sags, gear backlash accumulates, and a control loop tuned at full charge oscillates when it is nearly flat. This build treats the mechanical and control sides as one problem: the platform is characterised before it is commanded, and every success claim is backed by a measured number.`,
    objectives: [
      'Choose actuators from a torque and speed budget rather than by convenience',
      'Implement closed-loop position or velocity control with anti-windup',
      'Build a motion planner that respects the platform footprint and turning radius',
      'Fuse sensor input into localisation rather than assuming a known start pose',
      'Instrument the platform so success rate, tracking error and current draw are measured',
    ],
    prereqs: [
      'Control theory: feedback, poles, steady-state error',
      'Embedded C with timer interrupts and encoders',
      'Mechanical design, gear ratio calculation and backlash',
      'A soldering iron and the confidence to debug a mechanism that moves',
    ],
    architecture: (t) =>
      `A controller runs two loops at different rates: a fast inner loop closing on encoder feedback for each actuator, and a slower outer loop producing setpoints from the planner. A ranging or vision sensor feeds localisation, corrected against a reference mark so drift does not accumulate. The mechanical design provides a rigid chassis with a documented footprint, because the planner's turns are only valid if the geometry is known. For "${t}", power budget determines duty cycle, and the build records current draw for each manoeuvre class.`,
    phases: [
      {
        title: 'Mechanical design and actuator sizing',
        desc: 'Size the platform before any electronics exist, since the sizing sets everything else.',
        duration: '2 weeks',
        tasks: [
          'Compute required torque from payload mass, radius and worst-case acceleration',
          'Select motors and gearboxes with a documented safety factor',
          'Design a rigid chassis and document the footprint and turning radius',
          'Prototype one corner of the platform and measure its backlash',
        ],
      },
      {
        title: 'Actuator control loops',
        desc: 'Close each axis on real feedback, tuned rather than guessed.',
        duration: '1.5 weeks',
        tasks: [
          'Read encoders and compute error in a fixed-period interrupt',
          'Implement PID with output clamping and anti-windup',
          'Step the response at several gains and record where oscillation begins',
          'Add limit switches that stop motion before a mechanical end of travel',
        ],
      },
      {
        title: 'Localisation and planning',
        desc: 'Know where the platform is, then plan a path it can actually follow.',
        duration: '2 weeks',
        tasks: [
          'Fuse sensor data with dead reckoning and correct against a fixed reference',
          'Quantify position uncertainty after a typical run',
          'Implement a path planner that respects footprint and turning radius',
          'Add obstacle detection with a stop-and-recover behaviour',
        ],
      },
      {
        title: 'Integration and reliability run',
        desc: 'Run long enough for the failure modes to show up.',
        duration: '1.5 weeks',
        tasks: [
          'Run a full mission at least twenty times unattended',
          'Log success, failure reason and current draw for every run',
          'Fix the two most frequent failure modes and re-measure',
          'Report a success rate with a stated test set size',
        ],
      },
    ],
    bom: [
      { component: 'Geared DC or stepper motors', specification: 'Torque sized to payload with 2x margin', quantity: 2, estimatedCost: rupees(2200) },
      { component: 'Motor drivers', specification: 'Current-limited, with enable and fault output', quantity: 2, estimatedCost: rupees(900) },
      { component: 'Incremental encoders', specification: 'Per motor, 1024 CPR or better', quantity: 2, estimatedCost: rupees(1800) },
      { component: 'Microcontroller', specification: 'Multiple timers, enough RAM for a planner', quantity: 1, estimatedCost: rupees(800) },
      { component: 'Ranging sensor', specification: 'Ultrasonic or ToF, outdoor capable', quantity: 2, estimatedCost: rupees(600) },
      { component: 'Chassis materials', specification: 'Aluminium plate, 4-6 mm, with standoffs', quantity: 1, estimatedCost: rupees(1600) },
      { component: 'Wheels or tracks', specification: 'Sized to the required ground clearance', quantity: 2, estimatedCost: rupees(800) },
      { component: 'Battery pack', specification: 'Li-ion with BMS, sized for worst-case draw', quantity: 1, estimatedCost: rupees(2200) },
      { component: 'IMU', specification: '6-axis, for tilt and heading', quantity: 1, estimatedCost: rupees(700) },
      { component: 'Limit switches and emergency stop', specification: 'Normally closed, latching E-stop', quantity: 3, estimatedCost: rupees(600) },
    ],
    validation: [
      'Each axis reaches its setpoint within a stated steady-state tolerance',
      'Oscillation onset is characterised as gain is increased, and the final gain sits below it',
      'Limit switches stop motion before any mechanical end of travel',
      'Emergency stop halts motion within a specified distance',
      'Position uncertainty after a full run is reported as a number',
      'Wheel slip is detected rather than silently absorbed into the distance count',
      'At least twenty consecutive runs complete with no human intervention',
      'Success rate is reported with the test set size stated',
    ],
    faults: [
      { issue: 'Platform oscillates and the oscillation grows with gain', cause: 'Loop gain exceeds available phase margin, often worsened by gearbox backlash', solution: 'Reduce gain, add derivative action, and stiffen the encoder mount' },
      { issue: 'Drives fine on charge, misbehaves when flat', cause: 'Supply voltage sag under load invalidating the control tuning', solution: 'Measure voltage under load, add bulk capacitance, and retune at low battery' },
      { issue: 'Turns in a radius larger than expected', cause: 'Wheel slip or an unmodelled differential geometry', solution: 'Measure effective track width, and plan from the measured radius rather than the nominal one' },
      { issue: 'Position drifts steadily during a straight run', cause: 'Encoder counts disagreeing with real wheel circumference', solution: 'Re-measure circumference under load and correct the conversion factor' },
      { issue: 'Stalls in a turn and cannot recover', cause: 'Torque margin insufficient at the worst-case moment, not at steady state', solution: 'Measure peak current in a static turn and resize with margin' },
      { issue: 'Path planner sends the platform into a wall', cause: 'Footprint modelled smaller than the real chassis', solution: 'Re-measure the footprint including wheels, and inflate it in the planner' },
    ],
    extensions: [
      'Add computer vision for target recognition and autonomous task selection',
      'Implement a state machine that recovers from being stuck without external help',
      'Add a battery management system that reduces duty cycle as charge falls',
      'Log a full mission trace and analyse where time is actually spent',
      'Add a remote telemetry link so failures can be diagnosed after the fact',
      'Extend to a second axis and decouple the control loops properly',
    ],
    safety: [
      'Guard all rotating parts and moving linkages before powered testing',
      'Fit a working emergency stop and test it before every run',
      'Secure the payload so it cannot become a projectile in a fault',
      'Keep hands clear of pinch points and never disable a limit switch',
      'Use a current-limited supply and confirm the charger matches the cell chemistry',
      'Test at reduced power first, with the platform raised clear of the ground',
    ],
  },

  {
    key: 'power-solar',
    label: 'Solar & Power Systems',
    branch: 'Electronics',
    category: 'Power & Energy',
    level: 'Intermediate',
    duration: '4-6 weeks',
    keywords: [
      'solar', 'energy', 'power', 'battery', 'inverter', 'charger', 'streetlight',
      'smoke', 'harvesting', 'grid', 'meter', 'load',
    ],
    cats: ['Electronics Projects', 'Hardware Projects'],
    overview: (t) =>
      `${cap(t)} converts or stores energy from a constrained source, and the whole design turns on one question: what happens when the input is not what you assumed. Battery charging, load regulation, and brownout behaviour dominate this build far more than the conversion stage does.`,
    problem: (t) =>
      `Systems built around "${t}" commonly fail at the edges — full battery, deep discharge, sudden load removal, or a cold morning that halves available power. Bench testing under ideal conditions hides all four. This build characterises the source and the storage across their real operating range, and designs the protection paths before the nominal path.`,
    objectives: [
      'Characterise the source across its real range rather than a single nominal point',
      'Design a charging profile with correct termination and thermal margin',
      'Implement load regulation that holds up through input brownout',
      'Protect the battery from over-discharge, over-charge and inrush',
      'Measure a full energy budget and state the efficiency at each conversion stage',
    ],
    prereqs: [
      'Understanding of charging curves, cell chemistry and series/parallel balancing',
      'Switching converter theory: buck, boost and their modes',
      'Oscilloscope use, including probe loading',
      'Basic thermal management and enclosure design',
    ],
    architecture: () =>
      `Source conditioning feeds a switching stage with a feedback loop regulating the output. A charge controller enforces a proper charging profile and terminates on a criterion rather than a timer. Load switches isolate the battery from the load during deep discharge, and an under-voltage lockout prevents damage. Efficiency is measured at input and output across the working range, and the losses are attributed to specific stages rather than reported as one number.`,
    phases: [
      {
        title: 'Source characterisation',
        desc: 'Find out what the source really delivers before designing around it.',
        duration: '1 week',
        tasks: [
          'Log source voltage and available power over a full day or cycle',
          'Identify the worst-case and best-case conditions',
          'Measure output impedance and startup behaviour under load',
        ],
      },
      {
        title: 'Conversion and regulation',
        desc: 'Build the power stage and prove it holds its output.',
        duration: '1.5 weeks',
        tasks: [
          'Design and build the switching stage with the loop compensation worked out',
          'Measure ripple at the output with a scope, accounting for probe ground effects',
          'Load test from minimum to maximum and record the regulation curve',
          'Measure efficiency at several operating points',
        ],
      },
      {
        title: 'Charging and protection',
        desc: 'Get the storage right, because a damaged cell is unrecoverable.',
        duration: '1.5 weeks',
        tasks: [
          'Implement a proper charging profile with correct termination',
          'Add over-charge, over-discharge and short-circuit protection',
          'Verify cell balancing if the pack is series-connected',
          'Test the protection paths deliberately and confirm they actually trip',
        ],
      },
      {
        title: 'Integration and efficiency budget',
        desc: 'Close the system and account for every watt.',
        duration: '1-2 weeks',
        tasks: [
          'Integrate source, storage, conversion and load in one enclosure',
          'Build the energy budget and attribute losses to specific stages',
          'Run a long-duration test and report the end-to-end efficiency',
        ],
      },
    ],
    bom: [
      { component: 'Solar panel', specification: 'Sized from the measured daily energy budget', quantity: 1, estimatedCost: rupees(900) },
      { component: 'Charge controller', specification: 'MPPT where justified, otherwise series PWM', quantity: 1, estimatedCost: rupees(700) },
      { component: 'Switching converter components', specification: 'Inductor, MOSFETs, diodes per the design', quantity: 1, estimatedCost: rupees(500) },
      { component: 'LiFePO4 or Li-ion pack', specification: 'With BMS, sized to the energy budget', quantity: 1, estimatedCost: rupees(3200) },
      { component: 'Battery protection circuit', specification: 'Over-charge, over-discharge, over-current', quantity: 1, estimatedCost: rupees(350) },
      { component: 'Load switches and fuses', specification: 'Rated for inrush, resettable where appropriate', quantity: 2, estimatedCost: rupees(300) },
      { component: 'Current and voltage sensing', specification: 'Shunt plus amplifier, or hall sensor', quantity: 1, estimatedCost: rupees(600) },
      { component: 'Microcontroller', specification: 'For monitoring, logging and load control', quantity: 1, estimatedCost: rupees(500) },
      { component: 'Ventilated outdoor enclosure', specification: 'IP-rated, with a vent path', quantity: 1, estimatedCost: rupees(900) },
      { component: 'Fuses, terminals, busbars', specification: 'Sized for the maximum fault current', quantity: 1, estimatedCost: rupees(500) },
    ],
    validation: [
      'Source output is logged across a full cycle, not measured at one convenient moment',
      'Output voltage stays within tolerance from minimum to maximum load',
      'Output ripple is measured and stated at a stated bandwidth',
      'Efficiency is reported at multiple operating points, not just peak',
      'Charging terminates on a criterion, and the criterion is demonstrated',
      'Over-charge and over-discharge protection are each triggered and verified in a test',
      'A sudden load removal does not overshoot into a damaging voltage',
      'End-to-end energy budget accounts for every stage',
    ],
    faults: [
      { issue: 'Controller resets when the source voltage drops', cause: 'Input impedance too low, or no input bulk capacitance', solution: 'Add input capacitance and confirm the source can supply the inrush' },
      { issue: 'Output overshoots sharply on load removal', cause: 'Control loop response too slow for the load step', solution: 'Tune the compensation for the load step, and verify with a scope in a real load dump' },
      { issue: 'Battery never reaches full charge', cause: 'Charging termination set on time rather than on a cell condition', solution: 'Implement a proper termination criterion and verify the cell is actually full' },
      { issue: 'Efficiency collapses at low input voltage', cause: 'Design optimised for nominal input only', solution: 'Re-characterise the conversion stage across the real input range' },
      { issue: 'Cell damaged after a few cycles', cause: 'Cell imbalance in a series pack with no balancing', solution: 'Add balancing, and verify individual cell voltages stay within limits' },
      { issue: 'Enclosure interior is much hotter than expected', cause: 'Converter dissipation with no thermal path', solution: 'Provide a conduction path to the enclosure and re-measure temperature rise' },
    ],
    extensions: [
      'Add MPPT tracking and measure how much energy it actually recovers',
      'Add energy metering with daily reporting and a cost estimate',
      'Add load prioritisation so essential loads survive a shortfall',
      'Add remote reporting over a low-power link',
      'Add a second source and implement source selection',
      'Build a supercapacitor buffer to survive brief source interruptions',
    ],
    safety: [
      'A lithium cell can cause a fire; never leave a pack charging unattended',
      'Never short the pack terminals, even briefly, during assembly',
      'Use a fuse sized for the wiring and the battery chemistry',
      'Do not connect or disconnect a lithium cell while it is being charged',
      'Keep the enclosure vented or the converter will overheat',
      'Treat any mains-connected part as live even when switched off',
    ],
  },

  {
    key: 'fpga-dsp',
    label: 'FPGA & Digital Design',
    branch: 'Electronics',
    category: 'Digital Electronics & HDL',
    level: 'Advanced',
    duration: '6-8 weeks',
    keywords: [
      'fpga', 'vhdl', 'verilog', 'digital', 'logic', 'counter', 'traffic',
      'hardware', 'vga', 'lcd', 'adder', 'multiplier', 'uart', 'protocol',
    ],
    cats: ['Electronics Projects', 'Hardware Projects'],
    overview: (t) =>
      `${cap(t)} is a hardware design, so correctness is a property of timing rather than of program flow. Building it means writing testbenches that can actually prove the design, constraining the toolchain honestly, and reading the timing report rather than assuming the tool handled it.`,
    problem: (t) =>
      `Simulation always passes on the first try until it doesn't, and a design that simulates perfectly can still fail on silicon for reasons the simulation never modelled. For "${t}", the real risk sits in the gap between the model and the hardware: unsynchronised inputs, combinational paths that violate setup, and constraints that were never written. This build treats that gap as the primary engineering problem.`,
    objectives: [
      'Separate combinational next-state logic from sequential state register updates',
      'Write self-checking testbenches with documented pass criteria',
      'Synchronise asynchronous inputs properly and prove the synchroniser works under jitter',
      'Constrain pin locations and clock timing, and read the timing report critically',
      'Reconcile simulation against silicon and explain any difference',
    ],
    prereqs: [
      'Boolean algebra, state machines and basic digital design',
      'VHDL or Verilog reading ability',
      'A vendor toolchain such as Vivado, Quartus or apicula',
      'Any FPGA board, plus the board constraint file',
    ],
    architecture: (t) =>
      `Inputs pass through a synchroniser and a debounce stage before reaching any logic. A clock enable derived from the board oscillator paces every stateful block. The design decomposes into a datapath and a controller, with the controller expressed as an explicit state machine whose illegal states are detected and recovered. For "${t}", the constraint set defines the real interface, and the timing report is treated as a deliverable rather than a build artefact.`,
    phases: [
      {
        title: 'Interface conditioning',
        desc: 'Make external pins safe to sample on a clock edge.',
        duration: '1 week',
        tasks: [
          'Write synchronisers for every asynchronous input',
          'Implement a counter-based debouncer with a configurable constant',
          'Drive inputs with random jitter in simulation and assert no false detections',
          'Confirm synthesised logic matches simulation for the same stimuli',
        ],
      },
      {
        title: 'Core state machine',
        desc: 'Build the controller and prove its illegal states are unreachable.',
        duration: '2 weeks',
        tasks: [
          'Define states and transitions explicitly, including recovery states',
          'Implement next-state logic combinationally, registered output',
          'Add assertions that no illegal state or output combination is reachable',
          'Prove the assertions across an exhaustive or formal check where possible',
        ],
      },
      {
        title: 'Constraints, synthesis and timing',
        desc: 'Close timing deliberately and understand what the report is telling you.',
        duration: '1.5 weeks',
        tasks: [
          'Write the pin constraint file and verify the pin report',
          'Synthesise and record utilisation',
          'Read the critical path and add pipeline stages until timing closes with margin',
          'Run static timing analysis and record positive slack, not just "it built"',
        ],
      },
      {
        title: 'Hardware bring-up',
        desc: 'Reconcile the board with the simulation and explain every difference.',
        duration: '1.5 weeks',
        tasks: [
          'Program the board and drive a known stimulus',
          'Compare observed outputs against the simulated sequence',
          'Investigate any mismatch rather than adjusting the testbench to match',
          'Document the final design and the timing summary',
        ],
      },
    ],
    bom: [
      { component: 'FPGA development board', specification: '>= 4 K LUT, 3.3 V IO, clock and reset', quantity: 1, estimatedCost: rupees(1800) },
      { component: 'C-mount or discrete interface components', specification: 'Matched to the board IO standard', quantity: 1, estimatedCost: rupees(800) },
      { component: 'LED modules with series resistors', specification: 'Never driven directly from an IO pin', quantity: 8, estimatedCost: rupees(200) },
      { component: 'Switches or push buttons', specification: 'Debounced in design', quantity: 4, estimatedCost: rupees(100) },
      { component: 'Seven-segment display', specification: 'If a numeric output is required', quantity: 1, estimatedCost: rupees(220) },
      { component: 'Level shifters', specification: 'For any 5 V peripheral', quantity: 2, estimatedCost: rupees(140) },
      { component: 'Logic analyser', specification: '8-16 channel, for bring-up', quantity: 1, estimatedCost: rupees(4500), notes: 'Reusable across projects' },
      { component: 'Breadboard and jumpers', specification: '830-point with mixed jumper set', quantity: 1, estimatedCost: rupees(300) },
      { component: 'Current-limited bench supply', specification: '5 V 2 A minimum', quantity: 1, estimatedCost: rupees(900) },
    ],
    validation: [
      'Debounce testbench passes across many thousands of random jitter trials',
      'Assertions confirm no illegal state or output combination is reachable',
      'Synthesis utilisation is recorded against the device capacity',
      'Static timing analysis closes at the target clock with positive slack',
      'Pin assignment report matches the intended board wiring',
      'Board output matches the simulated sequence for at least one full operation',
      'Any silicon-versus-simulation difference is explained, not tolerated',
    ],
    faults: [
      { issue: 'Fails timing closure after synthesis', cause: 'Combinational path too long, commonly a wide comparator chain', solution: 'Insert a pipeline register and re-read the critical path report' },
      { issue: 'Simulation passes but the board misbehaves', cause: 'Unconstrained or wrongly constrained pins, or a clock not reaching the fabric', solution: 'Review the constraint file and the pin location report' },
      { issue: 'Testbench appears to hang', cause: 'An absolute-time wait that no event can satisfy', solution: 'Rewrite waits in clock cycles so a regression cannot stall' },
      { issue: 'Design will not fit the available logic cells', cause: 'Wide counters and comparators consuming routing', solution: 'Split into high and low halves and compare hierarchically' },
      { issue: 'Intermittent behaviour after power cycling', cause: 'Uninitialised registers, or a design relying on simulation-only initial values', solution: 'Initialise every register explicitly and declare the reset behaviour' },
      { issue: 'LEDs flicker at a switching instant', cause: 'Output changing close to a clock edge', solution: 'Double-register the output to remove the hazard window' },
    ],
    extensions: [
      'Add an interrupt controller and a simple host protocol over UART',
      'Implement a hardware watchdog that forces a safe state',
      'Add pipelining and measure the resulting throughput improvement',
      'Move the state machine to a soft core and compare flexibility against area',
      'Add a formal property proving a safety invariant holds',
      'Build a self-test routine that runs at power-on and reports pass or fail',
    ],
    safety: [
      'Keep 3.3 V and 5 V peripherals on separate, level-shifted rails',
      'Series-resist every indicator; never drive one directly from an IO pin',
      'Use a current-limited supply on first power-up',
      'Static discharge can damage an FPGA; ground yourself before handling a board',
      'A design model is a demonstration, not a device for controlling anything hazardous',
    ],
  },

  {
    key: 'plc-automation',
    label: 'PLC & Process Automation',
    branch: 'Instrumentation',
    category: 'PLC & Automation',
    level: 'Intermediate',
    duration: '4-6 weeks',
    keywords: [
      'plc', 'automation', 'scada', 'hmi', 'filling', 'bottling', 'packaging',
      'process control', 'assembly line', 'conveyor', 'pneumatic', 'hydraulic',
      'bottle', 'sorter', 'plant', 'control',
    ],
    cats: ['Electronics Projects', 'Mechanical Projects', 'Hardware Projects'],
    overview: (t) =>
      `${cap(t)} is a sequencing and interlocks problem. The intellectual content is in the transition table and the safety interlocks; the ladder logic itself is mechanical once the table is right. Getting the table right, and proving it, is the work.`,
    problem: (t) =>
      `Manual or semi-automatic "${t}" plants depend on operator discipline for sequencing and safety, which is exactly the assumption that fails under time pressure. A controller that derives its transitions from an explicit table, and refuses to continue when a sensor disagrees with the model, removes that dependence. The design is judged by how it behaves when inputs fail, not how quickly it runs when they do not.`,
    objectives: [
      'Write a complete state transition table before writing any ladder logic',
      'Implement interlocks that make an unsafe sequence structurally impossible',
      'Design fail-safe behaviour for every sensor, including power loss mid-cycle',
      'Build a manual and auto mode with clear precedence rules',
      'Simulate the sequence and prove that no state is unreachable or contradictory',
    ],
    prereqs: [
      'Boolean logic, relay logic and ladder diagram fundamentals',
      'Any PLC software (a free simulator is sufficient to start)',
      'Reading wiring diagrams and selecting appropriate sensors',
      'Pneumatic or hydraulic basics if the sequence involves actuators',
    ],
    architecture: () =>
      `Sensors feed input modules; each drives a physical input and, separately, contributes to a plausibility check. The controller runs one state machine driven from the transition table, with each step guarded by its own interlock condition. Actuator outputs are driven only from validated state. A manual mode can override individual steps but never an interlock. A status block exposes the current state, blocked reason and fault latch, so an operator sees why the machine stopped rather than just that it stopped.`,
    phases: [
      {
        title: 'Requirement and transition table',
        desc: 'Define the sequence formally before writing logic.',
        duration: '1 week',
        tasks: [
          'List every sensor and actuator with its normal state and failure behaviour',
          'Write the complete state transition table, including abort and fault states',
          'Identify every unsafe transition and the interlock that blocks it',
          'Review the table with someone who operates the real process',
        ],
      },
      {
        title: 'Input conditioning and plausibility',
        desc: 'Detect disagreement rather than trusting a single sensor.',
        duration: '1 week',
        tasks: [
          'Debounce all inputs and require agreement from redundant sensors where available',
          'Detect impossible combinations and latch them as faults',
          'Define the power-loss and emergency-stop behaviour explicitly',
        ],
      },
      {
        title: 'Sequencing and interlocks',
        desc: 'Implement the table, then prove the interlocks actually block.',
        duration: '1.5 weeks',
        tasks: [
          'Code the state machine directly from the table',
          'Test each interlock by forcing its condition and confirming motion stops',
          'Verify a mid-cycle power loss recovers to a defined state',
          'Prove every listed illegal transition is blocked',
        ],
      },
      {
        title: 'Operator interface and reporting',
        desc: 'Make the machine explain itself when it stops.',
        duration: '1 week',
        tasks: [
          'Build an HMI showing state, blocked reason and active faults',
          'Add manual and auto mode with documented precedence',
          'Log every state transition with a timestamp',
          'Produce a wiring diagram and an operations manual',
        ],
      },
    ],
    bom: [
      { component: 'PLC (or a simulator for logic development)', specification: 'Digital I/O sufficient for all sensors and actuators', quantity: 1, estimatedCost: rupees(12000) },
      { component: 'Industrial proximity sensors', specification: 'PNP, normally open, shielded where needed', quantity: 6, estimatedCost: rupees(1800) },
      { component: 'Pneumatic solenoid valves', specification: '5/2, with flow control', quantity: 4, estimatedCost: rupees(1600) },
      { component: 'Pneumatic cylinder', specification: 'Sized to the load with stroke margin', quantity: 2, estimatedCost: rupees(2400) },
      { component: 'Air preparation unit', specification: 'Filter, regulator, drain', quantity: 1, estimatedCost: rupees(1800) },
      { component: 'HMI panel', specification: '7 inch, for the operator interface', quantity: 1, estimatedCost: rupees(9500) },
      { component: 'Safety relay and E-stop', specification: 'Category 3 rated', quantity: 1, estimatedCost: rupees(3500) },
      { component: 'Light curtain or guards', specification: 'For the operator-accessible zone', quantity: 1, estimatedCost: rupees(8000) },
      { component: 'Wiring duct, terminal blocks, cable', specification: 'Finger-safe terminals, numbered cores', quantity: 1, estimatedCost: rupees(3500) },
      { component: 'Control panel enclosure', specification: 'IP54 with a lockable door', quantity: 1, estimatedCost: rupees(6500) },
    ],
    validation: [
      'The transition table is complete and every state in the program maps to it',
      'Each interlock is tested by forcing its condition and confirming motion stops',
      'No illegal transition is reachable under any input combination tested',
      'A mid-cycle power loss recovers to a defined state, not an undefined one',
      'An emergency stop halts motion and requires a deliberate restart',
      'Operator mode precedence is documented and tested in both directions',
      'Every state transition is logged with a timestamp',
      'A wiring diagram and operations manual are produced',
    ],
    faults: [
      { issue: 'Cycle stalls at one step with no obvious cause', cause: 'A sensor in a state the transition table never anticipated', solution: 'Expose the blocked reason and the unmet condition on the HMI rather than guessing' },
      { issue: 'Machine resumes unexpectedly after an emergency stop', cause: 'Auto-restart on power return without a deliberate reset', solution: 'Require an explicit manual reset and latch the fault until cleared' },
      { issue: 'Cylinder extends but does not retract', cause: 'Single solenoid with a spring return, failing mechanically', solution: 'Check air supply and pressure, then add position feedback rather than assuming' },
      { issue: 'Intermittent faults appear only at production speed', cause: 'A settling time that was fine in simulation and not in reality', solution: 'Add a settling timer to the transition condition and verify at speed' },
      { issue: 'Outputs energise during a power-on test', cause: 'Undefined initial state in the controller', solution: 'Force a defined start state on first scan before enabling outputs' },
    ],
    extensions: [
      'Add recipe selection so multiple product types run from one program',
      'Log production counts and cycle times to a historian',
      'Add predictive maintenance on the pneumatic consumables',
      'Expand the HMI with a trend view of cycle time',
      'Add an OPC or MQTT link for remote monitoring',
      'Add a dry-run mode that simulates inputs for commissioning',
    ],
    safety: [
      'Safety interlocks must be hardwired where the risk assessment demands it',
      'Never defeat a light curtain or guard to speed up testing',
      'Isolate and lock out before opening a panel or reaching into the machine',
      'Verify the emergency stop function before every test run',
      'Guard every pinch point between a cylinder and a hard surface',
      'Keep compressed air below the pressure the components are rated for',
    ],
  },

  {
    key: 'machine-vision',
    label: 'Machine Vision & Image Processing',
    branch: 'Instrumentation',
    category: 'Computer Vision',
    level: 'Advanced',
    duration: '5-7 weeks',
    keywords: [
      'image', 'vision', 'camera', 'face', 'recognition', 'ocr', 'qr',
      'fingerprint', 'detection', 'tracking', 'optical', 'character', 'barcode',
    ],
    cats: ['Software Projects', 'Hardware Projects', 'IT Projects'],
    overview: (t) =>
      `${cap(t)} is mostly a measurement problem wearing a vision costume. The accuracy is set by lighting and calibration, not by the algorithm, and the algorithm only has to not make things worse. Establishing the measurement uncertainty first is what makes the rest defensible.`,
    problem: (t) =>
      `Vision features for "${t}" tend to be tuned against a handful of favourable images and then fail in production, where lighting shifts, parts arrive at slight angles, and half the target is outside the frame. The engineering fix is unglamorous: control the lighting, calibrate properly, report a measured confidence, and refuse to act on a low-confidence result rather than guessing.`,
    objectives: [
      'Design stable, diffuse lighting and prove the histogram shows no clipping',
      'Calibrate the camera and report reprojection error in millimetres at the working plane',
      'Estimate measurement repeatability with a proper sample size',
      'Attach a confidence score and act on a reject path rather than forcing an answer',
      'Benchmark detection on a labelled image set and publish the result',
    ],
    prereqs: [
      'Python with OpenCV or NumPy',
      'Camera calibration, lens selection and exposure basics',
      'Linear algebra for pose estimation and homographies',
      'Statistics for confidence intervals and error reporting',
    ],
    architecture: () =>
      `A camera under controlled diffuse lighting captures the scene. Processing runs as discrete, testable stages: preprocess, segment against a threshold derived from the measured histogram, detect contours, filter by geometric plausibility, then estimate pose. Each stage returns intermediate images so a failure can be attributed to a specific step rather than to "the code". A confidence score derives from detection quality and inlier count, and results below a threshold are rejected instead of published.`,
    phases: [
      {
        title: 'Imaging setup',
        desc: 'Fix the optics and lighting before writing processing code.',
        duration: '1 week',
        tasks: [
          'Compare candidate lighting arrangements on the real target',
          'Lock exposure, gain and white balance, then verify they cannot drift',
          'Confirm the histogram shows no clipping in either direction',
          'Choose a lens for the working distance and required field of view',
        ],
      },
      {
        title: 'Calibration and error budget',
        desc: 'Turn pixels into millimetres, and state the uncertainty.',
        duration: '1 week',
        tasks: [
          'Capture a calibration target and solve intrinsics and extrinsics',
          'Report reprojection error in pixels and millimetres at the working plane',
          'Measure positional repeatability over at least fifty detections',
          'Budget the total error from calibration, optics and processing',
        ],
      },
      {
        title: 'Detection pipeline',
        desc: 'Build the stages so each can be tested and blamed independently.',
        duration: '1.5 weeks',
        tasks: [
          'Segment using a threshold derived from the measured histogram',
          'Filter detections by area and shape plausibility',
          'Estimate pose and reject low-confidence results',
          'Benchmark on a labelled set of at least two hundred images',
        ],
      },
      {
        title: 'Integration and reliability',
        desc: 'Prove it works over enough trials to mean something.',
        duration: '1.5 weeks',
        tasks: [
          'Integrate with the actuator or decision path',
          'Run a long unattended campaign and log every decision',
          'Categorise every failure rather than just counting them',
          'Report a success rate with a confidence interval',
        ],
      },
    ],
    bom: [
      { component: 'Camera', specification: 'Global shutter preferred, adequate resolution', quantity: 1, estimatedCost: rupees(8000) },
      { component: 'Lens', specification: 'Fixed focal length, low distortion', quantity: 1, estimatedCost: rupees(3500) },
      { component: 'Diffuse dome light', specification: 'High CRI, sized to the field', quantity: 1, estimatedCost: rupees(2500) },
      { component: 'Light enclosure or hood', specification: 'Blocks ambient variation', quantity: 1, estimatedCost: rupees(4000) },
      { component: 'Rigid camera mount', specification: 'Aluminium, with adjustment and locking', quantity: 1, estimatedCost: rupees(1200) },
      { component: 'Trigger and lighting controller', specification: 'Deterministic strobe or timed capture', quantity: 1, estimatedCost: rupees(2200) },
      { component: 'Calibration target', specification: 'Printed matte checkerboard', quantity: 1, estimatedCost: rupees(150) },
      { component: 'Development machine', specification: '16 GB RAM, SSD', quantity: 1, estimatedCost: rupees(55000) },
      { component: 'Actuator or stage', specification: 'If the system must move anything', quantity: 1, estimatedCost: rupees(12000) },
    ],
    validation: [
      'Histogram shows no clipping at the locked exposure across all target conditions',
      'Reprojection error is reported in millimetres at the working plane',
      'Positional repeatability is reported as mean and standard deviation over 50+ trials',
      'Detection performance is published on a labelled set with the set size stated',
      'Low-confidence results are rejected rather than acted upon',
      'Failure modes are categorised, not merely counted',
      'A success rate is reported with a confidence interval',
      'Calibration drift over a full day is measured and documented',
    ],
    faults: [
      { issue: 'Works in the lab, fails in production', cause: 'Ambient light leakage or auto-exposure changing', solution: 'Enclose the cell, disable automatic exposure, and re-verify' },
      { issue: 'Pose estimate consistently rotated by a few degrees', cause: 'An unstable fit on a near-symmetric part', solution: 'Add a directional feature, or use a symmetry-aware fit that resolves the axis' },
      { issue: 'Two detections where there is one', cause: 'A specular highlight splitting the blob', solution: 'Switch to diffuse dome lighting and apply a morphological opening' },
      { issue: 'Accuracy falls after a few hours of operation', cause: 'Thermal drift in the mount or the frame', solution: 'Track a fiducial periodically and correct drift from it' },
      { issue: 'Detection rate fine, measurement inaccurate', cause: 'Pixel-level precision mistaken for physical accuracy', solution: 'Validate against a physical reference and report the millimetre error' },
      { issue: 'Every image over-segmented after a lighting change', cause: 'A fixed global threshold, where a local or adaptive one is needed', solution: 'Derive the threshold from the measured histogram, or use an adaptive method' },
    ],
    extensions: [
      'Add depth sensing to resolve overlapping targets',
      'Report calibrated confidence intervals rather than a single estimate',
      'Retrain the detector when a new part type is introduced',
      'Add online drift monitoring that triggers recalibration',
      'Speed up the pipeline with GPU processing and measure the gain',
      'Publish a reusable pipeline with a documented configuration format',
    ],
    safety: [
      'Enclose the cell and fit an interlock so it cannot run with a person inside',
      'Never point a gripper or actuator at a person during testing',
      'Guard conveyor nip points; they are real hazards',
      'Consider optical exposure limits for strong light sources',
      'Keep the enclosure closed so ambient light does not degrade results',
    ],
  },

  {
    key: 'mobile-app',
    label: 'Mobile Application',
    branch: 'Software',
    category: 'Mobile & App Development',
    level: 'Intermediate',
    duration: '4-6 weeks',
    keywords: [
      'android', 'app', 'mobile', 'ios', 'flutter', 'java app', 'application',
      'phone', 'chat', 'blood donation', 'attendance app', 'quiz', 'ecommerce app',
    ],
    cats: ['Android Projects', 'Software Projects', 'IT Projects'],
    overview: (t) =>
      `${cap(t)} is a product build where the hard part is not the feature list but the states the feature can be in: empty, loading, error, offline, and slow network. Building those states deliberately is the difference between a demo and something a person can rely on.`,
    problem: (t) =>
      `Student versions of "${t}" are usually built for a perfect network with a populated database, which is precisely the condition nobody experiences. A real deployment fails on the first launch with no account, on a bad connection, and with an empty result set. This build treats those as the primary cases and designs the interface around them.`,
    objectives: [
      'Model data locally first so the interface works offline and feels instant',
      'Design explicit empty, loading, error and offline states for every screen',
      'Validate input at the boundary and give specific, actionable errors',
      'Structure the code for testability and write tests for the logic that matters',
      'Handle permissions honestly, explaining why before requesting',
    ],
    prereqs: [
      'One mobile stack end to end: Kotlin and Android, or Flutter, or Swift',
      'Basic data modelling and local persistence',
      'Version control and a sensible branching habit',
      'Reading and writing clear user-facing error messages',
    ],
    architecture: () =>
      `A local store holds the authoritative view, so screens render from it immediately. A repository layer mediates between local data and the remote API, reconciling on reconnect. Screens are split into a state container and a stateless view, which keeps them testable. Navigation declares routes once, with deep links supported. Errors are modelled as typed results rather than thrown strings, so a failure path must be handled explicitly.`,
    phases: [
      {
        title: 'Scope and data model',
        desc: 'Decide what the app is, then model the data it holds.',
        duration: '1 week',
        tasks: [
          'Write user stories and cut scope to a shippable core',
          'Model the data and the local schema',
          'Define the API contract and its error responses',
          'Sketch the primary navigation and the four core screens',
        ],
      },
      {
        title: 'Local-first data layer',
        desc: 'Make the app usable before the network is involved.',
        duration: '1.5 weeks',
        tasks: [
          'Implement the local store and migrations',
          'Write the repository with an explicit sync strategy',
          'Handle conflict resolution on reconnect',
          'Seed the local store so first run is not an empty shell',
        ],
      },
      {
        title: 'Screens and states',
        desc: 'Build every screen in all of its states, not just the happy one.',
        duration: '2 weeks',
        tasks: [
          'Build each screen with its loading, empty, error and offline states',
          'Add validation with specific error messages',
          'Handle permissions with a rationale before the system prompt',
          'Add form autosave so a backgrounded app does not lose input',
        ],
      },
      {
        title: 'Testing and release build',
        desc: 'Test the logic, then produce something installable.',
        duration: '1 week',
        tasks: [
          'Write unit tests for validation, sync and state transitions',
          'Test on a real low-end device, not only an emulator',
          'Produce a signed release build',
          'Write installation and first-run instructions',
        ],
      },
    ],
    bom: [
      { component: 'Development machine', specification: '16 GB RAM recommended for emulators', quantity: 1, estimatedCost: rupees(55000) },
      { component: 'Android device for testing', specification: 'A physical low-end device beats an emulator', quantity: 1, estimatedCost: rupees(9000) },
      { component: 'Hosting for the backend', specification: 'Small instance, sufficient for a demo', quantity: 1, estimatedCost: rupees(4500) },
      { component: 'Domain and TLS certificate', specification: 'Required for a released app', quantity: 1, estimatedCost: rupees(1200) },
      { component: 'App store developer account', specification: 'One-time registration fee', quantity: 1, estimatedCost: rupees(4500) },
      { component: 'Design assets and icon set', specification: 'Required for a credible listing', quantity: 1, estimatedCost: rupees(2000) },
      { component: 'Crash and analytics service', specification: 'Free tier is sufficient initially', quantity: 1, estimatedCost: rupees(0) },
    ],
    validation: [
      'Every screen is exercised in loading, empty, error and offline states',
      'First run with no data shows a designed state, not a blank screen',
      'Input validation produces specific, actionable messages',
      'Permissions are explained before the system prompt appears',
      'Form input survives the app being backgrounded and killed',
      'Data syncs correctly after being offline, with conflicts resolved predictably',
      'The app runs acceptably on a low-end physical device',
      'A signed release build installs and launches from a clean device',
    ],
    faults: [
      { issue: 'Crash immediately after a network change', cause: 'An unhandled promise rejection on a failed request', solution: 'Model errors as typed results and handle the failure branch explicitly' },
      { issue: 'UI shows stale data after a pull-to-refresh', cause: 'The view reading from a cache that was not invalidated', solution: 'Make the repository the single source of truth and invalidate deliberately' },
      { issue: 'App killed in the background loses the form', cause: 'State held only in memory', solution: 'Persist form state as the user types, not on submit' },
      { issue: 'Layout breaks on a small screen', cause: 'Fixed dimensions instead of constraints', solution: 'Use flexible layout constraints and test on a small device' },
      { issue: 'Duplicate records after a retry', cause: 'A non-idempotent create called twice', solution: 'Make writes idempotent with a client-generated key' },
      { issue: 'Works on the emulator, slow on a real device', cause: 'Emulator performance masking expensive main-thread work', solution: 'Profile on the device and move heavy work off the UI thread' },
    ],
    extensions: [
      'Add offline-first sync with conflict resolution UI',
      'Add push notifications with proper user controls',
      'Add biometric authentication for sensitive actions',
      'Add an accessibility audit and fix what it reports',
      'Add end-to-end tests on a real device',
      'Add localisation for a second language',
    ],
    safety: [
      'Never hardcode API keys, secrets or credentials in the client',
      'Store tokens in the platform keystore, not plain preferences',
      'Validate all input on the server as well as the client',
      'Request only the permissions the app actually uses, and explain them',
      'Do not collect or transmit personal data without a clear purpose and consent',
      'Handle account deletion as a real feature, not an afterthought',
    ],
  },

  {
    key: 'web-system',
    label: 'Web Application & Information System',
    branch: 'Software',
    category: 'Web & Information Systems',
    level: 'Intermediate',
    duration: '4-6 weeks',
    keywords: [
      'web', 'website', 'portal', 'cloud', 'database', 'php', 'java', '.net',
      'project management', 'inventory', 'library', 'hospital', 'bank', 'college',
      'school', 'ecommerce', 'online', 'management system', 'erp', 'crm', 'hrm',
      'bus reservation', 'hotel', 'restaurant', 'cab', 'shopping', 'exam',
    ],
    cats: ['Software Projects', 'IT Projects'],
    overview: (t) =>
      `${cap(t)} is a CRUD system with real access rules, and its quality is decided by what happens when two people edit the same record and when one of them is not supposed to see it. The features are the easy part; the data model and the permission boundary are the deliverable.`,
    problem: (t) =>
      `An information system for "${t}" that treats every authenticated user as equivalent is the usual outcome, and it fails the moment a student, a teacher and an administrator meet the same data. A second common failure is no audit trail, so no one can answer what changed or who changed it. This build treats authorisation and history as first-class features.`,
    objectives: [
      'Design a normalised data model with enforced foreign keys and constraints',
      'Implement role-based authorisation checked server-side on every request',
      'Log meaningful changes to an audit trail that cannot be edited',
      'Validate and sanitise all input, and treat output encoding as equally important',
      'Handle concurrency properly rather than assuming one user at a time',
    ],
    prereqs: [
      'A server-side language such as Python, PHP, Java or Node',
      'Relational database design, normalisation and query writing',
      'SQL including joins, transactions and indexes',
      'HTTP semantics, sessions and the basics of authentication',
    ],
    architecture: () =>
      `A stateless front end talks to an API layer that performs authorisation before touching data. Business logic sits in a service layer, keeping controllers thin. The relational database enforces integrity through foreign keys and constraints rather than application convention. Every mutating request writes an audit record in the same transaction, so the history cannot drift from the data. Sessions use signed, secure cookies, and passwords are hashed with a slow algorithm.`,
    phases: [
      {
        title: 'Data model and requirements',
        desc: 'Get the model right before any screen exists.',
        duration: '1 week',
        tasks: [
          'Write requirements and identify the distinct user roles',
          'Model entities, relationships and constraints',
          'Identify what each role may read and what it may change',
          'Create the schema with enforced foreign keys',
        ],
      },
      {
        title: 'Authentication and authorisation',
        desc: 'Build the permission boundary first, since every later feature depends on it.',
        duration: '1.5 weeks',
        tasks: [
          'Implement registration, login and password reset securely',
          'Hash passwords with a slow algorithm and per-user salt',
          'Enforce role checks server-side on every request',
          'Write tests that attempt forbidden access and expect refusal',
        ],
      },
      {
        title: 'Core features and concurrency',
        desc: 'Build the functionality, then make it correct under simultaneous use.',
        duration: '2 weeks',
        tasks: [
          'Implement the core CRUD paths against the service layer',
          'Use transactions so partial failures cannot leave inconsistent data',
          'Handle simultaneous edits, with versioning or locking',
          'Write the audit trail inside the same transaction as the change',
        ],
      },
      {
        title: 'Hardening and deployment',
        desc: 'Assume hostile input and a real network, then deploy.',
        duration: '1 week',
        tasks: [
          'Validate, sanitise and encode all input and output',
          'Add server-side pagination, filtering and sorting',
          'Set secure headers, rate limits and sensible error handling',
          'Deploy, back up, and document the recovery procedure',
        ],
      },
    ],
    bom: [
      { component: 'Server or cloud instance', specification: '2 vCPU, 4 GB RAM sufficient to start', quantity: 1, estimatedCost: rupees(6000) },
      { component: 'Relational database', specification: 'PostgreSQL or MySQL, managed or self-hosted', quantity: 1, estimatedCost: rupees(4000) },
      { component: 'Domain and TLS certificate', specification: 'Required before any real user', quantity: 1, estimatedCost: rupees(1200) },
      { component: 'Backups', specification: 'Automated, with a tested restore', quantity: 1, estimatedCost: rupees(2000) },
      { component: 'Email service', specification: 'For verification and password reset', quantity: 1, estimatedCost: rupees(1000) },
      { component: 'Monitoring and error tracking', specification: 'Uptime check and error reporting', quantity: 1, estimatedCost: rupees(0) },
      { component: 'Development machine', specification: '16 GB RAM recommended', quantity: 1, estimatedCost: rupees(55000) },
    ],
    validation: [
      'Every endpoint enforces authorisation server-side, proven by tests that expect refusal',
      'Foreign keys and constraints are enforced by the database, not only the application',
      'Concurrent edits are handled by versioning or locking, and tested',
      'Audit records are written in the same transaction as the change',
      'Passwords are hashed with a slow algorithm and are never logged',
      'Input is validated and output encoded; injection attempts are tested',
      'A full backup restores to a working system, tested rather than assumed',
      'Server-side pagination holds up on a large dataset',
    ],
    faults: [
      { issue: 'Users can see records they should not', cause: 'Authorisation checked in the interface but not on the server', solution: 'Enforce the permission check on every request and test for refusal' },
      { issue: 'Duplicate rows appear under concurrent use', cause: 'No uniqueness constraint and no transaction isolation', solution: 'Add a database constraint and handle the conflict at the application layer' },
      { issue: 'Session drops on every request', cause: 'Cookie flags or domain not configured for the deployment', solution: 'Set secure, httpOnly and correct path and domain attributes' },
      { issue: 'SQL error messages leak to users', cause: 'Exceptions rendered directly', solution: 'Log the detail server-side and return a generic message with a reference id' },
      { issue: 'Audit trail is missing entries', cause: 'Audit written after commit, so a rollback loses it', solution: 'Write the audit record inside the same transaction' },
      { issue: 'Site slows sharply as data grows', cause: 'Unindexed queries and server-side work per row', solution: 'Add indexes from an actual query plan and fix N+1 access patterns' },
    ],
    extensions: [
      'Add an approval workflow with delegated authority',
      'Add a full-text search with proper ranking',
      'Add an API with rate limiting and token authentication',
      'Add background jobs for email and exports',
      'Add structured logging and a real dashboard',
      'Add end-to-end tests covering the critical paths',
    ],
    safety: [
      'Never store passwords in plain text or log them at any level',
      'Use parameterised queries only; never build SQL by concatenation',
      'Serve over HTTPS with HSTS and secure cookies',
      'Keep secrets out of version control and rotate them',
      'Enforce authorisation server-side on every single request',
      'Back up and test the restore before you need it',
    ],
  },

  {
    key: 'ai-ml',
    label: 'AI & Machine Learning',
    branch: 'Software',
    category: 'Artificial Intelligence & ML',
    level: 'Advanced',
    duration: '5-7 weeks',
    keywords: [
      'ai', 'machine learning', 'deep learning', 'neural', 'data mining',
      'prediction', 'classification', 'nlp', 'recommendation', 'sentiment',
      'image recognition', 'detection system ai', 'clustering', 'regression',
      'fraud', 'prediction system',
    ],
    cats: ['Software Projects', 'IT Projects'],
    overview: (t) =>
      `${cap(t)} is a modelling problem with an evaluation problem attached, and the evaluation problem is the one that decides whether the result is real. A model that scores well on a random split of time-series data can be useless in deployment, so the split strategy is chosen before the model.`,
    problem: (t) =>
      `Applied ML demonstrations for "${t}" are frequently inflated by leakage — features or labels that contain information from after the prediction moment. The symptom is a headline accuracy that collapses in production, and the cause is invisible unless the data pipeline is deliberately audited for causality. This build tests each feature for causality and refuses to report a metric the pipeline cannot justify.`,
    objectives: [
      'Build a reproducible feature pipeline and test each feature for causality',
      'Split by time or by group, never randomly, when the data has that structure',
      'Report metrics that reflect the real cost of an error, not just accuracy',
      'Establish a trivial baseline and demonstrate the model actually beats it',
      'Ship with versioned artefacts, a training record and a rollback path',
    ],
    prereqs: [
      'Python with pandas and NumPy',
      'Machine-learning fundamentals: validation, overfitting, metrics',
      'Statistics: distributions, confidence intervals, hypothesis tests',
      'SQL for feature extraction from stored data',
    ],
    architecture: () =>
      `Raw data lands in a store. A feature job produces a table in which every column is computable at prediction time, verified by a test that runs the pipeline on a truncated window. Training loads labelled data, builds time-ordered or group-ordered folds, fits a baseline and a model, and writes the artefact with a training record. Serving scores live inputs, checks them against the training distribution, and abstains when they fall outside it. A prediction log makes later scoring possible.`,
    phases: [
      {
        title: 'Data and labelling',
        desc: 'Understand the data and document how labels were derived.',
        duration: '1 week',
        tasks: [
          'Verify timestamp continuity, ordering and gaps',
          'Define and document the labelling rule',
          'Report class balance and how many positive cases actually exist',
          'Split off a test set and do not look at it until the end',
        ],
      },
      {
        title: 'Feature engineering with causality',
        desc: 'Build features that could actually exist at prediction time.',
        duration: '1.5 weeks',
        tasks: [
          'Create rolling features over windows small enough to be causal',
          'Write a test that fails if any feature requires future data',
          'Add operating-condition features so the model can condition on context',
          'Check feature distributions between train and test',
        ],
      },
      {
        title: 'Training and honest evaluation',
        desc: 'Beat a baseline, and prove it on data the model has not seen.',
        duration: '2 weeks',
        tasks: [
          'Train a trivial baseline and record its score',
          'Fit candidate models and compare against that baseline',
          'Select using validation only, never the test set',
          'Report precision-recall with a confusion matrix where classes are imbalanced',
          'Evaluate on the test set exactly once',
        ],
      },
      {
        title: 'Serving, drift and monitoring',
        desc: 'Deploy something that can be trusted, and noticed when it stops being trustworthy.',
        duration: '1.5 weeks',
        tasks: [
          'Package the model behind a validated endpoint',
          'Version the artefact with the data snapshot and dependencies',
          'Add distribution checks and an abstention path',
          'Log every prediction and define a retraining trigger',
          'Write the limitations section, including what it cannot detect',
        ],
      },
    ],
    bom: [
      { component: 'Development workstation', specification: '16 GB RAM, SSD; GPU optional but helpful', quantity: 1, estimatedCost: rupees(65000) },
      { component: 'Cloud GPU instance', specification: 'Only for periods of real training', quantity: 1, estimatedCost: rupees(12000) },
      { component: 'Data storage', specification: 'Enough for the raw and feature history', quantity: 1, estimatedCost: rupees(8000) },
      { component: 'Model and experiment tracking', specification: 'Version every artefact', quantity: 1, estimatedCost: rupees(0), notes: 'Free tier is fine' },
      { component: 'Serving environment', specification: 'Small instance, enough for inference', quantity: 1, estimatedCost: rupees(6000) },
      { component: 'Dataset', specification: 'With documented provenance and licensing', quantity: 1, estimatedCost: rupees(0) },
    ],
    validation: [
      'Causality test fails if any feature requires future data',
      'Splits are time-ordered or group-ordered, and the split dates are recorded',
      'A trivial baseline is reported alongside the model',
      'Precision-recall and a confusion matrix are published, not accuracy alone',
      'The test set is evaluated once, with model and data versions attached',
      'Out-of-distribution inputs trigger abstention rather than a confident answer',
      'Every prediction is logged so outcomes can be scored later',
      'A written limitations section names the failure modes that are not detected',
    ],
    faults: [
      { issue: 'Excellent validation score, poor production behaviour', cause: 'Temporal leakage between train and validation', solution: 'Rebuild splits by time and re-run the causality test' },
      { issue: 'Very high accuracy but the model never alerts', cause: 'Class imbalance; accuracy is dominated by the majority class', solution: 'Evaluate with precision-recall, and resample or weight classes' },
      { issue: 'Predictions cluster suspiciously at the training mean', cause: 'Regularisation too strong for the available data', solution: 'Reduce regularisation, get more data, or use a simpler model' },
      { issue: 'Performance decays over weeks', cause: 'Sensor drift or a change in operating conditions', solution: 'Monitor feature distributions and log a known-good reference for drift detection' },
      { issue: 'Retraining gives a different result each run', cause: 'No data snapshot, unfixed seed, unpinned dependencies', solution: 'Version the data by content hash, fix seeds, pin dependencies' },
      { issue: 'Training fails only on the larger machine', cause: 'A hidden dependency on distributed framework defaults', solution: 'Pin the estimator configuration explicitly and record it' },
    ],
    extensions: [
      'Add calibration so predicted probabilities mean something',
      'Report prediction intervals rather than point estimates',
      'Shadow deploy a candidate model before promoting it',
      'Add model monitoring with an automatic retraining trigger',
      'Optimise the decision threshold against the real cost of each error type',
      'Publish a model card describing intended use and known limits',
    ],
    safety: [
      'Never let a model trigger an action directly without a human or rule-based check',
      'Assess fairness across relevant groups before deployment',
      'Document the training data provenance and its licence',
      'Do not train on personal data without a lawful basis and consent',
      'Keep a rollback path and a manual override available',
      'Record enough to reproduce any decision the model influenced',
    ],
  },

  {
    key: 'blockchain',
    label: 'Blockchain & Smart Contracts',
    branch: 'Software',
    category: 'Blockchain & Distributed Systems',
    level: 'Advanced',
    duration: '5-6 weeks',
    keywords: [
      'blockchain', 'smart contract', 'cryptocurrency', 'ledger', 'supply chain',
      'traceability', 'decentralized', 'ethereum', 'solidity', 'token', 'voting',
    ],
    cats: ['Software Projects', 'IT Projects'],
    overview: (t) =>
      `${cap(t)} replaces a trusted intermediary with replicated state, which means the design problem is deciding what genuinely must be shared. Most implementations of "${t}" put data on-chain that belongs in a database, paying cost and losing privacy for no integrity benefit.`,
    problem: (t) =>
      `Blockchain is frequently proposed for "${t}" when the actual problem is a lack of shared records between a few organisations that already trust a common operator. A well-designed relational database with proper audit logging usually solves that more cheaply, and keeps the ability to correct a mistake. The engineering judgement is knowing when a ledger is justified, and this build makes that case explicitly before writing any contract.`,
    objectives: [
      'Justify the distributed ledger against a conventional design, and write that case',
      'Keep bulk data off-chain and put only hashes and status on-chain',
      'Write contracts that are deterministic and have no reliance on wall-clock time',
      'Handle reentrancy, access control and integer overflow explicitly',
      'Write tests that include the malicious and the accidental case',
    ],
    prereqs: [
      'Solidity or the language of the target chain',
      'Cryptographic hash functions and their properties',
      'Smart contract testing and deployment tooling',
      'A local development chain such as Hardhat or Ganache',
    ],
    architecture: () =>
      `Business data lives in an off-chain store keyed by a content hash. The contract records commitments, ownership transfers and status transitions, which is the minimum required for non-repudiation. Access control is by explicit role assignment with events emitted for every state change. Off-chain actors poll or subscribe and index the chain, so read performance does not depend on chain throughput. The design document states the trust assumptions, because a ledger only removes an intermediary if no single party holds the key.`,
    phases: [
      {
        title: 'Design and justification',
        desc: 'Establish that a ledger is the right tool before building one.',
        duration: '1 week',
        tasks: [
          'State the problem a shared record does not currently solve',
          'Compare against a conventional database with audit logging',
          'Document the trust model and who holds which keys',
          'Define what stays off-chain and why',
        ],
      },
      {
        title: 'Contract implementation',
        desc: 'Write contracts that behave deterministically under every input.',
        duration: '2 weeks',
        tasks: [
          'Implement the core state transitions with explicit access control',
          'Emit events for every state change',
          'Use checks-effects-interactions to prevent reentrancy',
          'Guard integer arithmetic and avoid external calls where unnecessary',
        ],
      },
      {
        title: 'Testing including the hostile path',
        desc: 'Test the attack, not only the happy path.',
        duration: '1.5 weeks',
        tasks: [
          'Write unit tests for every state transition',
          'Test unauthorised callers and rejected transitions',
          'Test reentrancy and reentrancy guards explicitly',
          'Run a local chain and measure gas for each operation',
        ],
      },
      {
        title: 'Off-chain integration and deployment',
        desc: 'Connect the contract to the data it commits to.',
        duration: '1 week',
        tasks: [
          'Store records off-chain and commit their hashes',
          'Build an indexer that reconstructs state from events',
          'Verify hashes match between chain and store',
          'Deploy to a test network and document the process',
        ],
      },
    ],
    bom: [
      { component: 'Development machine', specification: '16 GB RAM; Node.js toolchain', quantity: 1, estimatedCost: rupees(55000) },
      { component: 'Node.js and package manager', specification: 'Matching the chosen framework', quantity: 1, estimatedCost: rupees(0) },
      { component: 'Local development chain', specification: 'Hardhat or Ganache, free', quantity: 1, estimatedCost: rupees(0) },
      { component: 'Test framework and coverage', specification: 'For contract tests', quantity: 1, estimatedCost: rupees(0) },
      { component: 'Off-chain database', specification: 'PostgreSQL for records and hashes', quantity: 1, estimatedCost: rupees(4000) },
      { component: 'Test network access', specification: 'For deployment demonstration', quantity: 1, estimatedCost: rupees(3000) },
      { component: 'Wallet and test accounts', specification: 'Funded on testnet only', quantity: 1, estimatedCost: rupees(0) },
    ],
    validation: [
      'A design document justifies the ledger against a conventional alternative',
      'Every state transition has a test, including the rejected path',
      'Unauthorised callers are rejected by test, not by inspection',
      'Reentrancy is addressed and covered by a test',
      'No unbounded loop over untrusted input exists in any contract',
      'Bulk data is confirmed off-chain, with hashes verifying integrity',
      'Gas cost is measured and reported per operation',
      'Deployment to a test network is documented and repeatable',
    ],
    faults: [
      { issue: 'A contract is drained in testing', cause: 'Reentrancy, with state updated after an external call', solution: 'Apply checks-effects-interactions and add a reentrancy guard' },
      { issue: 'Transactions fail unpredictably on the test network', cause: 'Gas limit too low for the logic as written', solution: 'Measure gas and set an explicit limit with headroom' },
      { issue: 'A record cannot be corrected after an error', cause: 'Immutability treated as a feature rather than a constraint', solution: 'Design a correction or supersede path before deployment, not after' },
      { issue: 'Transaction cost is prohibitive', cause: 'Too much data written on-chain', solution: 'Move data off-chain and commit only a hash' },
      { issue: 'Indexer state drifts from the chain', cause: 'Reorgs or a missed event, with no reconciliation', solution: 'Add a reconciliation routine that rebuilds state from events' },
      { issue: 'Access control lets a non-owner transfer ownership', cause: 'Modifier applied inconsistently across functions', solution: 'Apply modifiers uniformly and test each function separately' },
    ],
    extensions: [
      'Add a dispute or correction mechanism for bad records',
      'Aggregate many commitments into one periodic root to reduce cost',
      'Add zero-knowledge proof that a record meets criteria without revealing it',
      'Add proper key management with a hardware wallet',
      'Measure and publish the real throughput and cost characteristics',
      'Add an oracle for any external data the contract must trust',
    ],
    safety: [
      'Never deploy to a live network without an independent audit',
      'Assume any input, including from a contract, is hostile',
      'Keep private keys out of the repository and use a hardware wallet',
      'Contracts are immutable once deployed; treat release as final',
      'A shared ledger removes a trusted party only if no single key does',
      'Be explicit about the data that becomes permanently public',
    ],
  },

  {
    key: 'mechanical-cad',
    label: 'Mechanical Design & CAD',
    branch: 'Mechanical',
    category: 'Mechanical Design & CAD',
    level: 'Intermediate',
    duration: '4-6 weeks',
    keywords: [
      'cad', 'solidworks', 'design', 'fabrication', 'machine design', 'fea',
      'thermal', 'ansys', 'analysis', 'fixture', 'bracket', 'gearbox', 'shaft',
      'bearing', 'frame', 'linkage', 'conveyor design',
    ],
    cats: ['Mechanical Projects', 'Mechanical Design'],
    overview: (t) =>
      `${cap(t)} is a design exercise judged on whether the drawing could be made by someone else. A CAD model that is visually complete but dimensionally ambiguous is not a design, it is a picture. Every feature must be manufacturable, toleranced and specified.`,
    problem: (t) =>
      `The usual failure in "${t}" is a model that is beautiful in the viewport and impossible to manufacture: no tolerances, no fillets at stress concentrations, no consideration of assembly order, and fasteners with nowhere to go. This build treats manufacturability, tolerance stack-up and assembly sequence as the design constraints, not as afterthoughts.`,
    objectives: [
      'Model the full part tree with a deliberate assembly sequence',
      'Apply fits and tolerances to every functional interface',
      'Identify stress concentrations and add radii or relief features',
      'Check manufacturability against real process limits',
      'Produce a drawing package that could be released to a machine shop',
    ],
    prereqs: [
      'SolidWorks, CATIA, Fusion 360 or an equivalent parametric modeller',
      'Engineering drawing conventions and GD&T basics',
      'Tolerance and fit fundamentals',
      'Material selection and its effect on strength and machinability',
    ],
    architecture: () =>
      `The assembly is modelled from the mechanism outward: fix the critical datum, constrain the chain that controls the function, and let everything else reference it. Parts are modelled with design intent rather than as static geometry, so a parameter change propagates correctly. Fits are assigned at functional interfaces only, and a tolerance stack is calculated through the chain that actually affects function. Manufacturing features are added last, and checked against the shop that will make them.`,
    phases: [
      {
        title: 'Requirements and mechanism',
        desc: 'Establish what the design must do before modelling it.',
        duration: '1 week',
        tasks: [
          'Define loads, motion and the required life',
          'Sketch the mechanism and identify the critical kinematic chain',
          'Choose materials with the working stress and environment in mind',
          'List the interfaces and which of them are functional',
        ],
      },
      {
        title: 'Concept modelling',
        desc: 'Get the mechanism working before refining anything.',
        duration: '1.5 weeks',
        tasks: [
          'Model the assembly with a deliberate datum strategy',
          'Verify full range of motion with no interference',
          'Check a motion study and confirm the mechanism behaves',
          'Assess preliminary mass and volume',
        ],
      },
      {
        title: 'Detailed design',
        desc: 'Make it strong where it is loaded and makeable everywhere.',
        duration: '2 weeks',
        tasks: [
          'Add fillets, reliefs and gussets at every stress concentration',
          'Assign fits and tolerances at functional interfaces',
          'Calculate a tolerance stack through the functionally critical chain',
          'Verify fasteners have access and adequate thread engagement',
        ],
      },
      {
        title: 'Analysis and release',
        desc: 'Check the assumptions, then produce a package that can be built.',
        duration: '1-1.5 weeks',
        tasks: [
          'Run a stress or thermal analysis where the load case warrants it',
          'Compare analysis predictions to the design factor used',
          'Generate drawings with tolerances, materials and finish specified',
          'Produce a bill of materials and an assembly manual',
        ],
      },
    ],
    bom: [
      { component: 'CAD software licence', specification: 'Student or trial version', quantity: 1, estimatedCost: rupees(0) },
      { component: 'Raw material stock', specification: 'Specified on the drawings', quantity: 1, estimatedCost: rupees(4000) },
      { component: 'Standard fasteners', specification: 'ISO metric, sizes noted on drawings', quantity: 1, estimatedCost: rupees(800) },
      { component: 'Bearings and bushings', specification: 'Rated for the calculated load and life', quantity: 2, estimatedCost: rupees(900) },
      { component: 'Linear guide or shaft', specification: 'Sized for the load and stroke', quantity: 1, estimatedCost: rupees(1500) },
      { component: 'Lubricant and seals', specification: 'Appropriate to the environment', quantity: 1, estimatedCost: rupees(400) },
      { component: 'Manufacturing allowance', specification: 'For machining and finishing', quantity: 1, estimatedCost: rupees(3000) },
      { component: 'Measurement tools', specification: 'Calipers, micrometer, straightedge', quantity: 1, estimatedCost: rupees(3500) },
    ],
    validation: [
      'Every part in the assembly has a drawing with material and finish specified',
      'Functional interfaces carry explicit fits or tolerances',
      'A tolerance stack is calculated through the critical chain',
      'No interference exists across the full range of motion',
      'Fillets or reliefs exist at every identified stress concentration',
      'Fastener access and thread engagement are verified in the assembly',
      'Analysis results are compared against the design factor used',
      'A bill of materials exists and matches the assembly',
    ],
    faults: [
      { issue: 'Parts do not fit despite correct nominal dimensions', cause: 'No tolerance stack, or tolerances assigned at every interface', solution: 'Assign tolerances at functional interfaces only, then calculate the stack' },
      { issue: 'Part fails at a location the analysis showed as low stress', cause: 'The load path in the analysis did not match reality', solution: 'Re-examine the constraint conditions; real load paths follow stiffness' },
      { issue: 'Assembly cannot be taken apart for service', cause: 'Assembly sequence never designed', solution: 'Design a serviceable assembly order before detailing' },
      { issue: 'Model is rigid and moves incorrectly when a parameter changes', cause: 'Geometry modelled without design intent', solution: 'Rebuild with sketches and relations rather than static solids' },
      { issue: 'Drawing is ambiguous and the shop asks questions', cause: 'Dimensions assumed from the model rather than stated', solution: 'Fully dimension every feature and remove reliance on scale' },
      { issue: 'Cost is far above the estimate', cause: 'Features that require a second setup or a special machine', solution: 'Simplify to standard processes and fewer setups' },
    ],
    extensions: [
      'Add a finite element analysis and correlate it with a physical test',
      'Produce a motion study and export an animation for the manual',
      'Design a lighter alternative holding the same stiffness',
      'Add a tolerance simulation showing the worst-case stack',
      'Cost the design against two manufacturing processes',
      'Design a fixture or jig to simplify inspection',
    ],
    safety: [
      'Add guards over any motion capable of causing injury',
      'Specify material grades and do not substitute without review',
      'Identify sharp edges and add deburring notes to the drawing',
      'Check for pinch and shear points and guard them',
      'Verify fasteners are rated for the calculated load, not assumed',
      'Follow the shop safety requirements for any fabrication',
    ],
  },

  {
    key: 'biomedical',
    label: 'Biomedical & Health Sensing',
    branch: 'Biomedical',
    category: 'Biomedical Sensing',
    level: 'Advanced',
    duration: '5-7 weeks',
    keywords: [
      'heart', 'patient', 'biomedical', 'ecg', 'ekg', 'medical', 'health',
      'blood', 'pressure', 'pulse', 'body temperature', 'diagnos', 'monitoring system',
      'physiotherapy', 'bionic', 'prosthetic',
    ],
    cats: ['Electronics Projects', 'Hardware Projects'],
    overview: (t) =>
      `${cap(t)} touches physiological signals, where the engineering obligation is stronger than elsewhere: the measurement must be trustworthy, the safety limits must be respected, and the result must never be presented as a diagnosis. A study device has clear limits, and stating them is part of the work.`,
    problem: (t) =>
      `Physiological measurement is easy to demo and hard to trust. Motion artefact looks like signal, contact impedance drifts, the mains interference sits uncomfortably close to the signal bandwidth, and a single threshold derived from a healthy volunteer does not generalise. Building "${t}" honestly means quantifying noise, rejecting artefacts, and refusing to report a value when the signal quality does not support one.`,
    objectives: [
      'Design a front end with proper right-leg or reference driving and a measured noise floor',
      'Quantify artefact sources and reject samples rather than filtering them into fiction',
      'Compute physiological parameters with a documented algorithm and stated accuracy',
      'Enforce a hardware watchdog and a defined safe state on sensor failure',
      'State the clinical claims this device does not make, and mean it',
    ],
    prereqs: [
      'Analog front-end design: instrumentation amplifiers, filtering, references',
      'Signal processing: filtering, feature extraction, basic statistics',
      'Understanding of the specific physiology being measured',
      'Relevant safety and device standards awareness',
    ],
    architecture: () =>
      `Electrodes feed an instrumentation amplifier with high common-mode rejection, driven to a mid-supply reference. The signal passes through an anti-alias filter into an ADC sampling well above the physiological band. Firmware rejects samples on motion and contact-quality checks, then extracts heart rate and variability or the relevant parameter. A hardware watchdog forces a safe output state if firmware stalls. Data is logged locally for offline analysis, and the device reports a signal-quality flag alongside every reading.`,
    phases: [
      {
        title: 'Signal path and noise',
        desc: 'Establish the noise floor before trusting any measurement.',
        duration: '1.5 weeks',
        tasks: [
          'Design the front end with reference driving and proper grounding',
          'Measure the noise floor with inputs shorted',
          'Identify mains and motion interference sources',
          'Choose filter corner frequencies from the physiology, not by habit',
        ],
      },
      {
        title: 'Acquisition and artefact rejection',
        desc: 'Collect clean data, and know when the data is not clean.',
        duration: '1.5 weeks',
        tasks: [
          'Implement acquisition with a known sampling rate and gain',
          'Add contact-quality and motion detection',
          'Reject bad samples rather than smoothing them into plausible values',
          'Log raw data for offline verification',
        ],
      },
      {
        title: 'Parameter extraction',
        desc: 'Turn the waveform into a number you can defend.',
        duration: '1.5 weeks',
        tasks: [
          'Implement the extraction algorithm with documented assumptions',
          'Validate against a reference device across a range of subjects',
          'Report accuracy as a distribution, not a single figure',
          'Attach a confidence or quality flag to every output',
        ],
      },
      {
        title: 'Safety, validation and limits',
        desc: 'Make the failure modes safe and the claims honest.',
        duration: '1.5 weeks',
        tasks: [
          'Implement a hardware watchdog and a defined safe state',
          'Test sensor disconnection and short-circuit behaviour',
          'Define and validate the safe input limits',
          'Write the limitations section stating what this cannot diagnose',
        ],
      },
    ],
    bom: [
      { component: 'Instrumentation amplifier', specification: 'High CMRR, low noise, rail-to-rail', quantity: 1, estimatedCost: rupees(700) },
      { component: 'Electrodes and leads', specification: 'Ag/AgCl for biopotentials, shielded cable', quantity: 1, estimatedCost: rupees(600) },
      { component: 'Microcontroller with high-resolution ADC', specification: '>= 12-bit effective, enough sample rate', quantity: 1, estimatedCost: rupees(900) },
      { component: 'Reference and bias network', specification: 'Driven reference for common-mode rejection', quantity: 1, estimatedCost: rupees(200) },
      { component: 'Analog filters', specification: 'Passive or active, corner set by physiology', quantity: 1, estimatedCost: rupees(350) },
      { component: 'Isolated power or reinforced isolation', specification: 'Required if connected to mains', quantity: 1, estimatedCost: rupees(1200) },
      { component: 'Display and interface', specification: 'OLED or LCD plus wireless reporting', quantity: 1, estimatedCost: rupees(1100) },
      { component: 'Storage', specification: 'MicroSD for raw waveform logging', quantity: 1, estimatedCost: rupees(450) },
      { component: 'Battery and protection', specification: 'Protected cell, medical-appropriate insulation', quantity: 1, estimatedCost: rupees(700) },
      { component: 'Enclosure', specification: 'Biocompatible surface, cable strain relief', quantity: 1, estimatedCost: rupees(800) },
    ],
    validation: [
      'Front-end noise floor is measured with inputs shorted and reported',
      'Common-mode rejection is measured, not assumed',
      'Artefact-affected samples are rejected rather than reported',
      'Every reading carries a signal-quality flag',
      'Parameter accuracy is reported as a distribution across multiple subjects',
      'Output is compared against a validated reference device',
      'Sensor disconnection and short-circuit reach the defined safe state',
      'A written limitations section states what the device does not diagnose',
    ],
    faults: [
      { issue: 'Baseline wanders continuously', cause: 'Electrode contact impedance drift, or reference electrode drying out', solution: 'Use fresh electrodes, improve contact, and add a high-pass filter within the physiological limit' },
      { issue: 'Large 50 Hz component in the signal', cause: 'Insufficient common-mode rejection or unbalanced leads', solution: 'Verify the reference drive, check electrode impedance balance, and add a notch if justified' },
      { issue: 'Readings differ wildly between subjects', cause: 'A single threshold derived from one healthy volunteer', solution: 'Characterise across a range and report the distribution rather than a fixed threshold' },
      { issue: 'Device resets during use', cause: 'Motion or contact causing a supply glitch, or firmware stalling', solution: 'Add a hardware watchdog, bulk capacitance, and a defined safe state' },
      { issue: 'Values look plausible but are wrong', cause: 'A fixed gain saturated by motion artefact, then clipped into range', solution: 'Detect saturation and reject rather than reporting a clipped value' },
      { issue: 'Comfortable on the bench, unusable in movement', cause: 'Electrode adhesion and cable strain relief', solution: 'Improve electrode preparation and add proper cable strain relief' },
    ],
    extensions: [
      'Add wireless reporting to a phone or gateway',
      'Add continuous recording with offline review of artefacts',
      'Calibrate against a validated reference across more subjects',
      'Add arrhythmia detection as a flag, explicitly not a diagnosis',
      'Add a long-term trend report rather than only instantaneous values',
      'Reduce power consumption to extend wear time',
    ],
    safety: [
      'This is a study device and must never be presented as a medical diagnosis',
      'Never attach electrodes across the chest in a configuration that could interfere with implanted devices',
      'Use galvanic isolation from mains-powered equipment',
      'Define and enforce safe input limits on every analog input',
      'Do not use on a person with a pacemaker without specialist review',
      'Keep electrodes away from damaged or irritated skin',
    ],
  },

  {
    key: 'python-data',
    label: 'Python Systems & Data Tools',
    branch: 'Software',
    category: 'Python & Data Systems',
    level: 'Beginner',
    duration: '2-4 weeks',
    keywords: [
      'python', 'data', 'socket', 'multiprocessing', 'multithreading', 'data science',
      'data processing', 'data mining', 'tkinter', 'automation', 'scraping',
      'calculator', 'program',
    ],
    cats: ['Software Projects', 'IT Projects'],
    overview: (t) =>
      `${cap(t)} is a software engineering exercise in structure rather than algorithm novelty: input handling, failure behaviour, and making the thing testable. A working script that crashes on unexpected input is not finished, and the difference is where most of the effort should go.`,
    problem: () =>
      `Scripts of this type are usually written to work on the one input that was available while writing them, and they fail on the first real dataset. The gap is between "works on my sample" and "works on the data". This build defines the input contract up front, handles the failure paths explicitly, and tests them.`,
    objectives: [
      'Define the input and output contract before writing the main logic',
      'Handle malformed, missing and adversarial input without an unhandled crash',
      'Structure the code into testable functions rather than a single long script',
      'Add logging that helps diagnose a failure after the fact',
      'Write tests covering the normal path, the edge cases and the error paths',
    ],
    prereqs: [
      'Python fundamentals: functions, classes, comprehensions, exceptions',
      'Virtual environments and dependency management',
      'Basic testing with pytest or unittest',
      'File formats relevant to the data being processed',
    ],
    architecture: () =>
      `Input arrives through a parser that validates the contract and returns either typed data or a specific error. Processing operates on those types, so invalid data cannot reach the core logic. Results are written through a serialisation layer. Configuration is external, logging is structured, and the entry point does nothing but wire the layers together. Any long-running or parallel work isolates failures per unit rather than aborting the whole run.`,
    phases: [
      {
        title: 'Contract and structure',
        desc: 'Decide what goes in and what comes out before the logic.',
        duration: '0.5 week',
        tasks: [
          'Define the input format and the validation rules',
          'Define the output format precisely',
          'Sketch the module layout and the responsibilities of each part',
          'Set up the project, environment and dependency pinning',
        ],
      },
      {
        title: 'Core implementation',
        desc: 'Build the processing logic against validated inputs.',
        duration: '1.5 weeks',
        tasks: [
          'Implement the parser with specific, actionable error messages',
          'Implement the core processing on typed data',
          'Implement output serialisation',
          'Add structured logging with a correlation identifier',
        ],
      },
      {
        title: 'Robustness and concurrency',
        desc: 'Make failure survivable and work fast on real data volumes.',
        duration: '1 week',
        tasks: [
          'Handle truncated, oversized and malformed input files',
          'Isolate per-item failures so a batch can continue',
          'Add concurrency where it measurably helps, and measure the gain',
          'Add progress reporting and a resumable checkpoint',
        ],
      },
      {
        title: 'Tests and documentation',
        desc: 'Prove the behaviour, then document it so someone else can run it.',
        duration: '0.5-1 week',
        tasks: [
          'Write tests for the normal path, the edge cases and every error path',
          'Measure runtime and memory on a realistically sized dataset',
          'Write a README with setup, usage and known limitations',
          'Package it so it can be installed and run',
        ],
      },
    ],
    bom: [
      { component: 'Development machine', specification: '8 GB RAM is enough for most of this work', quantity: 1, estimatedCost: rupees(35000) },
      { component: 'Python runtime and environment', specification: 'Current version, pinned dependencies', quantity: 1, estimatedCost: rupees(0) },
      { component: 'Sample or real dataset', specification: 'With documented provenance and licence', quantity: 1, estimatedCost: rupees(0) },
      { component: 'Storage for input and output data', specification: 'Sized for the largest expected dataset', quantity: 1, estimatedCost: rupees(4000) },
      { component: 'Version control', specification: 'Git, with the history kept', quantity: 1, estimatedCost: rupees(0) },
      { component: 'Optional display library', specification: 'If a graphical interface is required', quantity: 1, estimatedCost: rupees(0) },
    ],
    validation: [
      'Input validation produces specific messages that name the problem',
      'Malformed, truncated and empty inputs are handled without an unhandled crash',
      'A failure on one item does not abort a whole batch run',
      'Tests cover the normal path, the edge cases and every error path',
      'Runtime and memory are measured on a realistically sized dataset',
      'Concurrency is only added where a measurement shows it helps',
      'Logging is sufficient to diagnose a failure from the log alone',
      'A README covers setup, usage and known limitations',
    ],
    faults: [
      { issue: 'Works on the sample, fails on real data', cause: 'The input contract was never defined, so edge cases were unhandled', solution: 'Define the contract, validate against it, and reject explicitly' },
      { issue: 'Process dies partway through a long run', cause: 'No checkpointing, so all work is lost', solution: 'Add periodic checkpoints and make the run resumable' },
      { issue: 'One bad record kills a batch of thousands', cause: 'A bare except around the loop body', solution: 'Catch per item, record the failure, and continue' },
      { issue: 'Adding threads made it slower', cause: 'GIL contention on CPU-bound work', solution: 'Use processes for CPU-bound work and measure before and after' },
      { issue: 'Works on the developer machine only', cause: 'Unpinned dependencies or a hardcoded path', solution: 'Pin versions, use configuration, and test in a clean environment' },
      { issue: 'Memory grows until the process dies', cause: 'Accumulating results in memory instead of streaming', solution: 'Process in a streaming fashion and write incrementally' },
    ],
    extensions: [
      'Add a progress bar and an estimated time remaining',
      'Add resumable checkpoints for very long runs',
      'Add a simple command-line interface with proper argument validation',
      'Profile the hot path and optimise what the profile actually shows',
      'Add structured logging with a machine-readable format',
      'Publish it as an installable package with tests',
    ],
    safety: [
      'Never run scripts that delete or overwrite data without a dry-run mode',
      'Validate and sanitise any file paths constructed from user input',
      'Keep credentials in environment variables, never in source',
      'Be careful with pickle and deserialisation of untrusted data',
      'Respect rate limits and terms of service for anything scraped',
      'Back up before running any migration or bulk update',
    ],
  },
];

/* --------------------------------------------------------------- generator */

const FALLBACK: Archetype = {
  key: 'general-engineering',
  label: 'General Engineering Project',
  branch: 'Electronics',
  category: 'General Engineering',
  level: 'Intermediate',
  duration: '4-6 weeks',
  keywords: [],
  cats: [],
  overview: (t) =>
    `${cap(t)} is an engineering build that should be planned as a sequence of measurable milestones rather than assembled opportunistically. The specification below is a structured starting plan: the phases, validation gates and fault modes are the generic engineering ones, and the specifics should be filled in from your own requirements and the source write-up.`,
  problem: (t) =>
    `Unplanned student projects of this type fail in predictable ways: the requirement is never written down, so scope creeps; success is declared when it works once rather than when it works reliably; and the failures are never recorded, so the same mistake repeats. Planning "${t}" against explicit gates is what converts a demonstration into a repeatable build.`,
  objectives: [
    'Write a requirements document with measurable acceptance criteria before starting',
    'Break the build into phases, each with its own exit test',
    'Identify the single riskiest assumption and test it first',
    'Instrument the system so its behaviour is measured, not assumed',
    'Record every failure and its cause in a log that survives the project',
  ],
  prereqs: [
    'Fundamentals relevant to your branch: electronics, programming or mechanics',
    'Reading datasheets and reference documentation',
    'Basic measurement: multimeter, and a scope or logger where relevant',
    'A working approach to soldering, assembly or code review',
  ],
  architecture: (t) =>
    `Start from the requirement rather than the component list. Identify the inputs, the processing, and the outputs, then choose the simplest architecture that meets the requirement. Prefer a design you can debug: modular, with clear interfaces between blocks and observability at each boundary. Build the riskiest part first on a bench, and only then integrate. For "${t}", the architecture should be justified against at least one alternative that was rejected, and the reason recorded.`,
  phases: [
    {
      title: 'Requirements and planning',
      desc: 'Define the target precisely, including how you will know it works.',
      duration: '0.5-1 week',
      tasks: [
        'Write measurable acceptance criteria',
        'List constraints: budget, time, tools, skills available',
        'Identify the riskiest assumption and write a test for it',
        'Break the build into phases with an exit test each',
      ],
    },
    {
      title: 'Riskiest component in isolation',
      desc: 'Test the part most likely to fail, before it is integrated with anything else.',
      duration: '1-1.5 weeks',
      tasks: [
        'Build only the critical component on its own',
        'Measure it against the acceptance criteria from phase one',
        'If it fails, change the approach here, not after integration',
        'Record what was learned before moving on',
      ],
    },
    {
      title: 'Integration',
      desc: 'Assemble the pieces and verify each interface as you connect it.',
      duration: '2 weeks',
      tasks: [
        'Integrate one block at a time, verifying at each connection',
        'Test interfaces with their expected and worst-case inputs',
        'Keep a wiring or connection log as you go',
        'Add observability so failures are diagnosable',
      ],
    },
    {
      title: 'Validation and documentation',
      desc: 'Run the acceptance criteria and write it all down.',
      duration: '1-1.5 weeks',
      tasks: [
        'Run every acceptance criterion and record the result',
        'Do several long-duration or repeated runs',
        'Write a build document, a wiring diagram and a bill of materials',
        'Write a limitations section stating what it does not do',
      ],
    },
  ],
  bom: [
    { component: 'Microcontroller or controller board', specification: 'Sized for the required peripherals and memory', quantity: 1, estimatedCost: rupees(700) },
    { component: 'Primary sensor or actuator', specification: 'The main functional element', quantity: 1, estimatedCost: rupees(600) },
    { component: 'Supporting components', specification: 'Regulators, drivers, passives per the design', quantity: 1, estimatedCost: rupees(400) },
    { component: 'Power supply', specification: 'Battery or adapter, with protection', quantity: 1, estimatedCost: rupees(500) },
    { component: 'Enclosure and mechanical parts', specification: 'Chassis, fasteners, strain relief', quantity: 1, estimatedCost: rupees(800) },
    { component: 'Wiring, connectors, consumables', specification: 'Correct gauge, good crimps', quantity: 1, estimatedCost: rupees(350) },
    { component: 'Test equipment', specification: 'Multimeter at minimum', quantity: 1, estimatedCost: rupees(1500) },
  ],
  validation: [
    'Every acceptance criterion from the requirements document is run and recorded',
    'The riskiest assumption was tested in isolation before integration',
    'The build completes at least several repeat runs without intervention',
    'Measured performance is reported as a number, not a description',
    'A wiring or connection diagram matches the as-built device',
    'The bill of materials is complete and matches what was actually used',
    'A limitations section states what the build does not do',
    'The failure log is complete and each entry has a cause',
  ],
  faults: [
    { issue: 'Nothing works and the cause is unclear', cause: 'Too much integrated at once, with no intermediate verification', solution: 'Rebuild one block at a time, verifying at each interface' },
    { issue: 'Works reliably, then fails intermittently', cause: 'Loose connection, insufficient decoupling, or an unverified power budget', solution: 'Check every connection under load and add bulk decoupling' },
    { issue: 'Never reaches the required performance', cause: 'The requirement was not verified against the chosen approach early enough', solution: 'Test the critical path first and be willing to change approach' },
    { issue: 'Component overheats', cause: 'Dissipation not estimated, or no thermal path', solution: 'Calculate dissipation and provide a path to ambient' },
    { issue: 'Fails only at full battery or at temperature extremes', cause: 'Tuned at nominal conditions only', solution: 'Test across the full operating range, not one convenient point' },
    { issue: 'Behaviour changes after a power cycle', cause: 'Uninitialised state or a missing configuration persist step', solution: 'Define initial state explicitly and verify across repeated power cycles' },
  ],
  extensions: [
    'Add a second operating mode and measure the difference',
    'Add remote reporting or logging',
    'Reduce power consumption and measure the improvement',
    'Add a self-test routine that reports pass or fail at power-on',
    'Build a second, simpler version to compare against',
    'Publish the build so someone else can reproduce it',
  ],
  safety: [
    'Use a current-limited supply on first power-up',
    'Never exceed a component rating; check the datasheet maximums',
    'Isolate any mains-connected part properly',
    'Guard moving parts and pinch points before testing',
    'Handle lithium cells with a protection circuit and no unattended charging',
    'Work at safe voltages and know when to stop and ask',
  ],
};

/* ----------------------------------------------------------------- mapping */

function scoreArchetype(entry: CatalogueEntry, a: Archetype): number {
  let score = 0;
  const title = lower(entry.title);
  for (const kw of a.keywords) {
    if (title.includes(lower(kw))) score += kw.length > 8 ? 3 : 2;
  }
  for (const c of a.cats) {
    if (entry.categories.includes(c)) score += 1;
  }
  return score;
}

function pickArchetype(entry: CatalogueEntry): Archetype {
  let best: Archetype = FALLBACK;
  let bestScore = 0;
  for (const a of ARCHETYPES) {
    const s = scoreArchetype(entry, a);
    if (s > bestScore) {
      best = a;
      bestScore = s;
    }
  }
  return bestScore > 0 ? best : FALLBACK;
}

function deriveLevel(
  entry: CatalogueEntry,
  a: Archetype
): Project['level'] {
  const t = lower(entry.title);
  if (/(advanced|using iot with|smart |auto|real[- ]?time|machine learning|blockchain)/.test(t)) {
    return 'Advanced';
  }
  if (/(basic|simple|mini |automatic|detector|indicator)/.test(t)) return 'Beginner';
  return a.level;
}

function buildPhases(a: Archetype): BuildPhase[] {
  return a.phases.map((p, i) => ({
    phase: i + 1,
    title: p.title,
    description: p.desc,
    duration: p.duration,
    tasks: p.tasks,
    deliverables: [
      `Working ${p.title.toLowerCase()} with results recorded`,
      'Notes on what differed from the plan and why',
      'Any measurement taken, with its uncertainty',
    ],
  }));
}

const GENERAL_LABEL = 'General Engineering';

/** Which template an entry resolves to, without building the full document. */
export interface SpecMeta {
  key: string;
  label: string;
  branch: Project['branch'];
  category: string;
  level: Project['level'];
  duration: string;
}

const metaCache = new Map<number, SpecMeta>();

/**
 * Resolve the template, branch, category, level and duration for an entry.
 *
 * Cached per record: the index resolves all 1,858 entries to render the level
 * and template columns, and each resolution is otherwise repeated on every
 * filter change.
 */
export function specMetaForEntry(entry: CatalogueEntry): SpecMeta {
  const hit = metaCache.get(entry.sourceId);
  if (hit) return hit;

  const a = pickArchetype(entry);
  const meta: SpecMeta = {
    key: a.key,
    label: a.label,
    branch: entry.branch ?? a.branch,
    category:
      entry.custom && entry.categories[0]
        ? entry.categories[0]
        : a.key === 'general-engineering'
          ? GENERAL_LABEL
          : a.category,
    level: entry.level ?? deriveLevel(entry, a),
    duration: a.duration,
  };
  metaCache.set(entry.sourceId, meta);
  return meta;
}

/** Full 12-section specification for a catalogue entry. */
export function buildSpecForEntry(entry: CatalogueEntry): Project {
  const a = pickArchetype(entry);
  const title = entry.title;
  const level = entry.level ?? deriveLevel(entry, a);

  const catLabel =
    entry.custom && entry.categories[0]
      ? entry.categories[0]
      : a.key === 'general-engineering'
        ? GENERAL_LABEL
        : a.category;

  const description: ProjectDescription = {
    overview: entry.summary?.trim() || a.overview(title),
    problemStatement: a.problem(title),
    learningObjectives: a.objectives,
    prerequisites: a.prereqs,
    systemArchitecture: a.architecture(title),
    buildPhases: buildPhases(a),
    billOfMaterials: a.bom,
    validationChecklist: a.validation,
    troubleshootingGuide: a.faults,
    extensionIdeas: a.extensions,
    deliverables: [
      'Complete working build with every acceptance criterion verified',
      'Full source or design files, versioned and commented',
      'Wiring diagram, connection log and bill of materials with total cost',
      'Test report recording measured results and their uncertainty',
      'A limitations section stating what the build does not do',
      'A build document sufficient for someone else to reproduce it',
      'A failure log recording every fault encountered and its cause',
    ],
    safetyNotes: a.safety,
  };

  return {
    id: `M20-${entry.sourceId}`,
    title,
    branch: entry.branch ?? a.branch,
    category: catLabel,
    level,
    duration: a.duration,
    description,
    archetypeKey: a.key,
    image: entry.image ?? null,
  };
}

export const ARCHETYPE_COUNT = ARCHETYPES.length;
export { ARCHETYPES, FALLBACK };
