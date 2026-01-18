"use client";

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { INDUSTRY_ICONS, INDUSTRY_LABELS, Industry, DEFAULT_CATEGORIES, DEFAULT_AI_PROMPTS } from '@/types';
import { Plus, Trash2, Edit, Package } from 'lucide-react';

export default function Products() {
  const { products, currentProduct, setCurrentProduct, addProduct, deleteProduct, userRole } = useApp();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    industry: 'tech' as Industry,
  });

  const handleCreate = () => {
    if (!newProduct.name.trim()) return;

    addProduct({
      name: newProduct.name,
      description: newProduct.description,
      industry: newProduct.industry,
      config: {
        categories: DEFAULT_CATEGORIES[newProduct.industry],
        aiPrompt: DEFAULT_AI_PROMPTS[newProduct.industry],
        focusAreas: [],
      },
    });

    setNewProduct({ name: '', description: '', industry: 'tech' });
    setIsCreateOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this product? All feedback will be lost.')) {
      deleteProduct(id);
    }
  };

  return (
    <AppLayout title="Products" description="Manage your product workspaces">
      <div className="space-y-6">
        {/* Header Actions */}
        {userRole === 'admin' && (
          <div className="flex justify-end">
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Product
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Product</DialogTitle>
                  <DialogDescription>
                    Add a new product workspace to collect and analyze feedback.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Product Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., My SaaS App"
                      value={newProduct.name}
                      onChange={e => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Brief description of your product..."
                      value={newProduct.description}
                      onChange={e => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Select
                      value={newProduct.industry}
                      onValueChange={value => setNewProduct(prev => ({ ...prev, industry: value as Industry }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
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
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={!newProduct.name.trim()}>
                    Create Product
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Products Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(product => {
            const isActive = currentProduct?.id === product.id;

            return (
              <Card
                key={product.id}
                className={`cursor-pointer transition-all hover:shadow-lg ${isActive ? 'ring-2 ring-primary shadow-lg' : 'hover:ring-1 hover:ring-border'
                  }`}
                onClick={() => setCurrentProduct(product)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{INDUSTRY_ICONS[product.industry]}</span>
                      <div>
                        <CardTitle className="text-base">{product.name}</CardTitle>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {INDUSTRY_LABELS[product.industry]}
                        </Badge>
                      </div>
                    </div>
                    {isActive && (
                      <Badge className="shrink-0">Active</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.description || 'No description provided'}
                  </p>
                </CardContent>
                <CardFooter className="pt-0 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Created {new Date(product.createdAt).toLocaleDateString('en-US')}
                  </span>
                  {userRole === 'admin' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={e => {
                        e.stopPropagation();
                        handleDelete(product.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {products.length === 0 && (
          <Card className="py-12">
            <CardContent className="text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold text-lg mb-2">No Products Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first product workspace to start collecting feedback.
              </p>
              {userRole === 'admin' && (
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Product
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
