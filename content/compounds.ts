import { z } from "zod";
import { Compound } from "@/lib/types";
import type { Compound as TCompound } from "@/lib/types";

/**
 * Curated catalog seed data. Every claim is graded honestly against the cited
 * literature. Citations are real (PubMed / DOI). Where human evidence is thin,
 * evidenceLevel is "limited"/"anecdotal" so the UI auto-renders a disclaimer and
 * labels any testimonials as anecdotal.
 *
 * Vendors are intentionally empty: the user fills in sellers THEY trust, along
 * with each product's Certificate of Analysis (COA) link.
 */
const RAW: z.input<typeof Compound>[] = [
  {
    id: "creatine-monohydrate",
    name: "Creatine Monohydrate",
    effects: {
      onset: "Stores fill in ~1 week (loading) or ~3–4 weeks (steady dose)",
      whatToExpect: [
        "Small but real gains in strength, power, and reps at high intensity.",
        "A few pounds of scale weight from water drawn into muscle — not fat.",
        "Best paired with resistance training; effects are gradual, not a 'buzz'.",
        "One of the safest, most-studied supplements; side effects are minimal.",
      ],
    },
    reportedExperiences: [
      {
        theme: "Strength & fullness",
        sentiment: "positive",
        summary:
          "Users widely report better gym performance and fuller-looking muscles within a few weeks — matching the strong evidence.",
      },
      {
        theme: "Water weight & stomach",
        sentiment: "mixed",
        summary:
          "Some dislike the early scale bump or get mild stomach upset when loading; splitting doses usually fixes it.",
      },
    ],
    aka: ["Creatine"],
    category: "supplement",
    summary:
      "The most-studied sports supplement; reliably improves strength and muscle when paired with resistance training.",
    mechanism:
      "Increases phosphocreatine stores in muscle, letting cells regenerate ATP faster during short, intense efforts. Also draws water into muscle cells and may support training volume over time.",
    benefits: [
      "Small but consistent gains in strength and muscle hypertrophy alongside resistance training",
      "Improved performance in short, high-intensity and repeated-sprint efforts",
      "Emerging (less certain) research on cognition and recovery",
    ],
    sideEffects: [
      "Water retention / small scale-weight increase early on",
      "GI discomfort at large single doses (mitigated by splitting doses)",
    ],
    contraindications: [
      "Talk to a doctor first if you have kidney disease or reduced kidney function",
    ],
    dosingNotes:
      "Common evidence-based approach: 3–5 g per day of creatine monohydrate, taken consistently. An optional loading phase (~20 g/day split into 4 doses for 5–7 days) saturates stores faster but is not required.",
    goals: ["muscle", "strength", "performance"],
    evidenceLevel: "strong",
    citations: [
      {
        title:
          "The Effects of Creatine Supplementation Combined with Resistance Training on Regional Measures of Muscle Hypertrophy: A Systematic Review with Meta-Analysis",
        authors: "Burke R, et al.",
        year: 2023,
        journal: "Nutrients",
        url: "https://doi.org/10.3390/nu15092116",
        pmid: "37432300",
        doi: "10.3390/nu15092116",
      },
    ],
    disclaimers: [],
    testimonials: [],  },
  {
    id: "l-theanine",
    name: "L-Theanine",
    effects: {
      onset: "Calm focus within 30–60 minutes",
      whatToExpect: [
        "A gentle 'relaxed alertness' — takes the edge off without sedating you.",
        "Pairs especially well with caffeine to blunt jitters and smooth focus.",
        "Effects are subtle; don't expect a strong or obvious hit.",
        "Very well tolerated with a clean safety profile.",
      ],
    },
    reportedExperiences: [
      {
        theme: "Calm focus",
        sentiment: "positive",
        summary:
          "Users commonly report smoother, calmer focus — especially stacked with coffee to reduce jitteriness.",
      },
      {
        theme: "Subtlety",
        sentiment: "mixed",
        summary:
          "Because it's gentle, some feel little on its own and only notice it alongside caffeine.",
      },
    ],
    aka: ["Theanine"],
    category: "supplement",
    summary:
      "An amino acid from tea associated with calm focus; small human trials suggest reduced stress and better sleep quality.",
    mechanism:
      "Modulates alpha brain-wave activity and neurotransmitters (GABA, glutamate, dopamine/serotonin), which is thought to promote relaxation without sedation. Often paired with caffeine to smooth its stimulation.",
    benefits: [
      "Reduced self-reported stress and anxiety symptoms in small trials",
      "Improvements in sleep quality and some cognitive measures",
      "Commonly stacked with caffeine for 'calm alertness'",
    ],
    sideEffects: [
      "Generally well tolerated; occasional headache or drowsiness reported",
    ],
    contraindications: [
      "Check with a clinician if you take medication for blood pressure or anxiety",
    ],
    dosingNotes:
      "Trials commonly use ~200 mg/day. When combined with caffeine, ~100–200 mg theanine per ~50–100 mg caffeine is typical in the literature.",
    goals: ["focus", "sleep", "stress"],
    evidenceLevel: "moderate",
    citations: [
      {
        title:
          "Effects of L-Theanine Administration on Stress-Related Symptoms and Cognitive Functions in Healthy Adults: A Randomized Controlled Trial",
        authors: "Hidese S, et al.",
        year: 2019,
        journal: "Nutrients",
        url: "https://doi.org/10.3390/nu11102362",
        pmid: "31623400",
        doi: "10.3390/nu11102362",
      },
    ],
    disclaimers: [
      "Human trials are small and short. Effects are modest and vary between people.",
    ],
    testimonials: [],  },
  {
    id: "magnesium-glycinate",
    name: "Magnesium Glycinate",
    effects: {
      onset: "Relaxation same-night; fuller benefit over days–weeks",
      whatToExpect: [
        "Many report easier wind-down and better sleep quality, taken in the evening.",
        "The glycinate form is gentle on the gut — less laxative effect than oxide/citrate.",
        "Biggest benefit if your intake is low; effects are calming, not sedating.",
        "Muscle-cramp and stress relief are commonly reported.",
      ],
    },
    reportedExperiences: [
      {
        theme: "Sleep & relaxation",
        sentiment: "positive",
        summary:
          "The most common report is calmer evenings and improved sleep quality, without morning grogginess.",
      },
      {
        theme: "Digestive tolerance",
        sentiment: "mixed",
        summary:
          "Glycinate is usually gentle, but very high doses can still loosen stools for some people.",
      },
    ],
    aka: ["Magnesium bisglycinate"],
    category: "supplement",
    summary:
      "A well-absorbed, gentle-on-the-gut form of magnesium taken for sleep, relaxation, and correcting low magnesium intake.",
    mechanism:
      "Magnesium is a cofactor in hundreds of enzymatic reactions, including those regulating the nervous system and muscle relaxation. The glycinate form is chelated to the amino acid glycine, improving absorption and reducing the laxative effect seen with cheaper forms.",
    benefits: [
      "Helps meet daily magnesium needs (many people fall short)",
      "Associated with improved sleep quality in some randomized trials of magnesium",
      "Less GI upset than magnesium oxide/citrate",
    ],
    sideEffects: [
      "High doses can cause loose stools",
      "Excess is a risk in kidney impairment (magnesium is cleared by the kidneys)",
    ],
    contraindications: [
      "Avoid or seek medical guidance with significant kidney disease",
      "Can interact with certain antibiotics and other medications — check with a pharmacist",
    ],
    dosingNotes:
      "Elemental magnesium in the ~200–400 mg/day range is common (stay within the tolerable upper intake for supplemental magnesium, 350 mg/day, unless directed by a clinician). Taken in the evening when used for sleep.",
    goals: ["sleep", "recovery", "stress"],
    evidenceLevel: "moderate",
    citations: [
      {
        title:
          "Magnesium-L-threonate improves sleep quality and daytime functioning in adults with self-reported sleep problems: A randomized controlled trial",
        authors: "Hausenblas HA, et al.",
        year: 2024,
        journal: "Sleep Medicine: X",
        url: "https://doi.org/10.1016/j.sleepx.2024.100121",
        pmid: "39252819",
        doi: "10.1016/j.sleepx.2024.100121",
      },
    ],
    disclaimers: [
      "Sleep evidence is strongest for magnesium generally and specific forms like L-threonate; direct randomized trials of the glycinate form specifically are limited.",
    ],
    testimonials: [],  },
  {
    id: "bpc-157",
    name: "BPC-157",
    effects: {
      onset: "No acute 'feel'; recovery effects reported over days to weeks",
      duration: "Users typically run 2–6 week courses",
      whatToExpect: [
        "No immediate sensation — it is not a stimulant or painkiller; any effect is gradual.",
        "Most commonly reported around soft-tissue and tendon/ligament recovery.",
        "Some report gut/digestive comfort; injectable use may cause mild injection-site irritation.",
        "Effects are unproven in humans — expectations come from animal data and user reports.",
      ],
    },
    reportedExperiences: [
      {
        theme: "Tendon & soft-tissue recovery",
        sentiment: "positive",
        summary:
          "The most common report is faster recovery from nagging tendon, ligament, or muscle injuries. These are uncontrolled personal accounts with no human trials behind them.",
      },
      {
        theme: "Gut & digestion",
        sentiment: "mixed",
        summary:
          "Some users describe relief from reflux or IBS-type symptoms; others notice nothing. Oral absorption is debated, so oral vs injectable results vary widely.",
      },
      {
        theme: "Tolerability",
        sentiment: "mixed",
        summary:
          "Generally described as well tolerated, with occasional injection-site redness or fatigue. Long-term safety is simply unknown.",
      },
    ],
    vendors: [
      {
        name: "SwissChems",
        url: "https://swisschems.is",
        pricingModel: "retail",
        pricesCheckedAt: "2026-07",
        products: [{ label: "0.5 mg/capsule × 60 capsules", price: 85.95, currency: "USD" }],
      },
      {
        name: "algo.rx",
        url: "https://algorx.ai",
        pricingModel: "clinician-gated",
        notes: "Telehealth labs + clinician-directed protocols via licensed US pharmacies.",
      },
    ],
    aka: ["Body Protection Compound 157", "Pentadecapeptide BPC 157"],
    category: "peptide",
    summary:
      "A synthetic peptide widely discussed for tendon, ligament, and gut healing — but human evidence does not yet exist.",
    mechanism:
      "In animal and in-vitro studies, BPC-157 appears to promote angiogenesis (new blood vessel growth) and modulate growth-factor pathways involved in soft-tissue repair. How—or whether—this translates to humans is unknown.",
    benefits: [
      "Accelerated soft-tissue (tendon, ligament, muscle) healing in rodent models",
      "Gut-protective and anti-inflammatory effects reported in animals",
    ],
    sideEffects: [
      "Human safety profile is not established",
      "As an unapproved research chemical, product identity and purity are unverified without a COA",
    ],
    contraindications: [
      "Not approved for human use in most jurisdictions",
      "Do not use without medical supervision; legality varies by country",
    ],
    dosingNotes:
      "There are NO established human dosing guidelines. Figures circulated online are extrapolated from animal studies and are not validated for safety or effectiveness in people.",
    goals: ["recovery", "injury", "gut"],
    evidenceLevel: "limited",
    citations: [
      {
        title: "Stable Gastric Pentadecapeptide BPC 157 and Wound Healing",
        authors: "Seiwerth S, et al.",
        year: 2021,
        journal: "Frontiers in Pharmacology",
        url: "https://doi.org/10.3389/fphar.2021.627533",
        pmid: "34267654",
        doi: "10.3389/fphar.2021.627533",
      },
      {
        title:
          "Gastric pentadecapeptide body protection compound BPC 157 and its role in accelerating musculoskeletal soft tissue healing",
        authors: "Gwyer D, Wragg NM, Wilson SL",
        year: 2019,
        journal: "Cell and Tissue Research",
        url: "https://doi.org/10.1007/s00441-019-03016-8",
        pmid: "30915550",
        doi: "10.1007/s00441-019-03016-8",
      },
    ],
    disclaimers: [
      "Essentially all evidence is from rodent studies. Efficacy and safety in humans have not been demonstrated in controlled trials.",
      "BPC-157 is not an approved drug or dietary supplement in most countries.",
    ],
    testimonials: [
      {
        text: "Anecdotal reports online describe faster recovery from tendon injuries, but these are uncontrolled personal accounts, not evidence.",
        source: "Aggregated user reports",
        disclaimerFlag: true,
      },
    ],  },
  {
    id: "caffeine",
    name: "Caffeine",
    effects: {
      onset: "Alertness within 20–60 minutes; lasts 3–6 hours",
      whatToExpect: [
        "Increased alertness, energy, and endurance/strength performance.",
        "Jitters, anxiety, or a racing heart at higher doses or if sensitive.",
        "Sleep disruption if taken too late; tolerance builds with daily use.",
        "A 'crash' and, with regular use, withdrawal headaches when skipped.",
      ],
    },
    reportedExperiences: [
      {
        theme: "Energy & performance",
        sentiment: "positive",
        summary:
          "Near-universally reported boost in focus, energy, and training performance — one of the best-supported ergogenic aids.",
      },
      {
        theme: "Jitters & sleep",
        sentiment: "mixed",
        summary:
          "Higher doses or late timing bring jitters, anxiety, and wrecked sleep for many — dose and timing are everything.",
      },
      {
        theme: "Dependence",
        sentiment: "negative",
        summary:
          "Regular users report tolerance and withdrawal headaches, needing more for the same effect over time.",
      },
    ],
    aka: ["1,3,7-trimethylxanthine"],
    category: "supplement",
    summary:
      "The world's most-used stimulant; a well-established ergogenic aid for endurance and alertness.",
    mechanism:
      "Blocks adenosine receptors in the brain, reducing perceived effort and fatigue and increasing alertness. Also mobilizes catecholamines.",
    benefits: [
      "Small but reliable improvements in endurance performance at moderate doses",
      "Increased alertness, focus, and reaction time",
      "Reduced perception of effort during exercise",
    ],
    sideEffects: [
      "Jitteriness, anxiety, and raised heart rate at higher doses",
      "Sleep disruption if taken too late in the day",
      "Tolerance and withdrawal headaches with regular use",
    ],
    contraindications: [
      "Use caution with heart arrhythmias, anxiety disorders, pregnancy, and certain medications",
    ],
    dosingNotes:
      "Ergogenic effects are typically seen at 3–6 mg/kg body weight ~60 minutes before exercise. Keep total daily intake moderate (commonly cited as up to ~400 mg/day for healthy adults) and avoid late-day dosing.",
    goals: ["focus", "performance", "energy"],
    evidenceLevel: "strong",
    citations: [
      {
        title:
          "The Effect of Acute Caffeine Ingestion on Endurance Performance: A Systematic Review and Meta-Analysis",
        authors: "Southward K, Rutherfurd-Markwick KJ, Ali A",
        year: 2018,
        journal: "Sports Medicine",
        url: "https://doi.org/10.1007/s40279-018-0939-8",
        pmid: "29876876",
        doi: "10.1007/s40279-018-0939-8",
      },
    ],
    disclaimers: [],
    testimonials: [],  },
  {
    id: "beta-alanine",
    name: "Beta-Alanine",
    effects: {
      onset: "Endurance benefit builds over 2–4 weeks of daily use",
      whatToExpect: [
        "Better muscular endurance in efforts lasting roughly 1–4 minutes.",
        "A harmless skin tingling (paresthesia) soon after dosing — normal, not dangerous.",
        "Requires consistent daily intake to saturate muscle carnosine; not acute.",
        "No stimulant effect — it won't make you feel energized.",
      ],
    },
    reportedExperiences: [
      {
        theme: "Muscular endurance",
        sentiment: "positive",
        summary:
          "Users report squeezing out extra reps and better high-rep/interval endurance after a few weeks of consistent use.",
      },
      {
        theme: "Tingling",
        sentiment: "mixed",
        summary:
          "The skin tingle is either fun or annoying depending on the person; splitting doses reduces it.",
      },
    ],
    aka: ["β-alanine"],
    category: "supplement",
    summary:
      "An amino acid that buffers muscle acidity; modestly improves high-intensity efforts lasting 1–10 minutes.",
    mechanism:
      "Raises muscle carnosine, which buffers hydrogen ions produced during intense exercise, delaying fatigue in the 1–10 minute effort range.",
    benefits: [
      "Small but significant performance benefit for exercise lasting ~30 s to 10 min",
      "May increase training volume over time",
    ],
    sideEffects: [
      "Harmless tingling (paraesthesia) at larger single doses — reduced by splitting doses",
    ],
    contraindications: [],
    dosingNotes:
      "Trials commonly use ~3.2–6.4 g/day, split into smaller doses to limit tingling, taken consistently for several weeks to build muscle carnosine.",
    goals: ["performance", "endurance"],
    evidenceLevel: "strong",
    citations: [
      {
        title:
          "β-alanine supplementation to improve exercise capacity and performance: a systematic review and meta-analysis",
        authors: "Saunders B, et al.",
        year: 2017,
        journal: "British Journal of Sports Medicine",
        url: "https://doi.org/10.1136/bjsports-2016-096396",
        pmid: "27797728",
        doi: "10.1136/bjsports-2016-096396",
      },
    ],
    disclaimers: [],
    testimonials: [],  },
  {
    id: "vitamin-d3",
    name: "Vitamin D3",
    effects: {
      onset: "Blood levels rise over weeks; no acute sensation",
      whatToExpect: [
        "No immediate feeling — it corrects a deficiency rather than giving a 'boost'.",
        "If you were low, people report better mood, energy, and fewer sick days over time.",
        "If your levels are already normal, expect little to no noticeable change.",
        "Supports bone health and immune function; best dosed with a meal containing fat.",
      ],
    },
    reportedExperiences: [
      {
        theme: "Correcting a deficiency",
        sentiment: "positive",
        summary:
          "Those who were deficient often report improved mood and energy after a few weeks — the clearest benefit.",
      },
      {
        theme: "Already sufficient",
        sentiment: "mixed",
        summary:
          "People with normal levels typically notice nothing, which is expected — more isn't better past sufficiency.",
      },
    ],
    aka: ["Cholecalciferol"],
    category: "supplement",
    summary:
      "The most effective form for raising blood vitamin D; important for correcting deficiency, with broader health claims still mixed.",
    mechanism:
      "A fat-soluble prohormone converted in the body to calcitriol, which regulates calcium absorption, bone metabolism, and immune signaling.",
    benefits: [
      "Reliably raises serum 25-hydroxyvitamin D (more effective than D2)",
      "Supports bone health and corrects deficiency",
      "Broader claims (immunity, mood) are plausible but less certain",
    ],
    sideEffects: [
      "Very high chronic doses can cause toxicity (hypercalcemia)",
    ],
    contraindications: [
      "Do not megadose without testing; talk to a clinician if you have high calcium, kidney stones, or sarcoidosis",
    ],
    dosingNotes:
      "Typical maintenance supplementation is ~1000–2000 IU/day, adjusted to blood levels. Deficiency correction should be guided by testing and a clinician.",
    goals: ["bone", "immune", "general"],
    evidenceLevel: "moderate",
    citations: [
      {
        title:
          "Comparison of vitamin D2 and vitamin D3 supplementation in raising serum 25-hydroxyvitamin D status: a systematic review and meta-analysis",
        authors: "Tripkovic L, et al.",
        year: 2012,
        journal: "American Journal of Clinical Nutrition",
        url: "https://doi.org/10.3945/ajcn.111.031070",
        pmid: "22552031",
        doi: "10.3945/ajcn.111.031070",
      },
    ],
    disclaimers: [
      "Evidence is strong for raising blood levels and treating deficiency, but weaker and mixed for many downstream health outcomes.",
    ],
    testimonials: [],  },
  {
    id: "omega-3-fish-oil",
    name: "Omega-3 (Fish Oil)",
    effects: {
      onset: "Blood markers shift over weeks; no acute feel",
      whatToExpect: [
        "No immediate sensation — benefits are cardiovascular and anti-inflammatory over time.",
        "Can lower triglycerides; some report easier joints and steadier mood.",
        "Fishy burps or aftertaste are the most common complaint (enteric-coated helps).",
        "Quality varies — look for verified EPA/DHA content and freshness.",
      ],
    },
    reportedExperiences: [
      {
        theme: "Joints & mood",
        sentiment: "positive",
        summary:
          "Users commonly report less joint stiffness and steadier mood with consistent use over weeks.",
      },
      {
        theme: "Fishy aftertaste",
        sentiment: "mixed",
        summary:
          "The recurring gripe is fishy burps; freezing capsules or choosing enteric-coated versions usually helps.",
      },
    ],
    aka: ["EPA/DHA", "Long-chain omega-3"],
    category: "supplement",
    summary:
      "Long-chain omega-3 fats that reliably lower triglycerides, with smaller and less certain effects on heart outcomes.",
    mechanism:
      "EPA and DHA incorporate into cell membranes and influence lipid metabolism and inflammatory signaling. Their clearest effect is lowering blood triglycerides.",
    benefits: [
      "Dose-dependent reduction in triglycerides (~15%) — high-certainty evidence",
      "May slightly reduce coronary heart disease events/mortality (low-certainty)",
    ],
    sideEffects: [
      "Fishy aftertaste, burping, mild GI upset",
      "Very high doses can affect bleeding time",
    ],
    contraindications: [
      "Discuss with a clinician if you take blood thinners or have a bleeding disorder",
    ],
    dosingNotes:
      "Triglyceride-lowering trials often use higher doses (some ≥3 g/day EPA+DHA). General supplementation is commonly ~1 g/day combined EPA+DHA. Follow product labeling and clinician guidance.",
    goals: ["heart", "inflammation", "general"],
    evidenceLevel: "moderate",
    citations: [
      {
        title: "Omega-3 fatty acids for the primary and secondary prevention of cardiovascular disease",
        authors: "Abdelhamid AS, et al. (Cochrane)",
        year: 2020,
        journal: "Cochrane Database of Systematic Reviews",
        url: "https://doi.org/10.1002/14651858.CD003177.pub5",
        pmid: "32114706",
        doi: "10.1002/14651858.CD003177.pub5",
      },
    ],
    disclaimers: [
      "A large Cochrane review found little or no effect of omega-3 supplements on overall cardiovascular mortality; the clearest benefit is lowering triglycerides.",
    ],
    testimonials: [],  },
  {
    id: "ashwagandha",
    name: "Ashwagandha",
    effects: {
      onset: "Stress/sleep benefits build over 2–4 weeks",
      whatToExpect: [
        "Many report feeling calmer and less reactive to stress over a few weeks.",
        "Improved sleep is common; some feel a mild sedation or 'flatness'.",
        "Occasional stomach upset; a few report reduced anxiety and better workouts.",
        "Effects are gradual — it's not an acute calming dose like a sedative.",
      ],
    },
    reportedExperiences: [
      {
        theme: "Stress & sleep",
        sentiment: "positive",
        summary:
          "The most common report is feeling calmer and sleeping better after a few weeks of daily use.",
      },
      {
        theme: "Blunted mood / sedation",
        sentiment: "mixed",
        summary:
          "A minority report feeling emotionally 'flat' or overly sedated and prefer to cycle off.",
      },
      {
        theme: "Liver caution",
        sentiment: "negative",
        summary:
          "Rare case reports of liver issues exist, so it's worth stopping and checking if you feel unwell.",
      },
    ],
    aka: ["Withania somnifera"],
    category: "supplement",
    summary:
      "An adaptogenic herb with meta-analytic support for reducing stress and anxiety, though evidence certainty is low.",
    mechanism:
      "Contains withanolides thought to modulate the stress (HPA-axis) response and cortisol, though the exact mechanisms in humans are not fully established.",
    benefits: [
      "Reduced self-reported stress and anxiety in pooled randomized trials",
      "Some reports of improved sleep",
    ],
    sideEffects: [
      "GI upset, drowsiness",
      "Rare reports of liver injury",
    ],
    contraindications: [
      "Avoid in pregnancy; caution with thyroid conditions, autoimmune disease, or sedative medications",
    ],
    dosingNotes:
      "Meta-analysis suggests benefits for stress around 300–600 mg/day of standardized extract. Effects and extract standardization vary between products.",
    goals: ["stress", "sleep"],
    evidenceLevel: "moderate",
    citations: [
      {
        title:
          "Does Ashwagandha supplementation have a beneficial effect on the management of anxiety and stress? A systematic review and meta-analysis of randomized controlled trials",
        authors: "Akhgarjand C, et al.",
        year: 2022,
        journal: "Phytotherapy Research",
        url: "https://doi.org/10.1002/ptr.7598",
        pmid: "36017529",
        doi: "10.1002/ptr.7598",
      },
    ],
    disclaimers: [
      "The meta-analysis rated the certainty of evidence as low, with variability between studies and products.",
    ],
    testimonials: [],  },
  {
    id: "melatonin",
    name: "Melatonin",
    effects: {
      onset: "Sleepiness within 30–60 minutes",
      whatToExpect: [
        "A signal to your body that it's night — helps you fall asleep faster, especially off-schedule.",
        "Most useful for jet lag or a shifted sleep schedule, less so for staying asleep.",
        "Too high a dose can cause grogginess, vivid dreams, or next-day fogginess.",
        "Low doses (0.5–1 mg) often work as well as high ones with fewer side effects.",
      ],
    },
    reportedExperiences: [
      {
        theme: "Falling asleep / jet lag",
        sentiment: "positive",
        summary:
          "Users commonly report falling asleep faster and easier adjustment to new time zones.",
      },
      {
        theme: "Grogginess & dreams",
        sentiment: "mixed",
        summary:
          "Higher doses bring morning grogginess and intense dreams for many — lowering the dose usually fixes it.",
      },
    ],
    aka: ["N-acetyl-5-methoxytryptamine"],
    category: "supplement",
    summary:
      "A hormone that signals darkness to the body; modestly shortens time to fall asleep and helps reset sleep timing.",
    mechanism:
      "Binds melatonin receptors involved in circadian timing, signaling 'night' to the brain and promoting sleep onset. Especially useful for shifted sleep schedules and jet lag.",
    benefits: [
      "Reduces time to fall asleep (sleep latency) — modest effect",
      "Small improvements in total sleep time and sleep quality",
      "Useful for jet lag and circadian rhythm disruption",
    ],
    sideEffects: [
      "Grogginess, vivid dreams, headache",
      "Higher doses are not necessarily better and may cause next-day drowsiness",
    ],
    contraindications: [
      "Discuss with a clinician for children, pregnancy, or if on sedatives/anticoagulants",
    ],
    dosingNotes:
      "Trials often use low doses (~0.5–5 mg) taken 30–60 minutes before the desired bedtime. Lower doses are frequently as effective as higher ones for sleep onset.",
    goals: ["sleep"],
    evidenceLevel: "moderate",
    citations: [
      {
        title: "Meta-analysis: melatonin for the treatment of primary sleep disorders",
        authors: "Ferracioli-Oda E, Qawasmi A, Bloch MH",
        year: 2013,
        journal: "PLoS ONE",
        url: "https://doi.org/10.1371/journal.pone.0063773",
        pmid: "23691095",
        doi: "10.1371/journal.pone.0063773",
      },
    ],
    disclaimers: [
      "Effects on sleep are real but modest — smaller than prescription sleep medications, though with a more benign side-effect profile.",
    ],
    testimonials: [],  },
  {
    id: "semaglutide",
    name: "Semaglutide",
    effects: {
      onset: "Reduced appetite within days; weight loss over weeks–months",
      whatToExpect: [
        "A strong drop in appetite and 'food noise'; you feel full sooner and eat less.",
        "Nausea is common, especially when the dose is increased — usually eases with time.",
        "Other GI effects: constipation, reflux, occasional vomiting or diarrhea.",
        "Weight loss is gradual and dose-dependent; regain is common if stopped abruptly.",
      ],
    },
    reportedExperiences: [
      {
        theme: "Appetite & weight",
        sentiment: "positive",
        summary:
          "Overwhelmingly, users report dramatically reduced appetite and steady weight loss — consistent with the strong trial evidence.",
      },
      {
        theme: "GI side effects",
        sentiment: "mixed",
        summary:
          "Nausea, constipation, and reflux are widely reported, worst during dose increases. Most tolerate it; some stop because of it.",
      },
      {
        theme: "Muscle loss & rebound",
        sentiment: "negative",
        summary:
          "A common regret is losing muscle along with fat and regaining weight after stopping — which is why clinicians pair it with protein, training, and a plan.",
      },
    ],
    vendors: [
      {
        name: "Enhanced",
        url: "https://www.enhanced.com",
        pricingModel: "clinician-gated",
        notes:
          "Clinician-guided GLP-1 via licensed US pharmacies after a medical evaluation — a legal, monitored route.",
      },
      {
        name: "algo.rx",
        url: "https://algorx.ai",
        pricingModel: "clinician-gated",
        notes: "Telehealth weight-management protocols with labs and clinician oversight.",
      },
    ],
    aka: ["Ozempic", "Wegovy", "GLP-1 receptor agonist"],
    category: "peptide",
    summary:
      "A prescription GLP-1 peptide medication with strong trial evidence for weight loss and blood-sugar control.",
    mechanism:
      "Mimics the gut hormone GLP-1: enhances insulin secretion, slows gastric emptying, and reduces appetite by acting on brain satiety centers.",
    benefits: [
      "Substantial, sustained weight loss in large randomized trials (STEP program)",
      "Improved blood-sugar control in type 2 diabetes",
    ],
    sideEffects: [
      "Common GI effects: nausea, vomiting, diarrhea, constipation",
      "Rare but serious risks (e.g. pancreatitis, gallbladder issues); boxed warning for thyroid C-cell tumors based on animal data",
    ],
    contraindications: [
      "Prescription-only medication — must be supervised by a clinician",
      "Contraindicated with personal/family history of medullary thyroid carcinoma or MEN 2",
    ],
    dosingNotes:
      "Administered as a once-weekly subcutaneous injection, titrated up gradually by a prescriber (e.g. STEP trials reached a 2.4 mg/week maintenance dose). Dosing must be individualized and medically supervised — do not self-dose.",
    goals: ["weight", "metabolic"],
    evidenceLevel: "strong",
    citations: [
      {
        title:
          "Effect of Continued Weekly Subcutaneous Semaglutide vs Placebo on Weight Loss Maintenance in Adults With Overweight or Obesity: The STEP 4 Randomized Clinical Trial",
        authors: "Rubino D, et al.",
        year: 2021,
        journal: "JAMA",
        url: "https://doi.org/10.1001/jama.2021.3224",
        pmid: "33755728",
        doi: "10.1001/jama.2021.3224",
      },
    ],
    disclaimers: [
      "This is a prescription medication, not a dietary supplement. Obtaining or using it without medical supervision is unsafe and, in many places, illegal.",
    ],
    testimonials: [],  },
  {
    id: "tb-500",
    name: "TB-500 (Thymosin β4)",
    effects: {
      onset: "No acute effect; recovery reports build over 2–4 weeks",
      whatToExpect: [
        "No immediate sensation — reported effects are gradual and systemic, not localized.",
        "Most reports center on recovery, flexibility, and reduced stiffness.",
        "Frequently stacked with BPC-157; no human trials support either use.",
        "Any benefit is unproven in humans and rests on animal models and user reports.",
      ],
    },
    reportedExperiences: [
      {
        theme: "Recovery & mobility",
        sentiment: "positive",
        summary:
          "Users commonly report improved recovery and joint/muscle mobility, often alongside BPC-157. Uncontrolled anecdotes only.",
      },
      {
        theme: "Evidence gap",
        sentiment: "negative",
        summary:
          "Experienced users and clinicians note there are no human efficacy trials, so 'results' can't be separated from rest, placebo, or the stacked compounds.",
      },
    ],
    vendors: [
      {
        name: "SwissChems",
        url: "https://swisschems.is",
        pricingModel: "retail",
        pricesCheckedAt: "2026-07",
        products: [
          { label: "BPC-157 + TB-500 blend (from)", price: 119.95, currency: "USD" },
        ],
        notes: "Sold mainly as a BPC-157 + TB-500 blend; check the site for standalone options.",
      },
    ],
    aka: ["Thymosin beta-4", "Tβ4"],
    category: "peptide",
    summary:
      "A regenerative peptide studied for tissue repair — biologically interesting, but human efficacy for athletic use is unproven.",
    mechanism:
      "Thymosin β4 binds actin and promotes cell migration, angiogenesis, and reduced scarring in injury models. TB-500 is a related synthetic fragment marketed for recovery.",
    benefits: [
      "Promotes tissue repair, angiogenesis, and reduced fibrosis in laboratory and animal studies",
      "Early-stage clinical research in wound and corneal healing",
    ],
    sideEffects: [
      "Human safety profile for performance/recovery use is not established",
      "As an unapproved research chemical, identity and purity are unverified without a COA",
    ],
    contraindications: [
      "Not an approved drug for athletic recovery; banned in sport by WADA",
      "Do not use without medical supervision; legality varies by country",
    ],
    dosingNotes:
      "There are NO validated human dosing guidelines for recovery/performance use. Protocols circulated online are not backed by controlled human trials.",
    goals: ["recovery", "injury"],
    evidenceLevel: "limited",
    citations: [
      {
        title:
          "Thymosin β4: a multi-functional regenerative peptide. Basic properties and clinical applications",
        authors: "Goldstein AL, Hannappel E, Sosne G, Kleinman HK",
        year: 2011,
        journal: "Expert Opinion on Biological Therapy",
        url: "https://doi.org/10.1517/14712598.2012.634793",
        pmid: "22074294",
        doi: "10.1517/14712598.2012.634793",
      },
    ],
    disclaimers: [
      "Evidence for the marketed recovery/performance use is preclinical or early-stage. Efficacy and safety for this use in humans are not established.",
      "TB-500 is banned in sport (WADA) and is not an approved supplement.",
    ],
    testimonials: [
      {
        text: "Some athletes report faster soft-tissue recovery, but these are uncontrolled personal accounts, not evidence.",
        source: "Aggregated user reports",
        disclaimerFlag: true,
      },
    ],  },

  // ---- SARMs ----
  {
    id: "ostarine",
    name: "Ostarine (MK-2866)",
    effects: {
      onset: "Strength/pumps in 1–2 weeks; lean mass over 4–8 weeks",
      whatToExpect: [
        "Milder and 'smoother' than steroids — gradual strength and lean-mass gains, little water bloat.",
        "Testosterone suppression rises with dose and cycle length; recovery is not guaranteed.",
        "Often used for 'recomp'; results depend heavily on training and diet.",
        "Product content is a wildcard — gray-market SARMs are frequently mislabeled.",
      ],
    },
    reportedExperiences: [
      {
        theme: "Recomposition",
        sentiment: "positive",
        summary:
          "The most common report is a lean-mass 'recomp' with modest, steady gains and minimal bloat — the reason it's the beginner-favorite SARM.",
      },
      {
        theme: "Hormonal suppression",
        sentiment: "mixed",
        summary:
          "Lighter suppression than other SARMs at low doses, but many still report reduced libido or mood dips and run post-cycle support.",
      },
      {
        theme: "Product quality",
        sentiment: "negative",
        summary:
          "Recurring theme: 'is it even dosed correctly?' Independent tests have found under- and mis-dosed products, so a COA matters.",
      },
    ],
    vendors: [
      {
        name: "SwissChems",
        url: "https://swisschems.is",
        pricingModel: "retail",
        pricesCheckedAt: "2026-07",
        products: [],
        notes: "Carried alongside other SARMs — check the site for the current SKU and price.",
      },
    ],
    aka: ["Enobosarm", "MK-2866"],
    category: "sarm",
    summary:
      "The most-studied SARM; showed lean-mass gains in cancer trials but was never approved, and is banned in sport.",
    mechanism:
      "A selective androgen receptor modulator (SARM): activates androgen receptors in muscle and bone with the intent of fewer prostate/hair effects than steroids. Oral, non-steroidal.",
    benefits: [
      "Increased lean body mass in phase 2 cancer-cachexia trials",
      "Intended muscle/bone selectivity vs classic steroids",
    ],
    sideEffects: [
      "Suppresses natural testosterone",
      "Liver enzyme elevations / liver injury reported",
      "Lowers HDL ('good') cholesterol",
    ],
    contraindications: [
      "Not approved for human use; sold as a 'research chemical'",
      "Banned by WADA — a doping violation in tested sport",
      "Products are frequently mislabeled or contaminated — a COA is essential",
    ],
    dosingNotes:
      "The cancer trials studied 1–3 mg/day of pharmaceutical-grade enobosarm under medical supervision. There is no approved consumer dose, and gray-market products vary widely in actual content.",
    goals: ["muscle", "strength", "recovery"],
    evidenceLevel: "limited",
    citations: [
      {
        title:
          "Effects of enobosarm on muscle wasting and physical function in patients with cancer: a double-blind, randomised controlled phase 2 trial",
        authors: "Dobs AS, et al.",
        year: 2013,
        journal: "Lancet Oncology",
        url: "https://doi.org/10.1016/S1470-2045(13)70055-X",
        pmid: "23499390",
        doi: "10.1016/S1470-2045(13)70055-X",
      },
    ],
    disclaimers: [
      "Never approved as a drug or supplement; long-term safety in healthy people is unknown.",
      "Independent testing has repeatedly found SARM products mislabeled or spiked with other drugs.",
    ],
    testimonials: [],  },
  {
    id: "lgd-4033",
    name: "Ligandrol (LGD-4033)",
    effects: {
      onset: "Strength in 1–2 weeks; size over several weeks",
      whatToExpect: [
        "More noticeable size and strength than ostarine, at lower milligram doses.",
        "Stronger testosterone/SHBG suppression; some report lethargy and low libido.",
        "Mild water retention and fuller muscles are common.",
        "Human data is thin; 'cycle' doses seen online exceed anything studied.",
      ],
    },
    reportedExperiences: [
      {
        theme: "Size & strength",
        sentiment: "positive",
        summary:
          "Users frequently report solid strength and mass gains for a non-steroid, which drives its popularity.",
      },
      {
        theme: "Suppression & recovery",
        sentiment: "negative",
        summary:
          "A common complaint is meaningful suppression — low libido, flat mood, and a slow, uncertain recovery afterward.",
      },
    ],
    vendors: [
      {
        name: "SwissChems",
        url: "https://swisschems.is",
        pricingModel: "retail",
        pricesCheckedAt: "2026-07",
        products: [],
        notes: "Carried alongside other SARMs — check the site for the current SKU and price.",
      },
    ],
    aka: ["LGD-4033", "VK5211"],
    category: "sarm",
    summary:
      "A potent oral SARM popular for muscle gain; only early human data exist, and it suppresses natural hormones.",
    mechanism:
      "A non-steroidal selective androgen receptor modulator that stimulates muscle androgen receptors. More potent per milligram than ostarine.",
    benefits: [
      "Increases in lean mass reported in early/observational human data",
    ],
    sideEffects: [
      "Marked suppression of testosterone and SHBG",
      "Drops in HDL cholesterol; liver-enzyme elevations",
    ],
    contraindications: [
      "Not approved for human use; banned by WADA",
      "Post-cycle hormonal recovery is not guaranteed",
    ],
    dosingNotes:
      "Early human research examined low doses (~0.1–1 mg/day). No validated consumer dosing exists; higher 'cycle' doses circulated online are not supported by controlled safety data.",
    goals: ["muscle", "strength"],
    evidenceLevel: "limited",
    citations: [
      {
        title:
          "LGD-4033 and MK-677 use impacts body composition, circulating biomarkers, and skeletal muscle androgenic hormone concentrations",
        authors: "Cardaci TD, et al.",
        year: 2022,
        journal: "Experimental Physiology",
        url: "https://doi.org/10.1113/EP090741",
        pmid: "36303408",
        doi: "10.1113/EP090741",
      },
    ],
    disclaimers: [
      "Human evidence is limited to small/observational studies; long-term safety is unknown.",
    ],
    testimonials: [],  },
  {
    id: "rad-140",
    name: "RAD-140 (Testolone)",
    effects: {
      onset: "Strength and aggression reported within ~2 weeks",
      whatToExpect: [
        "Users describe aggressive strength gains and a 'driven' feeling.",
        "Notable testosterone suppression; irritability or aggression is commonly reported.",
        "Some report headaches, poor sleep, or a 'wired' feeling.",
        "Liver-injury cases exist — dark urine, fatigue, or yellowing are red-flag symptoms.",
      ],
    },
    reportedExperiences: [
      {
        theme: "Strength & drive",
        sentiment: "positive",
        summary:
          "The signature report is fast strength gains and heightened aggression/drive in the gym.",
      },
      {
        theme: "Mood & sleep",
        sentiment: "mixed",
        summary:
          "That same 'drive' shows up as irritability, anxiety, or disrupted sleep for many users.",
      },
      {
        theme: "Liver strain",
        sentiment: "negative",
        summary:
          "A serious recurring theme is elevated liver enzymes and jaundice case reports — the reason bloodwork is strongly advised.",
      },
    ],
    vendors: [
      {
        name: "SwissChems",
        url: "https://swisschems.is",
        pricingModel: "retail",
        pricesCheckedAt: "2026-07",
        products: [{ label: "10 mg/capsule × 60 capsules", price: 89.95, currency: "USD" }],
      },
    ],
    aka: ["RAD-140", "Testolone"],
    category: "sarm",
    summary:
      "A strong experimental SARM with essentially no human efficacy data and documented liver-injury case reports.",
    mechanism:
      "A potent non-steroidal androgen receptor agonist studied preclinically for muscle and, separately, breast cancer. Human performance data are lacking.",
    benefits: [
      "Muscle-building effects in animal models",
    ],
    sideEffects: [
      "Reported cases of drug-induced liver injury in users",
      "Testosterone suppression; cholesterol changes",
    ],
    contraindications: [
      "Not approved for human use; banned by WADA",
      "The FDA has warned specifically about SARM liver toxicity",
    ],
    dosingNotes:
      "There is NO validated human dosing. Doses promoted online are extrapolations, not evidence-based, and carry real liver risk.",
    goals: ["muscle", "strength"],
    evidenceLevel: "limited",
    citations: [
      {
        title: "Selective Androgen Receptor Modulator Induced Hepatotoxicity",
        authors: "Khan S, et al.",
        year: 2022,
        journal: "Cureus",
        url: "https://doi.org/10.7759/cureus.22239",
        pmid: "35340496",
        doi: "10.7759/cureus.22239",
      },
    ],
    disclaimers: [
      "No controlled human efficacy trials exist. The cited report documents SARM-associated liver injury.",
    ],
    testimonials: [
      {
        text: "Users report rapid strength gains, but these are uncontrolled anecdotes and ignore the documented liver risk.",
        source: "Aggregated user reports",
        disclaimerFlag: true,
      },
    ],  },
  {
    id: "cardarine",
    name: "Cardarine (GW-501516)",
    effects: {
      onset: "Endurance changes within days to ~2 weeks",
      whatToExpect: [
        "The hallmark report is improved endurance and stamina — longer, less-gassed cardio.",
        "No hormonal suppression (it's not a SARM or hormone), so no 'crash' afterward.",
        "Some report modest fat loss when paired with training.",
        "None of this offsets the core problem: it caused cancer in long-term animal studies.",
      ],
    },
    reportedExperiences: [
      {
        theme: "Endurance",
        sentiment: "positive",
        summary:
          "Users consistently report noticeably better cardio endurance — the single reason people seek it out.",
      },
      {
        theme: "Fat loss",
        sentiment: "mixed",
        summary:
          "Some report easier fat loss; others see little beyond the endurance effect on its own.",
      },
      {
        theme: "Cancer risk",
        sentiment: "negative",
        summary:
          "The overriding theme among informed users is that animal carcinogenicity ended its development — no anecdote outweighs that.",
      },
    ],
    vendors: [
      {
        name: "SwissChems",
        url: "https://swisschems.is",
        pricingModel: "retail",
        pricesCheckedAt: "2026-07",
        products: [{ label: "10 mg/capsule × 60 capsules", price: 69.95, currency: "USD" }],
        notes: "Sold for research use; see the safety warnings above before considering it.",
      },
    ],
    aka: ["GW-501516", "Endurobol"],
    category: "sarm",
    summary:
      "A PPARδ agonist marketed for endurance — but its development was halted after it caused cancer in animal studies.",
    mechanism:
      "Activates PPARδ, shifting muscle toward fat oxidation and boosting endurance in rodents (an 'exercise mimetic'). It is not a SARM.",
    benefits: [
      "Increased running endurance and fat oxidation in mice",
    ],
    sideEffects: [
      "Caused tumors in multiple organs in long-term animal studies",
    ],
    contraindications: [
      "Development was abandoned over carcinogenicity; not approved for any use",
      "Banned by WADA",
    ],
    dosingNotes:
      "No human dosing is validated. Given the animal carcinogenicity that ended its development, this compound is widely considered unsafe at any dose.",
    goals: ["endurance", "performance"],
    evidenceLevel: "limited",
    citations: [
      {
        title: "AMPK and PPARdelta agonists are exercise mimetics",
        authors: "Narkar VA, et al.",
        year: 2008,
        journal: "Cell",
        url: "https://doi.org/10.1016/j.cell.2008.06.051",
        pmid: "18674809",
        doi: "10.1016/j.cell.2008.06.051",
      },
    ],
    disclaimers: [
      "Evidence of benefit is from rodents. Long-term animal studies found it caused cancer, which is why development stopped.",
    ],
    testimonials: [],  },
  {
    id: "andarine",
    name: "Andarine (S4)",
    effects: {
      onset: "Muscle 'hardness' in 1–2 weeks; vision effects can appear early",
      whatToExpect: [
        "Users report a 'dry, hard' muscle look, favored for cutting phases.",
        "The signature side effect: yellow-tinted vision and trouble adjusting to darkness.",
        "Vision changes are usually dose-dependent and reversible after stopping.",
        "Testosterone suppression occurs; human efficacy data is essentially absent.",
      ],
    },
    reportedExperiences: [
      {
        theme: "Muscle hardness / cutting",
        sentiment: "positive",
        summary:
          "The common positive is a dry, hard, vascular look on a cut — the main reason people try S4.",
      },
      {
        theme: "Vision disturbances",
        sentiment: "negative",
        summary:
          "Nearly universal report: yellow tint to vision and poor night vision. Reversible for most, but unsettling and a frequent reason to quit.",
      },
    ],
    vendors: [
      {
        name: "SwissChems",
        url: "https://swisschems.is",
        pricingModel: "retail",
        pricesCheckedAt: "2026-07",
        products: [{ label: "25 mg/capsule × 60 capsules", price: 65.95, currency: "USD" }],
      },
    ],
    aka: ["S4", "GTx-007"],
    category: "sarm",
    summary:
      "An early SARM notable for temporary vision side effects; no human efficacy evidence supports its use.",
    mechanism:
      "A non-steroidal androgen receptor modulator. Its metabolites are thought to bind receptors in the eye, causing the characteristic visual disturbances.",
    benefits: [
      "Androgenic/anabolic activity in preclinical models",
    ],
    sideEffects: [
      "Yellow-tinted vision and difficulty adapting to darkness (usually reversible)",
      "Testosterone suppression",
    ],
    contraindications: [
      "Not approved for human use; banned by WADA",
    ],
    dosingNotes:
      "No validated human dosing exists. Reported protocols are anecdotal and unsupported by trials.",
    goals: ["muscle", "strength"],
    evidenceLevel: "anecdotal",
    citations: [],
    disclaimers: [
      "No reliable human studies support use. The distinctive vision changes reflect off-target activity.",
    ],
    testimonials: [
      {
        text: "Users describe muscle-hardening effects alongside the well-known vision side effects — uncontrolled anecdotes only.",
        source: "Aggregated user reports",
        disclaimerFlag: true,
      },
    ],  },
  {
    id: "yk-11",
    name: "YK-11",
    effects: {
      onset: "Strength/fullness reported over a few weeks",
      whatToExpect: [
        "Users report rapid strength and 'full' muscle look, marketed as a myostatin effect.",
        "Joint or tendon discomfort is a frequent complaint (strength outpacing connective tissue).",
        "Testosterone suppression occurs; being steroid-derived, liver strain is plausible.",
        "There are no human trials — safety and even the myostatin claim are unestablished.",
      ],
    },
    reportedExperiences: [
      {
        theme: "Strength & fullness",
        sentiment: "positive",
        summary:
          "The main positive report is quick strength and muscle fullness, which fuels the 'myostatin inhibitor' hype.",
      },
      {
        theme: "Joints & unknowns",
        sentiment: "mixed",
        summary:
          "Joint aches and a general 'we don't really know what this does long-term' caution dominate the more experienced reports.",
      },
    ],
    vendors: [
      {
        name: "SwissChems",
        url: "https://swisschems.is",
        pricingModel: "retail",
        pricesCheckedAt: "2026-07",
        products: [{ label: "5 mg/capsule × 60 capsules", price: 79.95, currency: "USD" }],
      },
    ],
    aka: ["YK-11"],
    category: "sarm",
    summary:
      "A steroidal compound marketed as a SARM/'myostatin inhibitor' with no human data and an unknown safety profile.",
    mechanism:
      "Structurally a steroid; proposed to increase follistatin and thereby reduce myostatin (a brake on muscle growth) in cell studies. Human relevance is unproven.",
    benefits: [
      "Increased follistatin and muscle-cell growth markers in vitro",
    ],
    sideEffects: [
      "Unknown human safety; likely testosterone suppression and possible liver strain given its structure",
    ],
    contraindications: [
      "Not approved for human use; banned by WADA",
    ],
    dosingNotes:
      "No validated human dosing exists. All circulating protocols are anecdotal.",
    goals: ["muscle"],
    evidenceLevel: "anecdotal",
    citations: [],
    disclaimers: [
      "Evidence is limited to cell-culture studies. There are no human trials establishing efficacy or safety.",
    ],
    testimonials: [
      {
        text: "Marketed as a myostatin inhibitor for fast muscle growth; claims rest on lab studies and user reports, not human trials.",
        source: "Aggregated user reports",
        disclaimerFlag: true,
      },
    ],  },

  // ---- Growth-hormone secretagogues / GHRH analogs ----
  {
    id: "mk-677",
    name: "MK-677 (Ibutamoren)",
    effects: {
      onset: "Sleep & appetite changes within days; body-comp over weeks",
      whatToExpect: [
        "A pronounced increase in appetite — often the first and most noticeable effect.",
        "Many report deeper sleep and vivid dreams; some report morning grogginess.",
        "Water retention and mild puffiness are common, especially early on.",
        "Numbness or tingling in the hands (carpal-tunnel-like) is frequently reported.",
      ],
    },
    reportedExperiences: [
      {
        theme: "Sleep & appetite",
        sentiment: "positive",
        summary:
          "The most consistent reports are deeper sleep and a big appetite boost — welcomed by those trying to gain, unwelcome for those cutting.",
      },
      {
        theme: "Water retention & 'puffiness'",
        sentiment: "mixed",
        summary:
          "Users frequently report bloating, fuller-looking muscles, and mild edema that eases after stopping.",
      },
      {
        theme: "Blood sugar",
        sentiment: "negative",
        summary:
          "A recurring concern is raised fasting glucose and reduced insulin sensitivity — consistent with the trial data and a real reason for caution.",
      },
    ],
    vendors: [
      {
        name: "SwissChems",
        url: "https://swisschems.is",
        pricingModel: "retail",
        pricesCheckedAt: "2026-07",
        products: [{ label: "10 mg/capsule × 60 capsules", price: 69.95, currency: "USD" }],
      },
    ],
    aka: ["Ibutamoren", "MK-677"],
    category: "peptide",
    summary:
      "An oral growth-hormone secretagogue that reliably raises GH and IGF-1, but was never approved as a drug.",
    mechanism:
      "Mimics ghrelin at the GH-secretagogue receptor, stimulating the pituitary to release growth hormone and raising IGF-1. Orally active and long-lasting.",
    benefits: [
      "Consistently increases GH/IGF-1 and markers of bone turnover in trials",
      "May increase lean mass and appetite",
    ],
    sideEffects: [
      "Water retention, joint aches, increased appetite",
      "Can raise blood sugar and reduce insulin sensitivity",
    ],
    contraindications: [
      "Not an approved drug; caution with diabetes/pre-diabetes and heart failure",
      "Banned by WADA",
    ],
    dosingNotes:
      "Clinical studies commonly used ~25 mg/day. It is not an approved consumer product, and long-term safety (including one halted trial in frail elderly over adverse events) is not established.",
    goals: ["muscle", "recovery", "sleep"],
    evidenceLevel: "moderate",
    citations: [
      {
        title:
          "Treatment with the oral growth hormone secretagogue MK-677 increases markers of bone formation and bone resorption",
        authors: "Svensson J, et al.",
        year: 1998,
        journal: "Journal of Bone and Mineral Research",
        url: "https://doi.org/10.1359/jbmr.1998.13.7.1158",
        pmid: "9661080",
        doi: "10.1359/jbmr.1998.13.7.1158",
      },
    ],
    disclaimers: [
      "Raising GH/IGF-1 is well documented, but clear long-term benefit-vs-risk in healthy people is not established.",
    ],
    testimonials: [],  },
  {
    id: "tesamorelin",
    name: "Tesamorelin",
    effects: {
      onset: "Visceral fat reduction over weeks–months",
      whatToExpect: [
        "In its approved use, a gradual reduction in deep abdominal (visceral) fat.",
        "Injection-site reactions and joint aches/fluid retention are common.",
        "Can raise blood sugar — relevant if you're pre-diabetic.",
        "Off-label 'anti-aging'/muscle use isn't supported by the approval data.",
      ],
    },
    reportedExperiences: [
      {
        theme: "Visceral fat",
        sentiment: "positive",
        summary:
          "In the population it's approved for, reduced belly (visceral) fat is the consistent, evidence-backed outcome.",
      },
      {
        theme: "Off-label expectations",
        sentiment: "mixed",
        summary:
          "General 'anti-aging' users report vaguer results and the same GH-type side effects, without the trial support of the approved use.",
      },
    ],
    vendors: [
      {
        name: "algo.rx",
        url: "https://algorx.ai",
        pricingModel: "clinician-gated",
        notes: "Telehealth peptide protocols via licensed pharmacies with clinician oversight.",
      },
      {
        name: "SwissChems",
        url: "https://swisschems.is",
        pricingModel: "retail",
        pricesCheckedAt: "2026-07",
        products: [],
        notes: "Research-grade versions may be listed — check the site; this is a prescription drug in approved use.",
      },
    ],
    aka: ["Egrifta"],
    category: "peptide",
    summary:
      "An FDA-approved GHRH analog that reduces visceral fat in HIV-associated lipodystrophy.",
    mechanism:
      "A stabilized growth-hormone-releasing hormone (GHRH) analog that stimulates the pituitary to release GH, reducing deep abdominal (visceral) fat.",
    benefits: [
      "Reduces visceral adipose tissue in HIV lipodystrophy (its approved use)",
      "Improves some lipid measures",
    ],
    sideEffects: [
      "Injection-site reactions, joint pain, fluid retention",
      "Can raise blood sugar",
    ],
    contraindications: [
      "Prescription medication; contraindicated in active cancer and pregnancy",
      "Off-label 'anti-aging'/bodybuilding use is not supported by approval data",
    ],
    dosingNotes:
      "The approved regimen is 2 mg once daily by subcutaneous injection, prescribed and monitored by a clinician for its approved indication.",
    goals: ["metabolic", "recovery"],
    evidenceLevel: "strong",
    citations: [
      {
        title: "Tesamorelin: a review of its use in the management of HIV-associated lipodystrophy",
        authors: "Dhillon S",
        year: 2011,
        journal: "Drugs",
        url: "https://doi.org/10.2165/11202240-000000000-00000",
        pmid: "21668043",
        doi: "10.2165/11202240-000000000-00000",
      },
    ],
    disclaimers: [
      "Strong evidence applies to its approved indication (HIV lipodystrophy). Benefit and safety for general anti-aging or muscle use are not established.",
    ],
    testimonials: [],  },
  {
    id: "cjc-1295",
    name: "CJC-1295",
    effects: {
      onset: "No acute feel; sleep/recovery reports build over weeks",
      whatToExpect: [
        "No immediate sensation — it nudges your own GH/IGF-1 rather than replacing it.",
        "Most reports center on deeper sleep and recovery, often stacked with ipamorelin.",
        "Mild water retention, flushing, or injection-site reactions can occur.",
        "Benefits are subtle and unproven in controlled trials for these uses.",
      ],
    },
    reportedExperiences: [
      {
        theme: "Sleep & recovery",
        sentiment: "positive",
        summary:
          "The common report is better sleep quality and recovery, usually as part of a CJC-1295 + ipamorelin combo.",
      },
      {
        theme: "Is it doing anything?",
        sentiment: "mixed",
        summary:
          "Because effects are subtle, many users aren't sure how much is the peptide versus better sleep habits — no trials to settle it.",
      },
    ],
    vendors: [
      {
        name: "SwissChems",
        url: "https://swisschems.is",
        pricingModel: "retail",
        pricesCheckedAt: "2026-07",
        products: [
          { label: "CJC-1295 with DAC, 2 mg (from)", price: 47.95, currency: "USD" },
          { label: "CJC-1295 without DAC, 2 mg (from)", price: 42.95, currency: "USD" },
        ],
      },
    ],
    aka: ["CJC-1295", "DAC:GRF"],
    category: "peptide",
    summary:
      "A long-acting GHRH analog used in research-chemical GH stacks; no controlled efficacy trials for performance exist.",
    mechanism:
      "A modified GHRH that raises GH and IGF-1, often combined with a ghrelin-mimetic (e.g. ipamorelin) to amplify GH pulses. Early pharmacology studies confirmed it elevates GH/IGF-1.",
    benefits: [
      "Raises circulating GH and IGF-1 in early pharmacology studies",
    ],
    sideEffects: [
      "Injection-site reactions, flushing, water retention, headache",
      "Unknown long-term safety",
    ],
    contraindications: [
      "Not an approved drug for performance/anti-aging; banned by WADA",
    ],
    dosingNotes:
      "No validated consumer dosing exists. Protocols circulated online are not backed by controlled human outcome trials.",
    goals: ["recovery", "muscle"],
    evidenceLevel: "limited",
    citations: [],
    disclaimers: [
      "It can raise GH/IGF-1, but there are no controlled trials showing meaningful performance or body-composition benefit with an established safety margin.",
    ],
    testimonials: [],  },
  {
    id: "ipamorelin",
    name: "Ipamorelin",
    effects: {
      onset: "No acute feel; sleep/recovery reports over weeks",
      whatToExpect: [
        "A 'cleaner' GH nudge than older secretagogues — less hunger and cortisol reported.",
        "Most feedback is about deeper sleep and recovery; often paired with CJC-1295.",
        "Mild flushing or a head-rush after injection is occasionally reported.",
        "Effects are subtle and lack controlled human trials for the marketed uses.",
      ],
    },
    reportedExperiences: [
      {
        theme: "Sleep & recovery",
        sentiment: "positive",
        summary:
          "Users generally report better sleep and recovery with fewer side effects than GHRP-6/ghrelin mimetics.",
      },
      {
        theme: "Subtle effects",
        sentiment: "mixed",
        summary:
          "The common caveat is that effects are gentle — pleasant for some, unnoticeable for others.",
      },
    ],
    vendors: [
      {
        name: "SwissChems",
        url: "https://swisschems.is",
        pricingModel: "retail",
        pricesCheckedAt: "2026-07",
        products: [],
        notes: "Carried as a research peptide — check the site for the current SKU and price.",
      },
    ],
    aka: ["Ipamorelin"],
    category: "peptide",
    summary:
      "A selective ghrelin-mimetic GH secretagogue popular in peptide stacks, with no controlled human outcome trials.",
    mechanism:
      "Selectively stimulates the GH-secretagogue receptor to release growth hormone with relatively little effect on cortisol or prolactin, often paired with CJC-1295.",
    benefits: [
      "Stimulates GH release with a cleaner side-effect profile than older secretagogues (preclinical/early data)",
    ],
    sideEffects: [
      "Injection-site reactions, headache, water retention",
      "Long-term safety not established",
    ],
    contraindications: [
      "Not an approved drug; banned by WADA",
    ],
    dosingNotes:
      "No validated consumer dosing exists; circulating protocols are anecdotal and not supported by controlled trials.",
    goals: ["recovery", "muscle", "sleep"],
    evidenceLevel: "limited",
    citations: [],
    disclaimers: [
      "Evidence is preclinical/early-stage. Controlled human trials for the marketed uses are lacking.",
    ],
    testimonials: [],  },

  // ---- Other therapeutic / research peptides ----
  {
    id: "pt-141",
    name: "PT-141 (Bremelanotide)",
    effects: {
      onset: "Taken ~2–6 hours before activity; acts centrally",
      whatToExpect: [
        "Increased sexual desire/arousal via the brain — different from blood-flow drugs.",
        "Nausea is the most common effect, sometimes significant.",
        "Flushing and headache are frequent; a temporary rise in blood pressure can occur.",
        "Repeated use can darken skin, gums, or moles in some people.",
      ],
    },
    reportedExperiences: [
      {
        theme: "Libido & arousal",
        sentiment: "positive",
        summary:
          "Users commonly report a genuine increase in desire and arousal, valued because it works centrally rather than just physically.",
      },
      {
        theme: "Nausea & dosing",
        sentiment: "mixed",
        summary:
          "Nausea and finding the right pre-timing and dose are the usual sticking points; many titrate down to reduce side effects.",
      },
    ],
    vendors: [
      {
        name: "SwissChems",
        url: "https://swisschems.is",
        pricingModel: "retail",
        pricesCheckedAt: "2026-07",
        products: [],
        notes: "Carried as a research peptide — check the site for the current SKU and price.",
      },
      {
        name: "algo.rx",
        url: "https://algorx.ai",
        pricingModel: "clinician-gated",
        notes: "Telehealth sexual-health protocols with clinician oversight.",
      },
    ],
    aka: ["Bremelanotide", "Vyleesi"],
    category: "peptide",
    summary:
      "An FDA-approved melanocortin peptide for low sexual desire in premenopausal women; also used off-label for libido.",
    mechanism:
      "A melanocortin-receptor agonist acting in the brain to influence sexual desire — a central mechanism distinct from blood-flow drugs like sildenafil.",
    benefits: [
      "Modest improvements in sexual desire and reduced distress in phase 3 trials (approved use)",
    ],
    sideEffects: [
      "Nausea (common), flushing, headache",
      "Transient blood-pressure increase; can darken skin/gums with repeated use",
    ],
    contraindications: [
      "Prescription medication; contraindicated in uncontrolled hypertension or cardiovascular disease",
    ],
    dosingNotes:
      "The approved product is 1.75 mg by subcutaneous injection as needed before anticipated activity, with a limit on doses per day/month, under prescription.",
    goals: ["libido"],
    evidenceLevel: "strong",
    citations: [
      {
        title:
          "Bremelanotide for the Treatment of Hypoactive Sexual Desire Disorder: Two Randomized Phase 3 Trials",
        authors: "Kingsberg SA, et al.",
        year: 2019,
        journal: "Obstetrics & Gynecology",
        url: "https://doi.org/10.1097/AOG.0000000000003500",
        pmid: "31599840",
        doi: "10.1097/AOG.0000000000003500",
      },
    ],
    disclaimers: [
      "Effects on desire are real but modest. Approved for a specific population; other uses are off-label.",
    ],
    testimonials: [],  },
  {
    id: "melanotan-2",
    name: "Melanotan II",
    effects: {
      onset: "Tanning builds over days–weeks; nausea is acute",
      whatToExpect: [
        "Skin darkens/tans with far less sun — the main reason people use it.",
        "Nausea and facial flushing right after dosing are very common early on.",
        "Spontaneous erections and reduced appetite are frequently reported.",
        "Existing moles/freckles can darken and new ones appear — a real red flag.",
      ],
    },
    reportedExperiences: [
      {
        theme: "Tanning",
        sentiment: "positive",
        summary:
          "Users reliably report a deep tan with minimal sun exposure — the sole appeal of the compound.",
      },
      {
        theme: "Nausea & flushing",
        sentiment: "negative",
        summary:
          "Early nausea, flushing, and 'feeling off' after each dose are near-universal complaints.",
      },
      {
        theme: "Moles & skin cancer",
        sentiment: "negative",
        summary:
          "The most serious recurring theme is darkening/changing moles — with case reports linking use to melanoma. Dermatologist monitoring is essential.",
      },
    ],
    vendors: [
      {
        name: "SwissChems",
        url: "https://swisschems.is",
        pricingModel: "retail",
        pricesCheckedAt: "2026-07",
        products: [],
        notes: "Sold for research use only; unapproved and illegal to sell for human use in many countries.",
      },
    ],
    aka: ["MT-II", "Melanotan 2"],
    category: "peptide",
    summary:
      "A tanning/libido peptide sold illegally, linked to nausea and to changes in moles and reported melanoma cases.",
    mechanism:
      "A melanocortin-receptor agonist that stimulates melanin production (darkening skin) and can affect appetite and sexual arousal.",
    benefits: [
      "Skin tanning with less UV exposure; some libido effects",
    ],
    sideEffects: [
      "Nausea, facial flushing, spontaneous erections",
      "Darkening/new moles; case reports link use to melanoma",
    ],
    contraindications: [
      "Not approved anywhere; sale is illegal in many countries",
      "Avoid with many moles, atypical moles, or melanoma risk",
    ],
    dosingNotes:
      "There is no validated or approved human dosing. Products are unregulated and their monitoring of moles is not part of any protocol.",
    goals: ["appearance", "libido"],
    evidenceLevel: "limited",
    citations: [
      {
        title: "Melanotan-associated melanoma",
        authors: "Paurobally D, et al.",
        year: 2011,
        journal: "British Journal of Dermatology",
        url: "https://doi.org/10.1111/j.1365-2133.2011.10273.x",
        pmid: "21564053",
        doi: "10.1111/j.1365-2133.2011.10273.x",
      },
    ],
    disclaimers: [
      "Unapproved and unregulated. The cited report and others link use to changes in moles and melanoma; monitor skin with a dermatologist.",
    ],
    testimonials: [],  },
  {
    id: "ghk-cu",
    name: "GHK-Cu (Copper Peptide)",
    effects: {
      onset: "Skin changes over several weeks (topical)",
      whatToExpect: [
        "Topically, users report gradually firmer, smoother-looking skin and improved tone.",
        "Well tolerated on skin; occasional irritation with strong formulas.",
        "Injected/systemic 'anti-aging' use is not established and less predictable.",
        "Cosmetic evidence is modest and often industry-linked — set expectations accordingly.",
      ],
    },
    reportedExperiences: [
      {
        theme: "Skin appearance",
        sentiment: "positive",
        summary:
          "The main positive is smoother, firmer-looking skin from topical serums over weeks of consistent use.",
      },
      {
        theme: "Injected use",
        sentiment: "mixed",
        summary:
          "Reports on injected GHK-Cu for healing/anti-aging are scattered and inconclusive, without trials to back them.",
      },
    ],
    vendors: [
      {
        name: "SwissChems",
        url: "https://swisschems.is",
        pricingModel: "retail",
        pricesCheckedAt: "2026-07",
        products: [{ label: "GHK-Cu Copper Peptide (from)", price: 24.7, currency: "USD" }],
      },
    ],
    aka: ["Copper tripeptide-1", "GHK-Cu"],
    category: "peptide",
    summary:
      "A copper-binding peptide used in skincare for signs of aging; best evidence is topical and cosmetic.",
    mechanism:
      "A naturally occurring tripeptide that binds copper and influences wound-healing, collagen, and antioxidant pathways in skin.",
    benefits: [
      "Topical formulations may improve skin firmness and appearance in small cosmetic studies",
    ],
    sideEffects: [
      "Topical use is generally well tolerated; injected use is not well studied",
    ],
    contraindications: [
      "Injectable use for 'anti-aging'/healing is not established or approved",
    ],
    dosingNotes:
      "Evidence is strongest for topical cosmetic use as formulated in skincare products. There is no validated dosing for injected systemic use.",
    goals: ["skin", "recovery"],
    evidenceLevel: "limited",
    citations: [],
    disclaimers: [
      "Cosmetic/topical evidence is modest and mostly industry-linked; systemic injected use lacks controlled human trials.",
    ],
    testimonials: [],  },
  {
    id: "tirzepatide",
    name: "Tirzepatide",
    effects: {
      onset: "Appetite drop within days; weight loss over weeks–months",
      whatToExpect: [
        "Often an even stronger appetite reduction than semaglutide — marked drop in 'food noise'.",
        "Nausea, constipation, and reflux are common, worst when the dose is increased.",
        "Weight loss is substantial and gradual; results track with dose and titration pace.",
        "Muscle loss and post-stop regain are real risks without protein and training.",
      ],
    },
    reportedExperiences: [
      {
        theme: "Weight loss",
        sentiment: "positive",
        summary:
          "Users frequently report the strongest appetite control and weight loss they've experienced — matching its trial performance.",
      },
      {
        theme: "GI side effects",
        sentiment: "mixed",
        summary:
          "Nausea and constipation during titration are near-universal talking points; most push through, some can't.",
      },
      {
        theme: "Cost & rebound",
        sentiment: "negative",
        summary:
          "Common frustrations are cost/access and regaining weight after stopping — reinforcing that it's a long-term, supervised tool.",
      },
    ],
    vendors: [
      {
        name: "Enhanced",
        url: "https://www.enhanced.com",
        pricingModel: "clinician-gated",
        notes:
          "Clinician-guided GLP-1/GIP via licensed US pharmacies after a medical evaluation.",
      },
      {
        name: "algo.rx",
        url: "https://algorx.ai",
        pricingModel: "clinician-gated",
        notes: "Telehealth weight-management protocols with labs and clinician oversight.",
      },
    ],
    aka: ["Mounjaro", "Zepbound", "GIP/GLP-1 receptor agonist"],
    category: "peptide",
    summary:
      "An FDA-approved dual GIP/GLP-1 peptide with strong trial evidence for large weight loss and blood-sugar control.",
    mechanism:
      "Activates both GIP and GLP-1 receptors: enhances insulin response, slows gastric emptying, and strongly reduces appetite — often more weight loss than GLP-1 alone.",
    benefits: [
      "Substantial weight loss in the SURMOUNT trials",
      "Strong blood-sugar improvements in type 2 diabetes",
    ],
    sideEffects: [
      "GI effects: nausea, vomiting, diarrhea, constipation",
      "Rare serious risks (pancreatitis, gallbladder); thyroid C-cell tumor warning from animal data",
    ],
    contraindications: [
      "Prescription medication — must be supervised by a clinician",
      "Contraindicated with personal/family history of medullary thyroid carcinoma or MEN 2",
    ],
    dosingNotes:
      "Given as a once-weekly subcutaneous injection titrated up gradually by a prescriber (commonly to 5–15 mg/week). Dosing must be individualized and medically supervised — do not self-dose.",
    goals: ["weight", "metabolic"],
    evidenceLevel: "strong",
    citations: [
      {
        title: "Tirzepatide Once Weekly for the Treatment of Obesity",
        authors: "Jastreboff AM, et al.",
        year: 2022,
        journal: "New England Journal of Medicine",
        url: "https://doi.org/10.1056/NEJMoa2206038",
        pmid: "35658024",
        doi: "10.1056/NEJMoa2206038",
      },
    ],
    disclaimers: [
      "A prescription medication, not a supplement. Sourcing or self-dosing it without supervision is unsafe and often illegal.",
    ],
    testimonials: [],  },
  {
    id: "aod-9604",
    name: "AOD-9604",
    effects: {
      onset: "Marketed for fat loss; most report no clear effect",
      whatToExpect: [
        "Promoted as a fat-loss peptide, but human trials showed no weight loss over placebo.",
        "Generally well tolerated — tolerability was never the issue; efficacy was.",
        "No hormonal effects and no reliable body-composition change to expect.",
        "Set expectations low: the marketing outpaces the evidence.",
      ],
    },
    reportedExperiences: [
      {
        theme: "Fat loss claims",
        sentiment: "mixed",
        summary:
          "Some users feel it 'helps a little' alongside diet, but this is indistinguishable from the diet itself given the negative trial results.",
      },
      {
        theme: "No clear benefit",
        sentiment: "negative",
        summary:
          "Many report no noticeable effect and conclude the cost isn't justified — consistent with the human data.",
      },
    ],
    vendors: [
      {
        name: "SwissChems",
        url: "https://swisschems.is",
        pricingModel: "retail",
        pricesCheckedAt: "2026-07",
        products: [],
        notes: "May be listed as a research peptide — check the site for current availability.",
      },
    ],
    aka: ["AOD-9604", "HGH fragment 176-191"],
    category: "peptide",
    summary:
      "A growth-hormone fragment marketed for fat loss, but human trials did not show meaningful weight loss over placebo.",
    mechanism:
      "A fragment of the growth-hormone molecule proposed to stimulate fat breakdown without GH's effects on blood sugar or growth.",
    benefits: [
      "Promoted for fat loss based on animal data",
    ],
    sideEffects: [
      "Generally well tolerated in trials — but efficacy was the problem, not tolerability",
    ],
    contraindications: [
      "Not an approved drug; marketed as a research chemical",
    ],
    dosingNotes:
      "Human obesity trials did not demonstrate significant weight loss versus placebo, so there is no evidence-based effective dose.",
    goals: ["weight", "metabolic"],
    evidenceLevel: "anecdotal",
    citations: [],
    disclaimers: [
      "Despite marketing claims, human clinical trials did not show meaningful fat loss compared with placebo.",
    ],
    testimonials: [
      {
        text: "Sold as a fat-loss peptide; user claims are not supported by the human trial results.",
        source: "Aggregated user reports",
        disclaimerFlag: true,
      },
    ],  },

  // ---- Classic anabolic / performance-enhancing drugs (Enhanced Games) ----
  {
    id: "testosterone",
    name: "Testosterone",
    effects: {
      onset: "Libido/energy in 1–3 weeks; muscle/strength over 1–3 months",
      whatToExpect: [
        "When correcting a real deficiency: better libido, energy, mood, and gym recovery.",
        "Supraphysiologic (abuse) doses add muscle even without training — plus far more risk.",
        "Common effects: acne, oilier skin, water retention, and rising hematocrit (thicker blood).",
        "Suppresses your own production — testicular shrinkage and reduced fertility are expected.",
      ],
    },
    reportedExperiences: [
      {
        theme: "TRT quality of life",
        sentiment: "positive",
        summary:
          "Men on monitored replacement widely report restored energy, libido, and mood — the well-supported upside when a genuine deficiency is treated.",
      },
      {
        theme: "Bloodwork management",
        sentiment: "mixed",
        summary:
          "A recurring theme is needing to manage hematocrit, estrogen, and lipids with regular labs — manageable with oversight, risky without.",
      },
      {
        theme: "Abuse consequences",
        sentiment: "negative",
        summary:
          "Higher-dose 'blast' users report acne, aggression, sleep issues, infertility, and cardiovascular scares — the reason supervision matters.",
      },
    ],
    vendors: [
      {
        name: "Enhanced",
        url: "https://www.enhanced.com",
        pricingModel: "clinician-gated",
        notes:
          "Clinician-guided TRT via licensed US pharmacies after a medical evaluation — the legal, monitored route.",
      },
      {
        name: "algo.rx",
        url: "https://algorx.ai",
        pricingModel: "clinician-gated",
        notes: "Telehealth hormone optimization with labs and clinician oversight.",
      },
    ],
    aka: ["Test", "TRT (therapeutic)"],
    category: "hormone",
    summary:
      "The primary male androgen; a legitimate prescription therapy for deficiency, but a controlled substance widely misused at high doses.",
    mechanism:
      "Binds androgen receptors to increase muscle protein synthesis, strength, red blood cells, and libido. Supraphysiologic doses increase muscle even without training.",
    benefits: [
      "Corrects genuine deficiency (hypogonadism) under medical care",
      "Dose-dependent increases in muscle size and strength (classic controlled study)",
    ],
    sideEffects: [
      "Shuts down natural production, testicular shrinkage, infertility",
      "Acne, hair loss, raised hematocrit (clot risk), mood changes",
      "Cardiovascular and prostate considerations",
    ],
    contraindications: [
      "Controlled substance — prescription only; illicit use is illegal in many places and banned in sport",
      "Contraindicated in prostate/breast cancer and untreated high hematocrit",
    ],
    dosingNotes:
      "Therapeutic replacement is individualized by a clinician to restore normal levels with monitoring. The supraphysiologic doses used for muscle-building are a different, higher-risk practice and are not a medical recommendation here.",
    goals: ["muscle", "strength", "libido"],
    evidenceLevel: "strong",
    citations: [
      {
        title: "The effects of supraphysiologic doses of testosterone on muscle size and strength in normal men",
        authors: "Bhasin S, et al.",
        year: 1996,
        journal: "New England Journal of Medicine",
        url: "https://doi.org/10.1056/NEJM199607043350101",
        pmid: "8637535",
        doi: "10.1056/NEJM199607043350101",
      },
    ],
    disclaimers: [
      "Muscle/strength effects are well established, but so are the risks. Use outside medical supervision is illegal in many jurisdictions and carries real cardiovascular, fertility, and hormonal harms.",
    ],
    testimonials: [],  },
  {
    id: "anabolic-steroids",
    name: "Anabolic-Androgenic Steroids",
    effects: {
      onset: "Strength/size gains within a few weeks",
      whatToExpect: [
        "Large, reliable muscle and strength gains — the reason they're used despite the risks.",
        "Acne, oily skin, hair loss, and (with aromatizing compounds) breast tissue growth.",
        "Suppressed natural hormones: testicular shrinkage, low libido after, infertility.",
        "Mood swings/aggression, rising blood pressure, worse cholesterol, and heart strain.",
      ],
    },
    reportedExperiences: [
      {
        theme: "Muscle & strength",
        sentiment: "positive",
        summary:
          "Users consistently report dramatic size and strength gains — the effect is real and fast.",
      },
      {
        theme: "Side effects & PCT",
        sentiment: "mixed",
        summary:
          "Managing acne, hair loss, estrogen, and post-cycle recovery dominates the day-to-day experience; results vary by compound and genetics.",
      },
      {
        theme: "Long-term harm",
        sentiment: "negative",
        summary:
          "Longer-term users report cardiovascular scares, mood problems, and fertility issues — matching the documented heart damage in the research.",
      },
    ],
    aka: ["AAS", "Nandrolone", "Trenbolone", "Stanozolol"],
    category: "hormone",
    summary:
      "Synthetic testosterone derivatives that build muscle effectively but carry serious, well-documented cardiovascular and hormonal harm.",
    mechanism:
      "Modified androgens that strongly stimulate muscle protein synthesis. Different esters/compounds vary in androgenic vs anabolic balance and liver toxicity.",
    benefits: [
      "Large, reliable gains in muscle mass and strength",
    ],
    sideEffects: [
      "Documented cardiovascular toxicity (heart-muscle and coronary effects)",
      "Suppressed natural hormones/infertility, liver strain (oral 17-aa steroids), acne, hair loss, aggression/mood effects",
    ],
    contraindications: [
      "Controlled substances; illicit use is illegal in many countries and banned in all tested sport",
      "Especially dangerous with existing heart, liver, or psychiatric conditions",
    ],
    dosingNotes:
      "There is no safe recreational dose. This entry exists to inform about risks, not to provide a cycle. If used, harm-reduction means bloodwork, medical oversight, and avoiding oral 17-alkylated compounds and high stacks.",
    goals: ["muscle", "strength"],
    evidenceLevel: "moderate",
    citations: [
      {
        title: "Cardiovascular Toxicity of Illicit Anabolic-Androgenic Steroid Use",
        authors: "Baggish AL, et al.",
        year: 2017,
        journal: "Circulation",
        url: "https://doi.org/10.1161/CIRCULATIONAHA.116.026945",
        pmid: "28533317",
        doi: "10.1161/CIRCULATIONAHA.116.026945",
      },
    ],
    disclaimers: [
      "Muscle-building effects are real, but the cited research documents measurable heart damage in long-term users. These are high-risk controlled substances.",
    ],
    testimonials: [],  },
  {
    id: "hgh",
    name: "Human Growth Hormone (HGH)",
    effects: {
      onset: "Skin/fluid changes in weeks; body-comp over months",
      whatToExpect: [
        "Gradual fat loss and increased lean/water mass, plus reported better skin and sleep.",
        "Joint aches, carpal-tunnel tingling, and water retention are common, dose-dependent.",
        "Can raise blood sugar and reduce insulin sensitivity over time.",
        "Despite the reputation, it does not reliably increase strength or athletic performance.",
      ],
    },
    reportedExperiences: [
      {
        theme: "Recovery & body composition",
        sentiment: "positive",
        summary:
          "Users often report leaner body composition, better skin, and improved sleep/recovery over months of use.",
      },
      {
        theme: "Water & joints",
        sentiment: "mixed",
        summary:
          "Puffiness, joint aches, and carpal-tunnel tingling are frequent trade-offs, especially at higher doses.",
      },
      {
        theme: "Performance myth & cost",
        sentiment: "negative",
        summary:
          "A recurring realization is that the huge cost doesn't buy the strength gains people expect — the controlled evidence agrees.",
      },
    ],
    aka: ["Somatropin", "GH"],
    category: "hormone",
    summary:
      "A prescription hormone that increases lean mass and water, but a systematic review found it does not clearly improve athletic performance — and adds risks.",
    mechanism:
      "Stimulates IGF-1 and affects protein, fat, and glucose metabolism. Increases lean body mass largely via fluid and connective tissue rather than clearly increasing strength.",
    benefits: [
      "Increases lean body mass and reduces fat mass",
      "Approved for genuine GH deficiency and specific conditions",
    ],
    sideEffects: [
      "Fluid retention, joint pain, carpal tunnel, insulin resistance",
      "Acromegaly-type changes and possible cardiac effects with long-term high doses",
    ],
    contraindications: [
      "Prescription only; illicit performance use is banned by WADA and often illegal",
      "Caution with diabetes, cancer history",
    ],
    dosingNotes:
      "Approved use is dosed by a clinician for a diagnosed indication. For athletic performance, the cited review found increased lean mass but no proven improvement in strength/performance, alongside more adverse effects.",
    goals: ["recovery", "muscle", "metabolic"],
    evidenceLevel: "moderate",
    citations: [
      {
        title: "Systematic review: the effects of growth hormone on athletic performance",
        authors: "Liu H, et al.",
        year: 2008,
        journal: "Annals of Internal Medicine",
        url: "https://doi.org/10.7326/0003-4819-148-10-200805200-00215",
        pmid: "18347346",
        doi: "10.7326/0003-4819-148-10-200805200-00215",
      },
    ],
    disclaimers: [
      "Despite its reputation, controlled evidence does not show HGH reliably improves athletic performance, and it adds risks. Approved medical use is a separate, supervised matter.",
    ],
    testimonials: [],  },
  {
    id: "epo",
    name: "Erythropoietin (EPO)",
    effects: {
      onset: "Endurance rises over ~2–4 weeks as red cells build",
      whatToExpect: [
        "Improved aerobic endurance and VO2max — the basis of its use in endurance doping.",
        "Blood thickens as red-cell count climbs, which is exactly where the danger lies.",
        "Higher blood pressure and, with dehydration/exertion, a serious clot/stroke risk.",
        "Flu-like symptoms can occur after dosing.",
      ],
    },
    reportedExperiences: [
      {
        theme: "Endurance",
        sentiment: "positive",
        summary:
          "The performance effect is real and well known — noticeably better endurance and recovery at altitude/volume.",
      },
      {
        theme: "Life-threatening risk",
        sentiment: "negative",
        summary:
          "The dominant, sobering theme is that thickened blood has caused fatal clots and strokes in athletes — no performance gain is worth that.",
      },
    ],
    aka: ["EPO", "Epoetin"],
    category: "hormone",
    summary:
      "A hormone drug that boosts endurance by raising red blood cells — and can cause fatal clots when misused for performance.",
    mechanism:
      "Stimulates red blood cell production, increasing oxygen-carrying capacity and aerobic endurance. Thicker blood is the source of both the benefit and the danger.",
    benefits: [
      "Increases red cell mass and endurance/VO2max (basis of its doping use)",
    ],
    sideEffects: [
      "Raised blood viscosity → risk of clots, stroke, heart attack, and sudden death",
      "High blood pressure",
    ],
    contraindications: [
      "Prescription medication (for anemia); performance use is banned by WADA and dangerous",
      "Especially lethal combined with dehydration/endurance exertion",
    ],
    dosingNotes:
      "Approved dosing exists only for treating anemia under medical supervision with hematocrit monitoring. There is no safe performance-doping dose — misuse has caused athlete deaths.",
    goals: ["endurance", "performance"],
    evidenceLevel: "strong",
    citations: [
      {
        title: "Effects of erythropoietin abuse on exercise performance",
        authors: "Sgrò P, et al.",
        year: 2017,
        journal: "The Physician and Sportsmedicine",
        url: "https://doi.org/10.1080/00913847.2018.1402663",
        pmid: "29113535",
        doi: "10.1080/00913847.2018.1402663",
      },
    ],
    disclaimers: [
      "The endurance effect is real, and so is the danger: raising red-cell mass thickens blood and has caused fatal clots in athletes.",
    ],
    testimonials: [],  },
  {
    id: "insulin",
    name: "Insulin (performance misuse)",
    effects: {
      onset: "Blood sugar can crash within 15–60 minutes",
      whatToExpect: [
        "Drives glucose and nutrients into cells — the 'anabolic' effect bodybuilders misuse.",
        "In someone who doesn't need it, blood sugar can fall to dangerous levels fast.",
        "Warning signs of a crash: sweating, shakiness, confusion, palpitations — then seizures or coma.",
        "Also promotes fat gain and masks other problems; there is no safe 'performance' dose.",
      ],
    },
    reportedExperiences: [
      {
        theme: "Perceived 'fullness'",
        sentiment: "positive",
        summary:
          "Some misusers report muscle fullness/pumps — a dangerously thin upside that drives risky use.",
      },
      {
        theme: "Hypoglycemia near-misses",
        sentiment: "negative",
        summary:
          "Community threads are full of terrifying hypo episodes — waking up on the floor, needing sugar/help fast.",
      },
      {
        theme: "Fatalities",
        sentiment: "negative",
        summary:
          "The starkest theme: non-medical insulin use has killed people, sometimes within hours. This is among the most dangerous PED practices.",
      },
    ],
    aka: ["Exogenous insulin"],
    category: "hormone",
    summary:
      "A life-saving diabetes medication that is extremely dangerous when misused for muscle-building — hypoglycemia can kill within hours.",
    mechanism:
      "Drives glucose and amino acids into cells (anticatabolic/anabolic signaling), which is why some bodybuilders misuse it. In someone who doesn't need it, it can crash blood sugar to fatal levels.",
    benefits: [
      "Essential, evidence-based treatment for diabetes (its legitimate use)",
    ],
    sideEffects: [
      "Severe hypoglycemia: confusion, seizures, coma, and death — sometimes rapidly",
      "Fat gain; masks other problems",
    ],
    contraindications: [
      "Never use for performance without medical need — this is one of the most dangerous PED practices",
      "No 'harm-reduction dose' makes non-diabetic performance use safe",
    ],
    dosingNotes:
      "There is no safe performance dose. This entry exists to warn: non-medical insulin use has caused sudden deaths, and the margin for error is minutes-to-hours, not days.",
    goals: ["muscle"],
    evidenceLevel: "anecdotal",
    citations: [],
    disclaimers: [
      "Insulin is a legitimate medicine, but using it to build muscle without medical need is potentially fatal. If you or someone shows confusion/sweating/shakiness, treat for low blood sugar and seek emergency care immediately.",
    ],
    testimonials: [],  },
];

/** Validate seed content at module load so bad data fails fast in dev. */
export const COMPOUNDS: TCompound[] = RAW.map((c) => Compound.parse(c));

export function getCompound(id: string): TCompound | undefined {
  return COMPOUNDS.find((c) => c.id === id);
}

export function allGoals(): string[] {
  return Array.from(new Set(COMPOUNDS.flatMap((c) => c.goals))).sort();
}
