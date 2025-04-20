const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/"                  // Local server
  : "/portfolio/";         // GitHub Pages repo name

function $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
}

let pages = [
    {url: '', title: 'Home' },
    {url: 'projects/', title: 'Projects' },
    {url: 'contact/', title: 'Contact' },
    {url: 'resume/', title: 'Resume' },
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
