// CORS proxy utility for API calls
export const corsProxy = {
  // Use a public CORS proxy for development
  proxyUrl: 'https://api.allorigins.win/raw?url=',
  
  // Alternative: Use Vite proxy in development
  makeRequest: async (url, options) => {
    try {
      // Try direct request first
      const response = await fetch(url, options)
      return response
    } catch (error) {
      // If CORS error, try with proxy
      if (error.message.includes('CORS')) {
        const proxyUrl = `${corsProxy.proxyUrl}${encodeURIComponent(url)}`
        return await fetch(proxyUrl, {
          ...options,
          headers: {
            ...options.headers,
            'X-Requested-With': 'XMLHttpRequest'
          }
        })
      }
      throw error
    }
  }
}