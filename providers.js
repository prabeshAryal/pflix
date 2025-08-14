// Streaming providers configuration
const STREAMING_PROVIDERS = {
    vidsrc: {
        name: 'VidSrc',
        supports: ['movie', 'tv'],
        referrerPolicy: 'no-referrer',
        url: (id, season, episode, isTv) => isTv
            ? `https://vidsrc.net/embed/tv/${id}/${season}-${episode}`
            : `https://vidsrc.net/embed/movie/${id}`
    },
    multiembed: {
        name: 'MultiEmbed',
        supports: ['movie', 'tv'],
        referrerPolicy: 'no-referrer',
        url: (id, season, episode, isTv) => isTv
            ? `https://multiembed.mov/directstream.php?video_id=${id}&s=${season}&e=${episode}`
            : `https://multiembed.mov/directstream.php?video_id=${id}`
    },
    embed2: {
        name: '2Embed',
        supports: ['movie', 'tv'],
        referrerPolicy: null,
        url: (id, season, episode, isTv) => isTv
            ? `https://www.2embed.cc/embed/tv/${id}&s=${season}&e=${episode}`
            : `https://www.2embed.cc/embed/${id}`
    },
    embedsu: {
        name: 'Embed.su',
        supports: ['movie', 'tv'],
        referrerPolicy: 'no-referrer',
        url: (id, season, episode, isTv) => isTv
            ? `https://embed.su/embed/tv?imdb=${id}&s=${season}&e=${episode}`
            : `https://embed.su/embed/movie/${id}`
    },
    autoembed: {
        name: 'AutoEmbed',
        supports: ['movie', 'tv'],
        referrerPolicy: 'no-referrer',
        url: (id, season, episode, isTv) => isTv
            ? `https://player.autoembed.cc/embed/tv/${id}/${season}-${episode}`
            : `https://player.autoembed.cc/embed/movie/${id}`
    },
    soap2day: {
        name: 'Soap2Day',
        supports: ['movie', 'tv'],
        referrerPolicy: 'no-referrer',
        url: (id, season, episode, isTv) => isTv
            ? `https://soap2dayto.win/embed/tv/${id}/${season}/${episode}`
            : `https://soap2dayto.win/embed/movie/${id}`
    },
    vidsrccc: {
        name: 'VidSrc.cc',
        supports: ['movie', 'tv'],
        referrerPolicy: 'no-referrer',
        url: (id, season, episode, isTv) => isTv
            ? `https://vidsrc.cc/v2/embed/tv/${id}/${season}/${episode}`
            : `https://vidsrc.cc/v2/embed/movie/${id}`
    },
    vidlink: {
        name: 'VidLink',
        supports: ['movie', 'tv'],
        referrerPolicy: 'no-referrer',
        url: (id, season, episode, isTv) => isTv
            ? `https://vidlink.pro/embed/tv/${id}/${season}/${episode}`
            : `https://vidlink.pro/movie/${id}`
    },
    vidfast: {
        name: 'VidFast',
        supports: ['movie', 'tv'],
        referrerPolicy: 'no-referrer',
        url: (id, season, episode, isTv) => isTv
            ? `https://vidfast.pro/embed/tv/${id}/${season}/${episode}`
            : `https://vidfast.pro/movie/${id}`
    },
    videasy: {
        name: 'VidEasy',
        supports: ['movie', 'tv'],
        referrerPolicy: 'no-referrer',
        url: (id, season, episode, isTv) => isTv
            ? `https://player.videasy.net/embed/tv/${id}/${season}/${episode}`
            : `https://player.videasy.net/movie/${id}`
    },
};
