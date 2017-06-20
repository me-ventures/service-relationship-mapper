import {Component, OnInit} from '@angular/core';
import {
    RelationshipsService,
    ServiceData
} from "../../service/RelationshipsService";
import {ReplaySubject} from "rxjs/ReplaySubject";


@Component({
    selector: 'service-map',
    templateUrl: './service-map.component.html',
    styleUrls: ['./service-map.component.css']
})
export class ServiceMapComponent implements OnInit {
    private servicesData : ReplaySubject<ServiceData[]> = new ReplaySubject(1);

    constructor(
        private relationshipService : RelationshipsService
    ){

    }

    ngOnInit(): void {
        this.relationshipService.refreshServicesData();

        this.servicesData = this.relationshipService.getServicesData();

        this.servicesData
            .subscribe(servicesData => {
                console.log('***', servicesData);
            })
    }

}
