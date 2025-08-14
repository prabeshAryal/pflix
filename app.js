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
};

/**
 * Performs a search query to the API.
 */
async function search(query) {
    if (query.length < 3) {
        renderSearchResults([]);
        return;
    }
    try {
        const response = await fetch(`${App.api.baseUrl}/search/titles?query=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error(`API error: ${response.statusText}`);
        const data = await response.json();
        renderSearchResults(data.titles || []);
    } catch (error) {
        console.error("Error fetching search results:", error);
        renderError("Could not fetch search results.");
    }
}

/**
 * Renders the search results on the page.
 */
function renderSearchResults(titles) {
    App.elements.searchResults.innerHTML = '';
    if (titles.length === 0) {
        if (App.elements.searchInput.value.length > 2) {
            App.elements.searchResults.innerHTML = `<p class="col-span-full text-center text-gray-400 mt-8">No results found for "${App.elements.searchInput.value}"</p>`;
        }
        return;
    }
    titles.forEach(title => {
        const item = document.createElement('div');
        item.className = 'bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-red-500/50 transform hover:-translate-y-1 transition-all duration-200 cursor-pointer';
        item.addEventListener('click', () => navigateTo(title.id));

        const imageUrl = title.primaryImage ? title.primaryImage.url : 'https://via.placeholder.com/300x450.png?text=No+Image';

        item.innerHTML = `
            <img src="${imageUrl}" alt="${title.primaryTitle}" class="w-full h-auto object-cover">
            <div class="p-4">
                <h3 class="font-bold text-lg truncate">${title.primaryTitle}</h3>
                <p class="text-gray-400">${title.startYear || 'N/A'}</p>
            </div>
        `;
        App.elements.searchResults.appendChild(item);
    });
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
    App.elements.searchResults.style.display = 'none';
    App.elements.watchPageContainer.style.display = 'block';
    App.elements.watchPageContainer.innerHTML = `<div class="loading-spinner"></div>`;
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
    App.elements.searchResults.style.display = 'grid';
    App.elements.watchPageContainer.style.display = 'none';
    App.elements.watchPageContainer.innerHTML = '';
    const url = new URL(window.location);
    url.searchParams.delete('id');
    url.searchParams.delete('view');
    if (window.location.pathname !== url.pathname || window.location.search !== '') {
        window.history.pushState({}, '', url);
    }
    document.title = 'Stream It';
    App.elements.searchInput.value = '';
    App.elements.searchInput.focus();
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
    document.title = `${data.primaryTitle} - Details`;

    const ratingsHTML = data.rating ? `
        <div class="flex items-center space-x-2">
            <svg class="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
            <div>
                <p class="text-lg font-bold text-white">${data.rating.aggregateRating}/10</p>
                <p class="text-xs text-gray-400">${data.rating.voteCount.toLocaleString()} votes</p>
            </div>
        </div>` : '';

    App.elements.watchPageContainer.innerHTML = `
        <div class="relative min-h-screen -m-4 md:-m-8">
            <div class="absolute inset-0 bg-cover bg-center" style="background-image: url(${data.primaryImage?.url || ''})"></div>
            <div class="absolute inset-0 bg-black/70 backdrop-blur-md"></div>
            <div class="relative z-10 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 p-8 min-h-screen">
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
    document.title = `${data.primaryTitle} - Playing`;
    App.elements.watchPageContainer.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div class="lg:col-span-3">
                <div id="stream-player-section" class="w-full bg-black rounded-lg overflow-hidden relative aspect-video shadow-2xl">
                    <!-- Player iframe will be loaded here -->
                </div>
            </div>
            <aside class="lg:col-span-1 bg-gray-800 p-4 rounded-lg shadow-lg">
                <div id="episode-selector-container"></div>
                <h2 class="text-xl font-bold mb-4">Servers</h2>
                <div id="stream-buttons" class="flex flex-col gap-2"></div>
            </aside>
        </div>`;

    if (App.currentMedia.isTv) {
        if (Object.keys(App.currentMedia.seasons).length > 0) {
            renderEpisodeSelectors();
            renderServerButtons();
            const firstProviderId = Object.keys(STREAMING_PROVIDERS).find(id => STREAMING_PROVIDERS[id].supports.includes('tv'));
            if (firstProviderId) showStream(firstProviderId);
        } else {
            fetchEpisodes();
        }
    } else {
        renderServerButtons();
        const firstProviderId = Object.keys(STREAMING_PROVIDERS).find(id => STREAMING_PROVIDERS[id].supports.includes('movie'));
        if (firstProviderId) showStream(firstProviderId);
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

        App.currentMedia.seasons = episodes.reduce((acc, ep) => {
            if (!acc[ep.seasonNumber]) acc[ep.seasonNumber] = [];
            acc[ep.seasonNumber].push(ep);
            return acc;
        }, {});
        Object.values(App.currentMedia.seasons).forEach(s => s.sort((a,b) => a.episodeNumber - b.episodeNumber));

        renderEpisodeSelectors();
        renderServerButtons();
        const firstProviderId = Object.keys(STREAMING_PROVIDERS).find(id => STREAMING_PROVIDERS[id].supports.includes('tv'));
        if (firstProviderId) showStream(firstProviderId);

    } catch (error) {
        console.error("Error fetching episodes:", error);
        document.getElementById('episode-selector-container').innerHTML = `<p class="text-red-400 text-sm">Could not load episodes.</p>`;
        renderServerButtons();
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
        showStream(activeProvider);
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
                if (btn.classList.contains('bg-gray-700') === false) {
                    btn.classList.add('bg-gray-700');
                }
            });
            e.currentTarget.classList.add('active', 'bg-red-600');
            e.currentTarget.classList.remove('bg-gray-700');
            showStream(id);
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
 */
function showStream(streamId) {
    const playerSection = document.getElementById('stream-player-section');
    if (!playerSection) return;

    playerSection.innerHTML = `<div class="w-full h-full flex items-center justify-center"><div class="w-12 h-12 border-4 border-t-red-500 border-gray-600 rounded-full animate-spin"></div></div>`;

    let season = 1, episode = 1;
    if (App.currentMedia.isTv) {
        const seasonSelect = document.getElementById('season-select');
        const episodeSelect = document.getElementById('episode-select');
        season = seasonSelect?.value || 1;
        episode = episodeSelect?.value || 1;

        if ((seasonSelect && !season) || (episodeSelect && !episode)) {
            return;
        }
    }

    const url = STREAMING_PROVIDERS[streamId].url(App.currentMedia.id, season, episode, App.currentMedia.isTv);

    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.title = "Stream It Player";
    iframe.allowFullscreen = true;
    iframe.className = "w-full h-full";

    iframe.onload = () => {
        playerSection.innerHTML = '';
        playerSection.appendChild(iframe);
    };

    iframe.onerror = () => {
        playerSection.innerHTML = `<div class="w-full h-full flex items-center justify-center text-red-400"><p>Failed to load stream. Please try another server.</p></div>`;
    };
}

function renderError(message) {
    App.elements.watchPageContainer.innerHTML = `<div class="error-message">${message}</div>`;
}

/**
 * Initializes the application.
 */
function init() {
    App.elements = {
        searchInput: document.getElementById('search-input'),
        searchResults: document.getElementById('search-results'),
        watchPageContainer: document.getElementById('watch-page-container'),
        logo: document.querySelector('.main-header h1'),
    };

    App.elements.searchInput.addEventListener('input', (e) => {
        clearTimeout(App.timers.searchDebounce);
        App.timers.searchDebounce = setTimeout(() => search(e.target.value.trim()), 300);
    });
    
    App.elements.logo.style.cursor = 'pointer';
    App.elements.logo.addEventListener('click', showSearchView);

    window.onpopstate = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const imdbId = urlParams.get('id');
        const play = urlParams.get('view') === 'player';
        if (imdbId) {
            navigateTo(imdbId, play);
        } else {
            showSearchView();
        }
    };

    // Initial state check on page load
    const urlParams = new URLSearchParams(window.location.search);
    const imdbId = urlParams.get('id');
    const play = urlParams.get('view') === 'player';
    if (imdbId) {
        navigateTo(imdbId, play);
    } else {
        showSearchView();
    }
}

init();
