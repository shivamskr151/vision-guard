export const config = {
    API_URL: (window as any).env?.VITE_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000',
    // Add other variables here if needed
};
