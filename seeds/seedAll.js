/**
 * ═══════════════════════════════════════════════════════════════
 * ICDS Data Seeder
 * Generates realistic demo data for all Andhra Pradesh districts
 * matching the statistics shown in the PPT presentation
 * ═══════════════════════════════════════════════════════════════
 *
 * Usage: npm run seed
 */

require("dotenv").config();
const mongoose = require("mongoose");
const { connectMongo, connectPostgres } = require("../config/db");
const Child = require("../models/Child");
const ScreeningRecord = require("../models/ScreeningRecord");
const Referral = require("../models/Referral");
const AnganwadiCentre = require("../models/AnganwadiCentre");
const User = require("../models/User");
const { calculateRisk, MILESTONE_DATABASE, getAgeBand } = require("../utils/riskCalculator");

// ═══════════════════════════════════════════════════════════════
// AP District Data (aligned with PPT slide 5 & 9)
// ═══════════════════════════════════════════════════════════════

const AP_DISTRICTS = [
  { name: "Visakhapatnam", awcCount: 612, coverage: 81, riskPercent: 11, riskScore: 45, lat: 17.6868, lng: 83.2185 },
  { name: "Guntur", awcCount: 524, coverage: 76, riskPercent: 16, riskScore: 58, lat: 16.3067, lng: 80.4365 },
  { name: "Krishna", awcCount: 487, coverage: 84, riskPercent: 9, riskScore: 38, lat: 16.6100, lng: 80.7214 },
  { name: "Nellore", awcCount: 398, coverage: 68, riskPercent: 21, riskScore: 61, lat: 14.4426, lng: 79.9865 },
  { name: "Kurnool", awcCount: 412, coverage: 72, riskPercent: 18, riskScore: 87, lat: 15.8281, lng: 78.0373 },
  { name: "Eluru", awcCount: 356, coverage: 79, riskPercent: 13, riskScore: 52, lat: 16.7107, lng: 81.0952 },
  { name: "Kakinada", awcCount: 310, coverage: 86, riskPercent: 8, riskScore: 35, lat: 16.9891, lng: 82.2475 },
  { name: "Anantapur", awcCount: 380, coverage: 65, riskPercent: 24, riskScore: 82, lat: 14.6819, lng: 77.6006 },
  { name: "Prakasam", awcCount: 345, coverage: 70, riskPercent: 19, riskScore: 74, lat: 15.3647, lng: 79.4800 },
  { name: "Kadapa", awcCount: 290, coverage: 73, riskPercent: 17, riskScore: 68, lat: 14.4674, lng: 78.8241 },
  { name: "Vizianagaram", awcCount: 265, coverage: 69, riskPercent: 20, riskScore: 63, lat: 18.1067, lng: 83.3956 },
  { name: "Srikakulam", awcCount: 240, coverage: 71, riskPercent: 15, riskScore: 55, lat: 18.2949, lng: 83.8938 },
  { name: "Chittoor", awcCount: 420, coverage: 77, riskPercent: 14, riskScore: 50, lat: 13.2172, lng: 79.1003 },
];

const MANDALS_BY_DISTRICT = {
  Visakhapatnam: ["Anakapalle", "Bheemunipatnam", "Gajuwaka", "Pendurthi", "Chodavaram"],
  Guntur: ["Tenali", "Mangalagiri", "Narasaraopet", "Bapatla", "Sattenapalli"],
  Krishna: ["Vijayawada", "Machilipatnam", "Gudivada", "Nuzvid", "Jaggaiahpet"],
  Nellore: ["Kavali", "Gudur", "Atmakur", "Kovur", "Allur"],
  Kurnool: ["Adoni", "Yemmiganur", "Nandyal", "Dhone", "Allagadda"],
  Eluru: ["Jangareddygudem", "Chintalapudi", "Nidadavolu", "Tadepalligudem", "Kovvur"],
  Kakinada: ["Peddapuram", "Samalkot", "Tuni", "Gollaprolu", "Prathipadu"],
  Anantapur: ["Dharmavaram", "Hindupur", "Guntakal", "Tadpatri", "Kalyanadurgam"],
  Prakasam: ["Ongole", "Markapur", "Chirala", "Kandukur", "Darsi"],
  Kadapa: ["Proddatur", "Rajampet", "Mydukur", "Jammalamadugu", "Pulivendla"],
  Vizianagaram: ["Parvathipuram", "Bobbili", "Nellimarla", "Salur", "Rajam"],
  Srikakulam: ["Palasa", "Tekkali", "Narasannapeta", "Amadalavalasa", "Ichapuram"],
  Chittoor: ["Tirupati", "Madanapalle", "Srikalahasti", "Punganur", "Palamaner"],
};

