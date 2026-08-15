# Landing Conversion Product Design

## Information architecture

The page answers five questions in order.

1. What is Cena for a production company?
2. What does a real job look like inside it?
3. How does the work move from opportunity to client approval?
4. Which operating capabilities support that flow?
5. How can I start or compare plans?

The hero leads with product proof. The workflow section replaces a large amount
of feature enumeration with a compact connected story. Detailed modules remain
available below it for visitors who need to evaluate depth.

## Visual direction

Use the existing dark operational character, but make it clearer and lighter to
scan. Product windows may have depth through restrained perspective and layered
real screenshots. They must not pretend to be a 3D experience. No floating
orb, bokeh, faux terminal punctuation or decorative glyph language.

Each product asset uses the same controlled demo company and a coherent active
job. The screenshots should show useful, non-sensitive data such as scheduled
work, owners, due dates, costs and approval state. The visual story is more
believable when the same job appears in each surface.

## Responsive behavior

Desktop uses a balanced text and product layout. Mobile uses a compact header,
direct value proposition, CTA pair and an uncropped product surface immediately
after the copy. The product image must preserve enough height to read it; a
thin 155px crop is not acceptable as the main proof.

Animations are progressive enhancement. A static first frame must communicate
the product. Hover-only behavior gets a touch equivalent, and reduced-motion
users receive the same information with no looping transitions.

## Copy and localization

All new visible copy is keyed through the current language system. PT and EN
are written as native product copy, not literal word-by-word conversions. The
copy names outcomes and working moments instead of repeating broad AI language.

## Social asset

The root social card is a distinct 1200x630 image. It uses the controlled demo
screen with a concise product title and no small text that becomes unreadable in
WhatsApp. It is separate from the hero composition so cropping one never harms
the other.

## Verification

Use component tests for stable CTA identifiers and translated copy. Use
Playwright screenshots at 390px, 768px and 1440px. Inspect the rendered root
HTML for social metadata and inspect public link HTML after deployment.
