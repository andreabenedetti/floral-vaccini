d3.csv("data.csv").then(data => {
  var r = 1.2
  var w = 800, h = 800
  const radius = w/2;
  const hyp2 = Math.pow(radius, 2)

  var colour = d3.scaleOrdinal(d3.schemeSet3)
  	.domain(d3.map(data, d => d.category));

  var ringColor = d3.scaleOrdinal(d3.schemeSet3)
  	.domain(d3.map(data, d => d.ring));

  var svg = d3.select('#graph')
    .html('')
    .append('svg')
    .attr("width", w)
  	.attr("height", h)
    .style("background", "GhostWhite")

  //square path starts at mid point on the left side
  // var square = 'M 50,400 L50,50 L750,50 L750,750 50,750 z'

  let square = "M400,540.3c-77.5,0-140.3-62.8-140.3-140.3S322.5,259.7,400,259.7S540.3,322.5,540.3,400S477.5,540.3,400,540.3z";

  let anelloPath = "M400,648c-137,0-248-111-248-248s111-248,248-248s248,111,248,248S537,648,400,648z";

  var shape = 'square'

  var squareToCircle = flubber.toCircle(square, 400, 400, 150)
  var circleToSquare = flubber.fromCircle(400, 400, 150, square)

  var path = svg.append('path')
    .attr("d", square)

  var anello = svg.append('path')
    .attr("d", anelloPath)

  var innerRing = path.node();
  let outerRing = anello.node();

  var innerLength = d3.scalePoint()
  	.domain(d3.map(data, d => d.age))
    .range([0, innerRing.getTotalLength()])

  var outerLength = d3.scalePoint()
  	.domain(d3.map(data, d => d.age))
    .range([0, outerRing.getTotalLength()])

  var scaleX = function(d){
    if(d.ring == "inner") {
      return innerRing.getPointAtLength(innerLength(d.age)).x
    } else {
      return outerRing.getPointAtLength(outerLength(d.age)).x
    }
  }

  var scaleY = function(d){
    if(d.ring == "inner") {
      return innerRing.getPointAtLength(innerLength(d.age)).y
    } else {
      return outerRing.getPointAtLength(outerLength(d.age)).y
    }
  }

  let nodes = [];

  data.forEach(d => {
    for (let i = 0; i < d.value; i+=150) {
      nodes.push({
        ring: d.ring,
        cluster: d.age,
        age: d.age,
        category: d.category
      })
    }
  });

  console.log(nodes);

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
    .style('stroke', "OrangeRed")
    .style('stroke-width', 1)
    .style('fill-opacity', 1)
    .attr('stroke-linejoin', 'round');

  var bees = svg.append("g").selectAll('.bee')
      .data(nodes)
      .enter()
      .append('circle')
  		.attr("class", "bee")
      .attr("r", r)
  		.style("fill", d => ringColor(d.ring))

  updateSwarm(550);

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
        .force('collide', d3.forceCollide(r+.5))
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

        // = pythag(r, d.y, d.x)

  }

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


}).catch(error => {
  console.log(error)
})
