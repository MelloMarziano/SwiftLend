export type IdentificationType = 'DNI' | 'CEDULA' | 'RNC' | 'PASAPORTE';

export type RiskTier = 'A' | 'B' | 'C' | 'D'; // A: Bajo, B: Moderado, C: Alto, D: Crítico

export type LoanFrequency = 'diario' | 'semanal' | 'quincenal' | 'mensual';

export type AmortizationMethod = 'cuota_fija' | 'interes_simple' | 'sistema_aleman';

export type LoanStatus = 'activo' | 'al_dia' | 'proximo_vencer' | 'en_mora' | 'vencido' | 'pagado';

export type PaymentStatus = 'pendiente' | 'pagado' | 'parcial' | 'vencido';

export interface Client {
  id: string;
  fullName: string;
  identificationType: IdentificationType;
  identificationNumber: string;
  phone: string;
  email: string;
  address: string;
  occupation: string;
  monthlyIncome: number;
  riskTier: RiskTier;
  notes?: string;
  createdAt: string;
}

export interface AmortizationItem {
  installmentNo: number;
  dueDate: string; // ISO date string YYYY-MM-DD
  paymentAmount: number;
  principalPortion: number;
  interestPortion: number;
  remainingBalance: number;
  status: PaymentStatus;
  paidAmount: number;
  paidDate?: string;
  lateDays: number;
  lateFee: number;
}

export interface Guarantor {
  name: string;
  identification: string;
  phone: string;
  relationship: string;
}

export interface Loan {
  id: string;
  code: string; // e.g. LND-2026-001
  clientId: string;
  clientName: string;
  clientIdentification: string;
  clientPhone: string;
  clientEmail: string;
  clientRiskTier: RiskTier;
  principalAmount: number;
  interestRate: number; // percentage per period (e.g., 2.5%)
  frequency: LoanFrequency;
  amortizationMethod: AmortizationMethod;
  totalTerms: number; // number of payments
  gracePeriodDays: number;
  startDate: string; // ISO Date YYYY-MM-DD
  status: LoanStatus;
  totalInterest: number;
  totalPayable: number;
  remainingBalance: number;
  overdueDays: number;
  accruedFine: number;
  paymentSchedule: AmortizationItem[];
  guarantor?: Guarantor;
  customClauses?: string[];
  customNotes?: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  loanId: string;
  loanCode: string;
  clientId: string;
  clientName: string;
  installmentNo: number;
  amountPaid: number;
  principalPaid: number;
  interestPaid: number;
  finePaid: number;
  paymentDate: string;
  paymentMethod: 'efectivo' | 'transferencia' | 'tarjeta' | 'cheque';
  referenceNo?: string;
  notes?: string;
}

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
}

export interface AIContractResponse {
  clausulasEspeciales: string[];
  resumenRiesgo: string;
  penalizacionesMora: string;
}

export interface AIRiskAnalysisResponse {
  nivelRiesgoRecomendado: string;
  tasaSugerida: string;
  exposicionIngresoPct: number;
  requiereGarantía: boolean;
  recomendacionesOficial: string[];
}
