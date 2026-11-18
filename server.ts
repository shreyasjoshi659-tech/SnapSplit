import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const receiptResponseSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: 'Merchant, restaurant, or store name from the receipt.',
    },
    date: {
      type: Type.STRING,
      description: 'Receipt date formatted as YYYY-MM-DD. Use today if absent.',
    },
    category: {
      type: Type.STRING,
      description: 'One of: Dining, Groceries, Drinks, Travel, Utilities, Other',
    },
    currency: {
      type: Type.STRING,
      description: 'Currency code: USD, INR, EUR, or GBP.',
    },
    items: {
      type: Type.ARRAY,
      description: 'Line items purchased (do not include subtotal, tax, tip, or grand total rows here).',
      items: {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
            description: 'Clean, human-readable item name.',
          },
          quantity: {
            type: Type.INTEGER,
            description: 'Quantity of this line item (default 1).',
          },
          unitPrice: {
            type: Type.NUMBER,
            description: 'Price per single unit.',
          },
          totalPrice: {
            type: Type.NUMBER,
            description: 'Total line price (quantity * unitPrice).',
          },
        },
        required: ['name', 'quantity', 'unitPrice', 'totalPrice'],
      },
    },
    tax: {
      type: Type.NUMBER,
      description: 'Total tax / GST / VAT amount (0 if none).',
    },
    tip: {
      type: Type.NUMBER,
      description: 'Tip or gratuity amount (0 if none).',
    },
    serviceCharge: {
      type: Type.NUMBER,
      description: 'Service charge or delivery fee (0 if none).',
    },
    discount: {
      type: Type.NUMBER,
      description: 'Positive number representing total discounts or coupons subtracted (0 if none).',
    },
  },
  required: [
    'title',
    'date',
    'category',
    'currency',
    'items',
    'tax',
    'tip',
    'serviceCharge',
    'discount',
  ],
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, aiConfigured: Boolean(getGeminiClient()) });
  });

  app.post('/api/parse-receipt', async (req, res) => {
    try {
      const { text, imageBase64, mimeType } = req.body ?? {};
      const cleanText = typeof text === 'string' ? text.trim() : '';
      const cleanImage = typeof imageBase64 === 'string' ? imageBase64.trim() : '';

      if (!cleanText && !cleanImage) {
        res.status(400).json({
          error: 'Please paste receipt text or upload a receipt image before parsing.',
        });
        return;
      }

      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          error:
            'AI receipt parsing requires GEMINI_API_KEY in Secrets. You can still use Instant Text Parse or Load Sample Bill.',
        });
        return;
      }

      const today = new Date().toISOString().slice(0, 10);
      const parts: Array<
        { text: string } | { inlineData: { mimeType: string; data: string } }
      > = [];

      if (cleanImage) {
        const base64Data = cleanImage.includes(',')
          ? cleanImage.split(',')[1]
          : cleanImage;
        parts.push({
          inlineData: {
            mimeType:
              typeof mimeType === 'string' && mimeType.startsWith('image/')
                ? mimeType
                : 'image/jpeg',
            data: base64Data,
          },
        });
      }

      parts.push({
        text: [
          `Extract every line item, tax, tip, service charge, and discount from this receipt.`,
          `Today's date fallback is ${today}.`,
          `Allowed category values: Dining, Groceries, Drinks, Travel, Utilities, Other.`,
          `Allowed currency values: USD, INR, EUR, GBP.`,
          `Keep discount as a positive number representing the amount discounted.`,
          `Do not include subtotal, grand total, or payment method lines inside items.`,
          cleanText ? `\nReceipt text:\n${cleanText}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: { parts },
        config: {
          systemInstruction:
            'You are a precise receipt parser for a group bill-splitting app. Return clean JSON matching the schema.',
          responseMimeType: 'application/json',
          responseSchema: receiptResponseSchema,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const jsonText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(jsonText);

      const allowedCategories = new Set([
        'Dining',
        'Groceries',
        'Drinks',
        'Travel',
        'Utilities',
        'Other',
      ]);
      const allowedCurrencies = new Set(['USD', 'INR', 'EUR', 'GBP']);

      const sanitized = {
        title:
          typeof parsed.title === 'string' && parsed.title.trim()
            ? parsed.title.trim()
            : 'Parsed Receipt',
        date:
          typeof parsed.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)
            ? parsed.date
            : today,
        category: allowedCategories.has(parsed.category)
          ? parsed.category
          : 'Dining',
        currency: allowedCurrencies.has(parsed.currency) ? parsed.currency : 'USD',
        items: Array.isArray(parsed.items)
          ? parsed.items
              .filter(
                (item: unknown): item is Record<string, unknown> =>
                  Boolean(item && typeof item === 'object')
              )
              .map((item: Record<string, unknown>, idx: number) => {
                const qty = Math.max(1, Math.round(Number(item.quantity) || 1));
                const total = Math.round((Number(item.totalPrice) || 0) * 100) / 100;
                const unit =
                  Number(item.unitPrice) > 0
                    ? Math.round(Number(item.unitPrice) * 100) / 100
                    : Math.round((total / qty) * 100) / 100;
                return {
                  id: `ai-item-${idx + 1}-${Date.now().toString(36)}`,
                  name:
                    typeof item.name === 'string' && item.name.trim()
                      ? item.name.trim()
                      : `Item ${idx + 1}`,
                  quantity: qty,
                  unitPrice: unit,
                  totalPrice: total,
                };
              })
          : [],
        tax: Math.max(0, Math.round((Number(parsed.tax) || 0) * 100) / 100),
        tip: Math.max(0, Math.round((Number(parsed.tip) || 0) * 100) / 100),
        serviceCharge: Math.max(
          0,
          Math.round((Number(parsed.serviceCharge) || 0) * 100) / 100
        ),
        discount: Math.max(
          0,
          Math.round((Number(parsed.discount) || 0) * 100) / 100
        ),
      };

      res.json({ parsed: sanitized });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to parse receipt with AI.';
      console.error('Receipt parse error:', err);
      res.status(500).json({ error: message });
    }
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build artifacts not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SnapSplit server listening on http://localhost:${PORT}`);
  });
}

startServer();
