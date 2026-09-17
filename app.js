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
        baseUrl: 'https://imdb-api.prabeshtechnologies.workers.dev',
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
        'tt15398776', // Oppenheimer
        'tt1190634', // The Boys
        'tt1877830', // The Batman
        'tt4574334', // Stranger Things
        'tt1517268', // Barbie
        'tt11198330', // House of the Dragon
    ],
};

/**
 * Performs a search query to the API.
 */
async function search(query) {
    if (query.length < 1) {
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
        let results = [];
        // First try the new worker API search endpoint: /search?query=...
        try {
            const response = await fetch(`${App.api.baseUrl}/search?query=${encodeURIComponent(query)}`);
            if (response.ok) {
                const data = await response.json();
                results = data.results || data.titles || [];
            }
        } catch (_) {}

        // Fallback to legacy endpoint if no results returned yet
        if (!results || results.length === 0) {
            try {
                const fallbackResponse = await fetch(`${App.api.baseUrl}/search/titles?query=${encodeURIComponent(query)}`);
                if (fallbackResponse.ok) {
                    const data = await fallbackResponse.json();
                    results = data.results || data.titles || [];
                }
            } catch (_) {}
        }

        renderSearchResults(results || []);
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
    if (!titles || titles.length === 0) {
        if (App.elements.searchInput.value.length > 1) {
            App.elements.searchResults.innerHTML = `<p class="col-span-full text-center text-gray-400 mt-8">No results found for "${App.elements.searchInput.value}"</p>`;
        }
        document.getElementById('results-spinner').style.display = 'none';
        return;
    }
    titles.forEach(title => {
        const item = document.createElement('div');
        item.className = 'movie-card bg-gray-800/90 border border-white/5 rounded-xl overflow-hidden shadow-lg cursor-pointer flex flex-col w-36 sm:w-48 h-64 sm:h-80 group relative';
        item.addEventListener('click', () => navigateTo(title.id));

        const titleName = title.title || title.primaryTitle || 'Unknown Title';
        const year = title.year || title.startYear || '';
        const imageUrl = title.image || title.image_large || title.primaryImage?.url || '';
        const isTv = title.type === 'tvSeries' || title.type === 'tvMiniSeries' || title.type === 'tvMovie';
        const typeLabel = isTv ? 'TV' : 'Movie';

        item.innerHTML = `
            <div class="aspect-[2/3] w-full bg-gray-900 overflow-hidden relative">
                ${imageUrl ? `<img src="${imageUrl}" alt="${titleName}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />` : `<div class="w-full h-full flex items-center justify-center text-gray-500 text-xs">No Image</div>`}
                <span class="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md text-gray-200 uppercase tracking-wider">${typeLabel}</span>
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div class="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                        <svg class="w-5 h-5 fill-current translate-x-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                </div>
            </div>
            <div class="p-2.5 sm:p-3 flex flex-col justify-between flex-1 bg-gray-800/95"> 
                <div class="font-semibold text-xs sm:text-sm leading-tight line-clamp-2 text-gray-100 group-hover:text-red-400 transition-colors">${titleName}</div>
                <div class="text-[11px] sm:text-xs text-gray-400 mt-1 sm:mt-2 flex items-center justify-between">
                    <span>${year}</span>
                    <span class="text-[11px] text-red-400 font-medium">Watch →</span>
                </div>
            </div>`;
        App.elements.searchResults.appendChild(item);
    });

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
        let data = null;
        // 1. Try new API endpoint: /title/{id}
        try {
            const response = await fetch(`${App.api.baseUrl}/title/${imdbId}`);
            if (response.ok) {
                data = await response.json();
            }
        } catch (_) {}

        // 2. Fallback to /titles/{id} if needed
        if (!data || data.message || !data.id) {
            try {
                const responseOld = await fetch(`${App.api.baseUrl}/titles/${imdbId}`);
                if (responseOld.ok) {
                    data = await responseOld.json();
                }
            } catch (_) {}
        }

        // 3. Fallback: if details fetch fails, try /search?query={id} to at least get basic info
        if (!data || data.message || !data.id) {
            try {
                const sRes = await fetch(`${App.api.baseUrl}/search?query=${encodeURIComponent(imdbId)}`);
                if (sRes.ok) {
                    const sData = await sRes.json();
                    const found = (sData.results || sData.titles || []).find(x => x.id === imdbId);
                    if (found) {
                        data = {
                            id: imdbId,
                            title: found.title || found.primaryTitle,
                            image: found.image || found.image_large,
                            year: found.year || found.startYear,
                            type: found.type,
                            isSeries: found.type === 'tvSeries' || found.type === 'tvMiniSeries',
                        };
                    }
                }
            } catch (_) {}
        }

        // Normalize data across APIs
        const titleName = data?.title || data?.primaryTitle || data?.name || imdbId;
        const posterUrl = data?.image || data?.image_large || data?.primaryImage?.url || data?.images?.[0] || '';
        const year = data?.year || data?.startYear || (data?.releaseDetailed?.year ?? '');
        const contentType = data?.contentType || data?.type || (data?.isSeries ? 'tvSeries' : 'movie');
        const isTv = Boolean(data?.isSeries || contentType === 'tvSeries' || contentType === 'tvMiniSeries' || contentType === 'tvMovie');
        const plot = typeof data?.plot === 'string' ? data.plot : (data?.plot?.plotText?.plainText || 'No plot available.');
        const ratingVal = data?.rating?.star ?? data?.rating?.aggregateRating ?? null;
        const ratingVotes = data?.rating?.count ?? data?.rating?.voteCount ?? 0;
        const runtimeSeconds = data?.runtimeSeconds ?? 0;

        const normalizedData = {
            id: imdbId,
            primaryTitle: titleName,
            title: titleName,
            startYear: year,
            year: year,
            endYear: data?.endYear || '',
            type: contentType,
            contentType: contentType,
            isTv: isTv,
            isSeries: isTv,
            primaryImage: { url: posterUrl },
            image: posterUrl,
            images: data?.images || [],
            plot: plot,
            runtimeSeconds: runtimeSeconds,
            runtime: data?.runtime || (runtimeSeconds ? `${Math.floor(runtimeSeconds / 60)}m` : ''),
            rating: ratingVal ? { aggregateRating: ratingVal, voteCount: ratingVotes } : null,
            all_seasons: data?.all_seasons || [],
            seasons: data?.seasons || [],
            details: data || {},
        };

        App.currentMedia = {
            id: imdbId,
            isTv: isTv,
            seasons: {},
            details: normalizedData,
        };

        if (playOnLoad) {
            renderPlayerPage(normalizedData);
        } else {
            renderDetailsPage(normalizedData);
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
    const url = new URL(window.location);
    url.searchParams.set('id', data.id);
    url.searchParams.delete('view');
    url.searchParams.delete('q');
    window.history.pushState({ imdbId: data.id }, '', url);
    document.title = `${data.primaryTitle}${data.startYear ? ` (${data.startYear})` : ''} - Pflix`;

    const ratingsHTML = data.rating ? `
        <div class="flex items-center space-x-2">
            <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
            <div>
                <span class="text-base font-bold text-white">${data.rating.aggregateRating}/10</span>
                <span class="text-xs text-gray-400 ml-1">(${Number(data.rating.voteCount).toLocaleString()} votes)</span>
            </div>
        </div>` : '';

    const poster = data.primaryImage?.url || data.image || '';

    App.elements.watchPageContainer.innerHTML = `
        <div class="relative w-full flex-1 flex items-center justify-center overflow-hidden py-8 px-4 sm:px-8">
            <div class="absolute inset-0 overflow-hidden pointer-events-none">
                <div class="w-full h-full bg-cover bg-center blur-3xl scale-110 opacity-25" style="background-image: url(${poster})"></div>
                <div class="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/90 to-gray-900/70"></div>
            </div>
            <div class="relative z-10 flex flex-col md:flex-row items-center justify-center gap-6 sm:gap-10 md:gap-16 max-w-5xl w-full my-auto">
                <div class="flex-shrink-0 w-44 sm:w-56 md:w-72 shadow-2xl rounded-2xl overflow-hidden border border-white/10 bg-gray-800">
                    <img src="${poster || 'https://via.placeholder.com/300x450.png?text=No+Image'}" alt="${data.primaryTitle}" class="w-full h-auto object-cover block aspect-[2/3]" />
                </div>
                <div class="flex-1 max-w-xl text-center md:text-left flex flex-col items-center md:items-start">
                    <div class="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2 text-xs">
                        <span class="bg-red-600/90 text-white font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">${data.type || 'Movie'}</span>
                        ${data.startYear ? `<span class="text-gray-300 bg-white/10 px-2 py-0.5 rounded-full">${data.startYear}${data.endYear ? ` - ${data.endYear}` : ''}</span>` : ''}
                        ${data.runtime ? `<span class="text-gray-400">• ${data.runtime}</span>` : (data.runtimeSeconds ? `<span class="text-gray-400">• ${Math.floor(data.runtimeSeconds / 60)}m</span>` : '')}
                    </div>
                    <h1 class="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mb-3 leading-tight">${data.primaryTitle}</h1>
                    <p class="text-sm sm:text-base text-gray-300 leading-relaxed mb-4 line-clamp-4 md:line-clamp-none">${data.plot || 'No plot available.'}</p>
                    ${ratingsHTML ? `<div class="mb-5">${ratingsHTML}</div>` : ''}
                    <div class="flex flex-wrap items-center gap-3 mt-1">
                        <button id="play-button" type="button" class="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold py-2.5 sm:py-3 px-6 sm:px-8 rounded-full text-base shadow-xl shadow-red-600/30 transition-all hover:scale-105 cursor-pointer">
                            <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                            <span>Play Now</span>
                        </button>
                        <button id="details-back-btn" type="button" class="inline-flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium py-2.5 sm:py-3 px-5 rounded-full text-sm border border-white/10 transition-colors cursor-pointer">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                            <span>Back</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('play-button').addEventListener('click', () => {
        navigateTo(data.id, true);
    });

    document.getElementById('details-back-btn')?.addEventListener('click', () => {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            showHomeView();
        }
    });
}

/**
 * Renders the player page with video, servers, and episode selectors.
 */
function renderPlayerPage(data) {
    const url = new URL(window.location);
    url.searchParams.set('id', data.id);
    url.searchParams.set('view', 'player');
    url.searchParams.delete('q');
    window.history.pushState({ imdbId: data.id, play: true }, '', url);
    document.title = `${data.primaryTitle} - Now Playing - Pflix`;
    
    App.elements.watchPageContainer.innerHTML = `
        <div class="w-full max-w-7xl mx-auto p-2 sm:p-4 md:p-6 flex flex-col gap-3">
            <div class="flex items-center justify-between py-1 border-b border-white/5 pb-2">
                <div class="flex items-center gap-2 sm:gap-3">
                    <button id="player-back-btn" class="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg transition-all cursor-pointer">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                        <span>Details</span>
                    </button>
                    <h1 class="text-sm sm:text-base md:text-lg font-bold text-white truncate max-w-[200px] sm:max-w-md md:max-w-lg">${data.primaryTitle}</h1>
                    ${data.startYear ? `<span class="text-xs text-gray-400 hidden sm:inline">(${data.startYear})</span>` : ''}
                </div>
                <button id="player-home-btn" class="flex items-center gap-1 text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer">
                    <img src="assets/images/home.svg" alt="Home" class="h-3.5 w-3.5" />
                    <span>Home</span>
                </button>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
                <div class="lg:col-span-3 flex flex-col">
                    <div id="stream-player-section" class="w-full bg-black rounded-xl overflow-hidden relative aspect-video shadow-2xl border border-white/10">
                        <!-- Player iframe will be loaded here -->
                    </div>
                    <div class="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-white/5">
                        <a href="https://getadblock.com/en/" target="_blank" rel="noopener" class="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-200 transition-colors">
                            <img src="https://getadblock.com/images/updateAssets/core_logo_full.svg" alt="AdBlock" class="h-4 w-4" />
                            <span>AdBlock is recommended for third-party embeds</span>
                        </a>
                        <a href="https://www.buymeacoffee.com/prabesharyal" target="_blank" rel="noopener" class="flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold px-3 py-1 rounded-full text-xs transition-transform hover:scale-105">
                            <span>Donate</span>
                            <img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy Me A Coffee" class="h-4 w-auto" />
                        </a>
                    </div>
                </div>
                <aside class="lg:col-span-1 bg-gray-800/80 border border-white/10 p-3 sm:p-4 rounded-xl shadow-xl flex flex-col gap-3">
                    <div id="episode-selector-container"></div>
                    <div class="flex items-center justify-between pb-1 border-b border-gray-700/60">
                        <h2 class="text-sm sm:text-base font-bold flex items-center gap-2 text-white">
                            <span>Servers</span>
                            <span id="health-check-indicator" class="text-[10px] font-normal px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">testing...</span>
                        </h2>
                        <button id="recheck-health-btn" title="Re-check server latency" class="text-[11px] bg-gray-700 hover:bg-gray-600 text-gray-200 px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                            <span>Ping</span>
                        </button>
                    </div>
                    <div id="stream-buttons" class="flex flex-col gap-1.5 max-h-[460px] overflow-y-auto pr-1"></div>
                </aside>
            </div>
        </div>`;

    document.getElementById('player-back-btn')?.addEventListener('click', () => {
        navigateTo(data.id, false);
    });

    document.getElementById('player-home-btn')?.addEventListener('click', () => {
        showHomeView();
    });

    document.getElementById('recheck-health-btn')?.addEventListener('click', () => {
        runServerHealthChecks();
    });

    const urlParams = new URLSearchParams(window.location.search);
    const preferredServer = urlParams.get('server');

    if (App.currentMedia.isTv) {
        if (Object.keys(App.currentMedia.seasons).length > 0) {
            renderEpisodeSelectors();
            renderServerButtons(preferredServer);
            const defaultProviderId = (preferredServer && STREAMING_PROVIDERS[preferredServer]?.supports.includes('tv'))
                ? preferredServer
                : Object.keys(STREAMING_PROVIDERS).find(id => STREAMING_PROVIDERS[id].supports.includes('tv'));
            if (defaultProviderId) showStream(defaultProviderId, App.currentMedia);
            runServerHealthChecks();
        } else {
            fetchEpisodes(preferredServer);
        }
    } else {
        renderServerButtons(preferredServer);
        const defaultProviderId = (preferredServer && STREAMING_PROVIDERS[preferredServer]?.supports.includes('movie'))
            ? preferredServer
            : Object.keys(STREAMING_PROVIDERS).find(id => STREAMING_PROVIDERS[id].supports.includes('movie'));
        if (defaultProviderId) showStream(defaultProviderId, App.currentMedia);
        runServerHealthChecks();
    }
}

/**
 * Fetches and processes episode data for a series.
 */
async function fetchEpisodes(preferredServer = null) {
    try {
        let seasonsObj = {};
        const details = App.currentMedia.details || {};

        // 1. Check if all_seasons was provided by title details
        if (Array.isArray(details.all_seasons) && details.all_seasons.length > 0) {
            details.all_seasons.forEach(s => {
                const sKey = String(s.id || s.value || s);
                if (!seasonsObj[sKey]) seasonsObj[sKey] = [];
            });
            // First season episodes might already be attached
            if (Array.isArray(details.seasons?.[0]?.episodes)) {
                seasonsObj['1'] = details.seasons[0].episodes.map((ep, i) => ({
                    episodeNumber: Number(ep.no || ep.idx || (i + 1)),
                    seasonNumber: 1,
                    primaryTitle: ep.title || `Episode ${ep.no || (i + 1)}`,
                }));
            }
        }

        // 2. If season 1 episodes aren't populated yet, fetch season 1 from /title/{id}/season/1
        if (!seasonsObj['1'] || seasonsObj['1'].length === 0) {
            try {
                const s1Res = await fetch(`${App.api.baseUrl}/title/${App.currentMedia.id}/season/1`);
                if (s1Res.ok) {
                    const s1Data = await s1Res.json();
                    if (Array.isArray(s1Data.all_seasons)) {
                        s1Data.all_seasons.forEach(s => {
                            const sKey = String(s.id || s.value || s);
                            if (!seasonsObj[sKey]) seasonsObj[sKey] = [];
                        });
                    }
                    if (Array.isArray(s1Data.episodes)) {
                        seasonsObj['1'] = s1Data.episodes.map((ep, i) => ({
                            episodeNumber: Number(ep.no || ep.idx || (i + 1)),
                            seasonNumber: 1,
                            primaryTitle: ep.title || `Episode ${ep.no || (i + 1)}`,
                        }));
                    }
                }
            } catch (_) {}
        }

        // 3. Fallback: try old /titles/{id}/episodes route
        if (Object.keys(seasonsObj).length === 0 || !seasonsObj['1'] || seasonsObj['1'].length === 0) {
            try {
                const oldEpRes = await fetch(`${App.api.baseUrl}/titles/${App.currentMedia.id}/episodes`);
                if (oldEpRes.ok) {
                    const oldEpData = await oldEpRes.json();
                    const episodes = oldEpData.episodes || [];
                    seasonsObj = episodes.reduce((acc, ep) => {
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
                }
            } catch (_) {}
        }

        // 4. Default fallback: at least have Season 1 Episode 1
        if (Object.keys(seasonsObj).length === 0) {
            seasonsObj['1'] = [{ episodeNumber: 1, seasonNumber: 1, primaryTitle: 'Episode 1' }];
        } else if (!seasonsObj['1'] || seasonsObj['1'].length === 0) {
            seasonsObj['1'] = [{ episodeNumber: 1, seasonNumber: 1, primaryTitle: 'Episode 1' }];
        }

        App.currentMedia.seasons = seasonsObj;
        Object.values(App.currentMedia.seasons).forEach(s => s.sort((a,b) => a.episodeNumber - b.episodeNumber));

        renderEpisodeSelectors();
        renderServerButtons(preferredServer);
        const defaultProviderId = (preferredServer && STREAMING_PROVIDERS[preferredServer]?.supports.includes('tv'))
            ? preferredServer
            : Object.keys(STREAMING_PROVIDERS).find(id => STREAMING_PROVIDERS[id].supports.includes('tv'));
        if (defaultProviderId) showStream(defaultProviderId, App.currentMedia);
        runServerHealthChecks();

    } catch (error) {
        console.error("Error fetching episodes:", error);
        document.getElementById('episode-selector-container').innerHTML = `<p class="text-red-400 text-sm">Could not load episodes. Defaulting to S01E01.</p>`;
        App.currentMedia.seasons = { '1': [{ episodeNumber: 1, seasonNumber: 1, primaryTitle: 'Episode 1' }] };
        renderServerButtons(preferredServer);
        const defaultProviderId = Object.keys(STREAMING_PROVIDERS).find(id => STREAMING_PROVIDERS[id].supports.includes('tv'));
        if (defaultProviderId) {
            showStream(defaultProviderId, App.currentMedia);
        }
        runServerHealthChecks();
    }
}

/**
 * Fetch a specific season's episodes on demand if not cached
 */
async function ensureSeasonLoaded(seasonNum) {
    const sKey = String(seasonNum);
    if (App.currentMedia.seasons[sKey] && App.currentMedia.seasons[sKey].length > 0) {
        return App.currentMedia.seasons[sKey];
    }
    try {
        const res = await fetch(`${App.api.baseUrl}/title/${App.currentMedia.id}/season/${seasonNum}`);
        if (res.ok) {
            const sData = await res.json();
            if (Array.isArray(sData.episodes) && sData.episodes.length > 0) {
                const eps = sData.episodes.map((ep, i) => ({
                    episodeNumber: Number(ep.no || ep.idx || (i + 1)),
                    seasonNumber: Number(seasonNum),
                    primaryTitle: ep.title || `Episode ${ep.no || (i + 1)}`,
                }));
                eps.sort((a, b) => a.episodeNumber - b.episodeNumber);
                App.currentMedia.seasons[sKey] = eps;
                return eps;
            }
        }
    } catch (_) {}

    const fallback = [{ episodeNumber: 1, seasonNumber: Number(seasonNum), primaryTitle: 'Episode 1' }];
    App.currentMedia.seasons[sKey] = fallback;
    return fallback;
}

/**
 * Renders season and episode dropdown selectors with Prev / Next navigation.
 */
function renderEpisodeSelectors() {
    const container = document.getElementById('episode-selector-container');
    if (!container) return;
    const seasonNumbers = Object.keys(App.currentMedia.seasons).sort((a, b) => Number(a) - Number(b));
    if (seasonNumbers.length === 0) return;

    const urlParams = new URLSearchParams(window.location.search);
    const initialSeason = urlParams.get('season') || urlParams.get('s') || seasonNumbers[0];
    const initialEpisode = Number(urlParams.get('episode') || urlParams.get('e') || 1);

    container.innerHTML = `
        <div class="space-y-3 mb-4 pb-4 border-b border-gray-700">
            <div>
                <label for="season-select" class="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Season</label>
                <select id="season-select" class="w-full bg-gray-700 text-white rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"></select>
            </div>
            <div>
                <label for="episode-select" class="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Episode</label>
                <select id="episode-select" class="w-full bg-gray-700 text-white rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"></select>
            </div>
            <div class="flex items-center gap-2 pt-1">
                <button id="prev-ep-btn" type="button" class="flex-1 py-1.5 px-3 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                    <span>Prev</span>
                </button>
                <button id="next-ep-btn" type="button" class="flex-1 py-1.5 px-3 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer">
                    <span>Next</span>
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </button>
            </div>
        </div>`;

    const seasonSelect = document.getElementById('season-select');
    const episodeSelect = document.getElementById('episode-select');
    const prevEpBtn = document.getElementById('prev-ep-btn');
    const nextEpBtn = document.getElementById('next-ep-btn');

    seasonNumbers.forEach(num => {
        const option = new Option(`Season ${num}`, num);
        if (String(num) === String(initialSeason)) option.selected = true;
        seasonSelect.add(option);
    });

    const updateNavButtons = () => {
        const sVal = seasonSelect.value;
        const eVal = Number(episodeSelect.value);
        const sIdx = seasonNumbers.indexOf(sVal);
        const curSeasonEps = App.currentMedia.seasons[sVal] || [];
        const epIdx = curSeasonEps.findIndex(e => e.episodeNumber === eVal);

        const isFirst = sIdx === 0 && epIdx <= 0;
        const isLast = (sIdx === seasonNumbers.length - 1) && (epIdx >= curSeasonEps.length - 1);

        if (prevEpBtn) prevEpBtn.disabled = isFirst;
        if (nextEpBtn) nextEpBtn.disabled = isLast;
    };

    const updateEpisodes = async (targetEp = null) => {
        const sVal = seasonSelect.value;
        const selectedSeason = await ensureSeasonLoaded(sVal);

        episodeSelect.innerHTML = '';
        selectedSeason.forEach(ep => {
            const option = new Option(`E${ep.episodeNumber}: ${ep.primaryTitle}`, ep.episodeNumber);
            episodeSelect.add(option);
        });

        if (targetEp !== null) {
            const match = selectedSeason.find(e => e.episodeNumber === targetEp);
            if (match) episodeSelect.value = targetEp;
            else if (targetEp === 'last') episodeSelect.value = selectedSeason[selectedSeason.length - 1].episodeNumber;
        }

        updateNavButtons();
        updateStreamSource();
    };

    // Prev / Next button handlers with season rollover
    prevEpBtn?.addEventListener('click', async () => {
        const sVal = seasonSelect.value;
        const eVal = Number(episodeSelect.value);
        const sIdx = seasonNumbers.indexOf(sVal);
        const curSeasonEps = App.currentMedia.seasons[sVal] || [];
        const epIdx = curSeasonEps.findIndex(e => e.episodeNumber === eVal);

        if (epIdx > 0) {
            episodeSelect.value = curSeasonEps[epIdx - 1].episodeNumber;
            updateNavButtons();
            updateStreamSource();
        } else if (sIdx > 0) {
            // Rollover to previous season's last episode
            seasonSelect.value = seasonNumbers[sIdx - 1];
            await updateEpisodes('last');
        }
    });

    nextEpBtn?.addEventListener('click', async () => {
        const sVal = seasonSelect.value;
        const eVal = Number(episodeSelect.value);
        const sIdx = seasonNumbers.indexOf(sVal);
        const curSeasonEps = App.currentMedia.seasons[sVal] || [];
        const epIdx = curSeasonEps.findIndex(e => e.episodeNumber === eVal);

        if (epIdx < curSeasonEps.length - 1 && epIdx !== -1) {
            episodeSelect.value = curSeasonEps[epIdx + 1].episodeNumber;
            updateNavButtons();
            updateStreamSource();
        } else if (sIdx < seasonNumbers.length - 1) {
            // Rollover to next season's first episode
            seasonSelect.value = seasonNumbers[sIdx + 1];
            await updateEpisodes(1);
        }
    });

    seasonSelect.addEventListener('change', () => updateEpisodes(1));
    episodeSelect.addEventListener('change', () => {
        updateNavButtons();
        updateStreamSource();
    });

    updateEpisodes(initialEpisode);
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
 * Updates a single server button UI with live ping health results.
 */
function updateServerStatusUI(result) {
    const btn = document.querySelector(`button.stream-button[data-provider-id="${result.id}"]`);
    if (!btn) return;
    const dot = btn.querySelector('.server-status-dot');
    const latency = btn.querySelector('.server-latency');
    if (!dot || !latency) return;

    dot.classList.remove('animate-status-pulse', 'bg-gray-500', 'bg-emerald-400', 'bg-amber-400', 'bg-rose-500');
    latency.classList.remove('text-emerald-400', 'text-amber-400', 'text-rose-400', 'text-gray-400');

    if (result.status === 'up') {
        dot.classList.add('bg-emerald-400');
        latency.textContent = `${result.ms}ms`;
        latency.classList.add('text-emerald-400');
    } else if (result.status === 'timeout') {
        dot.classList.add('bg-amber-400');
        latency.textContent = 'Slow';
        latency.classList.add('text-amber-400');
    } else {
        dot.classList.add('bg-rose-500');
        latency.textContent = 'Offline';
        latency.classList.add('text-rose-400');
    }
}

/**
 * Executes health probes across all streaming providers non-blockingly.
 */
function runServerHealthChecks() {
    const indicator = document.getElementById('health-check-indicator');
    if (indicator) {
        indicator.textContent = 'pinging...';
        indicator.className = 'text-[10px] font-normal px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300';
    }

    if (typeof checkAllProviders === 'function') {
        checkAllProviders({
            onResult: (res) => {
                updateServerStatusUI(res);
            }
        }).then(() => {
            if (indicator) {
                indicator.textContent = 'tested';
                indicator.className = 'text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300';
            }
        }).catch(() => {
            if (indicator) {
                indicator.textContent = 'done';
                indicator.className = 'text-[10px] font-normal px-2 py-0.5 rounded-full bg-gray-700 text-gray-300';
            }
        });
    }
}

/**
 * Creates and appends server buttons to the sidebar with status indicators.
 */
function renderServerButtons(preferredServerId = null) {
    const container = document.getElementById('stream-buttons');
    if (!container) return;
    container.innerHTML = '';
    const contentType = App.currentMedia.isTv ? 'tv' : 'movie';

    const supportedProviders = Object.entries(STREAMING_PROVIDERS).filter(([id, provider]) => provider.supports.includes(contentType));

    supportedProviders.forEach(([id, provider]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'stream-button w-full text-left px-3 py-2 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors flex items-center justify-between group cursor-pointer';
        button.dataset.providerId = id;
        button.innerHTML = `
            <span class="font-medium text-sm text-gray-100 flex items-center gap-2">
                <span class="server-status-dot w-2 h-2 rounded-full bg-gray-400 animate-status-pulse inline-block"></span>
                ${provider.name}
            </span>
            <span class="server-latency text-[11px] text-gray-400 font-mono">--</span>
        `;

        button.onclick = (e) => {
            document.querySelectorAll('.stream-button').forEach(btn => {
                btn.classList.remove('active', 'bg-red-600');
                if (!btn.classList.contains('bg-gray-700')) btn.classList.add('bg-gray-700');
            });
            e.currentTarget.classList.add('active', 'bg-red-600');
            e.currentTarget.classList.remove('bg-gray-700');

            // Save server choice in URL
            const url = new URL(window.location);
            url.searchParams.set('server', id);
            window.history.replaceState(window.history.state, '', url);

            // Reload the player iframe with spinner
            const playerSection = document.getElementById('stream-player-section');
            if (playerSection) {
                playerSection.innerHTML = `<div class="w-full h-full flex items-center justify-center"><div class="w-12 h-12 border-4 border-t-red-500 border-gray-600 rounded-full animate-spin"></div></div>`;
            }
            showStream(id, App.currentMedia);
        };
        container.appendChild(button);
    });

    let defaultBtn = null;
    if (preferredServerId) {
        defaultBtn = container.querySelector(`[data-provider-id="${preferredServerId}"]`);
    }
    if (!defaultBtn) {
        defaultBtn = container.firstChild;
    }
    if (defaultBtn) {
        defaultBtn.classList.add('active', 'bg-red-600');
        defaultBtn.classList.remove('bg-gray-700');
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
    if (!provider) return;

    // Keep URL parameters in sync
    const urlObj = new URL(window.location);
    urlObj.searchParams.set('server', streamId);

    const type = media.isTv ? 'tv' : 'movie';
    let url;
    if (type === 'movie') {
        url = provider.url(media.id);
        playerSection.innerHTML = `<iframe src="${url}" title="Pflix Player" allowfullscreen class="w-full h-full" referrerpolicy="${provider.referrerPolicy || 'no-referrer'}"></iframe>`;
        window.history.replaceState(window.history.state, '', urlObj);
    } else {
        const seasonSelect = document.getElementById('season-select');
        const episodeSelect = document.getElementById('episode-select');
        const season = Number(seasonSelect?.value || 1);
        const episode = Number(episodeSelect?.value || 1);

        if ((seasonSelect && !season) || (episodeSelect && !episode)) {
            return;
        }

        urlObj.searchParams.set('season', season);
        urlObj.searchParams.set('episode', episode);
        window.history.replaceState(window.history.state, '', urlObj);

        if (!provider.supports.includes('tv')) {
            playerSection.innerHTML = `<div class="w-full h-full flex items-center justify-center text-red-400"><p>This server does not support TV streaming.</p></div>`;
            return;
        }
        url = provider.url(media.id, season, episode, true);
        playerSection.innerHTML = `<iframe src="${url}" title="Pflix Player" allowfullscreen class="w-full h-full" referrerpolicy="${provider.referrerPolicy || 'no-referrer'}"></iframe>`;
    }
}

function renderError(message) {
    if (App.elements.homeHero) App.elements.homeHero.classList.add('hidden');
    App.elements.searchResults.classList.add('hidden');
    App.elements.watchPageContainer.classList.remove('hidden');
    App.elements.watchPageContainer.innerHTML = `<div class="w-full text-center text-red-400 py-10">${message}</div>`;
}

/**
 * Initializes mouse-tracking subtle ambient background glow
 */
function initBackgroundEffect() {
    window.addEventListener('pointermove', (e) => {
        const x = ((e.clientX / window.innerWidth) * 100).toFixed(2);
        const y = ((e.clientY / window.innerHeight) * 100).toFixed(2);
        document.documentElement.style.setProperty('--mouse-x', `${x}%`);
        document.documentElement.style.setProperty('--mouse-y', `${y}%`);
    }, { passive: true });
}

/**
 * Initializes the application.
 */
function init() {
    initBackgroundEffect();
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
            if (trimmed.length >= 1 && trimmed !== lastSearchValue) {
                lastSearchValue = trimmed;
                search(trimmed);
            } else if (trimmed.length < 1) {
                lastSearchValue = '';
                showHomeView();
            }
        }, 2000);
    };

    const searchClearBtn = document.getElementById('search-clear-btn');
    const updateClearBtn = () => {
        if (searchClearBtn) {
            if (App.elements.searchInput.value.length > 0) {
                searchClearBtn.classList.remove('hidden');
            } else {
                searchClearBtn.classList.add('hidden');
            }
        }
    };

    App.elements.searchInput.addEventListener('input', (e) => {
        updateClearBtn();
        handleSearch(e.target.value);
    });

    searchClearBtn?.addEventListener('click', () => {
        App.elements.searchInput.value = '';
        updateClearBtn();
        showHomeView();
    });

    // Wire up trending quick-search buttons
    document.querySelectorAll('.trending-tag').forEach(tag => {
        tag.addEventListener('click', (e) => {
            const query = e.currentTarget.dataset.query;
            if (query) {
                App.elements.searchInput.value = query;
                updateClearBtn();
                showSection('results');
                search(query);
            }
        });
    });

    // Wire up header navbar buttons
    document.getElementById('nav-logo')?.addEventListener('click', (e) => {
        e.preventDefault();
        const url = new URL(window.location);
        url.search = '';
        window.history.pushState({}, '', url);
        if (App.elements.searchInput) App.elements.searchInput.value = '';
        updateClearBtn();
        showHomeView();
    });

    document.getElementById('nav-home-btn')?.addEventListener('click', () => {
        const url = new URL(window.location);
        url.search = '';
        window.history.pushState({}, '', url);
        if (App.elements.searchInput) App.elements.searchInput.value = '';
        updateClearBtn();
        showHomeView();
    });

    document.getElementById('nav-explore-btn')?.addEventListener('click', () => {
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

    document.getElementById('nav-about-btn')?.addEventListener('click', () => {
        showSection('about');
    });

    // Global keyboard shortcuts: / focuses search, Esc exits modal/player
    window.addEventListener('keydown', (e) => {
        if (e.key === '/' && document.activeElement !== App.elements.searchInput && document.activeElement?.tagName !== 'INPUT') {
            e.preventDefault();
            App.elements.searchInput.focus();
            App.elements.searchInput.select();
        } else if (e.key === 'Escape') {
            const aboutSection = document.getElementById('about-section');
            if (aboutSection && !aboutSection.classList.contains('hidden')) {
                showHomeView();
            } else {
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('view') === 'player') {
                    const id = urlParams.get('id');
                    if (id) navigateTo(id, false);
                }
            }
        }
    });

    if (App.elements.heroSearchInput) {
        App.elements.heroSearchInput.addEventListener('input', (e) => {
            App.elements.searchInput.value = e.target.value;
            updateClearBtn();
            handleSearch(e.target.value);
        });
    }
    
    if (App.elements.logo) {
        App.elements.logo.style.cursor = 'pointer';
        App.elements.logo.addEventListener('click', () => {
            const url = new URL(window.location);
            url.search = '';
            window.history.pushState({}, '', url);
            if (App.elements.searchInput) App.elements.searchInput.value = '';
            updateClearBtn();
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
        updateClearBtn();
        search(query);
    } else if (page === 'explore') {
        showSection('explore');
        loadFeatured();
    } else {
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

// Section return to home buttons
document.getElementById('explore-home-btn')?.addEventListener('click', () => {
    showSection('search');
});
document.getElementById('results-home-btn')?.addEventListener('click', () => {
    showSection('search');
});
document.getElementById('details-home-btn')?.addEventListener('click', () => {
    showSection('search');
});

// Central search form: prevent default submit
document.getElementById('main-search-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = App.elements.searchInput.value.trim();
    if (val.length > 0) {
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
    // Toggle footer visibility so details/player doesn't get pushed into unnecessary scroll
    const footer = document.getElementById('site-footer');
    if (footer) {
        if (section === 'details') {
            footer.classList.add('hidden');
        } else {
            footer.classList.remove('hidden');
        }
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
 * Renders an array of featured card objects to the featured grid
 */
function renderFeaturedGrid(list) {
    if (!App.elements.featuredGrid) return;
    App.elements.featuredGrid.innerHTML = '';
    list.forEach((c) => {
        const card = document.createElement('div');
        card.className = 'movie-card bg-gray-800/90 border border-white/5 rounded-xl overflow-hidden shadow-lg cursor-pointer flex flex-col w-36 sm:w-48 h-64 sm:h-80 group relative text-left';
        const isTv = c.type === 'tvSeries' || c.type === 'tvMiniSeries';
        const typeLabel = isTv ? 'TV' : 'Movie';
        const posterUrl = c.img || c.image || c.image_large || '';

        card.innerHTML = `
            <div class="aspect-[2/3] w-full bg-gray-900 overflow-hidden relative">
                ${posterUrl ? `<img src="${posterUrl}" alt="${c.title}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />` : `<div class="w-full h-full flex items-center justify-center text-gray-500 text-xs">No Image</div>`}
                <span class="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md text-gray-200 uppercase tracking-wider">${typeLabel}</span>
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div class="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                        <svg class="w-5 h-5 fill-current translate-x-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                </div>
            </div>
            <div class="p-2.5 sm:p-3 flex flex-col justify-between flex-1 bg-gray-800/95"> 
                <div class="font-semibold text-xs sm:text-sm leading-tight line-clamp-2 text-gray-100 group-hover:text-red-400 transition-colors">${c.title}</div>
                <div class="text-[11px] sm:text-xs text-gray-400 mt-1 sm:mt-2 flex items-center justify-between">
                    <span>${c.year || ''}</span>
                    <span class="text-[11px] text-red-400 font-medium">Watch →</span>
                </div>
            </div>`;
        card.addEventListener('click', () => navigateTo(c.id, false));
        App.elements.featuredGrid.appendChild(card);
    });
}

/**
 * Load featured cards on the home hero / explore view
 */
async function loadFeatured() {
    if (!App.elements.featuredGrid) return;
    App.elements.featuredGrid.innerHTML = '';
    const spinner = document.getElementById('explore-spinner');
    if (spinner) spinner.style.display = 'flex';

    const defaultFeatured = [
        { id: 'tt1375666', title: 'Inception', year: '2010', type: 'movie' },
        { id: 'tt0816692', title: 'Interstellar', year: '2014', type: 'movie' },
        { id: 'tt0944947', title: 'Game of Thrones', year: '2011', type: 'tvSeries' },
        { id: 'tt0903747', title: 'Breaking Bad', year: '2008', type: 'tvSeries' },
        { id: 'tt4154796', title: 'Avengers: Endgame', year: '2019', type: 'movie' },
        { id: 'tt7286456', title: 'Joker', year: '2019', type: 'movie' },
        { id: 'tt15398776', title: 'Oppenheimer', year: '2023', type: 'movie' },
        { id: 'tt1190634', title: 'The Boys', year: '2019', type: 'tvSeries' },
        { id: 'tt1877830', title: 'The Batman', year: '2022', type: 'movie' },
        { id: 'tt4574334', title: 'Stranger Things', year: '2016', type: 'tvSeries' },
        { id: 'tt1517268', title: 'Barbie', year: '2023', type: 'movie' },
        { id: 'tt11198330', title: 'House of the Dragon', year: '2022', type: 'tvSeries' }
    ];

    try {
        const results = await Promise.allSettled(
            defaultFeatured.map(async (item) => {
                // Query worker API search endpoint for fast poster and title retrieval
                try {
                    const sRes = await fetch(`${App.api.baseUrl}/search?query=${encodeURIComponent(item.title)}`);
                    if (sRes.ok) {
                        const sData = await sRes.json();
                        const found = (sData.results || sData.titles || []).find(x => x.id === item.id) || (sData.results || sData.titles || [])[0];
                        if (found) {
                            return {
                                id: found.id || item.id,
                                title: found.title || found.primaryTitle || item.title,
                                year: found.year || found.startYear || item.year,
                                img: found.image || found.image_large || found.primaryImage?.url || '',
                                type: found.type || item.type,
                            };
                        }
                    }
                } catch (_) {}

                // Secondary try: /title/{id}
                try {
                    const tRes = await fetch(`${App.api.baseUrl}/title/${item.id}`);
                    if (tRes.ok) {
                        const tData = await tRes.json();
                        return {
                            id: tData.id || item.id,
                            title: tData.title || tData.primaryTitle || item.title,
                            year: tData.year || tData.startYear || item.year,
                            img: tData.image || tData.primaryImage?.url || '',
                            type: tData.contentType || tData.type || item.type,
                        };
                    }
                } catch (_) {}

                return item;
            })
        );

        const list = results.map((r, i) => r.status === 'fulfilled' ? r.value : defaultFeatured[i]);
        renderFeaturedGrid(list);
    } catch (e) {
        console.warn('Featured load failed, using fallbacks', e);
        renderFeaturedGrid(defaultFeatured);
    } finally {
        if (spinner) spinner.style.display = 'none';
    }
}
