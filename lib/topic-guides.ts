// Subtopic study guides: what to learn + which question types prove mastery.
// All practice/research links are built from the student's OWN exam, so an
// engineering student (IOE/JEE) never gets medical (CEE/NEET) links and every
// search carries the exam suffix for relevant videos.

export interface TopicLink {
  label: string;
  url: string;
}

export interface TopicGuide {
  /** distinctive lowercase keywords used for fallback matching */
  keys: string[];
  whatToLearn: string[];
  questionTypes: string[];
}

const yt = (q: string): string =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

const NCERT = "https://ncert.nic.in/textbook.php";
const KHAN_PHY = "https://www.khanacademy.org/science/physics";
const KHAN_CHEM = "https://www.khanacademy.org/science/chemistry";
const KHAN_BIO = "https://www.khanacademy.org/science/biology";
const KHAN_MATH = "https://www.khanacademy.org/math";

const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9+ ]/g, " ").replace(/\s+/g, " ").trim();

/** Stable key for per-subtopic checklist progress (survives rebuilds/moves). */
export const progressKey = (chapter: string, topic: string | null) =>
  `${norm(chapter)}||${norm(topic ?? "")}`;

/** Exam id → stream label used as the search suffix. */
export function examLabel(examId: string): string {
  switch (examId) {
    case "ioe":
      return "IOE";
    case "jee":
      return "JEE";
    case "cee":
      return "CEE";
    case "neet":
      return "NEET";
    case "neb":
      return "NEB Class 12";
    case "sat":
      return "SAT";
    default:
      return "";
  }
}

function khanFor(subject: string): { label: string; url: string } | null {
  const s = norm(subject);
  if (s.includes("phys")) return { label: "Khan Academy — Physics", url: KHAN_PHY };
  if (s.includes("chem")) return { label: "Khan Academy — Chemistry", url: KHAN_CHEM };
  if (s.includes("botany") || s.includes("zoolog") || s.includes("bio")) return { label: "Khan Academy — Biology", url: KHAN_BIO };
  if (s.includes("math")) return { label: "Khan Academy — Math", url: KHAN_MATH };
  return null;
}

/** Practice links: PYQ video searches suffixed with the student's exam. */
export function pyqLinks(topic: string, examId: string): TopicLink[] {
  const exam = examLabel(examId);
  const suffixed = exam ? `${topic} ${exam}` : topic;
  return [
    { label: exam ? `PYQs: ${topic} (${exam})` : `PYQs: ${topic}`, url: yt(`${suffixed} previous year questions`) },
    { label: "Q&A / discussion videos", url: yt(`${suffixed} questions answers discussion`) },
  ];
}

/** Research links: NCERT e-book, matching Khan Academy subject, explainer search. */
export function researchLinks(topic: string, subject: string, examId: string): TopicLink[] {
  const exam = examLabel(examId);
  const suffixed = exam ? `${topic} ${exam}` : topic;
  const links: TopicLink[] = [{ label: "NCERT e-books (Class 11–12)", url: NCERT }];
  const khan = khanFor(subject);
  if (khan) links.push(khan);
  links.push({ label: `Explainer: ${topic}`, url: yt(`${suffixed} explained`) });
  return links;
}

type Entry = { chapter: string; topic: string; guide: TopicGuide };

