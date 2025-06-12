// Import math.js for matrix operations
import * as math from 'https://cdn.jsdelivr.net/npm/mathjs@11.8.0/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

export async function generateData(nSamples = 100, nFeatures = 3, randomState = null, nClasses = 2, variance = 1) {
    // Set random seed if provided
    if (randomState !== null) {
        // e.g. using the random_state from user input:
        Math.seedrandom(randomState);

    }
    
    // Generate centers for each class from unit cube edges
    const centers = [];
    for (let i = 0; i < nClasses; i++) {
        const randomDim = math.randomInt(nFeatures);
        let center = math.randomInt([nFeatures]);
        center[randomDim] = math.random();
        centers.push(center);
    }
    
    // Generate samples around centers
    const X = [];
    const y = [];
    const samplesPerClass = Math.floor(nSamples / nClasses);
    
    for (let i = 0; i < nClasses; i++) {
        for (let j = 0; j < samplesPerClass; j++) {
            // Add random noise to center
            const noise = math.random([nFeatures], -math.random(), math.random());
            console.log(noise);
            console.log(centers[i])
            const sample = math.add(centers[i], noise);
            X.push(sample);
            y.push(i);
        }
    }
    
    return [X, y];
}

export class LDA {
    constructor() {
        this.classes = null;
        this.mus = null;
        this.pis = null;
        this.S = null;
        this.mu = null;
    }
    
    fit(X, y) {
        const nSamples = X.length;
        const nFeatures = X[0].length;
        this.classes = [...new Set(y)];
        this.mus = Array(this.classes.length).fill().map(() => Array(nFeatures).fill(0));
        this.pis = Array(this.classes.length).fill(0);
        
        // Compute means and priors for each class
        for (let i = 0; i < this.classes.length; i++) {
            const classIndices = y.map((val, idx) => val === this.classes[i] ? idx : -1).filter(idx => idx !== -1);
            const classData = classIndices.map(idx => X[idx]);
            
            // Class mean
            this.mus[i] = math.mean(classData, 0);
            // Class prior
            this.pis[i] = classIndices.length / nSamples;
        }
        
        // Overall mean
        this.mu = math.multiply(math.transpose(this.mus), this.pis);
        
        // Compute covariance matrix
        const centered = math.subtract(X, this.mu);
        this.S = math.divide(math.multiply(math.transpose(centered), centered), nSamples);
        
        return this;
    }
    
    predict(X) {
        const scores = this.decisionFunction(X);
        return scores.map(row => math.indexOf(row, math.max(row)));
    }
    
    decisionFunction(X) {
        const invS = math.inv(this.S);
        return X.map(x => {
            return this.classes.map((_, i) => {
                const diff = math.subtract(x, this.mus[i]);
                const quad = math.multiply(math.multiply(diff, invS), math.transpose(diff));
                const logPrior = math.log(this.pis[i]);
                return logPrior - 0.5 * quad;
            });
        });
    }
}

export class QDA {
    constructor() {
        this.classes = null;
        this.mus = null;
        this.pis = null;
        this.Ss = null;
        this.mu = null;
    }
    
    fit(X, y) {
        const nSamples = X.length;
        const nFeatures = X[0].length;
        this.classes = [...new Set(y)];
        this.mus = Array(this.classes.length).fill().map(() => Array(nFeatures).fill(0));
        this.pis = Array(this.classes.length).fill(0);
        this.Ss = Array(this.classes.length).fill().map(() => 
            Array(nFeatures).fill().map(() => Array(nFeatures).fill(0))
        );
        
        for (let i = 0; i < this.classes.length; i++) {
            const classIndices = y.map((val, idx) => val === this.classes[i] ? idx : -1).filter(idx => idx !== -1);
            const classData = classIndices.map(idx => X[idx]);
            
            // Class mean
            this.mus[i] = math.mean(classData, 0);
            // Class prior
            this.pis[i] = classIndices.length / nSamples;
            this.mu = math.multiply(math.transpose(this.mus), this.pis);
            
            // Class covariance
            const centered = math.subtract(classData, this.mus[i]);
            this.Ss[i] = math.divide(math.multiply(math.transpose(centered), centered), classIndices.length);
        }
        
        return this;
    }
    
