/**
 * Helper to strip excessive raw markdown syntax (stars, hashes, backslashes)
 * and format text into clean, professional plain text for job descriptions.
 */
export function cleanMarkdownText(text: string): string {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")       // Bold **text**
    .replace(/\*(.*?)\*/g, "$1")           // Italic *text*
    .replace(/_{1,2}(.*?)_{1,2}/g, "$1")   // Underline / italic _text_
    .replace(/#{1,6}\s?/g, "")             // Headings #, ##, ###
    .replace(/`{1,3}(.*?)`{1,3}/g, "$1")   // Code blocks `code`
    .replace(/^\s*[-*+]\s+/gm, "• ")        // Bullet points -, *, +
    .replace(/\\/g, "")                    // Backslashes
    .replace(/\n{3,}/g, "\n\n")            // Excessive blank lines
    .trim();
}

/**
 * Format string into Title Case ensuring each word starts with a capital letter
 */
export function formatTitleCase(str: string): string {
  if (!str) return "";
  return str.replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Capitalize first letter of every line/sentence
 */
export function formatSentenceCapitalization(text: string): string {
  if (!text) return "";
  return text
    .split("\n")
    .map(line => {
      const trimmed = line.trimStart();
      if (!trimmed) return line;
      const leadingSpaces = line.slice(0, line.length - trimmed.length);
      const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
      return leadingSpaces + capitalized;
    })
    .join("\n");
}

/**
 * Safely extracts milliseconds timestamp from a candidate record.
 * Checks timeline events, applied date string, Firestore appliedAt, updatedAt, or ID timestamp.
 */
export function getCandidateResponseTimestamp(c: any): number {
  if (!c) return 0;
  
  // 1. Check timeline events for application timestamp
  if (Array.isArray(c.timeline) && c.timeline.length > 0) {
    const applyEvent = c.timeline.find((t: any) => t.event && t.event.toLowerCase().includes("applied")) || c.timeline[c.timeline.length - 1];
    if (applyEvent && applyEvent.date) {
      const parsedTime = new Date(applyEvent.date).getTime();
      if (!isNaN(parsedTime) && parsedTime > 0) return parsedTime;
    }
  }

  // 2. Check applied field
  if (c.applied) {
    const parsedTime = new Date(c.applied).getTime();
    if (!isNaN(parsedTime) && parsedTime > 0) return parsedTime;
    
    // Check if it has date pattern like "Oct 14, 2026 at 10:15 AM"
    try {
      const d = new Date(String(c.applied).replace(" at ", " "));
      if (!isNaN(d.getTime()) && d.getTime() > 0) return d.getTime();
    } catch (e) {}
  }

  // 3. Check appliedAt field (stored in Firestore)
  if (c.appliedAt) {
    const parsedTime = new Date(c.appliedAt).getTime();
    if (!isNaN(parsedTime) && parsedTime > 0) return parsedTime;
  }

  // 4. Check updatedAt field
  if (c.updatedAt) {
    const parsedTime = new Date(c.updatedAt).getTime();
    if (!isNaN(parsedTime) && parsedTime > 0) return parsedTime;
  }

  // 5. Fallback to candidate numeric ID (e.g. Date.now() timestamp)
  if (typeof c.id === "number" && c.id > 1000000000000) {
    return c.id;
  }

  return 0;
}
