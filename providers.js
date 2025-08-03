// Streaming providers configuration
const STREAMING_PROVIDERS = {
    vidsrc: {
        name: 'S1',
        url: (id) => `https://vidsrc.net/embed/movie/${id}`,
        referrerPolicy: 'no-referrer'
    },
    multiembed: {
        name: 'S2',
        url: (id) => `https://multiembed.mov/directstream.php?video_id=${id}`,
        referrerPolicy: 'no-referrer'
    },
    embed2: {
        name: 'S3',
        url: (id) => `https://www.2embed.cc/embed/${id}`,
        referrerPolicy: null
    },
    embedsu: {
        name: 'S4',
        url: (id) => `https://embed.su/embed/movie/${id}`,
        referrerPolicy: 'no-referrer'
    },
    autoembed: {
        name: 'S5',
        url: (id) => `https://player.autoembed.cc/embed/movie/${id}`,
        referrerPolicy: 'no-referrer'
    },
    soap2day: {
        name: 'S6',
        url: (id) => `https://soap2dayto.win/embed/movie/${id}`,
        referrerPolicy: 'no-referrer'
    },
    vidsrccc: {
        name: 'S7',
        url: (id) => `https://vidsrc.cc/v2/embed/movie/${id}`,
        referrerPolicy: 'no-referrer'
    },
    vidlink: {
        name: 'S8',
        url: (id) => `https://vidlink.pro/movie/${id}`,
        referrerPolicy: 'no-referrer'
    },
    vidfast: {
        name: 'S9',
        url: (id) => `https://vidfast.pro/movie/${id}`,
        referrerPolicy: 'no-referrer'
  },
    videasy: {
        name: 'S10',
        url: (id) => `https://player.videasy.net/movie/${id}`,
        referrerPolicy: 'no-referrer'
    },
};
