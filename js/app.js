/**
 * Main application state and configuration.
 */
const App = {
    elements: {},
    api: {
        baseUrl: 'https://imdb-api.prabesh.tech',
    },
    timers: {
        searchDebounce: null,
    },
    mediaRequestToken: 0,
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
async function search(query, updateHistory = true) {
    if (query.length < 1) {
        showHomeView();
        App.elements.searchResults.innerHTML = '';
        document.getElementById('results-spinner').style.display = 'none';
        // Clear URL parameters when going back to homepage
        const url = new URL(window.location);
        url.searchParams.delete('q');
        url.searchParams.delete('id');
        url.searchParams.delete('view');
        if (updateHistory) window.history.pushState({}, '', url);
        document.title = 'Pflix - Find where to stream any movie or TV show';
        return;
    }
    
    // Update URL with search query
    const url = new URL(window.location);
    url.searchParams.set('q', query);
    url.searchParams.delete('id');
    url.searchParams.delete('view');
    if (updateHistory) window.history.pushState({ query }, '', url);
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

// View Mode (grid vs list) state
let currentViewMode = localStorage.getItem('pflix_view_mode') || 'grid';

/**
 * Sets the active view mode (grid or list) and updates containers and controls
 * @param {'grid' | 'list'} mode
 */
function setViewMode(mode) {
    currentViewMode = mode;
    try {
        localStorage.setItem('pflix_view_mode', mode);
    } catch (_) {}

    const isGrid = mode === 'grid';
    const searchContainer = document.getElementById('search-results');
    const featuredContainer = document.getElementById('featured-grid');

    [searchContainer, featuredContainer].forEach(el => {
        if (!el) return;
        el.className = isGrid ? 'media-grid-container' : 'media-list-container';
    });

    const updateButtons = (gridBtnId, listBtnId) => {
        const gridBtn = document.getElementById(gridBtnId);
        const listBtn = document.getElementById(listBtnId);
        if (gridBtn && listBtn) {
            gridBtn.classList.toggle('is-active', isGrid);
            listBtn.classList.toggle('is-active', !isGrid);
            gridBtn.setAttribute('aria-pressed', String(isGrid));
            listBtn.setAttribute('aria-pressed', String(!isGrid));
        }
    };

    updateButtons('results-view-grid-btn', 'results-view-list-btn');
    updateButtons('explore-view-grid-btn', 'explore-view-list-btn');

    if (App.lastSearchResults && App.lastSearchResults.length > 0 && !document.getElementById('results-section')?.classList.contains('hidden')) {
        renderSearchResults(App.lastSearchResults, App.lastSearchQuery);
    }
    if (App.lastFeaturedList && App.lastFeaturedList.length > 0 && !document.getElementById('explore-section')?.classList.contains('hidden')) {
        renderFeaturedGrid(App.lastFeaturedList);
    }
}

/**
 * Creates a modern, cinematic responsive media card element (Grid or List mode).
 * @param {Object} item - Media item metadata (id, title, year, image, type)
 * @param {Function} [onClick] - Custom click handler (defaults to navigateTo(id))
 * @returns {HTMLElement} The card element
 */
function createMediaCard(item, onClick) {
    const isList = currentViewMode === 'list';
    const titleName = item.title || item.primaryTitle || 'Unknown Title';
    const year = item.year || item.startYear || '';
    const imageUrl = item.image || item.image_large || item.img || item.primaryImage?.url || '';
    const isTv = item.type === 'tvSeries' || item.type === 'tvMiniSeries' || item.type === 'tvMovie';
    const typeLabel = isTv ? 'TV' : 'Movie';
    const cleanTitle = titleName.replace(/"/g, '&quot;');

    const card = document.createElement('button');
    card.type = 'button';
    card.setAttribute('aria-label', `View ${titleName}`);

    if (isList) {
        card.className = 'media-list-item';
        card.innerHTML = `
            <div class="media-list-poster-thumb">
                ${imageUrl ? `
                    <img src="${imageUrl}" alt="${cleanTitle}" loading="lazy" onerror="this.onerror=null; this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\' fill=\\'%236b7280\\'><path d=\\'M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z\\'/></svg>';" />
                ` : `
                    <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#111827;color:#6b7280;">
                        <svg style="width:20px;height:20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"/></svg>
                    </div>
                `}
            </div>
            <div class="media-list-body">
                <div class="media-list-title" title="${cleanTitle}">${titleName}</div>
                <div class="media-list-tags">
                    ${year ? `<span class="media-badge media-badge-year">${year}</span>` : ''}
                    <span class="media-badge media-badge-type ${isTv ? 'tv' : 'movie'}">${typeLabel}</span>
                </div>
            </div>
            <div class="media-list-action">
                <span>Watch</span>
                <svg style="width:12px;height:12px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </div>
        `;
    } else {
        card.className = 'media-card';
        card.innerHTML = `
            <div class="media-card-poster-wrap">
                ${imageUrl ? `
                    <img src="${imageUrl}" alt="${cleanTitle}" loading="lazy" class="media-card-poster-img" onerror="this.onerror=null; this.parentElement.innerHTML='<div style=\\'width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px;background:#111827;color:#6b7280;text-align:center;\\'><svg style=\\'width:24px;height:24px;opacity:0.5;margin-bottom:4px;\\' fill=\\'none\\' stroke=\\'currentColor\\' viewBox=\\'0 0 24 24\\'><path stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\' stroke-width=\\'1.5\\' d=\\'M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z\\'/></svg><span style=\\'font-size:10px;font-weight:600;\\'>${cleanTitle}</span></div>';" />
                ` : `
                    <div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px;background:#111827;color:#6b7280;text-align:center;">
                        <svg style="width:24px;height:24px;opacity:0.5;margin-bottom:4px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"/></svg>
                        <span style="font-size:10px;font-weight:600;">${cleanTitle}</span>
                    </div>
                `}
                <div class="media-card-badges">
                    ${year ? `<span class="media-badge media-badge-year">${year}</span>` : `<span></span>`}
                    <span class="media-badge media-badge-type ${isTv ? 'tv' : 'movie'}">${typeLabel}</span>
                </div>
                <div class="media-card-vignette"></div>
                <div class="media-card-play-overlay">
                    <div class="media-card-play-icon">
                        <svg style="width:16px;height:16px;margin-left:2px;" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                </div>
            </div>
            <div class="media-card-meta">
                <div class="media-card-title" title="${cleanTitle}">${titleName}</div>
                <div class="media-card-sub"><span>${year || typeLabel}</span></div>
            </div>
        `;
    }

    const openTitle = (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (onClick) onClick();
        else navigateTo(item.id);
    };

    card.addEventListener('click', openTitle);
    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            openTitle(e);
        }
    });

    return card;
}

