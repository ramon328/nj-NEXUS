/**
 * Helper function to extract terms text from potentially JSON-encoded template data
 *
 * The template data can be in two formats:
 * 1. New format (JSON): {"terms": "...", "extra_page_config": {...}}
 * 2. Old format (plain text): "..."
 *
 * This function handles both formats and returns only the terms text.
 */
export const extractTermsText = (termsData: string | undefined): string => {
  if (!termsData) return '';

  try {
    // Try to parse as JSON (new format with extra_page_config)
    const parsed = JSON.parse(termsData);
    if (parsed.terms) {
      return parsed.terms;
    }
    // Fallback to full content if no 'terms' key
    return termsData;
  } catch (error) {
    // Not JSON, return as-is (old format or plain text)
    return termsData;
  }
};
