import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoanService } from './services/loan.service';
import { CurrencyConfig } from './models/loan.models';

import { DashboardComponent } from './components/dashboard/dashboard';
import { ClientsComponent } from './components/clients/clients';
import { CalculatorComponent } from './components/calculator/calculator';
import { LoansComponent } from './components/loans/loans';
import { ContractComponent } from './components/contract/contract';
import { DelinquencyComponent } from './components/delinquency/delinquency';
import { PaymentsComponent } from './components/payments/payments';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    DashboardComponent,
    ClientsComponent,
    CalculatorComponent,
    LoansComponent,
    ContractComponent,
    DelinquencyComponent,
    PaymentsComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  loanService = inject(LoanService);

  readonly mobileMenuOpen = signal<boolean>(false);
  readonly todayFormatted = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  getAvailableCurrencies(): CurrencyConfig[] {
    return this.loanService.getAvailableCurrencies();
  }

  onCurrencyChange(e: Event) {
    const code = (e.target as HTMLSelectElement).value;
    const curr = this.getAvailableCurrencies().find(c => c.code === code);
    if (curr) {
      this.loanService.setCurrency(curr);
    }
  }

  setTab(tab: 'dashboard' | 'clients' | 'calculator' | 'loans' | 'delinquency' | 'contract' | 'payments') {
    this.loanService.activeTab.set(tab);
    this.mobileMenuOpen.set(false);
  }
}
