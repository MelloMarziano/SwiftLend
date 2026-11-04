import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoanService } from '../../services/loan.service';
import { LoanFrequency, AmortizationMethod } from '../../models/loan.models';

@Component({
  selector: 'app-calculator',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/80 p-6 rounded-2xl shadow-xs">
        <div>
          <div class="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
            <span class="material-icons-outlined text-sm">calculate</span>
            Simulador Algorítmico SwiftALGO
          </div>
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Calculadora de Préstamos & Amortización Variable</h1>
          <p class="text-slate-500 text-sm mt-1">
            Calcula cuotas exactas con frecuencias diarias, semanales, quincenales y mensuales.
          </p>
        </div>

        <button 
          (click)="exportToCSV()"
          class="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold border border-slate-200 transition flex items-center gap-2 self-start md:self-auto">
          <span class="material-icons-outlined text-lg text-emerald-600">download</span>
          Exportar Tabla (CSV)
        </button>
      </div>

      <!-- Main Grid: Controls vs Summary -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Input Parameters Form (5 Cols) -->
        <div class="lg:col-span-5 bg-white border border-slate-200/80 p-6 rounded-2xl space-y-5 shadow-xs">
          <h3 class="font-bold text-slate-900 text-base border-b border-slate-100 pb-3 flex items-center gap-2">
            <span class="material-icons-outlined text-emerald-600">tune</span>
            Parámetros del Crédito
          </h3>

          <!-- Capital Solicitado -->
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs font-semibold">
              <span class="text-slate-700">Capital a Prestar</span>
              <span class="text-emerald-700 font-mono font-bold text-base">{{ loanService.formatCurrency(amount()) }}</span>
            </div>
            <input 
              type="number" 
              [value]="amount()" 
              (input)="updateAmount($event)"
              min="100" 
              step="500"
              class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 font-mono font-bold text-base focus:outline-none focus:border-emerald-600 focus:bg-white"
            />
            <input 
              type="range" 
              [value]="amount()" 
              (input)="updateAmount($event)"
              min="500" 
              max="50000" 
              step="500"
              class="w-full accent-emerald-600 cursor-pointer"
            />
          </div>

          <!-- Tasa de Interés (%) -->
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs font-semibold">
              <span class="text-slate-700">Tasa de Interés (por periodo)</span>
              <span class="text-sky-700 font-mono font-bold text-sm">{{ rate() }}%</span>
            </div>
            <div class="flex items-center gap-2">
              <input 
                type="number" 
                [value]="rate()" 
                (input)="updateRate($event)"
                min="0.1" 
                step="0.5"
                class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-slate-900 font-mono font-bold text-sm focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
              <span class="text-xs text-slate-500 font-mono">% / periodo</span>
            </div>
          </div>

          <!-- Frecuencia de Pago Variable -->
          <div class="space-y-2">
            <span class="block text-xs font-semibold text-slate-700">Frecuencia de Pago (Variable)</span>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button 
                (click)="frequency.set('diario')"
                [class]="frequency() === 'diario' ? 'bg-emerald-600 text-white shadow-2xs font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'"
                class="p-2.5 rounded-xl text-xs transition text-center font-medium">
                Diario
              </button>
              <button 
                (click)="frequency.set('semanal')"
                [class]="frequency() === 'semanal' ? 'bg-sky-600 text-white shadow-2xs font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'"
                class="p-2.5 rounded-xl text-xs transition text-center font-medium">
                Semanal
              </button>
              <button 
                (click)="frequency.set('quincenal')"
                [class]="frequency() === 'quincenal' ? 'bg-indigo-600 text-white shadow-2xs font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'"
                class="p-2.5 rounded-xl text-xs transition text-center font-medium">
                Quincenal
              </button>
              <button 
                (click)="frequency.set('mensual')"
                [class]="frequency() === 'mensual' ? 'bg-purple-600 text-white shadow-2xs font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'"
                class="p-2.5 rounded-xl text-xs transition text-center font-medium">
                Mensual
              </button>
            </div>
          </div>

          <!-- Sistema de Amortización -->
          <div class="space-y-2">
            <span class="block text-xs font-semibold text-slate-700">Sistema de Amortización</span>
            <select 
              [value]="method()" 
              (change)="method.set($any($event.target).value)"
              class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white">
              <option value="cuota_fija">Cuota Nivelada (Sistema Francés - Cuotas Iguales)</option>
              <option value="interes_simple">Interés Simple (Capital Constante + Interés Fijo)</option>
              <option value="sistema_aleman">Sistema Alemán (Amortización Principal Constante)</option>
            </select>
          </div>

          <!-- Plazo en Cuotas -->
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
              <span class="block text-xs font-semibold text-slate-700">Número de Cuotas</span>
              <input 
                type="number" 
                [value]="terms()" 
                (input)="updateTerms($event)"
                min="1" 
                max="360"
                class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-slate-900 font-mono font-bold text-sm focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
            </div>

            <div class="space-y-1">
              <span class="block text-xs font-semibold text-slate-700">Días de Gracia</span>
              <input 
                type="number" 
                [value]="graceDays()" 
                (input)="updateGraceDays($event)"
                min="0" 
                max="30"
                class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-slate-900 font-mono text-sm focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
            </div>
          </div>

          <!-- Fecha de Inicio -->
          <div class="space-y-1">
            <span class="block text-xs font-semibold text-slate-700">Fecha de Desembolso / Inicio</span>
            <input 
              type="date" 
              [value]="startDate()" 
              (input)="startDate.set($any($event.target).value)"
              class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-slate-900 font-mono text-sm focus:outline-none focus:border-emerald-600 focus:bg-white"
            />
          </div>
        </div>

        <!-- Calculation Results Cards (7 Cols) -->
        <div class="lg:col-span-7 space-y-6">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <!-- Cuota por Periodo -->
            <div class="bg-white border border-slate-200/80 p-5 rounded-2xl space-y-1 shadow-xs">
              <span class="text-xs text-slate-500 font-semibold block">Cuota por Periodo</span>
              <div class="text-2xl font-extrabold font-mono text-emerald-700">
                {{ loanService.formatCurrency(calculationResult().installmentAmount) }}
              </div>
              <span class="text-[11px] text-slate-500 block uppercase font-mono">Frecuencia {{ frequency() }}</span>
            </div>

            <!-- Interés Total -->
            <div class="bg-white border border-slate-200/80 p-5 rounded-2xl space-y-1 shadow-xs">
              <span class="text-xs text-slate-500 font-semibold block">Interés Total Ganado</span>
              <div class="text-2xl font-extrabold font-mono text-sky-700">
                {{ loanService.formatCurrency(calculationResult().totalInterest) }}
              </div>
              <span class="text-[11px] text-slate-500 block">Rendimiento estimado</span>
            </div>

            <!-- Total a Cobrar -->
            <div class="bg-white border border-slate-200/80 p-5 rounded-2xl space-y-1 shadow-xs">
              <span class="text-xs text-slate-500 font-semibold block">Monto Total a Cobrar</span>
              <div class="text-2xl font-extrabold font-mono text-indigo-700">
                {{ loanService.formatCurrency(calculationResult().totalPayable) }}
              </div>
              <span class="text-[11px] text-slate-500 block font-mono">Capital + Intereses</span>
            </div>
          </div>

          <!-- Convert to Real Loan Action Card -->
          <div class="bg-gradient-to-r from-emerald-50 via-white to-white border border-emerald-200 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div>
              <div class="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span class="material-icons-outlined text-emerald-600">verified</span>
                ¿Deseas emitir un préstamo con esta simulación?
              </div>
              <p class="text-xs text-slate-500 mt-0.5">Asigna esta amortización a un cliente registrado y genera su contrato automáticamente.</p>
            </div>

            <button 
              (click)="proceedToCreateLoan()"
              class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition flex items-center gap-2 shrink-0">
              <span class="material-icons-outlined text-base">task_alt</span>
              Aprobar y Crear Préstamo
            </button>
          </div>

          <!-- Tabla de Amortización Completa -->
          <div class="bg-white border border-slate-200/80 p-6 rounded-2xl space-y-4 shadow-xs">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 class="font-bold text-slate-900 text-base flex items-center gap-2">
                <span class="material-icons-outlined text-sky-600">table_chart</span>
                Tabla de Amortización Proyectada
              </h3>
              <span class="text-xs text-slate-500 font-mono font-medium">{{ calculationResult().schedule.length }} periodos</span>
            </div>

            <div class="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table class="w-full text-left text-xs text-slate-700">
                <thead class="bg-slate-50 text-slate-500 uppercase font-mono border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th class="p-3"># Cuota</th>
                    <th class="p-3">Fecha Vencimiento</th>
                    <th class="p-3 text-right">Cuota Total</th>
                    <th class="p-3 text-right">Abono Capital</th>
                    <th class="p-3 text-right">Interés</th>
                    <th class="p-3 text-right">Saldo Pendiente</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-mono">
                  @for (item of calculationResult().schedule; track item.installmentNo) {
                    <tr class="hover:bg-slate-50/80 transition">
                      <td class="p-3 font-bold text-emerald-700">#{{ item.installmentNo }}</td>
                      <td class="p-3 text-slate-700">{{ item.dueDate }}</td>
                      <td class="p-3 text-right font-bold text-slate-900">{{ loanService.formatCurrency(item.paymentAmount) }}</td>
                      <td class="p-3 text-right text-emerald-700 font-semibold">{{ loanService.formatCurrency(item.principalPortion) }}</td>
                      <td class="p-3 text-right text-sky-700 font-semibold">{{ loanService.formatCurrency(item.interestPortion) }}</td>
                      <td class="p-3 text-right text-slate-600 font-bold">{{ loanService.formatCurrency(item.remainingBalance) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class CalculatorComponent {
  loanService = inject(LoanService);

  readonly amount = signal<number>(5000);
  readonly rate = signal<number>(3.0);
  readonly frequency = signal<LoanFrequency>('semanal');
  readonly method = signal<AmortizationMethod>('cuota_fija');
  readonly terms = signal<number>(12);
  readonly graceDays = signal<number>(0);
  readonly startDate = signal<string>(new Date().toISOString().split('T')[0]);

  readonly calculationResult = computed(() => {
    return this.loanService.calculateAmortization(
      this.amount(),
      this.rate(),
      this.frequency(),
      this.method(),
      this.terms(),
      this.startDate(),
      this.graceDays()
    );
  });

  updateAmount(e: Event) {
    const val = parseFloat((e.target as HTMLInputElement).value) || 0;
    this.amount.set(val);
  }

  updateRate(e: Event) {
    const val = parseFloat((e.target as HTMLInputElement).value) || 0;
    this.rate.set(val);
  }

  updateTerms(e: Event) {
    const val = parseInt((e.target as HTMLInputElement).value, 10) || 1;
    this.terms.set(val);
  }

  updateGraceDays(e: Event) {
    const val = parseInt((e.target as HTMLInputElement).value, 10) || 0;
    this.graceDays.set(val);
  }

  proceedToCreateLoan() {
    this.loanService.activeTab.set('loans');
  }

  exportToCSV() {
    const calc = this.calculationResult();
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Cuota,Fecha Vencimiento,Cuota Total,Abono Capital,Interes,Saldo Pendiente\n';

    calc.schedule.forEach(row => {
      csvContent += `${row.installmentNo},${row.dueDate},${row.paymentAmount},${row.principalPortion},${row.interestPortion},${row.remainingBalance}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tabla_amortizacion_${this.amount()}_${this.frequency()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
