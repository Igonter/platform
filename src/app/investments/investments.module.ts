import { NgModule } from '@angular/core';
import { InvestmentsComponent } from './investments.component';
import { InvestmentsActiveComponent } from './investments-active/investments-active.component';
import { InvestmentsClosedComponent } from './investments-closed/investments-closed.component';
import { InvestmentsRoutingModule } from './investments.routing';
import { SharedModule } from '@app/shared.module';
import { InvestmentsDetailsComponent } from './investments-details/investments-details.component';
import { InvestmentsDetailsDealsComponent } from './investments-details/investments-details-deals/investments-details-deals.component';
import { InvestmentsDetailsPositionsComponent } from './investments-details/investments-details-positions/investments-details-positions.component';
import { MobileDataViewModule } from '@app/components/mobile-data-view/mobile-data-view.module';

@NgModule({
  declarations: [
    InvestmentsComponent,
    InvestmentsActiveComponent,
    InvestmentsClosedComponent,
    InvestmentsDetailsComponent,
    InvestmentsDetailsDealsComponent,
    InvestmentsDetailsPositionsComponent
  ],
  imports: [
    SharedModule,
    InvestmentsRoutingModule,
    MobileDataViewModule
  ]
})
export class InvestmentsModule { }
