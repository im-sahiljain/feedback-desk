import { NextResponse } from "next/server";
import { proxyAuthorizedJson } from "@/lib/bffAuth";

type Context = { params: Promise<{ path: string[] }> };
async function forward(
  request: Request,
  context: Context,
  method: "GET" | "POST" | "PATCH" | "DELETE",
) {
  const { path } = await context.params;
  // Do not proxy arbitrary backend paths.
  if (!path.length || path.some((p) => !/^[a-z0-9-]{1,80}$/i.test(p)))
    return NextResponse.json({ message: "Invalid route" }, { status: 400 });
  const pathname = path.join("/");
  const allowed =
    pathname === "issues" ||
    pathname === "reconcile" ||
    pathname === "ask" ||
    pathname === "alerts" ||
    pathname === "alerts/refresh" ||
    pathname === "conversations" ||
    pathname === "notifications" ||
    pathname === "preferences" ||
    pathname === "customers" ||
    /^conversations\/[0-9a-f-]{36}$/.test(pathname) ||
    /^notifications\/[0-9a-f-]{36}$/.test(pathname) ||
    /^issues\/[0-9a-f-]{36}(\/(evidence|history|impact|merge|split))?$/.test(
      pathname,
    );
  if (!allowed)
    return NextResponse.json(
      { message: "Unknown intelligence endpoint" },
      { status: 404 },
    );
  const url = new URL(request.url);
  const query = url.searchParams.toString();
  const body = method === "GET" ? undefined : await request.text();
  if (body && body.length > 12000)
    return NextResponse.json({ message: "Request too large" }, { status: 413 });
  return proxyAuthorizedJson(
    `/api/intelligence/${pathname}${query ? "?" + query : ""}`,
    {
      method,
      ...(body === undefined
        ? {}
        : { body, headers: { "Content-Type": "application/json" } }),
    },
    { fallbackError: "Issue intelligence request failed" },
  );
}
export async function GET(req: Request, ctx: Context) {
  return forward(req, ctx, "GET");
}
export async function POST(req: Request, ctx: Context) {
  return forward(req, ctx, "POST");
}
export async function PATCH(req: Request, ctx: Context) {
  return forward(req, ctx, "PATCH");
}

export async function DELETE(req: Request, ctx: Context) {
  return forward(req, ctx, "DELETE");
}
