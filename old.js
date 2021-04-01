
var r = 3
var w = 800, h = 800

var data = d3.range(300).map(x => {
  var val = Math.random() * 400
  return {val}
})

var colour = d3.scaleSequential(d3.interpolateRainbow)
	.domain([0, d3.max(data, function(d){ return d.val })])

var svg = d3.select('#graph')
  .html('')
  .append('svg')
  .attr("width", w)
	.attr("height", h)

//square path starts at mid point on the left side
var square = 'M 50,400 L50,50 L750,50 L750,750 50,750 z'

var shape = 'square'

var squareToCircle = flubber.toCircle(square, 400, 400, 150)
var circleToSquare = flubber.fromCircle(400, 400, 150, square)

var path = svg.append('path')
  .attr("d", square)

var node = path.node()

var scaleLength = d3.scaleLinear()
	.domain([0, d3.max(data, function(d){ return d.val })])
  .range([0, node.getTotalLength()])

var scaleX = function(d){
  return node.getPointAtLength(scaleLength(d.val)).x
}

var scaleY = function(d){
  return node.getPointAtLength(scaleLength(d.val)).y
}

var bees = svg.append("g").selectAll('.bee')
    .data(data)
    .enter()
    .append('circle')
		.attr("class", "bee")
    .attr("r", r)
		.style("fill", function(d){ return colour(d.val) })

updateSwarm(120);

function changeShape() {

  path
    .transition()
		.duration(5000)
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
        	updateSwarm(5)
       }
		})
}

function updateSwarm(iterations) {

    scaleLength.range([0, node.getTotalLength()])

    var simulation = d3.forceSimulation(data)
      .force('collide', d3.forceCollide(r))
      .force('x', d3.forceX(d => scaleX(d)))
      .force('y', d3.forceY(d => scaleY(d)))
      .stop()

    for (var i = 0; i < iterations; ++i) simulation.tick()

    bees
      .attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; });

}
