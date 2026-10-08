"use client";

import { useState, useEffect, useRef, Suspense } from "react";
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
import {
  Plus,
  Package,
  Link,
  QrCode,
  Share2,
  Copy,
  Loader2,
  RefreshCw,
  Download,
} from "lucide-react";
import { CreateProductDialog } from "@/components/products/create-product-dialog";
import { toast } from "@/hooks/use-toast";
import { formatFriendlyDate } from "@/lib/dates";
import { authFetch } from "@/lib/api";
import { QRCodeSVG } from "qrcode.react";

function ProductsContent() {
  const { products, refreshProducts, isLoadingProduct } = useApp();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [qrProduct, setQrProduct] = useState<Product | null>(null);
  const [qrUrl, setQrUrl] = useState<string>("");
  const [isGeneratingQr, setIsGeneratingQr] = useState<boolean>(false);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [isDownloadingQr, setIsDownloadingQr] = useState(false);
  const qrSvgRef = useRef<SVGSVGElement | null>(null);

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

  /** Prefer long-lived opaque /f/{token} public links over legacy signed URLs. */
  const getProductPublicUrl = async (product: Product): Promise<string> => {
    const existingPath = product.public_feedback_path;
    if (existingPath && typeof existingPath === "string") {
      return `${window.location.origin}${existingPath.startsWith("/") ? existingPath : `/${existingPath}`}`;
    }

    const response = await authFetch(`/api/products/${product.id}/public-link`);
    if (!response.ok) {
      if (response.status === 401) {
        toast({
          title: "Authentication required",
          description: "Please log in to generate the link.",
          variant: "destructive",
        });
        throw new Error("Authentication required");
      }
      if (response.status === 404) {
        // No active link — regenerate one
        const regen = await authFetch(`/api/products/${product.id}/public-link/regenerate`, {
          method: "POST",
        });
        if (!regen.ok) {
          throw new Error("Failed to create public link");
        }
        const regenData = await regen.json();
        const path = regenData.path || (regenData.token ? `/f/${regenData.token}` : null);
        if (!path) throw new Error("Failed to create public link");
        return `${window.location.origin}${path}`;
      }
      throw new Error("Failed to fetch public link");
    }

    const data = await response.json();
    const path = data.path || (data.token ? `/f/${data.token}` : null);
    if (!path) throw new Error("Public link missing from response");
    return `${window.location.origin}${path}`;
  };

  const handleCopyLink = async (product: Product) => {
    try {
      const url = await getProductPublicUrl(product);
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied",
        description: "Long-lived feedback link copied. Share it with your users.",
      });
    } catch (error) {
      console.error("Failed to copy public link:", error);
      toast({
        title: "Error",
        description: "Failed to copy feedback link.",
        variant: "destructive",
      });
    }
  };

  const handleShareOS = async (product: Product) => {
    try {
      const url = await getProductPublicUrl(product);
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
      const url = await getProductPublicUrl(product);
      setQrUrl(url);
    } catch (error) {
      console.error("Failed to generate QR code:", error);
      setQrProduct(null);
      toast({
        title: "Error",
        description: "Failed to generate QR code.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingQr(false);
    }
  };

  const handleRegenerateLink = async () => {
    if (!qrProduct) return;
    const confirmed = window.confirm(
      "Regenerate this feedback link? The current link will stop working immediately."
    );
    if (!confirmed) return;

    setIsRegenerating(true);
    try {
      const response = await authFetch(
        `/api/products/${qrProduct.id}/public-link/regenerate`,
        { method: "POST" }
      );
      if (!response.ok) {
        throw new Error("Failed to regenerate link");
      }
      const data = await response.json();
      const path = data.path || (data.token ? `/f/${data.token}` : null);
      if (!path) throw new Error("Missing path in regenerate response");
      const url = `${window.location.origin}${path}`;
      setQrUrl(url);
      toast({
        title: "Link regenerated",
        description: "Previous link is now inactive. Copy the new link to share.",
      });
      refreshProducts();
    } catch (error) {
      console.error("Failed to regenerate link:", error);
      toast({
        title: "Error",
        description: "Failed to regenerate public link.",
        variant: "destructive",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDownloadQr = async () => {
    if (!qrProduct || !qrUrl || !qrSvgRef.current) return;

    setIsDownloadingQr(true);
    try {
      const svg = qrSvgRef.current;
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svg);
      const svgBlob = new Blob([svgString], {
        type: "image/svg+xml;charset=utf-8",
      });
      const objectUrl = URL.createObjectURL(svgBlob);

      const size = Math.max(svg.width.baseVal.value, svg.height.baseVal.value, 200);
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");

      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Failed to render QR image"));
        image.src = objectUrl;
      });

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);

      const filename = `${qrProduct.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "product"}-qr.png`;

      const pngUrl = canvas.toDataURL("image/png");
      const anchor = document.createElement("a");
      anchor.href = pngUrl;
      anchor.download = filename;
      anchor.click();

      toast({
        title: "QR downloaded",
        description: "PNG image saved to your device.",
      });
    } catch (error) {
      console.error("Failed to download QR code:", error);
      toast({
        title: "Error",
        description: "Failed to download QR image.",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingQr(false);
    }
  };

  return (
    <AppLayout title="Products" description="Manage your products">
      <div className="space-y-4 sm:space-y-6">
        {/* Header Actions */}
        <div className="flex justify-end">
          <Button onClick={() => setIsCreateOpen(true)} className="max-sm:w-full">
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2 max-sm:p-4 max-sm:pb-2">
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
                <CardContent className="max-sm:px-4 max-sm:pb-4">
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {products.map((product) => (
              <Card
                key={product.id}
                className="transition-all hover:shadow-md border-border"
              >
                <CardHeader className="pb-2 max-sm:space-y-3 max-sm:p-4 max-sm:pb-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl shrink-0">
                        {INDUSTRY_ICONS[product.industry] || '🏢'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base font-semibold truncate">
                          {product.name}
                        </CardTitle>
                        <Badge variant="outline" className="mt-1 max-w-full text-xs font-normal truncate">
                          {INDUSTRY_LABELS[product.industry] || product.industry}
                        </Badge>
                      </div>
                    </div>

                    {/* Action buttons: OS Share, QR Code, Copy Link */}
                    <div className="flex items-center justify-end gap-0.5 sm:gap-1 shrink-0 max-sm:-mx-1 max-sm:border-t max-sm:border-border/60 max-sm:pt-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleShareOS(product)}
                        title="Share via OS"
                        className="h-9 w-9 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenQr(product)}
                        title="View QR Code"
                        className="h-9 w-9 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground"
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopyLink(product)}
                        title="Copy feedback link"
                        className="h-9 w-9 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Link className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="max-sm:px-4 max-sm:pb-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.description || "No description provided"}
                  </p>
                </CardContent>
                <CardFooter className="pt-0 flex items-center justify-between text-xs text-muted-foreground max-sm:px-4 max-sm:pb-4">
                  <span>
                    Created{" "}
                    {product.created_at
                      ? formatFriendlyDate(product.created_at)
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
                  Scan this QR code with any mobile camera to open the feedback form. Link does not expire.
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
                      ref={qrSvgRef}
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

              <Button
                size="sm"
                onClick={handleDownloadQr}
                disabled={isDownloadingQr || isGeneratingQr || !qrUrl}
                className="w-full mt-2 text-xs gap-1.5"
              >
                {isDownloadingQr ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Download QR image
              </Button>

              <Button
                size="sm"
                variant="secondary"
                onClick={handleRegenerateLink}
                disabled={isRegenerating || isGeneratingQr || !qrUrl}
                className="w-full mt-2 text-xs gap-1.5"
              >
                {isRegenerating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Regenerate link
              </Button>
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
