export function isUrl(input: string): boolean {
  return input.startsWith("http://") || input.startsWith("https://");
}

export async function fetchContent(input: string): Promise<string> {
  try {
    const response = await fetch(input);

    if (!response.ok) {
      throw new Error(`Failed to fetch ${input}: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    return text;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch ${input}: ${error.message}`);
    }
    throw new Error(`Failed to fetch ${input}: Unknown error`);
  }
}
