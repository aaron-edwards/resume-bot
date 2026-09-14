import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Neither happy-dom nor jsdom does real SVG layout: happy-dom's getBBox /
// getComputedTextLength exist but always report zero size, while jsdom
// doesn't implement SVGGraphicsElement/SVGTextElement/SVGTSpanElement at all
// (svg text/tspan nodes are plain SVGElement there), so those methods are
// missing entirely. Either way, libraries that lay out SVG based on real
// label sizes (e.g. mermaid's dagre layout) end up collapsing everything to
// a single empty point. Fake plausible measurements on every class that
// might carry these methods — the more specific ones (which happy-dom
// defines and which shadow the base class) as well as the base SVGElement
// (which is as specific as jsdom gets) — so layout has something to work
// with in either environment.
function fakeGetBBox(this: Element) {
  const text = this.textContent ?? "";
  return {
    x: 0,
    y: 0,
    width: Math.max(text.length * 7, 16),
    height: 16,
  } as DOMRect;
}

function fakeGetComputedTextLength(this: Element) {
  return Math.max((this.textContent ?? "").length * 7, 1);
}

const getBBoxTargets = [
  typeof SVGGraphicsElement !== "undefined" ? SVGGraphicsElement : undefined,
  typeof SVGElement !== "undefined" ? SVGElement : undefined,
];
for (const ctor of getBBoxTargets) {
  if (!ctor) continue;
  // biome-ignore lint/suspicious/noExplicitAny: patching a DOM API these lib.dom types don't declare on the base class
  (ctor.prototype as any).getBBox = fakeGetBBox;
}

const textLengthTargets = [
  typeof SVGTextElement !== "undefined" ? SVGTextElement : undefined,
  typeof SVGTSpanElement !== "undefined" ? SVGTSpanElement : undefined,
  typeof SVGElement !== "undefined" ? SVGElement : undefined,
];
for (const ctor of textLengthTargets) {
  if (!ctor) continue;
  // biome-ignore lint/suspicious/noExplicitAny: patching a DOM API these lib.dom types don't declare on the base class
  (ctor.prototype as any).getComputedTextLength = fakeGetComputedTextLength;
}
