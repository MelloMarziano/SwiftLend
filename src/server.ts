import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import {join} from 'node:path';
import {GoogleGenAI} from '@google/genai';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
app.use(express.json());
const angularApp = new AngularNodeAppEngine();

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env['GEMINI_API_KEY'] || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

/**
 * AI Endpoint: Generate Custom Legal Contract Clauses
 */
app.post('/api/generate-contract', async (req, res) => {
  try {
    const { clientName, identification, amount, frequency, rate, totalTerms, customRequirements, riskTier } = req.body;

    const prompt = `Actúa como un abogado experto en finanzas corporativas y contratos de crédito personal/comercial en Latinoamérica.
Genera cláusulas legales redactadas profesionalmente en idioma español para un contrato de préstamo con las siguientes características:
- Cliente Prestatario: ${clientName} (Documento ID: ${identification || 'S/D'})
- Monto del Préstamo: $${amount}
- Frecuencia de Pago: ${frequency}
- Tasa de Interés: ${rate}% por periodo
- Plazo Total: ${totalTerms} cuotas
- Nivel de Riesgo Crediticio del Cliente: ${riskTier || 'B'}
- Requerimientos o condiciones especiales del prestamista: "${customRequirements || 'Ninguna especificada'}"

Entrega el resultado en formato JSON estructurado con los siguientes campos:
1. "clausulasEspeciales": arreglo de strings, donde cada elemento es una cláusula legal numerada (por ejemplo: ["CLÁUSULA ESPECIAL DE GARANTÍA...", "CLÁUSULA DE PAGO ANTICIPADO..."]).
2. "resumenRiesgo": una breve nota explicativa de 2 oraciones para la institución financiera sobre los resguardos incluidos.
3. "penalizacionesMora": texto detallando la tasa de penalización diaria por mora aplicable según la legislación financiera actual.

Responde ÚNICAMENTE en JSON válido sin formateo markdown de código.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const resultText = response.text || '{}';
    const jsonResult = JSON.parse(resultText);
    res.json({ success: true, data: jsonResult });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error al generar cláusulas del contrato.';
    console.error('Error generating contract clauses:', error);
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * AI Endpoint: Credit Risk Analysis
 */
app.post('/api/risk-analysis', async (req, res) => {
  try {
    const { clientName, monthlyIncome, occupation, requestedAmount, frequency, riskTier } = req.body;

    const prompt = `Actúa como un Oficial Superior de Riesgo de Crédito (Risk Underwriter) para una institución financiera.
Analiza la siguiente solicitud de préstamo y entrega una evaluación rápida de riesgo:
- Nombre del Cliente: ${clientName}
- Ocupación: ${occupation || 'No especificada'}
- Ingreso Mensual Estimado: $${monthlyIncome || 0}
- Monto Solicitado: $${requestedAmount}
- Frecuencia propuesta: ${frequency}
- Clasificación de Riesgo sugerida: ${riskTier}

Genera un JSON con:
1. "nivelRiesgoRecomendado": string ("Riesgo Bajo", "Riesgo Moderado", "Riesgo Alto" o "Riesgo Crítico")
2. "tasaSugerida": string (ej: "2.5% - 3.5% por periodo")
3. "exposicionIngresoPct": número (porcentaje estimado que representa la cuota sobre su ingreso mensual)
4. "requiereGarantía": booleano
5. "recomendacionesOficial": arreglo de strings (máximo 3 puntos clave de recomendación para la aprobación).

Responde ÚNICAMENTE en JSON válido.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const resultText = response.text || '{}';
    const jsonResult = JSON.parse(resultText);
    res.json({ success: true, data: jsonResult });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error al analizar riesgo de crédito.';
    console.error('Error in risk analysis:', error);
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
