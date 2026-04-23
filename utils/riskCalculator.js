/**
 * ═══════════════════════════════════════════════════════════════
 * AI-Based Developmental Risk Calculator
 * ASQ-3 Aligned, Multi-Domain, Age-Normalized Scoring Engine
 * ═══════════════════════════════════════════════════════════════
 *
 * Domains: Gross Motor (GM), Fine Motor (FM), Language & Communication (LC),
 *          Cognitive (COG), Socio-Emotional (SE)
 *
 * Methodology:
 *   1. For each domain, check age-appropriate milestones
 *   2. Calculate raw score (achieved / expected)
 *   3. Convert to age-normalized percentile using ASQ-3 cutoff tables
 *   4. Assign domain-level risk: on_track / monitor / at_risk / delayed
 *   5. Compute weighted composite score
 *   6. Determine overall risk level with confidence interval
 *
 * Reference: ASQ-3 (Ages & Stages Questionnaire, Third Edition)
 *            DASII (Developmental Assessment Scale for Indian Infants)
 */

// ═══════════════════════════════════════════════════════════════
// SECTION 1: AGE-NORMALIZED MILESTONE DATABASE
// ═══════════════════════════════════════════════════════════════
//
// Each age band defines expected milestones per domain.
// Based on ASQ-3 intervals + DASII normative data for Indian children.
// Key: ageMin/ageMax in months, milestones per domain

