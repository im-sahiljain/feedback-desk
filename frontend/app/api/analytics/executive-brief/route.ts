import { NextResponse } from "next/server";
import { authorizedBackendFetch } from "@/lib/bffAuth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("product_id");

    if (!productId) {
      return NextResponse.json(
        { message: "Product ID is required" },
        { status: 400 },
      );
    }

    const { response, unauthorized, applyAuthCookies } =
      await authorizedBackendFetch(
        `/api/analytics/executive-brief?${searchParams.toString()}`,
      );

    if (unauthorized || !response) {
      const errorResponse = NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 },
      );
      applyAuthCookies(errorResponse);
      return errorResponse;
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errorResponse = NextResponse.json(
        { message: errData.error || "Failed to fetch executive brief" },
        { status: response.status },
      );
      applyAuthCookies(errorResponse);
      return errorResponse;
    }

    const data = await response.json();
    const nextResponse = NextResponse.json(data);
    nextResponse.headers.set("Cache-Control", "no-store");
    applyAuthCookies(nextResponse);
    return nextResponse;
  } catch (error) {
    console.error("Executive Brief Proxy Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
