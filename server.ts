import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { PDFParse } from "pdf-parse";
import { calculateAtsScore } from "./src/lib/atsScore";

dotenv.config();

// Initialize the Google GenAI SDK lazily to prevent crash on startup if key is missing
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Route: Generate Caption for Social Media using Gemini API
  app.post("/api/gemini/generate-caption", async (req, res) => {
    try {
      const { title, company, location, skills, description, platform } = req.body;
      const ai = getAiClient();

      const prompt = `You are a professional recruiting copywriter. Generate an extremely engaging and polished social media promotional post to advertise a job opening.
      
      Job Details:
      - Job Title: ${title || "Software Engineer"}
      - Company Name: ${company || "TechCorp"}
      - Location: ${location || "Remote"}
      - Key Skills Needed: ${skills ? (Array.isArray(skills) ? skills.join(", ") : skills) : "Vite, React, TypeScript"}
      - Job Description Overview: ${description || "Join our fast-growing engineering team to build world-class products."}
      
      Social Media Platform: ${platform === "instagram" ? "Instagram (Include bullet points, a clean energetic tone, 1:1 image layout description suggestion, and relevant hashtags)" : "LinkedIn (Include a professional, exciting corporate tone, clear highlights of why candidates should join, and relevant professional hashtags)"}.
      
      Make it highly copy-pasteable, clean, and professional. Do not use generic placeholders.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      res.json({ caption: response.text });
    } catch (error: any) {
      console.error("Error generating social caption:", error);
      res.status(500).json({ error: error.message || "Failed to generate social caption" });
    }
  });

  // API Route: Extract PDF Text locally with Gemini transcription fallback (supporting scanned images)
  app.post("/api/gemini/extract-pdf-text", async (req, res) => {
    try {
      const { base64Pdf } = req.body;
      if (!base64Pdf) {
        return res.status(400).json({ error: "Missing base64Pdf parameter" });
      }

      console.log("=== PDF TEXT EXTRACTION START ===");
      // Use standard regex matching to strip any data URI base64 header cleanly (e.g. data:application/pdf;base64,)
      const cleanBase64 = base64Pdf.replace(/^data:[^;]+;base64,/, "");
      const pdfBuffer = Buffer.from(cleanBase64, "base64");
      
      let extractedText = "";
      try {
        const parser = new PDFParse({ data: pdfBuffer });
        const pdfResult = await parser.getText();
        extractedText = (pdfResult.text || "").trim();
        await parser.destroy();
        console.log(`Locally extracted ${extractedText.length} characters from PDF.`);
      } catch (localError) {
        console.warn("Local PDFParse failed or raised an exception, will fall back to Gemini multimodal transcription:", localError);
      }
      
      // Fallback to Gemini 3.5 Flash multimodal PDF capabilities if local parsing was unsuccessful or returned empty text (e.g. Scanned Image PDF)
      if (extractedText.length < 50) {
        console.log("Locally extracted text is too brief/empty. Invoking Gemini 3.5 Flash multimodal PDF OCR fallback...");
        try {
          const ai = getAiClient();
          const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType: "application/pdf"
                }
              },
              "You are an expert resume assistant. Extract and transcribe all of the text, credentials, contact information, and sections from this resume PDF. Return ONLY the plain transcribed text of the resume, preserving sections, bullet points, and hierarchy. Do not add any greeting, markdown formatting code fences, introductory summaries, or concluding notes. Just return the text itself."
            ]
          });
          
          if (response.text) {
            extractedText = response.text.trim();
            console.log(`Successfully extracted ${extractedText.length} characters using Gemini 3.5 Flash OCR.`);
          }
        } catch (geminiError) {
          console.error("Gemini multimodal transcription fallback failed:", geminiError);
        }
      }

      console.log("=== PDF TEXT EXTRACTION END ===");
      res.json({ text: extractedText });
    } catch (error: any) {
      console.error("Error extracting PDF text:", error);
      res.status(500).json({ error: error.message || "Failed to extract text from PDF document" });
    }
  });

  // API Route: Resume ATS Screening Parser (Deterministic local matching, NO AI/Gemini)
  app.post("/api/gemini/parse-resume", async (req, res) => {
    try {
      const { resumeText, jobTitle, jobSkills, jobDescription } = req.body;
      
      console.log("=== SERVER ATS DETERMINISTIC PARSER START ===");
      console.log("Job Title:", jobTitle);
      console.log("Job Skills:", jobSkills);
      console.log("Resume Text Length:", (resumeText || "").length);

      const result = calculateAtsScore(
        {
          id: 0,
          resumeText: resumeText || ""
        } as any,
        {
          id: 0,
          title: jobTitle || "",
          description: jobDescription || "",
          skills: jobSkills || []
        } as any
      );

      console.log("Generated Score:", result.score);
      console.log("=== SERVER ATS DETERMINISTIC PARSER END ===");

      res.json(result);
    } catch (error: any) {
      console.error("Error in local ATS parsing:", error);
      res.status(500).json({ error: error.message || "Failed to screen resume locally" });
    }
  });

  // API Route: Generate Job Description from Job Title & Department
  app.post("/api/gemini/generate-jd", async (req, res) => {
    try {
      const { title, department, company } = req.body;
      const ai = getAiClient();

      const prompt = `Write a professional, attractive, and highly human-touch Job Description for the following role:
      - Job Title: ${title}
      - Department: ${department || "Engineering"}
      - Company Name: ${company || "Our Organization"}

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
      - Write with a professional, inviting, and human-centric tone.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      res.json({ jd: response.text });
    } catch (error: any) {
      console.error("Error generating job description:", error);
      res.status(500).json({ error: error.message || "Failed to generate job description" });
    }
  });

  // API Route: Is Gemini Configured Check
  app.get("/api/gemini/config", (req, res) => {
    res.json({ configured: !!process.env.GEMINI_API_KEY });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    // Catch-all to serve index.html for client-side routing in development
    app.get("*", async (req, res, next) => {
      if (req.originalUrl.startsWith("/api/")) {
        return next();
      }
      try {
        let template = await fs.promises.readFile(path.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
