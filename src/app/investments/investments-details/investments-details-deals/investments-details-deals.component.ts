import { Component, OnDestroy, OnInit } from '@angular/core';
import { AccountService } from '@app/services/account.service';
import { Deal, Paginator, TableColumn } from '@app/models';
import { DatePipe } from '@angular/common';
import { TableHeaderRow } from '@app/models/table-header-row';
import { Subject } from 'rxjs/index';
import { takeUntil } from 'rxjs/internal/operators';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-investments-details-deals',
  templateUrl: './investments-details-deals.component.html',
  styleUrls: ['./investments-details-deals.component.scss']
})
export class InvestmentsDetailsDealsComponent implements OnInit, OnDestroy {
  // https://blog.strongbrew.io/rxjs-best-practices-in-angular/#avoiding-memory-leaks
  // here we will unsubscribe from all subscriptions
  destroy$ = new Subject();

  // component data
  deals: Deal[];
  id: number;

  // table settings
  tableHeader: TableHeaderRow[] = [
    new TableHeaderRow([
      new TableColumn({ property: 'dtCreated', label: 'Время', pipe: { pipe: DatePipe, args: ['yyyy-MM-dd hh:mm:ss'] }}),
      new TableColumn({ property: 'id', label: 'Сделка'}),
      new TableColumn({ property: 'Symbol', label: 'Инструмент' }),
      new TableColumn({ property: 'type', label: 'Тип' }),
      new TableColumn({ property: 'entry', label: 'Направление' }),
      new TableColumn({ property: 'volume', label: 'Объем' }),
      new TableColumn({ property: 'price', label: 'Цена' }),
      new TableColumn({ property: 'yield', label: 'Прибыль' }),
      new TableColumn({ property: 'comission', label: 'Комиссия' }),
      new TableColumn({ property: 'swap', label: 'Своп' }),
      new TableColumn({ property: 'totalProfit', label: 'Итого прибыль' })
    ]),
  ];
  totalFields: string[] = ['yield', 'comission', 'swap', 'totalProfit'];
  paginator: Paginator = new Paginator({
    perPage: 10,
    currentPage: 1
  });

  constructor(
    private route: ActivatedRoute,
    private accountService: AccountService
  ) { }

  ngOnInit() {
    this.route.parent.params.subscribe((params) => {
      this.id = params['id'];
      this.getDeals();
    });
  }

  getDeals(): void {
    this.accountService.getDeals(this.id, this.paginator)
      .pipe(takeUntil(this.destroy$))
      .subscribe((deals: Deal[]) => {
        this.deals = deals;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
  }
}
