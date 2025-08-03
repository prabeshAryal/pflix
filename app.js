/**
 * Main application state and configuration.
 */
const App = {
    imdbId: null,
    elements: {},
};

/**
 * Adds the interactive aurora background effect.
 */
function initBackgroundEffect() {
    document.body.addEventListener('mousemove', e => {
        document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
        document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
    });
}

/**
 * Fetches media details from the OMDb API.
 * @returns {Promise<object|null>} The media data object, or null if not found.
 */
async function fetchMediaDetails() {
    try {
        const response = await fetch(`https://www.omdbapi.com/?i=${App.imdbId}&apikey=thewdb`);
        const data = await response.json();
        if (data.Response !== "True") {
            console.warn("Media not found in OMDb API.");
            return null;
        }
        return data;
    } catch (error) {
        console.error("Error fetching media details:", error);
        return null;
    }
}

/**
 * Renders the skeleton loading state.
 */
function renderSkeleton() {
    App.elements.root.innerHTML = `
        <div class="container">
            <div class="top-section">
                <div class="stream-player-section skeleton"></div>
                <aside class="sidebar">
                    <h2>Servers</h2>
                    <div class="stream-buttons">
                        <div class="skeleton" style="height: 40px; border-radius: 0.75rem;"></div>
                        <div class="skeleton" style="height: 40px; border-radius: 0.75rem;"></div>
                        <div class="skeleton" style="height: 40px; border-radius: 0.75rem;"></div>
                        <div class="skeleton" style="height: 40px; border-radius: 0.75rem;"></div>
                        <div class="skeleton" style="height: 40px; border-radius: 0.75rem;"></div>
                    </div>
                </aside>
            </div>
            <div class="info-container">
                <div class="info-section">
                    <div class="poster skeleton"></div>
                    <div class="details" style="flex: 1;">
                        <div class="skeleton skeleton-text" style="width: 80%; height: 2.5rem;"></div>
                        <div class="skeleton skeleton-text" style="width: 60%; height: 1rem;"></div>
                        <div class="skeleton skeleton-text" style="width: 100%; margin-top: 1.5rem;"></div>
                        <div class="skeleton skeleton-text" style="width: 100%;"></div>
                        <div class="skeleton skeleton-text" style="width: 40%;"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Renders the main application layout.
 */
function renderMainLayout() {
    App.elements.root.innerHTML = `
        <div class="container">
            <div class="top-section">
                <div class="stream-player-section" id="stream-player-section"></div>
                <aside class="sidebar">
                    <h2>Servers</h2>
                    <div class="stream-buttons" id="stream-buttons"></div>
                </aside>
            </div>
            <div class="info-container" id="info-container" style="display: none;">
                <div class="info-section" id="info-section"></div>
            </div>
        </div>
    `;
}

/**
 * Populates the info section with media details.
 * @param {object} data - The media data from OMDb API.
 */
function renderMediaDetails(data) {
    document.title = `${data.Title} - Stream It`;
    document.getElementById('info-container').style.display = 'block';

    const ratingsHTML = data.Ratings.map(rating => `
        <div class="rating">
            <svg class="icon" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
            <div><div class="value">${rating.Value}</div><div class="source">${rating.Source}</div></div>
        </div>`).join('');

    document.getElementById('info-section').innerHTML = `
        <div class="poster" style="background-image: url(${data.Poster})"></div>
        <div class="details">
            <h1>${data.Title}</h1>
            <div class="meta">
                <span>${data.Year}</span> • <span>${data.Runtime}</span> • <span>${data.Rated}</span> • <span>${data.Genre}</span>
            </div>
            <p class="plot">${data.Plot}</p>
            <div class="ratings">${ratingsHTML}</div>
            <div class="extra-details">
                <div><strong>Director:</strong> ${data.Director}</div>
                <div><strong>Actors:</strong> ${data.Actors}</div>
            </div>
        </div>
    `;
}

/**
 * Creates and appends server buttons to the sidebar.
 */
function renderServerButtons() {
    const buttonsContainer = document.getElementById('stream-buttons');
    Object.entries(STREAMING_PROVIDERS).forEach(([id, provider], index) => {
        const button = document.createElement('button');
        button.className = 'stream-button';
        button.textContent = provider.name;
        button.onclick = () => {
            document.querySelectorAll('.stream-button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            showStream(id);
        };
        if (index === 0) button.classList.add('active');
        buttonsContainer.appendChild(button);
    });
}

/**
 * Displays the selected stream in the player.
 * @param {string} streamId - The ID of the streaming provider.
 */
function showStream(streamId) {
    const playerSection = document.getElementById('stream-player-section');
    const url = STREAMING_PROVIDERS[streamId].url(App.imdbId);
    playerSection.innerHTML = `<iframe src="${url}" title="Stream It Player" allowfullscreen></iframe>`;
}

/**
 * Displays an error message.
 * @param {string} message - The error message to display.
 */
function renderError(message) {
    App.elements.root.innerHTML = `<div class="error-message">${message}</div>`;
}

/**
 * Initializes the application.
 */
async function init() {
    initBackgroundEffect();
    App.elements.root = document.getElementById('app-root');
    App.imdbId = new URLSearchParams(window.location.search).get('id');

    if (!App.imdbId) {
        renderError('No IMDb ID provided.');
        return;
    }

    renderSkeleton();
    
    const data = await fetchMediaDetails();

    renderMainLayout();

    if (data) {
        renderMediaDetails(data);
    }
    
    renderServerButtons();
    showStream(Object.keys(STREAMING_PROVIDERS)[0]);
}

// Start the application
init();
