export interface ExamChapter {
  name: string;
  /** 1 (low) – 5 (very high yield) */
  weight: 1 | 2 | 3 | 4 | 5;
  /** estimated study hours */
  hours: number;
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

const W = (name: string, weight: 1 | 2 | 3 | 4 | 5, hours: number): ExamChapter => ({ name, weight, hours });

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
          W("Complex Numbers, Matrices & Determinants", 4, 6),
          W("Sequences & Series", 3, 4),
          W("Trigonometry", 3, 5),
          W("Straight Lines & Circles", 3, 5),
          W("Conic Sections", 4, 6),
          W("Limits & Continuity", 3, 4),
          W("Differentiation & Applications", 5, 8),
          W("Integration & Area Under Curve", 5, 8),
          W("Differential Equations", 3, 4),
          W("Vectors & 3D Geometry", 3, 5),
          W("Probability & Statistics", 2, 3),
        ],
      },
      {
        name: "Physics", color: "#0EA5E9",
        chapters: [
          W("Units, Dimensions & Measurement", 2, 2),
          W("Kinematics & Laws of Motion", 5, 7),
          W("Work, Energy, Power & Rotation", 5, 7),
          W("Gravitation", 2, 2),
          W("Heat & Thermodynamics", 4, 6),
          W("Oscillations & Waves", 3, 5),
          W("Optics", 3, 5),
          W("Electrostatics & Current Electricity", 4, 6),
          W("Magnetism, EMI & AC", 4, 6),
          W("Modern Physics & Electronics", 3, 5),
        ],
      },
      {
        name: "Chemistry", color: "#22C55E",
        chapters: [
          W("Atomic Structure & Chemical Bonding", 4, 6),
          W("Mole Concept & States of Matter", 3, 4),
          W("Thermodynamics & Chemical Equilibrium", 4, 6),
          W("Electrochemistry & Chemical Kinetics", 3, 5),
          W("Periodic Table & s/p-Block Elements", 3, 4),
          W("d/f-Block & Coordination Compounds", 3, 4),
          W("GOC & Hydrocarbons", 5, 7),
          W("Haloalkanes to Amines", 4, 6),
          W("Carbonyl & Carboxylic Compounds", 3, 4),
          W("Biomolecules & Everyday Chemistry", 2, 3),
        ],
      },
      {
        name: "English", color: "#F59E0B",
        chapters: [
          W("Reading Comprehension", 4, 5),
          W("Grammar: Tenses, Voice & Narration", 4, 5),
          W("Vocabulary: Synonyms, Antonyms & One-word", 3, 4),
          W("Error Detection & Sentence Improvement", 3, 4),
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
          W("Units, Dimensions & Mechanics Basics", 3, 5),
          W("Laws of Motion, Work & Rotation", 5, 8),
          W("Heat & Thermodynamics", 3, 5),
          W("Optics & Wave Motion", 4, 6),
          W("Electrostatics & Current Electricity", 5, 8),
          W("Magnetism, EMI & Modern Physics", 4, 6),
        ],
      },
      {
        name: "Chemistry", color: "#22C55E",
        chapters: [
          W("Atomic Structure & Chemical Bonding", 4, 6),
          W("Physical Chemistry Core: Mole, Thermo, Equilibrium", 5, 8),
          W("s/p/d-Block Elements", 3, 5),
          W("GOC & Hydrocarbons", 5, 7),
          W("Functional Groups & Reaction Mechanisms", 4, 6),
          W("Biomolecules & Chemistry in Life", 3, 4),
        ],
      },
      {
        name: "Botany", color: "#16A34A",
        chapters: [
          W("Cell Structure & Biomolecules", 3, 5),
          W("Plant Kingdom & Morphology", 3, 4),
          W("Anatomy & Plant Physiology", 4, 6),
          W("Genetics & Biotechnology", 4, 6),
          W("Ecology & Environment", 3, 4),
        ],
      },
      {
        name: "Zoology", color: "#EF4444",
        chapters: [
          W("Animal Kingdom & Organisation", 3, 4),
          W("Human Physiology I: Digestion, Respiration, Circulation", 5, 8),
          W("Human Physiology II: Nervous, Excretion, Reproduction", 5, 8),
          W("Genetics, Evolution & Human Health", 4, 6),
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
          W("Kinematics & Laws of Motion", 4, 7),
          W("Work, Energy & Rotational Mechanics", 4, 7),
          W("Gravitation & Properties of Matter", 3, 4),
          W("Heat & Thermodynamics", 4, 6),
          W("SHM & Wave Motion", 3, 5),
          W("Electrostatics & Current Electricity", 5, 8),
          W("Magnetism, EMI & Alternating Current", 4, 6),
          W("Ray & Wave Optics", 4, 6),
          W("Modern Physics", 5, 7),
        ],
      },
      {
        name: "Chemistry", color: "#22C55E",
        chapters: [
          W("Mole Concept & Atomic Structure", 4, 6),
          W("Bonding & Periodic Classification", 4, 5),
          W("Thermodynamics, Equilibrium & Redox", 4, 6),
          W("s/p/d/f-Block Elements", 3, 5),
          W("GOC & Hydrocarbons", 5, 7),
          W("Oxygen & Nitrogen Functional Groups", 4, 6),
          W("Biomolecules, Polymers & Practical Chemistry", 3, 4),
        ],
      },
      {
        name: "Mathematics", color: "#7C3AED",
        chapters: [
          W("Complex Numbers, Matrices & Determinants", 4, 6),
          W("Permutations, Combinations & Probability", 3, 5),
          W("Sequences, Series & Trigonometry", 3, 5),
          W("Coordinate Geometry: Lines, Circles, Conics", 5, 8),
          W("Limits, Continuity & Differentiability", 4, 6),
          W("Applications & Definite Integration", 5, 8),
          W("Differential Equations, Vectors & 3D", 4, 6),
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
          W("Mechanics: Motion, Laws, Work & Rotation", 5, 9),
          W("Heat & Thermodynamics", 3, 5),
          W("Optics & Wave Motion", 3, 5),
          W("Electricity & Magnetism", 5, 9),
          W("Modern Physics & Electronics", 4, 6),
        ],
      },
      {
        name: "Chemistry", color: "#22C55E",
        chapters: [
          W("Physical Chemistry Core", 5, 8),
          W("Inorganic: Block Chemistry & Coordination", 4, 6),
          W("Organic: GOC & Hydrocarbons", 4, 6),
          W("Organic Functional Groups", 4, 6),
          W("Biomolecules & Everyday Chemistry", 3, 4),
        ],
      },
      {
        name: "Botany", color: "#16A34A",
        chapters: [
          W("Cell Structure & Cell Cycle", 4, 6),
          W("Plant Kingdom", 3, 4),
          W("Morphology, Anatomy & Physiology", 4, 7),
          W("Genetics & Biotechnology", 5, 8),
          W("Ecology & Organisms", 3, 4),
        ],
      },
      {
        name: "Zoology", color: "#EF4444",
        chapters: [
          W("Human Physiology", 5, 9),
          W("Human Health & Disease", 4, 5),
          W("Evolution & Principles of Inheritance", 4, 6),
          W("Animal Kingdom & Organisation", 3, 4),
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
          W("Algebra & Linear Equations", 5, 8),
          W("Advanced Math: Quadratics & Polynomials", 5, 8),
          W("Problem Solving & Data Analysis", 4, 6),
          W("Geometry & Trigonometry", 3, 5),
        ],
      },
      {
        name: "Reading & Writing", color: "#0EA5E9",
        chapters: [
          W("Information & Ideas", 5, 7),
          W("Craft & Structure", 4, 6),
          W("Expression of Ideas", 4, 6),
          W("Standard English Conventions", 5, 7),
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
          W("Mechanics", 4, 7),
          W("Heat & Thermodynamics", 3, 5),
          W("Waves & Optics", 3, 5),
          W("Electricity & Magnetism", 4, 7),
          W("Modern Physics", 3, 5),
        ],
      },
      {
        name: "Chemistry", color: "#22C55E",
        chapters: [
          W("Physical Chemistry", 4, 7),
          W("Inorganic Chemistry", 3, 5),
          W("Organic Chemistry", 4, 7),
        ],
      },
      {
        name: "Mathematics", color: "#7C3AED",
        chapters: [
          W("Algebra & Trigonometry", 3, 6),
          W("Coordinate Geometry", 3, 5),
          W("Calculus", 5, 9),
          W("Vectors, Statistics & Probability", 3, 5),
        ],
      },
      {
        name: "English", color: "#F59E0B",
        chapters: [
          W("Prose, Poetry & Comprehension", 4, 6),
          W("Grammar & Writing Skills", 4, 6),
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
