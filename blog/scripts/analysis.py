import matplotlib.pyplot as plt
import plotly.express as px
import plotly.graph_objects as go
from sklearn import datasets
import cvxpy as cp
import pandas as pd
import numpy as np
import seaborn as sns
from mpl_toolkits.axes_grid1 import make_axes_locatable
from scipy.special import expit as inverse_logit
import itertools

def generate_data(n_samples=100, n_features=3, random_state=None, n_classes=2):
    if random_state is not None:
        np.random.seed(random_state)
    X, y = datasets.make_classification(n_samples=n_samples, n_features=n_features,
                                         n_informative=n_features, n_redundant=0, n_classes=n_classes,
                                         n_clusters_per_class=1, random_state=random_state, hypercube=True)
    return X, y.astype(int)

def plot_lda_3d_from_model(lda_model, X, y, feature_names=None, grid_size=30):
    """
    Plot 3D scatter and pairwise LDA decision planes using only lda_model.classes, .mus, .pis, .S.
    X: array (n_samples, 3)
    y: array (n_samples,)
    feature_names: list of length 3 for axis labels (optional)
    grid_size: number of points per axis in meshgrid
    """
    # Check 3D
    
    classes = lda_model.classes      # array of labels, length K
    mus = lda_model.mus              # shape (K, 3)
    pis = lda_model.pis              # shape (K,)
    S = lda_model.S                  # (3,3)
    # Invert S once
    invS = np.linalg.inv(S)
    
    # Prepare grid in feature1-feature2 plane
    f1 = np.linspace(X[:,0].min() - 1, X[:,0].max() + 1, grid_size)
    f2 = np.linspace(X[:,1].min() - 1, X[:,1].max() + 1, grid_size)
    xx, yy = np.meshgrid(f1, f2)
    
    fig = go.Figure()
    K = len(classes)
    
    # For each pair of classes, compute w and b for the plane
    for (i, j) in itertools.combinations(range(K), 2):
        mu_i = mus[i]
        mu_j = mus[j]
        pi_i = pis[i]
        pi_j = pis[j]
        # w_ij = invS @ (mu_i - mu_j)
        diff_mu = mu_i - mu_j
        w_ij = invS.dot(diff_mu)  # shape (3,)
        # compute quadratic terms mu^T invS mu
        qi = mu_i @ invS.dot(mu_i)
        qj = mu_j @ invS.dot(mu_j)
        b_ij = -0.5 * (qi - qj) + np.log(pi_i / pi_j)
        # Solve for z if w_z not too small
        if np.abs(w_ij[2]) < 1e-6:
            # skip nearly vertical plane in z
            continue
        zz = (-(w_ij[0] * xx + w_ij[1] * yy + b_ij) / w_ij[2])
        fig.add_trace(go.Surface(
            x=xx, y=yy, z=zz,
            opacity=0.5,
            showscale=False,
            name=f"Boundary {classes[i]} vs {classes[j]}",
            colorscale=[[0,'lightgray'], [1,'lightgray']],
            hoverinfo='skip'
        ))
    
    # Scatter for each class
    colors = px.colors.qualitative.Set1[:len(classes)]
    for idx, cls in enumerate(classes):
        mask = (y == cls)
        fig.add_trace(go.Scatter3d(
            x=X[mask, 0],
            y=X[mask, 1],
            z=X[mask, 2],
            mode='markers',
            name=f"Class {cls}",
            marker=dict(
                size=4,
                color=colors[idx],
            )
        ))
    
    # Axis labels
    labels = feature_names if feature_names is not None else ['Feature 1','Feature 2','Feature 3']
    # Compute symmetric ranges for equal scaling (optional but often helpful)
    x_min, x_max = X[:,0].min(), X[:,0].max()
    y_min, y_max = X[:,1].min(), X[:,1].max()
    z_min, z_max = X[:,2].min(), X[:,2].max()
    span = max(x_max - x_min, y_max - y_min, z_max - z_min) / 2
    x_mid = (x_max + x_min) / 2
    y_mid = (y_max + y_min) / 2
    z_mid = (z_max + z_min) / 2
    fig.update_layout(
        scene=dict(
            xaxis=dict(title=labels[0], range=[x_mid - span, x_mid + span]),
            yaxis=dict(title=labels[1], range=[y_mid - span, y_mid + span]),
            zaxis=dict(title=labels[2], range=[z_mid - span, z_mid + span]),
            aspectmode='cube'  # equal scaling on x,y,z
        ),
        title="3D LDA Decision Planes"
    )
    fig.show()
    return fig

