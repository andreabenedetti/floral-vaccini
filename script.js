d3.csv("https://docs.google.com/spreadsheets/d/e/2PACX-1vRRNsZ-AEwxUVzupayOR0mlaesn5tgSW6Sczw4KSUNg3MOMELBBXnQDn2J1QB12d0btw5NYMl7iMErh/pub?gid=811486179&single=true&output=csv").then(data => {

  var r = 2.5;
  var w = 1080, h = 1080;
  const radius = w/2;
  const hyp2 = Math.pow(radius, 2);

  let nodes = [];

  data.forEach(d => {
    for (let i = 1; i <= d.value; i+=30) {
      nodes.push({
        ring: d.dose,
        cluster: d.age,
        age: d.age,
        category: d.fornitore
      })
    }
  });

  console.log(nodes);

  let date = d3.max(data, d => d.day);

  console.log(date);

  var colour = d3.scaleOrdinal()
  	.domain(["Vaxzevria (AstraZeneca)", "Moderna", "Pfizer/BioNTech", "Janssen"])
    // Astrazeneca, Moderna, Pfizer
    .range(["#7A875C", "#344534", "#D48086", "#6E92B2"]);


  vaccineBrands = colour.domain();

  console.log(vaccineBrands.length);

  var ringColor = d3.scaleOrdinal()
  	.domain(d3.map(data, d => d.ring))
    .range(["#000", "#FFF"]);

  var svg = d3.select('#graph')
    .html('')
    .append('svg')
    .attr("width", w)
  	.attr("height", h);

    // const frame = svg.append("rect")
    // .attr("width", 1025)
    // .attr("height", 1025)
    // .attr("x", w / 2 - 1025 / 2)
    // .attr("y", h / 2 - 1025 / 2)
    // .attr("stroke", "#333")
    // .attr("stroke-width", 4)
    // .attr("fill", "none");

  let dayScale = d3.scaleOrdinal()
  .domain(d3.map(data, d => d.data));

  let total = d3.rollup(data, v => d3.sum(v, d => d.value));
  let target = 500000;

  let background = d3.scaleLinear()
    .domain([100000, target])
    .range(["#FDF6F0", "#E3DDB8"]);

  console.log(total, target);

  svg.style("background", () => background(total));

  let colorKey = svg.append("g");

  let innerSvg = "M540,329.15c116.45,0,210.85,94.4,210.85,210.85S656.45,750.85,540,750.85S329.15,656.45,329.15,540S423.55,329.15,540,329.15z";

  let outerSvg = "M540,121c231.41,0,419,187.59,419,419S771.41,959,540,959S121,771.41,121,540S308.59,121,540,121z";

  var innerPath = svg.append('path')
    .attr("d", innerSvg)
    .attr("fill", background(total));

  var outerPath = svg.append('path')
    .attr("d", outerSvg)
    .attr("fill", background(total));

  var innerRing = innerPath.node();
  let outerRing = outerPath.node();

  var innerLength = d3.scalePoint()
  	.domain(d3.map(data, d => d.age))
    .range([0, innerRing.getTotalLength()])
    .padding(0.5);

  var outerLength = d3.scalePoint()
  	.domain(d3.map(data, d => d.age))
    .range([0, outerRing.getTotalLength()])
    .padding(0.5);

  var scaleX = function(d){
    if(d.ring == "SUM of prima_dose") {
      return innerRing.getPointAtLength(innerLength(d.age)).x
    } else {
      return outerRing.getPointAtLength(outerLength(d.age)).x
    }
  }

  var scaleY = function(d){
    if(d.ring == "SUM of prima_dose") {
      return innerRing.getPointAtLength(innerLength(d.age)).y
    } else {
      return outerRing.getPointAtLength(outerLength(d.age)).y
    }
  }

  var groups = _(nodes)
    .map('cluster')
    .uniq()
    .sort()
    .value();

  // mutate to add the group
  _.each(nodes, (n, i) => {
    n.group = nodes[i].cluster;
  });



  // now group by group
  const nodeGroups = _.groupBy(nodes, 'group');

  console.log(nodeGroups);

  const hulls = svg
    .append("g")
    .selectAll('path')
    .data(groups)
    .enter()
    .append('path')
    .style('stroke', "none")
    .style('fill', "none")
    .attr("id", d => d);

  var bees = svg.append("g").selectAll('.bee')
      .data(nodes)
      .enter()
      .append('circle')
  		.attr("class", "bee")
      .attr("r", r)
  		.style("fill", d => colour(d.category))
      .attr("id", d => d.age);


  updateSwarm(1000);

  function secondSlide() {
    hulls.style('stroke', "#333")
    .style('stroke-width', 1)
    .attr('stroke-linejoin', 'round');

    bees.style("opacity", 0.5);

    d3.xml("erbario-layout.svg")
    .then(data => {
      svg.node().append(data.documentElement)
    });
  }

  function changeShape() {

    path
      .transition()
  		.duration(15000)
      .attrTween("d", function(){
      		if (shape == 'square') {
            shape = 'circle'
            return squareToCircle;
          } else {
            shape = 'square'
            return circleToSquare;
          }
    	})
  		.tween("attr", function(){
          return function(t) {
          	updateSwarm(100)
         }
  		})
  }

  function updateSwarm(iterations) {

      innerLength.range([0, innerRing.getTotalLength()])
      outerLength.range([0, outerRing.getTotalLength()])

      let simulation = d3.forceSimulation(nodes)
        .force('collide', d3.forceCollide(r+0.5))
        .force('x', d3.forceX(d => scaleX(d)))
        .force('y', d3.forceY(d => scaleY(d)))
        // .alphaDecay(0)
        // .alpha(0.8)

      for (var i = 0; i < iterations; ++i) simulation.tick()

      bees
        .attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; });

      hulls.attr('d', g => {
        let hullPoints = nodeGroups[g].map(n => {
          return [n.x, n.y];
        });

        const hullData = d3.polygonHull(hullPoints);

        if (hullData === null) {
          return;
        }

        hullData.push(hullData[0]);

        return d3.line()(hullData);
      });

  }

  d3.select("#secondSlide").on("click", secondSlide);

  d3.select('#saveButton').on('click', function(){
	var svgString = getSVGString(svg.node());
	svgString2Image( svgString, 2*w, 2*h, 'png', save ); // passes Blob and filesize String to the callback

	function save( dataBlob, filesize ){
		saveAs( dataBlob, `${date}-erbario.png` ); // FileSaver.js function
	}
});

  function pythag(r, b, coord) {

    // force use of b coord that exists in circle to avoid sqrt(x<0)
    b = Math.min(w - r, Math.max(r, b));

    var b2 = Math.pow((b - radius), 2),
        a = Math.sqrt(hyp2 - b2);

    // radius - sqrt(hyp^2 - b^2) < coord < sqrt(hyp^2 - b^2) + radius
    coord = Math.max(radius - a + r,
                Math.min(a + radius - r, coord));

    return coord;
}

