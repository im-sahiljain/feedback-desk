import { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { LoginForm } from "@/components/auth/login-form"
import { ModeToggle } from "@/components/mode-toggle"


export const metadata: Metadata = {
    title: "Login - Feedback Desk AI",
    description: "Login to your account",
}

export default function LoginPage() {
    return (
        <div className="w-full relative h-[100dvh] flex flex-col items-center justify-center overflow-hidden">
            {/* <div
                className="absolute inset-0 bg-cover bg-bottom bg-no-repeat opacity-50 scale-[1.6]"
                // style={{ backgroundImage: 'url("https://res.cloudinary.com/drhx7imeb/image/upload/v1756215257/gradient-optimized_nfrakk.svg")' }}
                style={{ backgroundImage: 'url("/bg1.jpg")' }}
                
            /> */}
            <div
                className="absolute inset-0 bg-bottom bg-no-repeat opacity-50 scale-[1.6] gradient-background"
            />


            <div className="w-full flex items-center justify-between z-20 p-4">
                <div className="flex items-center gap-2">
                    <Image src="/chat.png" alt="Logo" width={24} height={24} />
                    <span className="text-foreground text-lg font-medium leading-none">
                        Feedback Desk AI
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        href="/signup"
                        className={cn(buttonVariants({ variant: "ghost" }))}
                    >
                        Sign Up
                    </Link>
                    <ModeToggle />
                </div>
            </div>

            <div className="relative z-10 lg:p-8 flex items-center justify-center h-full w-full">
                <div className="mx-auto flex flex-col justify-center space-y-6 w-[350px] md:w-[400px] lg:w-[500px] bg-white/20 backdrop-blur-lg border border-white/20 shadow-xl rounded-xl p-8">
                    <div className="flex flex-col space-y-2 text-center">
                        {/* <div className="flex items-center justify-center gap-2 mb-2">
                            <Image src="/chat.png" alt="Logo" width={24} height={24} />
                            <span className="text-foreground text-lg font-medium">Feedback Desk AI</span>
                        </div> */}
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Login to your account
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Enter your email below to login to your account
                        </p>
                    </div>
                    <LoginForm />
                    {/* <p className="px-8 text-center text-sm text-muted-foreground">
                        By clicking continue, you agree to our{" "}
                        <Link
                            href="/terms"
                            className="underline underline-offset-4 hover:text-primary transition-colors duration-500"
                        >
                            Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link
                            href="/privacy"
                            className="underline underline-offset-4 hover:text-primary"
                        >
                            Privacy Policy
                        </Link>
                        .
                    </p> */}
                </div>
            </div>
        </div>
    )
}
