import { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { ShieldCheck, CheckCircle2, TrendingUp } from "lucide-react"

import { SignupForm } from "@/components/auth/signup-form"
import { ModeToggle } from "@/components/mode-toggle"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
    title: "Sign Up - Feedback Desk AI",
    description: "Create an account to start analyzing customer feedback",
}

export default function SignupPage() {
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
                        <TrendingUp className="w-3.5 h-3.5" />
                        Next-Generation Product Workspaces
                    </div>

                    <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
                        Start making data-driven product choices today.
                    </h2>

                    <p className="text-sm xl:text-base text-zinc-400 leading-relaxed">
                        Join modern product managers and engineering leaders using AI intelligence to automatically prioritize bug reports, feature requests, and customer sentiment.
                    </p>

                    <div className="pt-4 space-y-3">
                        <div className="flex items-center gap-3 text-sm text-zinc-300">
                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                            <span>Zero-setup product workspace creation</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-zinc-300">
                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                            <span>Automated OTP verification security via Resend</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-zinc-300">
                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                            <span>Real-time macro decision engine and sentiment trends</span>
                        </div>
                    </div>
                </div>

                {/* Bottom Trust Badge */}
                <div className="relative z-10 pt-6 border-t border-zinc-800/80">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>Free tier includes unlimited product feedbacks</span>
                        <span className="flex items-center gap-1 text-zinc-500">
                            <ShieldCheck className="w-3.5 h-3.5" /> End-to-end verified auth
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
                        <span className="text-xs text-muted-foreground dark:text-zinc-400 hidden sm:inline">Already have an account?</span>
                        <Link
                            href="/login"
                            className={cn(
                                buttonVariants({ variant: "outline", size: "sm" }),
                                "text-xs font-medium dark:bg-zinc-900/80 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white"
                            )}
                        >
                            Log In
                        </Link>
                        <ModeToggle />
                    </div>
                </div>

                {/* Center Form Card */}
                <div className="w-full max-w-[440px] mx-auto my-auto py-8">
                    <div className="space-y-6">
                        <div className="space-y-1.5 text-center sm:text-left">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground dark:text-white">
                                Create an account
                            </h1>
                            <p className="text-sm text-muted-foreground dark:text-zinc-400">
                                Set up your credentials to get started with Feedback Desk
                            </p>
                        </div>

                        <div className="bg-card dark:bg-zinc-900/60 border border-border dark:border-zinc-800/80 shadow-sm rounded-xl p-6 sm:p-7 backdrop-blur-sm">
                            <SignupForm />
                        </div>

                        <p className="text-center text-xs text-muted-foreground dark:text-zinc-500">
                            By clicking create account, you agree to our Terms of Service and Privacy Policy.
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
