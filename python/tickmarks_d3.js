const width = 600;
const height = 100;
const margin = { left: 50, right: 50, top: 20, bottom: 20 };

const svg = d3.select("body")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

const xScale = d3.scaleLog()
  .domain([1e-10, 10])
  .range([margin.left, width - margin.right])
  .clamp(true);

const majorTicks = [0, 1, 5, 10];
const minorTicks = d3.range(0, 1.1, 0.1).concat(d3.range(1, 11));

svg.selectAll(".majorTick")
  .data(majorTicks)
  .enter()
  .append("line")
  .attr("class", "majorTick")
  .attr("x1", d => xScale(d + 1e-10))
  .attr("x2", d => xScale(d + 1e-10))
  .attr("y1", margin.top)
  .attr("y2", margin.top + 10)
  .attr("stroke", "black")
  .attr("stroke-width", 2);

svg.selectAll(".minorTick")
  .data(minorTicks)
  .enter()
  .append("line")
  .attr("class", "minorTick")
  .attr("x1", d => xScale(d + 1e-10))
  .attr("x2", d => xScale(d + 1e-10))
  .attr("y1", margin.top)
  .attr("y2", margin.top + 5)
  .attr("stroke", "black")
  .attr("stroke-width", 1);

svg.selectAll(".majorText")
  .data(majorTicks)
  .enter()
  .append("text")
  .attr("class", "majorText")
  .attr("x", d => xScale(d + 1e-10))
  .attr("y", margin.top + 20)
  .attr("text-anchor", "middle")
  .text(d => d < 1 ? d.toFixed(1) : Math.round(d));

svg.selectAll(".minorText")
  .data(minorTicks)
  .enter()
  .append("text")
  .attr("class", "minorText")
  .attr("x", d => xScale(d + 1e-10))
  .attr("y", margin.top + 15)
  .attr("text-anchor", "middle")
  .text(d => (d < 1 ? d.toFixed(1) : Math.round(d)))
  .style("font-size", "8px")
  .filter(d => !(d >= 1 && Number.isInteger(d)));