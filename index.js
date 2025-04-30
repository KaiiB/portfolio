import { fetchJSON, renderProjects, fetchGithubData } from "./global.js";
const projects = await fetchJSON("./lib/projects.json");
const latestProjects = projects.slice(0, 3);

const projectsContainer = document.querySelector('.projects');
renderProjects(latestProjects, projectsContainer, 'h2');

const stats = await fetchGithubData('KaiiB');
const statsContainer = document.getElementById('profile_stats');

// Format stats with labels and numbers
const statsToShow = [
    { key: 'public_repos', label: 'Repositories' },
    { key: 'public_gists', label: 'Gists' },
    { key: 'followers', label: 'Followers' },
    { key: 'following', label: 'Following' },
];

statsContainer.innerHTML = statsToShow.map(({ key, label }) => `
    <div class="stat">
        <div class="number">${stats[key]}</div>
        <div class="label">${label}</div>
    </div>
`).join('');