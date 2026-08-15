# Landing Conversion Product Requirements

## Objective

Transform the public landing from a broad feature catalog into a product-led
entry point that shows how a production company actually works in Cena Studio.
The first impression must be credible on desktop, mobile and shared links.

## Product principles

1. Product proof comes before visual spectacle. Motion may clarify a workflow,
   but it must never be the reason for the page to exist.
2. Images show the real interface using a controlled demo workspace. Public
   assets must never contain client, supplier, employee or production data.
3. One visual hierarchy dominates each viewport. Visitors should understand the
   value, see the product and find the next action without decoding a collage.
4. Every new visible string ships in Portuguese and English in the same change.
5. Copy is specific, direct and human. Do not use decorative `//`, arrows,
   sparkle glyphs, em dashes, artificial urgency or generic AI claims.

## Requirements

### R1. Product-led first viewport

As a production company owner, I need to understand what Cena does and see a
credible operational screen immediately, so I can decide whether to explore or
start without reading a long feature list.

Acceptance criteria:

1. The first viewport contains one clear value proposition, one primary CTA,
   one secondary product CTA, and a legible real-system visual.
2. The visual is captured from an actual Cena route with controlled demo data.
   It is not an onboarding modal, a placeholder or generated fake UI.
3. The mobile viewport shows the product visual before the visitor must scroll
   through a catalog of claims.
4. Copy in the hero has PT and EN translations and does not use decorative
   symbols or dash-separated slogans.

### R2. Workflow proof

As a buyer, I need to see the full operational story, so I can tell Cena is
more than isolated AI tools.

Acceptance criteria:

1. The landing presents the connected flow: commercial intake, project
   operation, production planning, client approval and delivery.
2. Each proof item maps to a real route or capability in the product.
3. Repetitive catalog cards are reduced or grouped behind this story rather
   than competing with it above the fold.

### R3. Social preview

As someone receiving a Cena link, I need a polished preview that communicates
the real product before I open it.

Acceptance criteria:

1. The root page uses a purpose-built 1200x630 social image based on the
   controlled product workspace.
2. Open Graph, Twitter title, description, image and canonical URL resolve in
   the built HTML.
3. Review, proposal and meeting links keep `noindex` and use server-rendered
   metadata without showing client names or private descriptions in the share
   card.

### R4. Mobile quality

As a visitor on a phone, I need a fast, readable and touch-friendly landing so
I can understand Cena and start a trial with one hand.

Acceptance criteria:

1. No horizontal overflow at 390px, 768px or 1440px.
2. Interactive controls have a minimum 44px target and text stays legible.
3. Heavy visual effects do not block initial content; motion respects
   `prefers-reduced-motion`.
4. Desktop and mobile screenshots are reviewed before the task is closed.

### R5. Measurement-ready conversion

As the product team, we need to know whether the new entry point improves the
funnel once analytics is configured.

Acceptance criteria:

1. Primary CTA, product CTA and pricing CTA have stable identifiers for future
   analytics without adding an analytics vendor to this task.
2. The page does not invent usage numbers, testimonials or customer logos.

## Non-goals

- No decorative WebGL or 3D scene.
- No access to production client data for marketing screenshots.
- No promise that every possible module is a reason to buy.
- No domain or Google Search Console work before the custom domain trigger in
  `docs/STATUS.md`.
