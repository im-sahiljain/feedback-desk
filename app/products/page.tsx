"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { INDUSTRY_ICONS, INDUSTRY_LABELS, Product } from '@/types';
import { Plus, Trash2, Package, Link } from 'lucide-react';
import { CreateProductDialog } from '@/components/products/create-product-dialog';
import { toast } from '@/hooks/use-toast';

function ProductsContent() {
  const { products, currentProduct, setCurrentProduct, deleteProduct, userRole, user } = useApp();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const action = searchParams.get('action');

  useEffect(() => {
    if (action === 'create') {
      setIsCreateOpen(true);
    }
  }, [action]);

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this product? All feedback will be lost.')) {
      deleteProduct(id);
    }
  };

  const handleCreateOpenChange = (open: boolean) => {
    setIsCreateOpen(open);
    if (!open && action === 'create') {
      // Remove query param when closing
      router.push('/products');
    }
  };

  const handleCopyLink = async (userId: string | number | null | undefined, product: Product) => {
    if (!userId) {
      alert("Please log in again to copy the feedback link.");
      return;
    }

    try {
      const response = await fetch('/api/products/sign-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          userId: userId,
          industry: product.industry
        })
      });

      if (!response.ok) throw new Error('Failed to sign link');

      const { signature } = await response.json();
      const url = `${window.location.origin}/submit-feedback/${product.id}/${userId}/${product.industry}?sig=${signature}`;

      await navigator.clipboard.writeText(url);

      toast({
        title: "Link copied",
        description: "The feedback link has been copied to your clipboard.",
      });

    } catch (error) {
      console.error("Failed to copy signed link:", error);
      alert("Failed to generate secure link. Please try again.");
    }
  };

  return (
    <AppLayout title="Products" description="Manage your products">
      <div className="space-y-6">
        {/* Header Actions */}
        {userRole === 'admin' && (
          <div className="flex justify-end">
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Product
            </Button>
            <CreateProductDialog
              open={isCreateOpen}
              onOpenChange={handleCreateOpenChange}
              onSuccess={() => {
                // Optional: maybe refresh or just close? 
                // Dialog closes itself in onSubmit success, checking prop usage
                // The component calls onOpenChange(false), so we might get double close if we also do it here?
                // Let's rely on onOpenChange.
              }}
            />
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
                        {/* <Button className="text-xs text-muted-foreground mt-1 cursor-pointer" onClick={(e) => {
                          e.stopPropagation();
                          handleCopyLink(user?.id, product);
                        }}>Copy feedback link</Button> */}

                      </div>
                    </div>
                    <div className="flex items-center gap-2">


                      {isActive && (
                        <Badge className="shrink-0">Active</Badge>
                      )} <Link onClick={(e) => {
                        e.stopPropagation();
                        handleCopyLink(user?.id, product);
                      }} className="cursor-pointer" /></div>
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

export default function Products() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProductsContent />
    </Suspense>
  );
}
