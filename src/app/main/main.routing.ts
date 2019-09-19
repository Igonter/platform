import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MainComponent } from './main.component';

const routes: Routes = [
  { path: '', component: MainComponent, children: [
    { path: '', redirectTo: 'bill' },
    { path: 'bill', loadChildren: '../bill/bill.module#BillModule' },
    { path: 'strategies', loadChildren: '../strategy/strategy.module#StrategyModule' },
    { path: 'manage', loadChildren: '../manage/manage.module#ManageModule' }
  ] }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MainRoutingModule { }