const FIRST_NAMES_MALE = [
  "Aarav", "Advaith", "Arjun", "Bhargav", "Charan", "Dhruv", "Ganesh", "Hari",
  "Ishaan", "Jayesh", "Karthik", "Lakshman", "Manish", "Nikhil", "Om", "Pranav",
  "Ravi", "Sai", "Tarun", "Varun", "Yashwanth", "Aditya", "Devansh", "Gopal",
];

const FIRST_NAMES_FEMALE = [
  "Ananya", "Bhavana", "Charitha", "Divya", "Eswar", "Fathima", "Gayathri", "Harika",
  "Ishita", "Jyothi", "Kavya", "Lakshmi", "Meena", "Nandini", "Oviya", "Priya",
  "Rani", "Sravani", "Tanvi", "Uma", "Varsha", "Yamini", "Zara", "Deepika",
];

const LAST_NAMES = [
  "Reddy", "Naidu", "Rao", "Sharma", "Kumar", "Babu", "Gupta", "Prasad",
  "Singh", "Das", "Patel", "Varma", "Chowdary", "Goud", "Raju", "Mohan",
];

// ═══════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

function randomDate(startMonths, endMonths) {
  // Returns a date that is between startMonths and endMonths ago
  const now = new Date();
  const months = randomBetween(startMonths, endMonths);
  return new Date(now.getFullYear(), now.getMonth() - months, randomBetween(1, 28));
}

function generatePhone() {
  return `+91${randomBetween(7000000000, 9999999999)}`;
}

function jitter(lat, lng, radiusKm = 15) {
  // Add random offset within radius
  const latOffset = (Math.random() - 0.5) * (radiusKm / 111);
  const lngOffset = (Math.random() - 0.5) * (radiusKm / (111 * Math.cos((lat * Math.PI) / 180)));
  return {
    lat: Math.round((lat + latOffset) * 10000000) / 10000000,
    lng: Math.round((lng + lngOffset) * 10000000) / 10000000,
  };
}

// ═══════════════════════════════════════════════════════════════
// Seeder Functions
// ═══════════════════════════════════════════════════════════════

async function seedUsers() {
  console.log("\n🔹 Seeding Users...");

  const users = [];

  // Admin
  users.push({
    name: "System Admin",
    email: "admin@icds-ap.gov.in",
    phone: "+919999999999",
    password: "admin123",
    role: "admin",
    district: "Visakhapatnam",
    isActive: true,
    trainingCompleted: true,
    trainingMode: "physical",
  });

  // CDPOs (1-2 per district)
  for (const dist of AP_DISTRICTS) {
    users.push({
      name: `CDPO ${dist.name}`,
      email: `cdpo.${dist.name.toLowerCase().replace(/\s/g, "")}@icds-ap.gov.in`,
      phone: generatePhone(),
      password: "cdpo123",
      role: "cdpo",
      district: dist.name,
      isActive: true,
      trainingCompleted: Math.random() > 0.08,
      trainingMode: randomPick(["physical", "virtual", "hybrid"]),
    });
  }

  // Supervisors (3-5 per district)
  for (const dist of AP_DISTRICTS) {
    const mandals = MANDALS_BY_DISTRICT[dist.name] || [];
    for (let i = 0; i < Math.min(mandals.length, randomBetween(3, 5)); i++) {
      users.push({
        name: `Supervisor ${mandals[i]}`,
        email: `sup.${mandals[i].toLowerCase().replace(/\s/g, "")}@icds-ap.gov.in`,
        phone: generatePhone(),
        password: "sup123",
        role: "supervisor",
        district: dist.name,
        mandal: mandals[i],
        isActive: true,
        trainingCompleted: Math.random() > 0.07,
        trainingMode: randomPick(["physical", "virtual", "hybrid"]),
      });
    }
  }

  // AWWs (scale down: 5-10 per district for demo)
  for (const dist of AP_DISTRICTS) {
    const mandals = MANDALS_BY_DISTRICT[dist.name] || [];
    for (let i = 0; i < randomBetween(5, 10); i++) {
      const mandal = randomPick(mandals);
      users.push({
        name: `${randomPick(FIRST_NAMES_FEMALE)} ${randomPick(LAST_NAMES)}`,
        email: `aww.${dist.name.toLowerCase().slice(0, 3)}.${i + 1}@icds-ap.gov.in`,
        phone: generatePhone(),
        password: "aww123",
        role: "aww",
        district: dist.name,
        mandal,
        isActive: true,
        trainingCompleted: Math.random() > 0.24, // ~75.6% trained per PPT
        trainingMode: randomPick(["physical", "virtual", "hybrid", "none"]),
      });
    }
  }

  // ANMs and ASHAs (fewer, for workforce table)
  for (const dist of AP_DISTRICTS) {
    for (let i = 0; i < randomBetween(2, 4); i++) {
      users.push({
        name: `${randomPick(FIRST_NAMES_FEMALE)} ${randomPick(LAST_NAMES)}`,
        email: `anm.${dist.name.toLowerCase().slice(0, 3)}.${i + 1}@icds-ap.gov.in`,
        phone: generatePhone(),
        password: "anm123",
        role: "anm",
        district: dist.name,
        isActive: true,
        trainingCompleted: Math.random() > 0.27, // ~73.4%
        trainingMode: randomPick(["physical", "virtual", "hybrid", "none"]),
      });
    }
    for (let i = 0; i < randomBetween(3, 6); i++) {
      users.push({
        name: `${randomPick(FIRST_NAMES_FEMALE)} ${randomPick(LAST_NAMES)}`,
        email: `asha.${dist.name.toLowerCase().slice(0, 3)}.${i + 1}@icds-ap.gov.in`,
        phone: generatePhone(),
        password: "asha123",
        role: "asha",
        district: dist.name,
        isActive: true,
        trainingCompleted: Math.random() > 0.37, // ~62.7%
        trainingMode: randomPick(["physical", "virtual", "hybrid", "none"]),
      });
    }
  }

  await User.bulkCreate(users, { ignoreDuplicates: true });
  console.log(`   ✅ Created ${users.length} users`);
  return await User.findAll();
}

