# Prompt: Generate animation.json from content.md

You are a JSON generator for the Xpylon Connect animated product tour.

Read the content.md file provided as input. For each `## N. Title` section (numbered 1 through 8), generate a slide object.

## Schema

Each slide must follow this TypeScript interface:

```typescript
interface Slide {
  id: string;                    // kebab-case slug from the title
  category: "intro" | "feature" | "cta";  // first slide = intro, last = cta, rest = feature
  iconComposition: {
    primary: string;             // Ionicons name from the "Icon:" field, or infer one
    accent?: string;             // Ionicons name from the "Accent icon:" field
    badge?: string;              // Optional text badge like "AI"
  };
  useLogoImage?: boolean;        // true only for the Welcome/intro slide
  tagline?: string;              // UPPERCASE version of the "Tagline:" field
  title: string;                 // The tagline value in normal case
  subtitle: string;              // The "Description:" field content
  features?: Array<{             // From "Key points:" bullets (up to 3)
    icon: string;                // Choose an appropriate Ionicons outline icon
    title: string;               // Short phrase (2-4 words)
    description: string;         // Rest of the bullet point
  }>;
  animation?: {
    entrance: "fade-up" | "fade-in" | "scale-in";
    iconEffect?: "pulse" | "float" | "none";
    staggerDelay?: number;       // milliseconds, default 100
  };
}
```

## Rules

1. Use ONLY Ionicons icon names (see ionicons.com). Always use `-outline` variants.
2. The first slide (Welcome) must have `category: "intro"`, `entrance: "scale-in"`, `iconEffect: "pulse"`, and `useLogoImage: true`.
3. The last slide (Get Started) must have `category: "cta"`, `entrance: "scale-in"`, `iconEffect: "pulse"`, and NO features array.
4. All middle slides use `category: "feature"`, `entrance: "fade-up"`, `iconEffect: "float"`.
5. Extract exactly 3 key points per feature slide as the `features` array.
6. For each feature item, choose a descriptive Ionicons outline icon.
7. Set `staggerDelay` to 100 for feature slides, 120 for intro, 80 for CTA.
8. Wrap everything in: `{ "version": 1, "appName": "Xpylon Connect", "defaults": { "entrance": "fade-up", "iconEffect": "float", "staggerDelay": 100, "transitionDuration": 400 }, "slides": [...] }`

## Output

Output ONLY valid JSON. No markdown, no explanation, no code fences.
