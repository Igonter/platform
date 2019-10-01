import { Component, OnDestroy } from '@angular/core';
import { StrategyService } from '@app/services/strategy.service';
import { BsModalRef } from 'ngx-bootstrap';
import { Strategy } from '@app/models';
import { Subject } from 'rxjs/index';
import { takeUntil } from 'rxjs/internal/operators';

@Component({
  selector: 'app-strategy-pause',
  templateUrl: './strategy-pause.component.html',
  styleUrls: ['./strategy-pause.component.scss']
})
export class StrategyPauseComponent implements OnDestroy {
  // https://blog.strongbrew.io/rxjs-best-practices-in-angular/#avoiding-memory-leaks
  // here we will unsubscribe from all subscriptions
  destroy$ = new Subject();

  // component data
  strategy: Strategy;

  constructor(
    private strategyService: StrategyService,
    public modalRef: BsModalRef,
  ) { }

  pause(): void {
    this.strategyService.pause(this.strategy.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.strategy.pause();
        this.modalRef.hide();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
  }
}
