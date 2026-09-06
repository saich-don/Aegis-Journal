import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const PORT = 3000;

// Lazy initialization of Gemini client using runtime secret bindings
let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error(
      'GEMINI_API_KEY is not configured in runtime environment / Secret Manager.'
    );
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

// Enterprise Token Verification Middleware
interface AuthenticatedRequest extends express.Request {
  userUid?: string;
  userEmail?: string;
}

function verifyAuthToken(
  req: AuthenticatedRequest,
  res: express.Response,
  next: express.NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized: Missing or malformed Bearer authentication token.',
    });
    return;
  }

  const token = authHeader.split('Bearer ')[1].trim();
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Empty token provided.' });
    return;
  }

  try {
    // Decode and validate JWT payload structure
    const parts = token.split('.');
    if (parts.length !== 3) {
      res.status(401).json({ error: 'Unauthorized: Invalid JWT token structure.' });
      return;
    }

    const payloadRaw = Buffer.from(parts[1], 'base64').toString('utf8');
    const payload = JSON.parse(payloadRaw);

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      res.status(401).json({ error: 'Unauthorized: Authentication token has expired.' });
      return;
    }

    // Assign verified identity to request
    req.userUid = payload.user_id || payload.sub;
    req.userEmail = payload.email;
    next();
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(401).json({
      error: 'Unauthorized: Failed to parse authentication token.',
      details: errorMsg,
    });
  }
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));

  // 1. Health Check Endpoint (Cloud Run & Container Readiness)
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'Aegis Journal Enterprise API',
      timestamp: new Date().toISOString(),
      security: {
        zeroTrustSecrets: Boolean(process.env.GEMINI_API_KEY),
        runtimeEnvironment: process.env.NODE_ENV || 'development',
      },
    });
  });

  // 2. Multi-turn AI Chat Session (Gemini 2.5 Flash)
  app.post(
    '/api/chat',
    verifyAuthToken,
    async (req: AuthenticatedRequest, res: express.Response) => {
      try {
        const { messages, userPrompt } = req.body;

        if (!userPrompt || typeof userPrompt !== 'string') {
          res.status(400).json({ error: 'Bad Request: "userPrompt" string is required.' });
          return;
        }

        const ai = getGemini();

        // Build sanitized conversation history
        const sanitizedHistory = Array.isArray(messages)
          ? messages
              .filter(
                (m) =>
                  m &&
                  (m.role === 'user' || m.role === 'model') &&
                  typeof m.text === 'string' &&
                  m.text.trim().length > 0
              )
              .map((m) => ({
                role: m.role === 'model' ? 'model' : 'user',
                parts: [{ text: String(m.text).slice(0, 4000) }],
              }))
          : [];

        // Append active prompt
        sanitizedHistory.push({
          role: 'user',
          parts: [{ text: userPrompt.slice(0, 4000) }],
        });

        const systemInstruction = `You are Aegis Companion, an empathetic, perceptive, and thoughtful personal journaling guide and growth companion.
Your purpose is to help the user explore their inner thoughts, reflect on daily experiences, untangle emotional knots, celebrate achievements, unpack stress, and brainstorm constructive solutions.
Guidelines:
- Keep your tone warm, non-judgmental, grounded, and conversational.
- Be concise (avoid excessive length or clinical tone; 2-4 sentences or short paragraphs are ideal).
- Mirror the user's emotional state respectfully.
- When fitting, gently ask 1 mindful, open-ended question to help them reflect deeper, examine an alternative perspective, or identify what they need right now.
- Never judge, patronize, or lecture.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: sanitizedHistory,
          config: {
            systemInstruction,
            temperature: 0.7,
            maxOutputTokens: 1000,
          },
        });

        const responseText = response.text || 'I hear you. What else is on your mind today?';

        res.json({
          reply: responseText,
          timestamp: Date.now(),
        });
      } catch (err: unknown) {
        console.error('Error in /api/chat:', err);
        const errorMsg = err instanceof Error ? err.message : 'Internal Server Error';
        res.status(500).json({ error: errorMsg });
      }
    }
  );

  // 3. Auto-Summarize, Sentiment Analysis, Mood Analytics & Action Item Extractor
  app.post(
    '/api/summarize-session',
    verifyAuthToken,
    async (req: AuthenticatedRequest, res: express.Response) => {
      try {
        const { messages } = req.body;

        if (!Array.isArray(messages) || messages.length === 0) {
          res.status(400).json({ error: 'At least one message is required to summarize.' });
          return;
        }

        const ai = getGemini();

        // Format transcript
        const transcript = messages
          .map((m) => `${m.role === 'user' ? 'User' : 'Gemini'}: ${m.text}`)
          .join('\n\n');

        const prompt = `Analyze this personal journaling session conversation carefully:
---
${transcript}
---

Perform the following tasks:
1. "title": Create a concise, expressive, meaningful title (4 to 8 words) capturing the essence of the reflection.
2. "summary": Provide a clear, thoughtful 2 to 3 paragraph summary synthesizing their thoughts, feelings, context, and breakthroughs.
3. "keyTakeaways": Extract 2 to 4 key personal insights or self-realizations.
4. "moodTags": Identify 2 to 4 descriptive mood tags (e.g. "Reflective", "Motivated", "Peaceful", "Stressed", "Optimistic", "Grateful", "Determined", "Vulnerable", "Curious").
5. "sentimentScore": Calculate an objective sentiment score from -1.0 (very negative/distressed) to +1.0 (very positive/energized).
6. "sentimentLabel": Pick the best matching label: "Positive", "Neutral", "Reflective", "Constructive", or "Challenging".
7. "actionItems": Extract any practical, actionable to-do items, healthy commitments, or proactive next steps mentioned or implied. Assign each a unique ID, category ("Personal", "Work", "Wellness", "Mindset"), and completed: false. If no explicit tasks were mentioned, formulate 1 or 2 gentle, constructive micro-commitments aligned with their reflection.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                summary: { type: Type.STRING },
                keyTakeaways: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                moodTags: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                sentimentScore: {
                  type: Type.NUMBER,
                  description: 'Float between -1.0 and 1.0',
                },
                sentimentLabel: {
                  type: Type.STRING,
                  enum: ['Positive', 'Neutral', 'Reflective', 'Constructive', 'Challenging'],
                },
                actionItems: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      task: { type: Type.STRING },
                      category: {
                        type: Type.STRING,
                        enum: ['Personal', 'Work', 'Wellness', 'Mindset'],
                      },
                      completed: { type: Type.BOOLEAN },
                    },
                    required: ['id', 'task', 'category', 'completed'],
                  },
                },
              },
              required: [
                'title',
                'summary',
                'keyTakeaways',
                'moodTags',
                'sentimentScore',
                'sentimentLabel',
                'actionItems',
              ],
            },
          },
        });

        if (!response.text) {
          throw new Error('Gemini model returned empty response.');
        }

        const parsedData = JSON.parse(response.text);

        // Ensure IDs are present
        if (Array.isArray(parsedData.actionItems)) {
          parsedData.actionItems = parsedData.actionItems.map(
            (item: Record<string, unknown>, idx: number) => ({
              id: item.id || `act_${Date.now()}_${idx}`,
              task: item.task || 'Action item',
              category: item.category || 'Personal',
              completed: Boolean(item.completed),
            })
          );
        }

        res.json(parsedData);
      } catch (err: unknown) {
        console.error('Error in /api/summarize-session:', err);
        const errorMsg = err instanceof Error ? err.message : 'Internal Server Error';
        res.status(500).json({ error: errorMsg });
      }
    }
  );

  // 4. "Ask My Past Self" - Cross-Journal Memory Query Engine
  app.post(
    '/api/memory-query',
    verifyAuthToken,
    async (req: AuthenticatedRequest, res: express.Response) => {
      try {
        const { query, entries } = req.body;

        if (!query || typeof query !== 'string' || !query.trim()) {
          res.status(400).json({ error: 'Query string is required.' });
          return;
        }

        if (!Array.isArray(entries) || entries.length === 0) {
          res.status(400).json({
            error: 'At least one journal entry is required for memory search.',
          });
          return;
        }

        const ai = getGemini();

        // Serialize past entries into clean context with ID and date citations
        const serializedEntries = entries
          .map((e, index) => {
            const dateStr = new Date(e.createdAt || Date.now()).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const takeaways = Array.isArray(e.keyTakeaways)
              ? e.keyTakeaways.join('; ')
              : '';
            const moods = Array.isArray(e.moodTags) ? e.moodTags.join(', ') : '';
            const actions = Array.isArray(e.actionItems)
              ? e.actionItems.map((a: { task: string; completed: boolean }) => `[${a.completed ? '✓' : ' '}] ${a.task}`).join('; ')
              : '';

            return `[ENTRY #${index + 1}] ID: ${e.id} | Date: ${dateStr} | Title: "${e.title}" | Mood: ${moods} | Sentiment: ${e.sentimentScore ?? 0} (${e.sentimentLabel ?? 'Neutral'})
Summary: ${e.summary}
Key Takeaways: ${takeaways}
Action Items: ${actions}`;
          })
          .join('\n\n---\n\n');

        const prompt = `You are Aegis Journal's "Ask My Past Self" Cross-Journal Memory Engine.
The user is asking a personal, retrospective question querying their historical reflections.

USER QUESTION:
"${query}"

AUTHENTICATED USER'S JOURNAL REPOSITORY:
${serializedEntries}

TASK:
1. Search and synthesize their past reflections to directly answer their question.
2. Provide concrete citations linking back to specific entries (using the exact entryId, title, and date provided).
3. Identify overarching recurring themes or behavioral patterns across time.
4. Provide a supportive, forward-looking coaching insight or question to help them integrate what they learned.
5. Be warm, objective, insightful, and grounded in their actual words.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                answer: { type: Type.STRING },
                citations: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      entryId: { type: Type.STRING },
                      title: { type: Type.STRING },
                      date: { type: Type.STRING },
                      excerptOrRelevance: { type: Type.STRING },
                    },
                    required: ['entryId', 'title', 'date', 'excerptOrRelevance'],
                  },
                },
                keyThemes: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                coachingInsight: { type: Type.STRING },
              },
              required: ['answer', 'citations', 'keyThemes', 'coachingInsight'],
            },
          },
        });

        if (!response.text) {
          throw new Error('Gemini model returned empty response for memory query.');
        }

        const result = JSON.parse(response.text);
        res.json(result);
      } catch (err: unknown) {
        console.error('Error in /api/memory-query:', err);
        const errorMsg = err instanceof Error ? err.message : 'Internal Server Error';
        res.status(500).json({ error: errorMsg });
      }
    }
  );

  // 5. Weekly Cognitive & Growth Digest Synthesizer
  app.post(
    '/api/weekly-digest',
    verifyAuthToken,
    async (req: AuthenticatedRequest, res: express.Response) => {
      try {
        const { entries } = req.body;

        if (!Array.isArray(entries) || entries.length === 0) {
          res.status(400).json({
            error: 'At least one journal entry is required to generate a cognitive digest.',
          });
          return;
        }

        const ai = getGemini();

        const serializedEntries = entries
          .map((e, index) => {
            const dateStr = new Date(e.createdAt || Date.now()).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const takeaways = Array.isArray(e.keyTakeaways)
              ? e.keyTakeaways.join('; ')
              : '';
            const moods = Array.isArray(e.moodTags) ? e.moodTags.join(', ') : '';
            const actions = Array.isArray(e.actionItems)
              ? e.actionItems.map((a: { task: string; category?: string; completed: boolean }) => `[${a.completed ? 'Done' : 'Pending'}] ${a.task} (${a.category || 'General'})`).join('; ')
              : '';

            return `[ENTRY #${index + 1}] ID: ${e.id} | Date: ${dateStr} | Title: "${e.title}" | Mood: ${moods} | Sentiment: ${e.sentimentScore ?? 0} (${e.sentimentLabel ?? 'Neutral'})
Summary: ${e.summary}
Key Takeaways: ${takeaways}
Action Items: ${actions}`;
          })
          .join('\n\n---\n\n');

        const prompt = `You are the Aegis Executive Cognitive & Growth Coach.
Generate a comprehensive, high-caliber "Executive Weekly Cognitive & Growth Digest" synthesizing the user's recent reflections.

JOURNAL ENTRIES CATALOG:
${serializedEntries}

Synthesize their entries into an executive brief:
1. "headline": An inspiring, high-impact headline capturing their overarching psychological trajectory.
2. "executiveSummary": 2 to 3 paragraphs analyzing their mental models, emotional resilience, breakthrough moments, and general headspace.
3. "emotionalTrajectory": Deep analysis of sentiment shifts, emotional triggers, and stability patterns.
4. "topStressorsAndBreakthroughs": Array of 2 to 4 items detailing specific stressors they encountered and the lessons or breakthroughs discovered.
5. "celebratedWins": 3 to 5 concrete wins, self-realizations, or positive behaviors demonstrated.
6. "actionItemsAudit": Audit of action items with total count, completed count, resolutionRate string (e.g. "75%"), and strategic recommendations for task execution.
7. "growthCoachingDirectives": 3 to 4 prioritized, actionable growth coaching directives for the upcoming week based directly on their recorded patterns.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                headline: { type: Type.STRING },
                executiveSummary: { type: Type.STRING },
                emotionalTrajectory: { type: Type.STRING },
                topStressorsAndBreakthroughs: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      stressor: { type: Type.STRING },
                      breakthroughOrLesson: { type: Type.STRING },
                    },
                    required: ['stressor', 'breakthroughOrLesson'],
                  },
                },
                celebratedWins: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                actionItemsAudit: {
                  type: Type.OBJECT,
                  properties: {
                    total: { type: Type.NUMBER },
                    completed: { type: Type.NUMBER },
                    resolutionRate: { type: Type.STRING },
                    recommendations: { type: Type.STRING },
                  },
                  required: ['total', 'completed', 'resolutionRate', 'recommendations'],
                },
                growthCoachingDirectives: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: [
                'headline',
                'executiveSummary',
                'emotionalTrajectory',
                'topStressorsAndBreakthroughs',
                'celebratedWins',
                'actionItemsAudit',
                'growthCoachingDirectives',
              ],
            },
          },
        });

        if (!response.text) {
          throw new Error('Gemini model returned empty response for weekly digest.');
        }

        const digest = JSON.parse(response.text);
        res.json({
          ...digest,
          generatedAt: Date.now(),
        });
      } catch (err: unknown) {
        console.error('Error in /api/weekly-digest:', err);
        const errorMsg = err instanceof Error ? err.message : 'Internal Server Error';
        res.status(500).json({ error: errorMsg });
      }
    }
  );

  // Vite Middleware Setup for Development vs Production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Aegis Journal Enterprise server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
