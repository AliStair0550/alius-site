import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ARCHETYPES, type QuadrantKey, type Totals } from "@/components/tankeprofil/data";
import { ProfileView } from "@/components/tankeprofil/ProfileView";
import { calculateClarity, clarityQualifier, clarityDescription } from "@/components/tankeprofil/confidence";

export const metadata: Metadata = {
  title: "Min profil · Personlighedsprofil · Alius",
  description: "Din gemte personlighedsprofil.",
  robots: { index: false, follow: false }, // Don't index personal profiles
};

type Props = {
  params: Promise<{ accessToken: string }>;
};

export default async function MinProfilPage({ params }: Props) {
  const { accessToken } = await params;

  const profile = await prisma.profile.findUnique({
    where: { accessToken },
    select: {
      id: true,
      displayName: true,
      email: true,
      totals: true,
      primary: true,
      secondary: true,
      weakest: true,
      createdAt: true,
    },
  });

  if (!profile) {
    notFound();
  }

  // Validate that totals is the right shape (it's stored as Json)
  const totals = profile.totals as Totals;
  const primary = profile.primary as QuadrantKey;
  const secondary = profile.secondary as QuadrantKey;
  const weakest = profile.weakest as QuadrantKey;

  // Compute pct
  const sum = totals.A + totals.B + totals.C + totals.D;
  const pct: Totals = {
    A: sum > 0 ? totals.A / sum : 0,
    B: sum > 0 ? totals.B / sum : 0,
    C: sum > 0 ? totals.C / sum : 0,
    D: sum > 0 ? totals.D / sum : 0,
  };

  const primaryArch = ARCHETYPES[primary];
  const clarity = calculateClarity(totals, primary);

  return (
    <div className="min-h-screen bg-parchment text-ink font-sans font-light overflow-x-hidden relative">
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(26,26,26,0.04) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="max-w-[1100px] mx-auto px-5 py-8 md:px-8 md:py-12 relative z-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-baseline gap-4 pb-8 md:pb-16 border-b border-ink/10 mb-10 md:mb-20">
          <Link
            href="/tankeprofil"
            className="font-extralight text-sm tracking-[0.3em] uppercase text-ink no-underline hover:text-moss transition-colors"
          >
            &larr; Alius &#183; Personlighedsprofil
          </Link>
          <div className="font-extralight text-xs tracking-[0.2em] uppercase text-stone opacity-60">
            Din gemte profil
          </div>
        </header>

        {/* Hero */}
        <section className="mb-16">
          <div className="text-[11px] tracking-[0.4em] uppercase text-moss mb-6 flex items-center gap-3">
            <span>Velkommen tilbage</span>
            {profile.displayName && (
              <>
                <span className="opacity-40">·</span>
                <span className="opacity-70">{profile.displayName}</span>
              </>
            )}
          </div>
          <div className="font-fraunces font-extralight italic text-[clamp(22px,3vw,36px)] text-stone opacity-50 mb-2 tracking-[-0.01em]">
            {clarityQualifier(clarity.label)}
          </div>
          <h1 className="font-fraunces font-light italic text-[clamp(64px,9vw,128px)] leading-[0.95] tracking-[-0.03em] mb-6 text-ink">
            {primaryArch.name}
          </h1>
          <p className="font-fraunces text-[22px] text-stone font-light mb-3">
            Din personlighedsprofil som du tog den{" "}
            {new Date(profile.createdAt).toLocaleDateString("da-DK", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <p className="text-[15px] leading-[1.65] text-stone max-w-[520px] opacity-80">
            {clarityDescription(clarity.label)}
          </p>
        </section>

        <ProfileView
          totals={totals}
          pct={pct}
          primary={primary}
          secondary={secondary}
          weakest={weakest}
          accessToken={accessToken}
          email={profile.email}
        />

        {/* Footer actions */}
        <section className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/tankeprofil"
            className="block p-8 bg-sand hover:bg-fog transition-colors no-underline"
          >
            <div className="text-[11px] tracking-[0.3em] uppercase text-moss mb-3">
              Tag testen igen
            </div>
            <div className="font-fraunces font-light text-[24px] leading-[1.2] text-ink mb-2">
              Er din profil ændret?
            </div>
            <p className="text-[14px] text-stone leading-[1.5]">
              Ting flytter sig med tiden. Tag testen igen og se om resultatet stadig matcher.
            </p>
          </Link>
          <Link
            href="/tankeprofil/hold"
            className="block p-8 bg-sand hover:bg-fog transition-colors no-underline"
          >
            <div className="text-[11px] tracking-[0.3em] uppercase text-moss mb-3">
              For hold
            </div>
            <div className="font-fraunces font-light text-[24px] leading-[1.2] text-ink mb-2">
              Få en fælles rapport
            </div>
            <p className="text-[14px] text-stone leading-[1.5]">
              Se hvordan I tænker sammen som hold. Gratis. Vi sætter os ned med jer.
            </p>
          </Link>
        </section>

        <footer className="mt-24 pt-8 border-t border-ink/10 text-[11px] text-stone opacity-50 tracking-[0.05em] leading-[1.6] max-w-[720px]">
          Personlighedsprofil er udviklet af Alius som et selvstændigt værktøj, inspireret af tænkningen bag Whole Brain Thinking, oprindeligt formuleret af Dr. Kobus Neethling (Neethling Brain Instruments). Ord, arketyper og fortolkninger er Alius&apos; egne.
        </footer>
      </div>
    </div>
  );
}
