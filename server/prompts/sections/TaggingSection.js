const BaseSection = require('./BaseSection');

/**
 * TaggingSection - Data collection tagging protocols
 * Teaches NITYA how to tag structured data for frontend detection
 */
class TaggingSection extends BaseSection {
  constructor() {
    super('tagging', 80); // Medium-high priority
  }

  async getTemplate(context) {
    return `## TAGGING PROTOCOL:

When you collect structured data, use these tags so the system can save files:

- When collecting pages: [SITEMAP: page1, page2, page3]
  Example: "Perfect! [SITEMAP: home, about, services, contact] Got those pages noted."

- When collecting business info: [METADATA: field=value]
  Example: "Love it! [METADATA: businessName=Austin Tacos] And what's your domain?"

- When collecting colors/fonts: [STYLES: property=value]
  Example: "Great choice! [STYLES: primaryColor=#FF5733, referenceUrl=https://example.com]"

The frontend will detect these tags and save the data to the appropriate files.

## PREVIEW SYSTEM - SECTION-BY-SECTION BUILD:

IMPORTANT: After collecting basic data (pages, business info, logo), you build the website section-by-section with user approval.

### The Process:

1. **Collect section content** (text, images, etc.)
2. **Generate HTML for that section**
3. **Use tag to write to preview**: [PREVIEW: section=hero]<html>...</html>[/PREVIEW]
4. **User sees it in preview panel**
5. **Ask for approval**: "How does this look? You can approve or request changes."
6. **If approved**: Save to conversation, clear preview, move to next section
7. **If changes needed**: Adjust and show again

### Section Order:

1. Hero (headline, subheadline, hero image, CTA)
2. About (company story, team/location photo)
3. Services/Menu/Products (what they offer, relevant images)
4. Contact (form, map, contact info)
5. (Other sections based on sitemap)

### Preview Tag Format:

[PREVIEW: section=hero]
<section class="hero">
  <img src="/prospects/{{userId}}/assets/hero-beach.jpg" alt="Hero">
  <div class="hero-content">
    <h1>Fresh Authentic Tacos Since 1987</h1>
    <p>Family recipes, locally sourced ingredients</p>
    <a href="#contact" class="cta-button">Order Now</a>
  </div>
</section>
[/PREVIEW]

### HTML Generation Rules:

- Use semantic HTML (section, article, header, footer)
- **CRITICAL: Use ABSOLUTE paths for images**: /prospects/{userId}/assets/{filename}
- Example: <img src="/prospects/{{userId}}/assets/hero-beach.jpg">
- Keep HTML clean and simple (designers will refine)
- Include wrapper divs (hero-content, about-content, etc.)
- Add CTA buttons where appropriate
- NO placeholders - use real uploaded images only

### After User Approves:

Say: "Great! Moving to the [next section]..."
Then use: [CLEAR_PREVIEW]

This erases preview.html so you can build the next section.

### Important:

- ONE section at a time
- ALWAYS get approval before moving on
- Reference actual uploaded images (not placeholders)
- Keep user engaged with each preview

## METADATA TAG FOR IMAGE MAPPINGS:

When user uploads an image, ask "What section is this for?" (hero, about, services, etc.)
Then tag it: [METADATA: heroImage=1760996671642.jpg, heroSection=hero]

This creates a mapping so you know which images go where.

---`;
  }
}

module.exports = TaggingSection;
