import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  feedbackFilterHref,
  insightsHref,
  formatChangeTone,
  formatPositiveChangeTone,
} from "../lib/dashboard";
import type { DashboardChangeDelta } from "../types";

describe("dashboard navigation helpers", () => {
  it("builds feedback deep links from real filters", () => {
    assert.equal(
      feedbackFilterHref({ priority: "high", sentiment: "negative" }),
      "/feedback?priority=high&sentiment=negative",
    );
    assert.equal(
      feedbackFilterHref({ category: "Delivery", status: "failed" }),
      "/feedback?category=Delivery&status=failed",
    );
    assert.equal(feedbackFilterHref({}), "/feedback");
  });

  it("builds insights deep links with period", () => {
    assert.equal(insightsHref({ period: "30d" }), "/insights?period=30d");
    assert.equal(
      insightsHref({ period: "7d", category: "Support" }),
      "/insights?period=7d&category=Support",
    );
  });

  it("uses semantic tones without inventing values", () => {
    const up: DashboardChangeDelta = {
      absolute: 5,
      percent: 20,
      display: "↑ 20%",
      direction: "up",
      meaningful: true,
      smallSample: false,
    };
    const down: DashboardChangeDelta = {
      ...up,
      direction: "down",
      display: "↓ 20%",
    };
    assert.match(formatChangeTone(up), /destructive/);
    assert.match(formatChangeTone(down), /emerald/);
    assert.match(formatPositiveChangeTone(up), /emerald/);
  });
});
