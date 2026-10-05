"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, MailCheck, ArrowLeft, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"

import { useApp } from "@/context/AppContext"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { useToast } from "@/hooks/use-toast"

const formSchema = z.object({
    email: z.string().email({
        message: "Please enter a valid email address.",
    }),
    password: z.string().min(1, {
        message: "Password is required.",
    }),
})

export function LoginForm() {
    const { toast } = useToast()
    const { refetchUser } = useApp()
    const router = useRouter()

    const [isLoading, setIsLoading] = useState(false)
    const [isResending, setIsResending] = useState(false)
    const [requiresOtp, setRequiresOtp] = useState(false)
    const [unverifiedEmail, setUnverifiedEmail] = useState("")
    const [otpCode, setOtpCode] = useState("")
    const [cooldown, setCooldown] = useState(0)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    })

    useEffect(() => {
        if (cooldown <= 0) return
        const timer = setInterval(() => {
            setCooldown((prev) => prev - 1)
        }, 1000)
        return () => clearInterval(timer)
    }, [cooldown])

    async function onSubmitLogin(values: z.infer<typeof formSchema>) {
        setIsLoading(true)
        try {
            await api.auth.login(values)

            refetchUser()

            toast({
                title: "Success",
                description: "You have successfully logged in.",
            })
            router.push("/")
        } catch (error: any) {
            // Check if backend flagged account as unverified
            if (error.message && error.message.includes("Account not verified")) {
                setUnverifiedEmail(values.email)
                setRequiresOtp(true)
                setCooldown(60)
                toast({
                    title: "Verification required",
                    description: "A new verification code has been sent to your email.",
                })
            } else {
                toast({
                    variant: "destructive",
                    title: "Login Error",
                    description: error.message || "Invalid credentials.",
                })
            }
        } finally {
            setIsLoading(false)
        }
    }

    async function handleVerifyOtp(e?: React.FormEvent) {
        if (e) e.preventDefault()
        if (otpCode.length !== 6) {
            toast({
                variant: "destructive",
                title: "Invalid Code",
                description: "Please enter the full 6-digit verification code.",
            })
            return
        }

        setIsLoading(true)
        try {
            await api.auth.verifyOtp({ email: unverifiedEmail, otp: otpCode })
            refetchUser()
            toast({
                title: "Account verified!",
                description: "You have been logged in successfully.",
            })
            router.push("/")
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Verification Failed",
                description: error.message || "Invalid or expired verification code.",
            })
        } finally {
            setIsLoading(false)
        }
    }

    async function handleResendOtp() {
        if (cooldown > 0 || isResending) return
        setIsResending(true)
        try {
            await api.auth.resendOtp({ email: unverifiedEmail })
            setCooldown(60)
            toast({
                title: "Code Resent",
                description: `A new verification code has been sent to ${unverifiedEmail}.`,
            })
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Failed to resend code",
                description: error.message || "Please try again later.",
            })
        } finally {
            setIsResending(false)
        }
    }

    if (requiresOtp) {
        return (
            <div className="space-y-6 text-center">
                <div className="flex flex-col items-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-1">
                        <MailCheck className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-semibold">Verify your email</h2>
                    <p className="text-xs text-muted-foreground max-w-xs">
                        Enter the 6-digit code sent to <span className="font-medium text-foreground">{unverifiedEmail}</span>
                    </p>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-6">
                    <div className="flex justify-center">
                        <InputOTP
                            maxLength={6}
                            value={otpCode}
                            onChange={(val) => setOtpCode(val)}
                        >
                            <InputOTPGroup className="gap-2">
                                <InputOTPSlot index={0} className="bg-white text-slate-900 border-slate-300 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700 rounded-md border shadow-sm" />
                                <InputOTPSlot index={1} className="bg-white text-slate-900 border-slate-300 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700 rounded-md border shadow-sm" />
                                <InputOTPSlot index={2} className="bg-white text-slate-900 border-slate-300 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700 rounded-md border shadow-sm" />
                                <InputOTPSlot index={3} className="bg-white text-slate-900 border-slate-300 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700 rounded-md border shadow-sm" />
                                <InputOTPSlot index={4} className="bg-white text-slate-900 border-slate-300 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700 rounded-md border shadow-sm" />
                                <InputOTPSlot index={5} className="bg-white text-slate-900 border-slate-300 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700 rounded-md border shadow-sm" />
                            </InputOTPGroup>
                        </InputOTP>
                    </div>

                    <Button className="w-full" type="submit" disabled={isLoading || otpCode.length !== 6}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Verify & Sign In
                    </Button>
                </form>

                <div className="flex items-center justify-between pt-2 text-xs">
                    <button
                        type="button"
                        onClick={() => setRequiresOtp(false)}
                        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
                    </button>

                    <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={cooldown > 0 || isResending}
                        className="flex items-center gap-1 text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                    >
                        {isResending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        {cooldown > 0 ? `Resend code (${cooldown}s)` : "Resend code"}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitLogin)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="dark:text-zinc-200 text-xs font-medium">Email</FormLabel>
                            <FormControl>
                                <Input placeholder="name@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="dark:text-zinc-200 text-xs font-medium">Password</FormLabel>
                            <FormControl>
                                <PasswordInput placeholder="Enter your password" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button className="w-full" type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                </Button>
            </form>
        </Form>
    )
}
