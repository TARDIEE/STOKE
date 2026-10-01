export interface ExamChapter {
  name: string;
  /** 1 (low) – 5 (very high yield) */
  weight: 1 | 2 | 3 | 4 | 5;
  /** estimated study hours */
  hours: number;
  /** Day-size subtopics — the planner schedules one per day. */
  topics: string[];
}
export interface ExamSubject {
  name: string;
  color: string;
  chapters: ExamChapter[];
}
export interface ExamDef {
  id: string;
  name: string;
  region: string;
  tagline: string;
  typicalMonth: string;
  subjects: ExamSubject[];
}

const W = (name: string, weight: 1 | 2 | 3 | 4 | 5, hours: number, topics: string[] = []): ExamChapter => ({ name, weight, hours, topics });

export const EXAMS: ExamDef[] = [
  {
    id: "ioe",
    name: "IOE Entrance",
    region: "Nepal · BE/BCT",
    tagline: "Engineering entrance (Tribhuvan University)",
    typicalMonth: "July",
    subjects: [
      {
        name: "Mathematics", color: "#7C3AED",
        chapters: [
          W("Sets, Relations & Functions", 3, 4, ["Sets, relations & types of functions", "Graphs: algebraic, trig, exp & log", "Hyperbolic functions & inverses"]),
          W("Complex Numbers, Matrices & Determinants", 4, 6, ["Complex algebra & Argand plane", "De Moivre's theorem & roots of unity", "Matrices, determinants & inverse"]),
          W("Sequences & Series", 3, 4, ["AP, GP & HP means", "Binomial theorem & exp/log series", "Series summation techniques"]),
          W("Trigonometry", 3, 5, ["Equations & general values", "Inverse trigonometry & principal values", "Triangle centres & properties"]),
          W("Straight Lines & Circles", 3, 5, ["Straight lines & pair of lines", "Circles, tangents & chords", "Family of circles"]),
          W("Conic Sections", 4, 6, ["Parabola & standard forms", "Ellipse & hyperbola", "Tangents, normals & general second degree"]),
          W("Limits & Continuity", 3, 4, ["Limits & standard forms", "Continuity & differentiability basics", "L'Hôpital's rule"]),
          W("Differentiation & Applications", 5, 8, ["Rules, chain & parametric differentiation", "Tangents, normals, rates & differentials", "Maxima-minima & Rolle's/MVT"]),
          W("Integration & Area Under Curve", 5, 8, ["Standard integrals & substitution", "Definite integral as limit of a sum", "Area under & between curves"]),
          W("Differential Equations", 3, 4, ["Formation, order & degree", "Variable separable & homogeneous", "Linear equations & applications"]),
          W("Vectors & 3D Geometry", 3, 5, ["Vectors & linear dependence", "Dot/cross products & applications", "3D lines, planes & spheres"]),
          W("Probability & Statistics", 2, 3, ["Permutations & combinations", "Probability & Bayes' theorem", "Mean, dispersion & distributions"]),
        ],
      },
      {
        name: "Physics", color: "#0EA5E9",
        chapters: [
          W("Units, Dimensions & Measurement", 2, 2, ["Units, dimensions & errors"]),
          W("Kinematics & Laws of Motion", 5, 7, ["Vectors, relative velocity & projectiles", "Newton's laws, friction & equilibrium", "Circular motion, moments & centre of mass"]),
          W("Work, Energy, Power & Rotation", 5, 7, ["Work-energy theorem & power", "Momentum, collisions & centre of mass", "Torque, angular momentum & MI", "Elasticity, fluids & viscosity"]),
          W("Gravitation", 2, 2, ["Kepler's laws & variation of g", "Satellites & escape velocity"]),
          W("Heat & Thermodynamics", 4, 6, ["Temperature scales, expansion & calorimetry", "Gas laws, KTG & humidity", "Thermodynamics laws & Carnot engine", "Heat transfer: conduction, convection, radiation"]),
          W("Oscillations & Waves", 3, 5, ["SHM, pendulum & resonance", "Progressive waves & superposition", "Sound: pipes, strings, beats & Doppler"]),
          W("Optics", 3, 5, ["Mirrors, refraction & total internal reflection", "Lenses, prisms, dispersion & optical instruments", "Telescope, microscope & vision defects", "Huygens principle, interference, diffraction & polarization"]),
          W("Electrostatics & Current Electricity", 4, 6, ["Coulomb's law, field & Gauss's law", "Potential, capacitors & dielectrics", "Current, Kirchhoff's laws & networks", "Bridges, potentiometer & heating effects"]),
          W("Magnetism, EMI & AC", 4, 6, ["Biot-Savart, Ampere's law & solenoid", "Force on conductors & galvanometer", "EMI, Lenz's law & AC circuits"]),
          W("Modern Physics & Electronics", 3, 5, ["Cathode rays, e/m & Bohr atom", "X-rays, photoelectric effect & radioactivity", "Nuclear fission/fusion & semiconductors"]),
        ],
      },
      {
        name: "Chemistry", color: "#22C55E",
        chapters: [
          W("Atomic Structure & Chemical Bonding", 4, 6, ["Cathode rays, Rutherford & Bohr models", "Quantum numbers & configuration", "Octet rule: ionic, covalent & coordinate", "Periodic trends: IP, EN & radii"]),
          W("Mole Concept & Physical Methods", 3, 4, ["Mole concept & stoichiometry", "Equivalent/atomic weight & Dulong–Petit", "Victor Meyer & volumetric analysis", "Ionic equilibrium: pH, buffers & solubility product"]),
          W("Thermodynamics & Chemical Equilibrium", 4, 6, ["Thermochemistry & Hess's law", "Equilibrium & Le Chatelier", "Acid-base theories & ionic equilibrium", "Ionic equilibrium: pH, buffers & solubility product"]),
          W("Electrochemistry & Chemical Kinetics", 3, 5, ["Redox balancing by oxidation number", "Galvanic cells & Nernst equation", "Electrolysis & Faraday's laws", "Rate laws & order of reaction"]),
          W("Periodic Table & s/p-Block Elements", 3, 4, ["Mendeleev & modern periodic law", "s-block: Na extraction, soda & salts", "p-block groups 13–18", "Non-metals: water, ammonia, acids & halogens"]),
          W("d/f-Block & Coordination Compounds", 3, 4, ["Metallurgy: Cu, Zn & Fe extraction", "Transition metals & steel", "Coordination compounds & isomerism"]),
          W("GOC & Hydrocarbons", 5, 7, ["Sources, purification & IUPAC naming", "Methane, ethylene & acetylene", "Ethyl iodide & substitution basics", "Benzene: structure, prep & properties"]),
          W("Haloalkanes to Amines", 4, 6, ["Haloalkanes: SN1/SN2 & eliminations", "Alcohols, phenols & ethers", "Amines & diazonium compounds"]),
          W("Carbonyl & Carboxylic Compounds", 3, 4, ["Aldehydes & ketones", "Carboxylic acids & derivatives", "Named condensation reactions"]),
          W("Biomolecules & Everyday Chemistry", 2, 3, ["Carbohydrates & proteins", "Vitamins, enzymes & nucleic acids", "Chemistry in everyday life"]),
        ],
      },
      {
        name: "English", color: "#F59E0B",
        chapters: [
          W("Reading Comprehension", 4, 5, ["General vs technical passages", "Inference, tone & speed", "Timed passage drills"]),
          W("Grammar: Tenses, Voice & Narration", 4, 5, ["Tenses, aspect & concord", "Active-passive & direct-indirect", "Conditionals, transformation & sentence kinds"]),
          W("Vocabulary: Words, Idioms & Sounds", 3, 4, ["Synonyms, antonyms & one-word", "Prepositions & idiomatic expressions", "Punctuation, phonemes & word stress"]),
          W("Error Detection & Sentence Improvement", 3, 4, ["Error detection drills", "Sentence improvement", "Cloze & fill in the blanks"]),
        ],
      },
    ],
  },
  {
    id: "cee",
    name: "CEE Medical",
    region: "Nepal · MBBS/BDS/Nursing",
    tagline: "Common entrance exam (Medical Education Commission)",
    typicalMonth: "September",
    subjects: [
      {
        name: "Physics", color: "#0EA5E9",
        chapters: [
          W("Units, Dimensions & Mechanics Basics", 3, 5, ["Units, dimensions & vectors", "Kinematics & projectiles", "Laws of motion & friction"]),
          W("Laws of Motion, Work & Rotation", 5, 8, ["Work, energy & power", "Circular motion & gravitation", "Rotation & moment of inertia"]),
          W("Heat & Thermodynamics", 3, 5, ["Heat transfer & expansion", "Kinetic theory & thermodynamics", "Oscillations & waves"]),
          W("Optics & Wave Motion", 4, 6, ["Ray optics: mirrors & lenses", "Prisms & optical instruments", "Wave optics & Doppler effect"]),
          W("Electrostatics & Current Electricity", 5, 8, ["Coulomb's law, field & potential", "Capacitors & dielectrics", "Current, circuits & Kirchhoff's laws", "Heating, chemical effects & meters"]),
          W("Magnetism, EMI & Modern Physics", 4, 6, ["Magnetism & moving charges", "EMI, AC & EM waves", "Modern physics & semiconductors"]),
        ],
      },
      {
        name: "Chemistry", color: "#22C55E",
        chapters: [
          W("Atomic Structure & Chemical Bonding", 4, 6, ["Structure of atom & spectra", "Bonding & molecular shapes", "Periodic table trends"]),
          W("Physical Chemistry Core: Mole, Thermo, Equilibrium", 5, 8, ["Mole, gaseous state & solutions", "Thermodynamics & equilibrium", "Redox & electrochemistry", "Kinetics & rate laws"]),
          W("s/p/d-Block Elements", 3, 5, ["s-block & hydrogen", "p-block elements", "d/f-block & coordination compounds"]),
          W("GOC & Hydrocarbons", 5, 7, ["Electronic effects & intermediates", "Alkanes, alkenes & alkynes", "Benzene & aromaticity", "Isomerism & purification"]),
          W("Functional Groups & Reaction Mechanisms", 4, 6, ["Haloalkanes & alcohols", "Carbonyl & carboxylic compounds", "Nitrogen compounds"]),
          W("Biomolecules & Chemistry in Life", 3, 4, ["Carbohydrates & lipids", "Proteins, enzymes & vitamins", "Nucleic acids & applied chemistry"]),
        ],
      },
      {
        name: "Botany", color: "#16A34A",
        chapters: [
          W("Cell Structure & Biomolecules", 3, 5, ["Cell structure & organelles", "Cell division: mitosis & meiosis", "Biomolecules"]),
          W("Plant Kingdom & Morphology", 3, 4, ["Plant kingdom classification", "Morphology of flowering plants", "Anatomy: tissues & systems"]),
          W("Anatomy & Plant Physiology", 4, 6, ["Transport & transpiration", "Photosynthesis", "Respiration", "Growth & plant hormones"]),
          W("Genetics & Biotechnology", 4, 6, ["Mendelism & inheritance", "Molecular basis: DNA & RNA", "Biotechnology & applications"]),
          W("Ecology & Environment", 3, 4, ["Ecosystem & succession", "Biodiversity & conservation", "Environmental issues"]),
        ],
      },
      {
        name: "Zoology", color: "#EF4444",
        chapters: [
          W("Animal Kingdom & Organisation", 3, 4, ["Animal kingdom & phyla", "Tissues & body plans", "Cockroach & frog anatomy"]),
          W("Human Physiology I: Digestion, Respiration, Circulation", 5, 8, ["Digestion & absorption", "Breathing & gas exchange", "Circulation", "Excretion"]),
          W("Human Physiology II: Nervous, Excretion, Reproduction", 5, 8, ["Nervous coordination", "Chemical coordination", "Reproduction", "Development & gametogenesis"]),
          W("Genetics, Evolution & Human Health", 4, 6, ["Heredity & variations", "Evolution & evidences", "Human health & disease"]),
        ],
      },
    ],
  },
  {
    id: "jee",
    name: "JEE Main + Advanced",
    region: "India · Engineering",
    tagline: "IIT / NIT entrance examination",
    typicalMonth: "January",
    subjects: [
      {
        name: "Physics", color: "#0EA5E9",
        chapters: [
          W("Kinematics & Laws of Motion", 4, 7, ["Vectors & relative motion", "Laws of motion & friction", "Circular motion & projectiles"]),
          W("Work, Energy & Rotational Mechanics", 4, 7, ["Work, energy & power", "Momentum, collisions & centre of mass", "Rotational dynamics", "MI theorems & rolling"]),
          W("Gravitation & Properties of Matter", 3, 4, ["Gravitation & satellites", "Elasticity & fluids", "Viscosity & surface tension"]),
          W("Heat & Thermodynamics", 4, 6, ["Thermal expansion & calorimetry", "Kinetic theory & gas laws", "Laws of thermodynamics & cycles", "SHM & pendulums"]),
          W("SHM & Wave Motion", 3, 5, ["Simple harmonic motion", "Wave motion & superposition", "Sound, beats & Doppler effect"]),
          W("Electrostatics & Current Electricity", 5, 8, ["Coulomb's law, field & Gauss's law", "Potential & capacitors", "Current, networks & Kirchhoff's laws", "Meters, bridges & heating effects"]),
          W("Magnetism, EMI & Alternating Current", 4, 6, ["Biot-Savart, Ampere's law & solenoid", "Lorentz force & galvanometer", "EMI, inductance & Lenz's law", "AC, resonance & EM waves"]),
          W("Ray & Wave Optics", 4, 6, ["Mirrors, refraction & TIR", "Lenses, prism & optical instruments", "Interference & diffraction", "Polarization & resolving power"]),
          W("Modern Physics", 5, 7, ["Photoelectric effect & dual nature", "Bohr atom & X-rays", "Nuclei & radioactivity", "Semiconductors & logic gates"]),
        ],
      },
      {
        name: "Chemistry", color: "#22C55E",
        chapters: [
          W("Mole Concept & Atomic Structure", 4, 6, ["Mole concept & stoichiometry", "Atomic structure & spectra", "Gaseous state & redox"]),
          W("Bonding & Periodic Classification", 4, 5, ["Periodic trends", "Ionic/covalent bonding & Fajans' rules", "Hybridization & MOT", "VSEPR shapes & dipole moment"]),
          W("Thermodynamics, Equilibrium & Redox", 4, 6, ["Thermochemistry & Hess's law", "Chemical & ionic equilibrium", "pH, buffers & solubility product", "Redox & electrochemistry"]),
          W("s/p/d/f-Block Elements", 3, 5, ["Hydrogen & s-block", "p-block elements (13–18)", "d/f-block & coordination compounds"]),
          W("GOC & Hydrocarbons", 5, 7, ["Electronic effects & intermediates", "Reaction types & mechanisms", "Alkanes, alkenes & alkynes", "Benzene & electrophilic substitution"]),
          W("Oxygen & Nitrogen Functional Groups", 4, 6, ["Haloalkanes: SN1/SN2 & eliminations", "Alcohols, phenols & ethers", "Carbonyl reactions", "Acids, amines & diazonium salts"]),
          W("Biomolecules, Polymers & Practical Chemistry", 3, 4, ["Biomolecules", "Polymers & everyday chemistry", "Salt analysis & practical chemistry"]),
        ],
      },
      {
        name: "Mathematics", color: "#7C3AED",
        chapters: [
          W("Complex Numbers, Matrices & Determinants", 4, 6, ["Complex numbers & Argand plane", "Quadratic equations", "Matrices & determinants"]),
          W("Permutations, Combinations & Probability", 3, 5, ["Permutations & combinations", "Binomial theorem", "Probability & Bayes' theorem"]),
          W("Sequences, Series & Trigonometry", 3, 5, ["Sequences, series & means", "Trigonometric ratios & identities", "Inverse trigonometry"]),
          W("Coordinate Geometry: Lines, Circles, Conics", 5, 8, ["Straight lines & pair of lines", "Circles, tangents & chords", "Parabola & ellipse", "Hyperbola & combined equations"]),
          W("Limits, Continuity & Differentiability", 4, 6, ["Limits & standard forms", "Continuity & differentiability", "Chain rule & parametric differentiation"]),
          W("Applications & Definite Integration", 5, 8, ["Rolle's, MVT, rates & approximations", "Maxima & minima", "Indefinite integration", "Definite integrals & area"]),
          W("Differential Equations, Vectors & 3D", 4, 6, ["Differential equations", "Vectors: products & applications", "3D: lines, planes & distances"]),
        ],
      },
    ],
  },
  {
    id: "neet",
    name: "NEET-UG",
    region: "India · Medical",
    tagline: "MBBS / BDS entrance (NCERT based)",
    typicalMonth: "May",
    subjects: [
      {
        name: "Physics", color: "#0EA5E9",
        chapters: [
          W("Mechanics: Motion, Laws, Work & Rotation", 5, 9, ["Kinematics & laws of motion", "Work, energy & power", "System of particles & rotation", "Gravitation"]),
          W("Heat & Thermodynamics", 3, 5, ["Thermal properties & kinetic theory", "Thermodynamics", "Oscillations & waves"]),
          W("Optics & Wave Motion", 3, 5, ["Ray optics", "Wave optics", "Sound & Doppler effect"]),
          W("Electricity & Magnetism", 5, 9, ["Electrostatics & capacitors", "Current electricity", "Magnetism & moving charges", "EMI, AC & EM waves"]),
          W("Modern Physics & Electronics", 4, 6, ["Dual nature & atoms", "Nuclei & radioactivity", "Semiconductors & logic gates"]),
        ],
      },
      {
        name: "Chemistry", color: "#22C55E",
        chapters: [
          W("Physical Chemistry Core", 5, 8, ["Mole & atomic structure", "Thermodynamics", "Equilibrium & redox", "Electrochemistry & kinetics"]),
          W("Inorganic: Block Chemistry & Coordination", 4, 6, ["Classification & periodicity", "p-block elements", "d/f-block & coordination compounds"]),
          W("Organic: GOC & Hydrocarbons", 4, 6, ["GOC & purification", "Hydrocarbons", "Environmental chemistry"]),
          W("Organic Functional Groups", 4, 6, ["Haloalkanes, alcohols & phenols", "Aldehydes, ketones & acids", "Amines & diazonium salts"]),
          W("Biomolecules & Everyday Chemistry", 3, 4, ["Carbohydrates & proteins", "Polymers & everyday chemistry", "Chemistry in everyday life"]),
        ],
      },
      {
        name: "Botany", color: "#16A34A",
        chapters: [
          W("Cell Structure & Cell Cycle", 4, 6, ["Cell: the unit of life", "Cell cycle & division", "Biomolecules"]),
          W("Plant Kingdom", 3, 4, ["Algae, fungi & bryophytes", "Pteridophytes & gymnosperms", "Angiosperms"]),
          W("Morphology, Anatomy & Physiology", 4, 7, ["Morphology of flowering plants", "Anatomy", "Transport & mineral nutrition"]),
          W("Genetics & Biotechnology", 5, 8, ["Mendelism & inheritance", "Molecular basis: DNA & RNA", "Biotech principles", "Biotech applications"]),
          W("Ecology & Organisms", 3, 4, ["Organisms & populations", "Ecosystem & biodiversity", "Environmental issues"]),
        ],
      },
      {
        name: "Zoology", color: "#EF4444",
        chapters: [
          W("Human Physiology", 5, 9, ["Digestion & absorption", "Breathing & circulation", "Excretion & locomotion", "Homeostasis & feedback"]),
          W("Human Health & Disease", 4, 5, ["Human health & disease", "Immunity & vaccines", "Common infectious diseases"]),
          W("Evolution & Principles of Inheritance", 4, 6, ["Inheritance & variation", "Molecular basis of inheritance", "Evolution"]),
          W("Animal Kingdom & Organisation", 3, 4, ["Animal kingdom classification", "Structural organisation in animals", "Neural & chemical coordination"]),
        ],
      },
    ],
  },
  {
    id: "sat",
    name: "SAT",
    region: "US · College admissions",
    tagline: "Digital SAT: Math + Reading & Writing",
    typicalMonth: "March",
    subjects: [
      {
        name: "Math", color: "#7C3AED",
        chapters: [
          W("Algebra & Linear Equations", 5, 8, ["Linear equations & inequalities", "Systems of equations", "Functions & notation"]),
          W("Advanced Math: Quadratics & Polynomials", 5, 8, ["Quadratics & factoring", "Polynomials & exponents", "Rational & radical equations"]),
          W("Problem Solving & Data Analysis", 4, 6, ["Ratios, rates & percentages", "Data analysis & scatterplots", "Probability & statistics"]),
          W("Geometry & Trigonometry", 3, 5, ["Lines, angles & triangles", "Circles & volume", "Basic trigonometry"]),
        ],
      },
      {
        name: "Reading & Writing", color: "#0EA5E9",
        chapters: [
          W("Information & Ideas", 5, 7, ["Main idea & purpose", "Command of evidence: textual", "Inferences & conclusions"]),
          W("Craft & Structure", 4, 6, ["Word choice & vocabulary", "Text structure & purpose", "Cross-text connections"]),
          W("Expression of Ideas", 4, 6, ["Rhetorical synthesis", "Transitions", "Precision & concision"]),
          W("Standard English Conventions", 5, 7, ["Subject-verb & tense", "Punctuation: commas & colons", "Modifiers & parallelism"]),
        ],
      },
    ],
  },
  {
    id: "neb",
    name: "NEB +2 Boards",
    region: "Nepal · Class 12",
    tagline: "National Examination Board science stream",
    typicalMonth: "April",
    subjects: [
      {
        name: "Physics", color: "#0EA5E9",
        chapters: [
          W("Mechanics", 4, 7, ["Kinematics & vectors", "Dynamics & friction", "Work, energy & gravitation"]),
          W("Heat & Thermodynamics", 3, 5, ["Heat & temperature", "First & second law", "Kinetic theory & transfer"]),
          W("Waves & Optics", 3, 5, ["Wave motion & sound", "Reflection & refraction", "Interference & diffraction"]),
          W("Electricity & Magnetism", 4, 7, ["Electric field & potential", "Current & circuits", "Magnetism & EMI"]),
          W("Modern Physics", 3, 5, ["Electrons & photons", "Atomic models & spectra", "Nuclei & electronics"]),
        ],
      },
      {
        name: "Chemistry", color: "#22C55E",
        chapters: [
          W("Physical Chemistry", 4, 7, ["Stoichiometry & atomic structure", "States of matter & energetics", "Equilibrium & kinetics"]),
          W("Inorganic Chemistry", 3, 5, ["Periodic table & bonding", "s/p-block elements", "d-block & metallurgy"]),
          W("Organic Chemistry", 4, 7, ["Fundamental concepts & alkanes", "Alkenes, alkynes & aromatics", "Carbonyl, acids & nitrogen compounds"]),
        ],
      },
      {
        name: "Mathematics", color: "#7C3AED",
        chapters: [
          W("Algebra & Trigonometry", 3, 6, ["Functions, polynomials & partial fractions", "Trigonometry & inverse functions", "Matrices, determinants & systems"]),
          W("Coordinate Geometry", 3, 5, ["Straight lines", "Circles", "Conic sections"]),
          W("Calculus", 5, 9, ["Limits & continuity", "Derivatives & applications", "Integration & differential equations"]),
          W("Vectors, Statistics & Probability", 3, 5, ["Vectors & 3D basics", "Statistics: central tendency", "Probability"]),
        ],
      },
      {
        name: "English", color: "#F59E0B",
        chapters: [
          W("Prose, Poetry & Comprehension", 4, 6, ["Prose comprehension", "Poetry analysis", "Grammar in context"]),
          W("Grammar & Writing Skills", 4, 6, ["Essay & précis writing", "Letters, reports & notices", "Translation & vocabulary"]),
        ],
      },
    ],
  },
];

export const CUSTOM_EXAM_ID = "custom";

export function getExam(id: string): ExamDef | undefined {
  return EXAMS.find((e) => e.id === id);
}

/** Total chapters + estimated hours for an exam. */
export function examTotals(exam: ExamDef) {
  const chapters = exam.subjects.reduce((a, s) => a + s.chapters.length, 0);
  const hours = exam.subjects.reduce((a, s) => a + s.chapters.reduce((x, c) => x + c.hours, 0), 0);
  return { chapters, hours };
}
