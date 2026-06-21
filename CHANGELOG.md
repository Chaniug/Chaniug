# Changelog

## 2025-06-21 — Mobile UX & A11Y Optimization

### Touch & Interaction
- Expand `card-fold-toggle` to 44×44px touch target (was 28px)
- Add `:active` press feedback to `.explore-chip` and `.constellation-node`
- Show carousel prev/next arrow buttons on mobile (38×38px)

### Accessibility
- Contact cards: replace `href="#"` with `role="button" tabindex="0"` + keyboard handlers (prevents mobile scroll-to-top bug)
- Add nav backdrop overlay (tap to close mobile menu)

### Layout Stability (CLS)
- Add `width`/`height` attributes to GitHub stat chart images
- Add skeleton pulse animation on `img[data-src]`
- Add `min-height` fallback for stat card images

### Narrow Viewport (≤380px)
- Contact grid → single column, counter/text sizing reduced, skill chips compact

### Meta & Loading
- Add `theme-color`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-touch-icon`
- Split Dancing Script font to deferred `<link>` (non-blocking)

### Files Changed
- `index.html` — meta tags, contact card semantics, image dimensions, font links
- `css/modules/responsive.css` — touch targets, carousel arrows, nav backdrop, 380px breakpoint
- `css/modules/stats.css` — image CLS prevention, skeleton animation, 380px counters
- `css/modules/explore.css` — `:active` feedback
- `css/modules/tech-stack.css` — `:active` feedback
- `js/personal.js` — contact keyboard a11y, nav backdrop management