const G: Entry[] = [
  {
    chapter: "Thermodynamics & Chemical Equilibrium",
    topic: "Thermochemistry & Hess's law",
    guide: {
      keys: ["hess", "thermochemistry"],
      whatToLearn: [
        "System vs surrounding; state functions (U, H) vs path functions (q, w)",
        "First law ΔU = q + w with sign convention (work done BY the system is negative)",
        "Hess's law: add reaction steps, flip signs on reversal, scale with coefficients",
        "Standard enthalpy of formation; bond-enthalpy estimation",
      ],
      questionTypes: [
        "Hess-cycle numericals (find ΔH of an untabulated reaction)",
        "ΔH from bond energies",
        "First-law sign-convention traps",
        "Calorimetry: heat released per gram of fuel",
      ],
    },
  },
  {
    chapter: "Thermodynamics & Chemical Equilibrium",
    topic: "Equilibrium & Le Chatelier",
    guide: {
      keys: ["le chatelier", "chemical equilibrium"],
      whatToLearn: [
        "Write Kc and Kp with correct units; know Kp = Kc(RT)^Δn",
        "Reaction quotient Q vs K: which way the reaction shifts",
        "Le Chatelier: temperature, pressure, concentration, catalyst effects",
        "ICE tables for initial-change-equilibrium problems",
      ],
      questionTypes: [
        "Kc/Kp interconversion with Δn",
        "ICE-table equilibrium concentration numericals",
        "Q vs K direction prediction",
        "Effect-of-change MCQs (temperature/pressure/catalyst)",
      ],
    },
  },
  {
    chapter: "Thermodynamics & Chemical Equilibrium",
    topic: "Acid-base theories & ionic equilibrium",
    guide: {
      keys: ["arrhenius", "bronsted", "lewis acid"],
      whatToLearn: [
        "Arrhenius vs Brønsted–Lowry vs Lewis definitions with one example each",
        "Conjugate acid–base pairs; strong vs weak electrolytes",
        "Degree of dissociation and Ostwald's dilution law",
      ],
      questionTypes: [
        "Classify species as acid/base under each theory",
        "Conjugate-pair identification",
        "Ostwald dilution numericals",
        "Strong-vs-weak conductivity reasoning",
      ],
    },
  },
  {
    chapter: "Thermodynamics & Chemical Equilibrium",
    topic: "Ionic equilibrium: pH, buffers & solubility product",
    guide: {
      keys: ["henderson", "solubility product", "buffer"],
      whatToLearn: [
        "pH/pOH/[H⁺] conversions; pH of strong vs weak acids",
        "Buffer action + Henderson–Hasselbalch equation",
        "Ksp expressions; predicting precipitation (Qsp vs Ksp)",
        "Salt hydrolysis: acidic, basic and neutral salts",
      ],
      questionTypes: [
        "pH of weak acid/base numericals",
        "Buffer pH via Henderson–Hasselbalch",
        "Will it precipitate? (Qsp vs Ksp)",
        "Salt-hydrolysis pH prediction",
      ],
    },
  },
  {
    chapter: "Mole Concept & Physical Methods",
    topic: "Mole concept & stoichiometry",
    guide: {
      keys: ["limiting reagent", "stoichiometry"],
      whatToLearn: [
        "Mole ↔ particles ↔ mass ↔ gas-volume conversions",
        "Balanced equations: weight–weight and weight–volume problems",
        "Limiting reagent and percentage yield",
      ],
      questionTypes: [
        "Limiting-reagent mass problems",
        "Gas-volume stoichiometry at STP",
        "Empirical/molecular formula from % composition",
        "Yield and purity numericals",
      ],
    },
  },
  {
    chapter: "Mole Concept & Physical Methods",
    topic: "Equivalent/atomic weight & Dulong–Petit",
    guide: {
      keys: ["dulong", "equivalent weight"],
      whatToLearn: [
        "Equivalent weight by hydrogen-displacement and oxide methods",
        "Atomic weight = equivalent weight × valency",
        "Dulong–Petit's rule for approximate atomic weight",
      ],
      questionTypes: [
        "Equivalent weight from displacement data",
        "Valency from equivalent + atomic weight",
        "Dulong–Petit numericals",
      ],
    },
  },
  {
    chapter: "Mole Concept & Physical Methods",
    topic: "Victor Meyer & volumetric analysis",
    guide: {
      keys: ["victor meyer", "acidimetry", "titration"],
      whatToLearn: [
        "Victor Meyer's method: vapour density → molecular weight",
        "Avogadro's hypothesis and its deductions",
        "Acidimetry/alkalimetry principles; titration end-point math",
      ],
      questionTypes: [
        "Molecular weight from Victor Meyer data",
        "Titration molarity/volume numericals",
        "Equivalent weights of acids, bases and salts",
      ],
    },
  },
  {
    chapter: "Electrochemistry & Chemical Kinetics",
    topic: "Redox balancing by oxidation number",
    guide: {
      keys: ["oxidation number", "redox balancing"],
      whatToLearn: [
        "Classical vs electronic definition of oxidation/reduction",
        "Assign oxidation numbers (peroxide, superoxide and hydride exceptions)",
        "Balance by oxidation-number method, acidic and basic medium",
      ],
      questionTypes: [
        "Oxidation-number assignment traps",
        "Full redox balancing in acidic medium",
        "Full redox balancing in basic medium",
        "Oxidant vs reductant identification",
      ],
    },
  },
  {
    chapter: "Electrochemistry & Chemical Kinetics",
    topic: "Galvanic cells & Nernst equation",
    guide: {
      keys: ["nernst", "galvanic", "daniel cell"],
      whatToLearn: [
        "Daniel cell: anode/cathode, electron flow, salt bridge role",
        "Standard electrode potential and the electrochemical series",
        "Nernst equation for cell EMF at non-standard conditions",
      ],
      questionTypes: [
        "Cell notation and EMF from E° values",
        "Nernst-equation concentration cells",
        "Feasibility prediction from E°cell sign",
      ],
    },
  },
  {
    chapter: "Electrochemistry & Chemical Kinetics",
    topic: "Electrolysis & Faraday's laws",
    guide: {
      keys: ["faraday", "electrolysis"],
      whatToLearn: [
        "Strong vs weak electrolytes; preferential discharge",
        "Faraday's first and second laws (W = ZQ)",
        "Products of electrolysis: molten vs aqueous cases",
      ],
      questionTypes: [
        "Mass deposited from current × time",
        "Two-cell series (same charge) problems",
        "Product prediction at each electrode",
      ],
    },
  },
  {
    chapter: "Electrochemistry & Chemical Kinetics",
    topic: "Rate laws & order of reaction",
    guide: {
      keys: ["rate law", "order of reaction", "half life"],
      whatToLearn: [
        "Rate law vs balanced equation; order vs molecularity",
        "First-order integrated law and half-life (t½ = 0.693/k)",
        "Effect of temperature, catalyst and surface area",
      ],
      questionTypes: [
        "Order from initial-rate table data",
        "First-order half-life numericals",
        "Order vs molecularity traps",
      ],
    },
  },
  {
    chapter: "Magnetism, EMI & AC",
    topic: "Biot-Savart, Ampere's law & solenoid",
    guide: {
      keys: ["biot", "ampere", "solenoid"],
      whatToLearn: [
        "Biot–Savart law: field at centre of a loop and on an axis",
        "Ampere's circuital law: straight wire, solenoid, toroid",
        "Right-hand rules for direction (grip rule, cross-product sense)",
      ],
      questionTypes: [
        "Field at loop centre / solenoid interior",
        "Direction-of-field MCQs",
        "Ampere's law symmetry applications",
      ],
    },
  },
  {
    chapter: "Magnetism, EMI & AC",
    topic: "Force on conductors & galvanometer",
    guide: {
      keys: ["lorentz", "galvanometer", "cyclotron"],
      whatToLearn: [
        "Lorentz force F = q(v × B); direction by Fleming's left hand",
        "Force and torque on a current loop in a field",
        "Moving-coil galvanometer → voltmeter/ammeter conversion math",
      ],
      questionTypes: [
        "Charge deflection direction and radius",
        "Torque on loop numericals",
        "Shunt and series-resistance conversion problems",
      ],
    },
  },
  {
    chapter: "Magnetism, EMI & AC",
    topic: "EMI, Lenz's law & AC circuits",
    guide: {
      keys: ["lenz", "flux", "resonance", "emf induced"],
      whatToLearn: [
        "Magnetic flux Φ = BA cos θ — the single idea behind all of EMI",
        "Faraday's law ε = −N·dΦ/dt; Lenz's law gives the direction (opposes the change)",
        "Motional EMF (ε = Blv), self/mutual inductance basics",
        "AC: rms vs peak, phasors, LCR resonance condition and Q-factor",
      ],
      questionTypes: [
        "Flux-change → induced EMF magnitude and direction",
        "Lenz's law direction traps (approaching/receding magnet, loop in varying field)",
        "Motional EMF on sliding rods",
        "LCR resonance frequency and sharpness MCQs",
      ],
    },
  },
  {
    chapter: "Electrostatics & Current Electricity",
    topic: "Coulomb's law, field & Gauss's law",
    guide: {
      keys: ["gauss", "coulomb", "electric field"],
      whatToLearn: [
        "Coulomb's law with superposition; permittivity of free space",
        "E-field of point charges, dipole (axial vs equatorial) and continuous distributions",
        "Gauss's law applications: shell, infinite line, infinite sheet",
      ],
      questionTypes: [
        "Net force/field from charge arrangements",
        "Dipole field and torque problems",
        "Gauss's law symmetry applications",
      ],
    },
  },
  {
    chapter: "Electrostatics & Current Electricity",
    topic: "Potential, capacitors & dielectrics",
    guide: {
      keys: ["capacitor", "dielectric", "electric potential"],
      whatToLearn: [
        "Potential V = kQ/r; equipotentials are perpendicular to field lines",
        "Capacitance definition; series vs parallel combinations",
        "Dielectric effect (K factor) and energy U = ½CV²",
      ],
      questionTypes: [
        "Equivalent capacitance of mixed networks",
        "Dielectric-slab insertion (battery connected vs isolated)",
        "Energy and force between plates",
      ],
    },
  },
  {
    chapter: "Electrostatics & Current Electricity",
    topic: "Current, Kirchhoff's laws & networks",
    guide: {
      keys: ["kirchhoff", "wheatstone", "current electricity"],
      whatToLearn: [
        "Drift velocity, Ohm's law and resistivity vs resistance",
        "Kirchhoff's junction and loop rules, applied step by step",
        "Wheatstone bridge balance; potentiometer principle",
      ],
      questionTypes: [
        "Multi-loop circuit currents",
        "Wheatstone bridge balance and meter-bridge Numericals",
        "Potentiometer comparison and internal resistance",
      ],
    },
  },
  {
    chapter: "Electrostatics & Current Electricity",
    topic: "Bridges, potentiometer & heating effects",
    guide: {
      keys: ["potentiometer", "joule heating", "thermoelectric"],
      whatToLearn: [
        "Joule heating H = I²Rt and electric power ratings",
        "Thermoelectricity basics (Seebeck effect)",
        "Chemical effect of current revision + instrument conversions",
      ],
      questionTypes: [
        "Power-rating and fuse problems",
        "Heating-coil series/parallel time problems",
        "Instrument conversion one-markers",
      ],
    },
  },
  {
    chapter: "Thermodynamics, Equilibrium & Redox",
    topic: "Thermochemistry & Hess's law",
    guide: {
      keys: ["hess", "thermochemistry"],
      whatToLearn: [
        "First law with sign convention; enthalpy vs internal energy",
        "Hess's law cycles and standard enthalpies of formation",
        "Bond-enthalpy estimation shortcuts",
      ],
      questionTypes: [
        "Hess-cycle numericals",
        "ΔH from bond energies",
        "Calorimetry and fuel problems",
      ],
    },
  },
  {
    chapter: "Thermodynamics, Equilibrium & Redox",
    topic: "Chemical & ionic equilibrium",
    guide: {
      keys: ["chemical equilibrium", "ionic equilibrium", "le chatelier"],
      whatToLearn: [
        "Kc/Kp with Kp = Kc(RT)^Δn; Q vs K direction",
        "Le Chatelier for T, P, concentration and catalyst",
        "pH, buffers (Henderson–Hasselbalch) and Ksp precipitation",
      ],
      questionTypes: [
        "Kc/Kp interconversion",
        "ICE-table numericals",
        "Buffer pH and Qsp-vs-Ksp decisions",
      ],
    },
  },
  {
    chapter: "Thermodynamics, Equilibrium & Redox",
    topic: "pH, buffers & solubility product",
    guide: {
      keys: ["henderson", "solubility product", "buffer"],
      whatToLearn: [
        "pH of strong/weak acids and bases",
        "Buffer design with Henderson–Hasselbalch",
        "Ksp expressions; common-ion effect",
      ],
      questionTypes: [
        "Weak-acid pH numericals",
        "Buffer pH after adding acid/base",
        "Precipitation prediction",
      ],
    },
  },
  {
    chapter: "Thermodynamics, Equilibrium & Redox",
    topic: "Redox & electrochemistry",
    guide: {
      keys: ["nernst", "redox", "electrochemistry"],
      whatToLearn: [
        "Oxidation numbers and balancing in acidic/basic medium",
        "Galvanic cells, E° series and Nernst equation",
        "Faraday's laws for deposition problems",
      ],
      questionTypes: [
        "Redox balancing",
        "Cell EMF and feasibility",
        "Electrolysis mass–time numericals",
      ],
    },
  },
];