async function seedCentres(users) {
  console.log("\n🔹 Seeding Anganwadi Centres...");

  const awws = users.filter((u) => u.role === "aww");
  const supervisors = users.filter((u) => u.role === "supervisor");
  const centres = [];

  for (const dist of AP_DISTRICTS) {
    const mandals = MANDALS_BY_DISTRICT[dist.name] || [];
    // Create 8-15 centres per district (scaled down for demo)
    const centreCount = randomBetween(8, 15);

    for (let i = 0; i < centreCount; i++) {
      const mandal = mandals[i % mandals.length];
      const pos = jitter(dist.lat, dist.lng);
      const distAwws = awws.filter((u) => u.district === dist.name);
      const distSups = supervisors.filter((u) => u.district === dist.name);

      centres.push({
        centreCode: `AWC-${dist.name.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(4, "0")}`,
        name: `${mandal} AWC ${i + 1}`,
        state: "Andhra Pradesh",
        district: dist.name,
        mandal,
        village: `Village ${randomBetween(1, 20)}`,
        latitude: pos.lat,
        longitude: pos.lng,
        capacity: randomBetween(30, 60),
        currentEnrollment: randomBetween(15, 50),
        isActive: true,
        assignedAwwId: distAwws.length > 0 ? randomPick(distAwws).id : null,
        assignedSupervisorId: distSups.length > 0 ? randomPick(distSups).id : null,
        screeningCoverage: randomFloat(dist.coverage - 15, Math.min(100, dist.coverage + 10)),
        riskScore: randomFloat(dist.riskScore - 20, Math.min(100, dist.riskScore + 15)),
        riskLevel:
          dist.riskScore >= 75
            ? randomPick(["high", "critical", "high"])
            : dist.riskScore >= 50
              ? randomPick(["moderate", "high", "moderate"])
              : randomPick(["low", "moderate", "low"]),
      });
    }
  }

  await AnganwadiCentre.bulkCreate(centres, { ignoreDuplicates: true });
  console.log(`   ✅ Created ${centres.length} Anganwadi Centres`);
  return await AnganwadiCentre.findAll();
}