def plot_qda_3d_with_isosurfaces(qda_model, X, y, feature_names=None, grid_size=30):
    """
    Plot 3D scatter and QDA decision boundaries as isosurfaces, using qda_model.discriminant_function.
    
    Parameters:
    -----------
    qda_model: fitted QDA instance (with .classes, .fit(), .discriminant_function(X), .predict(X))
    X: array-like of shape (n_samples, 3)
    y: array-like of shape (n_samples,)
    feature_names: list of length 3 for axis labels (optional)
    grid_size: int, number of grid points per axis
    """
    fig_list = []
    X = np.asarray(X)
    if X.shape[1] != 3:
        raise ValueError("X must have shape (n_samples, 3).")
    classes = np.asarray(qda_model.classes)
    K = len(classes)
    
    # Grid bounds with margin
    x_min, x_max = X[:,0].min() - 1, X[:,0].max() + 1
    y_min, y_max = X[:,1].min() - 1, X[:,1].max() + 1
    z_min, z_max = X[:,2].min() - 1, X[:,2].max() + 1
    
    # Build meshgrid
    xs = np.linspace(x_min, x_max, grid_size)
    ys = np.linspace(y_min, y_max, grid_size)
    zs = np.linspace(z_min, z_max, grid_size)
    XX, YY, ZZ = np.meshgrid(xs, ys, zs, indexing='ij')
    pts = np.vstack([XX.ravel(), YY.ravel(), ZZ.ravel()]).T  # shape (N,3)
    
    # Compute discriminant values on all grid points at once
    # shape (N, K)
    disc_vals = qda_model.discriminant_function(pts)
    
    fig = go.Figure()
    base_colors = px.colors.qualitative.Set1
    
    # For each pair of classes, plot the zero-level isosurface of δ_i - δ_j

    class_pairs = list(itertools.combinations(range(K), 2))
    for idx, (i, j) in enumerate(class_pairs):
        f_ij = disc_vals[:, i] - disc_vals[:, j]
        color = base_colors[idx % len(base_colors)]
        fig.add_trace(go.Isosurface(
            x=pts[:,0], y=pts[:,1], z=pts[:,2],
            value=f_ij,
            isomin=0.0, isomax=0.0,
            surface_count=1,
            showscale=False,
            caps=dict(x_show=False, y_show=False, z_show=False),
            colorscale=[[0, color], [1, color]],
            opacity=0.3,
            name=f"Boundary: {classes[i]} vs {classes[j]}"
        ))
        # Make a separate plot for each class pair, in the corresponding color:
        fig_class = go.Figure()
        fig_class.add_trace(go.Isosurface(
            x=pts[:,0], y=pts[:,1], z=pts[:,2],
            value=f_ij,
            isomin=0.0, isomax=0.0,
            surface_count=1,
            showscale=False,
            caps=dict(x_show=False, y_show=False, z_show=False),
            colorscale=[[0, color], [1, color]],
            opacity=0.3,
            name=f"Boundary: {classes[i]} vs {classes[j]}"
        ))
        # Plot original data points, only for selected classes
        scatter_colors = base_colors
        fig_class.add_trace(go.Scatter3d(
            x=X[y == classes[i], 0], y=X[y == classes[i], 1], z=X[y == classes[i], 2],
            mode='markers',
            marker=dict(
                size=4,
                color=scatter_colors[i % len(scatter_colors)],
                opacity=1
            ),
            name=f'Class {classes[i]}'
        ))
        fig_class.add_trace(go.Scatter3d(
            x=X[y == classes[j], 0], y=X[y == classes[j], 1], z=X[y == classes[j], 2],
            mode='markers',
            marker=dict(
                size=4,
                color=scatter_colors[j % len(scatter_colors)],
                opacity=1
            ),
            name=f'Class {classes[j]}'
        ))
        fig_class.update_layout(
            scene=dict(
                xaxis_title=feature_names[0] if feature_names else 'Feature 1',
                yaxis_title=feature_names[1] if feature_names else 'Feature 2',
                zaxis_title=feature_names[2] if feature_names else 'Feature 3',
                aspectmode='cube'
            ),
            title=f"QDA Boundary: {classes[i]} vs {classes[j]}",
            showlegend=True
        )
        fig_list.append(fig_class)
        fig_class.show()


    
    # Plot original data
    scatter_colors = base_colors
    for idx_cls, cls in enumerate(classes):
        mask = (y == cls)
        fig.add_trace(go.Scatter3d(
            x=X[mask, 0], y=X[mask, 1], z=X[mask, 2],
            mode='markers',
            marker=dict(
                size=4,
                color=scatter_colors[idx_cls % len(scatter_colors)],
                opacity=1
            ),
            name=f'Class {cls}'
        ))
    
    # Equal axis scaling
    labels = feature_names if feature_names is not None else ['Feature 1','Feature 2','Feature 3']
    span = max(x_max - x_min, y_max - y_min, z_max - z_min) / 2
    x_mid, y_mid, z_mid = (x_min + x_max)/2, (y_min + y_max)/2, (z_min + z_max)/2
    fig.update_layout(
        scene=dict(
            xaxis=dict(title=labels[0], range=[x_mid-span, x_mid+span]),
            yaxis=dict(title=labels[1], range=[y_mid-span, y_mid+span]),
            zaxis=dict(title=labels[2], range=[z_mid-span, z_mid+span]),
            aspectmode='cube'
        ),
        title="3D QDA Decision Boundaries for All Classes",
        showlegend=True,
        legend=dict(x=1.1, y=0.5)
    )
    fig_list.add(fig)
    fig.show()
    return fig_list

