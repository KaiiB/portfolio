// filepath: /Users/kaiibijlani/Classes/dsc_106/portfolio/blog/main.js
import { generateData, LDA, QDA, plotLDA3d, plotQDA3d } from './scripts/analysis.js';

// Add Plotly.js
const script = document.createElement('script');
script.src = 'https://cdn.plot.ly/plotly-2.24.1.min.js';

script.onload = () => {
  console.log('Plotly loaded');
  // Optionally enable the form submit button here if you’d disabled it until Plotly is ready.
};
document.head.appendChild(script);

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('da-simulation');
  const vizContainer = document.getElementById('visualization-container');

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // 1) Inject loading UI synchronously
    vizContainer.innerHTML = `
        <div class="progress-container">
        <div class="progress-bar" style="width:0%" id="progress-bar"></div>
        <div class="progress-text" id="progress-text">Starting…</div>
        </div>
    `;
    const graphContainer = document.createElement('div');
    graphContainer.innerHTML = 
    `   <div id="lda-plot" class="viz-section">
            <h3>Linear Discriminant Analysis (LDA)</h3>
            <div class="plot-container"></div>
        </div>
        <div id="qda-plot" class="viz-section">
            <h3>Quadratic Discriminant Analysis (QDA)</h3>
            <div class="plot-container"></div>
        </div>
        <div id="qda-subplots" class="viz-section"></div>   `
;
            
    vizContainer.appendChild(graphContainer);
    const params = {
      n_samples:  parseInt(form.n_samples.value),
      n_features: parseInt(form.n_features.value),
      n_classes:  parseInt(form.n_classes.value),
      random_state: parseInt(form.random_state.value)
    };

    setTimeout(() => runVisualization(params), 0);
    });
});

    

async function runVisualization(params) {
  const progressBar  = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');

  try {
    // STEP 1: GENERATE DATA
    progressText.textContent = 'Generating data…';
    progressBar.style.width = '10%';
    // give one more tick just in case
    await new Promise(r => setTimeout(r, 0));

    const [X, y] = await generateData(
      params.n_samples,
      params.n_features,
      params.random_state,
      params.n_classes
    );

    // STEP 2: FIT AND PLOT LDA
 
    progressText.textContent = 'Fitting LDA…';
    progressBar.style.width = '20%';
    await new Promise(r => setTimeout(r, 0));
    const lda = new LDA();
    lda.fit(X, y);

    progressText.textContent = 'Plotting LDA…';
    progressBar.style.width = '30%';

    await new Promise(r => setTimeout(r, 0));
    const ldaPlot = await plotLDA3d(lda, X, y);
    const ldaContainer = document.querySelector('#lda-plot .plot-container');
    const layoutConfig = {
        ...ldaPlot.layout,
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        scene: {
            ...ldaPlot.layout.scene,
            bgcolor: 'rgba(0,0,0,0)'
        }
    };
    Plotly.newPlot(ldaContainer, ldaPlot.traces, layoutConfig);
    
    // STEP 3: FIT AND PLOT QDA
    
    progressText.textContent = 'Fitting QDA…';
    progressBar.style.width = '40%';
    await new Promise(r => setTimeout(r, 0));
    const qda = new QDA();
    qda.fit(X, y);

    progressText.textContent = 'Plotting QDA…';
    progressBar.style.width = '50%';
    await new Promise(r => setTimeout(r, 0));
    const qdaPlot = await plotQDA3d(qda, X, y);
    const qdaContainer = document.querySelector('#qda-plot .plot-container');
    const qdaLayoutConfig = {
        ...qdaPlot.layout,
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        scene: {
            ...qdaPlot.layout.scene,
            bgcolor: 'rgba(0,0,0,0)'
        }
    };
    Plotly.newPlot(qdaContainer, qdaPlot.traces, qdaLayoutConfig);

    // STEP 4: QDA subplots 
    const subplots = qdaPlot.subtraces.slice(1);
    
    // Create container for subplots
    document.getElementById('qda-subplots').innerHTML = `
        <h3>QDA Boundary Subplots</h3>
        <div class="qda-subplot-container"></div>
    `;
    const subplotContainer = document.querySelector('#qda-subplots .qda-subplot-container');

    for (let i = 0; i < subplots.length; i++) {
        const trc = subplots[i];

        progressText.textContent = `Rendering QDA subplot ${i+1}/${subplots.length}…`;
        // scale from 60%→90%
        progressBar.style.width = `${60 + ((i+1)/subplots.length)*20}%`;

        // yield so UI can repaint
        await new Promise(r => setTimeout(r, 0));

        const subplotDiv = document.createElement('div');
        subplotDiv.classList.add('qda-subplot');
        subplotContainer.appendChild(subplotDiv);

        // find matching scatter traces
        const scatter_traces = qdaPlot.subtraces[0];
        const clusters = trc.name
          .match(/Boundary (\d+) vs (\d+)/)
          .slice(1)
          .map(idx => scatter_traces[+idx]);

        Plotly.newPlot(
          subplotDiv,
          [...clusters, ...(Array.isArray(trc) ? trc : [trc])].filter(x => x),
          { 
            title: trc.name, 
            scene: { aspectmode: 'cube', bgcolor: 'rgba(0,0,0,0)' }, 
            margin: {l:0,r:0,b:0,t:30},
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)'
          }
        );
      }

      // ── DONE ───────────────────────────────────────────────────────
      progressText.textContent = 'All done!';
      progressBar.style.width = '100%';


    } catch (err) {
      console.error(err);
      progressText.textContent = `Error: ${err.message}`;
      progressBar.style.backgroundColor = 'crimson';
    }
}
