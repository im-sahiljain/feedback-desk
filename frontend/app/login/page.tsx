import { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { Sparkles, ShieldCheck, CheckCircle2 } from "lucide-react"

import { LoginForm } from "@/components/auth/login-form"
import { ModeToggle } from "@/components/mode-toggle"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
    title: "Login - Feedback Desk AI",
    description: "Sign in to your Feedback Desk AI account",
}

export default function LoginPage() {
    return (
        <div className="min-h-screen w-full lg:grid lg:grid-cols-2 bg-background dark:bg-zinc-950">
            {/* Left Hero / Branding Panel (Desktop) */}
            <div className="hidden lg:flex relative flex-col justify-between bg-zinc-950 text-white p-12 border-r border-zinc-800/80 overflow-hidden">
                {/* Subtle Ambient Background Accents */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.12),transparent_40%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />

                {/* Brand Header */}
                <div className="relative z-10 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center p-1.5 backdrop-blur-sm">
                        <Image src="/chat.png" alt="Logo" width={28} height={28} className="object-contain" />
                    </div>
                    <div>
                        <span className="text-lg font-bold tracking-tight text-white block">Feedback Desk AI</span>
                        <span className="text-xs text-zinc-400">Enterprise Feedback Intelligence</span>
                    </div>
                </div>

                {/* Value Proposition */}
                <div className="relative z-10 max-w-lg space-y-6 my-auto">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-orange-400">
                        <Sparkles className="w-3.5 h-3.5" />
                        AI-Powered Product Prioritization
                    </div>

                    <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
                        Turn raw customer voice into executive decision power.
                    </h2>

                    <p className="text-sm xl:text-base text-zinc-400 leading-relaxed">
                        Aggregate feedback, analyze sentiment trends, and generate comprehensive AI-driven executive briefs in seconds.
                    </p>

                    <div className="pt-4 space-y-3">
                        <div className="flex items-center gap-3 text-sm text-zinc-300">
                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                            <span>Instant impact classification and urgency scoring</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-zinc-300">
                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                            <span>Executive operational briefs powered by Google Gemini</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-zinc-300">
                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                            <span>Multi-product workspace management with secure links</span>
                        </div>
                    </div>
                </div>

                {/* Bottom Testimonial / Social Proof */}
                <div className="relative z-10 pt-6 border-t border-zinc-800/80">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>Trusted by high-velocity product & engineering teams</span>
                        <span className="flex items-center gap-1 text-zinc-500">
                            <ShieldCheck className="w-3.5 h-3.5" /> Enterprise-grade security
                        </span>
                    </div>
                </div>
            </div>

            {/* Right Auth Form Section */}
            <div className="flex flex-col min-h-screen justify-between p-6 sm:p-10 lg:p-12 bg-background dark:bg-zinc-950 text-foreground dark:text-zinc-100">
                {/* Top Bar */}
                <div className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-2.5 lg:hidden">
                        <Image src="/chat.png" alt="Logo" width={28} height={28} />
                        <span className="text-base font-semibold tracking-tight text-foreground dark:text-white">Feedback Desk AI</span>
                    </div>
                    <div className="hidden lg:block" />

                    <div className="flex items-center gap-3 ml-auto">
                        <span className="text-xs text-muted-foreground dark:text-zinc-400 hidden sm:inline">Don&apos;t have an account?</span>
                        <Link
                            href="/signup"
                            className={cn(
                                buttonVariants({ variant: "outline", size: "sm" }),
                                "text-xs font-medium dark:bg-zinc-900/80 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white"
                            )}
                        >
                            Sign Up
                        </Link>
                        <ModeToggle />
                    </div>
                </div>

                {/* Center Form Card */}
                <div className="w-full max-w-[400px] mx-auto my-auto py-8">
                    <div className="space-y-6">
                        <div className="space-y-1.5 text-center sm:text-left">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground dark:text-white">
                                Welcome back
                            </h1>
                            <p className="text-sm text-muted-foreground dark:text-zinc-400">
                                Enter your credentials to access your workspaces
                            </p>
                        </div>

                        <div className="bg-card dark:bg-zinc-900/60 border border-border dark:border-zinc-800/80 shadow-sm rounded-xl p-6 sm:p-7 backdrop-blur-sm">
                            <LoginForm />
                        </div>

                        <p className="text-center text-xs text-muted-foreground dark:text-zinc-500">
                            By continuing, you agree to our Terms of Service and Privacy Policy.
                        </p>
                    </div>
                </div>

                {/* Footer copyright */}
                <div className="w-full text-center text-xs text-muted-foreground dark:text-zinc-500 pt-4">
                    &copy; {new Date().getFullYear()} Feedback Desk AI. All rights reserved.
                </div>
            </div>
        </div>
    )
}
