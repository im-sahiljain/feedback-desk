"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { INDUSTRY_ICONS, INDUSTRY_LABELS, Product } from "@/types";
import { Plus, Package, Link, QrCode, Share2, Copy, Loader2 } from "lucide-react";
import { CreateProductDialog } from "@/components/products/create-product-dialog";
import { toast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";

function ProductsContent() {
  const { products, refreshProducts, isLoadingProduct } = useApp();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [qrProduct, setQrProduct] = useState<Product | null>(null);
  const [qrUrl, setQrUrl] = useState<string>("");
  const [isGeneratingQr, setIsGeneratingQr] = useState<boolean>(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const action = searchParams.get("action");

  useEffect(() => {
    if (action === "create") {
      setIsCreateOpen(true);
    }
  }, [action]);

  const handleCreateOpenChange = (open: boolean) => {
    setIsCreateOpen(open);
    if (!open && action === "create") {
      router.push("/products");
    }
  };

  const handleProductCreated = () => {
    refreshProducts();
  };

  const getProductSignedUrl = async (product: Product): Promise<string> => {
    const response = await fetch("/api/products/sign-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        industry: product.industry,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        toast({
          title: "Authentication required",
          description: "Please log in to generate the link.",
          variant: "destructive",
        });
        throw new Error("Authentication required");
      }
      throw new Error("Failed to sign link");
    }

    const { signature, userId } = await response.json();
    return `${window.location.origin}/submit-feedback/${product.id}/${userId}/${product.industry}?sig=${signature}`;
  };

  const handleCopyLink = async (product: Product) => {
    try {
      const url = await getProductSignedUrl(product);
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied",
        description: "The feedback link has been copied. Share it with your users.",
      });
    } catch (error) {
      console.error("Failed to copy signed link:", error);
    }
  };

  const handleShareOS = async (product: Product) => {
    try {
      const url = await getProductSignedUrl(product);
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: product.name,
          text: `Share feedback for ${product.name}`,
          url: url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast({
          title: "Link copied to clipboard",
          description: "OS sharing is not available on this browser. Link copied instead.",
        });
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Failed to share:", err);
        toast({
          title: "Error",
          description: "Failed to share link.",
          variant: "destructive",
        });
      }
    }
  };

  const handleOpenQr = async (product: Product) => {
    setQrProduct(product);
    setIsGeneratingQr(true);
    try {
      const url = await getProductSignedUrl(product);
      setQrUrl(url);
    } catch (error) {
      console.error("Failed to generate QR code:", error);
      setQrProduct(null);
    } finally {
      setIsGeneratingQr(false);
    }
  };

  return (
    <AppLayout title="Products" description="Manage your products">
      <div className="space-y-6">
        {/* Header Actions */}
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
        {isLoadingProduct ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
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
            {products.map((product) => (
              <Card
                key={product.id}
                className="transition-all hover:shadow-md border-border"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl shrink-0">
                        {INDUSTRY_ICONS[product.industry] || '🏢'}
                      </span>
                      <div className="min-w-0">
                        <CardTitle className="text-base font-semibold truncate">
                          {product.name}
                        </CardTitle>
                        <Badge variant="outline" className="mt-1 text-xs font-normal truncate">
                          {INDUSTRY_LABELS[product.industry] || product.industry}
                        </Badge>
                      </div>
                    </div>

                    {/* Action buttons: OS Share, QR Code, Copy Link */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleShareOS(product)}
                        title="Share via OS"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenQr(product)}
                        title="View QR Code"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopyLink(product)}
                        title="Copy feedback link"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Link className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.description || "No description provided"}
                  </p>
                </CardContent>
                <CardFooter className="pt-0 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Created{" "}
                    {product.created_at
                      ? new Date(product.created_at).toLocaleDateString()
                      : "recently"}
                  </span>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* QR Code Modal Dialog */}
        <Dialog open={!!qrProduct} onOpenChange={(open) => { if (!open) setQrProduct(null); }}>
          {qrProduct && (
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader className="text-center sm:text-center pb-2">
                <DialogTitle className="text-base flex items-center justify-center gap-2">
                  <span>{INDUSTRY_ICONS[qrProduct.industry] || '🏢'}</span>
                  {qrProduct.name} QR Code
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Scan this QR code with any mobile camera to open the feedback form.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col items-center justify-center p-6 bg-card rounded-xl border border-border my-2">
                {isGeneratingQr ? (
                  <div className="flex flex-col items-center py-8 gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">Generating QR Code...</span>
                  </div>
                ) : (
                  <div className="p-4 bg-white rounded-xl shadow-md border border-zinc-200">
                    <QRCodeSVG
                      value={qrUrl}
                      size={200}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Input value={qrUrl} readOnly className="text-xs font-mono" />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(qrUrl);
                    toast({
                      title: "Link copied",
                      description: "Feedback link copied to clipboard.",
                    });
                  }}
                  className="shrink-0 text-xs gap-1"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy
                </Button>
              </div>
            </DialogContent>
          )}
        </Dialog>
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
