"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck, FileText, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Button>
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            B2B SaaS Legal Framework
          </div>
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
            <Scale className="h-3.5 w-3.5" />
            Terms of Service & Master Services Agreement
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Terms and Conditions
          </h1>
          <p className="text-sm text-muted-foreground">
            Last Updated: October 2026 • Effective for all partner businesses and platform subscribers.
          </p>
        </div>

        <Card className="shadow-sm">
          <CardContent className="pt-6 space-y-8 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">1. Introduction & Acceptance</h2>
              <p>
                These Terms and Conditions, together with our Data Processing Agreement (DPA) and Privacy Policy, govern your use of the FeedbackDesk platform, APIs, physical Counter QR dispensers, single-use review tokens, and AI analytics services. By registering an account, integrating our endpoints, or displaying our feedback links, your business agrees to be bound by these terms.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">2. SaaS License & Authorized Use</h2>
              <p>
                FeedbackDesk grants your business a non-exclusive, non-transferable, worldwide license to access our platform, distribute single-use feedback invitations, and receive AI-analyzed sentiment insights for internal business operations.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>You may generate 1-on-1 invitation links and deploy physical Counter QR standees for your locations.</li>
                <li>You are responsible for maintaining the confidentiality of your administrative credentials.</li>
                <li>We commit to a 99.9% monthly service uptime availability, excluding scheduled maintenance.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">3. Authentic Reviews & Anti-Fabrication Warranty</h2>
              <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 space-y-2">
                <p className="font-semibold text-xs uppercase tracking-wider">Zero Tolerance for Fake Reviews</p>
                <p className="text-xs leading-relaxed">
                  Partner businesses warrant that feedback is solicited solely from genuine, bona fide customers. You shall not purchase artificial reviews, fabricate feedback, or attempt review gating. Violations result in immediate suspension in compliance with the US FTC Rule on Fake Reviews (16 CFR Part 465) and Bureau of Indian Standards (IS 19000:2022).
                </p>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">4. Customer Outreach (WhatsApp & SMS)</h2>
              <p>
                If your business utilizes automated messaging (e.g. WhatsApp Cloud API or SMS integrations) to send review invitations, you certify that you have secured legitimate prior customer consent and opt-in in compliance with telecommunications regulations (e.g., TRAI DND guidelines and Meta Business Policies).
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">5. Artificial Intelligence Disclaimer</h2>
              <p>
                FeedbackDesk uses advanced large language models (Google Gemini 2.5 Flash) for qualitative sentiment scoring, categorization, and executive briefs. AI insights are probabilistic and advisory in nature. They do not constitute formal legal or financial advice.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">6. Data Ownership & Security</h2>
              <p>
                You retain full ownership of your business data and collected reviews. FeedbackDesk processes this data as a Data Processor pursuant to our Data Processing Agreement (DPA). Sensitive customer PII is automatically scrubbed prior to AI inference.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">7. Contact & Support</h2>
              <p>
                For contract inquiries, enterprise SOW agreements, or legal questions, contact our legal counsel team at <a href="mailto:legal@feedbackdesk.com" className="text-primary underline">legal@feedbackdesk.com</a>.
              </p>
            </section>
          </CardContent>
        </Card>

        <div className="flex justify-between items-center text-xs text-muted-foreground pt-4 border-t">
          <p>© {new Date().getFullYear()} FeedbackDesk Technologies. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
            <Link href="/terms" className="hover:underline font-semibold">Terms of Service</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
