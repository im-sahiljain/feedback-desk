"use client"

import { useMemo } from "react"
import { Check, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"

interface PasswordStrengthMeterProps {
    password: string
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
    const strength = useMemo(() => {
        let score = 0
        if (!password) return 0

        if (password.length >= 8) score += 25
        if (/[A-Z]/.test(password)) score += 25
        if (/[0-9]/.test(password)) score += 25
        if (/[^A-Za-z0-9]/.test(password)) score += 25

        return score
    }, [password])

    const color = useMemo(() => {
        if (strength <= 25) return "bg-red-500"
        if (strength <= 50) return "bg-orange-500"
        if (strength <= 75) return "bg-yellow-500"
        return "bg-green-500"
    }, [strength])

    const requirements = [
        { label: "At least 8 characters", met: password.length >= 8 },
        { label: "Contains uppercase letter", met: /[A-Z]/.test(password) },
        { label: "Contains number", met: /[0-9]/.test(password) },
        { label: "Contains special character", met: /[^A-Za-z0-9]/.test(password) },
    ]

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                    <div
                        className={cn("h-full transition-all duration-500", color)}
                        style={{ width: `${strength}%` }}
                    />
                </div>
            </div>

            <div className="space-y-2">
                {requirements.map((req, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                        {req.met ? (
                            <Check className="h-3 w-3 text-green-500" />
                        ) : (
                            <X className="h-3 w-3 text-muted-foreground/50" />
                        )}
                        <span
                            className={cn(
                                req.met ? "text-green-500" : "text-muted-foreground"
                            )}
                        >
                            {req.label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}
