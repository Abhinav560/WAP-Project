let quotes = [];

async function fetchQuotes() {
    document.getElementById('loading').style.display = 'block';
    try {
        const res = await Promise.all(Array(10).fill().map(() => 
            fetch('https://aot-api.vercel.app/quote').then(r => r.json())
        ));
        quotes = res.map(q => ({
            quote: q.quote || "Unknown",
            character: q.author || "Unknown",
            anime: "Attack on Titan"
        })).filter(q => q.quote && q.character);
    } catch {
        quotes = [];
    }
    displayQuotes(quotes);
    populateCharacters();
    document.getElementById('loading').style.display = 'none';
}

function displayQuotes(list) {
    const container = document.getElementById('quotes');
    container.innerHTML = '';
    list.forEach(q => {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <div class="quote">"${q.quote}"</div>
            <div class="character">— ${q.character}</div>
            <div class="anime">${q.anime}</div>
        `;
        container.appendChild(div);
    });
}

function searchQuotes() {
    const term = document.getElementById('search').value.toLowerCase();
    const filtered = quotes.filter(q => 
        q.quote.toLowerCase().includes(term) || 
        q.character.toLowerCase().includes(term)
    );
    displayQuotes(filtered);
}

function filterByCharacter() {
    const char = document.getElementById('filter').value;
    const filtered = char ? quotes.filter(q => q.character === char) : quotes;
    displayQuotes(filtered);
}

function populateCharacters() {
    const chars = [...new Set(quotes.map(q => q.character))];
    const select = document.getElementById('filter');
    select.innerHTML = '<option value="">All Characters</option>';
    chars.forEach(char => {
        const opt = document.createElement('option');
        opt.value = char;
        opt.textContent = char;
        select.appendChild(opt);
    });
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    document.getElementById('theme').textContent = isDark ? '☀️' : '🌙';
}

function initTheme() {
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        document.getElementById('theme').textContent = '☀️';
    }
}

document.getElementById('theme').addEventListener('click', toggleTheme);
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    fetchQuotes();
});