    discriminantFunction(X) {
        return X.map(x => {
            return this.classes.map((_, i) => {
                const diff = math.subtract(x, this.mus[i]);
                const invS = math.inv(this.Ss[i]);
                const quad = math.multiply(math.multiply(diff, invS), math.transpose(diff));
                const logDet = math.log(math.det(this.Ss[i]));
                const logPrior = math.log(this.pis[i]);
                return logPrior - 0.5 * (logDet + quad);
            });
        });
    }
    
    predict(X) {
        const scores = this.discriminantFunction(X);
        return scores.map(row => math.indexOf(row, math.max(row)));
    }
}

function meshgrid(x, y) {
    const xx = [];
    const yy = [];
    for (let i = 0; i < y.length; i++) {
        xx.push([...x]);
        yy.push(Array(x.length).fill(y[i]));
    }
    return [xx, yy];
}

function linspace(start, stop, n) {
    const arr = [];
    const step = (stop - start) / (n - 1);
    for (let i = 0; i < n; i++) {
        arr.push(start + step * i);
    }
    return arr;
}

export async function plotLDA3d(lda, X, y) {
    // Create Plotly 3D scatter plot with decision boundaries
    const classes = [...new Set(y)];
    const traces = [];

    // Add scatter points for each class
    classes.forEach((cls, idx) => {
        const classPoints = X.filter((_, i) => y[i] === cls);
        traces.push({
            type: 'scatter3d',
            x: classPoints.map(p => p[0]),
            y: classPoints.map(p => p[1]),
            z: classPoints.map(p => p[2]),
            mode: 'markers',
            name: `Class ${cls}`,
            marker: {
                size: 4,
                color: `hsl(${(360 * idx) / classes.length}, 70%, 50%)`
            }
        });
    });

    // Prepare grid in feature1-feature2 plane
    const gridSize = 50;
    const xMin = math.min(X.map(p => p[0])) - 1;
    const xMax = math.max(X.map(p => p[0])) + 1;
    const yMin = math.min(X.map(p => p[1])) - 1;
    const yMax = math.max(X.map(p => p[1])) + 1;
    
    const f1 = linspace(xMin, xMax, gridSize);
    const f2 = linspace(yMin, yMax, gridSize);
    
    // Create meshgrid
    const [xx, yy] = meshgrid(f1, f2);
    
    // Get the inverse of the covariance matrix
    const invS = math.inv(lda.S);
    
    // For each pair of classes, compute w and b for the plane
    for (let i = 0; i < classes.length; i++) {
        for (let j = i + 1; j < classes.length; j++) {
            const mu_i = lda.mus[i];
            const mu_j = lda.mus[j];
            const pi_i = lda.pis[i];
            const pi_j = lda.pis[j];
            
            // Calculate w_ij = invS @ (mu_i - mu_j)
            const diff_mu = math.subtract(mu_i, mu_j);
            const w_ij = math.multiply(invS, diff_mu);
            
            // Compute quadratic terms mu^T invS mu
            const qi = math.multiply(math.multiply(mu_i, invS), math.transpose(mu_i));
            const qj = math.multiply(math.multiply(mu_j, invS), math.transpose(mu_j));
            const b_ij = -0.5 * (qi - qj) + math.log(pi_i / pi_j);
            
            // Skip if the plane is nearly vertical in z
            if (Math.abs(w_ij[2]) < 1e-6) continue;
            
            // Calculate z coordinates for the decision boundary surface
            const zz = xx.map((row, r) => 
                row.map((x, c) => 
                    (-(w_ij[0] * x + w_ij[1] * yy[r][c] + b_ij) / w_ij[2])
                )
            );
            
            // Add surface trace
            traces.push({
                type: 'surface',
                x: xx,
                y: yy,
                z: zz,
                opacity: 0.3,
                name: `Boundary ${classes[i]} vs ${classes[j]}`,
                colorscale: [[0, 'lightgray'], [1, 'lightgray']],
                showscale: false,
                hoverinfo: 'name',
                customdata: [{classes: [i, j]}],
                hoverlabel: {
                    bgcolor: 'white',
                    font: {color: 'black'}
                }
            });
        }
    }
    let x_min = Math.min(...X.map((r) => r[0]));
    let x_max = Math.max(...X.map((r) => r[0]));
    let y_min = Math.min(...X.map((r) => r[1]));
    let y_max = Math.max(...X.map((r) => r[1]));
    let z_min = Math.min(...X.map((r) => r[2]));
    let z_max = Math.max(...X.map((r) => r[2]));
    

    const span =  Math.max(x_max - x_min, y_max - y_min, z_max - z_min) / 2

    const x_mid = (x_max + x_min) / 2
    const y_mid = (y_max + y_min) / 2
    const z_mid = (z_max + z_min) / 2

    const layout = {
        title: '3D LDA Decision Boundaries',
        scene: {
            xaxis: {title: classes[0], range: [x_mid - span, x_mid + span]},
            yaxis: {title: classes[1], range: [y_mid - span, y_mid + span]},
            zaxis: {title: classes[2], range: [z_mid - span, z_mid + span]},
            aspectmode: 'cube'
        },
        margin: {l: 0, r: 0, b: 0, t: 30},
    };
    
    
    return {traces, layout};
}


