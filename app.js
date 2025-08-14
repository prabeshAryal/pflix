// Global Home Button logic
const globalHomeBtn = document.getElementById('global-home-btn');

function updateGlobalHomeBtn() {
    const activeSection = document.querySelector('#main-content > section:not(.hidden)');
    const isPlayerFullscreen = document.fullscreenElement !== null;

    if (!activeSection) {
        globalHomeBtn.classList.add('hidden');
        return;
    }

    const sectionId = activeSection.id;
    // Show on explore, results, and details pages. Hide on search (homepage) and about.
    const showButton = ['explore-section', 'results-section', 'details-section'].includes(sectionId);

    if (showButton && !isPlayerFullscreen) {
        globalHomeBtn.classList.remove('hidden');
    } else {
        globalHomeBtn.classList.add('hidden');
    }
}

globalHomeBtn.addEventListener('click', () => {
    // Redirect to root and clear all state
    window.location.href = '/';
});

// Listen for fullscreen changes to hide/show the button
document.addEventListener('fullscreenchange', updateGlobalHomeBtn);

/**
 * Main application state and configuration.
 */
const App = {
    elements: {},
    api: {
        baseUrl: 'https://api.imdbapi.dev',
    },
    timers: {
        searchDebounce: null,
    },
    currentMedia: null, // Holds data for the currently viewed media
    // IDs to showcase on the homepage hero as featured items
    featured: [
        'tt1375666', // Inception
        'tt0816692', // Interstellar
        'tt0944947', // Game of Thrones
        'tt0903747', // Breaking Bad
        'tt4154796', // Avengers: Endgame
        'tt7286456', // Joker
    ],
};

/**
 * Performs a search query to the API.
 */
