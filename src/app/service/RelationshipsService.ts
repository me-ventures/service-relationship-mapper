import {Injectable} from "@angular/core";
import {Http, Headers} from "@angular/http";
import {ReplaySubject} from "rxjs/ReplaySubject";
import {Observable} from "rxjs/Observable";
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/toPromise';

@Injectable()
export class RelationshipsService {
    // @todo: make configurable
    private sourceUrl : string = 'http://localhost:3000/relationship';

    private servicesData : ReplaySubject<ServiceData[]> = new ReplaySubject(1);

    constructor(
        private http : Http
    ){

    }

    public getServicesData() : ReplaySubject<ServiceData[]> {
        return this.servicesData;
    }

    private fetchServicesData() : Observable<any> {
        let headers = new Headers();
        headers.append('Content-Type', 'application/json');

        return this.http.get(this.sourceUrl, {headers})
            .map(res => res.json() as any);
    }

    public refreshServicesData() : void {
        this.fetchServicesData()
            .toPromise()
            .then(servicesData => {
                this.servicesData.next(servicesData);
            })
    }
}

export interface ServiceData {
    events: {
        consume: ServiceDataEvent[],
        publish: ServiceDataEvent[]
    },
    service: {
        name: string
    }
}

export interface ServiceDataEvent {
    namespace: string,
    queueName: string,
    schema: string,
    shared: boolean,
    topic: string
}