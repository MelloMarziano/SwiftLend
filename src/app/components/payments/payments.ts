import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoanService } from '../../services/loan.service';
import { PaymentRecord } from '../../models/loan.models';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/80 p-6 rounded-2xl shadow-xs">
        <div>
          <div class="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
            <span class="material-icons-outlined text-sm">receipt</span>
            Historial de Recaudación & Recibos
          </div>
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Registro de Pagos & Comprobantes</h1>
          <p class="text-slate-500 text-sm mt-1">Consulta abonos recibidos, filtra por método de pago y emite comprobantes oficiales.</p>
        </div>

        <div class="flex items-center gap-2 font-mono text-xs bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-700">
          <span>Recaudación Total:</span>
          <strong class="text-emerald-700 text-sm font-bold">{{ loanService.formatCurrency(loanService.totalCollected()) }}</strong>
        </div>
      </div>

      <!-- Search & Filter -->
      <div class="bg-white border border-slate-200/80 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
        <div class="relative w-full md:w-96">
          <span class="material-icons-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
          <input 
            type="text" 
            [value]="searchTerm()" 
            (input)="updateSearch($event)"
            placeholder="Buscar pago por cliente, código de préstamo o referencia..."
            class="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white"
          />
        </div>

        <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button 
            (click)="selectedMethodFilter.set('ALL')"
            [class]="selectedMethodFilter() === 'ALL' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'"
            class="px-3 py-1.5 text-xs font-semibold rounded-lg transition">
            Todos
          </button>
          <button 
            (click)="selectedMethodFilter.set('efectivo')"
            [class]="selectedMethodFilter() === 'efectivo' ? 'bg-emerald-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'"
            class="px-3 py-1.5 text-xs font-semibold rounded-lg transition">
            Efectivo
          </button>
          <button 
            (click)="selectedMethodFilter.set('transferencia')"
            [class]="selectedMethodFilter() === 'transferencia' ? 'bg-sky-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'"
            class="px-3 py-1.5 text-xs font-semibold rounded-lg transition">
            Transferencia
          </button>
        </div>
      </div>

      <!-- Payments Table -->
      <div class="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-700">
            <thead class="bg-slate-50 text-slate-500 uppercase font-mono border-b border-slate-200">
              <tr>
                <th class="p-4">ID Transacción</th>
                <th class="p-4">Cliente / Prestatario</th>
                <th class="p-4">Préstamo</th>
                <th class="p-4">Cuota #</th>
                <th class="p-4">Fecha Pago</th>
                <th class="p-4">Método</th>
                <th class="p-4 text-right">Monto Pagado</th>
                <th class="p-4 text-center">Comprobante</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-mono">
              @for (pay of filteredPayments(); track pay.id) {
                <tr class="hover:bg-slate-50/80 transition">
                  <td class="p-4 font-bold text-slate-500">{{ pay.id }}</td>
                  <td class="p-4 font-sans font-semibold text-slate-900">
                    {{ pay.clientName }}
                  </td>
                  <td class="p-4 font-bold text-emerald-700">
                    {{ pay.loanCode }}
                  </td>
                  <td class="p-4 font-bold">Cuota #{{ pay.installmentNo }}</td>
                  <td class="p-4 text-slate-600">{{ pay.paymentDate }}</td>
                  <td class="p-4">
                    <span class="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 uppercase text-[10px] font-bold">
                      {{ pay.paymentMethod }}
                    </span>
                    @if (pay.referenceNo) {
                      <span class="block text-[10px] text-slate-500 mt-0.5">Ref: {{ pay.referenceNo }}</span>
                    }
                  </td>
                  <td class="p-4 text-right font-bold text-slate-900 text-sm">
                    {{ loanService.formatCurrency(pay.amountPaid) }}
                  </td>
                  <td class="p-4 text-center">
                    <button 
                      (click)="openReceiptModal(pay)"
                      class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-sans font-semibold transition flex items-center gap-1 mx-auto">
                      <span class="material-icons-outlined text-sm text-emerald-600">receipt</span>
                      Ver Recibo
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="8" class="p-8 text-center text-slate-400 font-sans">
                    No se registran transacciones de pago con los filtros seleccionados.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Printable Receipt Modal -->
      @if (activeReceipt()) {
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div class="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3 no-print">
              <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
                <span class="material-icons-outlined text-emerald-600">receipt_long</span>
                Comprobante Oficial de Pago
              </h3>
              <button (click)="activeReceipt.set(null)" class="text-slate-400 hover:text-slate-700">
                <span class="material-icons-outlined">close</span>
              </button>
            </div>

            <!-- Receipt Document -->
            <div class="printable-area bg-white text-slate-900 p-6 rounded-xl border border-slate-300 font-mono text-xs space-y-4">
              <div class="text-center border-b border-slate-300 pb-3 space-y-1">
                <div class="font-sans font-extrabold text-base tracking-tight text-slate-900">SwiftLend FINANCIAL SYSTEMS</div>
                <div class="text-[10px] text-slate-500 font-sans">SISTEMA INTELIGENTE DE CRÉDITOS SwiftALGO</div>
                <div class="font-bold text-xs pt-1">COMPROBANTE DE PAGO NO. {{ activeReceipt()?.id }}</div>
              </div>

              <div class="space-y-1.5 text-[11px]">
                <div class="flex justify-between">
                  <span class="text-slate-500">FECHA Y HORA:</span>
                  <strong>{{ activeReceipt()?.paymentDate }}</strong>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">PRESTATARIO:</span>
                  <strong>{{ activeReceipt()?.clientName }}</strong>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">CONTRATO:</span>
                  <strong>{{ activeReceipt()?.loanCode }}</strong>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">CUOTA ABONADA:</span>
                  <strong>#{{ activeReceipt()?.installmentNo }}</strong>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">MÉTODO PAGO:</span>
                  <strong class="uppercase">{{ activeReceipt()?.paymentMethod }}</strong>
                </div>
                @if (activeReceipt()?.referenceNo) {
                  <div class="flex justify-between">
                    <span class="text-slate-500">REFERENCIA:</span>
                    <strong>{{ activeReceipt()?.referenceNo }}</strong>
                  </div>
                }
              </div>

              <div class="border-t border-b border-slate-300 py-3 my-2 flex justify-between items-center text-sm">
                <span class="font-bold">TOTAL RECIBIDO:</span>
                <span class="font-extrabold text-base text-emerald-800">{{ loanService.formatCurrency(activeReceipt()!.amountPaid) }}</span>
              </div>

              <div class="text-[10px] text-slate-500 text-center font-sans space-y-1 pt-2">
                <div>Gracias por mantener su crédito al día.</div>
                <div>SwiftLend — Soluciones Financieras Rápidas.</div>
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 no-print">
              <button (click)="activeReceipt.set(null)" class="px-4 py-2 text-slate-500 hover:text-slate-800 text-xs font-medium">
                Cerrar
              </button>
              <button (click)="printReceipt()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-xs">
                <span class="material-icons-outlined text-sm">print</span>
                Imprimir Recibo
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class PaymentsComponent {
  loanService = inject(LoanService);

  readonly searchTerm = signal<string>('');
  readonly selectedMethodFilter = signal<'ALL' | 'efectivo' | 'transferencia' | 'tarjeta' | 'cheque'>('ALL');
  readonly activeReceipt = signal<PaymentRecord | null>(null);

  readonly filteredPayments = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const method = this.selectedMethodFilter();

    return this.loanService.payments().filter(pay => {
      const matchesSearch = 
        pay.clientName.toLowerCase().includes(term) ||
        pay.loanCode.toLowerCase().includes(term) ||
        (pay.referenceNo && pay.referenceNo.toLowerCase().includes(term));

      const matchesMethod = method === 'ALL' || pay.paymentMethod === method;

      return matchesSearch && matchesMethod;
    });
  });

  updateSearch(e: Event) {
    this.searchTerm.set((e.target as HTMLInputElement).value);
  }

  openReceiptModal(pay: PaymentRecord) {
    this.activeReceipt.set(pay);
  }

  printReceipt() {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }
}
