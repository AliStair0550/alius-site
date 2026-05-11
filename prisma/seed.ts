// ============================================================
// Seed-fil for alius database
// Kør med: npx prisma db seed
// ============================================================

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type QuadrantKey = "A" | "B" | "C" | "D";

type SeedProfile = {
  email?: string;
  displayName: string;
  totals: { A: number; B: number; C: number; D: number };
};

function calculateProfileResult(totals: { A: number; B: number; C: number; D: number }) {
  const entries = Object.entries(totals) as [QuadrantKey, number][];
  entries.sort((a, b) => b[1] - a[1]);
  return {
    primary: entries[0][0],
    secondary: entries[1][0],
    weakest: entries[3][0],
  };
}

// Et tomt selections-objekt med korrekt struktur
function emptySelections() {
  return [
    { A: [], B: [], C: [], D: [] },
    { A: [], B: [], C: [], D: [] },
    { A: [], B: [], C: [], D: [] },
  ];
}

async function main() {
  console.log("🌱 Seeder alius-databasen...\n");

  // Ryd databasen (i seed-kontekst, ikke i produktion)
  await prisma.teamMember.deleteMany();
  await prisma.teamRequest.deleteMany();
  await prisma.teamSession.deleteMany();
  await prisma.profile.deleteMany();

  console.log("🧹 Ryddet eksisterende seed-data\n");

  // ============================================================
  // TEAM 1: Marketing-teamet hos Acme
  // Et hold med balanceret spredning på tværs af kvadranter.
  // ============================================================

  const marketingTeam: SeedProfile[] = [
    { email: "mette@acme.dk", displayName: "Mette", totals: { A: 8, B: 12, C: 3, D: 1 } },
    { email: "jonas@acme.dk", displayName: "Jonas", totals: { A: 14, B: 4, C: 3, D: 3 } },
    { email: "sara@acme.dk", displayName: "Sara", totals: { A: 3, B: 4, C: 13, D: 4 } },
    { email: "anders@acme.dk", displayName: "Anders", totals: { A: 4, B: 2, C: 5, D: 13 } },
    { email: "laila@acme.dk", displayName: "Laila", totals: { A: 5, B: 3, C: 11, D: 5 } },
    { email: "mikkel@acme.dk", displayName: "Mikkel", totals: { A: 11, B: 7, C: 3, D: 3 } },
  ];

  const marketingSession = await prisma.teamSession.create({
    data: {
      name: "Marketing-teamet",
      companyName: "Acme A/S",
      ownerEmail: "thomas@acme.dk",
      ownerName: "Thomas Holm",
      status: "CLOSED",
      expectedSize: 6,
      closedAt: new Date(),
    },
  });

  for (const member of marketingTeam) {
    const result = calculateProfileResult(member.totals);
    const profile = await prisma.profile.create({
      data: {
        email: member.email,
        displayName: member.displayName,
        totals: member.totals,
        primary: result.primary,
        secondary: result.secondary,
        weakest: result.weakest,
        selections: emptySelections(),
        source: "team_invitation",
      },
    });
    await prisma.teamMember.create({
      data: {
        sessionId: marketingSession.id,
        profileId: profile.id,
        displayName: member.displayName,
        submittedAt: new Date(),
      },
    });
  }

  console.log(`✓ Team 1: ${marketingTeam.length} deltagere → "${marketingSession.name}"`);
  console.log(`  Admin:    /tankeprofil/hold/admin/${marketingSession.adminToken}`);
  console.log(`  Join:     /tankeprofil/hold/join/${marketingSession.joinToken}`);
  console.log(`  Rapport:  /tankeprofil/hold/rapport/${marketingSession.reportToken}\n`);

  // ============================================================
  // TEAM 2: Ledelsesgruppen hos Bohrm Industries
  // Et hold der hælder kraftigt mod A og B (analytiker + bygmester).
  // Demonstrerer "blindt felt" pattern for hold med ensartet tænkning.
  // ============================================================

  const leadershipTeam: SeedProfile[] = [
    { email: "henrik@bohrm.dk", displayName: "Henrik", totals: { A: 13, B: 8, C: 2, D: 1 } },
    { email: "katja@bohrm.dk", displayName: "Katja", totals: { A: 11, B: 9, C: 3, D: 1 } },
    { email: "peter@bohrm.dk", displayName: "Peter", totals: { A: 7, B: 14, C: 2, D: 1 } },
    { email: "lone@bohrm.dk", displayName: "Lone", totals: { A: 12, B: 7, C: 3, D: 2 } },
    { email: "morten@bohrm.dk", displayName: "Morten", totals: { A: 9, B: 11, C: 2, D: 2 } },
  ];

  const leadershipSession = await prisma.teamSession.create({
    data: {
      name: "Ledelsesgruppen",
      companyName: "Bohrm Industries",
      ownerEmail: "henrik@bohrm.dk",
      ownerName: "Henrik Brandt",
      status: "OPEN",
      expectedSize: 5,
    },
  });

  for (const member of leadershipTeam) {
    const result = calculateProfileResult(member.totals);
    const profile = await prisma.profile.create({
      data: {
        email: member.email,
        displayName: member.displayName,
        totals: member.totals,
        primary: result.primary,
        secondary: result.secondary,
        weakest: result.weakest,
        selections: emptySelections(),
        source: "team_invitation",
      },
    });
    await prisma.teamMember.create({
      data: {
        sessionId: leadershipSession.id,
        profileId: profile.id,
        displayName: member.displayName,
        submittedAt: new Date(),
      },
    });
  }

  console.log(`✓ Team 2: ${leadershipTeam.length} deltagere → "${leadershipSession.name}"`);
  console.log(`  Hælder mod Analytiker + Bygmester. Forbinder + Visionær er blindt felt.`);
  console.log(`  Admin:    /tankeprofil/hold/admin/${leadershipSession.adminToken}`);
  console.log(`  Rapport:  /tankeprofil/hold/rapport/${leadershipSession.reportToken}\n`);

  // ============================================================
  // TEAM 3: Designteamet hos Studio Nord
  // Endnu ikke alle har taget testen. Demonstrerer åben session.
  // ============================================================

  const designTeam: SeedProfile[] = [
    { email: "freja@studionord.dk", displayName: "Freja", totals: { A: 3, B: 2, C: 7, D: 12 } },
    { email: "noah@studionord.dk", displayName: "Noah", totals: { A: 4, B: 3, C: 6, D: 11 } },
    { email: "ida@studionord.dk", displayName: "Ida", totals: { A: 2, B: 5, C: 11, D: 6 } },
  ];

  const designSession = await prisma.teamSession.create({
    data: {
      name: "Designteamet",
      companyName: "Studio Nord",
      ownerEmail: "creative@studionord.dk",
      ownerName: "Anna Lykke",
      status: "OPEN",
      expectedSize: 6, // forventer 6, kun 3 er færdige
    },
  });

  for (const member of designTeam) {
    const result = calculateProfileResult(member.totals);
    const profile = await prisma.profile.create({
      data: {
        email: member.email,
        displayName: member.displayName,
        totals: member.totals,
        primary: result.primary,
        secondary: result.secondary,
        weakest: result.weakest,
        selections: emptySelections(),
        source: "team_invitation",
      },
    });
    await prisma.teamMember.create({
      data: {
        sessionId: designSession.id,
        profileId: profile.id,
        displayName: member.displayName,
        submittedAt: new Date(),
      },
    });
  }

  console.log(`✓ Team 3: ${designTeam.length}/${designSession.expectedSize} deltagere → "${designSession.name}"`);
  console.log(`  Demonstrerer åben session med kun delvis udfyldning.`);
  console.log(`  Admin:    /tankeprofil/hold/admin/${designSession.adminToken}\n`);

  // ============================================================
  // Stand-alone individuel test (uden team)
  // ============================================================

  const aloneProfile = await prisma.profile.create({
    data: {
      email: "kirstine@independent.dk",
      displayName: "Kirstine",
      totals: { A: 10, B: 6, C: 4, D: 4 },
      primary: "A",
      secondary: "B",
      weakest: "C",
      selections: emptySelections(),
      source: "individual",
    },
  });

  console.log(`✓ Individuel profil: ${aloneProfile.displayName}`);
  console.log(`  Min profil: /tankeprofil/min-profil/${aloneProfile.accessToken}\n`);

  // ============================================================
  // TEAM REQUEST eksempler
  // Ubehandlede anmodninger der venter på dig at godkende.
  // ============================================================

  await prisma.teamRequest.createMany({
    data: [
      {
        name: "Maria Lindberg",
        email: "maria@northcorp.dk",
        company: "Northcorp ApS",
        teamSize: "8",
        context:
          "Vores produktteam står over for en stor strategisk beslutning, og vi vil gerne forstå hinanden bedre før vi tager den. Vi har arbejdet sammen i to år, men oplever stadig at vi taler forbi hinanden ind imellem.",
        status: "NEW",
      },
      {
        name: "Jens Møller",
        email: "jens@maerk.io",
        company: "Mærk",
        teamSize: "5",
        context:
          "Jeg er ny som leder og vil gerne lære holdet at kende på et dybere niveau. Har hørt om jer fra en kollega i et andet firma.",
        status: "NEW",
      },
    ],
  });

  console.log("✓ 2 ubehandlede team-anmodninger oprettet\n");

  const counts = {
    profiles: await prisma.profile.count(),
    sessions: await prisma.teamSession.count(),
    members: await prisma.teamMember.count(),
    requests: await prisma.teamRequest.count(),
  };

  console.log("📊 Seed færdig:");
  console.log(`   ${counts.profiles} profiler`);
  console.log(`   ${counts.sessions} team-sessioner`);
  console.log(`   ${counts.members} team-medlemmer`);
  console.log(`   ${counts.requests} anmodninger\n`);
}

main()
  .catch((e) => {
    console.error("❌ Seed fejlede:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
