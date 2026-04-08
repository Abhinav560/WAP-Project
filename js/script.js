let quotes = [];
let favorites = JSON.parse(localStorage.getItem('ql_favorites')) || [];

// ─── Stats ────────────────────────────────────────────────────────────────────
// We store all stats in one object in localStorage
let stats = JSON.parse(localStorage.getItem('ql_stats')) || {
    viewed: 0,       // how many quotes were loaded/displayed
    searches: 0,     // how many times user searched
    saves: 0,        // how many quotes saved in total
    characters: {}   // save count per character e.g. { "Eren": 3, "Levi": 1 }
};

function saveStats() {
    localStorage.setItem('ql_stats', JSON.stringify(stats));
}

function updateStatsPanel() {
    document.getElementById('stat-viewed').textContent = stats.viewed;
    document.getElementById('stat-searches').textContent = stats.searches;
    document.getElementById('stat-saves').textContent = stats.saves;

    // Find the character with the most saves
    const chars = Object.keys(stats.characters);
    if (chars.length === 0) {
        document.getElementById('stat-character').textContent = '—';
    } else {
        // HOF: reduce to find which character has the highest count
        const fav = chars.reduce((a, b) =>
            stats.characters[a] > stats.characters[b] ? a : b
        );
        document.getElementById('stat-character').textContent = fav;
    }
}

function toggleStats() {
    const grid = document.getElementById('stats-grid');
    const isHidden = grid.style.display === 'none';
    grid.style.display = isHidden ? 'grid' : 'none';

    // GA: track when user opens their stats
    if (typeof gtag === 'function' && isHidden) {
        gtag('event', 'stats_opened');
    }
}

// ─── Debounce ─────────────────────────────────────────────────────────────────
function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

// ─── Fetch ────────────────────────────────────────────────────────────────────
async function fetchQuotes() {
    document.getElementById('loading').style.display = 'block';
    try {
        const responses = await Promise.all(
            Array(10).fill(null).map(() =>
                fetch('https://aot-api.vercel.app/quote').then(r => r.json())
            )
        );
        quotes = responses
            .map(q => ({
                quote: q.quote || '',
                character: q.author || 'Unknown',
                anime: 'Attack on Titan'
            }))
            .filter(q => q.quote && q.character);
    } catch (err) {
        console.error('Failed to fetch quotes:', err);
        quotes = [];
    }
    document.getElementById('loading').style.display = 'none';

    // Count how many quotes were loaded into stats
    stats.viewed += quotes.length;
    saveStats();
    updateStatsPanel();

    // GA: track how many quotes were fetched
    if (typeof gtag === 'function') {
        gtag('event', 'quotes_loaded', { count: quotes.length });
    }

    populateCharacters();
    applyFilters();
    renderFavorites();
}

// ─── Filter + Sort ────────────────────────────────────────────────────────────
function applyFilters() {
    const term      = document.getElementById('search').value.toLowerCase().trim();
    const character = document.getElementById('filter').value;
    const sortBy    = document.getElementById('sort').value;

    let result = quotes
        .filter(q =>
            !term ||
            q.quote.toLowerCase().includes(term) ||
            q.character.toLowerCase().includes(term)
        )
        .filter(q => !character || q.character === character)
        .sort((a, b) => {
            if (sortBy === 'az')       return a.character.localeCompare(b.character);
            if (sortBy === 'za')       return b.character.localeCompare(a.character);
            if (sortBy === 'shortest') return a.quote.length - b.quote.length;
            if (sortBy === 'longest')  return b.quote.length - a.quote.length;
            return 0;
        });

    displayQuotes(result);
}

// ─── Render Cards ─────────────────────────────────────────────────────────────
function displayQuotes(list) {
    const container = document.getElementById('quotes');
    container.innerHTML = '';

    if (list.length === 0) {
        container.innerHTML = '<p class="empty-msg">No quotes found.</p>';
        return;
    }

    list.forEach(q => {
        const idx   = quotes.indexOf(q);
        const isFav = favorites.some(f => f.quote === q.quote && f.character === q.character);

        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <div class="quote">"${q.quote}"</div>
            <div class="character">— ${q.character}</div>
            <div class="anime">${q.anime}</div>
            <div class="card-footer">
                <button class="like-btn ${isFav ? 'liked' : ''}"
                        onclick="toggleFavorite(${idx})">
                    ${isFav ? '❤️ Saved' : '🤍 Save'}
                </button>
            </div>
        `;
        container.appendChild(div);
    });
}

// ─── Favorites ────────────────────────────────────────────────────────────────
function toggleFavorite(idx) {
    const q         = quotes[idx];
    const alreadySaved = favorites.some(f => f.quote === q.quote && f.character === q.character);

    if (alreadySaved) {
        favorites = favorites.filter(f => !(f.quote === q.quote && f.character === q.character));

        // Update stats: decrease save count
        stats.saves = Math.max(0, stats.saves - 1);
        if (stats.characters[q.character]) {
            stats.characters[q.character] = Math.max(0, stats.characters[q.character] - 1);
        }

        // GA: track unsave
        if (typeof gtag === 'function') {
            gtag('event', 'quote_unsaved', { character: q.character });
        }
    } else {
        favorites = [...favorites, q];

        // Update stats: increase save count
        stats.saves += 1;
        stats.characters[q.character] = (stats.characters[q.character] || 0) + 1;

        // GA: track save
        if (typeof gtag === 'function') {
            gtag('event', 'quote_saved', { character: q.character });
        }
    }

    saveStats();
    updateStatsPanel();
    localStorage.setItem('ql_favorites', JSON.stringify(favorites));
    applyFilters();
    renderFavorites();
}

function renderFavorites() {
    const section   = document.getElementById('favorites-section');
    const container = document.getElementById('favorites');

    if (favorites.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    container.innerHTML   = '';

    favorites.forEach(q => {
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

// ─── Characters Dropdown ──────────────────────────────────────────────────────
function populateCharacters() {
    const unique = [...new Set(quotes.map(q => q.character))].sort();
    const select = document.getElementById('filter');
    select.innerHTML = '<option value="">All Characters</option>';
    unique.forEach(char => {
        const opt       = document.createElement('option');
        opt.value       = char;
        opt.textContent = char;
        select.appendChild(opt);
    });
}

// ─── Theme ────────────────────────────────────────────────────────────────────
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    document.getElementById('theme').textContent = isDark ? '☀️' : '🌙';

    // GA: track theme preference
    if (typeof gtag === 'function') {
        gtag('event', 'theme_toggled', { theme: isDark ? 'dark' : 'light' });
    }
}

function initTheme() {
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        document.getElementById('theme').textContent = '☀️';
    }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.getElementById('theme').addEventListener('click', toggleTheme);

document.getElementById('filter').addEventListener('change', applyFilters);

document.getElementById('search').addEventListener('input', debounce(() => {
    const term = document.getElementById('search').value.trim();
    if (term) {
        // Update stats
        stats.searches += 1;
        saveStats();
        updateStatsPanel();

        // GA: track search
        if (typeof gtag === 'function') {
            gtag('event', 'search_performed', { search_term: term });
        }
    }
    applyFilters();
}, 300));

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    updateStatsPanel(); // show saved stats immediately on load
    fetchQuotes();
});