/**
 * Renders the search results on the page.
 * @param {Array} titles - List of matching title items
 * @param {string} [query] - The search query term
 */
function renderSearchResults(titles, query = '') {
    showSearchView();
    document.getElementById('results-spinner').style.display = 'none';
    App.elements.searchResults.innerHTML = '';
    
    const subtitleEl = document.getElementById('results-subtitle');
    const queryTerm = query || (App.elements.searchInput ? App.elements.searchInput.value.trim() : '');

    App.lastSearchResults = titles || [];
    App.lastSearchQuery = queryTerm;

    if (!titles || titles.length === 0) {
        if (subtitleEl) {
            subtitleEl.textContent = queryTerm ? `No results found for "${queryTerm}"` : 'No titles found';
        }
        App.elements.searchResults.innerHTML = `
            <div class="col-span-full py-16 flex flex-col items-center justify-center text-center px-4" style="grid-column: 1 / -1; width: 100%;">
                <div class="w-14 h-14 rounded-2xl bg-gray-800/80 border border-white/10 flex items-center justify-center mb-3 text-gray-400 shadow-inner">
                    <svg class="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                </div>
                <h3 class="text-base font-bold text-gray-200 mb-1">No matching titles</h3>
                <p class="text-xs text-gray-400 max-w-xs">We couldn't find anything matching "${queryTerm}". Try checking for spelling or searching another keyword.</p>
            </div>
        `;
        return;
    }

    if (subtitleEl) {
        subtitleEl.textContent = queryTerm ? `Showing ${titles.length} title${titles.length === 1 ? '' : 's'} for "${queryTerm}"` : `Showing ${titles.length} titles`;
    }

    titles.forEach(title => {
        const card = createMediaCard(title, () => navigateTo(title.id));
        App.elements.searchResults.appendChild(card);
    });
}