class LDA():
    def __init__(self):
        self.classes = None
        self.mus = None
        self.pis = None
        self.S = None
        self.mu = None

    def fit(self, X, y):
        n_samples, n_features = X.shape
        self.classes = np.unique(y)
        self.mus = np.zeros((len(self.classes), n_features))
        self.pis = np.zeros(len(self.classes))
    


        # Separate the data into two classes
        
        for i in range(self.classes.size):
            # Compute the means of each class
            mu = np.sum(X[y == self.classes[i]], axis=0) / np.sum(y == self.classes[i])
            
            self.mus[i] = mu.ravel()
            self.pis[i] = np.sum(y == self.classes[i]) / n_samples
     
        # Compute the overall mean
        mu = self.mus.T @ self.pis
        self.mu = mu.ravel()
   

        # Compute the sample covariance matrix
        S = (X - mu).T @ (X - mu) / n_samples
        self.S = S
        return self

    def _log_likelihood(self, X, mu_r, pi_r):
  
        # center
        diff = X - mu_r           

        # invert and det              

        # quadratic term for each row: sum_jk diff[i,j] * invS[j,k] * diff[i,k]
        #                                                     
        quad = np.einsum('ij,jk,ik->i', diff, np.linalg.inv(self.S), diff)

        const = 1 / (2 * np.pi * np.sqrt(np.linalg.det(self.S)))

        return np.log(pi_r) + const - 0.5 * quad

    
    def decision_function(self, X):
        likelihoods = np.zeros((X.shape[0], self.classes.size))
        for i in range(self.classes.size):
            ll = self._log_likelihood(X, self.mus[i], self.pis[i])
            likelihoods[:, i] = ll
        return likelihoods
        
    
    def predict(self, X):
        return np.argmax(self.decision_function(X), axis = 1)
    
class QDA:
    def __init__(self):
        self.classes = None
        self.mus = None
        self.pis = None
        self.Ss = None
        self.mu = None
    def fit(self, X, y):
        n_samples, n_features = X.shape
        self.classes = np.unique(y)
        self.mus = np.zeros((len(self.classes), n_features))
        self.pis = np.zeros(len(self.classes))
        self.Ss = np.zeros((len(self.classes), n_features, n_features))

        for i in range(self.classes.size):
            # Compute the means of each class
            mu = np.sum(X[y == self.classes[i]], axis=0) / np.sum(y == self.classes[i])
            self.mus[i] = mu.ravel()
            self.pis[i] = np.sum(y == self.classes[i]) / n_samples
            
            # Compute the sample covariance matrix for each class
            S = (X[y == self.classes[i]] - mu).T @ (X[y == self.classes[i]] - mu) / np.sum(y == self.classes[i])
            self.Ss[i] = S

        return self
    
    def discriminant_function(self, X):
        likelihoods = np.zeros((X.shape[0], self.classes.size))
        for i in range(self.classes.size):
            mu_r = self.mus[i]
            pi_r = self.pis[i]
            S_r = self.Ss[i]
            
            # Center the data
            diff = X - mu_r
            
            # Quadratic term
            quad = np.einsum('ij,jk,ik->i', diff, np.linalg.inv(S_r), diff)
            
            const = -0.5 * np.log(np.linalg.det(S_r))
            
            likelihoods[:, i] = np.log(pi_r) + const - 0.5 * quad
        
        return likelihoods
    def predict(self, X):
        return np.argmax(self.discriminant_function(X), axis=1)



