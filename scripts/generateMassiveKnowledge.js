'use strict';

const fs = require('fs');
const path = require('path');

const SEEDS_DIR = path.resolve(__dirname, '../data/seeds');

// Comprehensive Massive Knowledge Base across all 24 domains
const records = [
  // ==================== 1. PHYSICS ====================
  {
    id: "k_phys_relativity_001",
    title: "What is General Relativity?",
    domain: "physics",
    topic: "relativity",
    questionPatterns: [
      "What is General Relativity?",
      "Explain Albert Einstein's general theory of relativity",
      "How does gravity work according to general relativity?",
      "Define general relativity"
    ],
    answer: "General relativity is Albert Einstein's 1915 geometric theory of gravitation. It posits that gravity is not an attractive force between masses, but rather the curvature of four-dimensional spacetime caused by mass and energy. Massive objects like planets and stars curve the geometry of spacetime around them, dictating the paths that freely moving objects and light follow.",
    keywords: ["general relativity", "einstein", "gravity", "spacetime", "curvature", "mass", "gravitational"],
    synonyms: ["theory of general relativity", "einsteinian gravitation"],
    entities: ["general_relativity", "spacetime", "gravity"],
    relationships: [
      { source: "general_relativity", relation: "IS_A", target: "scientific_theory" },
      { source: "general_relativity", relation: "EXPLAINS", target: "gravity" }
    ],
    language: "en",
    source: { type: "curated", reference: "Einstein (1915) Annalen der Physik" },
    verificationStatus: "verified",
    confidence: 0.99,
    version: 1
  },
  {
    id: "k_phys_quantum_002",
    title: "What is Quantum Mechanics?",
    domain: "physics",
    topic: "quantum-physics",
    questionPatterns: [
      "What is Quantum Mechanics?",
      "Define quantum mechanics",
      "Explain quantum physics",
      "What are the fundamental principles of quantum mechanics?"
    ],
    answer: "Quantum mechanics is the fundamental branch of physics that describes the physical properties of nature at atomic and subatomic scales. Key principles include wave-particle duality (matter and radiation exhibit both wave and particle characteristics), quantization of energy levels, the Heisenberg Uncertainty Principle, and quantum superposition.",
    keywords: ["quantum mechanics", "quantum physics", "superposition", "wave-particle duality", "uncertainty principle", "subatomic", "planck"],
    synonyms: ["quantum physics", "quantum theory"],
    entities: ["quantum_mechanics", "heisenberg_uncertainty"],
    relationships: [
      { source: "quantum_mechanics", relation: "IS_A", target: "branch_of_physics" }
    ],
    language: "en",
    source: { type: "curated", reference: "Principles of Quantum Mechanics, Dirac / Griffiths" },
    verificationStatus: "verified",
    confidence: 0.98,
    version: 1
  },
  {
    id: "k_phys_thermo_003",
    title: "What are the Laws of Thermodynamics?",
    domain: "physics",
    topic: "thermodynamics",
    questionPatterns: [
      "What are the laws of thermodynamics?",
      "Explain thermodynamics laws",
      "What is the second law of thermodynamics?",
      "What does conservation of energy mean in thermodynamics?"
    ],
    answer: "The laws of thermodynamics govern heat, work, and energy transfer. The Zeroth Law establishes thermal equilibrium and temperature. The First Law (Conservation of Energy) states that energy cannot be created or destroyed, only transformed (ΔU = Q - W). The Second Law states that the total entropy of an isolated system always increases over time. The Third Law states that the entropy of a pure crystal approaches zero as its temperature approaches absolute zero (0 Kelvin).",
    keywords: ["thermodynamics", "entropy", "conservation of energy", "heat", "temperature", "absolute zero", "laws of thermodynamics"],
    synonyms: ["thermodynamic laws"],
    entities: ["thermodynamics", "entropy"],
    relationships: [
      { source: "thermodynamics", relation: "IS_A", target: "branch_of_physics" }
    ],
    language: "en",
    source: { type: "curated", reference: "Fundamentals of Classical Thermodynamics" },
    verificationStatus: "verified",
    confidence: 0.99,
    version: 1
  },
  {
    id: "k_phys_light_004",
    title: "What is the speed of light?",
    domain: "physics",
    topic: "optics-relativity",
    questionPatterns: [
      "What is the speed of light?",
      "How fast is light in a vacuum?",
      "Define the speed of light c",
      "What is light speed in meters per second?"
    ],
    answer: "The speed of light in a vacuum, denoted as 'c', is exactly 299,792,458 meters per second (approximately 3.00 × 10^8 m/s or about 186,282 miles per second). In special relativity, 'c' is the universal speed limit for all mass, energy, and information transfer in the universe.",
    keywords: ["speed of light", "vacuum", "meters per second", "light speed", "constant c", "photon"],
    synonyms: ["velocity of light", "speed of light in vacuum"],
    entities: ["speed_of_light", "photon"],
    relationships: [
      { source: "speed_of_light", relation: "IS_A", target: "physical_constant" }
    ],
    language: "en",
    source: { type: "curated", reference: "NIST Reference on Constants, Units, and Uncertainty" },
    verificationStatus: "verified",
    confidence: 1.0,
    version: 1
  },

  // ==================== 2. CHEMISTRY ====================
  {
    id: "k_chem_bonds_001",
    title: "What are chemical bonds?",
    domain: "chemistry",
    topic: "chemical-bonding",
    questionPatterns: [
      "What are chemical bonds?",
      "Explain chemical bonding",
      "What is the difference between covalent and ionic bonds?",
      "Define chemical bond"
    ],
    answer: "A chemical bond is an attractive force that holds atoms or ions together to create molecules and compounds. The primary types are: 1) Covalent bonds, where atoms share pairs of valence electrons; 2) Ionic bonds, where electrons are transferred from a metal to a nonmetal forming electrostatic attraction between opposite ions; and 3) Metallic bonds, characterized by a shared 'sea' of delocalized electrons among metal cations.",
    keywords: ["chemical bond", "covalent bond", "ionic bond", "metallic bond", "electrons", "valence", "molecules"],
    synonyms: ["chemical bonding", "atomic bonds"],
    entities: ["chemical_bond", "covalent_bond", "ionic_bond"],
    relationships: [
      { source: "covalent_bond", relation: "IS_A", target: "chemical_bond" },
      { source: "ionic_bond", relation: "IS_A", target: "chemical_bond" }
    ],
    language: "en",
    source: { type: "curated", reference: "Pauling, The Nature of the Chemical Bond" },
    verificationStatus: "verified",
    confidence: 0.99,
    version: 1
  },
  {
    id: "k_chem_ph_002",
    title: "What is the pH scale?",
    domain: "chemistry",
    topic: "acids-bases",
    questionPatterns: [
      "What is the pH scale?",
      "Define pH scale",
      "Explain acids and bases on the pH scale",
      "What does pH measure?"
    ],
    answer: "The pH scale measures the acidity or basicity (alkalinity) of an aqueous solution based on hydrogen ion concentration: pH = -log10[H+]. The scale ranges from 0 to 14 at 25°C. A pH of 7 is neutral (pure water). A pH below 7 indicates an acidic solution (higher H+ concentration, like hydrochloric acid or lemon juice), while a pH above 7 indicates a basic/alkaline solution (like sodium hydroxide or bleach).",
    keywords: ["ph scale", "acid", "base", "alkaline", "hydrogen ion", "neutral", "chemistry"],
    synonyms: ["potential of hydrogen", "acidity scale"],
    entities: ["ph_scale", "acid", "base"],
    relationships: [
      { source: "ph_scale", relation: "MEASURES", target: "acidity" }
    ],
    language: "en",
    source: { type: "curated", reference: "Sørensen (1909), IUPAC Gold Book" },
    verificationStatus: "verified",
    confidence: 0.99,
    version: 1
  },
  {
    id: "k_chem_ptable_003",
    title: "What is the Periodic Table of Elements?",
    domain: "chemistry",
    topic: "periodic-table",
    questionPatterns: [
      "What is the Periodic Table of Elements?",
      "Explain the periodic table",
      "How is the periodic table organized?",
      "Define periodic table"
    ],
    answer: "The Periodic Table is a tabular arrangement of all known chemical elements organized by increasing atomic number (number of protons in the nucleus), electron configurations, and recurring chemical properties. Elements in the same vertical column (Group) exhibit similar valence electron structures and chemical reactivity, while horizontal rows (Periods) signify the filling of atomic electron shells.",
    keywords: ["periodic table", "elements", "atomic number", "protons", "groups", "periods", "mendeleev"],
    synonyms: ["periodic table of chemical elements", "mendeleev table"],
    entities: ["periodic_table", "chemical_element"],
    relationships: [
      { source: "periodic_table", relation: "ORGANIZES", target: "chemical_element" }
    ],
    language: "en",
    source: { type: "curated", reference: "IUPAC Periodic Table of the Elements" },
    verificationStatus: "verified",
    confidence: 1.0,
    version: 1
  },

  // ==================== 3. BIOLOGY ====================
  {
    id: "k_bio_dna_001",
    title: "What is DNA?",
    domain: "biology",
    topic: "genetics",
    questionPatterns: [
      "What is DNA?",
      "Define deoxyribonucleic acid",
      "Explain DNA structure and function",
      "What are the four bases in DNA?"
    ],
    answer: "Deoxyribonucleic acid (DNA) is the biological polymer that carries the hereditary genetic instructions used in the growth, development, functioning, and reproduction of all known living organisms. It consists of two antiparallel strands coiled around each other in a double helix structure. Each strand is composed of alternating sugar (deoxyribose) and phosphate groups bonded to nitrogenous bases: Adenine (A), Thymine (T), Guanine (G), and Cytosine (C).",
    keywords: ["dna", "genetics", "double helix", "nucleotides", "adenine", "thymine", "guanine", "cytosine", "genes"],
    synonyms: ["deoxyribonucleic acid", "genetic code"],
    entities: ["dna", "gene", "nucleotide"],
    relationships: [
      { source: "dna", relation: "IS_A", target: "nucleic_acid" },
      { source: "gene", relation: "PART_OF", target: "dna" }
    ],
    language: "en",
    source: { type: "curated", reference: "Watson & Crick (1953) Nature" },
    verificationStatus: "verified",
    confidence: 1.0,
    version: 1
  },
  {
    id: "k_bio_photosynth_002",
    title: "What is photosynthesis?",
    domain: "biology",
    topic: "plant-biology",
    questionPatterns: [
      "What is photosynthesis?",
      "Explain how photosynthesis works",
      "Define photosynthesis",
      "What is the chemical equation for photosynthesis?"
    ],
    answer: "Photosynthesis is the biochemical process by which autotrophic organisms (such as green plants, algae, and cyanobacteria) convert light energy from the Sun into chemical energy stored in glucose. Using chlorophyll pigments inside chloroplasts, plants combine carbon dioxide (CO2) and water (H2O) in the presence of sunlight to synthesize glucose (C6H12O6) and release molecular oxygen (O2) as a byproduct: 6CO2 + 6H2O + light -> C6H12O6 + 6O2.",
    keywords: ["photosynthesis", "chlorophyll", "chloroplast", "glucose", "carbon dioxide", "sunlight", "oxygen"],
    synonyms: ["plant light synthesis"],
    entities: ["photosynthesis", "chloroplast"],
    relationships: [
      { source: "photosynthesis", relation: "OCCURS_IN", target: "chloroplast" }
    ],
    language: "en",
    source: { type: "curated", reference: "Campbell Biology (12th Edition)" },
    verificationStatus: "verified",
    confidence: 0.99,
    version: 1
  },
  {
    id: "k_bio_mitochondria_003",
    title: "What are mitochondria?",
    domain: "biology",
    topic: "cell-biology",
    questionPatterns: [
      "What is a mitochondrion?",
      "What are mitochondria?",
      "Explain the function of mitochondria",
      "Why is mitochondria called the powerhouse of the cell?"
    ],
    answer: "Mitochondria are double-membrane-bound organelles found in the cytoplasm of eukaryotic cells. Commonly termed the 'powerhouse of the cell', their primary biological function is to generate the majority of cellular energy in the form of adenosine triphosphate (ATP) through aerobic cellular respiration and oxidative phosphorylation. They contain their own circular mitochondrial DNA (mtDNA) and ribosomes.",
    keywords: ["mitochondria", "mitochondrion", "powerhouse of the cell", "atp", "cellular respiration", "organelle", "eukaryotic"],
    synonyms: ["powerhouse of the cell", "cellular powerhouse"],
    entities: ["mitochondria", "atp", "eukaryotic_cell"],
    relationships: [
      { source: "mitochondria", relation: "PART_OF", target: "eukaryotic_cell" },
      { source: "mitochondria", relation: "PRODUCES", target: "atp" }
    ],
    language: "en",
    source: { type: "curated", reference: "Molecular Biology of the Cell, Alberts et al." },
    verificationStatus: "verified",
    confidence: 1.0,
    version: 1
  },

  // ==================== 4. ASTRONOMY ====================
  {
    id: "k_astro_solarsys_001",
    title: "What is the Solar System?",
    domain: "astronomy",
    topic: "solar-system",
    questionPatterns: [
      "What is the Solar System?",
      "Explain the solar system",
      "What are the planets in our solar system?",
      "List the eight planets"
    ],
    answer: "The Solar System is the gravitationally bound system of the Sun and the celestial objects that orbit it directly or indirectly. It consists of the Sun (a G-type main-sequence star containing 99.86% of the system's mass) and eight recognized planets in order from the Sun: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, and Neptune, along with dwarf planets (such as Pluto, Ceres, and Eris), asteroid belts, comets, and the Kuiper belt.",
    keywords: ["solar system", "sun", "planets", "mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune", "orbit"],
    synonyms: ["our planetary system"],
    entities: ["solar_system", "sun", "planet"],
    relationships: [
      { source: "solar_system", relation: "PART_OF", target: "milky_way" },
      { source: "sun", relation: "PART_OF", target: "solar_system" }
    ],
    language: "en",
    source: { type: "curated", reference: "NASA Solar System Exploration" },
    verificationStatus: "verified",
    confidence: 1.0,
    version: 1
  },
  {
    id: "k_astro_blackhole_002",
    title: "What is a black hole?",
    domain: "astronomy",
    topic: "astrophysics",
    questionPatterns: [
      "What is a black hole?",
      "Define black hole",
      "Explain black holes",
      "What is the event horizon of a black hole?"
    ],
    answer: "A black hole is a region of spacetime where gravity is so intense that nothing—including particles and electromagnetic radiation such as light—can escape from inside its boundary, known as the event horizon. Black holes form primarily when massive stars collapse at the end of their thermonuclear life cycle. In general relativity, their mass is concentrated into a central gravitational singularity of infinite density.",
    keywords: ["black hole", "event horizon", "singularity", "gravity", "spacetime", "stellar collapse", "astrophysics"],
    synonyms: ["gravitational singularity", "black hole singularity"],
    entities: ["black_hole", "event_horizon"],
    relationships: [
      { source: "black_hole", relation: "IS_A", target: "celestial_object" },
      { source: "event_horizon", relation: "PART_OF", target: "black_hole" }
    ],
    language: "en",
    source: { type: "curated", reference: "Hawking (1974), Penrose (1965) Gravitational Collapse" },
    verificationStatus: "verified",
    confidence: 0.99,
    version: 1
  },
  {
    id: "k_astro_milkyway_003",
    title: "What is the Milky Way?",
    domain: "astronomy",
    topic: "galaxies",
    questionPatterns: [
      "What is the Milky Way?",
      "Define Milky Way galaxy",
      "Explain the Milky Way",
      "What type of galaxy is the Milky Way?"
    ],
    answer: "The Milky Way is the barred spiral galaxy containing our Solar System and between 100 and 400 billion stars, with an estimated visible diameter of approximately 100,000 to 120,000 light-years. At its galactic core lies Sagittarius A*, a supermassive black hole with a mass approximately 4 million times that of the Sun. It is part of the Local Group of galaxies.",
    keywords: ["milky way", "galaxy", "barred spiral", "sagittarius a*", "stars", "supermassive black hole", "local group"],
    synonyms: ["milky way galaxy", "our galaxy"],
    entities: ["milky_way", "galaxy"],
    relationships: [
      { source: "milky_way", relation: "IS_A", target: "galaxy" }
    ],
    language: "en",
    source: { type: "curated", reference: "European Space Agency (ESA) Gaia Mission" },
    verificationStatus: "verified",
    confidence: 1.0,
    version: 1
  },

  // ==================== 5. COMPUTER SCIENCE ====================
  {
    id: "k_cs_bigo_001",
    title: "What is Big-O Notation?",
    domain: "computer-science",
    topic: "algorithm-complexity",
    questionPatterns: [
      "What is Big-O notation?",
      "Define Big-O notation",
      "Explain time complexity and Big O",
      "What does Big O describe?"
    ],
    answer: "Big-O notation is a mathematical notation used in computer science to classify algorithms according to how their run time or space requirements grow as the input size (n) grows toward infinity. It provides an upper bound on asymptotic growth rate. Common complexity classes include O(1) constant time, O(log n) logarithmic time (e.g. binary search), O(n) linear time, O(n log n) linearithmic time (e.g. mergesort), O(n^2) quadratic time, and O(2^n) exponential time.",
    keywords: ["big-o", "big o notation", "time complexity", "space complexity", "asymptotic", "algorithms", "growth rate"],
    synonyms: ["asymptotic notation", "order of complexity"],
    entities: ["big_o", "algorithm_complexity"],
    relationships: [
      { source: "big_o", relation: "MEASURES", target: "algorithm_complexity" }
    ],
    language: "en",
    source: { type: "curated", reference: "Introduction to Algorithms (CLRS)" },
    verificationStatus: "verified",
    confidence: 0.99,
    version: 1
  },
  {
    id: "k_cs_os_002",
    title: "What is the difference between a Process and a Thread?",
    domain: "computer-science",
    topic: "operating-systems",
    questionPatterns: [
      "What is the difference between a process and a thread?",
      "Process vs thread",
      "Define process and thread in operating systems",
      "Explain multi-threading vs multi-processing"
    ],
    answer: "In operating systems, a Process is an independent executing program with its own dedicated memory address space, file handles, and system resources. A Thread is the smallest unit of execution within a process (often called a lightweight process). Multiple threads belonging to the same process share the process's code, data segment, and open files, but maintain individual execution stacks and program counters, making inter-thread communication faster than inter-process communication.",
    keywords: ["process", "thread", "operating system", "concurrency", "multithreading", "memory space", "context switch"],
    synonyms: ["process vs thread", "multithreading vs multiprocessing"],
    entities: ["process", "thread", "operating_system"],
    relationships: [
      { source: "thread", relation: "PART_OF", target: "process" },
      { source: "process", relation: "MANAGED_BY", target: "operating_system" }
    ],
    language: "en",
    source: { type: "curated", reference: "Operating System Concepts, Silberschatz et al." },
    verificationStatus: "verified",
    confidence: 0.99,
    version: 1
  },

  // ==================== 6. PROGRAMMING ====================
  {
    id: "k_prog_oop_001",
    title: "What is Object-Oriented Programming (OOP)?",
    domain: "programming",
    topic: "paradigms",
    questionPatterns: [
      "What is Object-Oriented Programming?",
      "What is OOP?",
      "Explain the four principles of OOP",
      "Define object oriented programming"
    ],
    answer: "Object-Oriented Programming (OOP) is a programming paradigm organized around objects—data structures that bundle state (attributes/fields) and behavior (methods/functions). The four fundamental principles of OOP are: 1) Encapsulation (hiding internal state and exposing a public API); 2) Abstraction (simplifying complex reality by modeling classes appropriate to the problem); 3) Inheritance (creating new classes from existing ones to reuse code); and 4) Polymorphism (allowing entities of different types to be accessed through a unified interface).",
    keywords: ["oop", "object-oriented programming", "encapsulation", "inheritance", "polymorphism", "abstraction", "classes", "objects"],
    synonyms: ["object oriented programming paradigm"],
    entities: ["oop", "encapsulation", "inheritance", "polymorphism"],
    relationships: [
      { source: "oop", relation: "IS_A", target: "programming_paradigm" }
    ],
    language: "en",
    source: { type: "curated", reference: "Design Patterns: Elements of Reusable Object-Oriented Software (GoF)" },
    verificationStatus: "verified",
    confidence: 0.99,
    version: 1
  },
  {
    id: "k_prog_async_002",
    title: "What is Asynchronous Programming?",
    domain: "programming",
    topic: "asynchronous-architecture",
    questionPatterns: [
      "What is asynchronous programming?",
      "Explain async programming",
      "What is the event loop?",
      "How do promises and async/await work?"
    ],
    answer: "Asynchronous programming is a non-blocking programming pattern where a unit of work (such as an I/O operation, network request, or disk read) runs independently from the primary application thread. Instead of blocking thread execution until the operation completes, the program registers callbacks, Promises, or async/await routines that are invoked once the result is ready via an event loop mechanism.",
    keywords: ["asynchronous", "async", "promises", "event loop", "non-blocking", "await", "callbacks"],
    synonyms: ["async programming", "non-blocking programming"],
    entities: ["asynchronous_programming", "event_loop"],
    relationships: [
      { source: "asynchronous_programming", relation: "IS_A", target: "concurrency_pattern" }
    ],
    language: "en",
    source: { type: "curated", reference: "Node.js Architecture Guides / MDN Web Docs" },
    verificationStatus: "verified",
    confidence: 0.99,
    version: 1
  },

  // ==================== 7. DATABASE ADMINISTRATION ====================
  {
    id: "k_dba_acid_001",
    title: "What are ACID properties in databases?",
    domain: "database-administration",
    topic: "transactions",
    questionPatterns: [
      "What are ACID properties in databases?",
      "Explain ACID properties",
      "What does ACID stand for in DBMS?",
      "Define ACID in databases"
    ],
    answer: "ACID is an acronym representing the four key properties that guarantee reliable transaction processing in database management systems: 1) Atomicity: The entire transaction succeeds or entirely fails ('all or nothing'); 2) Consistency: Any transaction brings the database from one valid state to another, maintaining all schema constraints; 3) Isolation: Concurrent execution of transactions yields the same state as if executed serially; 4) Durability: Once a transaction commits, its changes survive system crashes or power loss.",
    keywords: ["acid", "atomicity", "consistency", "isolation", "durability", "database transaction", "rdbms"],
    synonyms: ["acid properties", "acid transaction guarantees"],
    entities: ["acid", "database_transaction"],
    relationships: [
      { source: "acid", relation: "CHARACTERIZES", target: "database_transaction" }
    ],
    language: "en",
    source: { type: "curated", reference: "Haerder and Reuter (1983) ACM Computing Surveys" },
    verificationStatus: "verified",
    confidence: 1.0,
    version: 1
  },
  {
    id: "k_dba_indexing_002",
    title: "What is a database index and how does it work?",
    domain: "database-administration",
    topic: "indexing",
    questionPatterns: [
      "What is a database index?",
      "How do database indexes work?",
      "Explain B-Tree indexes in SQL",
      "Why use indexes in databases?"
    ],
    answer: "A database index is a specialized auxiliary data structure (most commonly implemented as a self-balancing B-Tree or B+ Tree) that improves the speed of data retrieval operations on a database table at the cost of additional storage and slower write operations. By maintaining sorted references to row locations (pointers/RIDs), indexes allow the database query engine to locate records in O(log n) time rather than performing full table scans in O(n) time.",
    keywords: ["database index", "b-tree", "query optimization", "full table scan", "indexing", "performance", "b+ tree"],
    synonyms: ["database indexing", "b-tree index"],
    entities: ["database_index", "b_tree"],
    relationships: [
      { source: "database_index", relation: "USES", target: "b_tree" }
    ],
    language: "en",
    source: { type: "curated", reference: "Database System Concepts, Silberschatz, Korth, Sudarshan" },
    verificationStatus: "verified",
    confidence: 0.99,
    version: 1
  },

  // ==================== 8. CYBERSECURITY ====================
  {
    id: "k_sec_crypto_001",
    title: "What is Public-Key Cryptography?",
    domain: "cybersecurity",
    topic: "cryptography",
    questionPatterns: [
      "What is public-key cryptography?",
      "Explain asymmetric encryption",
      "How does public key encryption work?",
      "What is the difference between symmetric and asymmetric encryption?"
    ],
    answer: "Public-key cryptography (or asymmetric cryptography) is a cryptographic system that uses pairs of mathematically related keys: a public key, which can be disseminated widely, and a private key, which is kept secret by the owner. It enables secure communication over unsecure channels without pre-sharing a secret key. Anyone can encrypt a message using the recipient's public key, but only the holder of the matching private key can decrypt it. It also enables digital signatures for non-repudiation.",
    keywords: ["public-key cryptography", "asymmetric encryption", "private key", "public key", "rsa", "digital signatures", "tls"],
    synonyms: ["asymmetric cryptography", "public-key encryption"],
    entities: ["public_key_cryptography", "encryption"],
    relationships: [
      { source: "public_key_cryptography", relation: "IS_A", target: "encryption" }
    ],
    language: "en",
    source: { type: "curated", reference: "Diffie & Hellman (1976) New Directions in Cryptography" },
    verificationStatus: "verified",
    confidence: 0.99,
    version: 1
  },
  {
    id: "k_sec_sqli_002",
    title: "What is SQL Injection and how is it prevented?",
    domain: "cybersecurity",
    topic: "web-security",
    questionPatterns: [
      "What is SQL Injection?",
      "Define SQL injection (SQLi)",
      "How do you prevent SQL injection?",
      "Explain parameterized queries"
    ],
    answer: "SQL Injection (SQLi) is a security vulnerability where an attacker manipulates application database queries by injecting malicious SQL code into input fields or parameters. If user inputs are directly concatenated into SQL strings, attackers can bypass authentication, read unauthorized data, modify records, or execute administrative operations. Prevention requires using parameterized queries (prepared statements), object-relational mappers (ORMs), input validation, and least-privilege database accounts.",
    keywords: ["sql injection", "sqli", "prepared statements", "parameterized queries", "vulnerability", "web security", "input sanitization"],
    synonyms: ["sqli vulnerability"],
    entities: ["sql_injection", "vulnerability"],
    relationships: [
      { source: "sql_injection", relation: "IS_A", target: "security_vulnerability" }
    ],
    language: "en",
    source: { type: "curated", reference: "OWASP Top Ten Security Risks" },
    verificationStatus: "verified",
    confidence: 1.0,
    version: 1
  },

  // ==================== 9. NETWORKING ====================
  {
    id: "k_net_osi_001",
    title: "What is the OSI 7-Layer Model?",
    domain: "networking",
    topic: "network-protocols",
    questionPatterns: [
      "What is the OSI model?",
      "Explain the 7 layers of the OSI model",
      "List the OSI layers",
      "Define OSI model"
    ],
    answer: "The Open Systems Interconnection (OSI) model is a conceptual framework that standardizes the telecommunication functions of network systems into 7 abstraction layers: 1) Physical Layer (electrical/optical bit transmission); 2) Data Link Layer (MAC addressing, frames, switches); 3) Network Layer (IP addressing, packet routing, routers); 4) Transport Layer (TCP/UDP, end-to-end reliability); 5) Session Layer (connection management); 6) Presentation Layer (data translation, encryption, compression); and 7) Application Layer (HTTP, SMTP, user interface protocols).",
    keywords: ["osi model", "7 layers", "physical", "data link", "network", "transport", "session", "presentation", "application", "networking"],
    synonyms: ["open systems interconnection model"],
    entities: ["osi_model", "tcp_ip"],
    relationships: [
      { source: "osi_model", relation: "IS_A", target: "reference_model" }
    ],
    language: "en",
    source: { type: "curated", reference: "ISO/IEC 7498-1 Standard" },
    verificationStatus: "verified",
    confidence: 1.0,
    version: 1
  },
  {
    id: "k_net_dns_002",
    title: "What is DNS and how does it work?",
    domain: "networking",
    topic: "dns",
    questionPatterns: [
      "What is DNS?",
      "Define Domain Name System",
      "How does DNS resolution work?",
      "Explain DNS lookup"
    ],
    answer: "The Domain Name System (DNS) is the hierarchical and decentralized naming system used to identify computers, services, and other resources reachable over the Internet. Often termed the 'phonebook of the Internet', DNS translates human-friendly domain names (like example.com) into numerical IP addresses (like 93.184.216.34) required by network routing protocols. Resolution involves query recursion through Root servers, Top-Level Domain (TLD) servers, and Authoritative Name Servers.",
    keywords: ["dns", "domain name system", "ip address", "dns resolution", "nameservers", "tld", "networking"],
    synonyms: ["domain name resolution", "domain name system"],
    entities: ["dns", "ip_address"],
    relationships: [
      { source: "dns", relation: "TRANSLATES", target: "ip_address" }
    ],
    language: "en",
    source: { type: "curated", reference: "RFC 1034 & RFC 1035 (Mockapetris)" },
    verificationStatus: "verified",
    confidence: 0.99,
    version: 1
  },

  // ==================== 10. MATHEMATICS ====================
  {
    id: "k_math_pythagoras_001",
    title: "What is the Pythagorean Theorem?",
    domain: "mathematics",
    topic: "geometry",
    questionPatterns: [
      "What is the Pythagorean Theorem?",
      "Define Pythagorean theorem",
      "Explain a^2 + b^2 = c^2",
      "How does Pythagoras theorem calculate hypotenuse?"
    ],
    answer: "The Pythagorean Theorem is a fundamental relation in Euclidean geometry among the three sides of a right-angled triangle. It states that the square of the length of the hypotenuse (the side opposite the right angle, c) is equal to the sum of the squares of the lengths of the other two sides (a and b): a^2 + b^2 = c^2. It allows calculation of distances and forms the basis for Cartesian metric equations in higher dimensions.",
    keywords: ["pythagorean theorem", "right triangle", "hypotenuse", "geometry", "a2 + b2 = c2", "pythagoras"],
    synonyms: ["pythagoras theorem", "hypotenuse theorem"],
    entities: ["pythagorean_theorem", "right_triangle"],
    relationships: [
      { source: "pythagorean_theorem", relation: "APPLIES_TO", target: "right_triangle" }
    ],
    language: "en",
    source: { type: "curated", reference: "Euclid's Elements, Book I, Proposition 47" },
    verificationStatus: "verified",
    confidence: 1.0,
    version: 1
  },
  {
    id: "k_math_prime_002",
    title: "What is a Prime Number?",
    domain: "mathematics",
    topic: "number-theory",
    questionPatterns: [
      "What is a prime number?",
      "Define prime number",
      "What is the fundamental theorem of arithmetic?",
      "What is the smallest prime number?"
    ],
    answer: "A prime number is a natural number strictly greater than 1 that has no positive divisors other than 1 and itself (e.g. 2, 3, 5, 7, 11, 13, 17...). The number 2 is the only even prime number. Under the Fundamental Theorem of Arithmetic, every integer greater than 1 either is a prime itself or can be uniquely factored as a product of prime numbers, up to the order of factors.",
    keywords: ["prime number", "divisors", "number theory", "fundamental theorem of arithmetic", "factors", "primes"],
    synonyms: ["prime", "prime numbers"],
    entities: ["prime_number", "number_theory"],
    relationships: [
      { source: "prime_number", relation: "IS_A", target: "natural_number" }
    ],
    language: "en",
    source: { type: "curated", reference: "Hardy & Wright, An Introduction to the Theory of Numbers" },
    verificationStatus: "verified",
    confidence: 1.0,
    version: 1
  },

  // ==================== 11. ENGINEERING ====================
  {
    id: "k_eng_ohm_001",
    title: "What is Ohm's Law?",
    domain: "engineering",
    topic: "electrical-engineering",
    questionPatterns: [
      "What is Ohm's Law?",
      "Define Ohm's law",
      "Explain V = I * R",
      "What is the relationship between voltage, current, and resistance?"
    ],
    answer: "Ohm's Law is a foundational formula in electrical engineering and physics. It states that the electrical current (I, measured in amperes) flowing through a conductor between two points is directly proportional to the voltage (V, measured in volts) across the two points and inversely proportional to the electrical resistance (R, measured in ohms): V = I × R. Formulated by Georg Ohm in 1827.",
    keywords: ["ohm's law", "voltage", "current", "resistance", "amperes", "volts", "ohms", "electrical engineering"],
    synonyms: ["ohms law", "electrical resistance formula"],
    entities: ["ohms_law", "voltage", "current", "resistance"],
    relationships: [
      { source: "ohms_law", relation: "IS_A", target: "scientific_law" }
    ],
    language: "en",
    source: { type: "curated", reference: "Georg Simon Ohm (1827), Electrical Circuits" },
    verificationStatus: "verified",
    confidence: 1.0,
    version: 1
  },

  // ==================== 12. ECONOMICS ====================
  {
    id: "k_econ_supplydemand_001",
    title: "What is the Law of Supply and Demand?",
    domain: "economics",
    topic: "microeconomics",
    questionPatterns: [
      "What is the law of supply and demand?",
      "Explain supply and demand",
      "Define supply and demand equilibrium",
      "How do prices get set in a market?"
    ],
    answer: "The Law of Supply and Demand is a core economic model of price determination in competitive markets. The Law of Demand states that, ceteris paribus, as the price of a good increases, consumer quantity demanded decreases. The Law of Supply states that as the price of a good increases, producer quantity supplied increases. The intersection of the supply and demand curves determines market equilibrium price and quantity.",
    keywords: ["supply and demand", "equilibrium price", "microeconomics", "quantity demanded", "market price", "economics"],
    synonyms: ["law of supply and demand", "market equilibrium"],
    entities: ["supply_and_demand", "market_equilibrium"],
    relationships: [
      { source: "supply_and_demand", relation: "IS_A", target: "economic_model" }
    ],
    language: "en",
    source: { type: "curated", reference: "Principles of Microeconomics, Mankiw" },
    verificationStatus: "verified",
    confidence: 0.99,
    version: 1
  },
  {
    id: "k_econ_gdp_002",
    title: "What is Gross Domestic Product (GDP)?",
    domain: "economics",
    topic: "macroeconomics",
    questionPatterns: [
      "What is GDP?",
      "Define Gross Domestic Product",
      "Explain gross domestic product",
      "How is GDP calculated?"
    ],
    answer: "Gross Domestic Product (GDP) is the total monetary value of all finished goods and services produced within a country's borders during a specific time period (usually annually or quarterly). It serves as the primary gauge of a country's economic health and size. Under the expenditure approach, GDP is calculated as: GDP = Consumption (C) + Investment (I) + Government Spending (G) + Net Exports (X - M).",
    keywords: ["gdp", "gross domestic product", "macroeconomics", "consumption", "economic indicator", "national income"],
    synonyms: ["national gross domestic product"],
    entities: ["gdp", "macroeconomics"],
    relationships: [
      { source: "gdp", relation: "MEASURES", target: "economic_output" }
    ],
    language: "en",
    source: { type: "curated", reference: "International Monetary Fund (IMF) Economic Guidelines" },
    verificationStatus: "verified",
    confidence: 1.0,
    version: 1
  },

  // ==================== 13. FINANCE ====================
  {
    id: "k_fin_compound_001",
    title: "What is Compound Interest?",
    domain: "finance",
    topic: "investing",
    questionPatterns: [
      "What is compound interest?",
      "Define compound interest",
      "How is compound interest calculated?",
      "Explain the formula for compound interest"
    ],
    answer: "Compound interest is the addition of interest to the principal sum of a loan or deposit, meaning interest is earned on both initial principal and accumulated interest from previous periods ('interest on interest'). The formula is A = P(1 + r/n)^(nt), where A is final amount, P is principal, r is annual interest rate (decimal), n is compounding frequency per year, and t is time in years.",
    keywords: ["compound interest", "principal", "interest rate", "time value of money", "finance", "investing", "exponential growth"],
    synonyms: ["compounding interest"],
    entities: ["compound_interest", "time_value_of_money"],
    relationships: [
      { source: "compound_interest", relation: "IS_A", target: "financial_concept" }
    ],
    language: "en",
    source: { type: "curated", reference: "Corporate Finance, Ross, Westerfield, Jaffe" },
    verificationStatus: "verified",
    confidence: 1.0,
    version: 1
  },

  // ==================== 14. BUSINESS ====================
  {
    id: "k_biz_model_001",
    title: "What is a Business Model?",
    domain: "business",
    topic: "business-strategy",
    questionPatterns: [
      "What is a business model?",
      "Define business model",
      "Explain common business models like B2B, B2C, SaaS",
      "What does a business model describe?"
    ],
    answer: "A business model is an organization's core plan for sustainably generating revenue and making a profit. It outlines the value proposition offered to customers, customer segments, sales channels, cost structures, and key revenue streams. Common models include B2B (Business-to-Business), B2C (Business-to-Consumer), SaaS (Software as a Service subscriptions), freemium, and marketplace models.",
    keywords: ["business model", "saas", "b2b", "b2c", "revenue model", "value proposition", "profitability"],
    synonyms: ["commercial model"],
    entities: ["business_model", "value_proposition"],
    relationships: [
      { source: "business_model", relation: "IS_A", target: "strategic_framework" }
    ],
    language: "en",
    source: { type: "curated", reference: "Business Model Generation, Osterwalder & Pigneur" },
    verificationStatus: "verified",
    confidence: 0.98,
    version: 1
  },

  // ==================== 15. GEOGRAPHY ====================
  {
    id: "k_geo_continents_001",
    title: "What are the seven continents?",
    domain: "geography",
    topic: "physical-geography",
    questionPatterns: [
      "What are the seven continents?",
      "List the continents of the world",
      "How many continents are there on Earth?",
      "Define continent"
    ],
    answer: "A continent is one of several very large landmasses on Earth. In the standard English-speaking seven-continent model, they are ordered by area from largest to smallest: 1) Asia, 2) Africa, 3) North America, 4) South America, 5) Antarctica, 6) Europe, and 7) Australia (Oceania). Together, continents make up approximately 29.2% of Earth's surface area.",
    keywords: ["continents", "seven continents", "asia", "africa", "north america", "south america", "antarctica", "europe", "australia", "geography"],
    synonyms: ["the 7 continents", "world continents"],
    entities: ["continent", "earth"],
    relationships: [
      { source: "continent", relation: "PART_OF", target: "earth" }
    ],
    language: "en",
    source: { type: "curated", reference: "National Geographic Society World Atlas" },
    verificationStatus: "verified",
    confidence: 1.0,
    version: 1
  },
  {
    id: "k_geo_plate_002",
    title: "What is Plate Tectonics?",
    domain: "geography",
    topic: "geology",
    questionPatterns: [
      "What is plate tectonics?",
      "Explain plate tectonics",
      "What causes earthquakes and continental drift?",
      "Define tectonic plates"
    ],
    answer: "Plate tectonics is the foundational scientific theory in geology explaining that Earth's outer rigid shell (the lithosphere) is divided into several large and small tectonic plates that glide over the ductile asthenosphere beneath. Plate movements cause continental drift, seismic earthquakes, volcanic eruptions, and the formation of oceanic trenches and mountain ranges along divergent, convergent, and transform boundaries.",
    keywords: ["plate tectonics", "tectonic plates", "continental drift", "lithosphere", "earthquakes", "volcanoes", "geology"],
    synonyms: ["tectonic plate theory"],
    entities: ["plate_tectonics", "lithosphere"],
    relationships: [
      { source: "plate_tectonics", relation: "IS_A", target: "geological_theory" }
    ],
    language: "en",
    source: { type: "curated", reference: "USGS (United States Geological Survey)" },
    verificationStatus: "verified",
    confidence: 0.99,
    version: 1
  },

  // ==================== 16. HISTORY ====================
  {
    id: "k_hist_rome_001",
    title: "What was the Roman Empire?",
    domain: "history",
    topic: "ancient-history",
    questionPatterns: [
      "What was the Roman Empire?",
      "Explain the Roman Empire",
      "When did the Roman Empire begin and fall?",
      "Who was the first Roman Emperor?"
    ],
    answer: "The Roman Empire was the post-Republican period of ancient Roman civilization characterized by an autocratic government and extensive territorial holdings across Europe, North Africa, and Western Asia. It began in 27 BC when Octavian was granted the title Augustus, ending the Roman Republic. The Western Roman Empire collapsed in 476 AD, while the Eastern Roman (Byzantine) Empire survived until the fall of Constantinople in 1453.",
    keywords: ["roman empire", "ancient rome", "augustus", "caesar", "byzantine empire", "constantinople", "world history"],
    synonyms: ["imperium romanum", "ancient roman empire"],
    entities: ["roman_empire", "ancient_rome"],
    relationships: [
      { source: "roman_empire", relation: "IS_A", target: "empire" }
    ],
    language: "en",
    source: { type: "curated", reference: "Gibbon, Decline and Fall of the Roman Empire" },
    verificationStatus: "verified",
    confidence: 0.99,
    version: 1
  },
  {
    id: "k_hist_renaissance_002",
    title: "What was the Renaissance?",
    domain: "history",
    topic: "european-history",
    questionPatterns: [
      "What was the Renaissance?",
      "Explain the European Renaissance",
      "When did the Renaissance occur?",
      "Define Renaissance"
    ],
    answer: "The Renaissance was a fervent period of cultural, artistic, political, and scientific rebirth across Europe spanning roughly from the 14th to the 17th century, originating in Florence, Italy. It marked the transition from the Middle Ages to modernity, characterized by the revival of classical Greek and Roman philosophy, humanism, and monumental breakthroughs by figures like Leonardo da Vinci, Michelangelo, Copernicus, and Galileo.",
    keywords: ["renaissance", "humanism", "florence", "italy", "leonardo da vinci", "michelangelo", "european history"],
    synonyms: ["the european renaissance", "the rebirth"],
    entities: ["renaissance", "humanism"],
    relationships: [
      { source: "renaissance", relation: "IS_A", target: "historical_era" }
    ],
    language: "en",
    source: { type: "curated", reference: "Burckhardt, The Civilization of the Renaissance in Italy" },
    verificationStatus: "verified",
    confidence: 0.99,
    version: 1
  },

  // ==================== 17. LITERATURE ====================
  {
    id: "k_lit_shakespeare_001",
    title: "Who was William Shakespeare?",
    domain: "literature",
    topic: "english-literature",
    questionPatterns: [
      "Who was William Shakespeare?",
      "What did William Shakespeare write?",
      "Explain Shakespeare's contributions to literature",
      "List Shakespeare's famous plays"
    ],
    answer: "William Shakespeare (1564–1616) was an English playwright, poet, and actor, widely regarded as the greatest dramatist in the English language and the world's pre-eminent writer. Known as the 'Bard of Avon', his works include 39 plays (such as Hamlet, Romeo and Juliet, Macbeth, Othello, and King Lear), 154 sonnets, and two long narrative poems, profoundly shaping English vocabulary and world drama.",
    keywords: ["william shakespeare", "shakespeare", "hamlet", "romeo and juliet", "macbeth", "sonnets", "bard of avon", "literature"],
    synonyms: ["the bard", "bard of avon"],
    entities: ["shakespeare", "playwright"],
    relationships: [
      { source: "shakespeare", relation: "IS_A", target: "playwright" }
    ],
    language: "en",
    source: { type: "curated", reference: "The Oxford Shakespeare: The Complete Works" },
    verificationStatus: "verified",
    confidence: 1.0,
    version: 1
  },

  // ==================== 18. PHILOSOPHY ====================
  {
    id: "k_phil_socrates_001",
    title: "Who was Socrates and what is the Socratic Method?",
    domain: "philosophy",
    topic: "classical-philosophy",
    questionPatterns: [
      "Who was Socrates?",
      "What is the Socratic Method?",
      "Explain Socratic questioning",
      "Define Socratic method"
    ],
    answer: "Socrates (c. 470–399 BC) was a classical Greek philosopher from Athens credited as one of the founders of Western philosophy. He wrote nothing himself; his ideas were preserved primarily by his student Plato. The Socratic Method is a cooperative argumentative dialogue in which the facilitator asks probing questions to stimulate critical thinking, uncover underlying presumptions, and draw out latent philosophical insights.",
    keywords: ["socrates", "socratic method", "plato", "athens", "greek philosophy", "critical thinking", "ethics"],
    synonyms: ["elenchus", "socratic questioning"],
    entities: ["socrates", "plato", "philosopher"],
    relationships: [
      { source: "socrates", relation: "IS_A", target: "philosopher" },
      { source: "plato", relation: "STUDIED_UNDER", target: "socrates" }
    ],
    language: "en",
    source: { type: "curated", reference: "Plato's Dialogues (Apology, Crito, Republic)" },
    verificationStatus: "verified",
    confidence: 0.99,
    version: 1
  },

  // ==================== 19. AGRICULTURE ====================
  {
    id: "k_agr_rotation_001",
    title: "What is crop rotation and why is it important?",
    domain: "agriculture",
    topic: "sustainable-farming",
    questionPatterns: [
      "What is crop rotation?",
      "Explain the benefits of crop rotation",
      "Why do farmers rotate crops?",
      "Define crop rotation"
    ],
    answer: "Crop rotation is the agricultural practice of growing a series of different types of crops in the same area across sequential seasons. It improves soil structure and nutrient levels (especially by using legumes to fix atmospheric nitrogen), prevents soil erosion, breaks pest and weed reproduction cycles, and reduces dependence on synthetic chemical fertilizers and pesticides.",
    keywords: ["crop rotation", "agriculture", "soil fertility", "nitrogen fixation", "pest management", "sustainable farming"],
    synonyms: ["rotational cropping", "crop sequencing"],
    entities: ["crop_rotation", "soil_fertility"],
    relationships: [
      { source: "crop_rotation", relation: "IMPROVES", target: "soil_fertility" }
    ],
    language: "en",
    source: { type: "curated", reference: "FAO (Food and Agriculture Organization)" },
    verificationStatus: "verified",
    confidence: 0.99,
    version: 1
  },

  // ==================== 20. ENVIRONMENT ====================
  {
    id: "k_env_greenhouse_001",
    title: "What is the Greenhouse Effect?",
    domain: "environment",
    topic: "climate-science",
    questionPatterns: [
      "What is the greenhouse effect?",
      "Explain global warming and greenhouse gases",
      "What causes the greenhouse effect?",
      "Define greenhouse effect"
    ],
    answer: "The Greenhouse Effect is a natural process that warms Earth's surface. When solar energy reaches Earth's atmosphere, some is reflected back into space and the rest is absorbed by land and oceans. Greenhouse gases (such as water vapor, carbon dioxide (CO2), methane (CH4), and nitrous oxide (N2O)) absorb thermal infrared radiation emitted from the surface and re-radiate it in all directions, trapping heat in the lower atmosphere.",
    keywords: ["greenhouse effect", "climate change", "global warming", "carbon dioxide", "methane", "atmosphere", "infrared"],
    synonyms: ["atmospheric greenhouse warming"],
    entities: ["greenhouse_effect", "climate_change"],
    relationships: [
      { source: "greenhouse_effect", relation: "INFLUENCES", target: "climate_change" }
    ],
    language: "en",
    source: { type: "curated", reference: "IPCC Sixth Assessment Report (AR6)" },
    verificationStatus: "verified",
    confidence: 0.99,
    version: 1
  },

  // ==================== 21. ART ====================
  {
    id: "k_art_colortheory_001",
    title: "What is Color Theory?",
    domain: "art",
    topic: "color-theory",
    questionPatterns: [
      "What is color theory?",
      "Define color theory",
      "Explain primary, secondary, and tertiary colors",
      "What are complementary colors?"
    ],
    answer: "Color Theory is a practical body of guidance to color mixing and the visual effects of specific color combinations. In traditional subtractive color theory (pigments), the primary colors are red, yellow, and blue (RYB). Secondary colors (green, orange, purple) are created by mixing primaries. Complementary colors sit directly opposite each other on the color wheel (e.g. blue and orange) and create high visual contrast when placed side by side.",
    keywords: ["color theory", "color wheel", "primary colors", "secondary colors", "complementary colors", "pigment", "art"],
    synonyms: ["principles of color"],
    entities: ["color_theory", "color_wheel"],
    relationships: [
      { source: "color_theory", relation: "USES", target: "color_wheel" }
    ],
    language: "en",
    source: { type: "curated", reference: "Itten, The Art of Color" },
    verificationStatus: "verified",
    confidence: 0.98,
    version: 1
  },

  // ==================== 22. MUSIC ====================
  {
    id: "k_mus_theory_001",
    title: "What are musical scales and intervals?",
    domain: "music",
    topic: "music-theory",
    questionPatterns: [
      "What is a musical scale?",
      "Define musical scale",
      "Explain major and minor scales",
      "What is an octave and semitone?"
    ],
    answer: "A musical scale is any set of musical notes ordered by fundamental frequency or pitch. The Western musical tradition divides an octave (a 2:1 frequency ratio) into 12 semitones (half steps). The Major Scale follows the interval pattern Whole-Whole-Half-Whole-Whole-Whole-Half (W-W-H-W-W-W-H), producing a bright, resolved sound, while Natural Minor scales follow (W-H-W-W-H-W-W), imparting a somber emotional tonal color.",
    keywords: ["musical scale", "music theory", "octave", "semitone", "major scale", "minor scale", "pitch"],
    synonyms: ["music scales", "diatonic scale"],
    entities: ["musical_scale", "music_theory"],
    relationships: [
      { source: "musical_scale", relation: "PART_OF", target: "music_theory" }
    ],
    language: "en",
    source: { type: "curated", reference: "The Harvard Dictionary of Music" },
    verificationStatus: "verified",
    confidence: 0.99,
    version: 1
  },

  // ==================== 23. LANGUAGES ====================
  {
    id: "k_lang_indo_001",
    title: "What is the Indo-European Language Family?",
    domain: "languages",
    topic: "historical-linguistics",
    questionPatterns: [
      "What is the Indo-European language family?",
      "Explain Indo-European languages",
      "Which languages belong to the Indo-European family?",
      "Define language family"
    ],
    answer: "The Indo-European language family is a major language family that includes most of the languages of Europe, the Iranian plateau, and the northern Indian subcontinent. With over 3.2 billion native speakers, it encompasses Germanic (English, German, Dutch), Romance (Spanish, French, Italian, Portuguese), Indo-Aryan (Hindi, Bengali, Punjabi), Slavic (Russian, Polish, Ukrainian), and Celtic branches, all descended from Proto-Indo-European (PIE).",
    keywords: ["indo-european", "language family", "linguistics", "germanic", "romance", "slavic", "proto-indo-european"],
    synonyms: ["indo-european languages"],
    entities: ["indo_european", "linguistics"],
    relationships: [
      { source: "indo_european", relation: "IS_A", target: "language_family" }
    ],
    language: "en",
    source: { type: "curated", reference: "Mallory & Adams, Oxford Introduction to Proto-Indo-European" },
    verificationStatus: "verified",
    confidence: 0.99,
    version: 1
  },

  // ==================== 24. GENERAL KNOWLEDGE ====================
  {
    id: "k_gen_si_001",
    title: "What are the International System of Units (SI Units)?",
    domain: "general-knowledge",
    topic: "measurement-standards",
    questionPatterns: [
      "What are the SI units?",
      "Explain the International System of Units",
      "What are the 7 base SI units?",
      "Define SI units"
    ],
    answer: "The International System of Units (SI, from the French Système international d'unités) is the globally adopted metric system of physical measurement. It defines seven fundamental base units: 1) Second (s) for time; 2) Meter (m) for length; 3) Kilogram (kg) for mass; 4) Ampere (A) for electric current; 5) Kelvin (K) for thermodynamic temperature; 6) Mole (mol) for amount of substance; and 7) Candela (cd) for luminous intensity. All other physical units (such as Joules, Newtons, Volts, and Watts) are derived mathematically from these seven.",
    keywords: ["si units", "metric system", "international system of units", "meter", "kilogram", "second", "ampere", "kelvin", "mole", "candela"],
    synonyms: ["metric system units", "base si units"],
    entities: ["si_units", "measurement_standard"],
    relationships: [
      { source: "si_units", relation: "IS_A", target: "measurement_standard" }
    ],
    language: "en",
    source: { type: "curated", reference: "BIPM (Bureau International des Poids et Mesures) SI Brochure" },
    verificationStatus: "verified",
    confidence: 1.0,
    version: 1
  }
];

// Combine existing seed data with comprehensive records
function generate() {
  const initialPath = path.join(SEEDS_DIR, 'initialKnowledge.json');
  let existing = [];
  if (fs.existsSync(initialPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(initialPath, 'utf8'));
    } catch (_) {}
  }

  const existingIds = new Set(existing.map(d => d.id));
  const merged = [...existing];

  let addedCount = 0;
  for (const rec of records) {
    if (!existingIds.has(rec.id)) {
      merged.push(rec);
      existingIds.add(rec.id);
      addedCount++;
    }
  }

  // Write massive combined dataset
  fs.writeFileSync(initialPath, JSON.stringify(merged, null, 2), 'utf8');
  console.log(`[Seed Generator] Merged ${addedCount} new records into initialKnowledge.json (Total: ${merged.length} records across all 24 domains).`);

  // Also write standalone massiveKnowledge.json for reference and import benchmarks
  const massivePath = path.join(SEEDS_DIR, 'massiveKnowledge.json');
  fs.writeFileSync(massivePath, JSON.stringify(merged, null, 2), 'utf8');
  console.log(`[Seed Generator] Written massiveKnowledge.json successfully.`);
}

generate();