async function search(query) {
    if (query.length < 3) {
        showHomeView();
        App.elements.searchResults.innerHTML = '';
        document.getElementById('results-spinner').style.display = 'none';
        // Clear URL parameters when going back to homepage
        const url = new URL(window.location);
        url.searchParams.delete('q');
        url.searchParams.delete('id');
        url.searchParams.delete('view');
        window.history.pushState({}, '', url);
        document.title = 'Pflix - Find where to stream any movie or TV show';
        return;
    }
    
    // Update URL with search query
    const url = new URL(window.location);
    url.searchParams.set('q', query);
    url.searchParams.delete('id');
    url.searchParams.delete('view');
    window.history.pushState({ query }, '', url);
    document.title = `Search: ${query} - Pflix`;
    
    document.getElementById('results-spinner').style.display = 'flex';
    try {
        const response = await fetch(`${App.api.baseUrl}/search/titles?query=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error(`API error: ${response.statusText}`);
        const data = await response.json();
        renderSearchResults(data.titles || []);
        document.getElementById('results-spinner').style.display = 'none';
    } catch (error) {
        console.error("Error fetching search results:", error);
        renderError("Could not fetch search results.");
        document.getElementById('results-spinner').style.display = 'none';
    }
}

/**
 * Renders the search results on the page.
 */
function renderSearchResults(titles) {
    showSearchView();
    document.getElementById('results-spinner').style.display = 'none';
    App.elements.searchResults.innerHTML = '';
    if (titles.length === 0) {
        if (App.elements.searchInput.value.length > 2) {
            App.elements.searchResults.innerHTML = `<p class="col-span-full text-center text-gray-400 mt-8">No results found for "${App.elements.searchInput.value}"</p>`;
        }
        // Always hide spinner even if no results
        document.getElementById('results-spinner').style.display = 'none';
        return;
    }
    titles.forEach(title => {
        const item = document.createElement('div');
        item.className = 'bg-gray-800/90 rounded-lg overflow-hidden shadow-lg hover:shadow-red-500/50 transform hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col w-48 h-80';
        item.addEventListener('click', () => navigateTo(title.id));

        const imageUrl = title.primaryImage?.url || 'https://via.placeholder.com/300x450.png?text=No+Image';
        const typeIcon = title.type === 'tvSeries' || title.type === 'tvMiniSeries'
            ? '<img src="assets/images/tv.svg" alt="TV" class="h-4 w-4 inline-block mr-1" />'
            : '<img src="assets/images/movies.svg" alt="Movie" class="h-4 w-4 inline-block mr-1" />';

        item.innerHTML = `
            <div class="h-64 w-full bg-gray-700 overflow-hidden">${imageUrl ? `<img src="${imageUrl}" alt="${title.primaryTitle}" class="w-full h-full object-cover" />` : ''}</div>
            <div class="p-3 flex flex-col justify-between flex-1"> 
                <div class="font-semibold text-sm leading-tight flex items-start">${typeIcon}<span class="line-clamp-2">${title.primaryTitle}</span></div>
                <div class="text-xs text-gray-400 mt-2">${title.startYear || ''}</div>
            </div>`;
        App.elements.searchResults.appendChild(item);
    });
// Home button listeners for all main sections
document.getElementById('explore-home-btn')?.addEventListener('click', () => {
    showSection('search');
});
document.getElementById('results-home-btn')?.addEventListener('click', () => {
    showSection('search');
});
document.getElementById('details-home-btn')?.addEventListener('click', () => {
    showSection('search');
});
    // Always hide spinner after rendering results
    document.getElementById('results-spinner').style.display = 'none';
}

/**
 * Main navigation function. Decides which view to show based on URL.
 * @param {string} imdbId - The IMDb ID of the title.
 * @param {boolean} [play=false] - Whether to show the player view.
 */
function navigateTo(imdbId, play = false) {
    const url = new URL(window.location);
    url.searchParams.set('id', imdbId);
    if (play) {
        url.searchParams.set('view', 'player');
    } else {
        url.searchParams.delete('view');
    }

    if (window.location.href !== url.href) {
        window.history.pushState({ imdbId, play }, '', url);
    }

    if (play) {
        showPlayerPage();
    } else {
        showDetailsPage(imdbId);
    }
}

/**
 * Hides search and shows the main content container with a spinner.
 */
function showContentView() {
    // Hide hero and search grid, show content
    if (App.elements.homeHero) App.elements.homeHero.classList.add('hidden');
    App.elements.searchResults.classList.add('hidden');
    App.elements.watchPageContainer.classList.remove('hidden');
    // Also set display for backward compatibility
    App.elements.searchResults.style.display = 'none';
    App.elements.watchPageContainer.style.display = 'block';
    App.elements.watchPageContainer.innerHTML = `<div class="w-full flex justify-center py-16"><div class="w-12 h-12 border-4 border-t-red-500 border-gray-600 rounded-full animate-spin"></div></div>`;
}

/**
 * Shows the details page for a given IMDb ID.
 * @param {string} imdbId
 */
function showDetailsPage(imdbId) {
    showContentView();
    if (!App.currentMedia || App.currentMedia.id !== imdbId) {
        fetchMediaData(imdbId, false); // playOnLoad = false
    } else {
        renderDetailsPage(App.currentMedia.details);
    }
}

/**
 * Shows the player page for the current media.
 */
function showPlayerPage() {
    showContentView();
    if (App.currentMedia) {
        renderPlayerPage(App.currentMedia.details);
    } else {
        const urlParams = new URLSearchParams(window.location.search);
        const imdbId = urlParams.get('id');
        if (imdbId) {
            fetchMediaData(imdbId, true); // playOnLoad = true
        }
    }
}

/**
 * Hides the content container and shows the search view.
 */
function showSearchView() {
    if (App.elements.homeHero) App.elements.homeHero.classList.add('hidden');
    App.elements.watchPageContainer.classList.add('hidden');
    App.elements.searchResults.classList.remove('hidden');
    // Display style for legacy
    App.elements.searchResults.style.display = 'grid';
    App.elements.watchPageContainer.style.display = 'none';
    App.elements.watchPageContainer.innerHTML = '';
    document.title = 'Pflix';
}

function showHomeView() {
    if (!App.elements.homeHero) return showSearchView();
    App.elements.watchPageContainer.classList.add('hidden');
    App.elements.searchResults.classList.add('hidden');
    App.elements.homeHero.classList.remove('hidden');
    App.elements.watchPageContainer.style.display = 'none';
    App.elements.searchResults.style.display = 'none';
    document.title = 'Pflix';
}

/**
 * Fetches detailed media data from the API.
 * @param {string} imdbId
 * @param {boolean} playOnLoad - Whether to render the player or details page after fetching.
 */
async function fetchMediaData(imdbId, playOnLoad) {
    try {
        const response = await fetch(`${App.api.baseUrl}/titles/${imdbId}`);
        if (!response.ok) throw new Error(`API error: ${response.statusText}`);
        const data = await response.json();

        App.currentMedia = {
            id: data.id,
            isTv: data.type === 'tvSeries' || data.type === 'tvMiniSeries',
            seasons: {},
            details: data,
        };

        if (playOnLoad) {
            renderPlayerPage(data);
        } else {
            renderDetailsPage(data);
        }
    } catch (error) {
        console.error("Error fetching media data:", error);
        renderError("Could not fetch media details.");
    }
}

/**
 * Renders the details page, showing info and a play button.
 */
function renderDetailsPage(data) {
    // Update URL and page title
    const url = new URL(window.location);
    url.searchParams.set('id', data.id);
    url.searchParams.delete('view');
    url.searchParams.delete('q');
    window.history.pushState({ imdbId: data.id }, '', url);
    document.title = `${data.primaryTitle} (${data.startYear}) - Pflix`;

    const ratingsHTML = data.rating ? `
        <div class="flex items-center space-x-2">
            <svg class="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
            <div>
                <p class="text-lg font-bold text-white">${data.rating.aggregateRating}/10</p>
                <p class="text-xs text-gray-400">${data.rating.voteCount.toLocaleString()} votes</p>
            </div>
        </div>` : '';

    App.elements.watchPageContainer.innerHTML = `
        <div class="fixed inset-0 w-full h-full overflow-hidden">
            <div class="absolute inset-0 bg-cover bg-center scale-110" style="background-image: url(${data.primaryImage?.url || ''})"></div>
            <div class="absolute inset-0 bg-black/70 backdrop-blur-md"></div>
            <div class="relative z-10 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 p-8 min-h-screen w-full">
                <img src="${data.primaryImage?.url || ''}" alt="Poster" class="w-64 md:w-80 rounded-lg shadow-2xl">
                <div class="max-w-2xl text-center md:text-left">
                    <h1 class="text-4xl md:text-6xl font-bold text-white">${data.primaryTitle}</h1>
                    <div class="flex items-center justify-center md:justify-start gap-4 my-4 text-gray-300">
                        <span>${data.startYear}</span>${data.endYear ? `<span>- ${data.endYear}</span>` : ''}
                        ${data.runtimeSeconds ? `<span>• ${Math.floor(data.runtimeSeconds / 60)}m</span>` : ''}
                        <span class="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-md capitalize">${data.type}</span>
                    </div>
                    <p class="my-4 text-gray-200 leading-relaxed">${data.plot || 'No plot available.'}</p>
                    <div class="flex justify-center md:justify-start items-center gap-6 my-4">
                        ${ratingsHTML}
                    </div>
                    <button id="play-button" class="mt-4 inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-full text-lg transition-transform hover:scale-105">
                        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        Play
                    </button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('play-button').addEventListener('click', () => {
        navigateTo(data.id, true);
    });
}

/**
 * Renders the player page with video, servers, and episode selectors.
 */
function renderPlayerPage(data) {
    // Update URL and page title for player
    const url = new URL(window.location);
    url.searchParams.set('id', data.id);
    url.searchParams.set('view', 'player');
    url.searchParams.delete('q');
    window.history.pushState({ imdbId: data.id, play: true }, '', url);
    document.title = `${data.primaryTitle} - Now Playing - Pflix`;
    
    App.elements.watchPageContainer.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-8 h-full">
            <div class="lg:col-span-3 flex flex-col h-full">
                <div id="stream-player-section" class="w-full bg-black rounded-lg overflow-hidden relative aspect-video shadow-2xl">
                    <!-- Player iframe will be loaded here -->
                </div>
                <div class="flex flex-col items-center gap-2 mt-4">
                    <a href="https://www.buymeacoffee.com/prabesharyal" target="_blank" class="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold px-4 py-2 rounded-full shadow transition-all">
                        <span>Donate me so my site keeps running</span>
                        <img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy Me A Coffee" class="h-6 w-auto" />
                    </a>
                    <a href="https://getadblock.com/en/" target="_blank" class="flex items-center gap-2 mt-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 hover:bg-white/20 transition-all">
                        <img src="https://getadblock.com/images/updateAssets/core_logo_full.svg" alt="AdBlock" class="h-6 w-6" />
                        <span class="text-gray-200 text-sm font-medium">AdBlock can fix most issues with popups/ads</span>
                    </a>
                </div>
            </div>
            <aside class="lg:col-span-1 bg-gray-800 p-4 rounded-lg shadow-lg flex flex-col gap-4">
                <div id="episode-selector-container"></div>
                <h2 class="text-xl font-bold mb-4">Servers</h2>
                <div id="stream-buttons" class="flex flex-col gap-2"></div>
            </aside>
        </div>`;
    // Remove redundant home button listener - using global home button instead

    if (App.currentMedia.isTv) {
        if (Object.keys(App.currentMedia.seasons).length > 0) {
            renderEpisodeSelectors();
            renderServerButtons();
            const firstProviderId = Object.keys(STREAMING_PROVIDERS).find(id => STREAMING_PROVIDERS[id].supports.includes('tv'));
            if (firstProviderId) showStream(firstProviderId, App.currentMedia);
        } else {
            fetchEpisodes();
        }
    } else {
        renderServerButtons();
        const firstProviderId = Object.keys(STREAMING_PROVIDERS).find(id => STREAMING_PROVIDERS[id].supports.includes('movie'));
        if (firstProviderId) showStream(firstProviderId, App.currentMedia);
    }
}

/**
 * Fetches and processes episode data for a series.
 */
async function fetchEpisodes() {
    try {
        const response = await fetch(`${App.api.baseUrl}/titles/${App.currentMedia.id}/episodes`);
        if (!response.ok) throw new Error('Failed to load episode data.');
        const data = await response.json();
        const episodes = data.episodes || [];

        // API uses `season` (string). Normalize and ensure we have `seasonNumber` and `primaryTitle`.
        App.currentMedia.seasons = episodes.reduce((acc, ep) => {
            const rawSeason = ep.season ?? ep.seasonNumber ?? '1';
            const seasonKey = String(rawSeason);
            if (!acc[seasonKey]) acc[seasonKey] = [];
            acc[seasonKey].push({
                ...ep,
                seasonNumber: Number(rawSeason) || 1,
                primaryTitle: ep.primaryTitle || ep.title || `Episode ${ep.episodeNumber}`,
            });
            return acc;
        }, {});
        Object.values(App.currentMedia.seasons).forEach(s => s.sort((a,b) => a.episodeNumber - b.episodeNumber));

        renderEpisodeSelectors();
        renderServerButtons();
        const firstProviderId = Object.keys(STREAMING_PROVIDERS).find(id => STREAMING_PROVIDERS[id].supports.includes('tv'));
        if (firstProviderId) showStream(firstProviderId, App.currentMedia);

    } catch (error) {
        console.error("Error fetching episodes:", error);
        document.getElementById('episode-selector-container').innerHTML = `<p class="text-red-400 text-sm">Could not load episodes. Defaulting to S01E01.</p>`;
        renderServerButtons();
        const firstProviderId = Object.keys(STREAMING_PROVIDERS).find(id => STREAMING_PROVIDERS[id].supports.includes('tv'));
        if (firstProviderId) {
            showStream(firstProviderId, App.currentMedia);
        }
    }
}

/**
 * Renders season and episode dropdown selectors.
 */
function renderEpisodeSelectors() {
    const container = document.getElementById('episode-selector-container');
    if (!container) return;
    const seasonNumbers = Object.keys(App.currentMedia.seasons);
    if (seasonNumbers.length === 0) return;

    container.innerHTML = `
        <div class="space-y-4 mb-4 pb-4 border-b border-gray-700">
            <div>
                <label for="season-select" class="block text-sm font-medium text-gray-300 mb-1">Season</label>
                <select id="season-select" class="w-full bg-gray-700 text-white rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-red-500"></select>
            </div>
            <div>
                <label for="episode-select" class="block text-sm font-medium text-gray-300 mb-1">Episode</label>
                <select id="episode-select" class="w-full bg-gray-700 text-white rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-red-500"></select>
            </div>
        </div>`;

    const seasonSelect = document.getElementById('season-select');
    const episodeSelect = document.getElementById('episode-select');

    seasonNumbers.forEach(num => {
        const option = new Option(`Season ${num}`, num);
        seasonSelect.add(option);
    });

    const updateEpisodes = () => {
    const selectedSeason = App.currentMedia.seasons[seasonSelect.value] || [];
        episodeSelect.innerHTML = '';
        selectedSeason.forEach(ep => {
            const option = new Option(`E${ep.episodeNumber}: ${ep.primaryTitle}`, ep.episodeNumber);
            episodeSelect.add(option);
        });
        updateStreamSource();
    }

    seasonSelect.addEventListener('change', updateEpisodes);
    episodeSelect.addEventListener('change', updateStreamSource);

    updateEpisodes();
}

/**
 * Updates the streaming iframe source based on the current selections.
 */
function updateStreamSource() {
    const activeProvider = document.querySelector('button.stream-button.active')?.dataset.providerId;
    if (activeProvider) {
        showStream(activeProvider, App.currentMedia);
    }
}

/**
 * Creates and appends server buttons to the sidebar.
 */
function renderServerButtons() {
    const container = document.getElementById('stream-buttons');
    if (!container) return;
    container.innerHTML = '';
    const contentType = App.currentMedia.isTv ? 'tv' : 'movie';

    const supportedProviders = Object.entries(STREAMING_PROVIDERS).filter(([id, provider]) => provider.supports.includes(contentType));

    supportedProviders.forEach(([id, provider]) => {
        const button = document.createElement('button');
        button.className = 'stream-button w-full text-left px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors';
        button.textContent = provider.name;
        button.dataset.providerId = id;
        button.onclick = (e) => {
            document.querySelectorAll('.stream-button').forEach(btn => {
                btn.classList.remove('active', 'bg-red-600');
                if (!btn.classList.contains('bg-gray-700')) btn.classList.add('bg-gray-700');
            });
            e.currentTarget.classList.add('active', 'bg-red-600');
            e.currentTarget.classList.remove('bg-gray-700');
            // Always reload the player iframe and show spinner
            const playerSection = document.getElementById('stream-player-section');
            if (playerSection) {
                playerSection.innerHTML = `<div class="w-full h-full flex items-center justify-center"><div class="w-12 h-12 border-4 border-t-red-500 border-gray-600 rounded-full animate-spin"></div></div>`;
            }
            showStream(id, App.currentMedia);
        };
        container.appendChild(button);
    });

    if (container.firstChild) {
        container.firstChild.classList.add('active', 'bg-red-600');
        container.firstChild.classList.remove('bg-gray-700');
    }
}

/**
 * Displays the selected stream in the player with a loading indicator.
 * @param {string} streamId The ID of the streaming provider.
 * @param {object} media The media object from App.currentMedia.
 */
function showStream(streamId, media) {
    const playerSection = document.getElementById('stream-player-section');
    if (!playerSection || !media) return;

    const provider = STREAMING_PROVIDERS[streamId];
    const type = media.isTv ? 'tv' : 'movie';
    let url;
    if (type === 'movie') {
        // Use direct embed logic like streamit
        url = provider.url(media.id);
        playerSection.innerHTML = `<iframe src="${url}" title="Pflix Player" allowfullscreen class="w-full h-full"></iframe>`;
    } else {
        // TV: keep episode logic
        let season = 1, episode = 1;
        const seasonSelect = document.getElementById('season-select');
        const episodeSelect = document.getElementById('episode-select');
        season = Number(seasonSelect?.value || 1);
        episode = Number(episodeSelect?.value || 1);
        if ((seasonSelect && !season) || (episodeSelect && !episode)) {
            return;
        }
        if (!provider.supports.includes('tv')) {
            playerSection.innerHTML = `<div class="w-full h-full flex items-center justify-center text-red-400"><p>This server does not support TV streaming.</p></div>`;
            return;
        }
        url = provider.url(media.id, season, episode, true);
        playerSection.innerHTML = `<iframe src="${url}" title="Pflix Player" allowfullscreen class="w-full h-full"></iframe>`;
    }
}

function renderError(message) {
    if (App.elements.homeHero) App.elements.homeHero.classList.add('hidden');
    App.elements.searchResults.classList.add('hidden');
    App.elements.watchPageContainer.classList.remove('hidden');
    App.elements.watchPageContainer.innerHTML = `<div class="w-full text-center text-red-400 py-10">${message}</div>`;
}

/**
 * Initializes the application.
 */
function init() {
    App.elements = {
        searchInput: document.getElementById('search-input'),
        heroSearchInput: document.getElementById('hero-search-input'),
        searchResults: document.getElementById('search-results'),
        watchPageContainer: document.getElementById('watch-page-container'),
        logo: document.querySelector('header h1'),
        homeHero: document.getElementById('home-hero'),
        featuredGrid: document.getElementById('featured-grid'),
    };

    let lastSearchValue = '';
    const handleSearch = (value) => {
        clearTimeout(App.timers.searchDebounce);
        App.timers.searchDebounce = setTimeout(() => {
            const trimmed = value.trim();
            if (trimmed.length >= 3 && trimmed !== lastSearchValue) {
                lastSearchValue = trimmed;
                search(trimmed);
            } else if (trimmed.length < 3) {
                lastSearchValue = '';
                showHomeView();
            }
        }, 2000);
    };
    App.elements.searchInput.addEventListener('input', (e) => handleSearch(e.target.value));
    if (App.elements.heroSearchInput) {
        App.elements.heroSearchInput.addEventListener('input', (e) => {
            App.elements.searchInput.value = e.target.value;
            handleSearch(e.target.value);
        });
    }
    
    if (App.elements.logo) {
        App.elements.logo.style.cursor = 'pointer';
        App.elements.logo.addEventListener('click', () => {
            const url = new URL(window.location);
            url.searchParams.delete('id');
            url.searchParams.delete('view');
            window.history.pushState({}, '', url);
            if (App.elements.searchInput) App.elements.searchInput.value = '';
            if (App.elements.heroSearchInput) App.elements.heroSearchInput.value = '';
            if (App.elements.homeHero) showHomeView(); else showSearchView();
        });
    }

    window.onpopstate = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const imdbId = urlParams.get('id');
        const play = urlParams.get('view') === 'player';
        if (imdbId) {
            navigateTo(imdbId, play);
        } else {
            // No media selected: show homepage (search section) without results spinner
            showSection('search');
        }
    };

    // Initial state check on page load
    const urlParams = new URLSearchParams(window.location.search);
    const imdbId = urlParams.get('id');
    const play = urlParams.get('view') === 'player';
    const query = urlParams.get('q');
    const page = urlParams.get('page');
    
    if (imdbId) {
        navigateTo(imdbId, play);
    } else if (query) {
        App.elements.searchInput.value = query;
        search(query);
    } else if (page === 'explore') {
        showSection('explore');
        loadFeatured();
    } else {
        // Default to homepage (search section). Do not show results on initial load.
        showSection('search');
        document.title = 'Pflix - Find where to stream any movie or TV show';
    }
}

init();

// --- UI Navigation & Modal Logic ---
// Navbar removed, no nav-* listeners

document.getElementById('about-close')?.addEventListener('click', () => {
    showSection('search');
});

document.getElementById('about-home')?.addEventListener('click', () => {
    showSection('search');
});

document.getElementById('about-btn')?.addEventListener('click', () => {
    showSection('about');
});

document.getElementById('explore-btn')?.addEventListener('click', () => {
    // Update URL for explore page
    const url = new URL(window.location);
    url.searchParams.set('page', 'explore');
    url.searchParams.delete('q');
    url.searchParams.delete('id');
    url.searchParams.delete('view');
    window.history.pushState({ page: 'explore' }, '', url);
    document.title = 'Featured Movies & TV Shows - Pflix';
    
    showSection('explore');
    loadFeatured();
});

// Central search form: prevent default submit
document.getElementById('main-search-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = App.elements.searchInput.value.trim();
    if (val.length > 2) {
        showSection('results');
        search(val);
    }
});

// Section show/hide logic for smooth transitions
function showSection(section) {
    const sections = {
        search: document.getElementById('search-section'),
        explore: document.getElementById('explore-section'),
        results: document.getElementById('results-section'),
        details: document.getElementById('details-section'),
        about: document.getElementById('about-section'),
    };
    Object.entries(sections).forEach(([key, el]) => {
        if (!el) return;
        if (key === section) {
            el.classList.remove('hidden');
            el.classList.add('flex', 'fade-in');
            el.classList.remove('fade-out');
        } else {
            el.classList.add('hidden');
            el.classList.remove('flex', 'fade-in');
            el.classList.add('fade-out');
        }
    });
    // Hide spinners when entering non-results sections
    if (section !== 'results') {
        const rs = document.getElementById('results-spinner');
        if (rs) rs.style.display = 'none';
    }
    // Details/player view special case
    if (section === 'details') {
        sections.details?.classList.remove('hidden');
        sections.details?.classList.add('flex', 'fade-in');
        sections.details?.classList.remove('fade-out');
    }
    // Update the global home button visibility after any section change
    updateGlobalHomeBtn();
}

// Show correct section on navigation
function showHomeView() {
    showSection('search');
}
function showSearchView() {
    showSection('results');
}
function showContentView() {
    showSection('details');
}

/**
 * Load featured cards on the home hero
 */
async function loadFeatured() {
    if (!App.elements.featuredGrid) return;
    App.elements.featuredGrid.innerHTML = '';
    document.getElementById('explore-spinner').style.display = 'flex';
    try {
        const res = await fetch(`${App.api.baseUrl}/titles`);
        if (!res.ok) throw new Error('Failed to load featured');
        const data = await res.json();
        const list = (data.titles || []).slice(0, 12).map(d => ({
            id: d.id,
            title: d.primaryTitle,
            year: d.startYear,
            img: d.primaryImage?.url,
            type: d.type,
        }));
        list.forEach((c) => {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'text-left bg-gray-800/90 hover:bg-gray-700 rounded-lg overflow-hidden shadow-lg hover:shadow-red-500/30 transition-all flex flex-col w-48 h-80';
            const typeIcon = c.type === 'tvSeries' || c.type === 'tvMiniSeries'
                ? '<img src="assets/images/tv.svg" alt="TV" class="h-4 w-4 inline-block mr-1" />'
                : '<img src="assets/images/movies.svg" alt="Movie" class="h-4 w-4 inline-block mr-1" />';
            card.innerHTML = `
                <div class="h-64 w-full bg-gray-700 overflow-hidden">${c.img ? `<img src="${c.img}" alt="${c.title}" class="w-full h-full object-cover" />` : ''}</div>
                <div class="p-3 flex flex-col justify-between flex-1"> 
                    <div class="font-semibold text-sm leading-tight flex items-start line-clamp-2">${typeIcon}<span class="line-clamp-2">${c.title}</span></div>
                    <div class="text-xs text-gray-400 mt-2">${c.year || ''}</div>
                </div>`;
            card.addEventListener('click', () => navigateTo(c.id, false));
            App.elements.featuredGrid.appendChild(card);
        });
        document.getElementById('explore-spinner').style.display = 'none';
    } catch (e) {
        console.warn('Featured load failed, falling back to static IDs', e);
        const ids = App.featured.slice(0, 12);
        for (const id of ids) {
            try {
                const r = await fetch(`${App.api.baseUrl}/titles/${id}`);
                if (!r.ok) continue;
                const d = await r.json();
                const c = { id: d.id, title: d.primaryTitle, year: d.startYear, img: d.primaryImage?.url, type: d.type };
                const card = document.createElement('button');
                card.type = 'button';
                card.className = 'text-left bg-gray-800/90 hover:bg-gray-700 rounded-lg overflow-hidden shadow-lg hover:shadow-red-500/30 transition-all flex flex-col w-48 h-80';
                const typeIcon = c.type === 'tvSeries' || c.type === 'tvMiniSeries'
                    ? '<img src="assets/images/tv.svg" alt="TV" class="h-4 w-4 inline-block mr-1" />'
                    : '<img src="assets/images/movies.svg" alt="Movie" class="h-4 w-4 inline-block mr-1" />';
                card.innerHTML = `
                    <div class="h-64 w-full bg-gray-700 overflow-hidden">${c.img ? `<img src="${c.img}" alt="${c.title}" class="w-full h-full object-cover" />` : ''}</div>
                    <div class="p-3 flex flex-col justify-between flex-1">
                        <div class="font-semibold text-sm leading-tight flex items-start line-clamp-2">${typeIcon}<span class="line-clamp-2">${c.title}</span></div>
                        <div class="text-xs text-gray-400 mt-2">${c.year || ''}</div>
                    </div>`;
                card.addEventListener('click', () => navigateTo(c.id, false));
                App.elements.featuredGrid.appendChild(card);
            } catch {}
        }
        document.getElementById('explore-spinner').style.display = 'none';
    }
}
