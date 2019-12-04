import { Injectable } from '@angular/core';
import { BehaviorSubject, forkJoin, Observable, of, ReplaySubject } from "rxjs";
import {
  Account,
  AccountsSearchOptions,
  Paginator,
  Strategy,
  StrategiesSearchOptions,
  Command,
  Deal,
  Position,
  DealsSearchOptions,
  PositionsSearchOptions,
  ChartOptions, RatingSearchOptions, StrategyAccontsOptions
} from "@app/models";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { CreateInstanceService } from "@app/services/create-instance.service";
import { CommandService } from "@app/services/command.service";
import { CONFIG } from "../../../config";
import { map } from "rxjs/operators";
import { LoaderService } from '@app/services/loader.service';
import { WalletService } from '@app/services/wallet.service';
import { Router } from '@angular/router';
import { NotificationsService } from '@app/services/notifications.service';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  // Мои активные стратегии
  activeMyStrategiesSubject: BehaviorSubject<Strategy[]> = new BehaviorSubject<Strategy[]>([]);
  // Мои закрытые стратегии
  closedMyStrategiesSubject: BehaviorSubject<Strategy[]> = new BehaviorSubject<Strategy[]>([]);
  // Мои активные инвестиции
  activeMyAccountsSubject: BehaviorSubject<Account[]> = new BehaviorSubject<Account[]>([]);
  // Мои закрытые инвестиции
  closedMyAccountsSubject: BehaviorSubject<Account[]> = new BehaviorSubject<Account[]>([]);
  // Детали текущей стратегии
  currentStrategyDetailsSubject: ReplaySubject<Strategy> = new ReplaySubject<Strategy>();
  // Рейтинг стратегий
  ratingStrategiesSubject: BehaviorSubject<Strategy[]> = new BehaviorSubject<Strategy[]>([]);
  // Детали текущей инвестиции
  currentAccountStatementSubject: ReplaySubject<any> = new ReplaySubject<any>();
  // Инвестиции текущей стратегии
  currentStrategyAccountsSubject: BehaviorSubject<Account[]> = new BehaviorSubject<Account[]>([]);

  constructor(
    private http: HttpClient,
    private createInstanceService: CreateInstanceService,
    private commandService: CommandService,
    private loaderService: LoaderService,
    private walletService: WalletService,
    private router: Router,
    private notificationsService: NotificationsService
  ) { }

  //
  // Методы работы со стратегиями
  //

  // Получение списка активных стратегий
  getActiveMyStrategies(pagination?: Paginator): Observable<Strategy[]> {
    this.loaderService.showLoader();
    const options: StrategiesSearchOptions = new StrategiesSearchOptions();
    options.Filter = {
      ActiveStrategies: true,
      MyStrategies: true
    };

    if (pagination) {
      options.Pagination = {
        CurrentPage: pagination.currentPage,
        PerPage: pagination.perPage
      };
    }

    this.http.post(`${CONFIG.baseApiUrl}/strategies.search`, options).subscribe((response: any) => {
      const strategies: Strategy[] = [];

      response.Strategies.forEach((s: any) => {
        strategies.push(this.createInstanceService.createStrategy(s));
      });

      if (pagination) {
        pagination.totalItems = response.Pagination.TotalRecords;
        pagination.totalPages = response.Pagination.TotalPages;
      }

      this.loaderService.hideLoader();
      this.activeMyStrategiesSubject.next(strategies);
    });

    return this.activeMyStrategiesSubject.asObservable();
  }

  // Получение списка закрытых стратегий
  getClosedMyStrategies(pagination?: Paginator): Observable<Strategy[]> {
    this.loaderService.showLoader();
    const options: StrategiesSearchOptions = new StrategiesSearchOptions();
    options.Filter = {
      ActiveStrategies: false,
      MyStrategies: true
    };

    if (pagination) {
      options.Pagination = {
        CurrentPage: pagination.currentPage,
        PerPage: pagination.perPage
      };
    }

    this.http.post(`${CONFIG.baseApiUrl}/strategies.search`, options).subscribe((response: any) => {
      this.loaderService.showLoader();
      const strategies: Strategy[] = [];

      response.Strategies.forEach((s: any) => {
        strategies.push(this.createInstanceService.createStrategy(s));
      });

      if (pagination) {
        pagination.totalItems = response.Pagination.TotalRecords;
        pagination.totalPages = response.Pagination.TotalPages;
      }

      this.loaderService.hideLoader();
      this.closedMyStrategiesSubject.next(strategies);
    });

    return this.closedMyStrategiesSubject.asObservable();
  }

  // Получение конкретной стратегии
  getStrategy(id: number): Observable<Strategy> {
    this.loaderService.showLoader();
    this.http.post(`${CONFIG.baseApiUrl}/strategies.get`, {ID: id}).subscribe((response: any) => {
      this.loaderService.hideLoader();
      if (response.MyAccount) {
        response.Strategy.Account = response.MyAccount;
      }
      response.Strategy.Offer = {Fee: response.Strategy.Fee};
      this.currentStrategyDetailsSubject.next(this.createInstanceService.createStrategy(response.Strategy));
    }, (error: HttpErrorResponse) => {
      if (error.status === 404) {
        this.router.navigate(['/rating']);
        this.notificationsService.open('У вас нет доступа к данной стратегии', {type: 'error', autoClose: true, duration: 3000});
      }
    });

    return this.currentStrategyDetailsSubject.asObservable();
  }

  // Создание новой стратегии
  addStrategy(strategy: object) {
    this.loaderService.showLoader();
    return this.http.post(`${CONFIG.baseApiUrl}/myStrategies.add`, strategy).pipe(map((response: any) => {
      this.loaderService.hideLoader();
      this.walletService.updateWallet().subscribe();
      this.getActiveMyStrategies().subscribe();
      this.notificationsService.open('Стратегия создана');
    }));
  }

  // Постановка стратегии на паузу
  pauseStrategy(strategyId: number): Observable<any> {
    this.loaderService.showLoader();
    return this.http.post(`${CONFIG.baseApiUrl}/myStrategies.pause`, {StrategyID: strategyId}).pipe(
      map((response: any) => {
        this.updateStrategy(strategyId, new Command(response.CommandID, strategyId), 'Стратегия поставлена на паузу');
      })
    );
  }

  // Возобновление стратегии
  resumeStrategy(strategyId: number): Observable<any> {
    this.loaderService.showLoader();
    return this.http.post(`${CONFIG.baseApiUrl}/myStrategies.resume`, {StrategyID: strategyId}).pipe(
      map((response: any) => {
        this.updateStrategy(strategyId, new Command(response.CommandID, strategyId), 'Стратегия возобновлена');
      })
    );
  }

  // Закрытие стратегии
  closeStrategy(strategyId: number): Observable<any> {
    this.loaderService.showLoader();
    return this.http.post(`${CONFIG.baseApiUrl}/myStrategies.close`, {StrategyID: strategyId}).pipe(
      map((response: any) => {
        this.updateStrategy(strategyId, new Command(response.CommandID, strategyId), 'Стратегия закрыта');
      })
    );
  }

  searchStrategy(strategyName: string): Observable<boolean> {
    this.loaderService.showLoader();

    const options: StrategiesSearchOptions = new StrategiesSearchOptions();
    options.Filter = {
      Name: strategyName
    };

    return this.http.post(`${CONFIG.baseApiUrl}/strategies.search`, options).pipe(
      map((response: any) => {
        this.loaderService.hideLoader();
        let result: boolean = true;
        response.Strategies.forEach((s: any) => {
          if (s.Name.toLocaleLowerCase() === strategyName.toLocaleLowerCase()) {
            result = false;
          }
        });
        return result;
      })
    );
  }

  // Получение статуса команды стратегии и запрос обновленного списка стратегий после завершения обработки изменений
  // Работает с активными стратегиями, так как закрытые изменять нельзя
  updateStrategy(strategyId: number, command: Command, notificationText?: string): void {
    const interval = setInterval(() => {
      this.commandService.checkStrategyCommand(command).subscribe((commandStatus: number) => {
        if (commandStatus !== 0) {
          clearInterval(interval);
          this.getActiveMyStrategies().subscribe();
          this.getActiveMyAccounts().subscribe();
          this.walletService.updateWallet().subscribe();
          this.loaderService.hideLoader();
          this.getStrategy(strategyId);
          this.updateRatingList();
          this.notificationsService.open(notificationText);
        }
      });
    }, 1000);
  }

  // Получение графика для стратегий
  getStrategyChart(chartOptions: ChartOptions): Observable<any> {
    this.loaderService.showLoader();
    const options: any = {
      StrategyID: chartOptions.strategyID,
      MaxPoints: chartOptions.maxPoints,
      chartType: chartOptions.chartType,
      chartSize: chartOptions.chartSize
    };

    this.loaderService.hideLoader();
    return this.http.post(`${CONFIG.baseApiUrl}/charts.get`, options);
  }

  getSymbolsChart(strategyID: number): Observable<any> {
    this.loaderService.showLoader();
    const options: any = {
      StrategyID: strategyID
    };

    return this.http.post(`${CONFIG.baseApiUrl}/strategysymbolstat.get`, options).pipe(
      map((response: any) => {
        const chart: object[] = [];
        response.StrategySymbolStat.forEach((stat: any) => {
          chart.push({name: stat.Symbol, y: stat.Share});
        });
        this.loaderService.hideLoader();
        return chart;
      })
    );
  }

  getStrategyAccounts(strategyID: number, isActive: boolean = true, pagination?: Paginator): Observable<Account[]> {
    const method: string = isActive ? 'myStrategies.getActiveAccounts' : 'myStrategies.getClosedAccounts';
    this.loaderService.showLoader();
    const options: StrategyAccontsOptions = new StrategyAccontsOptions();
    options.StrategyID = strategyID;

    if (pagination) {
      options.Pagination = {
        CurrentPage: pagination.currentPage,
        PerPage: pagination.perPage
      };
    }

    this.http.post(`${CONFIG.baseApiUrl}/${method}`, options).subscribe((response: any) => {
      const accounts: Account[] = [];

      response.Accounts.forEach((a: any) => {
        accounts.push(this.createInstanceService.createAccount(a));
      });

      if (pagination) {
        pagination.totalItems = response.Pagination.TotalRecords;
        pagination.totalPages = response.Pagination.TotalPages;
      }

      this.loaderService.hideLoader();
      this.currentStrategyAccountsSubject.next(accounts);
    });

    return this.currentStrategyAccountsSubject.asObservable();
  }

  //
  // Методы работы со инвестициями
  //

  // Получение инвестиции по ID
  getAccount(id: number): Observable<Account> {
    this.loaderService.showLoader();
    return this.http.post(`${CONFIG.baseApiUrl}/accounts.get`, { AccountID: id }).pipe(map((response: any) => {
      this.loaderService.hideLoader();
      return this.createInstanceService.createAccount(response);
    }));
  }

  // Получение списка активных инвестиций
  getActiveMyAccounts(pagination?: Paginator): Observable<Account[]> {
    this.loaderService.showLoader();
    const options: AccountsSearchOptions = new AccountsSearchOptions();
    options.Filter = { MyActiveAccounts: true };

    if (pagination) {
      options.Pagination = {
        CurrentPage: pagination.currentPage,
        PerPage: pagination.perPage
      };
    }

    this.http.post(`${CONFIG.baseApiUrl}/accounts.search`, options).subscribe((response: any) => {
      const accounts: Account[] = [];

      response.Accounts.forEach((account: any) => {
        accounts.push(new Account(this.createInstanceService.createAccount(account)));
      });

      if (pagination) {
        pagination.totalItems = response.Pagination.TotalRecords;
        pagination.totalPages = response.Pagination.TotalPages;
      }

      this.loaderService.hideLoader();
      this.activeMyAccountsSubject.next(accounts.filter((a: Account) => a.isActive()));
    });

    return this.activeMyAccountsSubject.asObservable();
  }

  // Получение списка закрытых инвестиций
  getClosedMyAccounts(pagination?: Paginator): Observable<Account[]> {
    this.loaderService.showLoader();
    const options: AccountsSearchOptions = new AccountsSearchOptions();
    options.Filter = { MyActiveAccounts: false };

    if (pagination) {
      options.Pagination = {
        CurrentPage: pagination.currentPage,
        PerPage: pagination.perPage
      };
    }

    this.http.post(`${CONFIG.baseApiUrl}/accounts.search`, options).subscribe((response: any) => {
      const accounts: Account[] = [];

      response.Accounts
        .filter((a: any) => a.Status === 6)
        .forEach((account: any) => {
          accounts.push(new Account(this.createInstanceService.createAccount(account)));
        });

      if (pagination) {
        pagination.totalItems = response.Pagination.TotalRecords;
        pagination.totalPages = response.Pagination.TotalPages;
      }

      this.loaderService.hideLoader();
      this.closedMyAccountsSubject.next(accounts.filter((a: Account) => !a.isActive()));
    });

    return this.closedMyAccountsSubject.asObservable();
  }

  // Получение деталей инвестиции
  getAccountStatement(id: number): Observable<any> {
    this.http.post(`${CONFIG.baseApiUrl}/accounts.getStatement`, {AccountID: id}).subscribe((response: any) => {
      response.Statement[0].Strategy.Offer = {
        Commission: response.Statement[0].Strategy.Commission,
        Fee: response.Statement[0].Strategy.Fee
      };

      this.currentAccountStatementSubject.next({
        strategy: this.createInstanceService.createStrategy(response.Statement[0].Strategy),
        account: this.createInstanceService.createAccount(response.Statement[0].Account)
      });
    }, (error: HttpErrorResponse) => {
      if (error.status === 401) {
        this.router.navigate(['/investments']);
        this.notificationsService.open('У вас нет доступа к данной инвестиции', {type: 'error', autoClose: true, duration: 3000});
      }
    });

    return this.currentAccountStatementSubject.asObservable();
  }

  // Инвестировать в стратегию (Создать инвестицию)
  addAccount(id: number, data: object): Observable<any> {
    this.loaderService.showLoader();
    const options: any = {
      StrategyID: id,
      Factor: data['factor'],
      Protection: data['protection'],
      Target: data['target'],
      Money: data['amount']
    };

    return this.http.post(`${CONFIG.baseApiUrl}/accounts.add`, options).pipe(
      map((response: any) => {
        this.getActiveMyStrategies().subscribe();
        this.walletService.updateWallet().subscribe();
        this.getStrategy(id);
        this.updateRatingList();
        this.notificationsService.open('Инвестиция создана');
      })
    );
  }

  // Пополнить инвестицию
  fundAccount(accountID: number, amount: number, strategyID: number) {
    this.loaderService.showLoader();
    return this.http.post(`${CONFIG.baseApiUrl}/accounts.fund`, {AccountID: accountID, Amount: amount}).pipe(
      map((response: any) => {
        this.updateAccount(accountID, new Command(response.CommandBalanceID, accountID), strategyID, 'Средства зачислены');
      })
    );
  }

  // Приостановить инвестицию
  pauseAccount(id: number, strategyID: number): Observable<any> {
    this.loaderService.showLoader();
    return this.http.post(`${CONFIG.baseApiUrl}/accounts.pause`, {AccountID: id}).pipe(
      map((response: any) => {
        this.updateAccount(id, new Command(response.CommandID, id), strategyID, 'Инвестиция поставлена на паузу');
      })
    );
  }

  // Возобновить инвестицию
  resumeAccount(id: number, strategyID: number): Observable<any> {
    this.loaderService.showLoader();
    return this.http.post(`${CONFIG.baseApiUrl}/accounts.resume`, {AccountID: id}).pipe(
      map((response: any) => {
        this.updateAccount(id, new Command(response.CommandID, id), strategyID, 'Инвестиция снята с паузы');
      })
    );
  }

  // Изменить профиль инвестиции
  changeAccountProfile(id: number, valueObj: {[key: string]: number}, strategyID: number): Observable<any> {
    this.loaderService.showLoader();

    const requests: any[] = [];

    if (valueObj.target) {
      requests.push(
        this.http.post(`${CONFIG.baseApiUrl}/accounts.setTarget`, {AccountID: id, Target: valueObj['target']}).pipe(
          map((response: any) => {
            this.updateAccount(id, new Command(response.CommandID, id), strategyID, 'Цель инвестиции изменена');
          })
        )
      );
    }

    if (valueObj.protection) {
      requests.push(
        this.http.post(`${CONFIG.baseApiUrl}/accounts.setProtection`, {AccountID: id, Protection: valueObj['protection']}).pipe(
          map((response: any) => {
            this.updateAccount(id, new Command(response.CommandID, id), strategyID, 'Защита инвестиции изменена');
          })
        )
      );
    }

    if (valueObj.factor) {
      requests.push(
        this.http.post(`${CONFIG.baseApiUrl}/accounts.setFactor`, {AccountID: id, Factor: valueObj['factor']}).pipe(
          map((response: any) => {
            this.updateAccount(id, new Command(response.CommandID, id), strategyID, 'Множитель инвестиции изменен');
          })
        )
      );
    }

    if (!requests.length) {
      this.loaderService.hideLoader();
      return of(null);
    }

    return forkJoin(requests);
  }

  // Вывести средства из инвестиции
  withdrawFromAccount(id: number, amount: number, strategyID: number): Observable<any> {
    this.loaderService.showLoader();
    return this.http.post(`${CONFIG.baseApiUrl}/accounts.withdraw`, { AccountID: id, Amount: amount }).pipe(
      map((response: any) => {
        this.updateAccount(id, new Command(response.CommandBalanceID, id), strategyID, 'Средства выведены');
      })
    );
  }

  // Закрыть инвестицию
  closeAccount(id: number, strategyID: number): Observable<any> {
    this.loaderService.showLoader();
    return this.http.post(`${CONFIG.baseApiUrl}/accounts.close`, { AccountID: id }).pipe(
      map((response: any) => {
        this.updateAccount(id, new Command(response.CommandID, id), strategyID, 'Инвестиция закрыта');
      })
    );
  }

  // Получение статуса команды и запрос обновленного списка дынных после завершения обработки изменений
  updateAccount(accountId: number, command: Command, strategyID: number, notificationText?: string): void {
    const interval = setInterval(() => {
      this.commandService.checkAccountCommand(command).subscribe((commandStatus: number) => {
        if (commandStatus !== 0) {
          clearInterval(interval);
          this.getActiveMyStrategies().subscribe();
          this.getActiveMyAccounts().subscribe();
          this.walletService.updateWallet().subscribe();
          this.loaderService.hideLoader();
          this.getStrategy(strategyID);
          this.updateRatingList();
          this.notificationsService.open(notificationText);
          this.getAccountStatement(accountId);
        }
      });
    }, 1000);
  }

  updateRatingList() {
    switch (this.router.url) {
      case '/rating':
        this.getRating(0).subscribe();
        break;
      case '/rating/popular':
        this.getRating(2).subscribe();
        break;
      case '/rating/all':
        this.getRating(1).subscribe();
        break;
    }
  }

  // Получение списка сделок по инвестиции
  getAccountDeals(id: number, pagination?: Paginator): Observable<Deal[]> {
    this.loaderService.showLoader();
    const options: DealsSearchOptions = new DealsSearchOptions();
    options.Filter = { AccountID: id };

    if (pagination) {
      options.Pagination = {
        CurrentPage: pagination.currentPage,
        PerPage: pagination.perPage
      };
    }

    return this.http.post(`${CONFIG.baseApiUrl}/deals.search`, options).pipe(map((response: any) => {
      const deals: Deal[] = [];

      response.Deals.forEach((deal: any) => {
        deals.push(this.createInstanceService.createDeal(deal));
      });

      if (pagination) {
        pagination.totalItems = response.Pagination.TotalRecords;
        pagination.totalPages = response.Pagination.TotalPages;
      }

      this.loaderService.hideLoader();
      return deals;
    }));
  }

  // Получение списка позиций по инвестиции
  getAccountPositions(id: number, pagination?: Paginator): Observable<Position[]> {
    this.loaderService.showLoader();
    const options: PositionsSearchOptions = new PositionsSearchOptions();
    options.Filter = { AccountID: id };

    if (pagination) {
      options.Pagination = {
        CurrentPage: pagination.currentPage,
        PerPage: pagination.perPage
      };
    }

    return this.http.post(`${CONFIG.baseApiUrl}/positions.search`, options).pipe(map((response: any) => {
      const positions: Position[] = [];

      if (response.Positions.length) {
        response.Positions.forEach((position: any) => {
          positions.push(this.createInstanceService.createPosition(position));
        });

        if (pagination) {
          pagination.totalItems = response.Pagination.TotalRecords;
          pagination.totalPages = response.Pagination.TotalPages;
        }
      }

      this.loaderService.hideLoader();
      return positions;
    }));
  }

  //
  // Методы ддля работы с рейтингом
  //
  getRating(ratingType: 0 | 1 | 2, pagination?: Paginator, searchText?: string): Observable<Strategy[]> {
    this.loaderService.showLoader();
    const options: RatingSearchOptions = new RatingSearchOptions();
    options.Filter = {
      RatingType: ratingType,
    };

    if (searchText) {
      options.Filter.StrategyName = searchText;
    }

    if (pagination) {
      options.Pagination = {
        CurrentPage: pagination.currentPage,
        PerPage: pagination.perPage
      };
    }

    this.http.post(`${CONFIG.baseApiUrl}/ratings.get`, options).subscribe((response: any) => {
      const strategies: Strategy[] = [];

      response.Strategies.forEach((s: any) => {
        if (s.Account) {
          s.Strategy.Account = s.Account;
        }
        strategies.push(this.createInstanceService.createStrategy(s.Strategy));
      });

      if (pagination) {
        pagination.totalItems = response.Pagination.TotalRecords;
        pagination.totalPages = response.Pagination.TotalPages;
      }

      this.loaderService.hideLoader();
      this.ratingStrategiesSubject.next(strategies);
    });

    return this.ratingStrategiesSubject.asObservable();
  }
}