const MILESTONE_DATABASE = {
  // ─── 0-6 months ───
  "0-6": {
    ageMin: 0,
    ageMax: 6,
    grossMotor: [
      { id: "gm_0_1", text: "Holds head steady when held upright", criticalFlag: true },
      { id: "gm_0_2", text: "Pushes up on arms when on tummy" },
      { id: "gm_0_3", text: "Rolls from tummy to back" },
      { id: "gm_0_4", text: "Brings hands to midline" },
    ],
    fineMotor: [
      { id: "fm_0_1", text: "Grasps rattle when placed in hand" },
      { id: "fm_0_2", text: "Reaches for objects" },
      { id: "fm_0_3", text: "Transfers objects hand to hand" },
    ],
    language: [
      { id: "lc_0_1", text: "Turns toward sounds" },
      { id: "lc_0_2", text: "Makes cooing/babbling sounds" },
      { id: "lc_0_3", text: "Responds to own name" },
    ],
    cognitive: [
      { id: "cog_0_1", text: "Follows moving objects with eyes" },
      { id: "cog_0_2", text: "Recognizes familiar faces" },
      { id: "cog_0_3", text: "Shows interest in mirror reflection" },
    ],
    socioEmotional: [
      { id: "se_0_1", text: "Social smile in response to faces" },
      { id: "se_0_2", text: "Shows distress when caregiver leaves" },
      { id: "se_0_3", text: "Enjoys being held and cuddled" },
    ],
  },

  // ─── 7-12 months ───
  "7-12": {
    ageMin: 7,
    ageMax: 12,
    grossMotor: [
      { id: "gm_7_1", text: "Sits without support", criticalFlag: true },
      { id: "gm_7_2", text: "Pulls to standing" },
      { id: "gm_7_3", text: "Crawls on hands and knees" },
      { id: "gm_7_4", text: "Cruises along furniture" },
      { id: "gm_7_5", text: "Takes steps with support" },
    ],
    fineMotor: [
      { id: "fm_7_1", text: "Uses pincer grasp (thumb and finger)" },
      { id: "fm_7_2", text: "Picks up small objects" },
      { id: "fm_7_3", text: "Bangs two objects together" },
      { id: "fm_7_4", text: "Puts objects in container" },
    ],
    language: [
      { id: "lc_7_1", text: "Babbles with consonant sounds (ba, da, ma)" },
      { id: "lc_7_2", text: "Responds to simple requests with gestures" },
      { id: "lc_7_3", text: "Says first word (mama/dada with meaning)", criticalFlag: true },
      { id: "lc_7_4", text: "Points to objects of interest" },
    ],
    cognitive: [
      { id: "cog_7_1", text: "Looks for hidden objects (object permanence)" },
      { id: "cog_7_2", text: "Explores objects by shaking, banging" },
      { id: "cog_7_3", text: "Imitates simple actions" },
    ],
    socioEmotional: [
      { id: "se_7_1", text: "Shows stranger anxiety" },
      { id: "se_7_2", text: "Plays peek-a-boo" },
      { id: "se_7_3", text: "Shows preference for certain toys" },
    ],
  },

  // ─── 13-24 months ───
  "13-24": {
    ageMin: 13,
    ageMax: 24,
    grossMotor: [
      { id: "gm_13_1", text: "Walks independently", criticalFlag: true },
      { id: "gm_13_2", text: "Walks backwards" },
      { id: "gm_13_3", text: "Climbs stairs with support" },
      { id: "gm_13_4", text: "Kicks a ball forward" },
      { id: "gm_13_5", text: "Runs with coordination" },
    ],
    fineMotor: [
      { id: "fm_13_1", text: "Stacks 3-4 blocks" },
      { id: "fm_13_2", text: "Scribbles with crayon" },
      { id: "fm_13_3", text: "Turns pages of a book" },
      { id: "fm_13_4", text: "Uses spoon to eat (with spilling)" },
    ],
    language: [
      { id: "lc_13_1", text: "Uses 10+ single words", criticalFlag: true },
      { id: "lc_13_2", text: "Points to body parts when named" },
      { id: "lc_13_3", text: "Follows simple instructions" },
      { id: "lc_13_4", text: "Begins 2-word phrases by 24 months" },
      { id: "lc_13_5", text: "Names familiar objects" },
    ],
    cognitive: [
      { id: "cog_13_1", text: "Sorts shapes and colors" },
      { id: "cog_13_2", text: "Begins pretend play" },
      { id: "cog_13_3", text: "Completes simple puzzles (2-3 pieces)" },
      { id: "cog_13_4", text: "Follows 2-step instructions" },
    ],
    socioEmotional: [
      { id: "se_13_1", text: "Shows independence (says 'no')" },
      { id: "se_13_2", text: "Plays alongside other children" },
      { id: "se_13_3", text: "Shows affection to familiar people" },
      { id: "se_13_4", text: "Shows ownership of toys" },
    ],
  },

  // ─── 25-36 months ───
  "25-36": {
    ageMin: 25,
    ageMax: 36,
    grossMotor: [
      { id: "gm_25_1", text: "Runs well without falling" },
      { id: "gm_25_2", text: "Jumps with both feet off ground" },
      { id: "gm_25_3", text: "Climbs stairs alternating feet" },
      { id: "gm_25_4", text: "Pedals tricycle" },
      { id: "gm_25_5", text: "Stands on one foot briefly" },
    ],
    fineMotor: [
      { id: "fm_25_1", text: "Stacks 6+ blocks" },
      { id: "fm_25_2", text: "Copies a vertical line" },
      { id: "fm_25_3", text: "Uses scissors with help" },
      { id: "fm_25_4", text: "Strings large beads" },
      { id: "fm_25_5", text: "Turns door knobs" },
    ],
    language: [
      { id: "lc_25_1", text: "Uses 200+ words", criticalFlag: true },
      { id: "lc_25_2", text: "Speaks in 3-4 word sentences" },
      { id: "lc_25_3", text: "Strangers understand most speech" },
      { id: "lc_25_4", text: "Asks 'what' and 'where' questions" },
      { id: "lc_25_5", text: "Knows first name, age, gender" },
    ],
    cognitive: [
      { id: "cog_25_1", text: "Matches objects to pictures" },
      { id: "cog_25_2", text: "Sorts objects by shape and color" },
      { id: "cog_25_3", text: "Engages in multi-step pretend play" },
      { id: "cog_25_4", text: "Understands concept of 'two'" },
    ],
    socioEmotional: [
      { id: "se_25_1", text: "Takes turns in games" },
      { id: "se_25_2", text: "Shows concern for crying friend" },
      { id: "se_25_3", text: "Expresses wide range of emotions" },
      { id: "se_25_4", text: "Separates from parents without major distress" },
    ],
  },

  // ─── 37-48 months ───
  "37-48": {
    ageMin: 37,
    ageMax: 48,
    grossMotor: [
      { id: "gm_37_1", text: "Hops on one foot" },
      { id: "gm_37_2", text: "Catches a bounced ball" },
      { id: "gm_37_3", text: "Walks up stairs without holding rail" },
      { id: "gm_37_4", text: "Moves forward and backward with agility" },
    ],
    fineMotor: [
      { id: "fm_37_1", text: "Copies a circle" },
      { id: "fm_37_2", text: "Uses scissors to cut straight line" },
      { id: "fm_37_3", text: "Draws a person with 2-4 body parts" },
      { id: "fm_37_4", text: "Buttons and unbuttons clothing" },
    ],
    language: [
      { id: "lc_37_1", text: "Speaks in 5-6 word sentences" },
      { id: "lc_37_2", text: "Tells stories" },
      { id: "lc_37_3", text: "Understands 'same' and 'different'" },
      { id: "lc_37_4", text: "Uses grammar correctly most of the time" },
    ],
    cognitive: [
      { id: "cog_37_1", text: "Counts to 10" },
      { id: "cog_37_2", text: "Names some colors and numbers" },
      { id: "cog_37_3", text: "Understands concept of time (morning, night)" },
      { id: "cog_37_4", text: "Completes 4+ piece puzzles" },
    ],
    socioEmotional: [
      { id: "se_37_1", text: "Plays cooperatively with other children" },
      { id: "se_37_2", text: "Prefers playing with others over alone" },
      { id: "se_37_3", text: "Negotiates solutions to conflicts" },
      { id: "se_37_4", text: "Shows understanding of right and wrong" },
    ],
  },

  // ─── 49-72 months ───
  "49-72": {
    ageMin: 49,
    ageMax: 72,
    grossMotor: [
      { id: "gm_49_1", text: "Skips and hops with coordination" },
      { id: "gm_49_2", text: "Rides a bicycle with training wheels" },
      { id: "gm_49_3", text: "Balances on one foot for 10+ seconds" },
      { id: "gm_49_4", text: "Throws and catches a ball well" },
    ],
    fineMotor: [
      { id: "fm_49_1", text: "Writes some letters and numbers" },
      { id: "fm_49_2", text: "Copies a triangle and square" },
      { id: "fm_49_3", text: "Uses fork, knife with supervision" },
      { id: "fm_49_4", text: "Ties shoelaces with help" },
    ],
    language: [
      { id: "lc_49_1", text: "Speaks clearly in complex sentences" },
      { id: "lc_49_2", text: "Tells a connected story with full plot" },
      { id: "lc_49_3", text: "Uses future tense correctly" },
      { id: "lc_49_4", text: "Knows address and phone number" },
    ],
    cognitive: [
      { id: "cog_49_1", text: "Counts to 20+" },
      { id: "cog_49_2", text: "Understands concept of money" },
      { id: "cog_49_3", text: "Names all colors" },
      { id: "cog_49_4", text: "Understands sequences (first, second, third)" },
    ],
    socioEmotional: [
      { id: "se_49_1", text: "Shows empathy and caring" },
      { id: "se_49_2", text: "Follows rules in group games" },
      { id: "se_49_3", text: "Distinguishes fantasy from reality" },
      { id: "se_49_4", text: "Shows increasing independence" },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════
// SECTION 2: ASQ-3 CUTOFF THRESHOLDS
// ═══════════════════════════════════════════════════════════════
//
// Percentile cutoffs for risk classification.
// Based on ASQ-3 scoring: scores below cutoff = referral zone
// Adapted with DASII adjustments for Indian normative data
//
// Each value = minimum percentile to be in that category

const RISK_THRESHOLDS = {
  on_track: 40,   // >= 40th percentile: developing normally
  monitor: 25,    // 25-39th percentile: needs monitoring
  at_risk: 10,    // 10-24th percentile: at risk, recommend intervention
  delayed: 0,     //  < 10th percentile: significant delay, urgent referral
};

// Domain weights for composite score (language weighted highest
// as PPT shows 22.8% language delays — the most prevalent domain)
const DOMAIN_WEIGHTS = {
  grossMotor: 0.18,
  fineMotor: 0.17,
  language: 0.25,
  cognitive: 0.22,
  socioEmotional: 0.18,
};

// ═══════════════════════════════════════════════════════════════
// SECTION 3: CORE CALCULATION ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * Get the appropriate age band key for a child's age in months
 */
function getAgeBand(ageInMonths) {
  if (ageInMonths <= 6) return "0-6";
  if (ageInMonths <= 12) return "7-12";
  if (ageInMonths <= 24) return "13-24";
  if (ageInMonths <= 36) return "25-36";
  if (ageInMonths <= 48) return "37-48";
  return "49-72";
}

/**
 * Get readable age band label
 */
function getAgeBandLabel(ageInMonths) {
  if (ageInMonths <= 12) return "0-12 mo";
  if (ageInMonths <= 24) return "13-24 mo";
  if (ageInMonths <= 36) return "25-36 mo";
  if (ageInMonths <= 48) return "37-48 mo";
  if (ageInMonths <= 60) return "49-60 mo";
  return "61-72 mo";
}

/**
 * Convert raw score to age-normalized percentile.
 *
 * Uses a simplified normative distribution model:
 * - Raw score (% milestones achieved) is mapped to a bell curve
 * - Accounts for the fact that in LMICs, average achievement is
 *   slightly lower due to environmental factors
 *
 * In production, this would use actual ASQ-3 normative tables.
 * This approximation is suitable for MVP / academic demo.
 */
function rawToPercentile(rawScore, ageInMonths) {
  // Age-adjustment factor: younger children have more variance
  const ageVarianceFactor = ageInMonths <= 12 ? 1.15 : ageInMonths <= 24 ? 1.1 : 1.0;

  // DASII adjustment for Indian normative context
  // Indian norms show ~5-8% lower baseline compared to Western ASQ-3 norms
  const dasiiAdjustment = 5;

  // Map raw score (0-100) to percentile using logistic approximation
  const adjustedScore = rawScore * ageVarianceFactor + dasiiAdjustment;
  const percentile = 100 / (1 + Math.exp(-0.1 * (adjustedScore - 50)));

  return Math.round(Math.min(100, Math.max(0, percentile)));
}

/**
 * Calculate z-score from percentile
 * Using Abramowitz and Stegun approximation for inverse normal
 */
function percentileToZScore(percentile) {
  if (percentile <= 0) return -3.0;
  if (percentile >= 100) return 3.0;

  const p = percentile / 100;
  // Rational approximation
  const a = p < 0.5 ? p : 1 - p;
  const t = Math.sqrt(-2 * Math.log(a));
  const c0 = 2.515517,
    c1 = 0.802853,
    c2 = 0.010328;
  const d1 = 1.432788,
    d2 = 0.189269,
    d3 = 0.001308;
  let z = t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t);
  if (p < 0.5) z = -z;

  return Math.round(z * 100) / 100;
}

/**
 * Determine domain-level risk from percentile
 */
function classifyDomainRisk(percentile) {
  if (percentile >= RISK_THRESHOLDS.on_track) return "on_track";
  if (percentile >= RISK_THRESHOLDS.monitor) return "monitor";
  if (percentile >= RISK_THRESHOLDS.at_risk) return "at_risk";
  return "delayed";
}

/**
 * Calculate confidence based on data completeness and screening history
 *
 * Factors:
 *   - How many domains were assessed (more = higher confidence)
 *   - How many milestones were checked per domain
 *   - Number of prior screenings for this child
 *   - Whether critical milestones were included
 */
function calculateConfidence(assessments, screeningCount = 1) {
  // Factor 1: Domain coverage (all 5 domains = max)
  const domainCoverage = assessments.length / 5;

  // Factor 2: Average milestone coverage per domain
  const avgMilestoneCoverage =
    assessments.reduce((sum, a) => {
      const expected = a.milestonesExpected || 1;
      const checked = (a.milestoneDetails || []).length / expected;
      return sum + Math.min(1, checked);
    }, 0) / Math.max(1, assessments.length);

  // Factor 3: Screening history (more screenings = more reliable)
  const historyFactor = Math.min(1, 0.4 + screeningCount * 0.15);

  // Factor 4: Critical milestone inclusion
  const hasCriticalMilestones = assessments.some((a) =>
    (a.milestoneDetails || []).some((m) => m.criticalFlag)
  );
  const criticalFactor = hasCriticalMilestones ? 1.0 : 0.85;

  const confidence =
    domainCoverage * 0.3 +
    avgMilestoneCoverage * 0.3 +
    historyFactor * 0.25 +
    criticalFactor * 0.15;

  return Math.round(Math.min(1, Math.max(0, confidence)) * 100) / 100;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 4: MAIN RISK ASSESSMENT FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Perform a complete developmental risk assessment.
 *
 * @param {Object} screeningData
 * @param {number} screeningData.ageInMonths - Child's age in months
 * @param {Object} screeningData.domains - Milestone results per domain
 *   Each domain key maps to an array of { milestoneId, achieved, notes? }
 *   Example:
 *   {
 *     grossMotor: [
 *       { milestoneId: "gm_13_1", achieved: true },
 *       { milestoneId: "gm_13_2", achieved: false, notes: "Needs support" },
 *     ],
 *     language: [ ... ],
 *   }
 * @param {Object} [screeningData.anthropometrics] - Optional weight/height data
 * @param {number} [screeningCount=1] - How many times this child has been screened
 *
 * @returns {Object} Complete risk assessment result
 */
function calculateRisk(screeningData, screeningCount = 1) {
  const { ageInMonths, domains, anthropometrics } = screeningData;

  if (!ageInMonths || ageInMonths < 0 || ageInMonths > 72) {
    throw new Error("Age must be between 0 and 72 months");
  }

  const ageBand = getAgeBand(ageInMonths);
  const milestoneDB = MILESTONE_DATABASE[ageBand];

  if (!milestoneDB) {
    throw new Error(`No milestone data for age band: ${ageBand}`);
  }

  const domainKeys = [
    "grossMotor",
    "fineMotor",
    "language",
    "cognitive",
    "socioEmotional",
  ];

  const assessments = [];
  const domainScores = {};
  const flaggedDomains = [];

  // ─── Assess each domain ───
  for (const domain of domainKeys) {
    const expectedMilestones = milestoneDB[domain] || [];
    const reportedResults = (domains && domains[domain]) || [];

    // Match reported results to expected milestones
    let achieved = 0;
    const milestoneDetails = [];

    for (const expected of expectedMilestones) {
      const reported = reportedResults.find(
        (r) => r.milestoneId === expected.id
      );
      const wasAchieved = reported ? reported.achieved : false;

      if (wasAchieved) achieved++;

      milestoneDetails.push({
        milestone: expected.text,
        achieved: wasAchieved,
        criticalFlag: expected.criticalFlag || false,
        notes: reported ? reported.notes : "",
      });
    }

    // Calculate scores
    const rawScore =
      expectedMilestones.length > 0
        ? (achieved / expectedMilestones.length) * 100
        : 0;
    const percentile = rawToPercentile(rawScore, ageInMonths);
    const zScore = percentileToZScore(percentile);
    const domainRisk = classifyDomainRisk(percentile);

    // Check for critical milestone failures
    const criticalFailures = milestoneDetails.filter(
      (m) => m.criticalFlag && !m.achieved
    );
    const adjustedRisk =
      criticalFailures.length > 0 && domainRisk === "monitor"
        ? "at_risk" // Upgrade risk if critical milestones are missed
        : domainRisk;

    const assessment = {
      domain,
      milestonesExpected: expectedMilestones.length,
      milestonesAchieved: achieved,
      milestoneDetails,
      rawScore: Math.round(rawScore * 10) / 10,
      percentile,
      zScore,
      domainRisk: adjustedRisk,
    };

    assessments.push(assessment);
    domainScores[domain] = percentile;

    if (adjustedRisk === "at_risk" || adjustedRisk === "delayed") {
      flaggedDomains.push(domain);
    }
  }

  // ─── Compute weighted composite score ───
  let compositeScore = 0;
  for (const domain of domainKeys) {
    compositeScore += (domainScores[domain] || 0) * DOMAIN_WEIGHTS[domain];
  }
  compositeScore = Math.round(compositeScore * 10) / 10;

  // ─── Apply anthropometric risk modifier ───
  let anthropometricPenalty = 0;
  if (anthropometrics) {
    if (
      anthropometrics.weightForAge === "severely_underweight" ||
      anthropometrics.heightForAge === "severely_stunted"
    ) {
      anthropometricPenalty = 10;
    } else if (
      anthropometrics.weightForAge === "underweight" ||
      anthropometrics.heightForAge === "stunted"
    ) {
      anthropometricPenalty = 5;
    }
    if (anthropometrics.weightForHeight === "severely_wasted") {
      anthropometricPenalty += 8;
    }
  }

  compositeScore = Math.max(0, compositeScore - anthropometricPenalty);

  // ─── Determine overall risk level ───
  let riskLevel;
  if (compositeScore >= 40 && flaggedDomains.length === 0) {
    riskLevel = "low";
  } else if (compositeScore >= 30 && flaggedDomains.length <= 1) {
    riskLevel = "moderate";
  } else if (compositeScore >= 15 || flaggedDomains.length <= 2) {
    riskLevel = "high";
  } else {
    riskLevel = "critical";
  }

  // Override: if any domain is "delayed", minimum risk = "high"
  if (
    assessments.some((a) => a.domainRisk === "delayed") &&
    riskLevel === "moderate"
  ) {
    riskLevel = "high";
  }

  // Override: if 3+ domains flagged, minimum risk = "critical"
  if (flaggedDomains.length >= 3) {
    riskLevel = "critical";
  }

  // ─── Calculate confidence ───
  const confidence = calculateConfidence(assessments, screeningCount);

  // ─── Determine referral needs ───
  const requiresReferral = riskLevel === "high" || riskLevel === "critical";
  let referralUrgency = "none";
  if (riskLevel === "critical") referralUrgency = "emergency";
  else if (riskLevel === "high") referralUrgency = "urgent";
  else if (riskLevel === "moderate" && flaggedDomains.length > 0)
    referralUrgency = "routine";

  // ─── Determine specialist referral type ───
  let referredTo = null;
  if (requiresReferral) {
    if (flaggedDomains.includes("language")) {
      referredTo = "Speech-Language Pathologist";
    } else if (
      flaggedDomains.includes("grossMotor") ||
      flaggedDomains.includes("fineMotor")
    ) {
      referredTo = "Occupational Therapist";
    } else if (flaggedDomains.includes("cognitive")) {
      referredTo = "Developmental Pediatrician";
    } else if (flaggedDomains.includes("socioEmotional")) {
      referredTo = "Child Psychologist";
    } else {
      referredTo = "Pediatrician";
    }
  }

  return {
    // ─── Summary ───
    riskLevel,
    compositeScore,
    confidence,

    // ─── Domain Details ───
    domainScores,
    flaggedDomains,
    assessments,

    // ─── Referral Recommendation ───
    requiresReferral,
    referralUrgency,
    referredTo,

    // ─── Metadata ───
    ageBand: getAgeBandLabel(ageInMonths),
    ageInMonths,
    screeningTool: "asq3",
    assessedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════
// SECTION 5: QUICK SCREENING (Backward-compatible simplified mode)
// ═══════════════════════════════════════════════════════════════
//
// For cases where full milestone-by-milestone data isn't available
// (e.g., quick AWW field screening with limited data points).
// This maintains backward compatibility with your teammate's
// original code while adding age-normalization.

function calculateRiskQuick(child) {
  const { age, weight, speechDelay, motorSkills, height } = child;

  // Estimate age in months (if 'age' is in years, convert)
  const ageInMonths = age < 10 ? age * 12 : age;

  // Build simplified domain signals
  const domains = {};

  // Gross Motor quick check
  const ageBand = getAgeBand(ageInMonths);
  const milestones = MILESTONE_DATABASE[ageBand];
  if (milestones) {
    // Assign first milestone as achieved/not based on motorSkills
    domains.grossMotor = milestones.grossMotor.map((m, i) => ({
      milestoneId: m.id,
      achieved: motorSkills !== "Poor" ? i < milestones.grossMotor.length - 1 : i < 1,
    }));

    // Language quick check based on speechDelay flag
    domains.language = milestones.language.map((m, i) => ({
      milestoneId: m.id,
      achieved: !speechDelay ? true : i === 0,
    }));

    // Default other domains to mostly on-track (since we have no data)
    domains.fineMotor = milestones.fineMotor.map((m) => ({
      milestoneId: m.id,
      achieved: true,
    }));
    domains.cognitive = milestones.cognitive.map((m) => ({
      milestoneId: m.id,
      achieved: true,
    }));
    domains.socioEmotional = milestones.socioEmotional.map((m) => ({
      milestoneId: m.id,
      achieved: true,
    }));
  }

  // Build anthropometric context
  const anthropometrics = {};
  if (weight && ageInMonths) {
    // Simplified weight-for-age check
    const expectedWeight = 3 + ageInMonths * 0.5; // Very rough approximation
    if (weight < expectedWeight * 0.6) {
      anthropometrics.weightForAge = "severely_underweight";
    } else if (weight < expectedWeight * 0.8) {
      anthropometrics.weightForAge = "underweight";
    } else {
      anthropometrics.weightForAge = "normal";
    }
  }

  return calculateRisk({ ageInMonths, domains, anthropometrics }, 1);
}

// ═══════════════════════════════════════════════════════════════
// SECTION 6: UTILITY EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  calculateRisk,
  calculateRiskQuick,
  getAgeBand,
  getAgeBandLabel,
  MILESTONE_DATABASE,
  DOMAIN_WEIGHTS,
  RISK_THRESHOLDS,
};
