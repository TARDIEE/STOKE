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
  /** country id (see COUNTRIES) — onboarding shows this country's exams first */
  country: string;
  /** school = class level, board = national board exam, entrance = competitive */
  level: "school" | "board" | "entrance";
  /** class/grade for school levels (8, 9, …) */
  grade?: number;
  subjects: ExamSubject[];
}

export interface Country {
  id: string;
  name: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  { id: "nepal", name: "Nepal", flag: "🇳🇵" },
  { id: "india", name: "India", flag: "🇮🇳" },
  { id: "usa", name: "USA", flag: "🇺🇸" },
];

const W = (name: string, weight: 1 | 2 | 3 | 4 | 5, hours: number, topics: string[] = []): ExamChapter => ({ name, weight, hours, topics });

export const EXAMS: ExamDef[] = [
  {
    id: "ioe",
    name: "IOE Entrance",
    region: "Nepal · BE/BCT",
    tagline: "Engineering entrance (Tribhuvan University)",
    typicalMonth: "July",
    country: "nepal",
    level: "entrance",
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
    country: "nepal",
    level: "entrance",
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
    country: "india",
    level: "entrance",
    subjects: [
      {
        name: "Physics", color: "#0EA5E9",
        chapters: [
          W("Physics and Measurement", 2, 2, ["Units, dimensions & errors", "Vernier calliper & screw gauge"]),
          W("Kinematics", 3, 4, ["Motion in 1D & graphs", "Vectors & relative motion", "Projectiles"]),
          W("Laws of Motion", 4, 5, ["Inertia & Newton's laws", "Friction & equilibrium", "Circular motion & banking"]),
          W("Work, Energy and Power", 4, 5, ["Work-energy theorem", "Collisions & centre of mass", "Power"]),
          W("Rotational Motion", 4, 6, ["Torque & moment of inertia", "MI theorems & rolling", "Angular momentum"]),
          W("Gravitation", 2, 3, ["Kepler's laws & variation of g", "Satellites & escape velocity"]),
          W("Properties of Solids and Liquids", 3, 4, ["Elasticity & Hooke's law", "Fluid pressure & buoyancy", "Viscosity & surface tension"]),
          W("Thermodynamics", 4, 5, ["Laws & thermodynamic processes", "Carnot engine & entropy", "Heat transfer modes"]),
          W("Kinetic Theory of Gases", 3, 4, ["Gas laws & ideal gas", "KTG postulates & degrees of freedom", "Mean free path & specific heats"]),
          W("Oscillations and Waves", 3, 5, ["SHM & pendulum", "Wave motion & superposition", "Sound: pipes, beats & Doppler"]),
          W("Electrostatics", 5, 6, ["Coulomb's law, field & Gauss's law", "Potential & capacitors", "Dielectrics & energy"]),
          W("Current Electricity", 5, 7, ["Drift, Ohm's law & resistivity", "Kirchhoff's laws & networks", "Meters, bridges & heating effects", "Electrical power & circuits"]),
          W("Magnetic Effects of Current and Magnetism", 4, 6, ["Biot-Savart & Ampere's law", "Lorentz force & galvanometer", "Earth's magnetism & materials"]),
          W("EMI and AC", 4, 6, ["Faraday's law & Lenz's law", "Inductance & motional EMF", "AC, resonance & transformers"]),
          W("Electromagnetic Waves", 2, 2, ["EM spectrum & properties", "Applications & communication basics"]),
          W("Optics", 5, 7, ["Mirrors, lenses & prism", "Optical instruments", "Interference & diffraction", "Polarization & resolving power"]),
          W("Dual Nature of Matter and Radiation", 3, 4, ["Photoelectric effect", "de Broglie waves & Davisson-Germer"]),
          W("Atoms and Nuclei", 3, 5, ["Bohr atom & spectra", "Radioactivity & nuclear reactions", "Semiconductors & logic gates"]),
          W("Experimental Skills", 2, 3, ["Vernier, screw gauge & spherometer", "Meter bridge & potentiometer", "Optics & sonometer experiments"]),
        ],
      },
      {
        name: "Chemistry", color: "#22C55E",
        chapters: [
          W("Some Basic Concepts in Chemistry", 3, 4, ["Mole & stoichiometry", "Laws of combination & limiting reagent", "Concentration terms"]),
          W("Atomic Structure", 4, 5, ["Thomson, Rutherford & Bohr models", "Quantum numbers & configuration", "Dual nature & spectra"]),
          W("Chemical Bonding and Molecular Structure", 4, 5, ["Ionic/covalent bonding & Fajans' rules", "Hybridization & VSEPR shapes", "MOT & hydrogen bonding"]),
          W("Chemical Thermodynamics", 4, 5, ["First law & Hess's law", "Entropy, Gibbs energy & spontaneity", "Bond enthalpies"]),
          W("Solutions", 3, 4, ["Concentration & Henry's law", "Colligative properties", "Van't Hoff factor"]),
          W("Equilibrium", 5, 6, ["Chemical equilibrium & Le Chatelier", "Ionic equilibrium & pH", "Buffers, Ksp & salt hydrolysis"]),
          W("Redox Reactions and Electrochemistry", 4, 5, ["Oxidation numbers & balancing", "Galvanic cells & Nernst equation", "Electrolysis & Faraday's laws"]),
          W("Chemical Kinetics", 3, 4, ["Rate laws & order", "Arrhenius equation & temperature effect", "Half-life problems"]),
          W("Classification of Elements & Periodicity", 3, 4, ["Modern table & configuration", "Trends: IP, EN & radii"]),
          W("p-Block Elements (Groups 13–18)", 3, 5, ["Group 13–14: boron, carbon & silicon", "Group 15–17: nitrogen, oxygen & halogens", "Group 18: noble gases"]),
          W("d- and f-Block Elements", 3, 4, ["Transition metals & properties", "KMnO4, K2Cr2O7 & important compounds", "Lanthanoids & actinoids"]),
          W("Coordination Compounds", 4, 5, ["Werner's theory & nomenclature", "Isomerism", "CFT, colour & magnetism"]),
          W("Purification & Qualitative Analysis", 2, 3, ["Purification methods", "Lassaigne's test & estimations"]),
          W("Some Basic Principles of Organic Chemistry", 4, 5, ["Electronic effects & intermediates", "Isomerism", "Reaction mechanisms"]),
          W("Hydrocarbons", 4, 5, ["Alkanes, alkenes & alkynes", "Benzene & electrophilic substitution"]),
          W("Organic Compounds Containing Halogens", 3, 4, ["Haloalkanes: SN1/SN2", "Haloarenes", "Substitution vs elimination"]),
          W("Organic Compounds Containing Oxygen", 4, 6, ["Alcohols, phenols & ethers", "Aldehydes & ketones", "Carboxylic acids & derivatives"]),
          W("Organic Compounds Containing Nitrogen", 3, 4, ["Amines & basicity", "Diazonium salts & reactions"]),
          W("Biomolecules", 3, 4, ["Carbohydrates & proteins", "Enzymes, vitamins & nucleic acids"]),
          W("Principles Related to Practical Chemistry", 2, 3, ["Salt analysis: cations & anions", "Functional-group detection", "Titration & enthalpy experiments"]),
        ],
      },
      {
        name: "Mathematics", color: "#7C3AED",
        chapters: [
          W("Sets and Relations", 2, 3, ["Sets, Venn diagrams & operations", "Relations & equivalence"]),
          W("Functions", 3, 4, ["Domain, range & types", "Composite & inverse functions", "Graphs & transformations"]),
          W("Complex Numbers and Quadratic Equations", 4, 5, ["Complex algebra & Argand plane", "De Moivre's & roots of unity", "Quadratics & location of roots"]),
          W("Matrices and Determinants", 4, 5, ["Matrices & operations", "Determinants & properties", "System of linear equations"]),
          W("Permutations and Combinations", 3, 4, ["Counting & arrangements", "Circular & restricted cases", "Binomial theorem"]),
          W("Sequence and Series", 3, 4, ["AP, GP & HP means", "Special sums", "AM-GM inequality"]),
          W("Limit, Continuity and Differentiability", 4, 5, ["Limits & standard forms", "Continuity & differentiability", "Chain rule & Rolle's/MVT", "Tangents, rates & maxima-minima"]),
          W("Integral Calculus", 5, 6, ["Indefinite: substitution & parts", "Definite integrals & properties", "Area under curves"]),
          W("Differential Equations", 3, 4, ["Formation, order & degree", "Variable separable & homogeneous", "Linear equations"]),
          W("Coordinate Geometry", 5, 7, ["Straight lines & pair of lines", "Circles, tangents & chords", "Parabola, ellipse & hyperbola", "Tangents & normals"]),
          W("Three Dimensional Geometry", 3, 4, ["Direction ratios & cosines", "Lines & planes", "Shortest distance"]),
          W("Vector Algebra", 3, 4, ["Types & dot/cross products", "Scalar triple product", "Area & volume applications"]),
          W("Statistics and Probability", 3, 4, ["Mean, variance & standard deviation", "Probability & Bayes' theorem", "Conditional probability"]),
          W("Trigonometry", 3, 4, ["Identities & equations", "Inverse functions & principal values", "Heights & distances"]),
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
    country: "india",
    level: "entrance",
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
    country: "usa",
    level: "entrance",
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
    country: "nepal",
    level: "board",
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
  {
    id: "see",
    name: "SEE Class 10",
    region: "Nepal · NEB Boards",
    tagline: "Secondary Education Examination (Class 10)",
    typicalMonth: "March",
    country: "nepal",
    level: "board",
    subjects: [
      {
        name: "Science–Physics", color: "#0EA5E9",
        chapters: [
          W("Force & Motion", 4, 6, ["Force, inertia & Newton's laws", "Motion graphs & equations", "Momentum & collisions"]),
          W("Pressure", 2, 3, ["Liquid pressure & Pascal's law", "Atmospheric pressure & barometer", "Buoyancy & Archimedes' principle"]),
          W("Heat Energy", 3, 4, ["Heat, temperature & specific heat", "Change of state & latent heat", "Humidity & heat transfer"]),
          W("Waves", 4, 5, ["Wave terms & sound production", "Reflection & refraction of sound", "Stationary waves & Doppler basics"]),
          W("Electricity & Magnetism", 4, 6, ["Current, voltage & Ohm's law", "Series-parallel circuits & power", "Magnetism & electromagnets"]),
        ],
      },
      {
        name: "Science–Chemistry", color: "#22C55E",
        chapters: [
          W("Classification of Elements", 3, 4, ["Modern periodic table", "Periods, groups & trends", "Electronic configuration"]),
          W("Chemical Reactions & Equations", 3, 4, ["Balancing equations", "Types: combination to redox", "Mole & basic stoichiometry"]),
          W("Acid, Base & Salt", 3, 4, ["Properties & indicators", "pH scale & neutralization", "Common salts & uses"]),
          W("Some Gases", 3, 4, ["Hydrogen: prep & properties", "Oxygen & carbon dioxide", "Nitrogen & ammonia basics"]),
          W("Metals & Non-metals", 3, 4, ["Physical vs chemical properties", "Reactivity series & extraction", "Corrosion & prevention"]),
          W("Hydrocarbons & Daily Chemicals", 3, 4, ["Alkanes, alkenes & IUPAC basics", "Soaps, detergents & plastics", "Fertilizers & cement"]),
        ],
      },
      {
        name: "Science–Biology", color: "#16A34A",
        chapters: [
          W("Classification & Honey Bee", 3, 4, ["Five-kingdom classification", "Honey bee: castes & life cycle", "Apiculture & importance"]),
          W("Heredity & Life Cycle", 4, 5, ["Mendel's laws & Punnett squares", "Sex determination & blood groups", "Life cycle stages"]),
          W("Circulation & Body Systems", 4, 5, ["Human heart & blood vessels", "Nervous & glandular control", "Excretion & respiration"]),
          W("Environment & Pollution", 3, 4, ["Ecosystem & food chains", "Pollution causes & control", "Conservation & sanitation"]),
        ],
      },
      {
        name: "Earth, Space & ICT", color: "#A78BFA",
        chapters: [
          W("Earth & Atmosphere", 3, 4, ["History of earth & layers", "Atmosphere & weather", "Rocks, minerals & soil"]),
          W("Universe & ICT", 3, 4, ["Solar system & stars", "Satellites & space study", "ICT uses & cyber safety"]),
        ],
      },
      {
        name: "Mathematics", color: "#7C3AED",
        chapters: [
          W("Sets & Arithmetic", 4, 6, ["Sets, Venn diagrams & laws", "Time, work & profit-loss", "Compound interest & depreciation"]),
          W("Mensuration I: Triangle to Cylinder", 4, 6, ["Area of triangles & Heron", "Prism & cylinder volumes", "Surface area drills"]),
          W("Mensuration II: Sphere, Cone, Pyramid", 3, 5, ["Sphere & hemisphere", "Cone & pyramid", "Combined solids"]),
          W("Algebra", 4, 6, ["Indices, surds & logarithms", "Quadratic equations", "Polynomials & HCF/LCM"]),
          W("Geometry & Theorems", 4, 6, ["Congruence & similarity", "Circle theorems", "Constructions & proofs"]),
          W("Trigonometry, Stats & Probability", 3, 5, ["Ratios, heights & distances", "Mean, median & mode", "Basic probability"]),
        ],
      },
      {
        name: "English", color: "#F59E0B",
        chapters: [
          W("Letters, Applications & Stories", 4, 5, ["Formal & personal letters", "Applications & notices", "Paragraphs, essays & stories"]),
          W("Comprehension & Media Writing", 3, 4, ["Seen passages", "Argumentative writing", "Advertisement & newspaper article"]),
          W("Grammar I: Articles to Conditionals", 4, 5, ["Articles & prepositions", "Transformation & question tags", "Conditionals & reported speech"]),
          W("Grammar II: Clauses to Tenses", 4, 5, ["Causative verbs & relative clauses", "Subject-verb concord", "Tenses in use"]),
        ],
      },
      {
        name: "Nepali", color: "#EF4444",
        chapters: [
          W("कविता (Poems)", 3, 4, ["उज्यालो यात्रा — सारांश", "नेपाली हाम्रो श्रम र सीप — analysis", "गौमती एउटा कविता — theme"]),
          W("कथा (Stories)", 4, 5, ["घर झगडा — characters", "सत्रु & कर्तव्य — summary", "आयाम — theme & message"]),
          W("निबन्ध & जीवनी", 3, 4, ["चिकित्सा विज्ञान — main points", "देवकोटा & Picasso जीवनी", "पार्कान्सो & नाटक घरको माया"]),
          W("पत्र & व्याकरण", 3, 4, ["व्यावसायिक चिठी format", "सन्धि, समास & कारक", "वाक्य शुद्धीकरण drills"]),
        ],
      },
      {
        name: "Social Studies", color: "#F97316",
        chapters: [
          W("Society, Values & Problems", 3, 4, ["Traditions, values & norms", "Social problems & solutions", "Civic sense & duties"]),
          W("Geography & History", 4, 5, ["Earth: latitude, zones & maps", "Nepal: past to present", "World history snapshots"]),
          W("Economy & Development", 3, 4, ["Economic activities & sectors", "Development infrastructure", "Community & cooperation"]),
          W("International Relations", 2, 3, ["UN, SAARC & peace", "Nepal's foreign policy", "Current affairs basics"]),
        ],
      },
      {
        name: "EPH", color: "#14B8A6",
        chapters: [
          W("Demography & Quality of Life", 3, 4, ["Census, birth & mortality rates", "Migration & urbanization", "HDI & quality of life"]),
          W("Environment & Biodiversity", 3, 4, ["Environment of Nepal", "Biodiversity & conservation", "Population–environment link"]),
          W("Health & Community", 3, 4, ["Nutrition & balanced diet", "Tobacco, alcohol & drugs", "Community health & sanitation"]),
        ],
      },
      {
        name: "Optional Mathematics", color: "#8B5CF6",
        chapters: [
          W("Algebra: Functions to Matrix", 4, 6, ["Functions & polynomials", "Sequence, series & matrix", "Determinants basics"]),
          W("Trigonometry: Compound to Conditional", 5, 7, ["Compound & multiple angles", "Sub-multiple & transformation", "Conditional identities & equations"]),
          W("Height, Distance & Vectors", 3, 4, ["Heights & distances", "Vectors: dot & cross", "Applications"]),
          W("Coordinate Geometry & Statistics", 3, 4, ["Pair of lines & circle", "Mean, median & quartiles", "Probability distributions"]),
          W("Transformation Geometry", 3, 4, ["Reflection, rotation & translation", "Enlargement & combination", "Matrix transformations"]),
        ],
      },
      {
        name: "Computer Science", color: "#06B6D4",
        chapters: [
          W("Cyber Law, Ethics & Security", 3, 4, ["Cyber law of Nepal", "Ethics, virus & malware", "Security practices & backup"]),
          W("Networking & Internet", 3, 4, ["Networks, topologies & media", "Internet services & email", "Multimedia basics"]),
          W("Number System & DBMS", 3, 4, ["Binary/octal/hex conversions", "MS Access: tables & queries", "Forms & reports"]),
          W("Programming: QBASIC & C", 4, 5, ["QBASIC modular & file handling", "C: variables, loops & arrays", "Programs & debugging"]),
        ],
      },
      {
        name: "Accountancy", color: "#84CC16",
        chapters: [
          W("Journal & Ledger", 4, 5, ["Journal rules & entries", "Ledger posting & balancing", "Subsidiary books"]),
          W("Trial Balance & Cash Book", 3, 4, ["Trial balance & errors", "Cash & bank columns", "Bank reconciliation basics"]),
          W("Office Procedure", 2, 3, ["Office correspondence", "Filing & documentation", "Business communication"]),
        ],
      },
    ],
  },
  {
    id: "np8",
    name: "Class 8 (Nepal)",
    region: "Nepal · Basic Level",
    tagline: "Class 8 school curriculum (CDC)",
    typicalMonth: "March",
    country: "nepal",
    level: "school",
    grade: 8,
    subjects: [
      {
        name: "Mathematics", color: "#7C3AED",
        chapters: [
          W("Sets & Arithmetic", 3, 4, ["Sets & Venn diagrams", "HCF, LCM & fractions", "Unitary method & decimals"]),
          W("Algebra Basics", 3, 4, ["Indices & laws", "Algebraic expressions", "Simple equations"]),
          W("Geometry & Mensuration", 3, 4, ["Angles, triangles & circles", "Area & perimeter", "Volume of solids"]),
          W("Statistics", 2, 3, ["Data collection & tables", "Mean, median & mode", "Bar graphs & pictographs"]),
        ],
      },
      {
        name: "Science & Technology", color: "#0EA5E9",
        chapters: [
          W("Scientific Learning & Lab", 2, 3, ["Steps of scientific study", "Lab safety & apparatus", "Measurement basics"]),
          W("Living Beings & Environment", 3, 4, ["Classification of living things", "Adaptation & habitat", "Balance in nature"]),
          W("Force, Pressure & Machines", 3, 4, ["Force & effects", "Pressure in solids & liquids", "Simple machines"]),
          W("Energy, Heat & Light", 3, 4, ["Forms of energy", "Heat & temperature", "Light, shadows & mirrors"]),
          W("Sound, Electricity & Materials", 3, 4, ["Sound production & travel", "Simple circuits & magnets", "Metals, non-metals & plastics"]),
        ],
      },
      {
        name: "English", color: "#F59E0B",
        chapters: [
          W("Reading & Vocabulary", 3, 4, ["Comprehension passages", "Word meanings in context", "Dictionary skills"]),
          W("Grammar: Tenses & Voice", 3, 4, ["Tenses in use", "Active & passive voice", "Direct & indirect speech"]),
          W("Writing: Paragraphs to Stories", 3, 4, ["Paragraphs & essays", "Letters & applications", "Stories & dialogues"]),
        ],
      },
      {
        name: "Nepali", color: "#EF4444",
        chapters: [
          W("पाठहरू (Lessons)", 3, 4, ["गद्य पाठ — सारांश", "पद्य पाठ — भावार्थ", "अभ्यास प्रश्न"]),
          W("व्याकरण (Grammar)", 3, 4, ["सन्धि & समास", "कारक & वचन", "वाक्य शुद्धीकरण"]),
          W("लेखन (Writing)", 2, 3, ["पत्र & निवेदन", "निबन्ध & अनुच्छेद", "संवाद & जीवनी"]),
        ],
      },
      {
        name: "Social Studies", color: "#F97316",
        chapters: [
          W("Community & Nation", 2, 3, ["Our community & diversity", "National symbols & identity", "Rights & duties"]),
          W("Geography of Nepal", 3, 4, ["Physical divisions & climate", "Natural resources", "Maps & directions"]),
          W("History & Development", 2, 3, ["Ancient to modern Nepal", "Development & infrastructure", "Population & environment"]),
        ],
      },
      {
        name: "Health & Physical Education", color: "#14B8A6",
        chapters: [
          W("Nutrition & Hygiene", 2, 3, ["Balanced diet & nutrients", "Personal & environmental hygiene", "Safe water & sanitation"]),
          W("Exercise, Yoga & Safety", 2, 3, ["Daily exercise & yoga", "First aid basics", "Road & home safety"]),
        ],
      },
    ],
  },
  {
    id: "np9",
    name: "Class 9 (Nepal)",
    region: "Nepal · Secondary",
    tagline: "Class 9 school curriculum — SEE foundation year (CDC)",
    typicalMonth: "March",
    country: "nepal",
    level: "school",
    grade: 9,
    subjects: [
      {
        name: "Mathematics", color: "#7C3AED",
        chapters: [
          W("Sets & Number System", 3, 4, ["Sets, subsets & operations", "Real numbers & surds", "Indices & logarithms"]),
          W("Algebra", 4, 5, ["Polynomials & factorization", "Linear & quadratic equations", "Ratio, proportion & variation"]),
          W("Geometry", 4, 5, ["Triangles & congruence", "Circles & theorems", "Constructions"]),
          W("Trigonometry & Mensuration", 3, 4, ["Trig ratios & tables", "Heights & distances", "Area & volume"]),
          W("Statistics & Probability", 2, 3, ["Grouped data & averages", "Graphical representation", "Probability basics"]),
        ],
      },
      {
        name: "Science & Technology", color: "#0EA5E9",
        chapters: [
          W("Physics: Motion to Electricity", 4, 6, ["Motion, velocity & acceleration", "Force, pressure & machines", "Work, energy & power", "Waves, light & sound", "Current & magnetism"]),
          W("Chemistry: Matter to Metals", 4, 5, ["Matter & atomic structure", "Bonding & periodic table", "Acids, bases & salts", "Metals, non-metals & carbon"]),
          W("Biology: Cell to Environment", 4, 5, ["Cell structure & division", "Human body systems", "Reproduction & heredity", "Ecosystem & conservation"]),
        ],
      },
      {
        name: "English", color: "#F59E0B",
        chapters: [
          W("Reading & Comprehension", 3, 4, ["Passages & inference", "Vocabulary in context", "Note-making"]),
          W("Grammar", 4, 5, ["Tenses & voice", "Reported speech & conditionals", "Transformation & clauses"]),
          W("Writing", 3, 4, ["Letters & applications", "Essays & reports", "Stories & dialogues"]),
        ],
      },
      {
        name: "Nepali", color: "#EF4444",
        chapters: [
          W("पाठहरू (Lessons)", 3, 4, ["गद्य — सारांश & विश्लेषण", "पद्य — भावार्थ", "एकाङ्की & निबन्ध"]),
          W("व्याकरण (Grammar)", 4, 5, ["सन्धि, समास & उपसर्ग-प्रत्यय", "कारक, वचन & लिङ्ग", "वाक्य विश्लेषण & शुद्धीकरण"]),
          W("लेखन (Writing)", 3, 4, ["पत्र & निवेदन", "निबन्ध & प्रतिवेदन", "संवाद & जीवनी"]),
        ],
      },
      {
        name: "Social Studies", color: "#F97316",
        chapters: [
          W("Society & Culture", 2, 3, ["Social values & diversity", "Problems & solutions", "Civic consciousness"]),
          W("Geography & Resources", 3, 4, ["Landforms & climate of Nepal", "Natural resources & use", "Population & settlement"]),
          W("History, Polity & Economy", 3, 4, ["Medieval to modern Nepal", "Constitution & governance", "Economic activities"]),
        ],
      },
      {
        name: "Computer Science", color: "#06B6D4",
        chapters: [
          W("Fundamentals & Number System", 2, 3, ["Computer generations & types", "Binary, octal & hex conversions", "Hardware & software"]),
          W("QBASIC Programming", 3, 4, ["Input, output & variables", "Loops & conditions", "Small programs & debugging"]),
          W("Internet & Cyber Safety", 2, 3, ["Internet, email & browsing", "Cyber law & ethics", "Virus & security basics"]),
        ],
      },
    ],
  },
  {
    id: "in8",
    name: "Class 8 (India · NCERT)",
    region: "India · CBSE/NCERT",
    tagline: "Class 8 foundation for JEE/NEET track",
    typicalMonth: "March",
    country: "india",
    level: "school",
    grade: 8,
    subjects: [
      {
        name: "Science", color: "#0EA5E9",
        chapters: [
          W("Crop Production & Microorganisms", 3, 4, ["Crop seasons & practices", "Nitrogen cycle & manure", "Useful vs harmful microbes"]),
          W("Materials: Fibres, Plastics & Metals", 3, 4, ["Synthetic fibres & plastics", "Metals vs non-metals", "Corrosion & conservation"]),
          W("Coal, Petroleum & Combustion", 3, 4, ["Fossil fuels & formation", "Combustion types & flame", "Fuel efficiency & pollution"]),
          W("Cell, Reproduction & Adolescence", 3, 4, ["Cell organelles", "Asexual & sexual reproduction", "Adolescence & hormones"]),
          W("Force, Pressure & Friction", 3, 4, ["Contact vs non-contact forces", "Pressure in fluids", "Friction: boon & bane"]),
          W("Sound & Electric Current", 3, 4, ["Sound production & travel", "Hearing & noise control", "Circuits & heating effects"]),
          W("Light, Stars & Environment", 3, 4, ["Reflection & human eye", "Stars & solar system", "Air & water pollution"]),
        ],
      },
      {
        name: "Mathematics", color: "#7C3AED",
        chapters: [
          W("Numbers & Powers", 3, 4, ["Rational numbers", "Squares, cubes & roots", "Exponents & standard form"]),
          W("Algebra I: Equations & Expressions", 4, 5, ["Linear equations in one variable", "Algebraic identities", "Comparing quantities"]),
          W("Algebra II: Proportions & Factorisation", 3, 4, ["Direct & inverse proportions", "Factorisation methods", "Division of polynomials"]),
          W("Geometry: Quadrilaterals & Mensuration", 4, 5, ["Quadrilaterals & polygons", "Area of polygons", "Surface area & volume"]),
          W("Data, Graphs & Probability", 2, 3, ["Data handling & charts", "Introduction to graphs", "Chance & probability"]),
        ],
      },
    ],
  },
  {
    id: "in9",
    name: "Class 9 (India · NCERT)",
    region: "India · CBSE/NCERT",
    tagline: "Class 9 foundation for JEE/NEET track",
    typicalMonth: "March",
    country: "india",
    level: "school",
    grade: 9,
    subjects: [
      {
        name: "Science", color: "#0EA5E9",
        chapters: [
          W("Matter & Atoms", 4, 5, ["Matter in our surroundings", "Is matter pure? mixtures & solutions", "Atoms, molecules & mole concept", "Structure of the atom"]),
          W("Cell, Tissues & Life", 3, 4, ["Cell & organelles", "Plant & animal tissues", "Diversity & health basics"]),
          W("Motion, Force & Gravitation", 4, 5, ["Motion graphs & equations", "Laws of motion", "Gravitation & buoyancy"]),
          W("Work, Energy & Sound", 3, 4, ["Work, energy & power", "Sound: production & travel", "Reflection & applications of sound"]),
          W("Food & Environment", 2, 3, ["Crop improvement & animal husbandry", "Natural resources & pollution", "Conservation"]),
        ],
      },
      {
        name: "Mathematics", color: "#7C3AED",
        chapters: [
          W("Number Systems & Polynomials", 4, 5, ["Irrational numbers & lines", "Polynomials & zeroes", "Remainder & factor theorems"]),
          W("Coordinate & Linear Equations", 3, 4, ["Cartesian plane", "Linear equations in two variables", "Euclid's geometry basics"]),
          W("Geometry: Lines to Circles", 4, 5, ["Lines, angles & triangles", "Quadrilaterals & areas", "Circles & theorems"]),
          W("Mensuration & Statistics", 3, 4, ["Heron's formula", "Surface areas & volumes", "Statistics & probability"]),
        ],
      },
    ],
  },
  {
    id: "in10",
    name: "Class 10 (India · CBSE)",
    region: "India · CBSE Boards",
    tagline: "Class 10 boards — direct launchpad to JEE/NEET",
    typicalMonth: "March",
    country: "india",
    level: "school",
    grade: 10,
    subjects: [
      {
        name: "Science", color: "#0EA5E9",
        chapters: [
          W("Chemical Substances", 4, 5, ["Chemical reactions & equations", "Acids, bases & salts", "Metals, non-metals & carbon compounds"]),
          W("World of Living", 4, 5, ["Life processes", "Control & coordination", "Reproduction & heredity"]),
          W("Natural Phenomena", 3, 4, ["Light: reflection & refraction", "Human eye & colourful world", "Prism & dispersion"]),
          W("Effects of Current & Environment", 4, 5, ["Electricity & circuits", "Magnetic effects of current", "Our environment & management"]),
        ],
      },
      {
        name: "Mathematics", color: "#7C3AED",
        chapters: [
          W("Algebra I: Numbers to Quadratics", 4, 5, ["Real numbers & Euclid's lemma", "Polynomials", "Pair of linear equations & quadratics"]),
          W("Algebra II: Progressions", 3, 4, ["Arithmetic progressions", "Geometric flavour & sums", "Word-problem drills"]),
          W("Geometry & Trigonometry", 4, 5, ["Triangles: similarity & Pythagoras", "Circles & constructions", "Trig ratios & heights-distances"]),
          W("Mensuration, Stats & Probability", 3, 4, ["Areas, surface areas & volumes", "Statistics: mean & mode", "Probability basics"]),
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
