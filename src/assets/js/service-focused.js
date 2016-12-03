if( typeof __mevServiceRelationshipMapper !== 'object' ){
    __mevServiceRelationshipMapper = {};
}

(function(){
    __mevServiceRelationshipMapper.renderEventFocusedMap = render;

    function render( params ) {
        var mapElement = params.mapElement;

        // Some constants
        var WIDTH = 1200,
            HEIGHT = 900,
            SHOW_THRESHOLD = 1.1;

        // Variables keeping graph state
        var activeNode = undefined;
        var currentOffset = { x : 0, y : 0 };
        var currentZoom = 1.0;

        // The D3.js scales
        var xScale = d3.scale.linear()
            .domain([0, WIDTH])
            .range([0, WIDTH]);
        var yScale = d3.scale.linear()
            .domain([0, HEIGHT])
            .range([0, HEIGHT]);
        var zoomScale = d3.scale.linear()
            .domain([1,6])
            .range([1,6])
            .clamp(true);

        /* .......................................................................... */

        // The D3.js force-directed layout
        var force = d3.layout.force()
            .charge(-2000)
            .size( [WIDTH, HEIGHT] )
            .linkStrength( function(d,idx) { return d.weight; } );

        // Add to the page the SVG element that will contain the movie network
        var svg = d3.select(mapElement).append("svg:svg")
            .attr('xmlns','http://www.w3.org/2000/svg')
            .attr("width", WIDTH)
            .attr("height", HEIGHT)
            .attr("id","graph")
            .attr("viewBox", "0 0 " + WIDTH + " " + HEIGHT )
            .attr("preserveAspectRatio", "xMidYMid meet");


        /* ....................................................................... */

        // Get the current size & offset of the browser's viewport window
        function getViewportSize( w ) {
            w = w || window;
            if( w.innerWidth != null )
                return { w: w.innerWidth,
                    h: w.innerHeight,
                    x : w.pageXOffset,
                    y : w.pageYOffset };
            var d = w.document;
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


        function formatDataForD3( services ){
            var formatted = {};
            var publishLookup = {};

            formatted.nodes = parseNodes(services);
            formatted.links = createLinks(formatted.nodes);


            function parseNodes( services ){
                var nodes = [];

                var servicesLength = services.length;
                for( var i = 0; i < servicesLength; i++ ){
                    var svc = services[i];

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
                    var publishLength = svc.events.publish.length;
                    for( var j = 0; j < publishLength; j++ ){
                        var event = svc.events.publish[j];

                        if( typeof publishLookup[event.namespace + event.topic] !== 'object' ){
                            publishLookup[event.namespace + event.topic] = [];
                        }

                        publishLookup[event.namespace + event.topic].push(i);
                    }
                }

                return nodes;
            }

            function createLinks( nodes ){
                var links = [];

                var nodesLength = nodes.length;
                for( var i = 0; i < nodesLength; i++ ){
                    var node = nodes[i];

                    var consumeLength = node.consume.length;
                    for( var j = 0; j < consumeLength; j++ ){
                        var event = node.consume[j];

                        if( typeof publishLookup[event.namespace + event.topic] === 'object' ){
                            var publishEvents = publishLookup[event.namespace + event.topic];

                            var publishEventsLength = publishEvents.length;
                            for( var k = 0; k < publishEventsLength; k++ ){
                                var publishEventIdx = publishEvents[k];

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

            return formatted;
        }



        // *************************************************************************

        d3.json(
            params.jsonSource,
            function(_data) {

                var data = formatDataForD3(_data);

                // Declare the variables pointing to the node & link arrays
                var nodeArray = data.nodes;
                var linkArray = data.links;

                var minLinkWeight =
                    Math.min.apply( null, linkArray.map( function(n) {return n.weight;} ) );
                var maxLinkWeight =
                    Math.max.apply( null, linkArray.map( function(n) {return n.weight;} ) );

                // Add the node & link arrays to the layout, and start it
                force
                    .nodes(nodeArray)
                    .links(linkArray)
                    .start();

                // A couple of scales for node radius & edge width
                var node_size = d3.scale.linear()
                    .domain([5,10])	// we know score is in this domain
                    .range([1,16])
                    .clamp(true);
                var edge_width = d3.scale.pow().exponent(8)
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

                var networkGraph = svg.append('svg:g').attr('class','grpParent');

                // links: simple lines
                var graphLinks = networkGraph.append('svg:g').attr('class','grp gLinks')
                    .selectAll("line")
                    .data(linkArray, function(d) {return d.source.id+'-'+d.target.id;} )
                    .enter().append("line")
                    .style('stroke-width', function(d) { return edge_width(d.weight);} )
                    .attr("class", "link")

                        .attr("stroke", "black")
                        .attr("marker-end", "url(#triangle)")
                    ;




                // nodes: an SVG circle
                var graphNodes = networkGraph.append('svg:g').attr('class','grp gNodes')
                    .selectAll("circle")
                    .data( nodeArray, function(d){ return d.id; } )
                    .enter().append("svg:circle")
                    .attr('id', function(d) { return "c" + d.index; } )
                    .attr('class', function(d) { return 'node level'+d.level;} )
                    .attr('r', function(d) { return node_size(d.size || 3); } )
                    .attr('pointer-events', 'all')
                    //.on("click", function(d) { highlightGraphNode(d,true,this); } )
                    .on("click", function(data) {

                        var html = '';

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

                        console.log('on click event', data);

                    })
                    .on("mouseover", function(d) { highlightGraphNode(d,true,this);  } )
                    .on("mouseout",  function(d) { highlightGraphNode(d,false,this); } );

                // labels: a group with two SVG text: a title and a shadow (as background)
                var graphLabels = networkGraph.append('svg:g').attr('class','grp gLabel')
                    .selectAll("g.label")
                    .data( nodeArray, function(d){return d.label} )
                    .enter().append("svg:g")
                    .attr('id', function(d) { return "l" + d.index; } )
                    .attr('class','label');

                var shadows = graphLabels.append('svg:text')
                    .attr('x','-2em')
                    .attr('y','-.3em')
                    .attr('pointer-events', 'none') // they go to the circle beneath
                    .attr('id', function(d) { return "lb" + d.index; } )
                    .attr('class','nshadow')
                    .text( function(d) { return d.label; } );

                var labels = graphLabels.append('svg:text')
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
                    circle = d3.select( '#c' + node.index );
                    label  = d3.select( '#l' + node.index );

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
                /* Move all graph elements to its new positions. Triggered:
                 - on node repositioning (as result of a force-directed iteration)
                 - on translations (user is panning)
                 - on zoom changes (user is zooming)
                 - on explicit node highlight (user clicks in a movie panel link)
                 Set also the values keeping track of current offset & zoom values
                 */
                function repositionGraph( off, z, mode ) {

                    // do we want to do a transition?
                    var doTr = (mode == 'move');

                    // drag: translate to new offset
                    if( off !== undefined &&
                        (off.x != currentOffset.x || off.y != currentOffset.y ) ) {
                        g = d3.select('g.grpParent')
                        if( doTr )
                            g = g.transition().duration(500);
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
                    e = doTr ? graphLinks.transition().duration(500) : graphLinks;
                    e
                        .attr("x1", function(d) { return z*(d.source.x); })
                        .attr("y1", function(d) { return z*(d.source.y); })
                        .attr("x2", function(d) { return z*(d.target.x); })
                        .attr("y2", function(d) { return z*(d.target.y); });

                    // move nodes
                    n = doTr ? graphNodes.transition().duration(500) : graphNodes;
                    n
                        .attr("transform", function(d) { return "translate("
                            +z*d.x+","+z*d.y+")" } );
                    // move labels
                    l = doTr ? graphLabels.transition().duration(500) : graphLabels;
                    l
                        .attr("transform", function(d) { return "translate("
                            +z*d.x+","+z*d.y+")" } );
                }


                /* --------------------------------------------------------------------- */
                /* Perform drag
                 */
                function dragmove(d) {
                    offset = { x : currentOffset.x + d3.event.dx,
                        y : currentOffset.y + d3.event.dy };
                    repositionGraph( offset, undefined, 'drag' );
                }


                /* --------------------------------------------------------------------- */
                /* Perform zoom. We do "semantic zoom", not geometric zoom
                 * (i.e. nodes do not change size, but get spread out or stretched
                 * together as zoom changes)
                 */
                function doZoom( increment ) {
                    newZoom = increment === undefined ? d3.event.scale
                        : zoomScale(currentZoom+increment);
                    if( currentZoom == newZoom )
                        return;	// no zoom change

                    // See if we cross the 'show' threshold in either direction
                    if( currentZoom<SHOW_THRESHOLD && newZoom>=SHOW_THRESHOLD )
                        svg.selectAll("g.label").classed('on',true);
                    else if( currentZoom>=SHOW_THRESHOLD && newZoom<SHOW_THRESHOLD )
                        svg.selectAll("g.label").classed('on',false);

                    // See what is the current graph window size
                    s = getViewportSize();
                    width  = s.w<WIDTH  ? s.w : WIDTH;
                    height = s.h<HEIGHT ? s.h : HEIGHT;

                    // Compute the new offset, so that the graph center does not move
                    zoomRatio = newZoom/currentZoom;
                    newOffset = { x : currentOffset.x*zoomRatio + width/2*(1-zoomRatio),
                        y : currentOffset.y*zoomRatio + height/2*(1-zoomRatio) };

                    // Reposition the graph
                    repositionGraph( newOffset, newZoom, "zoom" );
                }
                /* --------------------------------------------------------------------- */

                /* process events from the force-directed graph */
                force.on("tick", function() {
                    repositionGraph(undefined,undefined,'tick');
                });

                // need to zoom to auto show labels
                doZoom(0.2);

            });




    } // end of D3ok()

})();
