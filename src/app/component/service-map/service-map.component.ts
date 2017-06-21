import {Component, OnInit} from '@angular/core';
import {
    RelationshipsService,
    ServiceData, ServiceDataEvent
} from "../../service/RelationshipsService";
import {ReplaySubject} from "rxjs/ReplaySubject";

import * as d3 from 'd3';
import * as $ from 'jquery';
import {ZoomEvent, DragEvent, layout} from "d3";

@Component({
    selector: 'service-map',
    templateUrl: './service-map.component.html',
    styleUrls: ['./service-map.component.css']
})
export class ServiceMapComponent implements OnInit {
    private servicesData : ReplaySubject<ServiceData[]> = new ReplaySubject(1);
    private nodes : SvcNode[] = [];
    private links : SvcLink[] = [];
    private publishLookup : number[] = [];

    private width : number = 1200;
    private height : number = 900;
    private showThreshold : number = 1.1;

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

                this.renderMap();
            })
    }

    private renderMap() : void {

        let params = {
            mapElement: document.getElementById('service-relationship-map'),
            infoElement: document.getElementById('service-relationship-info')
        };

        let WIDTH = this.width;
        let HEIGHT = this.height;
        let SHOW_THRESHOLD = this.showThreshold;

        // Variables keeping graph state
        let activeNode = undefined;
        let currentOffset = { x : 0, y : 0 };
        let currentZoom = 1.0;

        // The D3.js scales
        let xScale = d3.scale.linear()
            .domain([0, WIDTH])
            .range([0, WIDTH]);
        let yScale = d3.scale.linear()
            .domain([0, HEIGHT])
            .range([0, HEIGHT]);
        let zoomScale = d3.scale.linear()
            .domain([1,6])
            .range([1,6])
            .clamp(true);


        // The D3.js force-directed layout
        let force = d3.layout.force()
            .charge(-2000)
            .size( [this.width, this.height] )
            .linkStrength(( d, idx ) => {
                // @todo: variable link strength
                return 1;
            });


        // Add to the page the SVG element that will contain the service map
        let svg = d3.select(document.getElementById('service-relationship-map'))
            .append('svg:svg');

        svg
            .attr('xmlns','http://www.w3.org/2000/svg')
            .attr("width", this.width)
            .attr("height", this.height)
            .attr("id","graph")
            .attr("viewBox", "0 0 " + this.width + " " + this.height)
            .attr("preserveAspectRatio", "xMidYMid meet");


        // Declare the variables pointing to the node & link arrays
        let nodeArray = this.nodes;
        let linkArray = this.links;

        let minLinkWeight =
            Math.min.apply( null, linkArray.map( function(n) {return n.weight;} ) );
        let maxLinkWeight =
            Math.max.apply( null, linkArray.map( function(n) {return n.weight;} ) );


        // Add the node & link arrays to the layout, and start it
        force
            .nodes(nodeArray)
            .links(linkArray)
            .start();

        // A couple of scales for node radius & edge width
        let node_size = d3.scale.linear()
            .domain([5,10])	// we know score is in this domain
            .range([1,16])
            .clamp(true);
        let edge_width = d3.scale.pow().exponent(8)
            .domain( [minLinkWeight,maxLinkWeight] )
            .range([1,3])
            .clamp(true);


        /* Add drag & zoom behaviours */
        svg.call( d3.behavior.drag()
            .on("drag",dragmove) );
        svg.call( d3.behavior.zoom()
            .x(xScale)
            .y(yScale)
            .scaleExtent([1, 6])
            .on("zoom", doZoom) );


        // arrow heads
        svg.append("svg:defs").append("svg:marker")
            .attr("id", "triangle")
            .attr("refX", 55)
            .attr("refY", 6)
            .attr("markerWidth", 30)
            .attr("markerHeight", 30)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M 0 0 12 6 0 12 3 6")
            .style("fill", "black");


        // ------- Create the elements of the layout (links and nodes) ------
        let networkGraph = svg.append('svg:g').attr('class','grpParent');

        // links: simple lines
        let graphLinks = networkGraph.append('svg:g').attr('class','grp gLinks')
            .selectAll("line")
            .data(linkArray)
            .enter().append("line")
            .style('stroke-width', function(d) { return edge_width(d.weight);} )
            .attr("class", "link")

            .attr("stroke", "black")
            .attr("marker-end", "url(#triangle)")
        ;

        // nodes: an SVG circle
        let graphNodes = networkGraph.append('svg:g').attr('class','grp gNodes')
            .selectAll("circle")
            .data( nodeArray )
            .enter().append("svg:circle")
            .attr('id', function(d) { return "c" + d.index; } )
            .attr('class', function(d) {
                return 'node level' + d.level || ''
            })
            .attr('r', function(d) { return node_size(d.size || 3); } )
            .attr('pointer-events', 'all')
            //.on("click", function(d) { highlightGraphNode(d,true,this); } )
            .on("click", function(data) {

                let html = '';

                html += '<table>';

                html += renderName();
                html += renderConsume();
                html += renderPublish();


                html += '</table>';

                $(params.infoElement).html(html);


                function renderName(){
                    return (
                        '<tr>' +
                        '<td>Name</td>' +
                        '<td>' + data.label +'</td>' +
                        '</tr>'
                    );
                }

                function escapeHtml(unsafe) {
                    return unsafe
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;")
                        .replace(/"/g, "&quot;")
                        .replace(/'/g, "&#039;");
                }

                function renderConsume(){
                    var html = (
                        '<tr>' +
                        '<td>Consume</td>'
                    );

                    html += '<td>';
                    var consumeLength = data.consume.length;
                    for( var i = 0; i < consumeLength; i++ ){
                        var event = data.consume[i];
                        html += '<div>';
                        html += '<strong>' + event.namespace + '.' + event.topic + '</strong><br />';
                        html += event.shared
                            ? '<span class="shared">Shared</span>'
                            : '<span class="not-shared">Not Shared</span>' ;

                        // example
                        if( typeof event.example === 'object' ){
                            html += '<pre>';
                            html += escapeHtml(JSON.stringify(event.example, null, 4));
                            html += '</pre>';
                        }

                        html += '</div>';
                    }
                    html += '</td>';

                    html += '</tr>';

                    return html;
                }

                function renderPublish(){
                    var html = (
                        '<tr>' +
                        '<td>Publish</td>'
                    );

                    html += '<td>';
                    var publishLength = data.publish.length;
                    for( var i = 0; i < publishLength; i++ ){
                        var event = data.publish[i];
                        html += '<div>';
                        html += '<strong>' + event.namespace + '.' + event.topic + '</strong><br />';

                        // example
                        if( typeof event.example === 'object' ){
                            html += '<pre>';
                            html += escapeHtml(JSON.stringify(event.example, null, 4));
                            html += '</pre>';
                        }

                        html += '</div>'
                    }
                    html += '</td>';

                    html += '</tr>';

                    return html;
                }

                //console.log('on click event', data);

            })
            .on("mouseover", function(d) { highlightGraphNode(d,true);  } )
            .on("mouseout",  function(d) { highlightGraphNode(d,false); } );


        // labels: a group with two SVG text: a title and a shadow (as background)
        let graphLabels = networkGraph.append('svg:g').attr('class','grp gLabel')
            .selectAll("g.label")
            .data( nodeArray, function(d){return d.label} )
            .enter().append("svg:g")
            .attr('id', function(d) { return "l" + d.index; } )
            .attr('class','label');

        let shadows = graphLabels.append('svg:text')
            .attr('x','-2em')
            .attr('y','-.3em')
            .attr('stroke', 'white')
            .attr('stroke-width', '0.2em')
            .attr('pointer-events', 'none') // they go to the circle beneath
            .attr('id', function(d) { return "lb" + d.index; } )
            .attr('class','nshadow')
            .text( function(d) { return d.label; } );

        let labels = graphLabels.append('svg:text')
            .attr('x','-2em')
            .attr('y','-.3em')
            .attr('pointer-events', 'none') // they go to the circle beneath
            .attr('id', function(d) { return "lf" + d.index; } )
            .attr('class','nlabel')
            .text( function(d) { return d.label; } );


        /* --------------------------------------------------------------------- */
        /* Select/unselect a node in the network graph.
         Parameters are:
         - node: data for the node to be changed,
         - on: true/false to show/hide the node
         */
        function highlightGraphNode( node, on )
        {
            //if( d3.event.shiftKey ) on = false; // for debugging

            // If we are to activate a movie, and there's already one active,
            // first switch that one off
            if( on && activeNode !== undefined ) {
                highlightGraphNode( nodeArray[activeNode], false );
            }

            // locate the SVG nodes: circle & label group
            let circle = d3.select( '#c' + node.index );
            let label  = d3.select( '#l' + node.index );

            // activate/deactivate the node itself
            circle
                .classed( 'main', on );
            label
                .classed( 'on', on || currentZoom >= SHOW_THRESHOLD );
            label.selectAll('text')
                .classed( 'main', on );

            // activate all siblings
            Object(node.links).forEach( function(id) {
                d3.select("#c"+id).classed( 'sibling', on );
                label = d3.select('#l'+id);
                label.classed( 'on', on || currentZoom >= SHOW_THRESHOLD );
                label.selectAll('text.nlabel')
                    .classed( 'sibling', on );
            } );

            // set the value for the current active node
            activeNode = on ? node.index : undefined;
        }


        /* --------------------------------------------------------------------- */
        /* Perform drag
         */
        function dragmove() {

            // fix for missing typing DragEvent on d3.event
            let event = d3.event as DragEvent;

            let offset = {
                x : currentOffset.x + event.dx,
                y : currentOffset.y + event.dy
            };
            repositionGraph( offset, undefined, 'drag' );
        }


        /* --------------------------------------------------------------------- */
        /* Perform zoom. We do "semantic zoom", not geometric zoom
         * (i.e. nodes do not change size, but get spread out or stretched
         * together as zoom changes)
         */
        function doZoom( increment ) {

            // fix for missing typing ZoomEvent on d3.event
            let event = d3.event as ZoomEvent;

            let newZoom = increment === undefined ? event.scale
                : zoomScale(currentZoom+increment);
            if( currentZoom == newZoom )
                return;	// no zoom change

            // See if we cross the 'show' threshold in either direction
            if( currentZoom<SHOW_THRESHOLD && newZoom>=SHOW_THRESHOLD )
                svg.selectAll("g.label").classed('on',true);
            else if( currentZoom>=SHOW_THRESHOLD && newZoom<SHOW_THRESHOLD )
                svg.selectAll("g.label").classed('on',false);

            // See what is the current graph window size
            let s = getViewportSize();
            let width  = s.w<WIDTH  ? s.w : WIDTH;
            let height = s.h<HEIGHT ? s.h : HEIGHT;

            // Compute the new offset, so that the graph center does not move
            let zoomRatio = newZoom/currentZoom;
            let newOffset = { x : currentOffset.x*zoomRatio + width/2*(1-zoomRatio),
                y : currentOffset.y*zoomRatio + height/2*(1-zoomRatio) };

            // Reposition the graph
            repositionGraph( newOffset, newZoom, "zoom" );
        }
        /* --------------------------------------------------------------------- */

        /* --------------------------------------------------------------------- */
        /* Move all graph elements to its new positions. Triggered:
         - on node repositioning (as result of a force-directed iteration)
         - on translations (user is panning)
         - on zoom changes (user is zooming)
         - on explicit node highlight (user clicks in a movie panel link)
         Set also the values keeping track of current offset & zoom values
         */
        function repositionGraph( off, z, mode ) {

            // do we want to do a transition?
            let doTr = (mode == 'move');

            // drag: translate to new offset
            if( off !== undefined &&
                (off.x != currentOffset.x || off.y != currentOffset.y ) ) {
                let g = d3.select('g.grpParent');

                if( doTr ){
                    g.transition().duration(500);
                }

                g.attr("transform", function(d) { return "translate("+
                    off.x+","+off.y+")" } );
                currentOffset.x = off.x;
                currentOffset.y = off.y;
            }

            // zoom: get new value of zoom
            if( z === undefined ) {
                if( mode != 'tick' )
                    return;	// no zoom, no tick, we don't need to go further
                z = currentZoom;
            }
            else
                currentZoom = z;

            // move edges
            let e = doTr ? graphLinks.transition().duration(500) : graphLinks;
            e
                .attr("x1", function(d) {
                    // fix for missing type
                    let forceNode = d.source as layout.force.Node;

                    return z*(forceNode.x);
                })
                .attr("y1", function(d) {
                    // fix for missing type
                    let forceNode = d.source as layout.force.Node;

                    return z*(forceNode.y);
                })
                .attr("x2", function(d) {
                    // fix for missing type
                    let forceNode = d.target as layout.force.Node;

                    return z*(forceNode.x);
                })
                .attr("y2", function(d) {
                    // fix for missing type
                    let forceNode = d.target as layout.force.Node;

                    return z*(forceNode.y);
                });

            // move nodes
            let n = doTr ? graphNodes.transition().duration(500) : graphNodes;
            n.attr("transform", function(d) {
                return "translate(" +z*d.x+","+z*d.y+")"
            });

            // move labels
            let l = doTr ? graphLabels.transition().duration(500) : graphLabels;
            l.attr("transform", function(d) {
                return "translate(" +z*d.x+","+z*d.y+")"
            });
        }



        // Get the current size & offset of the browser's viewport window
        function getViewportSize( w ?: any ) {
            w = w || window;
            if( w.innerWidth != null )
                return { w: w.innerWidth,
                    h: w.innerHeight,
                    x : w.pageXOffset,
                    y : w.pageYOffset };
            let d = w.document;
            if( document.compatMode == "CSS1Compat" )
                return { w: d.documentElement.clientWidth,
                    h: d.documentElement.clientHeight,
                    x: d.documentElement.scrollLeft,
                    y: d.documentElement.scrollTop };
            else
                return { w: d.body.clientWidth,
                    h: d.body.clientHeight,
                    x: d.body.scrollLeft,
                    y: d.body.scrollTop};
        }

        /* process events from the force-directed graph */
        force.on("tick", function() {
            repositionGraph(undefined,undefined,'tick');
        });

        // need to zoom to auto show labels
        doZoom(0.2);
    }

    private parseNodes( services : ServiceData[] ) : SvcNode[] {
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

    private createLinks( nodes : SvcNode[] ) : SvcLink[] {
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

export interface SvcNode {
    index: number,
    label: string,
    size: number,
    id: number,

    // useful data
    consume: ServiceDataEvent[],
    publish: ServiceDataEvent[],

    px ?: number,
    py ?: number,
    weight ?: number,
    x ?: number,
    y ?: number,

    level ?: number
}

export interface SvcLink {
    source: number,
    target: number,
    weight: number
}



