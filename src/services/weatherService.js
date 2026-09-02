import { fetchWeatherDistricts, fetchWeatherSnapshot } from '../features/weather/weatherApi'

export const weatherService = {
  /**
   * Fetch current weather + hourly & 7-day forecast for a given city.
   * Errors are surfaced to the caller so the UI can show unavailable state.
   */
  getCurrentWeather: async (city = 'Thiruvananthapuram') => {
    return fetchWeatherSnapshot(city)
  },

  /**
   * Returns the list of supported Kerala districts from the backend.
   */
  getIndiaDistricts: async () => {
    return fetchWeatherDistricts()
  },
}