function getSVGString( svgNode ) {
	svgNode.setAttribute('xlink', 'http://www.w3.org/1999/xlink');
	var cssStyleText = getCSSStyles( svgNode );
	appendCSS( cssStyleText, svgNode );

	var serializer = new XMLSerializer();
	var svgString = serializer.serializeToString(svgNode);
	svgString = svgString.replace(/(\w+)?:?xlink=/g, 'xmlns:xlink='); // Fix root xlink without namespace
	svgString = svgString.replace(/NS\d+:href/g, 'xlink:href'); // Safari NS namespace fix

	return svgString;

	function getCSSStyles( parentElement ) {
		var selectorTextArr = [];

		// Add Parent element Id and Classes to the list
		selectorTextArr.push( '#'+parentElement.id );
		for (var c = 0; c < parentElement.classList.length; c++)
				if ( !contains('.'+parentElement.classList[c], selectorTextArr) )
					selectorTextArr.push( '.'+parentElement.classList[c] );

		// Add Children element Ids and Classes to the list
		var nodes = parentElement.getElementsByTagName("*");
		for (var i = 0; i < nodes.length; i++) {
			var id = nodes[i].id;
			if ( !contains('#'+id, selectorTextArr) )
				selectorTextArr.push( '#'+id );

			var classes = nodes[i].classList;
			for (var c = 0; c < classes.length; c++)
				if ( !contains('.'+classes[c], selectorTextArr) )
					selectorTextArr.push( '.'+classes[c] );
		}

		// Extract CSS Rules
		var extractedCSSText = "";
		for (var i = 0; i < document.styleSheets.length; i++) {
			var s = document.styleSheets[i];

			try {
			    if(!s.cssRules) continue;
			} catch( e ) {
		    		if(e.name !== 'SecurityError') throw e; // for Firefox
		    		continue;
		    	}

			var cssRules = s.cssRules;
			for (var r = 0; r < cssRules.length; r++) {
				if ( contains( cssRules[r].selectorText, selectorTextArr ) )
					extractedCSSText += cssRules[r].cssText;
			}
		}


		return extractedCSSText;

		function contains(str,arr) {
			return arr.indexOf( str ) === -1 ? false : true;
		}

	}

	function appendCSS( cssText, element ) {
		var styleElement = document.createElement("style");
		styleElement.setAttribute("type","text/css");
		styleElement.innerHTML = cssText;
		var refNode = element.hasChildNodes() ? element.children[0] : null;
		element.insertBefore( styleElement, refNode );
	}
}


function svgString2Image( svgString, width, height, format, callback ) {
	var format = format ? format : 'png';

	var imgsrc = 'data:image/svg+xml;base64,'+ btoa( unescape( encodeURIComponent( svgString ) ) ); // Convert SVG string to data URL

	var canvas = document.createElement("canvas");
	var context = canvas.getContext("2d");

	canvas.width = width;
	canvas.height = height;

	var image = new Image();
	image.onload = function() {
		context.clearRect ( 0, 0, width, height );
		context.drawImage(image, 0, 0, width, height);

		canvas.toBlob( function(blob) {
			var filesize = Math.round( blob.length/1024 ) + ' KB';
			if ( callback ) callback( blob, filesize );
		});


	};

	image.src = imgsrc;
}

}).catch(error => {
  console.log(error)
})
