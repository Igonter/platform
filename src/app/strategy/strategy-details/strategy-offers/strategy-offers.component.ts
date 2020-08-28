import {Component, OnInit} from '@angular/core';
import {DataService} from "@app/services/data.service";
import {ActivatedRoute} from "@angular/router";
import {takeUntil} from "rxjs/internal/operators";
import {Subject} from "rxjs";
import {Offer, Paginator, Strategy, TableColumn} from "@app/models";
import {BsModalRef, BsModalService, ModalOptions} from "ngx-bootstrap";
import {StrategyOfferCreateComponent} from "./strategy-offer-create/strategy-offer-create.component";
import {NotificationsService} from "@app/services/notifications.service";
import {TableHeaderRow} from "@app/models/table-header-row";
import {CustomDatePipe} from "@app/pipes/custom-date.pipe";
import {PercentPipe} from '@angular/common';

@Component({
    selector: 'app-strategy-offers',
    templateUrl: './strategy-offers.component.html',
    styleUrls: ['./strategy-offers.component.scss']
})
export class StrategyOffersComponent implements OnInit {
    destroy$ = new Subject();
    args: any;
    strategy: Strategy;
    modalRef: BsModalRef;


    // component data
    offers: Offer[];

    // table settings
    tableHeader: TableHeaderRow[] = [
        new TableHeaderRow([
            new TableColumn({property: 'ID', label: 'ID'}),
            new TableColumn({
                property: 'DTCreated',
                label: 'common.table.label.dtCreate',
                pipe: {pipe: CustomDatePipe}
            }),
            new TableColumn({property: 'link', label: 'common.table.label.link'}),
            new TableColumn({property: 'commissionRate', label: 'common.table.label.commissionRate'}),
            new TableColumn({
                property: 'FeeRate',
                label: 'investment.details.strategy.feeRate',
                pipe: {pipe: PercentPipe}
            }),
            // new TableColumn({property: 'PartnerShareRate', label: 'common.table.label.partner'}),
            new TableColumn({property: 'OfferStatus', label: 'common.table.label.status'}),
            new TableColumn({property: 'IsPublic', label: 'common.table.label.offer.public'}),
            new TableColumn({property: 'offerManage', label: 'common.table.label.manage'})
        ]),
    ];

    totalFields: string[] = ['account.equity', 'accounts', 'account.intervalPnL', 'feePaid', 'feeToPay'];
    paginator: Paginator = new Paginator({
        perPage: 10,
        currentPage: 1
    });

    constructor(
        public dataService: DataService,
        private modalService: BsModalService,
        private notificationsService: NotificationsService,
        private route: ActivatedRoute
    ) {
    }

    ngOnInit() {
        this.args = {
            strategyId: this.route.parent.params['_value'].id,
            paginator: this.paginator
        };

        this.getStrategy();
        this.getOffers();
    }

    getOfferLink(link: string) {
        return `${location.origin}/strategies/link/${link}`;
    }

    getStrategy() {
        this.dataService.getStrategyByID(this.args)
            .pipe(takeUntil(this.destroy$))
            .subscribe((strategy: Strategy) => {
                console.log('strategy', strategy);
                this.strategy = strategy;
            });
    }

    getOffers(): void {
        this.dataService.getOffers(this.strategy.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe((offers) => {
                this.offers = offers;
            });
    }

    onMakePublic(status: boolean, offer: any) {
        let observer;
        if (!status) {
            observer = this.dataService.setPublicOffer(this.strategy.id);
        }
        if (offer instanceof Offer) {
            observer = this.dataService.setPublicOffer(this.strategy.id, offer.id);
        }

        observer.subscribe((item) => {
            this.notificationsService.open('notify.strategy.offer.change');
            this.dataService.getStrategyByID(this.args)
                .pipe(takeUntil(this.destroy$))
                .subscribe((strategy: Strategy) => {
                    if (!status) {
                        strategy.publicOffer = null;
                    } else {
                      const data = offer;
                      delete data.link;
                      strategy.publicOffer = new Offer(data);
                    }
                    this.strategy = strategy;
                });
            this.getOffers();
        });
    }

    createOffer() {
        const options: ModalOptions = new ModalOptions();

        options.initialState = {
            strategy: this.strategy
        };

        this.modalRef = this.modalService.show(StrategyOfferCreateComponent, options);

        (<StrategyOfferCreateComponent>this.modalRef.content).onClose.subscribe(result => {
            if (result === true) {
                this.dataService.getStrategyByID(this.args);
                this.getOffers();
                // when pressed Yes
            } else if (result === false) {
                // when pressed No
            } else {
                // When closing the modal without no or yes
            }
        });

    }
}
