import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* NAV */}
      <nav className="border-b border-stone-100 sticky top-0 bg-white z-50">
        <div className="max-w-content mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Logo />
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-semibold text-stone-700 hover:text-stone-900 px-4 py-2"
            >
              Log in
            </Link>
            <Link
              href="/login?mode=signup"
              className="bg-[#EA580C] text-white text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-orange-700 transition-colors min-h-[44px] flex items-center"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="bg-white pt-16 pb-20 px-4 sm:px-6">
        <div className="max-w-content mx-auto text-center">
          <p className="text-[#EA580C] font-bold text-sm uppercase tracking-widest mb-4">
            Voice-Powered Punch Lists & Change Orders
          </p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-[#1C1917] leading-tight mb-6 text-balance">
            Walk the Site.
            <br />
            <span className="text-[#EA580C]">Talk the List.</span>
            <br />
            Get Paid.
          </h1>
          <p className="text-xl sm:text-2xl text-stone-600 max-w-3xl mx-auto mb-10 leading-relaxed font-medium">
            SiteWrap turns your voice into professional punch lists and change orders.
            Dictate as you walk. AI formats everything. Homeowners sign off on the spot.
            <strong className="text-stone-800"> No more disputes. No more unpaid changes.</strong>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/login?mode=signup"
              className="bg-[#EA580C] text-white text-lg font-bold px-8 py-4 rounded-xl hover:bg-orange-700 transition-colors w-full sm:w-auto text-center min-h-[56px] flex items-center justify-center"
            >
              Start Free Trial — No Credit Card
            </Link>
          </div>
          <p className="mt-4 text-stone-500 font-medium text-sm">
            30 seconds to your first punch list. Works on any phone.
          </p>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="bg-stone-950 py-20 px-4 sm:px-6">
        <div className="max-w-content mx-auto">
          <p className="text-[#EA580C] font-bold text-sm uppercase tracking-widest mb-3">
            The Problem
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-12 max-w-3xl">
            Change Orders Are the #1 Source of Payment Disputes in Residential Construction
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                title: "Verbal agreements vanish",
                body: `"Can you move that outlet?" "Sure." Three months later: "I never agreed to pay for that." Sound familiar? Without documentation, you eat the cost.`,
              },
              {
                title: "Punch lists take hours to write",
                body: "You walk the site, scribble notes on paper, go home, type it up for an hour. Then the homeowner disputes half the items because your handwriting was illegible.",
              },
              {
                title: "Closeout delays kill cash flow",
                body: "Final payment sits in limbo because the punch list isn't formalized, items aren't tracked, and nobody can agree on what's done. Meanwhile, your crew needs to start the next job.",
              },
            ].map((card) => (
              <div key={card.title} className="border-l-4 border-red-500 pl-6 py-2">
                <h3 className="text-white font-bold text-xl mb-3">{card.title}</h3>
                <p className="text-stone-400 leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-content mx-auto">
          <p className="text-[#EA580C] font-bold text-sm uppercase tracking-widest mb-3">
            How It Works
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1C1917] mb-14">
            Voice In. Documents Out. Signatures Done.
          </h2>
          <div className="grid sm:grid-cols-3 gap-10">
            {[
              {
                num: "1",
                title: "Walk & Talk",
                body: `Open SiteWrap, hit record, walk the site: "Master bedroom — paint touch-up north wall by window. Outlet cover missing east wall. Kitchen — cabinet door alignment off on upper left." Talk naturally. AI handles the rest.`,
              },
              {
                num: "2",
                title: "AI Structures Everything",
                body: "Your walkthrough becomes a numbered, room-by-room punch list with severity tags (Critical / Major / Minor), or a line-itemized change order with costs. Review, edit, attach photos.",
              },
              {
                num: "3",
                title: "Get Signatures On-Site",
                body: "Text or email the document to the homeowner. They review and sign digitally on their phone. Done before you leave the room. No more 'I'll review it later' delays.",
              },
            ].map((step) => (
              <div key={step.num} className="flex gap-5">
                <div className="flex-shrink-0 w-14 h-14 bg-[#EA580C] rounded-full flex items-center justify-center text-white font-extrabold text-2xl">
                  {step.num}
                </div>
                <div>
                  <h3 className="text-[#1C1917] font-bold text-xl mb-2">{step.title}</h3>
                  <p className="text-stone-600 leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TWO TOOLS */}
      <section className="py-20 px-4 sm:px-6 bg-stone-50">
        <div className="max-w-content mx-auto">
          <p className="text-[#EA580C] font-bold text-sm uppercase tracking-widest mb-3">
            Punch Lists + Change Orders
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1C1917] mb-12">
            The Two Documents That Get You Paid
          </h2>
          <div className="grid sm:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-8 border border-stone-200">
              <div className="inline-block bg-red-100 text-red-700 font-bold text-xs uppercase tracking-wider px-3 py-1.5 rounded-full mb-5">
                Punch List
              </div>
              <h3 className="text-2xl font-extrabold text-[#1C1917] mb-5">
                Your final walkthrough, professionalized.
              </h3>
              <ul className="space-y-3">
                {[
                  "Dictate room by room → AI organizes and numbers items",
                  "Severity tags: Critical / Major / Minor",
                  "Photo attachments per item",
                  "Homeowner sign-off as items complete",
                  "Export as branded PDF",
                ].map((item) => (
                  <li key={item} className="flex gap-3 items-start">
                    <span className="text-[#16A34A] font-bold text-lg leading-tight">✓</span>
                    <span className="text-stone-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-2xl p-8 border border-stone-200">
              <div className="inline-block bg-amber-100 text-amber-700 font-bold text-xs uppercase tracking-wider px-3 py-1.5 rounded-full mb-5">
                Change Order
              </div>
              <h3 className="text-2xl font-extrabold text-[#1C1917] mb-5">
                Scope changes documented in 30 seconds.
              </h3>
              <ul className="space-y-3">
                {[
                  `Dictate: "Homeowner wants outlets moved to island. 4 hours electrical, 2 hours drywall. $680."`,
                  "AI formats with line items + costs",
                  "Text to homeowner for instant signature",
                  "Stored with project record forever",
                  "Your legal proof when disputes arise",
                ].map((item) => (
                  <li key={item} className="flex gap-3 items-start">
                    <span className="text-[#16A34A] font-bold text-lg leading-tight">✓</span>
                    <span className="text-stone-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ROI */}
      <section className="py-20 px-4 sm:px-6 bg-[#EA580C]">
        <div className="max-w-content mx-auto">
          <p className="text-orange-200 font-bold text-sm uppercase tracking-widest mb-3">
            The ROI
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-10">
            One Documented Change Order Pays for a Year of SiteWrap
          </h2>
          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl">
            {[
              { label: "Average undocumented change order dispute", value: "$500 – $2,000" },
              { label: "Average disputes per remodeler per year", value: "3 – 5" },
              { label: "Annual cost of undocumented changes", value: "$1,500 – $10,000" },
              { label: "SiteWrap", value: "$39/mo = $468/yr" },
            ].map((row) => (
              <div key={row.label} className="bg-white/15 rounded-xl p-5">
                <p className="text-orange-100 text-sm mb-1">{row.label}</p>
                <p className="text-white font-extrabold text-2xl">{row.value}</p>
              </div>
            ))}
          </div>
          <p className="text-white font-extrabold text-xl mt-10 max-w-xl leading-snug">
            SiteWrap pays for itself with your FIRST documented change order.
          </p>
        </div>
      </section>

      {/* WHO ITS FOR */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-content mx-auto">
          <p className="text-[#EA580C] font-bold text-sm uppercase tracking-widest mb-3">
            Built for Builders
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1C1917] mb-12">
            If You Do Walkthroughs, You Need SiteWrap
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[
              { title: "Residential Remodelers", desc: "Kitchen, bath, and whole-house remodels with homeowners who change their minds" },
              { title: "General Contractors", desc: "Multi-trade closeouts with subs to manage and punch items to track" },
              { title: "Custom Home Builders", desc: "Complex builds with hundreds of punch items across dozens of rooms" },
              { title: "Property Managers", desc: "Unit turnover inspections and maintenance closeouts" },
            ].map((item) => (
              <div key={item.title} className="bg-stone-50 rounded-xl p-5 border border-stone-100">
                <h3 className="font-bold text-[#1C1917] text-base mb-2">{item.title}</h3>
                <p className="text-stone-600 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-20 px-4 sm:px-6 bg-stone-950" id="pricing">
        <div className="max-w-content mx-auto">
          <p className="text-[#EA580C] font-bold text-sm uppercase tracking-widest mb-3">
            Pricing
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Simple Plans for Every Builder
          </h2>
          <p className="text-stone-400 mb-12">14-day free trial. No credit card required. Cancel anytime.</p>
          <div className="grid sm:grid-cols-2 gap-6 max-w-3xl">
            {[
              {
                name: "Project",
                price: "$39",
                features: [
                  "Up to 5 active projects",
                  "Unlimited punch items",
                  "Voice-to-punch-list",
                  "Voice-to-change-order",
                  "Digital signatures",
                  "PDF export",
                  "Photo attachments",
                ],
              },
              {
                name: "Unlimited",
                price: "$99",
                featured: true,
                features: [
                  "Unlimited active projects",
                  "Everything in Project",
                  "Team collaboration",
                  "Priority support",
                  "Company branding on documents",
                  "Bulk PDF export",
                ],
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 ${
                  plan.featured
                    ? "bg-[#EA580C] text-white"
                    : "bg-white text-[#1C1917]"
                }`}
              >
                <h3 className={`font-extrabold text-2xl mb-1 ${plan.featured ? "text-white" : "text-[#1C1917]"}`}>
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className={`font-extrabold text-4xl ${plan.featured ? "text-white" : "text-[#EA580C]"}`}>
                    {plan.price}
                  </span>
                  <span className={`text-sm ${plan.featured ? "text-orange-100" : "text-stone-500"}`}>/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-3 items-start">
                      <span className={`font-bold text-lg leading-tight ${plan.featured ? "text-orange-100" : "text-[#16A34A]"}`}>✓</span>
                      <span className={`text-sm ${plan.featured ? "text-orange-50" : "text-stone-700"}`}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login?mode=signup"
                  className={`block text-center font-bold py-3.5 px-6 rounded-xl transition-colors min-h-[52px] flex items-center justify-center ${
                    plan.featured
                      ? "bg-white text-[#EA580C] hover:bg-orange-50"
                      : "bg-[#EA580C] text-white hover:bg-orange-700"
                  }`}
                >
                  Start Free Trial
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-content mx-auto max-w-2xl">
          <h2 className="text-3xl font-extrabold text-[#1C1917] mb-12">Frequently Asked Questions</h2>
          <div className="space-y-8">
            {[
              {
                q: "How long does it take to create a punch list?",
                a: "Walk a 2,000 sq ft house and dictate as you go — about 10 minutes. AI structures it in seconds. Compare that to 1-2 hours writing it up later.",
              },
              {
                q: "Can the homeowner see the list in real time?",
                a: "Yes. Share a link and they see items, photos, and completion status. They can sign off on individual items as your crew completes them.",
              },
              {
                q: "Does this replace my project management software?",
                a: "No. SiteWrap handles the closeout documents — punch lists and change orders. It works alongside whatever PM tool you use for scheduling and budgeting.",
              },
              {
                q: "What if I need to add items after the initial walkthrough?",
                a: "Just record again. SiteWrap adds new items to the existing list. You can also type items manually.",
              },
              {
                q: "Is the change order legally binding?",
                a: "A digitally signed change order with timestamps and clear terms is strong documentation in any dispute. Consult your attorney for your specific situation, but you're infinitely better off than a verbal agreement.",
              },
            ].map((item) => (
              <div key={item.q} className="border-b border-stone-100 pb-8">
                <h3 className="font-bold text-[#1C1917] text-lg mb-2">{item.q}</h3>
                <p className="text-stone-600 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 px-4 sm:px-6 bg-[#1C1917]">
        <div className="max-w-content mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 text-balance">
            Stop Eating the Cost of Undocumented Changes
          </h2>
          <p className="text-stone-400 text-xl mb-10 max-w-2xl mx-auto">
            Your next walkthrough takes 10 minutes. Your next change order takes 30 seconds. Start now.
          </p>
          <Link
            href="/login?mode=signup"
            className="inline-block bg-[#EA580C] text-white text-lg font-bold px-10 py-4 rounded-xl hover:bg-orange-700 transition-colors min-h-[56px]"
          >
            Start Free Trial — It&apos;s Free
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-stone-950 py-10 px-4 sm:px-6 border-t border-stone-800">
        <div className="max-w-content mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
          <Logo inverted />
          <div className="flex gap-6 text-stone-400 text-sm">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <a href="mailto:joel@helmport.com" className="hover:text-white transition-colors">Contact</a>
          </div>
          <p className="text-stone-600 text-sm">© 2026 SiteWrap. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
