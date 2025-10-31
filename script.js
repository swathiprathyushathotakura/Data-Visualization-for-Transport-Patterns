// Load CSV Data
d3.csv("transport_data.csv", d3.autoType).then(data => {
  console.log("Data loaded:", data);

  const daySelect = d3.select("#day-select");
  const routeSelect = d3.select("#route-select");

  const days = Array.from(new Set(data.map(d => d.day)));
  const routes = Array.from(new Set(data.map(d => d.route)));

  daySelect.selectAll("option")
    .data(["All", ...days])
    .join("option")
    .attr("value", d => d)
    .text(d => d);

  routeSelect.selectAll("option")
    .data(["All", ...routes])
    .join("option")
    .attr("value", d => d)
    .text(d => d);

  // Chart setup
  const chartWidth = 600;
  const chartHeight = 400;
  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", chartWidth)
    .attr("height", chartHeight);

  const tooltip = d3.select("#tooltip");

  // Map setup
  const map = L.map("map").setView([40.73, -73.93], 11);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
  }).addTo(map);

  // Filter data
  function filterData(day, route) {
    return data.filter(d =>
      (day === "All" || d.day === day) &&
      (route === "All" || d.route === route)
    );
  }

  // Summary update
  function updateSummary(filtered) {
    const totalTrips = d3.sum(filtered, d => d.count);
    const avgTrips = (totalTrips / filtered.length).toFixed(1);
    const activeRoutes = new Set(filtered.map(d => d.route)).size;

    d3.select("#total-trips").text(totalTrips);
    d3.select("#avg-trips").text(avgTrips);
    d3.select("#route-count").text(activeRoutes);
  }

  // Render chart + map
  function render(filtered) {
    updateSummary(filtered);

    const xScale = d3.scaleBand()
      .domain(filtered.map(d => d.hour))
      .range([50, chartWidth - 20])
      .padding(0.2);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(filtered, d => d.count)])
      .nice()
      .range([chartHeight - 40, 20]);

    // Axis
    svg.selectAll(".x-axis").data([null])
      .join("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${chartHeight - 40})`)
      .call(d3.axisBottom(xScale));

    svg.selectAll(".y-axis").data([null])
      .join("g")
      .attr("class", "y-axis")
      .attr("transform", `translate(50,0)`)
      .call(d3.axisLeft(yScale));

    // Bars with transitions
    const bars = svg.selectAll("rect")
      .data(filtered, d => d.hour);

    bars.join(
      enter => enter.append("rect")
        .attr("x", d => xScale(d.hour))
        .attr("y", yScale(0))
        .attr("width", xScale.bandwidth())
        .attr("height", 0)
        .attr("fill", "#4f46e5")
        .on("mouseover", (event, d) => {
          tooltip.transition().duration(100).style("opacity", 1);
          tooltip.html(`<b>Hour:</b> ${d.hour}:00<br><b>Trips:</b> ${d.count}`)
            .style("left", event.pageX + 5 + "px")
            .style("top", event.pageY - 28 + "px");
        })
        .on("mouseout", () => tooltip.transition().duration(300).style("opacity", 0))
        .transition()
        .duration(800)
        .attr("y", d => yScale(d.count))
        .attr("height", d => chartHeight - 40 - yScale(d.count)),

      update => update.transition()
        .duration(800)
        .attr("x", d => xScale(d.hour))
        .attr("y", d => yScale(d.count))
        .attr("width", xScale.bandwidth())
        .attr("height", d => chartHeight - 40 - yScale(d.count))
    );

    // Map points update
    map.eachLayer(layer => {
      if (layer instanceof L.CircleMarker) map.removeLayer(layer);
    });

    filtered.forEach(d => {
      if (d.latitude && d.longitude) {
        L.circleMarker([d.latitude, d.longitude], {
          radius: 6,
          color: "#4f46e5",
          fillOpacity: 0.6
        }).bindPopup(`<b>${d.route}</b><br>${d.day} ${d.hour}:00<br>Trips: ${d.count}`)
          .addTo(map);
      }
    });
  }

  // Initial render
  render(data);

  // Event listeners
  daySelect.on("change", () => {
    const day = daySelect.node().value;
    const route = routeSelect.node().value;
    render(filterData(day, route));
  });

  routeSelect.on("change", () => {
    const day = daySelect.node().value;
    const route = routeSelect.node().value;
    render(filterData(day, route));
  });
});