const byExact = new Map(G.map((e) => [`${norm(e.chapter)}||${norm(e.topic)}`, e.guide]));
const byTopic = new Map<string, TopicGuide>();
for (const e of G) {
  const k = norm(e.topic);
  if (!byTopic.has(k)) byTopic.set(k, e.guide);
}

export interface ParsedItem {
  subject: string;
  chapter: string;
  topic: string | null;
}

/** Split "Learn: Physics · Magnetism — EMI" into its parts. */
export function parseItemTitle(title: string): ParsedItem {
  const t = title.replace(/^(Learn|Review|Revision)\s*:\s*/, "");
  const [left, ...rest] = t.split("·");
  const right = rest.join("·").trim();
  const dash = right.split("—");
  const topic = dash.length > 1 ? dash.slice(1).join("—").trim() : null;
  return {
    subject: (left ?? "").trim(),
    chapter: (dash[0] ?? right).trim(),
    topic: topic || null,
  };
}

/** Best guide for a chapter+topic, with graceful fallbacks. */
export function getTopicGuide(chapter: string, topic: string | null): TopicGuide | null {
  if (topic) {
    const exact = byExact.get(`${norm(chapter)}||${norm(topic)}`);
    if (exact) return exact;
    const tOnly = byTopic.get(norm(topic));
    if (tOnly) return tOnly;
  }
  const hay = norm(`${chapter} ${topic ?? ""}`);
  let best: TopicGuide | null = null;
  let bestScore = 0;
  for (const e of G) {
    const score = e.guide.keys.filter((k) => hay.includes(k)).length;
    if (score > bestScore) {
      bestScore = score;
      best = e.guide;
    }
  }
  return bestScore > 0 ? best : null;
}

/** Generic guide so no subtopic is ever empty. */
export function genericGuide(chapter: string, topic: string | null): TopicGuide {
  const name = topic ?? chapter;
  return {
    keys: [],
    whatToLearn: [
      `Read ${name} once fully — definitions first, derivations second`,
      "List every formula on one page from memory, then verify",
      "Work 5 solved examples before touching unsolved problems",
    ],
    questionTypes: [
      "One-mark definition and unit questions",
      "Direct formula-application numericals",
      "Previous-year pattern problems on this topic",
    ],
  };
}
