"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2 } from "lucide-react"

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
import { useApp } from "@/context/AppContext"

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
    }).max(5, {
        message: "Maximum 5 categories allowed.",
    }),
})

interface CreateProductDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function CreateProductDialog({ open, onOpenChange, onSuccess }: CreateProductDialogProps) {
    const { toast } = useToast()
    const { addProduct } = useApp()
    const [isLoading, setIsLoading] = useState(false)
    const [industries, setIndustries] = useState<string[]>([])
    const [labels, setLabels] = useState<string[]>([])

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            description: "",
            categories: [], // Initialize as empty array
        },
    })

    const selectedIndustry = form.watch("industry")

    useEffect(() => {
        if (open) {
            api.products.getIndustries().then(setIndustries).catch(console.error)
        }
    }, [open])

    useEffect(() => {
        if (selectedIndustry) {
            api.products.getLabels(selectedIndustry).then(setLabels).catch(console.error)
            // Only reset if the current categories are not valid for the new industry?
            // Actually, safer to reset to avoid submitting invalid categories.
            // But we need to be careful not to infinite loop if we set value inside effect dep on form.
            const currentCategories = form.getValues("categories");
            // If we just opened and set industry (e.g. edit mode future proofing), we might not want to reset.
            // But for create mode, it's fine.
            form.setValue("categories", [])
        }
    }, [selectedIndustry, form]) // Removed form from deps to avoid loop if setValue triggers re-render? No, setValue doesn't change form identity.

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true)
        try {
            await addProduct({
                name: values.name,
                industry: values.industry as any, // Type cast if necessary as industry string comes from API
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
            onOpenChange(false)
            if (onSuccess) onSuccess()
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

    const toggleCategory = (category: string) => {
        const current = form.getValues("categories") || []
        if (current.includes(category)) {
            form.setValue("categories", current.filter(c => c !== category))
        } else {
            if (current.length < 5) {
                form.setValue("categories", [...current, category])
            }
        }
        // Force re-render of selection UI since watch might not catch deep array mutation if not careful, 
        // but setValue should trigger it if we are watching "categories".
        // Let's rely on form.watch in the render.
    }

    // Watch categories to update UI
    const watchedCategories = form.watch("categories")

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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

                        {labels.length > 0 && (
                            <FormField
                                control={form.control}
                                name="categories"
                                render={() => (
                                    <FormItem>
                                        <FormLabel>Feedback Categories (Select up to 5)</FormLabel>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {labels.map(label => {
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
                                        <FormDescription>
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
