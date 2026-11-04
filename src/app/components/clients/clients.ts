import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoanService } from '../../services/loan.service';
import { Client, IdentificationType, RiskTier } from '../../models/loan.models';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- Header Bar -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/80 p-6 rounded-2xl shadow-xs">
        <div>
          <div class="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
            <span class="material-icons-outlined text-sm">badge</span>
            Directorio de Clientes & Prestatarios
          </div>
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Gestión de Clientes</h1>
          <p class="text-slate-500 text-sm mt-1">Administra perfiles, historial crediticio y nivel de riesgo de tus prestatarios.</p>
        </div>

        <button 
          (click)="showCreateModal.set(true)"
          class="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-xs transition flex items-center gap-2 self-start md:self-auto">
          <span class="material-icons-outlined text-lg">person_add</span>
          Nuevo Cliente
        </button>
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="bg-white border border-slate-200/80 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
        <!-- Search Input -->
        <div class="relative w-full md:w-96">
          <span class="material-icons-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
          <input 
            type="text" 
            [value]="searchTerm()" 
            (input)="updateSearch($event)"
            placeholder="Buscar por nombre, DNI/Cédula o teléfono..."
            class="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white"
          />
        </div>

        <!-- Filter Buttons (Segmented Controls) -->
        <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-stretch md:self-auto overflow-x-auto">
          <button 
            (click)="selectedRiskFilter.set('ALL')"
            [class]="selectedRiskFilter() === 'ALL' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'"
            class="px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap">
            Todos ({{ loanService.clients().length }})
          </button>
          <button 
            (click)="selectedRiskFilter.set('A')"
            [class]="selectedRiskFilter() === 'A' ? 'bg-emerald-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'"
            class="px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap">
            Riesgo A (Bajo)
          </button>
          <button 
            (click)="selectedRiskFilter.set('B')"
            [class]="selectedRiskFilter() === 'B' ? 'bg-sky-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'"
            class="px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap">
            Riesgo B (Medio)
          </button>
          <button 
            (click)="selectedRiskFilter.set('C')"
            [class]="selectedRiskFilter() === 'C' ? 'bg-amber-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'"
            class="px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap">
            Riesgo C (Alto)
          </button>
        </div>
      </div>

      <!-- Clients Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        @for (client of filteredClients(); track client.id) {
          <div class="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 hover:border-emerald-300 transition flex flex-col justify-between shadow-xs">
            <div class="space-y-3">
              <!-- Top Row: Name & Risk Badge -->
              <div class="flex items-start justify-between gap-2">
                <div>
                  <h3 class="font-bold text-slate-900 text-base leading-snug">{{ client.fullName }}</h3>
                  <div class="text-xs text-slate-500 font-mono mt-0.5">
                    {{ client.identificationType }}: <span class="text-slate-800 font-bold">{{ client.identificationNumber }}</span>
                  </div>
                </div>

                <span [class]="getRiskBadgeStyle(client.riskTier)" class="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider shrink-0">
                  Riesgo {{ client.riskTier }}
                </span>
              </div>

              <!-- Contact & Work info -->
              <div class="space-y-1.5 text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <div class="flex items-center gap-2 text-slate-600">
                  <span class="material-icons-outlined text-sm text-emerald-600">call</span>
                  <span class="font-mono text-slate-900 font-semibold">{{ client.phone }}</span>
                </div>
                <div class="flex items-center gap-2 text-slate-600">
                  <span class="material-icons-outlined text-sm text-sky-600">work</span>
                  <span>{{ client.occupation }}</span>
                </div>
                <div class="flex items-center gap-2 text-slate-600">
                  <span class="material-icons-outlined text-sm text-amber-600">payments</span>
                  <span>Ingreso: <strong class="text-slate-900 font-mono">{{ loanService.formatCurrency(client.monthlyIncome) }}</strong>/mes</span>
                </div>
                <div class="flex items-center gap-2 text-slate-600 truncate">
                  <span class="material-icons-outlined text-sm text-purple-600">place</span>
                  <span class="truncate">{{ client.address }}</span>
                </div>
              </div>

              <!-- Active Loan Summary for this Client -->
              <div class="flex items-center justify-between text-xs font-mono text-slate-500 pt-1">
                <span>Préstamos Activos: <strong class="text-emerald-700 font-bold">{{ getActiveLoansForClient(client.id) }}</strong></span>
                <span>Registrado: {{ client.createdAt }}</span>
              </div>
            </div>

            <!-- Card Action Footer -->
            <div class="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <button 
                (click)="openClientDetail(client)"
                class="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition flex items-center gap-1 border border-slate-200">
                <span class="material-icons-outlined text-sm">visibility</span>
                Detalles
              </button>

              <button 
                (click)="createLoanForClient(client)"
                class="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-600 hover:text-white border border-emerald-200 text-xs font-semibold transition flex items-center gap-1">
                <span class="material-icons-outlined text-sm">add_card</span>
                Crear Préstamo
              </button>
            </div>
          </div>
        } @empty {
          <div class="col-span-full bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3 shadow-xs">
            <span class="material-icons-outlined text-4xl text-slate-400">person_search</span>
            <div class="text-slate-800 font-bold text-lg">No se encontraron clientes</div>
            <p class="text-slate-500 text-sm max-w-md mx-auto">Prueba ajustando el término de búsqueda o el filtro de riesgo seleccionado.</p>
          </div>
        }
      </div>

      <!-- Create Client Modal -->
      @if (showCreateModal()) {
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div class="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 class="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span class="material-icons-outlined text-emerald-600">person_add</span>
                Registrar Nuevo Cliente
              </h3>
              <button (click)="showCreateModal.set(false)" class="text-slate-400 hover:text-slate-700">
                <span class="material-icons-outlined">close</span>
              </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-700">
              <!-- Nombre Completo -->
              <div class="sm:col-span-2 space-y-1">
                <span class="block font-semibold text-slate-700">Nombre Completo *</span>
                <input 
                  type="text" 
                  [value]="newFullName()" 
                  (input)="newFullName.set($any($event.target).value)"
                  placeholder="Ej: Juan Antonio Pérez"
                  class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 text-sm focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <!-- Tipo Documento -->
              <div class="space-y-1">
                <span class="block font-semibold text-slate-700">Tipo de Documento</span>
                <select 
                  [value]="newIdType()" 
                  (change)="newIdType.set($any($event.target).value)"
                  class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white">
                  <option value="CEDULA">Cédula de Identidad</option>
                  <option value="DNI">DNI</option>
                  <option value="RNC">RNC (Empresas)</option>
                  <option value="PASAPORTE">Pasaporte</option>
                </select>
              </div>

              <!-- Número Documento -->
              <div class="space-y-1">
                <span class="block font-semibold text-slate-700">Número de Documento *</span>
                <input 
                  type="text" 
                  [value]="newIdNum()" 
                  (input)="newIdNum.set($any($event.target).value)"
                  placeholder="Ej: 001-1928374-5"
                  class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 font-mono focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <!-- Teléfono -->
              <div class="space-y-1">
                <span class="block font-semibold text-slate-700">Teléfono / WhatsApp *</span>
                <input 
                  type="text" 
                  [value]="newPhone()" 
                  (input)="newPhone.set($any($event.target).value)"
                  placeholder="Ej: +1 809 555 1234"
                  class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 font-mono focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <!-- Email -->
              <div class="space-y-1">
                <span class="block font-semibold text-slate-700">Correo Electrónico</span>
                <input 
                  type="email" 
                  [value]="newEmail()" 
                  (input)="newEmail.set($any($event.target).value)"
                  placeholder="correo@ejemplo.com"
                  class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <!-- Ocupación -->
              <div class="space-y-1">
                <span class="block font-semibold text-slate-700">Ocupación / Comercio</span>
                <input 
                  type="text" 
                  [value]="newOccupation()" 
                  (input)="newOccupation.set($any($event.target).value)"
                  placeholder="Ej: Comerciante / Empleado"
                  class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <!-- Ingreso Mensual -->
              <div class="space-y-1">
                <span class="block font-semibold text-slate-700">Ingreso Mensual Estimado</span>
                <input 
                  type="number" 
                  [value]="newIncome()" 
                  (input)="newIncome.set($any($event.target).valueAsNumber || 0)"
                  placeholder="Ej: 3500"
                  class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 font-mono focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <!-- Clasificación de Riesgo -->
              <div class="space-y-1 sm:col-span-2">
                <span class="block font-semibold text-slate-700">Nivel de Riesgo Crediticio</span>
                <select 
                  [value]="newRiskTier()" 
                  (change)="newRiskTier.set($any($event.target).value)"
                  class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white">
                  <option value="A">Riesgo A (Bajo - Excelente Capacidad de Pago)</option>
                  <option value="B">Riesgo B (Moderado - Regular Historial)</option>
                  <option value="C">Riesgo C (Alto - Requiere Garantía Estricta)</option>
                  <option value="D">Riesgo D (Crítico / Alerta)</option>
                </select>
              </div>

              <!-- Dirección -->
              <div class="space-y-1 sm:col-span-2">
                <span class="block font-semibold text-slate-700">Dirección Residencial / Comercial</span>
                <textarea 
                  rows="2" 
                  [value]="newAddress()" 
                  (input)="newAddress.set($any($event.target).value)"
                  placeholder="Calle, Número, Sector, Ciudad..."
                  class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                ></textarea>
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button 
                (click)="showCreateModal.set(false)"
                class="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-medium">
                Cancelar
              </button>
              <button 
                (click)="saveNewClient()"
                [disabled]="!newFullName() || !newIdNum()"
                class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs shadow-xs transition flex items-center gap-2">
                <span class="material-icons-outlined text-sm">check</span>
                Guardar Cliente
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Client Detail Modal -->
      @if (selectedClientDetail()) {
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div class="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div class="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span [class]="getRiskBadgeStyle(selectedClientDetail()!.riskTier)" class="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-2 inline-block">
                  Riesgo {{ selectedClientDetail()!.riskTier }}
                </span>
                <h2 class="text-xl font-bold text-slate-900">{{ selectedClientDetail()!.fullName }}</h2>
                <div class="text-xs text-slate-500 font-mono">{{ selectedClientDetail()!.identificationType }}: {{ selectedClientDetail()!.identificationNumber }}</div>
              </div>
              <button (click)="selectedClientDetail.set(null)" class="text-slate-400 hover:text-slate-700">
                <span class="material-icons-outlined">close</span>
              </button>
            </div>

            <!-- Details -->
            <div class="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span class="text-slate-500 block">Teléfono / WhatsApp</span>
                <strong class="text-slate-900 font-mono">{{ selectedClientDetail()!.phone }}</strong>
              </div>
              <div>
                <span class="text-slate-500 block">Correo Electrónico</span>
                <strong class="text-slate-900">{{ selectedClientDetail()!.email || 'No registrado' }}</strong>
              </div>
              <div>
                <span class="text-slate-500 block">Ocupación / Actividad</span>
                <strong class="text-slate-900">{{ selectedClientDetail()!.occupation }}</strong>
              </div>
              <div>
                <span class="text-slate-500 block">Ingreso Mensual</span>
                <strong class="text-emerald-700 font-mono font-bold">{{ loanService.formatCurrency(selectedClientDetail()!.monthlyIncome) }}</strong>
              </div>
              <div class="col-span-2">
                <span class="text-slate-500 block">Dirección</span>
                <strong class="text-slate-800">{{ selectedClientDetail()!.address }}</strong>
              </div>
            </div>

            <!-- Client Loans History -->
            <div class="space-y-3">
              <h4 class="font-bold text-slate-900 text-sm flex items-center justify-between">
                <span>Historial de Créditos Asociados</span>
                <span class="text-xs text-slate-500 font-mono">Total: {{ getLoansForClient(selectedClientDetail()!.id).length }}</span>
              </h4>

              <div class="space-y-2">
                @for (loan of getLoansForClient(selectedClientDetail()!.id); track loan.id) {
                  <div class="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                    <div>
                      <div class="font-mono font-bold text-emerald-700">{{ loan.code }}</div>
                      <div class="text-slate-600">Monto: <span class="text-slate-900 font-mono font-bold">{{ loanService.formatCurrency(loan.principalAmount) }}</span> ({{ loan.frequency }})</div>
                    </div>
                    <div class="text-right">
                      <div class="font-mono text-slate-700">Saldo: {{ loanService.formatCurrency(loan.remainingBalance) }}</div>
                      <span [class]="getLoanStatusBadgeStyle(loan.status)" class="text-[10px] px-2 py-0.5 rounded font-bold uppercase">
                        {{ loan.status }}
                      </span>
                    </div>
                  </div>
                } @empty {
                  <div class="p-4 bg-slate-50 text-slate-500 text-xs text-center rounded-xl border border-slate-200">
                    Este cliente aún no registra contratos de préstamo.
                  </div>
                }
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button 
                (click)="selectedClientDetail.set(null)"
                class="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-medium">
                Cerrar
              </button>
              <button 
                (click)="createLoanForClient(selectedClientDetail()!)"
                class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition flex items-center gap-2">
                <span class="material-icons-outlined text-sm">add_card</span>
                Crear Préstamo para este Cliente
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class ClientsComponent {
  loanService = inject(LoanService);

  readonly searchTerm = signal<string>('');
  readonly selectedRiskFilter = signal<'ALL' | 'A' | 'B' | 'C' | 'D'>('ALL');
  readonly showCreateModal = signal<boolean>(false);
  readonly selectedClientDetail = signal<Client | null>(null);

  // New Client Form Signals
  readonly newFullName = signal<string>('');
  readonly newIdType = signal<IdentificationType>('CEDULA');
  readonly newIdNum = signal<string>('');
  readonly newPhone = signal<string>('');
  readonly newEmail = signal<string>('');
  readonly newOccupation = signal<string>('');
  readonly newIncome = signal<number>(3000);
  readonly newRiskTier = signal<RiskTier>('B');
  readonly newAddress = signal<string>('');

  readonly filteredClients = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const risk = this.selectedRiskFilter();

    return this.loanService.clients().filter(client => {
      const matchesSearch = 
        client.fullName.toLowerCase().includes(term) ||
        client.identificationNumber.toLowerCase().includes(term) ||
        client.phone.includes(term);

      const matchesRisk = risk === 'ALL' || client.riskTier === risk;

      return matchesSearch && matchesRisk;
    });
  });

  updateSearch(e: Event) {
    this.searchTerm.set((e.target as HTMLInputElement).value);
  }

  getActiveLoansForClient(clientId: string): number {
    return this.loanService.loans().filter(l => l.clientId === clientId && l.status !== 'pagado').length;
  }

  getLoansForClient(clientId: string) {
    return this.loanService.loans().filter(l => l.clientId === clientId);
  }

  getRiskBadgeStyle(tier: RiskTier): string {
    switch (tier) {
      case 'A': return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      case 'B': return 'bg-sky-100 text-sky-800 border border-sky-200';
      case 'C': return 'bg-amber-100 text-amber-800 border border-amber-200';
      case 'D': return 'bg-rose-100 text-rose-800 border border-rose-200';
    }
  }

  getLoanStatusBadgeStyle(status: string): string {
    switch (status) {
      case 'al_dia': return 'bg-emerald-100 text-emerald-800';
      case 'en_mora': return 'bg-rose-100 text-rose-800';
      case 'proximo_vencer': return 'bg-amber-100 text-amber-800';
      case 'pagado': return 'bg-slate-100 text-slate-600';
      default: return 'bg-slate-100 text-slate-700';
    }
  }

  openClientDetail(client: Client) {
    this.selectedClientDetail.set(client);
  }

  createLoanForClient(client: Client) {
    this.loanService.selectedClientIdForDetail.set(client.id);
    this.selectedClientDetail.set(null);
    this.loanService.activeTab.set('loans');
  }

  saveNewClient() {
    if (!this.newFullName() || !this.newIdNum()) return;

    this.loanService.addClient({
      fullName: this.newFullName(),
      identificationType: this.newIdType(),
      identificationNumber: this.newIdNum(),
      phone: this.newPhone(),
      email: this.newEmail(),
      occupation: this.newOccupation(),
      monthlyIncome: this.newIncome(),
      riskTier: this.newRiskTier(),
      address: this.newAddress(),
      notes: ''
    });

    // Reset form
    this.newFullName.set('');
    this.newIdNum.set('');
    this.newPhone.set('');
    this.newEmail.set('');
    this.newOccupation.set('');
    this.showCreateModal.set(false);
  }
}
