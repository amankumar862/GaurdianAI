import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface RiskFactor {
  factor: string;
  impact: number;
}

export interface ScamAnalysisResult {
  riskScore: number;
  confidence: number;
  threatCategory: string;
  explanation: string;
  suspiciousLines: { line: string; reason: string }[];
  recommendations: string[];
  isScam: boolean;
  technicalFlags: { label: string; active: boolean; description: string }[];
  xaiBreakdown: RiskFactor[];
  metrics: {
    detectionSync: number;
    signatures: string;
    latency: string;
    alertIntensity: string;
  };
  guardianWisdom: string;
}

export const analyzeScam = async (
  input: string | { mimeType: string; data: string },
  inputType: "text" | "image" | "url" | "camera"
): Promise<ScamAnalysisResult> => {
    const systemInstruction = `
    GuardianAI Forensic Engine. Indian Ed-Threat Model focus.
    DIRECTIVE: Rapidly identify internship scams, fee-based registration traps, gaming/betting debt-traps (.tk/.xyz domains), and NSP phishing clones.
    ABSOLUTE PRIORITY: Flag "Security Deposits" for jobs, "Application Fees" for scholarships, and "Exam Leaks/Academic Fraud" as 90%+ risk.
    CRITICAL: Detect Crypto/Academic schemes where students are targeted for "quick money" or "proxy exams".
    OUTPUT: Strict JSON matching the schema.
  `;

  const imagePrompt = `
    GuardianAI Lens HUD Deep Scan - Student Forensic Shield.
    1. OCR: Extract text from selection with high precision.
    2. ANALYZE: Check for:
       - Fake Internships/Placements: Security deposits, generic domains (gmail/outlook for HR), "urgent hiring" via WhatsApp.
       - Scholarship Traps: Requests for bank details, "processing fees", or "guaranteed selection".
       - Financial Schemes: Crypto "investment" and "Win Real Cash" rewards.
       - Academic Fraud: Claims of leaked question papers or proxy attendance services.
    3. SCORING: Calculate riskScore (0-100). If payment-for-work or bank detail requests found, score 90+. 
    4. XAI: Provide 3 specific reasons for the score mapping to student vulnerability.
    5. FAILSAFE: If blank, riskScore: 0, threatCategory: "NO_DATA".
  `;

  const contents = inputType === "image" || inputType === "camera"
    ? { parts: [{ inlineData: input as { mimeType: string; data: string } }, { text: imagePrompt }] }
    : { parts: [{ text: `INPUT_VECTOR: ${inputType.toUpperCase()}\nCONTENT_TO_ANALYZE: ${input as string}` }] };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents,
      config: {
        systemInstruction,
        temperature: 0.1,
        topP: 0.1,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskScore: { type: Type.NUMBER },
            confidence: { type: Type.NUMBER },
            threatCategory: { type: Type.STRING },
            explanation: { type: Type.STRING },
            suspiciousLines: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  line: { type: Type.STRING },
                  reason: { type: Type.STRING }
                },
                required: ["line", "reason"]
              }
            },
            technicalFlags: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  active: { type: Type.BOOLEAN },
                  description: { type: Type.STRING }
                },
                required: ["label", "active", "description"]
              }
            },
            xaiBreakdown: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  factor: { type: Type.STRING },
                  impact: { type: Type.NUMBER }
                },
                required: ["factor", "impact"]
              }
            },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            isScam: { type: Type.BOOLEAN },
            metrics: {
              type: Type.OBJECT,
              properties: {
                detectionSync: { type: Type.NUMBER },
                signatures: { type: Type.STRING },
                latency: { type: Type.STRING },
                alertIntensity: { type: Type.STRING }
              },
              required: ["detectionSync", "signatures", "latency", "alertIntensity"]
            },
            guardianWisdom: { type: Type.STRING }
          },
          required: [
            "riskScore", "confidence", "threatCategory", "explanation", 
            "suspiciousLines", "recommendations", "isScam", "metrics", 
            "guardianWisdom", "xaiBreakdown", "technicalFlags"
          ]
        }
      }
    });

    const output = response.text || "";
    if (!output.trim()) {
      console.warn("Gemini returned empty text.");
      throw new Error("Neural telemetry null. Data stream lost.");
    }
    
    // Clean JSON from potential markdown wrappers
    const cleanedJson = output.replace(/```json\n?/, "").replace(/\n?```/, "").trim();
    
    if (!cleanedJson) {
      throw new Error("Neural telemetry corrupted. Data stream empty.");
    }

    try {
      return JSON.parse(cleanedJson);
    } catch (parseErr) {
      console.error("JSON Parse failed for output:", output);
      // Fallback or re-throw with context
      throw new Error("Neural telemetry corrupted. Data stream non-conforming.");
    }
  } catch (err: any) {
    if (err.message?.includes("429") || err.status === 429) {
      throw new Error("Neural processors reaching critical limit. Please attempt scan again in 30 seconds.");
    }
    console.error("Analysis failed", err);
    throw err;
  }
};

export const chatAssistant = async (message: string, history: { role: "user" | "model"; parts: { text: string }[] }[]) => {
  try {
    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...history,
        { role: "user", parts: [{ text: message }] }
      ],
      config: {
        temperature: 0.7,
        maxOutputTokens: 800,
        systemInstruction: "You are GuardianAI, a student safety expert. Your primary directive is to protect students from scams, phishing, and financial exploitation. When analyzing URLs, perform a 'Technical Deep Identity Check': do not just flag everything as a scam. Determine if the domain is official, a phishing clone, or a legal-but-risky platform like real-money gaming (WinZO, Dream11). For legal gaming platforms, explain the financial risks (addiction, debt) clearly and label them as 'High Risk/Dangerous' for students without necessarily calling them a 'Fake Scam' unless they are definitely phishing. Be objective, analytical, and professional."
      }
    });
    return result.text;
  } catch (err: any) {
    if (err.message?.includes("429") || err.status === 429) {
      return "I'm currently processing a massive logic stream. Please give me a moment to recalibrate and ask your question again.";
    }
    throw err;
  }
};
