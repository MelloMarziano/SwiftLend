import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoanService } from '../../services/loan.service';
import { Loan, AmortizationItem } from '../../models/loan.models';

export interface OverdueReportRow {
  loan: Loan;
  installment: AmortizationItem;
  lateDays: number;
  calculatedFine: number;
  totalDue: number;
  bucket: 'PAR_1_15' | 'PAR_16_30' | 'PAR_31_60' | 'PAR_60_PLUS';
}

@Component({
  selector: 'app-delinquency',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/80 p-6 rounded-2xl shadow-xs">
        <div>
          <div class="flex items-center gap-2 text-xs font-bold text-rose-700 uppercase tracking-wider mb-1">
            <span class="material-icons-outlined text-sm">warning</span>
            Módulo de Gestión de Cobranza & Morosidad
          </div>
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Reporte Detallado de Morosidad en Tiempo Real</h1>
          <p class="text-slate-500 text-sm mt-1">Monitorea créditos en mora, recargos acumulados y gestiona cobranzas por WhatsApp o notificaciones legales.</p>
        </div>

        <div class="flex items-center gap-3">
          <button 
            (click)="exportMorosidadReport()"
            class="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold border border-slate-200 transition flex items-center gap-2">
            <span class="material-icons-outlined text-lg text-emerald-600">download</span>
            Exportar Reporte
          </button>
        </div>
      </div>

      <!-- PAR Buckets Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
        <!-- PAR 1-15 -->
        <button 
          type="button"
          (click)="selectedBucketFilter.set('PAR_1_15')"
          [class]="selectedBucketFilter() === 'PAR_1_15' ? 'border-amber-500 bg-amber-50 shadow-xs' : 'border-slate-200/80 bg-white shadow-xs'"
          class="p-5 rounded-2xl border transition cursor-pointer space-y-2 w-full text-left">
          <div class="flex items-center justify-between text-xs font-bold text-amber-800">
            <span>PAR 1 - 15 Días</span>
            <span class="material-icons-outlined text-base">notifications_active</span>
          </div>
          <div class="text-2xl font-bold font-mono text-slate-900">
            {{ loanService.formatCurrency(getBucketCapital('PAR_1_15')) }}
          </div>
          <div class="text-xs text-slate-500 font-medium">
            {{ getBucketCount('PAR_1_15') }} cuotas · <span class="text-amber-700 font-bold">Cobranza Preventiva</span>
          </div>
        </button>

        <!-- PAR 16-30 -->
        <button 
          type="button"
          (click)="selectedBucketFilter.set('PAR_16_30')"
          [class]="selectedBucketFilter() === 'PAR_16_30' ? 'border-orange-500 bg-orange-50 shadow-xs' : 'border-slate-200/80 bg-white shadow-xs'"
          class="p-5 rounded-2xl border transition cursor-pointer space-y-2 w-full text-left">
          <div class="flex items-center justify-between text-xs font-bold text-orange-800">
            <span>PAR 16 - 30 Días</span>
            <span class="material-icons-outlined text-base">error_outline</span>
          </div>
          <div class="text-2xl font-bold font-mono text-slate-900">
            {{ loanService.formatCurrency(getBucketCapital('PAR_16_30')) }}
          </div>
          <div class="text-xs text-slate-500 font-medium">
            {{ getBucketCount('PAR_16_30') }} cuotas · <span class="text-orange-700 font-bold">Cobranza Temprana</span>
          </div>
        </button>

        <!-- PAR 31-60 -->
        <button 
          type="button"
          (click)="selectedBucketFilter.set('PAR_31_60')"
          [class]="selectedBucketFilter() === 'PAR_31_60' ? 'border-rose-500 bg-rose-50 shadow-xs' : 'border-slate-200/80 bg-white shadow-xs'"
          class="p-5 rounded-2xl border transition cursor-pointer space-y-2 w-full text-left">
          <div class="flex items-center justify-between text-xs font-bold text-rose-800">
            <span>PAR 31 - 60 Días</span>
            <span class="material-icons-outlined text-base">gavel</span>
          </div>
          <div class="text-2xl font-bold font-mono text-slate-900">
            {{ loanService.formatCurrency(getBucketCapital('PAR_31_60')) }}
          </div>
          <div class="text-xs text-slate-500 font-medium">
            {{ getBucketCount('PAR_31_60') }} cuotas · <span class="text-rose-700 font-bold">Cobranza Extrajudicial</span>
          </div>
        </button>

        <!-- PAR 60+ -->
        <button 
          type="button"
          (click)="selectedBucketFilter.set('PAR_60_PLUS')"
          [class]="selectedBucketFilter() === 'PAR_60_PLUS' ? 'border-purple-500 bg-purple-50 shadow-xs' : 'border-slate-200/80 bg-white shadow-xs'"
          class="p-5 rounded-2xl border transition cursor-pointer space-y-2 w-full text-left">
          <div class="flex items-center justify-between text-xs font-bold text-purple-800">
            <span>PAR > 60 Días</span>
            <span class="material-icons-outlined text-base">report_problem</span>
          </div>
          <div class="text-2xl font-bold font-mono text-slate-900">
            {{ loanService.formatCurrency(getBucketCapital('PAR_60_PLUS')) }}
          </div>
          <div class="text-xs text-slate-500 font-medium">
            {{ getBucketCount('PAR_60_PLUS') }} cuotas · <span class="text-purple-700 font-bold">Riesgo Crítico</span>
          </div>
        </button>
      </div>

      <!-- Filter Controls & Reset -->
      <div class="flex items-center justify-between gap-4 bg-white border border-slate-200/80 p-4 rounded-2xl shadow-xs">
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold text-slate-500">Filtro de Tramo:</span>
          <span class="px-3 py-1 rounded-lg bg-slate-100 text-xs font-mono font-bold text-slate-800 border border-slate-200">
            {{ selectedBucketFilter() === 'ALL' ? 'Todos los Tramos' : selectedBucketFilter() }}
          </span>
          @if (selectedBucketFilter() !== 'ALL') {
            <button (click)="selectedBucketFilter.set('ALL')" class="text-xs text-rose-600 font-bold hover:underline">Ver Todos</button>
          }
        </div>

        <div class="text-xs text-slate-500 font-mono">
          Total Mora Registrada: <strong class="text-rose-700">{{ overdueRows().length }} cuotas acumuladas</strong>
        </div>
      </div>

      <!-- Overdue Debtors Table -->
      <div class="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-700">
            <thead class="bg-slate-50 text-slate-500 uppercase font-mono border-b border-slate-200">
              <tr>
                <th class="p-4">Deudor / Cliente</th>
                <th class="p-4">Préstamo</th>
                <th class="p-4">Días de Atraso</th>
                <th class="p-4 text-right">Cuota Original</th>
                <th class="p-4 text-right">Recargo Mora</th>
                <th class="p-4 text-right">Deuda Total</th>
                <th class="p-4 text-center">Acciones de Cobranza</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (row of filteredRows(); track row.loan.id + row.installment.installmentNo) {
                <tr class="hover:bg-slate-50/80 transition">
                  <td class="p-4 font-semibold text-slate-900">
                    <div>{{ row.loan.clientName }}</div>
                    <div class="text-[11px] text-slate-500 font-mono">{{ row.loan.clientPhone }}</div>
                    <span [class]="getRiskBadgeStyle(row.loan.clientRiskTier)" class="text-[9px] px-1.5 py-0.5 rounded uppercase font-bold mt-1 inline-block">
                      Riesgo {{ row.loan.clientRiskTier }}
                    </span>
                  </td>

                  <td class="p-4 font-mono font-bold text-emerald-700">
                    {{ row.loan.code }}
                    <span class="block text-[10px] text-slate-500 uppercase font-sans font-normal">Cuota #{{ row.installment.installmentNo }} ({{ row.loan.frequency }})</span>
                  </td>

                  <td class="p-4 font-mono">
                    <span [class]="getDaysLateStyle(row.lateDays)" class="px-2.5 py-1 rounded-lg text-xs font-bold inline-block">
                      {{ row.lateDays }} días de atraso
                    </span>
                    <span class="block text-[10px] text-slate-500 mt-0.5">Venció: {{ row.installment.dueDate }}</span>
                  </td>

                  <td class="p-4 text-right font-mono font-bold text-slate-900">
                    {{ loanService.formatCurrency(row.installment.paymentAmount) }}
                  </td>

                  <td class="p-4 text-right font-mono font-bold text-rose-700">
                    +{{ loanService.formatCurrency(row.calculatedFine) }}
                  </td>

                  <td class="p-4 text-right font-mono font-extrabold text-slate-900 text-sm">
                    {{ loanService.formatCurrency(row.totalDue) }}
                  </td>

                  <td class="p-4 text-center">
                    <div class="flex items-center justify-center gap-2">
                      <!-- WhatsApp Action -->
                      <a 
                        [href]="getWhatsAppReminderLink(row)" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        class="px-2.5 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-600 hover:text-white border border-emerald-200 rounded-lg text-xs font-semibold transition flex items-center gap-1 shadow-2xs">
                        <span class="material-icons-outlined text-sm">chat</span>
                        WhatsApp
                      </a>

                      <!-- Legal Notice Modal Trigger -->
                      <button 
                        (click)="openNoticeModal(row)"
                        class="px-2.5 py-1.5 bg-rose-50 text-rose-800 hover:bg-rose-600 hover:text-white border border-rose-200 rounded-lg text-xs font-semibold transition flex items-center gap-1 shadow-2xs">
                        <span class="material-icons-outlined text-sm">gavel</span>
                        Notificación
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="p-12 text-center text-slate-400">
                    <span class="material-icons-outlined text-4xl text-emerald-600 mb-2 block">verified_user</span>
                    No se registran partidas morosas en esta categoría. ¡Excelente desempeño de cobranza!
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Legal Extrajudicial Notice Modal -->
      @if (activeNoticeRow()) {
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div class="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 class="text-lg font-bold text-rose-700 flex items-center gap-2">
                <span class="material-icons-outlined">gavel</span>
                Notificación Extrajudicial de Cobranza
              </h3>
              <button (click)="activeNoticeRow.set(null)" class="text-slate-400 hover:text-slate-700">
                <span class="material-icons-outlined">close</span>
              </button>
            </div>

            <!-- Printable Letter Preview -->
            <div class="bg-white text-slate-900 p-6 rounded-xl space-y-4 text-xs font-serif leading-relaxed border border-slate-300">
              <div class="text-center font-bold text-sm uppercase tracking-wider text-rose-900 border-b border-slate-300 pb-2">
                NOTIFICACIÓN FORMAL DE REQUERIMIENTO DE PAGO EXTRAJUDICIAL
              </div>

              <div class="flex justify-between font-sans text-[11px] text-slate-600">
                <span>FECHA DE EMISIÓN: {{ todayStr }}</span>
                <span>CONTRATO: {{ activeNoticeRow()?.loan?.code }}</span>
              </div>

              <div>
                <strong>SEÑOR(A):</strong> {{ activeNoticeRow()?.loan?.clientName }}<br>
                <strong>IDENTIFICACIÓN:</strong> {{ activeNoticeRow()?.loan?.clientIdentification }}<br>
                <strong>TELÉFONO:</strong> {{ activeNoticeRow()?.loan?.clientPhone }}
              </div>

              <p>
                Por medio de la presente notificación extrajudicial, le informamos formalmente que su obligación de pago correspondiente a la 
                <strong>Cuotas #{{ activeNoticeRow()?.installment?.installmentNo }}</strong> del contrato de préstamo número <strong>{{ activeNoticeRow()?.loan?.code }}</strong>,
                presenta un atraso acumulado de <strong>{{ activeNoticeRow()?.lateDays }} días</strong>.
              </p>

              <div class="p-3 bg-rose-50 border border-rose-200 rounded font-sans text-xs space-y-1">
                <div>Monto Cuota Vencida: <strong>{{ loanService.formatCurrency(activeNoticeRow()!.installment.paymentAmount) }}</strong></div>
                <div>Recargo por Mora Acumulado: <strong>{{ loanService.formatCurrency(activeNoticeRow()!.calculatedFine) }}</strong></div>
                <div class="text-sm font-bold text-rose-900 pt-1 border-t border-rose-200">
                  TOTAL REQUERIDO DE PAGO: {{ loanService.formatCurrency(activeNoticeRow()!.totalDue) }}
                </div>
              </div>

              <p>
                Le otorgamos un plazo perentorio de <strong>48 horas hábiles</strong> para apersonarse o realizar la transferencia del valor adeudado. De hacer caso omiso, la institución iniciará las acciones legales correspondientes y el reporte negativo en el Buró de Crédito.
              </p>

              <div class="pt-8 text-center font-sans text-[11px]">
                _______________________________________<br>
                <strong>DEPARTAMENTO DE COBRANZAS & ASESORÍA JURÍDICA</strong><br>
                SwiftLend Financial Systems
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button (click)="activeNoticeRow.set(null)" class="px-4 py-2 text-slate-500 hover:text-slate-800 text-xs font-medium">
                Cerrar
              </button>
              <button (click)="printNotice()" class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-xs">
                <span class="material-icons-outlined text-sm">print</span>
                Imprimir Notificación Legal
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class DelinquencyComponent {
  loanService = inject(LoanService);

  readonly selectedBucketFilter = signal<'ALL' | 'PAR_1_15' | 'PAR_16_30' | 'PAR_31_60' | 'PAR_60_PLUS'>('ALL');
  readonly activeNoticeRow = signal<OverdueReportRow | null>(null);

  readonly todayStr = new Date().toISOString().split('T')[0];

  readonly overdueRows = computed<OverdueReportRow[]>(() => {
    const today = new Date();
    const rows: OverdueReportRow[] = [];

    this.loanService.loans().forEach(loan => {
      if (loan.status === 'pagado') return;

      loan.paymentSchedule.forEach(inst => {
        if (inst.status === 'vencido' || inst.status === 'pendiente' || inst.status === 'parcial') {
          const dueDateObj = new Date(inst.dueDate);
          const diffTime = today.getTime() - dueDateObj.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));

          if (diffDays > 0) {
            let bucket: 'PAR_1_15' | 'PAR_16_30' | 'PAR_31_60' | 'PAR_60_PLUS' = 'PAR_1_15';
            if (diffDays > 60) bucket = 'PAR_60_PLUS';
            else if (diffDays > 30) bucket = 'PAR_31_60';
            else if (diffDays > 15) bucket = 'PAR_16_30';

            const calculatedFine = inst.lateFee > 0 ? inst.lateFee : Number((inst.paymentAmount * 0.05).toFixed(2));
            const totalDue = inst.paymentAmount + calculatedFine - inst.paidAmount;

            rows.push({
              loan,
              installment: inst,
              lateDays: diffDays,
              calculatedFine,
              totalDue: Number(totalDue.toFixed(2)),
              bucket
            });
          }
        }
      });
    });

    rows.sort((a, b) => b.lateDays - a.lateDays);
    return rows;
  });

  readonly filteredRows = computed(() => {
    const filter = this.selectedBucketFilter();
    if (filter === 'ALL') return this.overdueRows();
    return this.overdueRows().filter(r => r.bucket === filter);
  });

  getBucketCount(bucket: string): number {
    return this.overdueRows().filter(r => r.bucket === bucket).length;
  }

  getBucketCapital(bucket: string): number {
    return this.overdueRows()
      .filter(r => r.bucket === bucket)
      .reduce((sum, r) => sum + r.totalDue, 0);
  }

  getDaysLateStyle(days: number): string {
    if (days > 60) return 'bg-purple-100 text-purple-800 border border-purple-200';
    if (days > 30) return 'bg-rose-100 text-rose-800 border border-rose-200';
    if (days > 15) return 'bg-orange-100 text-orange-800 border border-orange-200';
    return 'bg-amber-100 text-amber-800 border border-amber-200';
  }

  getRiskBadgeStyle(tier: string): string {
    switch (tier) {
      case 'A': return 'bg-emerald-100 text-emerald-800';
      case 'B': return 'bg-sky-100 text-sky-800';
      case 'C': return 'bg-amber-100 text-amber-800';
      default: return 'bg-rose-100 text-rose-800';
    }
  }

  getWhatsAppReminderLink(row: OverdueReportRow): string {
    const phoneClean = row.loan.clientPhone.replace(/[^0-9]/g, '');
    const amountStr = this.loanService.formatCurrency(row.totalDue);
    const msg = `NOTIFICACIÓN DE COBRO - SwiftLend: Estimado/a ${row.loan.clientName}, le informamos que su cuota #${row.installment.installmentNo} del préstamo ${row.loan.code} presenta ${row.lateDays} días de atraso por un valor total de ${amountStr}. Le solicitamos ponerse al día a la brevedad posible para evitar mayores recargos.`;
    return `https://wa.me/${phoneClean}?text=${encodeURIComponent(msg)}`;
  }

  openNoticeModal(row: OverdueReportRow) {
    this.activeNoticeRow.set(row);
  }

  printNotice() {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  exportMorosidadReport() {
    let csv = 'data:text/csv;charset=utf-8,';
    csv += 'Cliente,Telefono,Codigo Prestamo,Cuota No,Dias Atraso,Monto Cuota,Recargo Mora,Total Deuda,Tramo PAR\n';

    this.overdueRows().forEach(r => {
      csv += `"${r.loan.clientName}",${r.loan.clientPhone},${r.loan.code},${r.installment.installmentNo},${r.lateDays},${r.installment.paymentAmount},${r.calculatedFine},${r.totalDue},${r.bucket}\n`;
    });

    const encodedUri = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reporte_morosidad_swiftlend_${this.todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
