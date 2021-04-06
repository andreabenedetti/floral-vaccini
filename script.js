d3.csv("https://docs.google.com/spreadsheets/d/e/2PACX-1vRRNsZ-AEwxUVzupayOR0mlaesn5tgSW6Sczw4KSUNg3MOMELBBXnQDn2J1QB12d0btw5NYMl7iMErh/pub?gid=942563243&single=true&output=csv").then(data => {
  console.log(data)

  var r = 2.5
  var w = 1080, h = 1080
  const radius = w/2;
  const hyp2 = Math.pow(radius, 2)

  var colour = d3.scaleOrdinal()
  	.domain(d3.map(data, d => d.category))
    .range(["#B2AC2E", "#A49BD8", "#73BABA"]);

    // "#A49BD8", "#70B1A0", "#7FAEAE", "#FFF", "#000"]);

  var ringColor = d3.scaleOrdinal(d3.schemeSet3)
  	.domain(d3.map(data, d => d.ring));

  let stroke = d3.scaleOrdinal()
  .domain(d3.map(data, d => d.ring))
  .domain(["#000", "#FFF"]);

  var svg = d3.select('#graph')
    .html('')
    .append('svg')
    .attr("width", w)
  	.attr("height", h);

  let dayScale = d3.scaleOrdinal()
  .domain(d3.map(data, d => d.data))

  let total = d3.rollup(data, v => d3.sum(v, d => d.value));
  let days = dayScale.domain().length;
  let target = 500000 * days;

  let background = d3.scaleSqrt()
    .domain([0, target])
    .range(["#394F49", "#EAECD5"]);

  console.log(total, target);

  svg.style("background", () => background(0));

  //square path starts at mid point on the left side
  // var square = 'M 50,400 L50,50 L750,50 L750,750 50,750 z'

  let innerSvg = "M540,329.15c116.45,0,210.85,94.4,210.85,210.85S656.45,750.85,540,750.85S329.15,656.45,329.15,540S423.55,329.15,540,329.15z";

  let outerSvg = "M540,121c231.41,0,419,187.59,419,419S771.41,959,540,959S121,771.41,121,540S308.59,121,540,121z";

  var innerPath = svg.append('path')
    .attr("d", innerSvg)

  var outerPath = svg.append('path')
    .attr("d", outerSvg)

  var innerRing = innerPath.node();
  let outerRing = outerPath.node();

  var innerLength = d3.scalePoint()
  	.domain(d3.map(data, d => d.age))
    .range([0, innerRing.getTotalLength()])
    .padding(0.5)

  var outerLength = d3.scalePoint()
  	.domain(d3.map(data, d => d.age))
    .range([0, outerRing.getTotalLength()])
    .padding(0.5)

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

  let nodes = [];

  data.forEach(d => {
    for (let i = 0; i <= d.value; i+=30) {
      nodes.push({
        ring: d.dose,
        cluster: d.age,
        age: d.age,
        category: d.fornitore
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

  var bees = svg.append("g").selectAll('.bee')
      .data(nodes)
      .enter()
      .append('circle')
  		.attr("class", "bee")
      .attr("r", r)
  		.style("fill", d => colour(d.category))
      .style("stroke", d => stroke(d.ring))
      .attr("id", d => d.age)
      .on("mouseover", (event, d) => console.log(d));

  const hulls = svg
    .append("g")
    .selectAll('path')
    .data(groups)
    .enter()
    .append('path')
    .style('stroke', "OrangeRed")
    .style('stroke-width', 5)
    .attr('stroke-linejoin', 'round')
    .attr("id", d => d);

  updateSwarm(650);

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
