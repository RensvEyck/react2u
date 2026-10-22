import { expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MiniMarkdown } from "./md";

it("rendert alinea's, lijsten, vet en links", () => {
  const html = renderToStaticMarkup(React.createElement(MiniMarkdown, {
    text: "Lees de [checklist](/blog/loonsanctie-voorkomen) en **let op**.\n\n- punt met [UWV](https://www.uwv.nl)\n\n[klik](javascript:void)",
  }));
  expect(html).toContain('<p>Lees de <a href="/blog/loonsanctie-voorkomen">checklist</a> en <strong>let op</strong>.</p>');
  expect(html).toContain('<li>punt met <a href="https://www.uwv.nl" rel="noopener">UWV</a></li>');
  expect(html).toContain("<p>[klik](javascript:void)</p>");
});