async function seedChildren(centres, users) {
  console.log("\n🔹 Seeding Children...");

  const awws = users.filter((u) => u.role === "aww");
  let totalChildren = 0;

  for (const centre of centres) {
    const childCount = randomBetween(10, 30);

    for (let i = 0; i < childCount; i++) {
      const gender = Math.random() > 0.48 ? "male" : "female";
      const firstName =
        gender === "male" ? randomPick(FIRST_NAMES_MALE) : randomPick(FIRST_NAMES_FEMALE);
      const lastName = randomPick(LAST_NAMES);

      // Age: 0-72 months (distributed across age bands)
      const ageMonths = randomBetween(1, 72);
      const dob = new Date();
      dob.setMonth(dob.getMonth() - ageMonths);
      dob.setDate(randomBetween(1, 28));

      // Determine risk level based on district risk profile
      const distData = AP_DISTRICTS.find((d) => d.name === centre.district);
      const isAtRisk = Math.random() * 100 < (distData ? distData.riskPercent : 15);

      // Generate risk profile
      const riskLevel = isAtRisk
        ? Math.random() > 0.6
          ? "critical"
          : "high"
        : Math.random() > 0.6
          ? "moderate"
          : "low";

      const compositeScore =
        riskLevel === "critical"
          ? randomFloat(5, 20)
          : riskLevel === "high"
            ? randomFloat(15, 35)
            : riskLevel === "moderate"
              ? randomFloat(30, 50)
              : randomFloat(45, 85);

      const domains = ["grossMotor", "fineMotor", "language", "cognitive", "socioEmotional"];
      const domainScores = {};
      const flaggedDomains = [];

      for (const domain of domains) {
        if (isAtRisk && Math.random() > 0.5) {
          domainScores[domain] = randomFloat(5, 30);
          flaggedDomains.push(domain);
        } else {
          domainScores[domain] = randomFloat(35, 90);
        }
      }

      // Weight based on age and risk
      const expectedWeight = 3 + ageMonths * 0.4;
      const weight = isAtRisk
        ? randomFloat(expectedWeight * 0.6, expectedWeight * 0.9)
        : randomFloat(expectedWeight * 0.85, expectedWeight * 1.15);

      const expectedHeight = 50 + ageMonths * 1.2;
      const height = randomFloat(expectedHeight * 0.9, expectedHeight * 1.1);

      const wasScreened = Math.random() * 100 < (distData ? distData.coverage : 75);

      const child = await Child.create({
        name: `${firstName} ${lastName}`,
        gender,
        dateOfBirth: dob,
        parentName: `${randomPick(FIRST_NAMES_FEMALE)} ${lastName}`,
        parentPhone: generatePhone(),
        centreId: centre.id,
        district: centre.district,
        mandal: centre.mandal,
        village: centre.village,
        anthropometrics: [
          {
            date: randomDate(0, 3),
            weight,
            height,
            bmi: Math.round((weight / ((height / 100) * (height / 100))) * 10) / 10,
            weightForAge: weight < expectedWeight * 0.7 ? "severely_underweight" : weight < expectedWeight * 0.85 ? "underweight" : "normal",
            heightForAge: height < expectedHeight * 0.85 ? "stunted" : "normal",
            weightForHeight: "normal",
            recordedBy: awws.length > 0 ? randomPick(awws).id : "system",
          },
        ],
        currentRisk: wasScreened
          ? {
              level: riskLevel,
              compositeScore,
              confidence: randomFloat(0.5, 0.95),
              domainScores,
              lastScreenedAt: randomDate(0, 6),
              screeningCount: randomBetween(1, 4),
              flaggedDomains,
            }
          : {
              level: "low",
              compositeScore: 0,
              confidence: 0,
              domainScores: {},
              screeningCount: 0,
              flaggedDomains: [],
            },
        enrollmentStatus: "active",
        enrollmentDate: randomDate(1, 24),
      });

      // Create screening record if screened
      if (wasScreened) {
        const ageBand = getAgeBand(ageMonths);
        const bandLabel =
          ageMonths <= 12 ? "0-12 mo" : ageMonths <= 24 ? "13-24 mo" : ageMonths <= 36 ? "25-36 mo" : ageMonths <= 48 ? "37-48 mo" : ageMonths <= 60 ? "49-60 mo" : "61-72 mo";

        const assessments = domains.map((domain) => ({
          domain,
          milestonesExpected: randomBetween(3, 5),
          milestonesAchieved: isAtRisk && flaggedDomains.includes(domain) ? randomBetween(0, 2) : randomBetween(3, 5),
          rawScore: domainScores[domain] || 50,
          percentile: domainScores[domain] || 50,
          domainRisk:
            (domainScores[domain] || 50) < 10
              ? "delayed"
              : (domainScores[domain] || 50) < 25
                ? "at_risk"
                : (domainScores[domain] || 50) < 40
                  ? "monitor"
                  : "on_track",
        }));

        const screeningDate = child.currentRisk.lastScreenedAt || randomDate(0, 3);

        await ScreeningRecord.create({
          childId: child._id,
          centreId: centre.id,
          screenedBy: awws.length > 0 ? randomPick(awws).id : "system",
          ageAtScreening: { months: ageMonths, band: bandLabel },
          assessments,
          compositeScore,
          riskLevel,
          confidence: child.currentRisk.confidence,
          flaggedDomains,
          requiresReferral: riskLevel === "high" || riskLevel === "critical",
          referralUrgency:
            riskLevel === "critical" ? "emergency" : riskLevel === "high" ? "urgent" : "none",
          screeningTool: "asq3",
          district: centre.district,
          mandal: centre.mandal,
          createdAt: screeningDate,
        });

        // Create referral if high/critical
        if (riskLevel === "high" || riskLevel === "critical") {
          const specialists = [
            "Pediatrician",
            "Speech-Language Pathologist",
            "Occupational Therapist",
            "Developmental Pediatrician",
            "Child Psychologist",
          ];
          const urgency = riskLevel === "critical" ? "emergency" : "urgent";
          const statuses = ["pending", "in_progress", "completed", "overdue"];
          const status = randomPick(statuses);
          const referralDate = new Date(screeningDate.getTime() + randomBetween(1, 14) * 86400000);

          await Referral.create({
            childId: child._id,
            screeningId: (await ScreeningRecord.findOne({ childId: child._id }))._id,
            centreId: centre.id,
            referredBy: awws.length > 0 ? randomPick(awws).id : "system",
            riskLevel,
            flaggedDomains,
            compositeScore,
            urgency,
            referredTo: randomPick(specialists),
            status,
            flaggedDate: screeningDate,
            referralDate,
            slaDeadline: new Date(
              referralDate.getTime() +
                (urgency === "emergency" ? 3 : urgency === "urgent" ? 7 : 30) * 86400000
            ),
            completionDate: status === "completed" ? new Date(referralDate.getTime() + randomBetween(3, 25) * 86400000) : undefined,
            daysOpen:
              status === "completed"
                ? randomBetween(3, 25)
                : Math.floor((Date.now() - referralDate.getTime()) / 86400000),
            parentNotified: Math.random() > 0.3,
            supervisorNotified: Math.random() > 0.2,
            district: centre.district,
            mandal: centre.mandal,
          });
        }
      }

      totalChildren++;
    }
  }

  console.log(`   ✅ Created ${totalChildren} children with screenings and referrals`);
}

