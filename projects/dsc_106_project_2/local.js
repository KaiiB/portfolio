document.body.insertAdjacentHTML(
'afterbegin',
`<label class="color-scheme">
    Theme: 
    <select>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
    </select>
</label>`,
);

let select = document.querySelector('.color-scheme select');

// Get stored theme or default to light
const storedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', storedTheme);
select.value = storedTheme;

select.addEventListener('input', (event) => {
    const theme = event.target.value;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
});
