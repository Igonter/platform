import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs/index';
import { HttpClient } from '@angular/common/http';
import { CONFIG } from '../../../config';
import { map } from 'rxjs/internal/operators';
import { Account, ChartOptions, Offer, Strategy } from '../models';
import { InvestmentsService } from '@app/services/investments.service';

@Injectable({
  providedIn: 'root'
})
export class StrategyService {
  activeStrategiesSubject: BehaviorSubject<Strategy[]> = new BehaviorSubject<Strategy[]>([]);
  closedStrategiesSubject: BehaviorSubject<Strategy[]> = new BehaviorSubject<Strategy[]>([]);
  strategiesSubject: BehaviorSubject<Strategy[]> = new BehaviorSubject<Strategy[]>([]);

  constructor(
    private http: HttpClient,
    private investmentsService: InvestmentsService
  ) { }

  getActive(page: number = 1): Observable<Strategy[]> {
    const options: object = {
      Filter: { IsActive: true },
      Pagination: { CurrentPage: page }
    };

    this.http.post(`${CONFIG.baseApiUrl}/myStrategies.search`, options).subscribe((response: any) => {
      const strategies: Strategy[] = [];

      response.Strategies.forEach((s: any) => {
        strategies.push(this.createStrategy(s));
      });

      this.activeStrategiesSubject.next(strategies);
    });

    return this.activeStrategiesSubject.asObservable();
  }

  getClosed(page: number = 1): Observable<Strategy[]> {
    const options: object = {
      Filter: { IsActive: false },
      Pagination: { CurrentPage: page }
    };

    this.http.post(`${CONFIG.baseApiUrl}/myStrategies.search`, options).subscribe((response: any) => {
      const strategies: Strategy[] = [];

      response.Strategies.forEach((s: any) => {
        strategies.push(this.createStrategy(s));
      });

      this.closedStrategiesSubject.next(strategies);
    });

    return this.closedStrategiesSubject.asObservable();
  }

  getAll(page: number = 1): Observable<Strategy[]> {
    const options: object = {
      Filter: { IsActive: false },
      Pagination: { CurrentPage: page }
    };

    this.http.post(`${CONFIG.baseApiUrl}/myStrategies.search`, options).subscribe((response: any) => {
      const strategies: Strategy[] = [];

      response.Strategies.forEach((s: any) => {
        strategies.push(this.createStrategy(s));
      });

      this.strategiesSubject.next(strategies);
    });

    return this.strategiesSubject.asObservable();
  }

  get(id: number): Observable<Strategy> {
    const options: object = {
      Filter: { ID: id }
    };

    return this.http.post(`${CONFIG.baseApiUrl}/myStrategies.search`, options).pipe(map((response: any) => {
      return this.createStrategy(response.Strategies.find(s => s.ID.toString() === id.toString()));
    }));
  }

  getChart(chartOptions: ChartOptions): Observable<any> {
    const options: any = {
      StrategyID: chartOptions.strategyID,
      MaxPoints: chartOptions.maxPoints,
      chartType: chartOptions.chartType,
      chartSize: chartOptions.chartSize
    };

    return this.http.post(`${CONFIG.baseApiUrl}/charts.get`, options);
  }

  private createStrategy(strategyObj: any): Strategy {
    const account = this.investmentsService.createInvestment(strategyObj.Account);
    account.strategy = { id: strategyObj.ID, name: strategyObj.Name };

    const offer: Offer = new Offer(
      strategyObj.Offer.Commission,
      strategyObj.Offer.Fee
    );

    return new Strategy(
      strategyObj.ID,
      strategyObj.Name,
      strategyObj.DTCreated,
      strategyObj.DTStat,
      strategyObj.PartnerShare,
      strategyObj.Status,
      strategyObj.Yield,
      strategyObj.Accounts,
      strategyObj.Symbols,
      account,
      offer
    );
  }

  add(strategy: object) {
    return this.http.post(`${CONFIG.baseApiUrl}/myStrategies.add`, strategy).pipe(map((response: any) => {
      console.log(response);
    }));
  }

  fund(accountID: number, amount: number) {
    return this.http.post(`${CONFIG.baseApiUrl}/accounts.fund`, {AccountID: accountID, Amount: amount}).pipe(map((response: any) => {
      console.log(response);
    }));
  }

  pause(strategyId: number) {
    return this.http.post(`${CONFIG.baseApiUrl}/myStrategies.pause`, {StrategyID: strategyId});
  }

  resume(strategyId: number) {
    return this.http.post(`${CONFIG.baseApiUrl}/myStrategies.resume`, {StrategyID: strategyId});
  }
}
