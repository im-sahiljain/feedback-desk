"use client";

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { INDUSTRY_ICONS, INDUSTRY_LABELS, Industry, DEFAULT_CATEGORIES, DEFAULT_AI_PROMPTS } from '@/types';
import { Save, Plus, X, RotateCcw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function Settings() {
  const { currentProduct, updateProduct, userRole } = useApp();
  const [editedProduct, setEditedProduct] = useState(currentProduct);
  const [newCategory, setNewCategory] = useState('');

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

  if (userRole !== 'admin') {
    return (
      <AppLayout title="Settings">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-4">
            <div className="text-6xl">🔒</div>
            <h2 className="text-xl font-semibold">Admin Access Required</h2>
            <p className="text-muted-foreground">
              Switch to Admin role to access settings
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const handleSave = () => {
    updateProduct(currentProduct.id, editedProduct);
    toast({
      title: 'Settings Saved',
      description: 'Product configuration has been updated.',
    });
  };

  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    if (editedProduct.config.categories.includes(newCategory.trim())) {
      toast({
        title: 'Category Exists',
        description: 'This category already exists.',
        variant: 'destructive',
      });
      return;
    }

    setEditedProduct({
      ...editedProduct,
      config: {
        ...editedProduct.config,
        categories: [...editedProduct.config.categories, newCategory.trim()],
      },
    });
    setNewCategory('');
  };

  const handleRemoveCategory = (category: string) => {
    setEditedProduct({
      ...editedProduct,
      config: {
        ...editedProduct.config,
        categories: editedProduct.config.categories.filter(c => c !== category),
      },
    });
  };

  const handleResetCategories = () => {
    setEditedProduct({
      ...editedProduct,
      config: {
        ...editedProduct.config,
        categories: DEFAULT_CATEGORIES[editedProduct.industry],
      },
    });
  };

  const handleResetPrompt = () => {
    setEditedProduct({
      ...editedProduct,
      config: {
        ...editedProduct.config,
        aiPrompt: DEFAULT_AI_PROMPTS[editedProduct.industry],
      },
    });
  };

  const handleIndustryChange = (industry: Industry) => {
    setEditedProduct({
      ...editedProduct,
      industry,
      config: {
        ...editedProduct.config,
        categories: DEFAULT_CATEGORIES[industry],
        aiPrompt: DEFAULT_AI_PROMPTS[industry],
      },
    });
  };

  return (
    <AppLayout title="Settings" description={`Configure ${currentProduct.name}`}>
      <div className="max-w-2xl space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Product Information</CardTitle>
            <CardDescription>Basic details about your product</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                value={editedProduct.name}
                onChange={e =>
                  setEditedProduct({ ...editedProduct, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editedProduct.description}
                onChange={e =>
                  setEditedProduct({ ...editedProduct, description: e.target.value })
                }
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Select
                value={editedProduct.industry}
                onValueChange={handleIndustryChange}
              >
                <SelectTrigger>
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
              <p className="text-xs text-muted-foreground">
                Changing industry will reset categories and AI prompt to defaults
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Categories */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Feedback Categories</CardTitle>
                <CardDescription>Categories for organizing feedback</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleResetCategories}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {editedProduct.config.categories.map(category => (
                <Badge
                  key={category}
                  variant="secondary"
                  className="flex items-center gap-1 pr-1"
                >
                  {category}
                  <button
                    onClick={() => handleRemoveCategory(category)}
                    className="ml-1 p-0.5 hover:bg-background/50 rounded"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="New category..."
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
              />
              <Button onClick={handleAddCategory} disabled={!newCategory.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* AI Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">AI Configuration</CardTitle>
                <CardDescription>Customize how AI analyzes feedback</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleResetPrompt}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="aiPrompt">AI Analysis Prompt</Label>
              <Textarea
                id="aiPrompt"
                value={editedProduct.config.aiPrompt}
                onChange={e =>
                  setEditedProduct({
                    ...editedProduct,
                    config: { ...editedProduct.config, aiPrompt: e.target.value },
                  })
                }
                rows={4}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                This prompt guides how AI interprets and categorizes feedback for this product
              </p>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <p className="text-sm font-medium">Current Industry Context</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{INDUSTRY_ICONS[editedProduct.industry]}</span>
                <div>
                  <p className="font-medium">{INDUSTRY_LABELS[editedProduct.industry]}</p>
                  <p className="text-xs text-muted-foreground">
                    AI will prioritize {editedProduct.industry === 'tech' ? 'bugs and performance' :
                      editedProduct.industry === 'healthcare' ? 'patient safety and experience' :
                        editedProduct.industry === 'infrastructure' ? 'safety and quality' :
                          'general feedback'} issues
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} size="lg">
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
