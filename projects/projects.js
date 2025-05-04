import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
renderProjects(projects, projectsContainer, 'h2');

let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);

function renderProjectChart(filtered) {
    let rolledData = d3.rollups(
        filtered,
        (v) => v.length,
        (d) => d.year,
    )

    let data = rolledData.map(([year, count]) => {
        return {
            value: count,
            label: year
        }
    });
    
    let sliceGenerator = d3.pie().value((d) => d.value);
    let arcData = sliceGenerator(data);

    let colors = d3.scaleOrdinal(d3.schemeTableau10);
    let arcs = arcData.map((d) => arcGenerator(d));

    // Clear existing SVG elements
    let svg = d3.select('svg');
    svg.selectAll('path').remove();

    // Clear existing legend items
    let legend = d3.select('.legend');
    legend.selectAll('li').remove();

    arcs.forEach((d, idx) => {
        svg
            .append('path')
            .attr('d', d)
            .attr('fill', colors(idx))
            .attr('class', () => {
                // Keep the selected class if this is the selected year
                return data[idx].label === selectedYear ? 'selected' : '';
            })
            .on('click', () => {
                selectedIndex = selectedIndex === idx ? -1: idx;
                selectedYear = selectedIndex === -1 ? null : data[selectedIndex].label;

                svg
                    .selectAll('path')
                    .attr('class', (_, i) => (
                        i === selectedIndex ? 'selected' : ''
                    ));
                
                legend
                    .selectAll('li')
                    .attr('class', (_, i) => (
                        i === selectedIndex ? 'selected legend-item' : 'legend-item'
                    ));

                filterProjects(false);
            })
    });

    data.forEach((d, idx) => {
        legend
            .append('li')
            .attr('class', () => {
                return d.label === selectedYear ? 'selected legend-item' : 'legend-item';
            })
            .attr('style', `--color: ${colors(idx)}`)
            .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
    });
}

let selectedIndex = -1;
let selectedYear = null;
let query = '';
let searchInput = document.querySelector('.searchBar');

function filterProjects(updateChart = false) {
    let filteredProjects = projects.filter(project => {
        let matchesQuery = true;
        if (query) {
            let meta = Object.values(project).join('\n').toLowerCase();
            matchesQuery = meta.includes(query.toLowerCase());
        }

        let matchesYear = true;
        if (selectedYear !== null) {
            matchesYear = project.year === selectedYear;
        }

        return matchesQuery && matchesYear;
    });

    renderProjects(filteredProjects, projectsContainer, 'h2');
    
    // When searching, update chart with all projects that match the query
    // regardless of selected year
    if (updateChart) {
        let searchFiltered = projects.filter(project => {
            let meta = Object.values(project).join('\n').toLowerCase();
            return query ? meta.includes(query.toLowerCase()) : true;
        });
        renderProjectChart(searchFiltered);
    }
}

renderProjectChart(projects);

searchInput.addEventListener('input', (event) => {
    query = event.target.value;
    filterProjects(true);
});


