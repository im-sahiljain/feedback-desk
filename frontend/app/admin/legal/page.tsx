"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Scale,
  ShieldCheck,
  FileText,
  Lock,
  Building2,
  CheckCircle2,
  Download,
  ExternalLink,
  Info,
  Check,
  Copy,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";

export default function AdminLegalCompliancePage() {
  const [activeTab, setActiveTab] = useState("msa");
  const [copiedDoc, setCopiedDoc] = useState<string | null>(null);

  const handleCopy = (docName: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDoc(docName);
    toast({
      title: "Copied to Clipboard",
      description: `${docName} has been copied.`,
    });
    setTimeout(() => setCopiedDoc(null), 2500);
  };

  return (
    <AdminLayout
      title="Legal, Terms & Privacy Governance"
      description="Binding B2B SaaS contracts, Data Processing Agreement (DPA), KYC guidelines & global compliance"
      activeTab="legal"
    >
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {/* Compliance Header Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-background to-background p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 gap-1.5 font-medium">
                  <ShieldCheck className="h-3.5 w-3.5" /> Certified Compliance Ready
                </Badge>
                <Badge variant="secondary" className="text-xs">GDPR • DPDP Act 2023 • FTC 16 CFR 465</Badge>
              </div>
              <h2 className="text-lg font-bold tracking-tight">Enterprise Legal & Regulatory Suite</h2>
              <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
                Standardized Master Services Agreements (MSA), Data Processing Agreements (DPA), and Business KYC guidelines to facilitate frictionless corporate contracting.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/terms" target="_blank">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <ExternalLink className="h-3.5 w-3.5" /> Public Terms
                </Button>
              </Link>
              <Link href="/privacy" target="_blank">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <ExternalLink className="h-3.5 w-3.5" /> Public Privacy
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Tabbed Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full h-auto p-1 bg-muted/60">
            <TabsTrigger value="msa" className="gap-2 py-2 text-xs font-medium">
              <Scale className="h-4 w-4" /> B2B SaaS Terms (MSA)
            </TabsTrigger>
            <TabsTrigger value="dpa" className="gap-2 py-2 text-xs font-medium">
              <Lock className="h-4 w-4" /> Data Processing (DPA)
            </TabsTrigger>
            <TabsTrigger value="kyc" className="gap-2 py-2 text-xs font-medium">
              <Building2 className="h-4 w-4" /> Business KYC Guide
            </TabsTrigger>
            <TabsTrigger value="compliance" className="gap-2 py-2 text-xs font-medium">
              <CheckCircle2 className="h-4 w-4" /> Regulatory Standards
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Master Services Agreement */}
          <TabsContent value="msa" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Scale className="h-4 w-4 text-primary" /> Master Services Agreement (MSA)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Binding commercial contract defining SaaS licenses, 99.9% uptime SLA, authentic review warranty, and liability caps.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => handleCopy("MSA Summary", "Master Services Agreement available at docs/legal/01_MASTER_SERVICES_AGREEMENT_B2B_SaaS.md")}
                >
                  {copiedDoc === "MSA Summary" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  Copy Reference
                </Button>
              </CardHeader>
              <CardContent className="space-y-4 text-xs leading-relaxed text-muted-foreground">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl border bg-card space-y-1">
                    <p className="font-semibold text-foreground text-xs">Customer Definition</p>
                    <p>The partner business contracting with FeedbackDesk is the legal "Customer" or "Client".</p>
                  </div>
                  <div className="p-3.5 rounded-xl border bg-card space-y-1">
                    <p className="font-semibold text-foreground text-xs">Anti-Fabrication Warranty</p>
                    <p>Prohibits generating fake or paid reviews. Violations terminate service immediately.</p>
                  </div>
                  <div className="p-3.5 rounded-xl border bg-card space-y-1">
                    <p className="font-semibold text-foreground text-xs">Service SLA & Liability</p>
                    <p>99.9% monthly availability guarantee. Liability capped at fees paid in prior 12 months.</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border bg-muted/30 font-mono text-[11px] whitespace-pre-wrap max-h-72 overflow-y-auto">
{`# 01_MASTER_SERVICES_AGREEMENT_B2B_SaaS.md (Excerpt)

1. Provision of Services: FeedbackDesk grants Customer a worldwide, non-exclusive license to use the single-use token platform, counter QR dispensers, and Gemini AI taxonomy.
2. Legitimate Reviews: Customer covenants that feedback is collected from bona fide consumers. No review manipulation.
3. WhatsApp & Messaging: Customer warrants valid prior opt-in consent for automated phone outreach.
4. AI Disclaimer: Generative AI insights are probabilistic and advisory; Customer retains operational authority.
5. Location of full contract: file:///home/sahil/feedback-desk/docs/legal/01_MASTER_SERVICES_AGREEMENT_B2B_SaaS.md`}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Data Processing Agreement */}
          <TabsContent value="dpa" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lock className="h-4 w-4 text-emerald-500" /> Data Processing Agreement (DPA)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    GDPR Article 28 & India DPDP Act 2023 compliant agreement governing sub-processors and data handling.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => handleCopy("DPA Summary", "Data Processing Agreement available at docs/legal/02_DATA_PROCESSING_AGREEMENT_DPA.md")}
                >
                  {copiedDoc === "DPA Summary" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  Copy Reference
                </Button>
              </CardHeader>
              <CardContent className="space-y-4 text-xs leading-relaxed text-muted-foreground">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl border bg-card space-y-1">
                    <p className="font-semibold text-foreground text-xs">Legal Roles</p>
                    <p><strong>Business = Data Controller / Fiduciary</strong>.<br /><strong>FeedbackDesk = Data Processor</strong>.</p>
                  </div>
                  <div className="p-3.5 rounded-xl border bg-card space-y-1">
                    <p className="font-semibold text-foreground text-xs">Sub-Processors Disclosed</p>
                    <p>Google GenAI (Gemini 2.5 Flash), Render/AWS PostgreSQL, and Meta WhatsApp Cloud API.</p>
                  </div>
                  <div className="p-3.5 rounded-xl border bg-card space-y-1">
                    <p className="font-semibold text-foreground text-xs">Security Standards (TOMs)</p>
                    <p>TLS 1.3 in transit, AES-256 at rest, automated PII scrubber, 48-hour breach notification.</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border bg-muted/30 font-mono text-[11px] whitespace-pre-wrap max-h-72 overflow-y-auto">
{`# 02_DATA_PROCESSING_AGREEMENT_DPA.md (Excerpt)

1. Scope: Ingesting review text, generating star ratings, scrubbing PII, and categorizing feedback.
2. Automated PII Sanitization: Pre-inference regex scrubber strips credit cards, SSNs, Aadhaar numbers, and phone numbers.
3. Sub-processors: Google Cloud / GenAI (US/Global), PostgreSQL Cloud (Frankfurt/Mumbai/US), Meta WhatsApp API.
4. Breach Notification: Written notification within 48 hours of confirmed data breach.
5. Location of full contract: file:///home/sahil/feedback-desk/docs/legal/02_DATA_PROCESSING_AGREEMENT_DPA.md`}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: Business KYC & Document Checklist */}
          <TabsContent value="kyc" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-amber-500" /> Documents Required FROM Client Businesses
                </CardTitle>
                <CardDescription className="text-xs">
                  Checklist of KYC verification and legal documents to collect from partner businesses prior to onboarding.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs leading-relaxed">
                <div className="space-y-3">
                  <div className="p-3 rounded-xl border bg-card flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="font-bold text-xs text-primary">1</span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-xs">Business Registration & Tax ID (KYC)</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        GSTIN Registration Certificate, Certificate of Incorporation (CIN), Business PAN (India), or IRS EIN Letter & Articles of Formation (US). Proves the business is a legally registered commercial entity.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border bg-card flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="font-bold text-xs text-primary">2</span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-xs">Authorized Signatory Proof</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        Board Resolution, Power of Attorney (PoA), or corporate Letter of Authority. Guarantees the signing representative has legal authority to execute the MSA and DPA.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border bg-card flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="font-bold text-xs text-primary">3</span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-xs">Customer Messaging Consent Declaration</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        Mandatory written declaration that customer phone numbers provided for WhatsApp/SMS feedback invitations were gathered with valid opt-in consent (TRAI DND & TCPA compliance).
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: Regulatory Standards */}
          <TabsContent value="compliance" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" /> India DPDP Act 2023 & BIS IS 19000:2022
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-2">
                  <p>• <strong>Data Minimization:</strong> Zero customer PII collected to issue single-use tokens.</p>
                  <p>• <strong>Review Authenticity:</strong> In accordance with Bureau of Indian Standards (IS 19000:2022) guidelines for online consumer reviews, submissions are write-once and protected against duplication.</p>
                  <p>• <strong>Grievance Redressal:</strong> Dedicated Grievance Officer email provided for data inquiries.</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" /> US FTC Rule (16 CFR Part 465) & EU GDPR
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-2">
                  <p>• <strong>FTC Fake Review Rule:</strong> Complete prohibition against fake, bought, or gated reviews.</p>
                  <p>• <strong>GDPR Article 28:</strong> Standardized Controller-to-Processor DPA with strict sub-processor controls.</p>
                  <p>• <strong>ePrivacy Exemption:</strong> Functional anti-spam storage is 100% exempt from cookie consent popups.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
