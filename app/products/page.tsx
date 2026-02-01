"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { INDUSTRY_ICONS, INDUSTRY_LABELS, Product } from '@/types';
import { Plus, Trash2, Package, Link } from 'lucide-react';
import { CreateProductDialog } from '@/components/products/create-product-dialog';
import { toast } from '@/hooks/use-toast';
import { Loader } from '@/components/loader';

function ProductsContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const action = searchParams.get('action');

  // Fetch products on mount
  useEffect(() => {
    setIsLoading(true);
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        if (data.length > 0 && !currentProduct) {
          setCurrentProduct(data[0]);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (action === 'create') {
      setIsCreateOpen(true);
    }
  }, [action]);

  // const handleDelete = async (id: string) => {
  //   if (window.confirm('Are you sure you want to delete this product? All feedback will be lost.')) {
  //     try {
  //       await fetch(`/api/products/${id}`, { method: 'DELETE' });
  //       setProducts(prev => prev.filter(p => p.id !== id));
  //       if (currentProduct?.id === id) {
  //         setCurrentProduct(null);
  //       }
  //     } catch (error) {
  //       console.error('Failed to delete product:', error);
  //     }
  //   }
  // };

  const handleCreateOpenChange = (open: boolean) => {
    setIsCreateOpen(open);
    if (!open && action === 'create') {
      router.push('/products');
    }
  };

  const handleProductCreated = (newProduct: Product) => {
    setProducts(prev => [...prev, newProduct]);
    setCurrentProduct(newProduct);
  };

  const handleCopyLink = async (product: Product) => {
    try {
      const response = await fetch('/api/products/sign-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          industry: product.industry
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: "Authentication required",
            description: "Please log in to copy the feedback link.",
            variant: "destructive"
          });
          return;
        }
        throw new Error('Failed to sign link');
      }

      const { signature, userId } = await response.json();
      const url = `${window.location.origin}/submit-feedback/${product.id}/${userId}/${product.industry}?sig=${signature}`;

      await navigator.clipboard.writeText(url);

      toast({
        title: "Link copied",
        description: "The feedback link has been copied. Share it with your users.",
      });

    } catch (error) {
      console.error("Failed to copy signed link:", error);
      toast({
        title: "Error",
        description: "Failed to generate secure link. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <AppLayout title="Products" description="Manage your products">
      <div className="space-y-6">
        {/* Header Actions - always visible */}
        <div className="flex justify-end">
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Product
          </Button>
          <CreateProductDialog
            open={isCreateOpen}
            onOpenChange={handleCreateOpenChange}
            onSuccess={handleProductCreated}
          />
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-muted animate-pulse rounded" />
                      <div className="space-y-2">
                        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                        <div className="h-5 w-16 bg-muted animate-pulse rounded" />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-4 w-full bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : products.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold text-lg mb-2">No Products Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first product workspace to start collecting feedback.
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Product
              </Button>
            </CardContent>
          </Card>
        ) : (
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
                      <div className="flex items-center gap-2">
                        {isActive && (
                          <Badge className="shrink-0">Active</Badge>
                        )}
                        <Link
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyLink(product);
                          }}
                          className="cursor-pointer hover:bg-primary/10 p-2 rounded-md w-8 h-8 flex items-center justify-center"
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {product.description || 'No description provided'}
                    </p>
                  </CardContent>
                  <CardFooter className="pt-0 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Created {new Date(product.created_at).toLocaleDateString()}

                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={e => {
                        e.stopPropagation();
                        // handleDelete(product.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
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
