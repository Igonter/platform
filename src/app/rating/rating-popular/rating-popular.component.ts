import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { Paginator, Strategy, TableColumn } from '@app/models';
import { TableHeaderRow } from '@app/models/table-header-row';
import { CustomCurrencyPipe } from '@app/pipes/custom-currency.pipe';
import { PercentPipe } from '@angular/common';
import { DataService } from '@app/services/data.service';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-rating-popular',
  templateUrl: './rating-popular.component.html',
  styleUrls: ['./rating-popular.component.scss']
})
export class RatingPopularComponent implements  OnInit, OnDestroy {
  // https://blog.strongbrew.io/rxjs-best-practices-in-angular/#avoiding-memory-leaks
  // here we will unsubscribe from all subscriptions
  destroy$ = new Subject();

  // component data
  strategies: Strategy[];

  // table settings
  tableHeader: TableHeaderRow[] = [
    new TableHeaderRow([
      new TableColumn({ property: 'nameRating', label: 'Стратегия'}),
      new TableColumn({ property: 'monthlyYield', label: 'Доходность в месяц', pipe: { pipe: PercentPipe, args: ['1.0-2'] }}),
      new TableColumn({ property: 'strategy.yieldChart', label: 'Всего' }),
      new TableColumn({ property: 'accountsCount', label: 'Инвесторы'}),
      new TableColumn({ property: 'age', label: 'Возраст, недель' }),
      new TableColumn({ property: 'strategy.investmentInfo', label: 'Моя инвестиция' }),
      new TableColumn({ property: 'manage', label: '' })
    ]),
  ];
  paginator: Paginator = new Paginator({
    perPage: 10,
    currentPage: 1
  });

  constructor(
    private dataService: DataService
  ) { }

  ngOnInit(): void {
    this.getRating();
  }

  getRating(): void {
    this.dataService.getRating(2, this.paginator)
      .pipe(takeUntil(this.destroy$))
      .subscribe((strategies: Strategy[]) => {
        console.log(strategies);
        this.strategies = strategies;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
  }
}
