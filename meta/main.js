// ====== Imports ======
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';


// ====== Global State ======
let xScale, yScale;
let commitProgress = 100;
let commitMaxTime;
let filteredCommits;
let colors = d3.scaleOrdinal(d3.schemeTableau10);


// ====== Data Loading ======
async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: +row.line,
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));
  return data;
}


// ====== Data Processing ======
function processCommits(data) {
  return d3.groups(data, d => d.commit).map(([commit, lines]) => {
    const { author, date, time, timezone, datetime } = lines[0];
    const commitObj = {
      id: commit,
      url: `https://github.com/vis-society/lab-7/commit/${commit}`,
      author, date, time, timezone, datetime,
      hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
      totalLines: lines.length
    };

    Object.defineProperty(commitObj, 'lines', {
      value: lines,
      writable: false,
      enumerable: false,
      configurable: false,
    });

    return commitObj;
  });
}


// ====== Commit Info Stats ======
function renderCommitInfo(data, commits) {
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');

  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(data.length * 5);

  dl.append('dt').text('Total commits');
  dl.append('dd').text(commits.length);

  const uniqueFiles = new Set(data.map(d => d.file)).size;
  dl.append('dt').text('Total files');
  dl.append('dd').text(uniqueFiles);

  const fileGroups = d3.group(data, d => d.file);
  const maxFileLength = d3.max([...fileGroups.values()], f => f.length);
  const longestFile = [...fileGroups.entries()].find(([_, files]) => files.length === maxFileLength)[0];
  dl.append('dt').text('Longest file');
  dl.append('dd').html(`${longestFile} <small>(${maxFileLength} lines)</small>`);

  const avgDepth = d3.mean(data, d => d.depth).toFixed(2);
  dl.append('dt').text('Average depth');
  dl.append('dd').text(avgDepth);

  const avgHour = d3.mean(commits.map(c => c.hourFrac)).toFixed(2);
  dl.append('dt').text('Most active time');
  dl.append('dd').text(`${getPeriodOfDay(avgHour)} (avg: ${avgHour}h)`);
}

function getPeriodOfDay(hour) {
  if (hour >= 5 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 17) return 'Afternoon';
  if (hour >= 17 && hour < 21) return 'Evening';
  return 'Night';
}


// ====== Scatter Plot ======
function renderScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 20 };

  const svg = d3.select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  const plotArea = svg.append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

  xScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([0, width - margin.left - margin.right])
    .nice();

  yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([height - margin.top - margin.bottom, 0]);

  const rScale = d3.scaleSqrt()
    .domain(d3.extent(commits, d => d.totalLines))
    .range([2, 30]);

  plotArea.append('g').attr('class', 'dots')
    .selectAll('circle')
    .data(d3.sort(commits, d => -d.totalLines), d => d.id)
    .join('circle')
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines))
    .style('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, d) => {
      d3.select(event.currentTarget).style('fill-opacity', 1).style('stroke', '#333').style('stroke-width', 2);
      renderTooltipContent(d);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', event => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7).style('stroke', 'none');
      updateTooltipVisibility(false);
    });

  plotArea.append('g')
    .attr('class', 'gridlines')
    .call(d3.axisLeft(yScale).tickFormat('').tickSize(-(width - margin.left - margin.right)));

  plotArea.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${height - margin.top - margin.bottom})`)
    .call(d3.axisBottom(xScale).ticks(d3.timeMonth.every(0.5)).tickFormat(d3.timeFormat("%b %d")));

  plotArea.append('g')
    .attr('class', 'y-axis')
    .call(d3.axisLeft(yScale).tickFormat(d => String(d % 24).padStart(2, '0') + ':00'));
}

function updateScatterPlot(data, commits) {
  const svg = d3.select('#chart').select('svg');
  xScale.domain(d3.extent(commits, d => d.datetime)).nice();

  const rScale = d3.scaleSqrt()
    .domain(d3.extent(commits, d => d.totalLines))
    .range([2, 30]);

  svg.select('g.x-axis')
    .call(d3.axisBottom(xScale).ticks(d3.timeMonth.every(0.5)).tickFormat(d3.timeFormat("%b %d")));

  svg.select('g.dots')
    .selectAll('circle')
    .data(d3.sort(commits, d => -d.totalLines), d => d.id)
    .join('circle')
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, d) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(d);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', event => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });
}


// ====== Tooltip ======
function renderTooltipContent(commit) {
  document.getElementById('commit-link').href = commit.url;
  document.getElementById('commit-link').textContent = commit.id;
  document.getElementById('commit-date').textContent = commit.datetime?.toLocaleString('en', { dateStyle: 'full' });
  document.getElementById('commit-lines').textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
  document.getElementById('commit-tooltip').hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX + 10}px`;
  tooltip.style.top = `${event.clientY + 10}px`;
}


// ====== File Display ======
function updateFileDisplay(filteredCommits) {
  const lines = filteredCommits.flatMap(d => d.lines);
  const files = d3.groups(lines, d => d.file)
    .map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => b.lines.length - a.lines.length);

  const filesContainer = d3.select('#files')
    .selectAll('div')
    .data(files, d => d.name)
    .join(enter => {
      const div = enter.append('div');
      div.append('dt').append('code');
      div.append('dd');
      return div;
    });

  filesContainer.select('dt > code').text(d => d.name);

  filesContainer.select('dd')
    .selectAll('div')
    .data(d => d.lines)
    .join('div')
    .attr('class', 'loc')
    .attr('style', d => `--color: ${colors(d.type)}`);
}


// ====== Time Slider ======
const slider = document.getElementById('commit-progress');
const timeDisplay = document.getElementById('commit-time');

function onTimeSliderChange() {
  commitProgress = +slider.value;
  commitMaxTime = timeScale.invert(commitProgress);
  timeDisplay.textContent = commitMaxTime.toLocaleString();

  filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);
  updateScatterPlot(data, filteredCommits);
  updateFileDisplay(filteredCommits);
}

// ====== Scrollama Integration ======
function onStepEnter(response) {
  const commitTime = response.element.__data__.datetime;
  commitMaxTime = commitTime;
  timeDisplay.textContent = commitMaxTime.toLocaleString();
  filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);
  updateScatterPlot(data, filteredCommits);
  updateFileDisplay(filteredCommits);

  // Highlight current step
  d3.selectAll('.step').classed('is-active', false);
  d3.select(response.element).classed('is-active', true);

}

// ====== Main ======
let data = await loadData();
let commits = processCommits(data);

let timeScale = d3.scaleTime()
  .domain(d3.extent(commits, d => d.datetime))
  .range([0, 100]);

commitMaxTime = timeScale.invert(commitProgress);
filteredCommits = commits;

renderCommitInfo(data, commits);
renderScatterPlot(data, commits);

slider.addEventListener('input', onTimeSliderChange);
onTimeSliderChange();

d3.select('#scatter-story')
  .selectAll('.step')
  .data(commits)
  .join('div')
  .attr('class', 'step')
  .html(
    (d, i) => `
		On ${d.datetime.toLocaleString('en', {
      dateStyle: 'full',
      timeStyle: 'short',
    })},
		I made <a href="${d.url}" target="_blank">${
      i > 0 ? 'another commit' : 'my first commit to this portfolio.'
    }</a>.
		I edited ${d.totalLines} lines across ${
      d3.rollups(
        d.lines,
        (D) => D.length,
        (d) => d.file,
      ).length
    } files.
	`,
  );

const scroller = scrollama();
scroller
  .setup({
    container: '#scrolly-1',
    step: '#scrolly-1 .step',
  })
  .onStepEnter(onStepEnter);




