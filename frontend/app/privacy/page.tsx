"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck, Lock, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PrivacyPolicyPage() {
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
            <Lock className="h-4 w-4 text-emerald-500" />
            GDPR & DPDP Act 2023 Compliant
          </div>
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Privacy Policy & Data Protection
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground">
            Last Updated: October 2026 • Applicable to partner businesses, administrative users, and end-consumers.
          </p>
        </div>

        <Card className="shadow-sm">
          <CardContent className="pt-6 space-y-8 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">1. Privacy by Design & Data Minimization</h2>
              <p>
                FeedbackDesk is built around the fundamental principle of data minimization (GDPR Art. 5(1)(c) and India DPDP Act Sec. 6). We do not collect unnecessary consumer personal data to distribute feedback links or record ratings.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-xl border bg-muted/30 space-y-1.5">
                  <p className="font-semibold text-xs flex items-center gap-1.5 text-foreground">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" /> What We Collect
                  </p>
                  <p className="text-xs text-muted-foreground leading-normal">
                    Rating (1-5), qualitative feedback comments, optional email (if consumer chooses to provide), and single-use link tokens.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border bg-muted/30 space-y-1.5">
                  <p className="font-semibold text-xs flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                    <EyeOff className="h-4 w-4" /> What We NEVER Collect
                  </p>
                  <p className="text-xs text-muted-foreground leading-normal">
                    NO hardware canvas fingerprinting, NO battery API or MAC address scraping, and NO advertising tracking cookies.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">2. Automated PII Sanitization for AI Processing</h2>
              <p>
                Before any review text is analyzed by our artificial intelligence engine (Google Gemini 2.5 Flash), it passes through an automated pre-processor (<code className="px-1.5 py-0.5 rounded bg-muted text-xs">sanitizeForAi</code>) that detects and scrubs credit card numbers, social security numbers, Aadhaar patterns, and secret keys. Data is never used to train public machine learning foundation models.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">3. Anti-Spam Security & Local Storage</h2>
              <p>
                We use HTML5 <code className="px-1.5 py-0.5 rounded bg-muted text-xs">localStorage</code> strictly for functional anti-spam security (such as remembering a 30-day device cooldown per product). Under the EU ePrivacy Directive (Directive 2002/58/EC Art. 5(3)), strictly functional security tokens are exempt from banner consent requirements.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">4. Data Roles (Controller vs. Processor)</h2>
              <p>
                Under global privacy legislation:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>The Business is the Data Controller / Data Fiduciary:</strong> They manage customer relationships and decide to collect feedback.</li>
                <li><strong>FeedbackDesk is the Data Processor:</strong> We host, sanitize, analyze, and present the feedback solely on behalf of the business.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">5. Your Data Subject Rights</h2>
              <p>
                Regardless of your location, you have the right to request access to, correction of, or deletion of your feedback record. To submit a Data Subject Access Request (DSAR), contact our Data Protection Officer at <a href="mailto:privacy@feedbackdesk.com" className="text-primary underline">privacy@feedbackdesk.com</a>.
              </p>
            </section>
          </CardContent>
        </Card>

        <div className="flex justify-between items-center text-xs text-muted-foreground pt-4 border-t">
          <p>© {new Date().getFullYear()} FeedbackDesk Technologies. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:underline font-semibold">Privacy Policy</Link>
            <Link href="/terms" className="hover:underline">Terms of Service</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
