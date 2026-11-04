import { Injectable, signal, computed, effect } from '@angular/core';
import {
  Client,
  Loan,
  AmortizationItem,
  PaymentRecord,
  LoanFrequency,
  AmortizationMethod,
  LoanStatus,
  PaymentStatus,
  CurrencyConfig,
  Guarantor
} from '../models/loan.models';

const CURRENCIES: CurrencyConfig[] = [
  { code: 'USD', symbol: '$', name: 'Dólares ($)' },
  { code: 'DOP', symbol: 'RD$', name: 'Pesos Dominicanos (RD$)' },
  { code: 'MXN', symbol: 'MX$', name: 'Pesos Mexicanos (MX$)' },
  { code: 'EUR', symbol: '€', name: 'Euros (€)' },
  { code: 'PEN', symbol: 'S/', name: 'Soles Peruanos (S/)' },
  { code: 'GTQ', symbol: 'Q', name: 'Quetzales (Q)' },
];

const LOCAL_STORAGE_KEY_CLIENTS = 'swiftlend_clients_v1';
const LOCAL_STORAGE_KEY_LOANS = 'swiftlend_loans_v1';
const LOCAL_STORAGE_KEY_PAYMENTS = 'swiftlend_payments_v1';

@Injectable({
  providedIn: 'root'
})
export class LoanService {
  // Signals state
  readonly clients = signal<Client[]>([]);
  readonly loans = signal<Loan[]>([]);
  readonly payments = signal<PaymentRecord[]>([]);
  readonly selectedCurrency = signal<CurrencyConfig>(CURRENCIES[0]);
  readonly activeTab = signal<'dashboard' | 'clients' | 'calculator' | 'loans' | 'delinquency' | 'contract' | 'payments'>('dashboard');
  
  // Selection state for detail modals/contract views
  readonly selectedLoanIdForContract = signal<string | null>(null);
  readonly selectedLoanIdForPayment = signal<string | null>(null);
  readonly selectedClientIdForDetail = signal<string | null>(null);

