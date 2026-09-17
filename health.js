/**
 * Streaming server health check system
 * Non-blocking no-cors probes to test provider reachability and latency
 */
const HEALTH_TIMEOUT_MS = 6000;
const HEALTH_CONCURRENCY = 4;

/**
 * Probe a host origin via a lightweight no-cors fetch
 * @param {string} origin
 * @param {number} timeoutMs
 * @returns {Promise<'ok'|'error'|'timeout'>}
 */
async function probeHost(origin, timeoutMs = HEALTH_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        await fetch(origin, {
            mode: 'no-cors',
            cache: 'no-store',
            referrerPolicy: 'no-referrer',
            signal: controller.signal,
        });
        return 'ok';
    } catch (error) {
        return error.name === 'AbortError' ? 'timeout' : 'error';
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Test a single streaming provider
 * @param {string} id - Key in STREAMING_PROVIDERS
 * @param {object} [options]
 * @returns {Promise<{id: string, name: string, status: 'up'|'down'|'timeout'|'unknown', detail: string, ms: number}>}
 */
async function checkProvider(id, options = {}) {
    const timeoutMs = options.timeoutMs || HEALTH_TIMEOUT_MS;
    const provider = STREAMING_PROVIDERS[id];

    if (!provider) {
        return { id, name: id, status: 'unknown', detail: 'Not configured', ms: 0 };
    }

    // Generate test URL for probe
    let testUrl = '';
    try {
        testUrl = provider.url('tt1375666', 1, 1, false);
    } catch (_) {}

    if (!testUrl) {
        return { id, name: provider.name, status: 'unknown', detail: 'No embed URL', ms: 0 };
    }

    let origin;
    try {
        origin = new URL(testUrl).origin;
    } catch (_) {
        return { id, name: provider.name, status: 'down', detail: 'Invalid URL', ms: 0 };
    }

    const started = performance.now();
    const outcome = await probeHost(origin, timeoutMs);
    const ms = Math.round(performance.now() - started);

    if (outcome === 'ok') {
        return { id, name: provider.name, status: 'up', detail: `Online · ${ms}ms`, ms };
    }

    if (outcome === 'timeout') {
        return {
            id,
            name: provider.name,
            status: 'timeout',
            detail: `Slow / Timeout (${Math.round(timeoutMs / 1000)}s)`,
            ms,
        };
    }

    return { id, name: provider.name, status: 'down', detail: `Unreachable`, ms };
}

/**
 * Runs provider checks with controlled concurrency
 * @param {object} [options] - { ids, concurrency, timeoutMs, onResult }
 * @returns {Promise<Array>}
 */
async function checkAllProviders(options = {}) {
    const queue = (options.ids || Object.keys(STREAMING_PROVIDERS)).slice();
    const concurrency = options.concurrency || HEALTH_CONCURRENCY;
    const results = [];

    const worker = async () => {
        while (queue.length > 0) {
            const id = queue.shift();
            const result = await checkProvider(id, options);
            results.push(result);
            if (typeof options.onResult === 'function') {
                options.onResult(result);
            }
        }
    };

    const count = Math.max(1, Math.min(concurrency, queue.length));
    await Promise.all(Array.from({ length: count }, worker));
    return results;
}
