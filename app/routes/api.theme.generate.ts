import { json, type ActionFunctionArgs } from '~/lib/remix-types';

interface GenerateThemeRequest {
  description: string;
  baseTheme?: string;
}

interface GenerateThemeResponse {
  theme: {
    name: string;
    title: string;
    description: string;
    cssVars: {
      light?: Record<string, string>;
      dark?: Record<string, string>;
      theme?: Record<string, string>;
    };
  };
}

// TODO: Replace with actual AI theme generation
async function generateThemeWithAI(description: string, baseTheme?: string): Promise<GenerateThemeResponse> {
  // This is a placeholder. In a real implementation, you would:
  // 1. Call OpenAI or another AI service with the description
  // 2. Parse the AI response to extract color values
  // 3. Generate a complete theme object

  console.log('[ThemeGeneration] Generating theme for:', description, 'based on:', baseTheme);

  // For now, return a simple generated theme based on keywords
  const lowerDesc = description.toLowerCase();

  let primaryHue = 200; // Default blue
  let primarySat = 90;
  const primaryLight = 50;

  // Parse keywords to adjust colors
  if (lowerDesc.includes('green') || lowerDesc.includes('nature') || lowerDesc.includes('eco')) {
    primaryHue = 140;
  } else if (lowerDesc.includes('red') || lowerDesc.includes('fire') || lowerDesc.includes('hot')) {
    primaryHue = 0;
  } else if (lowerDesc.includes('purple') || lowerDesc.includes('royal')) {
    primaryHue = 270;
  } else if (lowerDesc.includes('orange') || lowerDesc.includes('warm')) {
    primaryHue = 30;
  } else if (lowerDesc.includes('pink')) {
    primaryHue = 330;
  }

  // Adjust saturation
  if (lowerDesc.includes('minimal') || lowerDesc.includes('muted') || lowerDesc.includes('subtle')) {
    primarySat = 30;
  } else if (lowerDesc.includes('vibrant') || lowerDesc.includes('bold') || lowerDesc.includes('bright')) {
    primarySat = 100;
  }

  // Generate theme
  const theme = {
    name: `generated-${Date.now()}`,
    title: `Generated: ${description.slice(0, 30)}${description.length > 30 ? '...' : ''}`,
    description: `AI-generated theme based on: ${description}`,
    cssVars: {
      theme: {
        'font-sans': 'Inter, sans-serif',
        'font-mono': 'JetBrains Mono, monospace',
        'font-serif': 'Source Serif 4, serif',
        radius: '0.5rem',
        'tracking-normal': '0em',
      },
      light: {
        background: '0 0% 100%',
        foreground: '0 0% 15%',
        card: '0 0% 100%',
        'card-foreground': '0 0% 15%',
        popover: '0 0% 100%',
        'popover-foreground': '0 0% 15%',
        primary: `${primaryHue} ${primarySat}% ${primaryLight}%`,
        'primary-foreground': '0 0% 100%',
        secondary: `${primaryHue} 20% 96%`,
        'secondary-foreground': `${primaryHue} 20% 34%`,
        muted: '210 20% 98%',
        'muted-foreground': '220 9% 46%',
        accent: `${(primaryHue + 30) % 360} 80% 96%`,
        'accent-foreground': `${(primaryHue + 30) % 360} 80% 40%`,
        destructive: '0 84% 60%',
        'destructive-foreground': '0 0% 100%',
        border: '220 13% 91%',
        input: '220 13% 91%',
        ring: `${primaryHue} ${primarySat}% ${primaryLight}%`,
      },
      dark: {
        background: '0 0% 10%',
        foreground: '0 0% 95%',
        card: '0 0% 10%',
        'card-foreground': '0 0% 95%',
        popover: '0 0% 10%',
        'popover-foreground': '0 0% 95%',
        primary: `${primaryHue} ${primarySat}% ${primaryLight + 10}%`,
        'primary-foreground': '0 0% 0%',
        secondary: `${primaryHue} 20% 20%`,
        'secondary-foreground': `${primaryHue} 20% 80%`,
        muted: '210 20% 20%',
        'muted-foreground': '220 9% 60%',
        accent: `${(primaryHue + 30) % 360} 80% 30%`,
        'accent-foreground': `${(primaryHue + 30) % 360} 80% 90%`,
        destructive: '0 84% 60%',
        'destructive-foreground': '0 0% 100%',
        border: '220 13% 25%',
        input: '220 13% 25%',
        ring: `${primaryHue} ${primarySat}% ${primaryLight + 10}%`,
      },
    },
  };

  return { theme };
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = (await request.json()) as GenerateThemeRequest;

    // Validate input
    if (!body.description || typeof body.description !== 'string') {
      return json({ error: 'Description is required' }, { status: 400 });
    }

    if (body.description.length > 500) {
      return json({ error: 'Description too long (max 500 characters)' }, { status: 400 });
    }

    // Generate theme
    const result = await generateThemeWithAI(body.description, body.baseTheme);

    return json(result, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[ThemeGeneration] Error:', error);
    return json({ error: 'Failed to generate theme' }, { status: 500 });
  }
}