// ═══════════════════════════════════════════════════════════════
// Main Seeder
// ═══════════════════════════════════════════════════════════════

async function seedAll() {
  try {
    console.log("═══════════════════════════════════════════════════");
    console.log("  ICDS Risk Monitoring System — Data Seeder");
    console.log("═══════════════════════════════════════════════════");

    // Connect databases
    await connectMongo();
    await connectPostgres();

    // Clear existing data
    console.log("\n🗑️  Clearing existing data...");
    await Child.deleteMany({});
    await ScreeningRecord.deleteMany({});
    await Referral.deleteMany({});
    await User.destroy({ where: {}, truncate: true, cascade: true });
    await AnganwadiCentre.destroy({ where: {}, truncate: true, cascade: true });
    console.log("   ✅ Database cleared");

    // Seed in order
    const users = await seedUsers();
    const centres = await seedCentres(users);
    await seedChildren(centres, users);

    // Print summary
    console.log("\n═══════════════════════════════════════════════════");
    console.log("  SEEDING COMPLETE — Summary");
    console.log("═══════════════════════════════════════════════════");
    console.log(`  Users:              ${await User.count()}`);
    console.log(`  Anganwadi Centres:  ${await AnganwadiCentre.count()}`);
    console.log(`  Children:           ${await Child.countDocuments()}`);
    console.log(`  Screening Records:  ${await ScreeningRecord.countDocuments()}`);
    console.log(`  Referrals:          ${await Referral.countDocuments()}`);
    console.log("═══════════════════════════════════════════════════");

    console.log("\n🎯 Demo credentials:");
    console.log("   Admin:      admin@icds-ap.gov.in / admin123");
    console.log("   CDPO:       cdpo.visakhapatnam@icds-ap.gov.in / cdpo123");
    console.log("   Supervisor: sup.anakapalle@icds-ap.gov.in / sup123");
    console.log("   AWW:        aww.vis.1@icds-ap.gov.in / aww123");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Seeding failed:", error);
    process.exit(1);
  }
}

seedAll();