/**
 * Main navigation function. Decides which view to show based on URL.
 * @param {string} imdbId - The IMDb ID of the title.
 * @param {boolean} [play=false] - Whether to show the player view.
 */
function navigateTo(imdbId, play = false, replace = false) {
    const url = new URL(window.location);
    url.searchParams.set('id', imdbId);
    if (play) {
        url.searchParams.set('view', 'player');
    } else {
        url.searchParams.delete('view');
    }

    if (window.location.href !== url.href) {
        const state = { imdbId, play };
        if (replace) window.history.replaceState(state, '', url);
        else window.history.pushState(state, '', url);
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
    const requestToken = ++App.mediaRequestToken;
    if (!App.currentMedia || App.currentMedia.id !== imdbId) {
        fetchMediaData(imdbId, false, requestToken); // playOnLoad = false
    } else {
        renderDetailsPage(App.currentMedia.details);
    }
}

/**
 * Shows the player page for the current media.
 */
function showPlayerPage() {
    showContentView();
    const requestToken = ++App.mediaRequestToken;
    const imdbId = new URLSearchParams(window.location.search).get('id');
    if (App.currentMedia && App.currentMedia.id === imdbId) {
        renderPlayerPage(App.currentMedia.details);
    } else {
        if (imdbId) {
            fetchMediaData(imdbId, true, requestToken); // playOnLoad = true
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
 * @param {number} requestToken - Prevents stale selections from replacing the current view.
 */
async function fetchMediaData(imdbId, playOnLoad, requestToken) {
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

        if (requestToken !== App.mediaRequestToken) return;

        // Normalize data across APIs
        const titleName = data?.title || data?.primaryTitle || data?.name || imdbId;
        let posterUrl = data?.image || data?.image_large || data?.primaryImage?.url || data?.images?.[0] || '';

        // If poster URL is missing or points to dead images.metahub.space CDN, resolve working poster
        if (!posterUrl || posterUrl.includes('metahub.space')) {
            const valid = (data?.images || []).find(x => x && !x.includes('metahub.space'));
            if (valid) {
                posterUrl = valid;
            } else {
                try {
                    // Try TVMaze if series
                    const tmRes = await fetch(`https://api.tvmaze.com/lookup/shows?imdb=${imdbId}`);
                    if (tmRes.ok) {
                        const tmData = await tmRes.json();
                        if (tmData?.image?.original || tmData?.image?.medium) {
                            posterUrl = tmData.image.original || tmData.image.medium;
                        }
                    }
                } catch (_) {}

                // If still not found, try suggestion search for Amazon CDN image
                if (!posterUrl || posterUrl.includes('metahub.space')) {
                    try {
                        const sugRes = await fetch(`${App.api.baseUrl}/search?query=${encodeURIComponent(titleName)}`);
                        if (sugRes.ok) {
                            const sugData = await sugRes.json();
                            const match = (sugData.results || []).find(r => r.id === imdbId && (r.image_large || r.image));
                            if (match) {
                                posterUrl = match.image_large || match.image;
                            }
                        }
                    } catch (_) {}
                }
            }
        }

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
        if (requestToken !== App.mediaRequestToken) return;
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
    window.history.replaceState({ imdbId: data.id }, '', url);
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
        <div class="details-view">
            <div class="absolute inset-0 overflow-hidden pointer-events-none">
                <div class="w-full h-full bg-cover bg-center blur-3xl scale-110 opacity-20" style="background-image: url(${poster})"></div>
                <div class="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/90 to-gray-900/70"></div>
            </div>

            <header class="details-header">
                <button id="details-top-back-btn" title="Back to results" class="nav-button">
                    <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                    <span>Back</span>
                </button>
                <button id="details-home-btn" title="Go home" class="nav-button">
                    <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                    <span>Home</span>
                </button>
            </header>

            <div class="details-layout">
                <div class="details-poster">
                    <img src="${poster || 'assets/images/pflix.png'}" alt="${data.primaryTitle}" 
                        onerror="if (!this.dataset.fallback) { this.dataset.fallback = '1'; this.src = 'https://images.weserv.nl/?url=' + encodeURIComponent(this.src); } else { this.src = 'assets/images/pflix.png'; }"
                        class="w-full h-full object-cover block" />
                </div>
                <div class="details-copy">
                    <div class="details-meta">
                        <span class="bg-red-600/90 text-white font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">${data.type || 'Movie'}</span>
                        ${data.startYear ? `<span class="text-gray-300 bg-white/10 px-2 py-0.5 rounded-full">${data.startYear}${data.endYear ? ` - ${data.endYear}` : ''}</span>` : ''}
                        ${data.runtime ? `<span class="text-gray-400">• ${data.runtime}</span>` : (data.runtimeSeconds ? `<span class="text-gray-400">• ${Math.floor(data.runtimeSeconds / 60)}m</span>` : '')}
                    </div>
                    <h1 class="details-title">${data.primaryTitle}</h1>
                    <p class="details-plot">${data.plot || 'No plot available.'}</p>
                    ${ratingsHTML ? `<div class="mb-5">${ratingsHTML}</div>` : ''}
                    <div class="details-actions">
                        <button id="play-button" type="button" class="button button-primary play-button">
                            <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                            <span>Play Now</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('details-top-back-btn')?.addEventListener('click', () => {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            showHomeView();
        }
    });

    document.getElementById('details-home-btn')?.addEventListener('click', navigateHome);

    document.getElementById('play-button')?.addEventListener('click', () => {
        navigateTo(data.id, true);
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
    window.history.replaceState({ imdbId: data.id, play: true }, '', url);
    document.title = `${data.primaryTitle} - Now Playing - Pflix`;
    
    App.elements.watchPageContainer.innerHTML = `
        <div class="player-view">
            <header class="player-header">
                <div class="player-heading">
                    <button id="player-back-btn" title="Back to details" class="nav-button">
                        <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                        <span>Details</span>
                    </button>
                    <div class="player-title-wrap">
                        <h1 class="player-title">${data.primaryTitle}</h1>
                        ${data.startYear ? `<span class="text-xs text-gray-400 hidden sm:inline flex-shrink-0">(${data.startYear})</span>` : ''}
                    </div>
                </div>
            </header>

            <div class="player-layout">
                <!-- Video & Notices column -->
                <div class="player-main">
                    <div id="stream-player-section" class="stream-player">
                        <!-- Player iframe will be loaded here -->
                    </div>
                    <div class="flex flex-col xs:flex-row items-center justify-between gap-2.5 mt-3 pt-3 border-t border-white/5 text-xs">
                        <a href="https://getadblock.com/en/" target="_blank" rel="noopener" class="flex items-center gap-1.5 text-gray-400 hover:text-gray-200 transition-colors">
                            <svg class="w-4 h-4 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
                            <span>AdBlock is recommended for third-party embeds</span>
                        </a>
                        <a href="https://www.buymeacoffee.com/prabesharyal" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-500 text-gray-950 font-bold px-3 py-1 rounded-full text-xs shadow-sm transition-transform active:scale-95">
                            <span>Donate</span>
                            <img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy Me A Coffee" class="h-3.5 w-auto" />
                        </a>
                    </div>
                </div>

                <!-- Aside: Episodes & Servers -->
                <aside class="player-sidebar">
                    <div id="episode-selector-container"></div>
                    <div class="flex items-center justify-between pb-2 border-b border-gray-700/60">
                        <h2 class="text-sm sm:text-base font-bold flex items-center gap-2 text-white">
                            <span>Servers</span>
                            <span id="health-check-indicator" class="text-[10px] font-normal px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">testing...</span>
                        </h2>
                        <button id="recheck-health-btn" title="Re-check server latency" class="text-[11px] bg-gray-700/80 hover:bg-gray-600 text-gray-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer active:scale-95 border border-white/5">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                            <span>Ping</span>
                        </button>
                    </div>
                    <div id="stream-buttons" class="flex flex-col gap-2 max-h-[360px] sm:max-h-[460px] overflow-y-auto pr-1"></div>
                </aside>
            </div>
        </div>`;

    document.getElementById('player-back-btn')?.addEventListener('click', () => {
        navigateTo(data.id, false, true);
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
 * Fetches episode lists from TVMaze (by IMDb ID or title search)
 */
async function fetchEpisodesFromTvMaze(imdbId, title = '') {
    try {
        let showId = null;

        // 1. Direct lookup by IMDb ID
        try {
            const lookupRes = await fetch(`https://api.tvmaze.com/lookup/shows?imdb=${imdbId}`);
            if (lookupRes.ok) {
                const show = await lookupRes.json();
                if (show && show.id) showId = show.id;
            }
        } catch (_) {}

        // 2. Fallback search by title if IMDb ID lookup didn't match
        if (!showId && title) {
            try {
                const searchRes = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(title)}`);
                if (searchRes.ok) {
                    const results = await searchRes.json();
                    if (Array.isArray(results) && results.length > 0) {
                        const match = results.find(r => r.show?.externals?.imdb === imdbId) || results[0];
                        if (match?.show?.id) showId = match.show.id;
                    }
                }
            } catch (_) {}
        }

        if (!showId) return null;

        // Fetch all episodes for this show
        const epRes = await fetch(`https://api.tvmaze.com/shows/${showId}/episodes`);
        if (!epRes.ok) return null;
        const episodes = await epRes.json();
        if (!Array.isArray(episodes) || episodes.length === 0) return null;

        const seasonsObj = {};
        episodes.forEach(ep => {
            const sNum = ep.season || 1;
            const sKey = String(sNum);
            if (!seasonsObj[sKey]) seasonsObj[sKey] = [];
            seasonsObj[sKey].push({
                episodeNumber: Number(ep.number || seasonsObj[sKey].length + 1),
                seasonNumber: Number(sNum),
                primaryTitle: ep.name || `Episode ${ep.number || (seasonsObj[sKey].length + 1)}`,
            });
        });

        Object.values(seasonsObj).forEach(list => list.sort((a, b) => a.episodeNumber - b.episodeNumber));
        return seasonsObj;
    } catch (error) {
        console.warn('TVMaze episode indexing failed:', error);
        return null;
    }
}

/**
 * Generates a default list of episodes (1 to max) for unindexed seasons
 */
function generateDefaultEpisodes(seasonNum, count = 24) {
    const list = [];
    for (let i = 1; i <= count; i++) {
        list.push({
            episodeNumber: i,
            seasonNumber: Number(seasonNum),
            primaryTitle: `Episode ${i}`,
        });
    }
    return list;
}

/**
 * Fetches and processes episode data for a series.
 */
async function fetchEpisodes(preferredServer = null) {
    try {
        let seasonsObj = {};
        const details = App.currentMedia.details || {};
        const titleName = details.primaryTitle || details.title || '';

        // 1. Primary: fetch all seasons and episodes from TVMaze
        const tvMazeSeasons = await fetchEpisodesFromTvMaze(App.currentMedia.id, titleName);
        if (tvMazeSeasons && Object.keys(tvMazeSeasons).length > 0) {
            seasonsObj = tvMazeSeasons;
        }

        // 2. If TVMaze returned nothing, check details.all_seasons or details.seasons
        if (Object.keys(seasonsObj).length === 0) {
            if (Array.isArray(details.all_seasons) && details.all_seasons.length > 0) {
                details.all_seasons.forEach(s => {
                    const sKey = String(s.id || s.value || s);
                    if (!seasonsObj[sKey]) seasonsObj[sKey] = [];
                });
                if (Array.isArray(details.seasons?.[0]?.episodes)) {
                    seasonsObj['1'] = details.seasons[0].episodes.map((ep, i) => ({
                        episodeNumber: Number(ep.no || ep.idx || (i + 1)),
                        seasonNumber: 1,
                        primaryTitle: ep.title || `Episode ${ep.no || (i + 1)}`,
                    }));
                }
            }
        }

        // 3. Fallback: try worker API routes /title/{id}/season/1 or /titles/{id}/episodes
        if (Object.keys(seasonsObj).length === 0 || !seasonsObj['1'] || seasonsObj['1'].length === 0) {
            try {
                const s1Res = await fetch(`${App.api.baseUrl}/title/${App.currentMedia.id}/season/1`);
                if (s1Res.ok) {
                    const s1Data = await s1Res.json();
                    if (Array.isArray(s1Data.episodes) && s1Data.episodes.length > 0) {
                        seasonsObj['1'] = s1Data.episodes.map((ep, i) => ({
                            episodeNumber: Number(ep.no || ep.idx || (i + 1)),
                            seasonNumber: 1,
                            primaryTitle: ep.title || `Episode ${ep.no || (i + 1)}`,
                        }));
                    }
                }
            } catch (_) {}
        }

        // 4. If we have season keys but no episodes, populate with selectable episodes
        if (Object.keys(seasonsObj).length > 0) {
            Object.keys(seasonsObj).forEach(sKey => {
                if (!seasonsObj[sKey] || seasonsObj[sKey].length === 0) {
                    seasonsObj[sKey] = generateDefaultEpisodes(sKey, 24);
                }
            });
        } else {
            // Default: provide Season 1 with selectable episodes (1 to 24)
            seasonsObj['1'] = generateDefaultEpisodes(1, 24);
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
        App.currentMedia.seasons = { '1': generateDefaultEpisodes(1, 24) };
        renderEpisodeSelectors();
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

    // Try worker API endpoint
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

    // Fallback: provide 24 episodes for this season so user can stream any episode
    const fallback = generateDefaultEpisodes(seasonNum, 24);
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
        <div class="space-y-3 mb-2 pb-3 border-b border-gray-700/60">
            <div>
                <label for="season-select" class="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Season</label>
                <div class="relative">
                    <select id="season-select" class="w-full bg-gray-900/90 text-white rounded-lg py-2.5 px-3 text-sm border border-white/10 focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none cursor-pointer pr-8"></select>
                    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-400">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                    </div>
                </div>
            </div>
            <div>
                <label for="episode-select" class="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Episode</label>
                <div class="relative">
                    <select id="episode-select" class="w-full bg-gray-900/90 text-white rounded-lg py-2.5 px-3 text-sm border border-white/10 focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none cursor-pointer pr-8"></select>
                    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-400">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-2 pt-1">
                <button id="prev-ep-btn" type="button" class="flex-1 py-2 px-3 rounded-lg bg-gray-700/80 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-white/5 active:scale-95 shadow-sm">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                    <span>Prev</span>
                </button>
                <button id="next-ep-btn" type="button" class="flex-1 py-2 px-3 rounded-lg bg-gray-700/80 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-white/5 active:scale-95 shadow-sm">
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
        button.className = 'stream-button w-full text-left px-3.5 py-2.5 rounded-lg bg-gray-900/60 hover:bg-gray-700/70 border border-white/5 transition-all flex items-center justify-between group cursor-pointer min-h-[44px] active:scale-[0.98]';
        button.dataset.providerId = id;
        button.innerHTML = `
            <span class="font-medium text-sm text-gray-200 flex items-center gap-2.5">
                <span class="server-status-dot w-2 h-2 rounded-full bg-gray-500 animate-status-pulse inline-block flex-shrink-0"></span>
                <span class="server-name group-hover:text-white transition-colors">${provider.name}</span>
            </span>
            <span class="server-latency text-[11px] text-gray-400 font-mono px-2 py-0.5 rounded bg-black/40 border border-white/5">--</span>
        `;

        button.onclick = (e) => {
            document.querySelectorAll('.stream-button').forEach(btn => {
                btn.classList.remove('active', 'bg-gradient-to-r', 'from-red-600', 'to-rose-600', 'border-red-500/50', 'text-white', 'shadow-md', 'shadow-red-900/20');
                if (!btn.classList.contains('bg-gray-900/60')) btn.classList.add('bg-gray-900/60');
            });
            e.currentTarget.classList.add('active', 'bg-gradient-to-r', 'from-red-600', 'to-rose-600', 'border-red-500/50', 'text-white', 'shadow-md', 'shadow-red-900/20');
            e.currentTarget.classList.remove('bg-gray-900/60');

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
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js').catch((error) => {
            console.error('PWA service worker registration failed:', error);
        });
    }
    const homeSection = document.getElementById('search-section');
    homeSection?.addEventListener('dblclick', (event) => {
        if (
            document.fullscreenElement ||
            event.target.closest('button, input, a, form, textarea, select')
        ) {
            return;
        }

        document.documentElement.requestFullscreen?.().catch((error) => {
            console.error('Fullscreen request failed:', error);
        });
    });
    App.elements = {
        searchInput: document.getElementById('search-input'),
        heroSearchInput: document.getElementById('hero-search-input'),
        searchResults: document.getElementById('search-results'),
        watchPageContainer: document.getElementById('watch-page-container'),
        logo: document.querySelector('header h1'),
        homeHero: document.getElementById('home-hero'),
        featuredGrid: document.getElementById('featured-grid'),
    };

    // Apply saved view mode (grid or list)
    setViewMode(currentViewMode);

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

    App.elements.searchInput?.addEventListener('input', (e) => {
        handleSearch(e.target.value);
    });

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
            url.search = '';
            window.history.pushState({}, '', url);
            if (App.elements.searchInput) App.elements.searchInput.value = '';
            if (App.elements.homeHero) showHomeView(); else showSearchView();
        });
    }

    window.onpopstate = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const imdbId = urlParams.get('id');
        const play = urlParams.get('view') === 'player';
        const query = urlParams.get('q');
        const page = urlParams.get('page');
        if (imdbId) {
            navigateTo(imdbId, play);
        } else if (query) {
            App.elements.searchInput.value = query;
            search(query, false);
        } else if (page === 'explore') {
            showSection('explore');
            loadFeatured();
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
        search(query, false);
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


// Section return to home & back buttons
const navigateHome = () => {
    const url = new URL(window.location);
    url.search = '';
    window.history.pushState({}, '', url);
    document.title = 'Pflix - Find where to stream any movie or TV show';
    if (App.elements.searchInput) App.elements.searchInput.value = '';
    showHomeView();
};

document.getElementById('explore-home-btn')?.addEventListener('click', navigateHome);
document.getElementById('results-home-btn')?.addEventListener('click', navigateHome);

// View switcher button listeners
document.getElementById('results-view-grid-btn')?.addEventListener('click', () => setViewMode('grid'));
document.getElementById('results-view-list-btn')?.addEventListener('click', () => setViewMode('list'));
document.getElementById('explore-view-grid-btn')?.addEventListener('click', () => setViewMode('grid'));
document.getElementById('explore-view-list-btn')?.addEventListener('click', () => setViewMode('list'));

// Central search form: prevent default submit
document.getElementById('main-search-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = App.elements.searchInput.value.trim();
    if (val.length > 0) {
        showSection('results');
        search(val);
    }
});

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
        } else {
            el.classList.add('hidden');
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
    const container = document.getElementById('watch-page-container');
    if (container) {
        container.innerHTML = `
            <div class="details-loading" role="status" aria-label="Loading">
                <div class="details-loading-spinner"></div>
            </div>
        `;
    }
}

/**
 * Renders an array of featured card objects to the featured grid
 */
function renderFeaturedGrid(list) {
    if (!App.elements.featuredGrid) return;
    App.lastFeaturedList = list || [];
    App.elements.featuredGrid.innerHTML = '';
    list.forEach((c) => {
        const card = createMediaCard(c, () => navigateTo(c.id, false));
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
