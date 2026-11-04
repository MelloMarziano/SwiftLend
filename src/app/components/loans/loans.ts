import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoanService } from '../../services/loan.service';
import { AIService } from '../../services/ai.service';
import { Loan, LoanFrequency, AmortizationMethod, LoanStatus, Guarantor, AIRiskAnalysisResponse } from '../../models/loan.models';

@Component({
  selector: 'app-loans',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/80 p-6 rounded-2xl shadow-xs">
        <div>
          <div class="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
            <span class="material-icons-outlined text-sm">request_quote</span>
            Cartera de Créditos Emitidos
          </div>
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Gestión de Préstamos</h1>
          <p class="text-slate-500 text-sm mt-1">Supervisa contratos vigentes, aprueba nuevos créditos y consulta calendarios de cobro.</p>
        </div>

        <button 
          (click)="openNewLoanModal()"
          class="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-xs transition flex items-center gap-2 self-start md:self-auto">
          <span class="material-icons-outlined text-lg">add_circle_outline</span>
          Emitir Nuevo Préstamo
        </button>
      </div>

      <!-- Filters Toolbar -->
      <div class="bg-white border border-slate-200/80 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
        <div class="relative w-full md:w-96">
          <span class="material-icons-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
          <input 
            type="text" 
            [value]="searchTerm()" 
            (input)="updateSearch($event)"
            placeholder="Buscar por código de préstamo o cliente..."
            class="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white"
          />
        </div>

        <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-stretch md:self-auto overflow-x-auto">
          <button 
            (click)="selectedStatusFilter.set('ALL')"
            [class]="selectedStatusFilter() === 'ALL' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'"
            class="px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap">
            Todos ({{ loanService.loans().length }})
          </button>
          <button 
            (click)="selectedStatusFilter.set('al_dia')"
            [class]="selectedStatusFilter() === 'al_dia' ? 'bg-emerald-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'"
            class="px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap">
            Al Día
          </button>
          <button 
            (click)="selectedStatusFilter.set('en_mora')"
            [class]="selectedStatusFilter() === 'en_mora' ? 'bg-rose-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'"
            class="px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap">
            En Mora
          </button>
          <button 
            (click)="selectedStatusFilter.set('pagado')"
            [class]="selectedStatusFilter() === 'pagado' ? 'bg-slate-700 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'"
            class="px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap">
            Pagados
          </button>
        </div>
      </div>

      <!-- Loans Portfolio Table -->
      <div class="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-700">
            <thead class="bg-slate-50 text-slate-500 uppercase font-mono border-b border-slate-200">
              <tr>
                <th class="p-4">Código / Contrato</th>
                <th class="p-4">Cliente Prestatario</th>
                <th class="p-4">Frecuencia</th>
                <th class="p-4 text-right">Capital Prestado</th>
                <th class="p-4 text-right">Saldo Pendiente</th>
                <th class="p-4 text-center">Estado</th>
                <th class="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (loan of filteredLoans(); track loan.id) {
                <tr class="hover:bg-slate-50/80 transition">
                  <td class="p-4 font-mono font-bold text-emerald-700">
                    {{ loan.code }}
                    <span class="block text-[10px] text-slate-500 font-sans font-normal">Emitido: {{ loan.startDate }}</span>
                  </td>
                  <td class="p-4 font-semibold text-slate-900">
                    <div>{{ loan.clientName }}</div>
                    <div class="text-[11px] text-slate-500 font-mono">{{ loan.clientIdentification }}</div>
                  </td>
                  <td class="p-4">
                    <span class="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 uppercase font-mono font-bold text-[11px]">
                      {{ loan.frequency }}
                    </span>
                    <span class="block text-[10px] text-slate-500 font-mono mt-0.5">{{ loan.interestRate }}% / period</span>
                  </td>
                  <td class="p-4 text-right font-mono font-bold text-slate-900">
                    {{ loanService.formatCurrency(loan.principalAmount) }}
                  </td>
                  <td class="p-4 text-right font-mono font-bold text-emerald-700">
                    {{ loanService.formatCurrency(loan.remainingBalance) }}
                    @if (loan.accruedFine > 0) {
                      <span class="block text-[10px] text-rose-600">+{{ loanService.formatCurrency(loan.accruedFine) }} recargo</span>
                    }
                  </td>
                  <td class="p-4 text-center">
                    <span [class]="getLoanStatusBadgeStyle(loan.status)" class="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider inline-block">
                      {{ getLoanStatusLabel(loan.status) }}
                    </span>
                  </td>
                  <td class="p-4 text-center">
                    <div class="flex items-center justify-center gap-2">
                      <button 
                        (click)="viewContract(loan)"
                        class="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition flex items-center gap-1 text-[11px]"
                        title="Ver Contrato de Pago">
                        <span class="material-icons-outlined text-sm text-emerald-600">description</span>
                        Contrato
                      </button>

                      <button 
                        (click)="viewSchedule(loan)"
                        class="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition flex items-center gap-1 text-[11px]"
                        title="Ver Tabla de Amortización">
                        <span class="material-icons-outlined text-sm text-sky-600">table_chart</span>
                        Tabla
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="p-8 text-center text-slate-400 font-medium">
                    No se encontraron contratos de préstamo en esta vista.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- New Loan Emission Wizard Modal -->
      @if (showNewLoanModal()) {
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div class="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 class="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span class="material-icons-outlined text-emerald-600">post_add</span>
                Emisión de Nuevo Crédito & Contrato
              </h3>
              <button (click)="showNewLoanModal.set(false)" class="text-slate-400 hover:text-slate-700">
                <span class="material-icons-outlined">close</span>
              </button>
            </div>

            <!-- Form Content -->
            <div class="space-y-4 text-xs text-slate-700">
              <!-- Select Client -->
              <div class="space-y-1">
                <span class="block font-semibold text-slate-700">Seleccionar Cliente Prestatario *</span>
                <select 
                  [value]="newLoanClientId()" 
                  (change)="newLoanClientId.set($any($event.target).value)"
                  class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium focus:outline-none focus:border-emerald-600 focus:bg-white text-sm">
                  <option value="">-- Seleccionar cliente de la lista --</option>
                  @for (c of loanService.clients(); track c.id) {
                    <option [value]="c.id">
                      {{ c.fullName }} ({{ c.identificationType }}: {{ c.identificationNumber }}) — Riesgo {{ c.riskTier }}
                    </option>
                  }
                </select>
              </div>

              <!-- AI Credit Risk Advisor trigger button -->
              @if (newLoanClientId()) {
                <div class="p-3 bg-purple-50/60 rounded-xl border border-purple-200 flex items-center justify-between">
                  <div class="flex items-center gap-2 text-xs text-purple-900 font-semibold">
                    <span class="material-icons-outlined text-purple-600 text-base">psychology</span>
                    <span>Evaluación Inteligente de Riesgo Gemini IA</span>
                  </div>

                  <button 
                    (click)="runAIRiskAdvisor()"
                    [disabled]="aiService.isAnalyzingRisk()"
                    class="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1 disabled:opacity-50">
                    <span class="material-icons-outlined text-sm">auto_awesome</span>
                    {{ aiService.isAnalyzingRisk() ? 'Analizando...' : 'Analizar Riesgo' }}
                  </button>
                </div>

                @if (aiRiskResult()) {
                  <div class="p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-1.5 text-xs text-purple-900">
                    <div class="font-bold flex items-center justify-between">
                      <span>Dictamen de Riesgo: {{ aiRiskResult()?.nivelRiesgoRecomendado }}</span>
                      <span class="font-mono text-xs">Exposición: {{ aiRiskResult()?.exposicionIngresoPct }}% del ingreso</span>
                    </div>
                    <div class="text-[11px] text-purple-800 font-mono">Tasa Sugerida: {{ aiRiskResult()?.tasaSugerida }}</div>
                    <ul class="list-disc list-inside text-[11px] space-y-0.5 text-purple-800">
                      @for (rec of aiRiskResult()?.recomendacionesOficial; track rec) {
                        <li>{{ rec }}</li>
                      }
                    </ul>
                  </div>
                }
              }

              <!-- Loan Amount & Rate -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="space-y-1">
                  <span class="block font-semibold text-slate-700">Monto Principal *</span>
                  <input 
                    type="number" 
                    [value]="newLoanAmount()" 
                    (input)="newLoanAmount.set($any($event.target).valueAsNumber || 0)"
                    class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>

                <div class="space-y-1">
                  <span class="block font-semibold text-slate-700">Tasa Interés (% por periodo) *</span>
                  <input 
                    type="number" 
                    [value]="newLoanRate()" 
                    (input)="newLoanRate.set($any($event.target).valueAsNumber || 0)"
                    step="0.5"
                    class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              <!-- Frecuencia & Amortización -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="space-y-1">
                  <span class="block font-semibold text-slate-700">Frecuencia de Pago Variable</span>
                  <select 
                    [value]="newLoanFreq()" 
                    (change)="newLoanFreq.set($any($event.target).value)"
                    class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white">
                    <option value="diario">Diarios (Cobro Diario)</option>
                    <option value="semanal">Semanales (Cobro Semanal)</option>
                    <option value="quincenal">Quincenales (Cobro Quincenal)</option>
                    <option value="mensual">Mensuales (Cobro Mensual)</option>
                  </select>
                </div>

                <div class="space-y-1">
                  <span class="block font-semibold text-slate-700">Sistema de Amortización</span>
                  <select 
                    [value]="newLoanMethod()" 
                    (change)="newLoanMethod.set($any($event.target).value)"
                    class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white">
                    <option value="cuota_fija">Cuota Nivelada (Francés)</option>
                    <option value="interes_simple">Interés Simple</option>
                    <option value="sistema_aleman">Sistema Alemán</option>
                  </select>
                </div>
              </div>

              <!-- Terms & Grace -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="space-y-1">
                  <span class="block font-semibold text-slate-700">Número de Cuotas</span>
                  <input 
                    type="number" 
                    [value]="newLoanTerms()" 
                    (input)="newLoanTerms.set($any($event.target).valueAsNumber || 1)"
                    min="1"
                    class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>

                <div class="space-y-1">
                  <span class="block font-semibold text-slate-700">Días de Gracia</span>
                  <input 
                    type="number" 
                    [value]="newLoanGrace()" 
                    (input)="newLoanGrace.set($any($event.target).valueAsNumber || 0)"
                    min="0"
                    class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>

                <div class="space-y-1">
                  <span class="block font-semibold text-slate-700">Fecha Desembolso</span>
                  <input 
                    type="date" 
                    [value]="newLoanStartDate()" 
                    (input)="newLoanStartDate.set($any($event.target).value)"
                    class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              <!-- Guarantor (Avalista) -->
              <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div class="font-bold text-slate-800 text-xs flex items-center justify-between">
                  <span>Datos del Avalista / Co-deudor (Garantía Personal)</span>
                  <span class="text-[10px] text-slate-500">Opcional</span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input 
                    type="text" 
                    [value]="guarantorName()" 
                    (input)="guarantorName.set($any($event.target).value)"
                    placeholder="Nombre completo del Aval"
                    class="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900"
                  />
                  <input 
                    type="text" 
                    [value]="guarantorPhone()" 
                    (input)="guarantorPhone.set($any($event.target).value)"
                    placeholder="Teléfono del Aval"
                    class="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 font-mono"
                  />
                </div>
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button 
                (click)="showNewLoanModal.set(false)"
                class="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-medium">
                Cancelar
              </button>
              <button 
                (click)="submitCreateLoan()"
                [disabled]="!newLoanClientId() || newLoanAmount() <= 0"
                class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs shadow-xs transition flex items-center gap-2">
                <span class="material-icons-outlined text-sm">receipt_long</span>
                Emitir Préstamo & Generar Contrato
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Schedule Modal -->
      @if (selectedLoanSchedule()) {
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div class="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 class="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span class="material-icons-outlined text-sky-600">table_chart</span>
                  Tabla de Amortización: {{ selectedLoanSchedule()?.code }}
                </h3>
                <p class="text-xs text-slate-500">Cliente: {{ selectedLoanSchedule()?.clientName }}</p>
              </div>
              <button (click)="selectedLoanSchedule.set(null)" class="text-slate-400 hover:text-slate-700">
                <span class="material-icons-outlined">close</span>
              </button>
            </div>

            <div class="overflow-x-auto max-h-[450px]">
              <table class="w-full text-left text-xs text-slate-700">
                <thead class="bg-slate-50 text-slate-500 uppercase font-mono border-b border-slate-200 sticky top-0">
                  <tr>
                    <th class="p-3">#</th>
                    <th class="p-3">Vencimiento</th>
                    <th class="p-3 text-right">Monto Cuota</th>
                    <th class="p-3 text-right">Abono Capital</th>
                    <th class="p-3 text-right">Interés</th>
                    <th class="p-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-mono">
                  @for (item of selectedLoanSchedule()?.paymentSchedule; track item.installmentNo) {
                    <tr class="hover:bg-slate-50/80 transition">
                      <td class="p-3 font-bold text-slate-500">#{{ item.installmentNo }}</td>
                      <td class="p-3 text-slate-700">{{ item.dueDate }}</td>
                      <td class="p-3 text-right font-bold text-slate-900">{{ loanService.formatCurrency(item.paymentAmount) }}</td>
                      <td class="p-3 text-right text-emerald-700 font-semibold">{{ loanService.formatCurrency(item.principalPortion) }}</td>
                      <td class="p-3 text-right text-sky-700 font-semibold">{{ loanService.formatCurrency(item.interestPortion) }}</td>
                      <td class="p-3 text-center">
                        <span [class]="getItemStatusStyle(item.status)" class="px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                          {{ item.status }}
                        </span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="flex items-center justify-end pt-2 border-t border-slate-100">
              <button (click)="selectedLoanSchedule.set(null)" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class LoansComponent {
  loanService = inject(LoanService);
  aiService = inject(AIService);

  readonly searchTerm = signal<string>('');
  readonly selectedStatusFilter = signal<'ALL' | 'al_dia' | 'en_mora' | 'pagado'>('ALL');
  readonly showNewLoanModal = signal<boolean>(false);
  readonly selectedLoanSchedule = signal<Loan | null>(null);

  // New Loan Form Signals
  readonly newLoanClientId = signal<string>('');
  readonly newLoanAmount = signal<number>(3000);
  readonly newLoanRate = signal<number>(2.5);
  readonly newLoanFreq = signal<LoanFrequency>('semanal');
  readonly newLoanMethod = signal<AmortizationMethod>('cuota_fija');
  readonly newLoanTerms = signal<number>(10);
  readonly newLoanGrace = signal<number>(0);
  readonly newLoanStartDate = signal<string>(new Date().toISOString().split('T')[0]);

  // Guarantor signals
  readonly guarantorName = signal<string>('');
  readonly guarantorPhone = signal<string>('');

  // AI Risk signal
  readonly aiRiskResult = signal<AIRiskAnalysisResponse | null>(null);

  constructor() {
    const preselectedClientId = this.loanService.selectedClientIdForDetail();
    if (preselectedClientId) {
      this.newLoanClientId.set(preselectedClientId);
      this.showNewLoanModal.set(true);
      this.loanService.selectedClientIdForDetail.set(null);
    }
  }

  readonly filteredLoans = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const status = this.selectedStatusFilter();

    return this.loanService.loans().filter(loan => {
      const matchesSearch = 
        loan.code.toLowerCase().includes(term) ||
        loan.clientName.toLowerCase().includes(term);

      const matchesStatus = status === 'ALL' || loan.status === status;

      return matchesSearch && matchesStatus;
    });
  });

  updateSearch(e: Event) {
    this.searchTerm.set((e.target as HTMLInputElement).value);
  }

  openNewLoanModal() {
    this.aiRiskResult.set(null);
    this.showNewLoanModal.set(true);
  }

  async runAIRiskAdvisor() {
    const clientId = this.newLoanClientId();
    const client = this.loanService.clients().find(c => c.id === clientId);
    if (!client) return;

    const res = await this.aiService.analyzeCreditRisk({
      clientName: client.fullName,
      monthlyIncome: client.monthlyIncome,
      occupation: client.occupation,
      requestedAmount: this.newLoanAmount(),
      frequency: this.newLoanFreq(),
      riskTier: client.riskTier
    });

    if (res) {
      this.aiRiskResult.set(res);
    }
  }

  submitCreateLoan() {
    if (!this.newLoanClientId() || this.newLoanAmount() <= 0) return;

    let guarantor: Guarantor | undefined;
    if (this.guarantorName().trim()) {
      guarantor = {
        name: this.guarantorName(),
        phone: this.guarantorPhone(),
        identification: 'S/D',
        relationship: 'Garante Solidario'
      };
    }

    const createdLoan = this.loanService.createLoan({
      clientId: this.newLoanClientId(),
      principalAmount: this.newLoanAmount(),
      interestRate: this.newLoanRate(),
      frequency: this.newLoanFreq(),
      amortizationMethod: this.newLoanMethod(),
      totalTerms: this.newLoanTerms(),
      gracePeriodDays: this.newLoanGrace(),
      startDate: this.newLoanStartDate(),
      guarantor
    });

    this.showNewLoanModal.set(false);

    if (createdLoan) {
      this.loanService.selectedLoanIdForContract.set(createdLoan.id);
      this.loanService.activeTab.set('contract');
    }
  }

  viewContract(loan: Loan) {
    this.loanService.selectedLoanIdForContract.set(loan.id);
    this.loanService.activeTab.set('contract');
  }

  viewSchedule(loan: Loan) {
    this.selectedLoanSchedule.set(loan);
  }

  getLoanStatusLabel(status: LoanStatus): string {
    switch (status) {
      case 'al_dia': return 'Al Día';
      case 'en_mora': return 'En Mora';
      case 'proximo_vencer': return 'Próximo a Vencer';
      case 'pagado': return 'Pagado';
      default: return status;
    }
  }

  getLoanStatusBadgeStyle(status: LoanStatus): string {
    switch (status) {
      case 'al_dia': return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      case 'en_mora': return 'bg-rose-100 text-rose-800 border border-rose-200';
      case 'proximo_vencer': return 'bg-amber-100 text-amber-800 border border-amber-200';
      case 'pagado': return 'bg-slate-100 text-slate-600 border border-slate-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  }

  getItemStatusStyle(status: string): string {
    switch (status) {
      case 'pagado': return 'bg-emerald-100 text-emerald-800';
      case 'vencido': return 'bg-rose-100 text-rose-800';
      case 'parcial': return 'bg-amber-100 text-amber-800';
      default: return 'bg-slate-100 text-slate-600';
    }
  }
}