  constructor() {
    this.loadInitialData();

    // Persist changes to localStorage
    effect(() => {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(LOCAL_STORAGE_KEY_CLIENTS, JSON.stringify(this.clients()));
        localStorage.setItem(LOCAL_STORAGE_KEY_LOANS, JSON.stringify(this.loans()));
        localStorage.setItem(LOCAL_STORAGE_KEY_PAYMENTS, JSON.stringify(this.payments()));
      }
    });
  }

  // Computed Portfolio Metrics
  readonly totalCapitalInvested = computed(() => {
    return this.loans().reduce((sum, loan) => sum + loan.principalAmount, 0);
  });

  readonly totalActiveCapital = computed(() => {
    return this.loans()
      .filter(l => l.status !== 'pagado')
      .reduce((sum, loan) => sum + loan.remainingBalance, 0);
  });

  readonly totalInterestExpected = computed(() => {
    return this.loans().reduce((sum, loan) => sum + loan.totalInterest, 0);
  });

  readonly totalCollected = computed(() => {
    return this.payments().reduce((sum, p) => sum + p.amountPaid, 0);
  });

  readonly activeLoansCount = computed(() => {
    return this.loans().filter(l => l.status !== 'pagado').length;
  });

  readonly overdueLoans = computed(() => {
    return this.loans().filter(l => l.status === 'en_mora' || l.status === 'vencido');
  });

  readonly overdueCount = computed(() => this.overdueLoans().length);

  readonly totalAccruedFines = computed(() => {
    return this.loans().reduce((sum, loan) => sum + loan.accruedFine, 0);
  });

  readonly portfolioAtRisk30Pct = computed(() => {
    const totalActive = this.totalActiveCapital();
    if (totalActive <= 0) return 0;

    const atRiskBalance = this.loans()
      .filter(l => l.overdueDays >= 15 && l.status !== 'pagado')
      .reduce((sum, l) => sum + l.remainingBalance, 0);

    return Number(((atRiskBalance / totalActive) * 100).toFixed(1));
  });

  readonly nextUpcomingCollection = computed(() => {
    const items: { loan: Loan; installment: AmortizationItem }[] = [];

    this.loans().forEach(loan => {
      if (loan.status === 'pagado') return;
      loan.paymentSchedule.forEach(inst => {
        if (inst.status === 'pendiente' || inst.status === 'vencido' || inst.status === 'parcial') {
          items.push({ loan, installment: inst });
        }
      });
    });

    items.sort((a, b) => a.installment.dueDate.localeCompare(b.installment.dueDate));
    return items.slice(0, 8);
  });

  // Calculate Amortization Schedule
  calculateAmortization(
    principal: number,
    ratePercent: number, // % per period
    frequency: LoanFrequency,
    method: AmortizationMethod,
    terms: number,
    startDate: string = new Date().toISOString().split('T')[0],
    graceDays = 0
  ): { schedule: AmortizationItem[]; totalInterest: number; totalPayable: number; installmentAmount: number } {
    const schedule: AmortizationItem[] = [];
    let remainingBalance = principal;
    let totalInterest = 0;
    const r = ratePercent / 100;

    const baseDate = new Date(startDate);
    if (graceDays > 0) {
      baseDate.setDate(baseDate.getDate() + graceDays);
    }

    let pmtFixed = 0;

    if (method === 'cuota_fija') {
      if (r === 0) {
        pmtFixed = principal / terms;
      } else {
        pmtFixed = (principal * (r * Math.pow(1 + r, terms))) / (Math.pow(1 + r, terms) - 1);
      }
    }

    const principalConstant = principal / terms;

    for (let i = 1; i <= terms; i++) {
      // Calculate due date according to frequency
      const dueDateObj = new Date(baseDate);
      if (frequency === 'diario') {
        dueDateObj.setDate(dueDateObj.getDate() + (i * 1));
      } else if (frequency === 'semanal') {
        dueDateObj.setDate(dueDateObj.getDate() + (i * 7));
      } else if (frequency === 'quincenal') {
        dueDateObj.setDate(dueDateObj.getDate() + (i * 15));
      } else if (frequency === 'mensual') {
        dueDateObj.setMonth(dueDateObj.getMonth() + i);
      }

      const dueDateStr = dueDateObj.toISOString().split('T')[0];

      let interestPortion = 0;
      let principalPortion = 0;
      let paymentAmount = 0;

      if (method === 'cuota_fija') {
        interestPortion = remainingBalance * r;
        principalPortion = pmtFixed - interestPortion;
        paymentAmount = pmtFixed;
      } else if (method === 'interes_simple') {
        interestPortion = principal * r;
        principalPortion = principalConstant;
        paymentAmount = principalPortion + interestPortion;
      } else if (method === 'sistema_aleman') {
        interestPortion = remainingBalance * r;
        principalPortion = principalConstant;
        paymentAmount = principalPortion + interestPortion;
      }

      // Final round fix for clean math
      if (i === terms) {
        principalPortion = remainingBalance;
        paymentAmount = principalPortion + interestPortion;
        remainingBalance = 0;
      } else {
        remainingBalance = Math.max(0, remainingBalance - principalPortion);
      }

      totalInterest += interestPortion;

      schedule.push({
        installmentNo: i,
        dueDate: dueDateStr,
        paymentAmount: Number(paymentAmount.toFixed(2)),
        principalPortion: Number(principalPortion.toFixed(2)),
        interestPortion: Number(interestPortion.toFixed(2)),
        remainingBalance: Number(remainingBalance.toFixed(2)),
        status: 'pendiente',
        paidAmount: 0,
        lateDays: 0,
        lateFee: 0
      });
    }

    const totalPayable = principal + totalInterest;
    const avgInstallment = schedule.length > 0 ? schedule[0].paymentAmount : 0;

    return {
      schedule,
      totalInterest: Number(totalInterest.toFixed(2)),
      totalPayable: Number(totalPayable.toFixed(2)),
      installmentAmount: Number(avgInstallment.toFixed(2))
    };
  }

  // Create Client
  addClient(clientData: Omit<Client, 'id' | 'createdAt'>): Client {
    const newClient: Client = {
      ...clientData,
      id: 'CLI-' + Math.floor(100000 + Math.random() * 900000),
      createdAt: new Date().toISOString().split('T')[0]
    };
    this.clients.update(prev => [newClient, ...prev]);
    return newClient;
  }

  updateClient(id: string, clientData: Partial<Client>) {
    this.clients.update(prev =>
      prev.map(c => (c.id === id ? { ...c, ...clientData } : c))
    );
  }

  deleteClient(id: string) {
    this.clients.update(prev => prev.filter(c => c.id !== id));
  }

  // Create Loan
  createLoan(loanData: {
    clientId: string;
    principalAmount: number;
    interestRate: number;
    frequency: LoanFrequency;
    amortizationMethod: AmortizationMethod;
    totalTerms: number;
    gracePeriodDays: number;
    startDate: string;
    guarantor?: Guarantor;
    customClauses?: string[];
    customNotes?: string;
  }): Loan | null {
    const client = this.clients().find(c => c.id === loanData.clientId);
    if (!client) return null;

    const calc = this.calculateAmortization(
      loanData.principalAmount,
      loanData.interestRate,
      loanData.frequency,
      loanData.amortizationMethod,
      loanData.totalTerms,
      loanData.startDate,
      loanData.gracePeriodDays
    );

    const loanCode = 'LND-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900);

    const newLoan: Loan = {
      id: 'LOAN-' + Date.now(),
      code: loanCode,
      clientId: client.id,
      clientName: client.fullName,
      clientIdentification: `${client.identificationType}: ${client.identificationNumber}`,
      clientPhone: client.phone,
      clientEmail: client.email,
      clientRiskTier: client.riskTier,
      principalAmount: loanData.principalAmount,
      interestRate: loanData.interestRate,
      frequency: loanData.frequency,
      amortizationMethod: loanData.amortizationMethod,
      totalTerms: loanData.totalTerms,
      gracePeriodDays: loanData.gracePeriodDays,
      startDate: loanData.startDate,
      status: 'al_dia',
      totalInterest: calc.totalInterest,
      totalPayable: calc.totalPayable,
      remainingBalance: calc.totalPayable,
      overdueDays: 0,
      accruedFine: 0,
      paymentSchedule: calc.schedule,
      guarantor: loanData.guarantor,
      customClauses: loanData.customClauses || [],
      customNotes: loanData.customNotes || '',
      createdAt: new Date().toISOString().split('T')[0]
    };

    this.loans.update(prev => [newLoan, ...prev]);
    return newLoan;
  }

  // Record Payment against an Installment
  recordPayment(payload: {
    loanId: string;
    installmentNo: number;
    amountPaid: number;
    paymentMethod: 'efectivo' | 'transferencia' | 'tarjeta' | 'cheque';
    referenceNo?: string;
    notes?: string;
  }): PaymentRecord | null {
    const loan = this.loans().find(l => l.id === payload.loanId);
    if (!loan) return null;

    const schedule = loan.paymentSchedule.map(item => {
      if (item.installmentNo === payload.installmentNo) {
        const totalDue = item.paymentAmount + item.lateFee;
        const newPaidAmount = item.paidAmount + payload.amountPaid;
        let newStatus: PaymentStatus = item.status;

        if (newPaidAmount >= totalDue - 0.05) {
          newStatus = 'pagado';
        } else if (newPaidAmount > 0) {
          newStatus = 'parcial';
        }

        return {
          ...item,
          paidAmount: Number(newPaidAmount.toFixed(2)),
          status: newStatus,
          paidDate: new Date().toISOString().split('T')[0]
        };
      }
      return item;
    });

    // Recalculate loan overall remaining balance & status
    const newRemainingBalance = schedule.reduce((sum, item) => {
      const due = item.paymentAmount + item.lateFee;
      return sum + Math.max(0, due - item.paidAmount);
    }, 0);

    let newLoanStatus: LoanStatus = 'al_dia';
    if (newRemainingBalance <= 0.05) {
      newLoanStatus = 'pagado';
    } else {
      const isAnyOverdue = schedule.some(s => s.status === 'vencido');
      if (isAnyOverdue) {
        newLoanStatus = 'en_mora';
      }
    }

    const updatedLoan: Loan = {
      ...loan,
      paymentSchedule: schedule,
      remainingBalance: Number(newRemainingBalance.toFixed(2)),
      status: newLoanStatus
    };

    // Add Payment Record
    const newPayment: PaymentRecord = {
      id: 'PAY-' + Date.now(),
      loanId: loan.id,
      loanCode: loan.code,
      clientId: loan.clientId,
      clientName: loan.clientName,
      installmentNo: payload.installmentNo,
      amountPaid: payload.amountPaid,
      principalPaid: Math.min(payload.amountPaid, loan.paymentSchedule.find(s => s.installmentNo === payload.installmentNo)?.principalPortion || 0),
      interestPaid: Math.max(0, payload.amountPaid - (loan.paymentSchedule.find(s => s.installmentNo === payload.installmentNo)?.principalPortion || 0)),
      finePaid: 0,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: payload.paymentMethod,
      referenceNo: payload.referenceNo,
      notes: payload.notes
    };

    this.loans.update(prev => prev.map(l => l.id === loan.id ? updatedLoan : l));
    this.payments.update(prev => [newPayment, ...prev]);

    return newPayment;
  }

  // Currency Selection
  getAvailableCurrencies(): CurrencyConfig[] {
    return CURRENCIES;
  }

  setCurrency(curr: CurrencyConfig) {
    this.selectedCurrency.set(curr);
  }

  formatCurrency(val: number): string {
    const symbol = this.selectedCurrency().symbol;
    return `${symbol}${val.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // Initial Mock Data Seeding
  private loadInitialData() {
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedClients = localStorage.getItem(LOCAL_STORAGE_KEY_CLIENTS);
      const savedLoans = localStorage.getItem(LOCAL_STORAGE_KEY_LOANS);
      const savedPayments = localStorage.getItem(LOCAL_STORAGE_KEY_PAYMENTS);

      if (savedClients && savedLoans) {
        try {
          this.clients.set(JSON.parse(savedClients));
          this.loans.set(JSON.parse(savedLoans));
          if (savedPayments) this.payments.set(JSON.parse(savedPayments));
          return;
        } catch (e) {
          console.error('Error reading localStorage, generating seed data:', e);
        }
      }
    }

    // Seed Data
    const seedClients: Client[] = [
      {
        id: 'CLI-809123',
        fullName: 'Carlos Manuel Rosario',
        identificationType: 'CEDULA',
        identificationNumber: '001-1827394-8',
        phone: '+1 809 555 0192',
        email: 'carlos.rosario@email.com',
        address: 'Av. Winston Churchill #102, Santo Domingo',
        occupation: 'Comerciante Independiente',
        monthlyIncome: 3500,
        riskTier: 'A',
        notes: 'Cliente puntual con excelente historial comercial.',
        createdAt: '2026-01-15'
      },
      {
        id: 'CLI-809456',
        fullName: 'Dra. Elena Alcantara',
        identificationType: 'CEDULA',
        identificationNumber: '001-9923847-1',
        phone: '+1 809 555 8831',
        email: 'elena.alcantara@salud.org',
        address: 'Calle Los Encinos #45, Santiago',
        occupation: 'Médico Cirujano',
        monthlyIncome: 6200,
        riskTier: 'A',
        notes: 'Ingresos verificados en nómina médica.',
        createdAt: '2026-02-01'
      },
      {
        id: 'CLI-809789',
        fullName: 'Roberto Gómez Ferreiras',
        identificationType: 'DNI',
        identificationNumber: '402-9981234-5',
        phone: '+1 829 555 4420',
        email: 'roberto.gomez@taller.com',
        address: 'Zona Industrial Herrera #12, Santo Domingo Oeste',
        occupation: 'Propietario Taller Automotriz',
        monthlyIncome: 2400,
        riskTier: 'C',
        notes: 'Requiere seguimiento semanal en ruta de cobro.',
        createdAt: '2026-02-10'
      },
      {
        id: 'CLI-809321',
        fullName: 'María Victoria Reyes',
        identificationType: 'RNC',
        identificationNumber: '131-44569-2',
        phone: '+1 809 555 7711',
        email: 'ventas@boutiquemaria.com',
        address: 'Plaza Central Local 30, Baní',
        occupation: 'Empresaria Textil',
        monthlyIncome: 4100,
        riskTier: 'B',
        notes: 'Préstamo para inventario de temporada.',
        createdAt: '2026-02-20'
      }
    ];

    this.clients.set(seedClients);

    // Create seed loans across Diarios, Semanales, Quincenales, Mensuales
    // Loan 1: Diario (Riesgo C - En mora)
    const loan1Calc = this.calculateAmortization(1200, 1.5, 'diario', 'cuota_fija', 20, '2026-02-15');
    // Mark first 5 items as paid, next 4 as vencido with late days
    loan1Calc.schedule.forEach((item, idx) => {
      if (idx < 5) {
        item.status = 'pagado';
        item.paidAmount = item.paymentAmount;
        item.paidDate = '2026-02-20';
      } else if (idx < 9) {
        item.status = 'vencido';
        item.lateDays = (9 - idx) * 3;
        item.lateFee = Number((item.paymentAmount * 0.05).toFixed(2));
      }
    });

    const loan1: Loan = {
      id: 'LOAN-101',
      code: 'LND-2026-001',
      clientId: seedClients[2].id,
      clientName: seedClients[2].fullName,
      clientIdentification: `${seedClients[2].identificationType}: ${seedClients[2].identificationNumber}`,
      clientPhone: seedClients[2].phone,
      clientEmail: seedClients[2].email,
      clientRiskTier: 'C',
      principalAmount: 1200,
      interestRate: 1.5,
      frequency: 'diario',
      amortizationMethod: 'cuota_fija',
      totalTerms: 20,
      gracePeriodDays: 0,
      startDate: '2026-02-15',
      status: 'en_mora',
      totalInterest: loan1Calc.totalInterest,
      totalPayable: loan1Calc.totalPayable,
      remainingBalance: 980,
      overdueDays: 12,
      accruedFine: 24.50,
      paymentSchedule: loan1Calc.schedule,
      guarantor: {
        name: 'José Gómez',
        identification: '402-1122334-1',
        phone: '+1 829 555 9900',
        relationship: 'Hermano'
      },
      customClauses: [
        'CLÁUSULA DE COBRO DIARIO: El cobrador autorizado visitará el establecimiento del PRESTATARIO en horario laboral de 10:00 AM a 4:00 PM.',
        'CLÁUSULA DE MORA DIARIA: Toda cuota no recibida al cierre de jornada generará un recargo automático del 5%.'
      ],
      customNotes: 'Préstamo rápido para herramientas de taller.',
      createdAt: '2026-02-15'
    };

    // Loan 2: Semanal (Al Día)
    const loan2Calc = this.calculateAmortization(3000, 2.0, 'semanal', 'cuota_fija', 12, '2026-02-01');
    loan2Calc.schedule.forEach((item, idx) => {
      if (idx < 4) {
        item.status = 'pagado';
        item.paidAmount = item.paymentAmount;
        item.paidDate = '2026-02-28';
      }
    });

    const loan2: Loan = {
      id: 'LOAN-102',
      code: 'LND-2026-002',
      clientId: seedClients[0].id,
      clientName: seedClients[0].fullName,
      clientIdentification: `${seedClients[0].identificationType}: ${seedClients[0].identificationNumber}`,
      clientPhone: seedClients[0].phone,
      clientEmail: seedClients[0].email,
      clientRiskTier: 'A',
      principalAmount: 3000,
      interestRate: 2.0,
      frequency: 'semanal',
      amortizationMethod: 'cuota_fija',
      totalTerms: 12,
      gracePeriodDays: 0,
      startDate: '2026-02-01',
      status: 'al_dia',
      totalInterest: loan2Calc.totalInterest,
      totalPayable: loan2Calc.totalPayable,
      remainingBalance: 2150,
      overdueDays: 0,
      accruedFine: 0,
      paymentSchedule: loan2Calc.schedule,
      guarantor: {
        name: 'Carmen Rosario',
        identification: '001-7788990-4',
        phone: '+1 809 555 3322',
        relationship: 'Esposa'
      },
      customClauses: [
        'PAGO MEDIANTE TRANSFERENCIA: El PRESTATARIO podrá abonar vía transferencia bancaria adjuntando comprobante en el sistema SwiftLend.'
      ],
      createdAt: '2026-02-01'
    };

    // Loan 3: Quincenal (Al Día)
    const loan3Calc = this.calculateAmortization(8000, 2.5, 'quincenal', 'sistema_aleman', 8, '2026-01-20');
    loan3Calc.schedule.forEach((item, idx) => {
      if (idx < 3) {
        item.status = 'pagado';
        item.paidAmount = item.paymentAmount;
        item.paidDate = '2026-03-01';
      }
    });

    const loan3: Loan = {
      id: 'LOAN-103',
      code: 'LND-2026-003',
      clientId: seedClients[1].id,
      clientName: seedClients[1].fullName,
      clientIdentification: `${seedClients[1].identificationType}: ${seedClients[1].identificationNumber}`,
      clientPhone: seedClients[1].phone,
      clientEmail: seedClients[1].email,
      clientRiskTier: 'A',
      principalAmount: 8000,
      interestRate: 2.5,
      frequency: 'quincenal',
      amortizationMethod: 'sistema_aleman',
      totalTerms: 8,
      gracePeriodDays: 0,
      startDate: '2026-01-20',
      status: 'al_dia',
      totalInterest: loan3Calc.totalInterest,
      totalPayable: loan3Calc.totalPayable,
      remainingBalance: 5100,
      overdueDays: 0,
      accruedFine: 0,
      paymentSchedule: loan3Calc.schedule,
      createdAt: '2026-01-20'
    };

    // Loan 4: Mensual (Próximo a Vencer)
    const loan4Calc = this.calculateAmortization(15000, 3.0, 'mensual', 'cuota_fija', 6, '2026-01-10');
    loan4Calc.schedule.forEach((item, idx) => {
      if (idx < 2) {
        item.status = 'pagado';
        item.paidAmount = item.paymentAmount;
        item.paidDate = '2026-02-10';
      }
    });

    const loan4: Loan = {
      id: 'LOAN-104',
      code: 'LND-2026-004',
      clientId: seedClients[3].id,
      clientName: seedClients[3].fullName,
      clientIdentification: `${seedClients[3].identificationType}: ${seedClients[3].identificationNumber}`,
      clientPhone: seedClients[3].phone,
      clientEmail: seedClients[3].email,
      clientRiskTier: 'B',
      principalAmount: 15000,
      interestRate: 3.0,
      frequency: 'mensual',
      amortizationMethod: 'cuota_fija',
      totalTerms: 6,
      gracePeriodDays: 0,
      startDate: '2026-01-10',
      status: 'proximo_vencer',
      totalInterest: loan4Calc.totalInterest,
      totalPayable: loan4Calc.totalPayable,
      remainingBalance: 10400,
      overdueDays: 0,
      accruedFine: 0,
      paymentSchedule: loan4Calc.schedule,
      createdAt: '2026-01-10'
    };

    this.loans.set([loan1, loan2, loan3, loan4]);

    // Seed Payments
    const seedPayments: PaymentRecord[] = [
      {
        id: 'PAY-8801',
        loanId: loan1.id,
        loanCode: loan1.code,
        clientId: loan1.clientId,
        clientName: loan1.clientName,
        installmentNo: 5,
        amountPaid: 69.50,
        principalPaid: 60.00,
        interestPaid: 9.50,
        finePaid: 0,
        paymentDate: '2026-02-20',
        paymentMethod: 'efectivo',
        notes: 'Pago recibido por cobrador en ruta'
      },
      {
        id: 'PAY-8802',
        loanId: loan2.id,
        loanCode: loan2.code,
        clientId: loan2.clientId,
        clientName: loan2.clientName,
        installmentNo: 4,
        amountPaid: 285.00,
        principalPaid: 250.00,
        interestPaid: 35.00,
        finePaid: 0,
        paymentDate: '2026-02-28',
        paymentMethod: 'transferencia',
        referenceNo: 'TRF-9928341',
        notes: 'Transferencia Banreservas'
      },
      {
        id: 'PAY-8803',
        loanId: loan3.id,
        loanCode: loan3.code,
        clientId: loan3.clientId,
        clientName: loan3.clientName,
        installmentNo: 3,
        amountPaid: 1150.00,
        principalPaid: 1000.00,
        interestPaid: 150.00,
        finePaid: 0,
        paymentDate: '2026-03-01',
        paymentMethod: 'transferencia',
        referenceNo: 'TRF-1002938'
      }
    ];

    this.payments.set(seedPayments);
  }
}
