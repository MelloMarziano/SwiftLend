import { Injectable, signal } from '@angular/core';
import { AIContractResponse, AIRiskAnalysisResponse, LoanFrequency, RiskTier } from '../models/loan.models';

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
