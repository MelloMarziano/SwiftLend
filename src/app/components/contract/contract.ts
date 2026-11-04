import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoanService } from '../../services/loan.service';
import { AIService } from '../../services/ai.service';
import { Loan, AIContractResponse } from '../../models/loan.models';

@Component({
  selector: 'app-contract',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- Toolbar & Selector (hidden during print) -->
      <div class="no-print bg-white border border-slate-200/80 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div class="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
            <span class="material-icons-outlined text-sm">description</span>
            Generador Automático de Contratos SwiftALGO Legal Engine
          </div>
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Contrato de Pago Personalizado</h1>
          <p class="text-slate-500 text-sm mt-1">Imprime o exporta el documento contractual legal con firmas y tabla de amortización.</p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <!-- Select Loan -->
          <select 
            [value]="selectedLoanId()" 
            (change)="onLoanSelect($event)"
            class="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 text-xs font-bold focus:outline-none focus:border-emerald-600 focus:bg-white">
            @for (l of loanService.loans(); track l.id) {
              <option [value]="l.id">
                Contrato: {{ l.code }} — {{ l.clientName }} ({{ loanService.formatCurrency(l.principalAmount) }})
              </option>
            }
          </select>

          <button 
            (click)="printContract()"
            class="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition flex items-center gap-2">
            <span class="material-icons-outlined text-base">print</span>
            Imprimir Contrato (PDF)
          </button>
        </div>
      </div>

      <!-- AI Clauses Assistant Widget (hidden during print) -->
      @if (activeLoan()) {
        <div class="no-print bg-white border border-slate-200/80 p-5 rounded-2xl space-y-3 shadow-xs">
          <div class="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 class="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span class="material-icons-outlined text-purple-600">auto_awesome</span>
              Asistente de Cláusulas Legales con IA (Gemini)
            </h3>
            <span class="text-xs text-purple-700 font-mono font-bold">Generación Jurídica Personalizada</span>
          </div>

          <div class="flex flex-col md:flex-row items-center gap-3">
            <input 
              type="text" 
              [value]="customRequirementsInput()" 
              (input)="customRequirementsInput.set($any($event.target).value)"
              placeholder="Ej: Incluir vehículo Toyota Corolla 2021 en garantía, cobro a domicilio en tienda..."
              class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white"
            />

            <button 
              (click)="generateAIClauses()"
              [disabled]="aiService.isGeneratingContract()"
              class="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition whitespace-nowrap flex items-center gap-1">
              <span class="material-icons-outlined text-sm">smart_toy</span>
              {{ aiService.isGeneratingContract() ? 'Generando...' : 'Generar Cláusulas IA' }}
            </button>
          </div>

          @if (aiContractData()) {
            <div class="p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-2 text-xs text-purple-900">
              <div class="font-bold text-purple-900">Cláusulas Generadas por IA aplicadas al documento:</div>
              <ul class="list-disc list-inside space-y-1 text-purple-950 font-sans">
                @for (c of aiContractData()?.clausulasEspeciales; track c) {
                  <li>{{ c }}</li>
                }
              </ul>
              <div class="text-[11px] text-purple-800 font-mono border-t border-purple-200 pt-1">
                Nota de Resguardo: {{ aiContractData()?.resumenRiesgo }}
              </div>
            </div>
          }
        </div>
      }

      <!-- Printable Legal Contract Container -->
      @if (activeLoan(); as loan) {
        <div id="contract-document" class="printable-area bg-white text-slate-900 p-8 sm:p-12 rounded-2xl shadow-md max-w-4xl mx-auto space-y-8 font-sans border border-slate-200/80">
          
          <!-- Contract Header -->
          <div class="border-b-2 border-slate-900 pb-6 text-center space-y-2">
            <div class="flex items-center justify-between text-xs text-slate-500 uppercase font-mono tracking-wider">
              <span>ESTADO DEL CONTRATO: VIGENTE</span>
              <span>CÓDIGO UNICO: {{ loan.code }}</span>
            </div>
            <h1 class="text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-slate-900">
              CONTRATO PRIVADO DE PRÉSTAMO DE DINERO CON GARANTÍA Y TABLA DE PAGO DE AMORTIZACIÓN
            </h1>
            <p class="text-xs text-slate-600 italic">
              Conste por el presente documento privado, suscrito al amparo del Código Civil y Comercial Financiero.
            </p>
          </div>

          <!-- Section 1: Intervinientes -->
          <div class="space-y-2 text-xs sm:text-sm leading-relaxed">
            <h2 class="font-bold text-slate-900 text-sm uppercase border-b border-slate-300 pb-1">
              PRIMERA: DE LAS PARTES INTERVINIENTES
            </h2>
            <p>
              En la ciudad, a fecha <strong>{{ loan.startDate }}</strong>, intervienen en la celebración del presente contrato:
            </p>
            <div class="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2 text-xs">
              <div>
                <strong>EL PRESTAMISTA (Acreedor):</strong> <strong>SwiftLend Financial Systems (Plataforma SwiftALGO Engine)</strong>, con domicilio legal en oficinas centrales de gestión crediticia.
              </div>
              <div>
                <strong>EL PRESTATARIO (Deudor):</strong> Don/Doña <strong>{{ loan.clientName }}</strong>, identificado(a) con {{ loan.clientIdentification }}, teléfono de contacto {{ loan.clientPhone }} y dirección domiciliaria en {{ loan.clientEmail }}.
              </div>
              @if (loan.guarantor) {
                <div>
                  <strong>EL AVAL / GARANTE SOLIDARIO:</strong> Don/Doña <strong>{{ loan.guarantor.name }}</strong>, con teléfono {{ loan.guarantor.phone }}, en calidad de {{ loan.guarantor.relationship }}.
                </div>
              }
            </div>
          </div>

          <!-- Section 2: Objeto y Monto -->
          <div class="space-y-2 text-xs sm:text-sm leading-relaxed">
            <h2 class="font-bold text-slate-900 text-sm uppercase border-b border-slate-300 pb-1">
              SEGUNDA: MONTO DEL PRÉSTAMO, FRECUENCIA Y CONDICIONES DE PAGO
            </h2>
            <p>
              El PRESTAMISTA entrega en calidad de préstamo de mutuo acuerdo al PRESTATARIO la suma de 
              <strong class="text-slate-900 font-mono text-base">{{ loanService.formatCurrency(loan.principalAmount) }}</strong>, 
              suma que el PRESTATARIO declara recibir a su entera satisfacción al momento de la firma de este documento.
            </p>
            <ul class="list-disc list-inside space-y-1 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200 font-mono">
              <li><strong>Frecuencia de Pagos:</strong> {{ getFrequencyTitle(loan.frequency) }}</li>
              <li><strong>Tasa de Interés Pactada:</strong> {{ loan.interestRate }}% por periodo</li>
              <li><strong>Plazo de Pago:</strong> {{ loan.totalTerms }} cuotas pactadas</li>
              <li><strong>Total a Reembolsar (Capital + Intereses):</strong> {{ loanService.formatCurrency(loan.totalPayable) }}</li>
              <li><strong>Sistema de Amortización:</strong> {{ loan.amortizationMethod }}</li>
            </ul>
          </div>

          <!-- Section 3: Mora y Penalidades -->
          <div class="space-y-2 text-xs sm:text-sm leading-relaxed">
            <h2 class="font-bold text-slate-900 text-sm uppercase border-b border-slate-300 pb-1">
              TERCERA: INTERESES MORATORIOS Y PENALIZACIÓN POR INCUMPLIMIENTO
            </h2>
            <p>
              El no pago puntual de cualquier cuota pactada en la fecha fijada en la tabla adjunta constituirá al PRESTATARIO en mora de pleno derecho sin necesidad de requerimiento judicial ni extrajudicial previo. 
              En dicho evento, se aplicará un recargo por mora del <strong>5% semanal / diario acumulativo</strong> sobre la cuota vencida.
            </p>
          </div>

          <!-- Section 4: AI & Custom Clauses -->
          <div class="space-y-2 text-xs sm:text-sm leading-relaxed">
            <h2 class="font-bold text-slate-900 text-sm uppercase border-b border-slate-300 pb-1">
              CUARTA: CLÁUSULAS ESPECIALES PACTADAS
            </h2>
            <div class="space-y-2 text-xs">
              @for (clause of getContractClauses(loan); track clause) {
                <p class="p-2.5 bg-slate-50 border border-slate-200 rounded font-serif italic text-slate-800">
                  {{ clause }}
                </p>
              }
            </div>
          </div>

          <!-- Section 5: Integrated Amortization Table -->
          <div class="space-y-3">
            <h2 class="font-bold text-slate-900 text-sm uppercase border-b border-slate-300 pb-1">
              QUINTA: TABLA DE AMORTIZACIÓN Y CRONOGRAMA DE PAGOS ADJUNTO
            </h2>

            <table class="w-full text-left text-xs text-slate-800 border border-slate-300 border-collapse">
              <thead class="bg-slate-100 font-mono border-b border-slate-300">
                <tr>
                  <th class="p-2 border border-slate-300"># Cuota</th>
                  <th class="p-2 border border-slate-300">Fecha Vencimiento</th>
                  <th class="p-2 text-right border border-slate-300">Cuota a Pagar</th>
                  <th class="p-2 text-right border border-slate-300">Capital</th>
                  <th class="p-2 text-right border border-slate-300">Interés</th>
                  <th class="p-2 text-right border border-slate-300">Saldo Pendiente</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200 font-mono text-[11px]">
                @for (item of loan.paymentSchedule; track item.installmentNo) {
                  <tr>
                    <td class="p-2 border border-slate-300 font-bold">#{{ item.installmentNo }}</td>
                    <td class="p-2 border border-slate-300">{{ item.dueDate }}</td>
                    <td class="p-2 text-right border border-slate-300 font-bold">{{ loanService.formatCurrency(item.paymentAmount) }}</td>
                    <td class="p-2 text-right border border-slate-300">{{ loanService.formatCurrency(item.principalPortion) }}</td>
                    <td class="p-2 text-right border border-slate-300">{{ loanService.formatCurrency(item.interestPortion) }}</td>
                    <td class="p-2 text-right border border-slate-300 font-bold">{{ loanService.formatCurrency(item.remainingBalance) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Signatures Box -->
          <div class="pt-16 grid grid-cols-2 gap-12 text-center text-xs">
            <div class="space-y-2">
              <div class="border-t-2 border-slate-900 pt-2 font-bold text-slate-900 uppercase">
                FIRMA DEL PRESTATARIO (DEUDOR)
              </div>
              <div class="font-mono text-slate-600 text-[11px]">
                {{ loan.clientName }}<br>
                {{ loan.clientIdentification }}
              </div>
            </div>

            <div class="space-y-2">
              <div class="border-t-2 border-slate-900 pt-2 font-bold text-slate-900 uppercase">
                FIRMA DEL PRESTAMISTA (ACREEDOR)
              </div>
              <div class="font-mono text-slate-600 text-[11px]">
                SwiftLend Financial Engine<br>
                Representante Autorizado
              </div>
            </div>

            @if (loan.guarantor) {
              <div class="col-span-2 max-w-xs mx-auto pt-8 space-y-2">
                <div class="border-t-2 border-slate-900 pt-2 font-bold text-slate-900 uppercase">
                  FIRMA DEL AVAL / GARANTE SOLIDARIO
                </div>
                <div class="font-mono text-slate-600 text-[11px]">
                  {{ loan.guarantor.name }}
                </div>
              </div>
            }
          </div>
        </div>
      } @else {
        <div class="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-xs">
          No hay ningún préstamo seleccionado para visualización de contrato.
        </div>
      }
    </div>
  `
})
export class ContractComponent {
  loanService = inject(LoanService);
  aiService = inject(AIService);

  readonly selectedLoanId = signal<string>('');
  readonly customRequirementsInput = signal<string>('');
  readonly aiContractData = signal<AIContractResponse | null>(null);

  constructor() {
    const loanId = this.loanService.selectedLoanIdForContract() || (this.loanService.loans()[0]?.id ?? '');
    this.selectedLoanId.set(loanId);
  }

  readonly activeLoan = computed(() => {
    return this.loanService.loans().find(l => l.id === this.selectedLoanId());
  });

  onLoanSelect(e: Event) {
    const val = (e.target as HTMLSelectElement).value;
    this.selectedLoanId.set(val);
    this.loanService.selectedLoanIdForContract.set(val);
    this.aiContractData.set(null);
  }

  getFrequencyTitle(freq: string): string {
    switch (freq) {
      case 'diario': return 'Cobros Diarios de Lunes a Sábado';
      case 'semanal': return 'Cobros Semanales los días acordados';
      case 'quincenal': return 'Cobros Quincenales (días 15 y 30 de cada mes)';
      case 'mensual': return 'Cobros Mensuales acumulados';
      default: return freq;
    }
  }

  getContractClauses(loan: Loan): string[] {
    const baseClauses = loan.customClauses || [];
    const aiClauses = this.aiContractData()?.clausulasEspeciales || [];
    return [...baseClauses, ...aiClauses];
  }

  async generateAIClauses() {
    const loan = this.activeLoan();
    if (!loan) return;

    const res = await this.aiService.generateCustomContractClauses({
      clientName: loan.clientName,
      identification: loan.clientIdentification,
      amount: loan.principalAmount,
      frequency: loan.frequency,
      rate: loan.interestRate,
      totalTerms: loan.totalTerms,
      riskTier: loan.clientRiskTier,
      customRequirements: this.customRequirementsInput()
    });

    if (res) {
      this.aiContractData.set(res);
    }
  }

  printContract() {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }
}
