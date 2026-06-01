import Link from "next/link";
import { SiteFooter } from "@/components/nav/SiteFooter";

type FaqItem = { q: string; a: string };
type FaqGroup = { heading: string; items: FaqItem[] };

// Help / FAQ content is grouped by audience question, not by feature
// surface. The goal is creator clarity — what ShangoMaji is, what it is
// not, how AI is handled, what happens after submission, what is and is
// not promised about payment, and how the relationship is structured.
const FAQ_GROUPS: FaqGroup[] = [
  {
    heading: "What ShangoMaji is",
    items: [
      {
        q: "What is ShangoMaji?",
        a: "ShangoMaji is a curated anime distribution label. Approved titles join the public catalog through review, licensing, and media readiness. It is not open upload, not self-publishing, not YouTube, not Webtoon, and not a generic social platform.",
      },
      {
        q: "What kind of work is ShangoMaji reviewing at launch?",
        a: "Launch review priority is creator-owned anime-inspired video and animation-facing work — animated shorts, pilots, trailers, animatics, anime-inspired short films, and motion-comic style video where applicable. Visual story and adaptation packages may be referenced for future development pathways, but ShangoMaji is not launching as a comic publishing platform or Webtoon-style reader.",
      },
      {
        q: "What is ShangoMaji not?",
        a: "Not open upload. Not self-publishing. Not a YouTube alternative. Not a Webtoon-style reader. Not a generic social network. Not a creator marketplace. ShangoMaji is a controlled catalog with editorial standards.",
      },
    ],
  },
  {
    heading: "Applying and review",
    items: [
      {
        q: "How do I apply?",
        a: "Submit the creator application at /creators/apply. The application asks about you, your project, your creative direction, and where to find your work. Every answer is read.",
      },
      {
        q: "How long does review take?",
        a: "Applications are reviewed in cycles. Early review windows may take several weeks. Incomplete submissions may be returned for completion. Complete submissions receive an outcome. There is no same-day or instant approval.",
      },
      {
        q: "What does approval actually mean?",
        a: "Approval moves the work into licensing and media-readiness review. It is not automatic public release. A title only joins the public catalog after license, materials, and release readiness are aligned.",
      },
      {
        q: "What happens if I'm rejected?",
        a: "Rejection means the submitted project does not currently meet the standard or timing required for ShangoMaji review, licensing, or catalog consideration. It is not a judgment of the creator. Standards exist to protect creators who do get in and the audience the catalog is built for.",
      },
      {
        q: "Can I re-apply later?",
        a: "Yes, when the work has materially evolved or when timing changes. ShangoMaji does not maintain a permanent block list for creators who were declined for project fit or timing.",
      },
    ],
  },
  {
    heading: "AI and human authorship",
    items: [
      {
        q: "Does ShangoMaji use my work to train AI?",
        a: "No. ShangoMaji will not use creator-submitted materials to train generative AI models. That applies to applications, samples, finished work, and anything else creators send through the platform.",
      },
      {
        q: "Is AI-assisted work allowed?",
        a: "Work made without AI is reviewed normally. AI-assisted work may be reviewed when the use is disclosed, human authorship is clear, and the rights posture is clean. Primarily or fully AI-generated submissions are not accepted at launch.",
      },
      {
        q: "What counts as AI use that needs disclosure?",
        a: "AI used for images, animation, writing, voices, music, editing, reference generation, concept development, or any other material part of the project. Disclosure does not automatically disqualify a project. Hidden AI use, unclear authorship, or work that cannot be responsibly credited or licensed may block review.",
      },
      {
        q: "Why this stance on AI?",
        a: "The standard is not anti-tool. It is pro-creator. ShangoMaji protects human authorship, rights clarity, and creative responsibility — the things a curated catalog depends on.",
      },
    ],
  },
  {
    heading: "Ownership, license, and removal",
    items: [
      {
        q: "Who owns the work?",
        a: "The creator. Submitting an application does not transfer copyright. Approval does not transfer copyright. ShangoMaji does not claim ownership of creator IP as a condition of review.",
      },
      {
        q: "How does ShangoMaji get the right to distribute?",
        a: "Only through a signed agreement. The agreement spells out what rights are granted, for how long, on what terms, what the creator keeps, how reporting works, how revenue is handled where it applies, and how removal works. Nothing goes public without that signature.",
      },
      {
        q: "Do I get to read the agreement before signing?",
        a: "Yes. You receive the agreement before you sign. You have time to read it. You can ask process questions. ShangoMaji cannot give legal advice — for binding decisions, consult your own lawyer — but the document is written to be readable and the process is not designed to rush you.",
      },
      {
        q: "What if I want my work taken down later?",
        a: "Removal during the license term is handled through the process defined in the signed agreement. It is not an instant un-publish button, because the catalog and the audience that engages with it depend on stability. The agreement defines what removal looks like.",
      },
    ],
  },
  {
    heading: "Payment and revenue",
    items: [
      {
        q: "Does ShangoMaji pay creators?",
        a: "ShangoMaji is still defining its full creator economics model. Accepted works will not enter public catalog distribution without a signed agreement that explains the applicable rights, term, revenue terms, reporting expectations, and payment structure where revenue share applies. No creator should assume submission or approval creates immediate payment.",
      },
      {
        q: "Why isn't there a published revenue-share percentage?",
        a: "Because the economics are still being finalized and binding terms belong in a signed agreement, not in a marketing line. ShangoMaji would rather under-promise upfront than publish a number that does not survive the agreement.",
      },
      {
        q: "Does acceptance mean I'm getting paid?",
        a: "No. Acceptance means the work is moving into licensing and media-readiness review. Payment terms, where applicable, live in the signed agreement.",
      },
    ],
  },
  {
    heading: "Audience and platform mechanics",
    items: [
      {
        q: "Will there be comments, ratings, likes, or followers?",
        a: "Not at launch. ShangoMaji is not an open social network — it is a controlled catalog. Audience response may inform future product and reporting decisions. Audience metrics do not decide catalog inclusion. Controlled creator-following or audience-signal mechanics may be considered in a future phase if they support catalog trust and do not replace editorial authority.",
      },
      {
        q: "Why curated instead of open?",
        a: "Open-upload platforms scale by accepting almost anything. ShangoMaji scales by accepting work that fits the catalog. The trade-off is intentional. It is what makes acceptance worth something to the creator and to the audience.",
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen pt-28 pb-20 px-6 md:px-10 flex flex-col">
      <div className="max-w-2xl mx-auto flex-1 w-full">
        <p
          className="text-xs uppercase tracking-[0.25em] mb-4"
          style={{ color: "rgba(240,112,48,0.7)" }}
        >
          Support
        </p>
        <h1 className="text-display font-bold text-4xl md:text-5xl text-white mb-4 tracking-tight">
          Help / FAQ
        </h1>
        <p
          className="text-sm leading-relaxed mb-12"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >
          Answers for creators, members, and visitors. For the full trust
          rationale behind the platform, read the{" "}
          <Link
            href="/why"
            className="text-white underline decoration-white/30 underline-offset-2 hover:decoration-white/60 transition"
          >
            creator trust page
          </Link>
          .
        </p>

        <div className="space-y-14">
          {FAQ_GROUPS.map((group) => (
            <section key={group.heading}>
              <h2
                className="text-[10px] uppercase tracking-[0.22em] font-semibold mb-5"
                style={{ color: "rgba(245,197,24,0.75)" }}
              >
                {group.heading}
              </h2>
              <div className="space-y-5">
                {group.items.map(({ q, a }) => (
                  <div
                    key={q}
                    className="pt-5"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    <p className="text-white font-medium text-sm mb-2">{q}</p>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "rgba(255,255,255,0.6)" }}
                    >
                      {a}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div
          className="mt-16 pt-8"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
        >
          <h2 className="text-white font-semibold text-base mb-3">Contact</h2>
          <p
            className="text-sm leading-relaxed"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            For support or inquiries:{" "}
            <a
              href="mailto:universe@shangomaji.com"
              className="hover:text-white transition-colors"
              style={{ color: "rgba(240,112,48,0.85)" }}
            >
              universe@shangomaji.com
            </a>
          </p>
          <p
            className="mt-3 text-xs"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            ShangoMaji cannot provide legal advice. For binding decisions
            about your work, please consult your own lawyer.
          </p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
