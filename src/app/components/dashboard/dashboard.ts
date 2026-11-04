import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoanService } from '../../services/loan.service';
import { Loan, AmortizationItem } from '../../models/loan.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- Top Title & Quick Action Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/80 p-6 rounded-2xl shadow-xs">
        <div>
          <div class="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
            <span class="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            Panel de Control SwiftALGO Engine
          </div>
          <h1 class="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Resumen Financiero de Préstamos
          </h1>
          <p class="text-slate-500 text-sm mt-1">
            Visualiza en tiempo real la cartera activa, cobros proyectados y tasa de morosidad.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <button 
            (click)="loanService.activeTab.set('calculator')"
            class="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition flex items-center gap-2 border border-slate-200">
            <span class="material-icons-outlined text-lg text-emerald-600">calculate</span>
            Calculadora & Tabla
          </button>
          
          <button 
            (click)="loanService.activeTab.set('loans')"
            class="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-xs transition flex items-center gap-2">
            <span class="material-icons-outlined text-lg">add_circle_outline</span>
            Nuevo Préstamo
          </button>
        </div>
      </div>

      <!-- KPI Summary Cards Strip -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Card 1: Capital Invertido -->
        <div class="bg-white border border-slate-200/80 p-5 rounded-2xl space-y-2 shadow-xs">
          <div class="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Capital Total Prestado</span>
            <span class="material-icons-outlined text-emerald-600">account_balance_wallet</span>
          </div>
          <div class="text-2xl font-bold font-mono text-slate-900">
            {{ loanService.formatCurrency(loanService.totalCapitalInvested()) }}
          </div>
          <div class="flex items-center gap-2 text-xs text-slate-500">
            <span class="text-emerald-700 font-bold">{{ loanService.loans().length }} contratos</span>
            <span>· Cartera Histórica</span>
          </div>
        </div>

        <!-- Card 2: Capital en Calle / Activo -->
        <div class="bg-white border border-slate-200/80 p-5 rounded-2xl space-y-2 shadow-xs">
          <div class="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Capital Activo en Calle</span>
            <span class="material-icons-outlined text-sky-600">trending_up</span>
          </div>
          <div class="text-2xl font-bold font-mono text-sky-700">
            {{ loanService.formatCurrency(loanService.totalActiveCapital()) }}
          </div>
          <div class="flex items-center gap-2 text-xs text-slate-500">
            <span class="text-sky-700 font-bold">{{ loanService.activeLoansCount() }} activos</span>
            <span>· Saldo pendiente</span>
          </div>
        </div>

        <!-- Card 3: Interés Esperado -->
        <div class="bg-white border border-slate-200/80 p-5 rounded-2xl space-y-2 shadow-xs">
          <div class="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Rendimiento Estimado</span>
            <span class="material-icons-outlined text-indigo-600">monetization_on</span>
          </div>
          <div class="text-2xl font-bold font-mono text-indigo-700">
            {{ loanService.formatCurrency(loanService.totalInterestExpected()) }}
          </div>
          <div class="flex items-center gap-2 text-xs text-slate-500">
            <span class="text-indigo-700 font-bold">Total recaudado: {{ loanService.formatCurrency(loanService.totalCollected()) }}</span>
          </div>
        </div>

        <!-- Card 4: Morosidad PAR-30 -->
        <div class="bg-white border border-slate-200/80 p-5 rounded-2xl space-y-2 shadow-xs">
          <div class="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Índice Morosidad (PAR-15+)</span>
            <span class="material-icons-outlined text-rose-600">warning_amber</span>
          </div>
          <div class="text-2xl font-bold font-mono text-rose-600 flex items-center justify-between">
            <span>{{ loanService.portfolioAtRisk30Pct() }}%</span>
            <span class="text-xs bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-lg font-sans font-semibold">
              {{ loanService.overdueCount() }} en mora
            </span>
          </div>
          <div class="flex items-center justify-between text-xs text-slate-500">
            <span class="text-rose-700 font-medium">Recargos: {{ loanService.formatCurrency(loanService.totalAccruedFines()) }}</span>
            <button (click)="loanService.activeTab.set('delinquency')" class="text-xs text-rose-600 font-semibold underline hover:text-rose-800">Ver Mora</button>
          </div>
        </div>
      </div>

      <!-- Frequency Breakdown & Quick Stats Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Frequencies Overview -->
        <div class="bg-white border border-slate-200/80 p-6 rounded-2xl space-y-4 shadow-xs">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 class="font-bold text-slate-900 text-base flex items-center gap-2">
              <span class="material-icons-outlined text-emerald-600">tune</span>
              Distribución por Frecuencia
            </h3>
            <span class="text-xs text-slate-400 font-mono font-medium">Variables</span>
          </div>

          <div class="space-y-3">
            <!-- Diario -->
            <div class="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs border border-emerald-200">
                  DI
                </div>
                <div>
                  <div class="text-sm font-bold text-slate-800">Diarios (Cobro Diario)</div>
                  <div class="text-xs text-slate-500 font-mono">Alta rotación de liquidez</div>
                </div>
              </div>
              <div class="text-right">
                <div class="text-sm font-bold font-mono text-slate-900">{{ getLoansCountByFrequency('diario') }} préstamos</div>
                <div class="text-xs text-emerald-700 font-mono font-semibold">{{ loanService.formatCurrency(getCapitalByFrequency('diario')) }}</div>
              </div>
            </div>

            <!-- Semanal -->
            <div class="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-xs border border-sky-200">
                  SEM
                </div>
                <div>
                  <div class="text-sm font-bold text-slate-800">Semanales</div>
                  <div class="text-xs text-slate-500 font-mono">Comercios e independientes</div>
                </div>
              </div>
              <div class="text-right">
                <div class="text-sm font-bold font-mono text-slate-900">{{ getLoansCountByFrequency('semanal') }} préstamos</div>
                <div class="text-xs text-sky-700 font-mono font-semibold">{{ loanService.formatCurrency(getCapitalByFrequency('semanal')) }}</div>
              </div>
            </div>

            <!-- Quincenal -->
            <div class="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-xs border border-indigo-200">
                  QUI
                </div>
                <div>
                  <div class="text-sm font-bold text-slate-800">Quincenales</div>
                  <div class="text-xs text-slate-500 font-mono">Empleados y asalariados</div>
                </div>
              </div>
              <div class="text-right">
                <div class="text-sm font-bold font-mono text-slate-900">{{ getLoansCountByFrequency('quincenal') }} préstamos</div>
                <div class="text-xs text-indigo-700 font-mono font-semibold">{{ loanService.formatCurrency(getCapitalByFrequency('quincenal')) }}</div>
              </div>
            </div>

            <!-- Mensual -->
            <div class="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-xs border border-purple-200">
                  MEN
                </div>
                <div>
                  <div class="text-sm font-bold text-slate-800">Mensuales</div>
                  <div class="text-xs text-slate-500 font-mono">Créditos de mayor volumen</div>
                </div>
              </div>
              <div class="text-right">
                <div class="text-sm font-bold font-mono text-slate-900">{{ getLoansCountByFrequency('mensual') }} préstamos</div>
                <div class="text-xs text-purple-700 font-mono font-semibold">{{ loanService.formatCurrency(getCapitalByFrequency('mensual')) }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Next Upcoming Collections List -->
        <div class="lg:col-span-2 bg-white border border-slate-200/80 p-6 rounded-2xl space-y-4 shadow-xs">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 class="font-bold text-slate-900 text-base flex items-center gap-2">
                <span class="material-icons-outlined text-emerald-600">event_upcoming</span>
                Próximos Vencimientos y Agenda de Cobro
              </h3>
              <p class="text-xs text-slate-500">Cuotas pendientes priorizadas por fecha límite</p>
            </div>
            <button 
              (click)="loanService.activeTab.set('payments')"
              class="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1">
              Ver Pagos <span class="material-icons-outlined text-sm">arrow_forward</span>
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-slate-700">
              <thead class="bg-slate-50 text-slate-500 uppercase font-mono border-b border-slate-200">
                <tr>
                  <th class="p-3">Cliente</th>
                  <th class="p-3">Préstamo</th>
                  <th class="p-3">Cuota #</th>
                  <th class="p-3">Vencimiento</th>
                  <th class="p-3 text-right">Monto</th>
                  <th class="p-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (item of loanService.nextUpcomingCollection(); track item.installment.installmentNo + item.loan.id) {
                  <tr class="hover:bg-slate-50/80 transition">
                    <td class="p-3 font-semibold text-slate-900">
                      <div>{{ item.loan.clientName }}</div>
                      <div class="text-[11px] text-slate-500 font-mono">{{ item.loan.clientPhone }}</div>
                    </td>
                    <td class="p-3 font-mono font-bold text-emerald-700">
                      {{ item.loan.code }}
                      <span class="block text-[10px] text-slate-500 uppercase font-normal">{{ item.loan.frequency }}</span>
                    </td>
                    <td class="p-3 font-mono font-bold">#{{ item.installment.installmentNo }} / {{ item.loan.totalTerms }}</td>
                    <td class="p-3 font-mono">
                      <span [class]="getDueDateStyle(item.installment.dueDate, item.installment.status)">
                        {{ item.installment.dueDate }}
                      </span>
                    </td>
                    <td class="p-3 text-right font-mono font-bold text-slate-900">
                      {{ loanService.formatCurrency(item.installment.paymentAmount + item.installment.lateFee) }}
                      @if (item.installment.lateFee > 0) {
                        <span class="block text-[10px] text-rose-600">+{{ loanService.formatCurrency(item.installment.lateFee) }} mora</span>
                      }
                    </td>
                    <td class="p-3 text-center">
                      <div class="flex items-center justify-center gap-2">
                        <button 
                          (click)="openPaymentModal(item.loan, item.installment)"
                          class="px-2.5 py-1 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-semibold transition shadow-2xs">
                          Cobrar
                        </button>
                        <a 
                          [href]="getWhatsAppLink(item.loan, item.installment)" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          class="p-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg border border-emerald-200 flex items-center justify-center"
                          title="Enviar aviso por WhatsApp">
                          <span class="material-icons-outlined text-base">chat</span>
                        </a>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="p-6 text-center text-slate-400">
                      No hay cuotas pendientes para mostrar.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Quick Modal for Payment Registration -->
      @if (activePaymentModalLoan()) {
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div class="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 class="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span class="material-icons-outlined text-emerald-600">payments</span>
                Registrar Cobro de Cuota
              </h3>
              <button (click)="activePaymentModalLoan.set(null)" class="text-slate-400 hover:text-slate-700">
                <span class="material-icons-outlined">close</span>
              </button>
            </div>

            <div class="space-y-3 text-sm text-slate-700">
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <div class="text-xs text-slate-500 uppercase tracking-wider font-mono font-bold">Detalle del Crédito</div>
                <div class="font-bold text-slate-900">{{ activePaymentModalLoan()?.clientName }}</div>
                <div class="text-xs font-mono text-emerald-700 font-semibold">Préstamo: {{ activePaymentModalLoan()?.code }} · Cuota #{{ activePaymentModalInstallment()?.installmentNo }}</div>
                <div class="text-xs text-slate-500 font-mono">Vencimiento: {{ activePaymentModalInstallment()?.dueDate }}</div>
              </div>

              <div class="space-y-1">
                <span class="block text-xs font-semibold text-slate-700">Monto A Cobrar ({{ loanService.selectedCurrency().code }})</span>
                <input 
                  type="number" 
                  [value]="activePaymentAmount()" 
                  (input)="updatePaymentAmount($event)"
                  class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <div class="space-y-1">
                <span class="block text-xs font-semibold text-slate-700">Método de Pago</span>
                <select 
                  [value]="activePaymentMethod()" 
                  (change)="updatePaymentMethod($event)"
                  class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white text-sm">
                  <option value="efectivo">Efectivo (Cobro en Mano)</option>
                  <option value="transferencia">Transferencia Bancaria</option>
                  <option value="tarjeta">Tarjeta de Débito/Crédito</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div class="space-y-1">
                <span class="block text-xs font-semibold text-slate-700">Número de Referencia / Comprobante (Opcional)</span>
                <input 
                  type="text" 
                  [value]="activePaymentRef()" 
                  (input)="updatePaymentRef($event)"
                  placeholder="Ej: TRF-991823"
                  class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 font-mono text-xs focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button 
                (click)="activePaymentModalLoan.set(null)" 
                class="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-medium">
                Cancelar
              </button>
              <button 
                (click)="confirmPayment()" 
                class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition flex items-center gap-2">
                <span class="material-icons-outlined text-sm">check_circle</span>
                Confirmar Pago
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class DashboardComponent {
  loanService = inject(LoanService);

  readonly activePaymentModalLoan = signal<Loan | null>(null);
  readonly activePaymentModalInstallment = signal<AmortizationItem | null>(null);
  readonly activePaymentAmount = signal<number>(0);
  readonly activePaymentMethod = signal<'efectivo' | 'transferencia' | 'tarjeta' | 'cheque'>('efectivo');
  readonly activePaymentRef = signal<string>('');

  getLoansCountByFrequency(freq: string): number {
    return this.loanService.loans().filter(l => l.frequency === freq).length;
  }

  getCapitalByFrequency(freq: string): number {
    return this.loanService.loans()
      .filter(l => l.frequency === freq)
      .reduce((sum, l) => sum + l.principalAmount, 0);
  }

  getDueDateStyle(dateStr: string, status: string): string {
    if (status === 'vencido') {
      return 'text-rose-700 font-bold bg-rose-100 px-2 py-0.5 rounded border border-rose-200';
    }
    const todayStr = new Date().toISOString().split('T')[0];
    if (dateStr === todayStr) {
      return 'text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded border border-amber-200';
    }
    return 'text-slate-700';
  }

  openPaymentModal(loan: Loan, installment: AmortizationItem) {
    this.activePaymentModalLoan.set(loan);
    this.activePaymentModalInstallment.set(installment);
    this.activePaymentAmount.set(installment.paymentAmount + installment.lateFee);
    this.activePaymentMethod.set('efectivo');
    this.activePaymentRef.set('');
  }

  updatePaymentAmount(event: Event) {
    const val = parseFloat((event.target as HTMLInputElement).value) || 0;
    this.activePaymentAmount.set(val);
  }

  updatePaymentMethod(event: Event) {
    const val = (event.target as HTMLSelectElement).value as 'efectivo' | 'transferencia' | 'tarjeta' | 'cheque';
    this.activePaymentMethod.set(val);
  }

  updatePaymentRef(event: Event) {
    this.activePaymentRef.set((event.target as HTMLInputElement).value);
  }

  getWhatsAppLink(loan: Loan, inst: AmortizationItem): string {
    const phoneClean = loan.clientPhone.replace(/[^0-9]/g, '');
    const amountStr = this.loanService.formatCurrency(inst.paymentAmount + inst.lateFee);
    const msg = `Hola ${loan.clientName}, le saludamos de SwiftLend. Le recordamos que su cuota #${inst.installmentNo} del préstamo ${loan.code} por ${amountStr} tiene fecha de vencimiento ${inst.dueDate}. Quedamos a su orden para recibir su pago. ¡Gracias!`;
    return `https://wa.me/${phoneClean}?text=${encodeURIComponent(msg)}`;
  }

  confirmPayment() {
    const loan = this.activePaymentModalLoan();
    const inst = this.activePaymentModalInstallment();
    if (!loan || !inst) return;

    this.loanService.recordPayment({
      loanId: loan.id,
      installmentNo: inst.installmentNo,
      amountPaid: this.activePaymentAmount(),
      paymentMethod: this.activePaymentMethod(),
      referenceNo: this.activePaymentRef(),
      notes: 'Cobro registrado desde el Dashboard'
    });

    this.activePaymentModalLoan.set(null);
  }
}
