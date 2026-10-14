const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldPrompt = `      const prompt = \`Write a professional, comprehensive Job Description for the following role:
      - Job Title: \${title}
      - Department: \${department || "Engineering"}
      - Company Name: \${company || "Our Organization"}

      The Job Description must include:
      1. About the Role (Exciting introduction to the opportunity)
      2. Key Responsibilities (5 clear, actionable, high-impact bullet points)
      3. Required Skills & Qualifications (5 essential skills and technical requirements)
      4. What We Offer (Exciting benefits and growth culture)

      Provide the output in clean, professional markdown format. Do not use generic placeholders.\`;`;

const newPrompt = `      const prompt = \`Write a professional, attractive, and highly human-touch Job Description for the following role:
      - Job Title: \${title}
      - Department: \${department || "Engineering"}
      - Company Name: \${company || "Our Organization"}

      The Job Description must be warmly written, focusing on the human element, and should avoid sounding like a generic corporate template.
      Include:
      - About the Role: An exciting, welcoming introduction to the opportunity.
      - Key Responsibilities: 5 clear, actionable, high-impact expectations.
      - Required Skills & Qualifications: 5 essential skills and technical requirements.
      - What We Offer: Exciting benefits and growth culture.

      IMPORTANT FORMATTING RULES:
      - Provide the output in plain text format with natural spacing.
      - DO NOT use markdown characters such as asterisks (*), hash symbols (#), or underscores (_).
      - Use standard numbers (1., 2., 3.) or hyphens (-) for bullet points.
      - Write with a professional, inviting, and human-centric tone.\`;`;

code = code.replace(oldPrompt, newPrompt);

fs.writeFileSync('server.ts', code);
console.log("Updated server.ts prompt");