export async function plotQDA3d(qda, X, y) {
    // Similar to LDA plot but with quadratic decision boundaries
    const classes = [...new Set(y)];
    const traces = [];
    const subtraces = [];
    const sub = [];
    // Add scatter points for each class
    classes.forEach((cls, idx) => {
        const classPoints = X.filter((_, i) => y[i] === cls);
        const trc = {
            type: 'scatter3d',
            x: classPoints.map(p => p[0]),
            y: classPoints.map(p => p[1]),
            z: classPoints.map(p => p[2]),
            mode: 'markers',
            name: `Class ${cls}`,
            marker: {
                size: 4,
                color: `hsl(${(360 * idx) / classes.length}, 70%, 50%)`
            }
        }
        traces.push(
            trc
        );
        sub.push(
            trc
        );
    });
    subtraces.push(sub);

    // Prepare grid in feature1-feature2 plane
    const gridSize = 50; // Increased grid density
    const xMin = math.min(X.map(p => p[0]));
    const xMax = math.max(X.map(p => p[0]));
    const yMin = math.min(X.map(p => p[1]));
    const yMax = math.max(X.map(p => p[1]));
    
    const f1 = linspace(xMin, xMax, gridSize);
    const f2 = linspace(yMin, yMax, gridSize);
    
    // Create meshgrid
    const [xx, yy] = meshgrid(f1, f2);

    const color = d3.scaleOrdinal(d3.schemeCategory10).domain(classes);

    // For each pair of classes, compute the quadratic decision boundary
    for (let i = 0; i < classes.length; i++) {
        for (let j = i + 1; j < classes.length; j++) {
            // First pass: compute  z values
            const zRange = linspace(X[0].length >= 3 ? math.min(X.map((v) => v[2])) : -1, X[0].length >= 3 ? math.max(X.map((v) => v[2])) : 1, gridSize); 
            const zz= xx.map((row, r) => 
                row.map((x, c) => {
                    
                    let minDiff = Infinity;
                    let bestZ = 0;
                  
                    zRange.forEach(z => {
                        let p = [x, yy[r][c], z];
                       
                        p = X[0].length > 3 ? p.concat(qda.mu.slice(3)) : p;
                        p = [p]
                
                        let discriminant = qda.discriminantFunction(p).flat();
                        const diff = math.abs(discriminant[i] - discriminant[j]);
                        
                        if (diff < minDiff) {
                            minDiff = diff;
                            bestZ = z;
                        }
                    });
                    
                    return minDiff < 0.5 && (bestZ != 0 || bestZ != undefined) ? bestZ : NaN;
                })
            );
            
        
            // Add surface trace
            const surface = {
                type: 'surface',
                x: xx,
                y: yy,
                z: zz,
                opacity: 0.3,
                showscale: false,
                name: `Boundary ${classes[i]} vs ${classes[j]}`,
                colorscale: [[0, color(i)], [1, color(j)]],
                hoverinfo: 'name',
                customdata: [{classes: [i, j]}],
                hoverlabel: {
                    bgcolor: 'white',
                    font: {color: 'black'}
                }
            }

            traces.push(surface);
            subtraces.push(surface);

            
        }
    }
    
    const layout = {
        title: '3D QDA Decision Boundaries',
        scene: {
            xaxis: {
            range: [-1, 1],
            },
            yaxis: {
            range: [-1, 1], 
            },
            zaxis: {
            range: [-1, 1],
            }
        },
        margin: {l:0,r:0,b:0,t:30}

    };
    
    return {traces, subtraces, layout};
}
