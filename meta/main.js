import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

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

function processCommits(data) {
    return d3
      .groups(data, (d) => d.commit)
      .map(([commit, lines]) => {
        let first = lines[0];
        let { author, date, time, timezone, datetime } = first;
        let ret = {
          id: commit,
          url: 'https://github.com/vis-society/lab-7/commit/' + commit,
          author,
          date,
          time,
          timezone,
          datetime,
          hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
          totalLines: lines.length,
        };
  
        Object.defineProperty(ret, 'lines', {
            value: lines,
            writable: false,
            enumerable: false,
            configurable: false,
            
          // What other options do we need to set?
          // Hint: look up configurable, writable, and enumerable
        });
  
        return ret;
      });
  }

function renderCommitInfo(data, commits) {
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');
  
    // Add total LOC
    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(data.length);
  
    // Add total commits
    dl.append('dt').text('Total commits');
    dl.append('dd').text(commits.length);
  
    // Calculate number of unique files
    const uniqueFiles = new Set(data.map(d => d.file)).size;
    dl.append('dt').text('Total files');
    dl.append('dd').text(uniqueFiles);

    // Calculate maximum file length
    const fileGroups = d3.group(data, d => d.file);
    const maxFileLength = d3.max([...fileGroups.values()], files => files.length);
    const longestFile = [...fileGroups.entries()]
        .find(([_, files]) => files.length === maxFileLength)[0];
    
    dl.append('dt').text('Longest file');
    dl.append('dd').html(`${longestFile} <small>(${maxFileLength} lines)</small>`);

    // Calculate average depth
    const avgDepth = d3.mean(data, d => d.depth).toFixed(2);
    dl.append('dt').text('Average depth');
    dl.append('dd').text(avgDepth);

    // Analyze commit times
    const timeOfDay = commits.map(c => c.hourFrac);
    const avgHour = d3.mean(timeOfDay).toFixed(2);
    const period = getPeriodOfDay(avgHour);
    
    dl.append('dt').text('Most active time');
    dl.append('dd').text(`${period} (avg: ${avgHour}h)`);
}

function getPeriodOfDay(hour) {
    if (hour >= 5 && hour < 12) return 'Morning';
    if (hour >= 12 && hour < 17) return 'Afternoon';
    if (hour >= 17 && hour < 21) return 'Evening';
    return 'Night';
}

function renderScatterPlot(data, commits) {
    const width = 1000;
    const height = 600;
    const margin = { top: 10, right: 10, bottom: 30, left: 20 };
    
    // Sort commits by size in descending order for better overlapping
    const sortedCommits = d3.sort(commits, d => -d.totalLines);
    
    // Calculate radius scale using sqrt scale for proper area perception
    const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
    const rScale = d3.scaleSqrt()
        .domain([minLines, maxLines])
        .range([2, 30]);

    const svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    const xScale = d3
        .scaleTime()
        .domain(d3.extent(commits, d => d.datetime))
        .range([0, width])
        .nice();

    const yScale = d3.scaleLinear()
        .domain([0, 24])
        .range([height, 0]);

    const dots = svg.append('g').attr('class', 'dots');

    dots.selectAll('circle')
        .data(sortedCommits)
        .join('circle')
        .attr('cx', d => xScale(d.datetime))
        .attr('cy', d => yScale(d.hourFrac))
        .attr('r', d => rScale(d.totalLines))
        .style('fill', 'steelblue')
        .style('fill-opacity', 0.7)
        .on('mouseenter', (event, commit) => {
            d3.select(event.currentTarget)
                .style('fill-opacity', 1)
                .style('stroke', '#333')
                .style('stroke-width', 2);
            renderTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mouseleave', (event) => {
            d3.select(event.currentTarget)
                .style('fill-opacity', 0.7)
                .style('stroke', 'none');
            updateTooltipVisibility(false);
        });

    // Update tooltip content to include line count
    function updateTooltipContent(commit) {
        const tooltip = d3.select('#tooltip');
        tooltip.html(`
            <strong>Commit:</strong> ${commit.id}<br>
            <strong>Date:</strong> ${commit.datetime.toLocaleString()}<br>
            <strong>Lines changed:</strong> ${commit.totalLines}
        `);
    }

    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    const gridlines = svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`);

    // Create gridlines as an axis with no labels and full-width ticks
    gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width)); 

    // Create the axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3
    .axisLeft(yScale)
    .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

    // Add X axis
    svg
    .append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

    // Add Y axis
    svg
    .append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);

    }
    
function renderTooltipContent(commit) {
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
    const lines = document.getElementById('commit-lines');
    
    if (Object.keys(commit).length === 0) return;
    
    link.href = commit.url;
    link.textContent = commit.id;
    date.textContent = commit.datetime?.toLocaleString('en', {
        dateStyle: 'full',
    });
    lines.textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.clientX + 10}px`;
    tooltip.style.top = `${event.clientY + 10}px`;
}
   
  
let data = await loadData();
let commits = processCommits(data);
renderCommitInfo(data, commits);
renderScatterPlot(data, commits);