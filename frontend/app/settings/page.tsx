"use client";

import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { INDUSTRY_ICONS, INDUSTRY_LABELS, Industry, DEFAULT_CATEGORIES, DEFAULT_AI_PROMPTS, Product } from '@/types';
import { Save, Plus, X, Loader2, Edit3 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function Settings() {
  const { currentProduct, setCurrentProduct, refreshProducts, isBootstrapping } = useApp();
  const [editedProduct, setEditedProduct] = useState<Product | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Sync editedProduct when currentProduct changes
  useEffect(() => {
    if (currentProduct) {
      setEditedProduct(currentProduct);
    }
  }, [currentProduct]);

  if (isBootstrapping) {
    return (
      <AppLayout title="Settings">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-3 text-muted-foreground">
            <div className="h-8 w-8 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-sm">Loading…</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!currentProduct || !editedProduct) {
    return (
      <AppLayout title="Settings">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-4">
            <div className="text-6xl">📦</div>
            <h2 className="text-xl font-semibold">No Product Selected</h2>
            <p className="text-muted-foreground">
              Select a product from the sidebar to configure settings
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Safe category list extraction
  const currentCategories: string[] =
    editedProduct.config?.categories ||
    editedProduct.settings?.categories ||
    (DEFAULT_CATEGORIES[editedProduct.industry] ? DEFAULT_CATEGORIES[editedProduct.industry] : ['General']);

  const handleSave = async () => {
    if (!editedProduct) return;
    setIsSaving(true);
    try {
      const payload = {
        name: editedProduct.name,
        description: editedProduct.description,
        industry: editedProduct.industry,
        categories: currentCategories,
        config: {
          categories: currentCategories,
          aiPrompt: editedProduct.config?.aiPrompt || DEFAULT_AI_PROMPTS[editedProduct.industry]
        }
      };

      const res = await fetch(`/api/products/${editedProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update settings');
      }

      const updatedData = await res.json();

      const updatedProductObj: Product = {
        ...editedProduct,
        name: updatedData.name || editedProduct.name,
        description: updatedData.description || editedProduct.description,
        industry: updatedData.industry || editedProduct.industry,
        settings: updatedData.settings || payload,
        config: {
          categories: currentCategories,
          aiPrompt: payload.config.aiPrompt
        }
      };

      setEditedProduct(updatedProductObj);
      setCurrentProduct(updatedProductObj);
      refreshProducts();
      setIsEditing(false);

      toast({
        title: 'Settings Saved',
        description: 'Product settings and categories updated successfully.',
      });
    } catch (err: any) {
      console.error('Failed to save product settings:', err);
      toast({
        title: 'Error Saving Settings',
        description: err.message || 'Failed to save settings.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (currentProduct) {
      setEditedProduct(currentProduct);
      setIsEditing(false);
      toast({
        title: 'Edit Cancelled',
        description: 'Restored original product settings.',
      });
    }
  };

  const MAX_CATEGORIES = 10;

  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    const trimmed = newCategory.trim();

    if (currentCategories.length >= MAX_CATEGORIES) {
      toast({
        title: 'Limit Reached',
        description: `You can add up to ${MAX_CATEGORIES} categories per product for optimal AI classification.`,
        variant: 'destructive',
      });
      return;
    }

    if (currentCategories.includes(trimmed)) {
      toast({
        title: 'Category Exists',
        description: 'This category already exists.',
        variant: 'destructive',
      });
      return;
    }

    const updatedCategories = [...currentCategories, trimmed];
    setEditedProduct({
      ...editedProduct,
      config: {
        ...(editedProduct.config || { categories: [] }),
        categories: updatedCategories,
      },
      settings: {
        ...(editedProduct.settings || {}),
        categories: updatedCategories,
      }
    });
    setNewCategory('');
  };

  const handleRemoveCategory = (category: string) => {
    const updatedCategories = currentCategories.filter(c => c !== category);
    setEditedProduct({
      ...editedProduct,
      config: {
        ...(editedProduct.config || { categories: [] }),
        categories: updatedCategories,
      },
      settings: {
        ...(editedProduct.settings || {}),
        categories: updatedCategories,
      }
    });
  };



  const handleIndustryChange = (industry: Industry) => {
    const defaultCats = DEFAULT_CATEGORIES[industry] || ['General'];
    const defaultPrompt = DEFAULT_AI_PROMPTS[industry] || 'General analysis prompt.';

    setEditedProduct({
      ...editedProduct,
      industry,
      config: {
        categories: defaultCats,
        aiPrompt: defaultPrompt,
      },
      settings: {
        ...(editedProduct.settings || {}),
        categories: defaultCats,
      }
    });
  };

  return (
    <AppLayout title="Settings" description={`Configure ${currentProduct.name}`}>
      <div className="w-full space-y-6 pb-12">
        {/* Top Header Bar with Single Edit & Save Action Control */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
              {INDUSTRY_ICONS[editedProduct.industry] || '🏢'}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight">{editedProduct.name}</h1>
                <Badge variant="outline" className="text-xs">
                  {INDUSTRY_LABELS[editedProduct.industry]}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {isEditing ? 'Editing product details, categories, and AI context' : 'View product configuration and domain settings'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} size="sm" className="text-xs h-9 gap-1.5 min-w-[100px]">
                <Edit3 className="h-3.5 w-3.5" />
                Edit
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving} className="text-xs h-9">
                  Cancel
                </Button>
                <Button onClick={handleSave} size="sm" disabled={isSaving} className="text-xs h-9 gap-1.5 min-w-[120px]">
                  {isSaving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      Save Changes
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Product Information Card */}
        <Card className="shadow-sm border-border">
          <CardHeader className="pb-4 border-b border-border/50">
            <CardTitle className="text-base flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-primary" />
              Product Information
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">Basic details about your product workspace</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            {isEditing ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-medium">Product Name</Label>
                  <Input
                    id="name"
                    value={editedProduct.name || ''}
                    onChange={e =>
                      setEditedProduct({ ...editedProduct, name: e.target.value })
                    }
                    placeholder="Enter product name..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-xs font-medium">Description</Label>
                  <Textarea
                    id="description"
                    value={editedProduct.description || ''}
                    onChange={e =>
                      setEditedProduct({ ...editedProduct, description: e.target.value })
                    }
                    rows={3}
                    placeholder="Brief summary of your product..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry" className="text-xs font-medium">Industry Category</Label>
                  <Select
                    value={editedProduct.industry || 'tech'}
                    onValueChange={handleIndustryChange}
                  >
                    <SelectTrigger id="industry">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(INDUSTRY_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">
                            {INDUSTRY_ICONS[key as Industry]} {label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Changing industry will update suggested defaults for feedback taxonomy
                  </p>
                </div>
              </>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1 p-3 rounded-lg bg-muted/20 border border-border/40">
                  <span className="text-xs font-medium text-muted-foreground block">Product Name</span>
                  <span className="text-sm font-semibold text-foreground">{editedProduct.name}</span>
                </div>

                <div className="space-y-1 p-3 rounded-lg bg-muted/20 border border-border/40">
                  <span className="text-xs font-medium text-muted-foreground block">Industry Category</span>
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span>{INDUSTRY_ICONS[editedProduct.industry] || '🏢'}</span>
                    <span>{INDUSTRY_LABELS[editedProduct.industry]}</span>
                  </div>
                </div>

                <div className="sm:col-span-2 space-y-1 p-3 rounded-lg bg-muted/20 border border-border/40">
                  <span className="text-xs font-medium text-muted-foreground block">Description</span>
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    {editedProduct.description || 'No description provided for this product.'}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feedback Categories Card */}
        <Card className="shadow-sm border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/50">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Feedback Categories</CardTitle>
                <Badge variant="outline" className="text-xs font-mono">
                  {currentCategories.length} / {MAX_CATEGORIES}
                </Badge>
              </div>
              <CardDescription className="text-xs mt-0.5">Categories for organizing and classifying customer feedback</CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            <div className="flex flex-wrap gap-2 min-h-[40px] items-center p-3 rounded-lg bg-muted/30 border border-border/50">
              {currentCategories.map(category => (
                <Badge
                  key={category}
                  variant="secondary"
                  className="flex items-center gap-1.5 pr-1.5 py-1 text-xs font-medium"
                >
                  <span>🏷️ {category}</span>
                  {isEditing && (
                    <button
                      onClick={() => handleRemoveCategory(category)}
                      className="ml-1 p-0.5 hover:bg-destructive/20 hover:text-destructive rounded transition-colors"
                      type="button"
                      title={`Remove ${category}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>

            {isEditing && (
              <div className="flex gap-2">
                <Input
                  placeholder="Add user defined category..."
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCategory();
                    }
                  }}
                  className="text-xs"
                />
                <Button onClick={handleAddCategory} disabled={!newCategory.trim()} size="sm" className="text-xs h-10 px-4 gap-1">
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Configuration Card */}
        <Card className="shadow-sm border-border">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-base">AI Classification Context</CardTitle>
            <CardDescription className="text-xs">Domain rules and AI prioritization context for {editedProduct.name}</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="p-4 rounded-lg bg-muted/40 border border-border/60 space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-3xl p-1.5 rounded-md bg-background border border-border">{INDUSTRY_ICONS[editedProduct.industry] || '🏢'}</span>
                <div>
                  <p className="font-semibold text-sm">{INDUSTRY_LABELS[editedProduct.industry] || editedProduct.industry}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    AI prioritizes {editedProduct.industry === 'tech' ? 'bugs, API stability, and performance bottlenecks' :
                      editedProduct.industry === 'healthcare' ? 'patient experience, compliance, and wait times' :
                        editedProduct.industry === 'infrastructure' ? 'safety, reliability, and service outages' :
                          'general customer sentiment and service requests'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
