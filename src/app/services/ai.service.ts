import { Injectable, signal } from '@angular/core';
import { AIContractResponse, AIRiskAnalysisResponse, LoanFrequency, RiskTier } from '../models/loan.models';
import { environment } from '../../environments/environment';

const DEMO_DELAY_MS = 1200;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

@Injectable({
  providedIn: 'root'
})
export class AIService {
  readonly isGeneratingContract = signal<boolean>(false);
  readonly isAnalyzingRisk = signal<boolean>(false);
  readonly lastError = signal<string | null>(null);

  async generateCustomContractClauses(payload: {
    clientName: string;
    identification: string;
    amount: number;
    frequency: LoanFrequency;
    rate: number;
    totalTerms: number;
    riskTier: RiskTier;
    customRequirements?: string;
  }): Promise<AIContractResponse | null> {
    this.isGeneratingContract.set(true);
    this.lastError.set(null);

    try {
      if (environment.demoMode) {
        await delay(DEMO_DELAY_MS);
        return {
          clausulasEspeciales: [
            `CLÁUSULA ESPECIAL DE GARANTÍA: ${payload.clientName} se compromete a mantener vigentes las garantías ofrecidas durante las ${payload.totalTerms} cuotas pactadas.`,
            'CLÁUSULA DE PAGO ANTICIPADO: El prestatario podrá abonar total o parcialmente el capital adeudado sin penalidad, recalculándose los intereses sobre el saldo insoluto.',
            'CLÁUSULA DE ACELERACIÓN: El atraso de tres (3) cuotas consecutivas faculta al prestamista a declarar vencido el total de la obligación.',
          ],
          resumenRiesgo: `Contrato de demostración para un perfil de riesgo ${payload.riskTier}. Las cláusulas incluidas refuerzan la recuperación del capital ante atrasos.`,
          penalizacionesMora: 'Se aplicará un recargo diario por mora sobre la cuota vencida, conforme a la tasa máxima permitida por la legislación vigente.',
        };
      }

      const res = await fetch('/api/generate-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo generar el contrato con IA.');
      }

      return data.data as AIContractResponse;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error de conexión con el servicio IA.';
      console.error('AI Contract Service Error:', err);
      this.lastError.set(msg);
      return null;
    } finally {
      this.isGeneratingContract.set(false);
    }
  }

  async analyzeCreditRisk(payload: {
    clientName: string;
    monthlyIncome: number;
    occupation: string;
    requestedAmount: number;
    frequency: LoanFrequency;
    riskTier: RiskTier;
  }): Promise<AIRiskAnalysisResponse | null> {
    this.isAnalyzingRisk.set(true);
    this.lastError.set(null);

    try {
      if (environment.demoMode) {
        await delay(DEMO_DELAY_MS);
        const exposure = payload.monthlyIncome > 0
          ? Math.round((payload.requestedAmount / 12 / payload.monthlyIncome) * 100)
          : 100;
        return {
          nivelRiesgoRecomendado: exposure > 40 ? 'Riesgo Alto' : exposure > 25 ? 'Riesgo Moderado' : 'Riesgo Bajo',
          tasaSugerida: exposure > 40 ? '4.0% - 5.0% por periodo' : '2.5% - 3.5% por periodo',
          exposicionIngresoPct: exposure,
          requiereGarantía: exposure > 25,
          recomendacionesOficial: [
            'Verificar ingresos con comprobantes de los últimos 3 meses.',
            'Confirmar referencias personales y laborales.',
            '(Resultado de demostración: el análisis con IA real se activa con el backend.)',
          ],
        };
      }

      const res = await fetch('/api/risk-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo realizar el análisis de riesgo.');
      }

      return data.data as AIRiskAnalysisResponse;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error de conexión con el análisis de riesgo.';
      console.error('AI Risk Analysis Error:', err);
      this.lastError.set(msg);
      return null;
    } finally {
      this.isAnalyzingRisk.set(false);
    }
  }
}
