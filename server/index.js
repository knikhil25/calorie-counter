import express from 'express';
import cors from 'cors';
import fs from 'fs';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = join(dataDir, 'calorie.db');
const db = new Database(dbPath);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS daily_totals (
    date TEXT PRIMARY KEY,
    total_calories INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS current_day (
    key TEXT PRIMARY KEY,
    value TEXT
  );
  INSERT OR IGNORE INTO current_day (key, value) VALUES ('total', '0');
`);

// Get today's date string (YYYY-MM-DD)
function getToday() {
  return new Date().toISOString().split('T')[0];
}

// Get current day total from DB
function getCurrentTotal() {
  const row = db.prepare('SELECT value FROM current_day WHERE key = ?').get('total');
  return parseInt(row?.value || '0', 10);
}

// Set current day total
function setCurrentTotal(value) {
  db.prepare('UPDATE current_day SET value = ? WHERE key = ?').run(String(value), 'total');
}

// Save day total to history and reset
function saveDayAndReset(total) {
  const today = getToday();
  db.prepare('INSERT OR REPLACE INTO daily_totals (date, total_calories) VALUES (?, ?)').run(today, total);
  setCurrentTotal(0);
}

// Get historical data
function getHistory() {
  const rows = db.prepare('SELECT date, total_calories FROM daily_totals ORDER BY date ASC').all();
  return rows;
}

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';
const OLLAMA_VISION_MODEL = process.env.OLLAMA_VISION_MODEL || 'llava';

// Analyze food image with vision model - returns description of food + quantities
async function describeFoodFromImage(imageBase64) {
  const prompt = `Look at this image of food. Describe what you see in detail for calorie estimation:
- List each food item
- Estimate quantity (e.g., "about 2 eggs", "1 slice of toast", "~150g chicken", "small portion of rice")
- Note any visible portions, plates, or serving sizes
- Be concise but specific enough for calorie calculation
Respond with a single paragraph description only, no preamble.`;

  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: prompt,
          images: [imageBase64]
        }
      ],
      stream: false
    })
  });

  if (!res.ok) {
    throw new Error(`Vision model error. Is Ollama running? Run: ollama pull ${OLLAMA_VISION_MODEL}`);
  }

  const data = await res.json();
  const description = (data.message?.content || '').trim();
  if (!description) throw new Error('Vision model returned empty description');
  return description;
}

// Call Ollama for calorie estimation
async function estimateCalories(foodDescription) {
  const systemPrompt = `You are a calorie estimation assistant. Given a food description, estimate the total calories.

Respond ONLY with valid JSON in this exact format (no markdown, no extra text):
{"calories": <number>, "breakdown": "<optional short breakdown>"}

Rules:
- Return only the JSON object
- calories must be a positive integer when the input describes food
- breakdown is optional, keep it brief (1-2 sentences max)
- Be reasonable: typical meals are 200-800 calories
- For fast food, use approximate known values

IMPORTANT: If the input does NOT describe food or a meal (e.g., greetings, questions, unclear text, random words, or anything not related to eating), respond with: {"calories": 0, "unrecognized": true}`;

  const userPrompt = `Estimate calories for: ${foodDescription}`;

  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: false,
        format: 'json'
      })
    });

    if (!res.ok) {
      throw new Error(`Ollama error: ${res.status}`);
    }

    const data = await res.json();
    const content = data.message?.content || '{}';
    
    // Parse JSON - handle potential markdown wrapping
    let parsed;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    try {
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch {
      // Fallback: extract number from plain text (e.g., "approximately 350 calories")
      const numMatch = content.match(/\b(\d{2,4})\s*(?:cal|calories?)\b/i) ||
        content.match(/\b(\d{2,4})\b/);
      parsed = { calories: numMatch ? parseInt(numMatch[1], 10) : 0, breakdown: null };
    }

    const calories = Math.max(0, Math.min(9999, parseInt(parsed.calories, 10) || 0));
    return {
      calories,
      breakdown: parsed.breakdown || null,
      unrecognized: !!parsed.unrecognized
    };
  } catch (err) {
    console.error('Ollama error:', err.message);
    throw new Error('Could not estimate calories. Is Ollama running? Try: ollama run llama3.2');
  }
}

// Detect if message is "calorie count" or similar
function isCalorieCountQuery(text) {
  const t = text.toLowerCase().trim();
  return /^(calorie count|total calories|how many calories|calories today|today'?s? calories|daily total)$/.test(t) ||
    /^(what'?s? (my |the )?(total |daily )?calories|show (my |me )?calories)$/.test(t);
}

// Detect "Last meal: <description>"
function parseLastMeal(text) {
  const match = text.match(/^last\s+meal\s*:\s*(.+)$/i);
  return match ? match[1].trim() : null;
}

// API: Estimate calories for food
app.post('/api/estimate', async (req, res) => {
  try {
    const { food } = req.body;
    if (!food || typeof food !== 'string' || !food.trim()) {
      return res.status(400).json({ error: 'Please provide a food description' });
    }

    const result = await estimateCalories(food.trim());
    const currentTotal = getCurrentTotal();
    const newTotal = currentTotal + result.calories;
    setCurrentTotal(newTotal);

    res.json({
      mealCalories: result.calories,
      dailyTotal: newTotal,
      breakdown: result.breakdown
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Calorie count query (no new meal)
app.post('/api/calorie-count', (req, res) => {
  const total = getCurrentTotal();
  res.json({ dailyTotal: total });
});

// API: Last meal - calculate, save day, reset
app.post('/api/last-meal', async (req, res) => {
  try {
    const { food } = req.body;
    if (!food || typeof food !== 'string' || !food.trim()) {
      return res.status(400).json({ error: 'Please provide a food description' });
    }

    const result = await estimateCalories(food.trim());
    const currentTotal = getCurrentTotal();
    const fullDayTotal = currentTotal + result.calories;
    saveDayAndReset(fullDayTotal);

    res.json({
      mealCalories: result.calories,
      dayTotal: fullDayTotal,
      breakdown: result.breakdown,
      daySaved: getToday()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Chat - routes to appropriate handler
app.post('/api/chat', async (req, res) => {
  try {
    const { message, image } = req.body;
    const hasImage = image && typeof image === 'string' && image.length > 0;
    const text = (message || '').trim();

    if (!hasImage && (!message || !text)) {
      return res.status(400).json({ error: 'Please enter a message or add an image' });
    }

    // When image is provided: vision model describes food, then we estimate calories
    let foodDescription = text;
    if (hasImage) {
      try {
        const visionDescription = await describeFoodFromImage(image);
        foodDescription = text ? `${text} ${visionDescription}` : visionDescription;
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }

    // 1. Calorie count query (only when no image)
    if (!hasImage && isCalorieCountQuery(text)) {
      const total = getCurrentTotal();
      return res.json({
        type: 'calorie_count',
        dailyTotal: total,
        message: total === 0
          ? "You haven't logged any calories today."
          : `Your total for today: **${total}** calories.`
      });
    }

    // 2. Last meal
    const isLastMeal = hasImage
      ? /last\s+meal/i.test(text)
      : !!parseLastMeal(text);
    const lastMealFood = parseLastMeal(text) || (hasImage && isLastMeal ? foodDescription : null);
    if (lastMealFood) {
      const result = await estimateCalories(lastMealFood);
      if (result.unrecognized) {
        return res.json({
          type: 'unrecognized',
          message: "I'm sorry, I didn't recognize this meal. Would you please elaborate?"
        });
      }
      const currentTotal = getCurrentTotal();
      const fullDayTotal = currentTotal + result.calories;
      saveDayAndReset(fullDayTotal);

      return res.json({
        type: 'last_meal',
        mealCalories: result.calories,
        dayTotal: fullDayTotal,
        breakdown: result.breakdown,
        daySaved: getToday()
      });
    }

    // 3. Regular meal log (text or image-derived description)
    const result = await estimateCalories(foodDescription);
    if (result.unrecognized) {
      return res.json({
        type: 'unrecognized',
        message: "I'm sorry, I didn't recognize this meal. Would you please elaborate?"
      });
    }
    const currentTotal = getCurrentTotal();
    const newTotal = currentTotal + result.calories;
    setCurrentTotal(newTotal);

    return res.json({
      type: 'meal',
      mealCalories: result.calories,
      dailyTotal: newTotal,
      breakdown: result.breakdown
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Get history
app.get('/api/history', (req, res) => {
  const history = getHistory();
  res.json({ history });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
