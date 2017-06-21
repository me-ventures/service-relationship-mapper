import {Component, OnInit} from '@angular/core';
import {
    RelationshipsService,
    ServiceData, ServiceDataEvent
} from "../../service/RelationshipsService";
import {ReplaySubject} from "rxjs/ReplaySubject";


@Component({
    selector: 'service-map',
    templateUrl: './service-map.component.html',
    styleUrls: ['./service-map.component.css']
})
export class ServiceMapComponent implements OnInit {
    private servicesData : ReplaySubject<ServiceData[]> = new ReplaySubject(1);
    private nodes : Node[] = [];
    private links : Link[] = [];
    private publishLookup : number[] = [];

    constructor(
        private relationshipService : RelationshipsService
    ){

    }

    ngOnInit(): void {
        this.relationshipService.refreshServicesData();

        this.servicesData = this.relationshipService.getServicesData();

        this.servicesData
            .subscribe(( servicesData : ServiceData[] ) => {
                console.log('***', servicesData);

                this.nodes = this.parseNodes(servicesData);
                this.links = this.createLinks(this.nodes);

                console.log('nodes', this.nodes);
                console.log('publish lookup', this.publishLookup);
                console.log('links', this.links);
            })
    }

    private parseNodes( services : ServiceData[] ) : Node[] {
        let nodes = [];
        let publishLookup = this.publishLookup;

        let servicesLength = services.length;
        for(let i = 0; i < servicesLength; i++ ){
            let svc = services[i];

            nodes.push({
                index: i,
                label: svc.service.name,
                size: 9,
                links: [],
                id: i,

                // useful data
                consume: svc.events.consume,
                publish: svc.events.publish
            });

            // populate publish lookup with svc publish events
            let publishLength = svc.events.publish.length;
            for(let j = 0; j < publishLength; j++ ){
                let event = svc.events.publish[j];

                if( typeof publishLookup[event.namespace + event.topic] !== 'object' ){
                    publishLookup[event.namespace + event.topic] = [];
                }

                publishLookup[event.namespace + event.topic].push(i);
            }
        }

        return nodes;
    }

    private createLinks( nodes : Node[] ) : Link[] {
        let links = [];
        let publishLookup = this.publishLookup;

        let nodesLength = nodes.length;
        for(let i = 0; i < nodesLength; i++ ){
            let node = nodes[i];

            let consumeLength = node.consume.length;
            for(let j = 0; j < consumeLength; j++ ){
                let event = node.consume[j];

                if( typeof publishLookup[event.namespace + event.topic] === 'object' ){
                    let publishEvents = publishLookup[event.namespace + event.topic];

                    let publishEventsLength = publishEvents.length;
                    for(let k = 0; k < publishEventsLength; k++ ){
                        let publishEventIdx = publishEvents[k];

                        links.push({
                            source: publishEventIdx,
                            target: node.index,
                            weight: 1
                        });
                    }
                }
            }

        }

        return links;
    }

}

export interface Node {
    index: number,
    label: string,
    size: number,
    id: number,

    // useful data
    consume: ServiceDataEvent[],
    publish: ServiceDataEvent[]
}

export interface Link {
    source: number,
    target: number,
    weight: number
}



