import { renderPromotionLinks } from "../src/index.js";

const html = renderPromotionLinks([
  {
    id: "afdian",
    kind: "support",
    url: "https://afdian.com/a/eigentime",
    label: "Support Eigentime",
    order: 10
  },
  {
    id: "source",
    kind: "repository",
    url: "https://github.com/wowayou/personal-blog",
    label: "View source",
    order: 20
  }
], {
  ariaLabel: "Support and project links"
});

console.log(html);
