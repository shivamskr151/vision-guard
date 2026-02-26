const getApiUrl = () => {
    const configuredUrl = (window as any).env?.VITE_API_URL || import.meta.env.VITE_API_URL || '';

    // Fallback to local 3000 if in dev and nothing specified, but user wanted no hardcoding.
    // So we'll just be safe with strings.
    if (!configuredUrl) return '';

    // If we're accessing the app via a non-localhost hostname (like a public IP),
    // and the API is configured for localhost, swap it to use the actual hostname.
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        if (configuredUrl.includes('localhost')) {
            return configuredUrl.replace('localhost', window.location.hostname);
        }
        if (configuredUrl.includes('127.0.0.1')) {
            return configuredUrl.replace('127.0.0.1', window.location.hostname);
        }
    }

    return configuredUrl;
};

export const config = {
    API_URL: getApiUrl(),
    // Add other variables here if needed
};
