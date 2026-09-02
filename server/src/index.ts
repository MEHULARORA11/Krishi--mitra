import { env } from './config/env.js'
import { createApp } from './app.js'

const app = createApp()
if (env.weatherProvider === 'weatherapi' && !env.weatherApiKey.trim()) {
  console.warn('[weather] WEATHER_API_KEY is not set. Weather requests will return WEATHER_PROVIDER_NOT_CONFIGURED until a WeatherAPI key is configured.')
} else if (env.weatherProvider === 'weatherapi' && /^https?:\/\//i.test(env.weatherApiKey.trim())) {
  console.warn('[weather] WEATHER_API_KEY looks like a URL, not a WeatherAPI key. Weather requests will return WEATHER_PROVIDER_NOT_CONFIGURED until it is replaced.')
}
const server = app.listen(env.port, () => {
  console.log(`Krishi Mitra API listening on http://localhost:${env.port}`)
})

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `Port ${env.port} is already in use. Stop the existing API process or set PORT to an available port in server/.env.`,
    )
  } else {
    console.error('Krishi Mitra API failed to start:', error.message)
  }

  process.exitCode = 1
})
