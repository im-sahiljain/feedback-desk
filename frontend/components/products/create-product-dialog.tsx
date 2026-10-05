"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { Product } from "@/types"

const MAX_CATEGORIES = 10;

const formSchema = z.object({
    name: z.string().min(2, {
        message: "Name must be at least 2 characters.",
    }),
    industry: z.string({
        required_error: "Please select an industry.",
    }),
    description: z.string().optional(),
    categories: z.array(z.string()).min(1, {
        message: "Select at least one category.",
    }).max(MAX_CATEGORIES, {
        message: `Maximum ${MAX_CATEGORIES} categories allowed.`,
    }),
})

interface CreateProductDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: (product: Product) => void
}

export function CreateProductDialog({ open, onOpenChange, onSuccess }: CreateProductDialogProps) {
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(false)
    const [industries, setIndustries] = useState<string[]>([])
    const [labels, setLabels] = useState<string[]>([])
    const [customLabels, setCustomLabels] = useState<string[]>([])
    const [customInput, setCustomInput] = useState('')

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            description: "",
            categories: [],
        },
    })

    const selectedIndustry = form.watch("industry")
    const watchedCategories = form.watch("categories") || []

    useEffect(() => {
        if (open) {
            api.products.getIndustries().then(setIndustries).catch(console.error)
        }
    }, [open])

    useEffect(() => {
        if (selectedIndustry) {
            api.products.getLabels(selectedIndustry).then(fetchedLabels => {
                setLabels(fetchedLabels)
                setCustomLabels([])
                form.setValue("categories", [], { shouldValidate: true })
            }).catch(console.error)
        }
    }, [selectedIndustry])

    const toggleCategory = (category: string) => {
        const current = form.getValues("categories") || []
        if (current.includes(category)) {
            form.setValue("categories", current.filter(c => c !== category), { shouldValidate: true })
        } else {
            if (current.length < MAX_CATEGORIES) {
                form.setValue("categories", [...current, category], { shouldValidate: true })
            } else {
                toast({
                    title: "Limit Reached",
                    description: `Select up to ${MAX_CATEGORIES} categories.`,
                    variant: "destructive"
                })
            }
        }
    }

    const handleAddCustomCategory = () => {
        const trimmed = customInput.trim()
        if (!trimmed) return

        const allAvailable = Array.from(new Set([...labels, ...customLabels]))
        if (allAvailable.includes(trimmed)) {
            if (!watchedCategories.includes(trimmed)) {
                toggleCategory(trimmed)
            }
            setCustomInput('')
            return
        }

        if (watchedCategories.length >= MAX_CATEGORIES) {
            toast({
                title: "Limit Reached",
                description: `Select up to ${MAX_CATEGORIES} categories.`,
                variant: "destructive"
            })
            return
        }

        setCustomLabels(prev => [...prev, trimmed])
        form.setValue("categories", [...watchedCategories, trimmed], { shouldValidate: true })
        setCustomInput('')
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true)
        try {
            const newProduct = await api.products.create({
                name: values.name,
                industry: values.industry as any,
                description: values.description || "",
                config: {
                    categories: values.categories,
                    aiPrompt: "",
                    focusAreas: [],
                }
            })
            toast({
                title: "Product created",
                description: "Your new product has been created.",
            })
            form.reset()
            setCustomLabels([])
            onOpenChange(false)
            if (onSuccess) onSuccess(newProduct)
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "Failed to create product.",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const allPills = Array.from(new Set([...labels, ...customLabels]))

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle>Create New Product</DialogTitle>
                    <DialogDescription>
                        Setup a new product for your feedback.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Product Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="My Awesome Product" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="industry"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Industry</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select an industry" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {industries.map(ind => (
                                                <SelectItem key={ind} value={ind}>
                                                    {ind}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {selectedIndustry && (
                            <FormField
                                control={form.control}
                                name="categories"
                                render={() => (
                                    <FormItem>
                                        <div className="flex items-center justify-between">
                                            <FormLabel>Feedback Categories (Select up to {MAX_CATEGORIES})</FormLabel>
                                            <span className="text-xs text-muted-foreground font-mono">
                                                {watchedCategories.length} / {MAX_CATEGORIES} selected
                                            </span>
                                        </div>

                                        {/* Custom Category Input */}
                                        <div className="flex gap-2 my-2">
                                            <Input
                                                placeholder="Add custom category..."
                                                value={customInput}
                                                onChange={e => setCustomInput(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleAddCustomCategory();
                                                    }
                                                }}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={handleAddCustomCategory}
                                                disabled={!customInput.trim()}
                                            >
                                                <Plus className="h-4 w-4 mr-1" /> Add
                                            </Button>
                                        </div>

                                        {/* Original Pill UI */}
                                        {allPills.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {allPills.map(label => {
                                                    const isSelected = watchedCategories?.includes(label)
                                                    return (
                                                        <div
                                                            key={label}
                                                            onClick={() => toggleCategory(label)}
                                                            className={`cursor-pointer px-3 py-1.5 rounded-full text-sm border transition-colors ${isSelected
                                                                ? "bg-primary text-primary-foreground border-primary"
                                                                : "bg-background hover:bg-muted"
                                                                }`}
                                                        >
                                                            {label}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}

                                        <FormDescription className="mt-1">
                                            These categories will be used to classify incoming feedback.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Brief description of your product..."
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Product
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
