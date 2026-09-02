import { useWeatherSnapshot } from '../features/weather/weatherApi'

export const useWeather = (city = 'Thiruvananthapuram') => {
  return useWeatherSnapshot(city)
}
