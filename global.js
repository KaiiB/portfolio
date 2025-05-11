const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/"                  // Local server
  : "/portfolio/";         // GitHub Pages repo name

function $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
}

export async function fetchJSON(url) {
    try {
      // Fetch the JSON file from the given URL
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.statusText}`);
      }
      const data = await response.json();
      return data;

    } catch (error) {
      console.error('Error fetching or parsing JSON data:', error);
    }
  }

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
    containerElement.innerHTML = ''; // Clear existing content

    
    for (const project of projects) {
        const article = document.createElement('article');
        
        // Create and append heading
        const heading = document.createElement(headingLevel);
        heading.textContent = project.title;
        article.appendChild(heading);
        
        // Create and append image with proper attributes
        const img = document.createElement('img');
        img.src = project.image;
        img.alt = project.title;
        article.appendChild(img);
        
        // Create and append description
        const description = document.createElement('p');
        description.textContent = project.description;
        article.appendChild(description);

        // Create and append link and year
        const container = document.createElement('div');
        container.style.display = 'flex'
        container.style.justifyContent = 'space-between';
        container.style.alignItems = 'center';


        const link = document.createElement('a');
        link.href = project.url;
        link.textContent = 'View Project';
        link.target = '_blank'; // Open in new tab
        link.rel = 'noopener noreferrer';
        container.appendChild(link);

        const year = document.createElement('span');
        year.textContent = project.year;
        year.style.fontStyle = 'italic';
        container.appendChild(year);
        article.appendChild(container);
        
        containerElement.appendChild(article);
    }
}

export async function fetchGithubData(username) {
    return fetchJSON(`https://api.github.com/users/${username}`)
}

let pages = [
    {url: '', title: 'Home' },
    {url: 'projects/', title: 'Projects' },
    {url: 'contact/', title: 'Contact' },
    {url: 'resume/', title: 'Resume' },
    {url: 'meta/', title: 'Meta' },
    {url: 'https://github.com/KaiiB', title: 'GitHub', external: true},
];

let nav = document.createElement('nav');
document.body.prepend(nav);

for (let page of pages) {
    let url = !page.url.startsWith('http') ? BASE_PATH + page.url : page.url;
    let title = page.title;

    let a = document.createElement('a');
    a.href = url;
    a.textContent = title;
    if (a.host === location.host && a.pathname === location.pathname) {
        a.classList.add('current');
    } 
    else if (a.host !== location.host) {
        a.target = '_blank';
    }
    nav.append(a);
}

document.body.insertAdjacentHTML(
    'afterbegin',
    `
      <label class="color-scheme">
          Theme: 
          <select>
                <option value="light dark">Auto</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
          </select>
      </label>`,
  );

let select = document.querySelector('.color-scheme select');

select.addEventListener('input', (event) => {
    localStorage.colorScheme = event.target.value;
    document.documentElement.style.setProperty('color-scheme', localStorage.colorScheme);
})

if (localStorage.colorScheme) {
    document.documentElement.style.setProperty('color-scheme', localStorage.colorScheme);
    select.value = localStorage.colorScheme;
}

let form = document.querySelector('form');
form?.addEventListener('submit', (event) => {
    event.preventDefault();
    let data = new FormData(form);
    let url = form.action;
    for (let [key, value] of data) {
        url += (url.includes('?') ? '&' : '?') + key + '=' + encodeURIComponent(value);
    }
    location.href = url;
    form.reset();
});
