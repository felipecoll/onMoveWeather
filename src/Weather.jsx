import React, { useState, useEffect } from 'react';
import { Sun, Moon, Search, MapPin, Wind, Droplets, Thermometer, Umbrella } from 'lucide-react';
// import './WeatherApp.css';

const Weather = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [hourlyForecast, setHourlyForecast] = useState(null);
  const [city, setCity] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [useLocation, setUseLocation] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // API Key - En producción debería almacenarse de forma segura
  const API_KEY = ``

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  useEffect(() => {
    // Si el usuario habilita la ubicación, obtener coordenadas
    if (useLocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          fetchWeatherByCoords(latitude, longitude);
        },
        (err) => {
          setError('No se pudo acceder a la ubicación. ' + err.message);
          setLoading(false);
          setUseLocation(false);
        }
      );
    }
  }, [useLocation]);

  useEffect(() => {
    // Buscar sugerencias de ciudades cuando se escribe
    const searchTimeout = setTimeout(() => {
      if (city.trim().length >= 3) {
        fetchCitySuggestions(city);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [city]);

  const fetchCitySuggestions = async (query) => {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error('Error al buscar sugerencias');
      }
      
      const data = await response.json();
      setSuggestions(data);
      setShowSuggestions(data.length > 0);
    } catch (err) {
      console.error('Error fetching city suggestions:', err);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const fetchWeatherByCoords = async (lat, lon) => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch current weather
      const weatherResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}&lang=es`
      );
      
      if (!weatherResponse.ok) {
        throw new Error('Error al obtener el clima actual');
      }
      
      const weatherData = await weatherResponse.json();
      setWeather(weatherData);
      
      // Fetch forecast (using 5-day forecast endpoint instead of onecall)
      const forecastResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}&lang=es`
      );
      
      if (!forecastResponse.ok) {
        throw new Error('Error al obtener el pronóstico');
      }
      
      const forecastData = await forecastResponse.json();
      
      // Process hourly forecast (5-day forecast returns data every 3 hours)
      setHourlyForecast(forecastData.list.slice(0, 8)); // Next 24 hours (every 3 hours)
      
      // Process daily forecast by grouping forecast data by day
      //const dailyForecast = [];
      const days = {};
      
      forecastData.list.forEach(item => {
        const date = new Date(item.dt * 1000).toLocaleDateString();
        
        if (!days[date]) {
          days[date] = {
            dt: item.dt,
            temp: { 
              min: item.main.temp, 
              max: item.main.temp 
            },
            weather: item.weather[0],
            pop: item.pop,
            wind_speed: item.wind.speed
          };
        } else {
          // Update min/max temperatures
          if (item.main.temp < days[date].temp.min) days[date].temp.min = item.main.temp;
          if (item.main.temp > days[date].temp.max) days[date].temp.max = item.main.temp;
          
          // Update weather if it's a more significant weather condition
          if (item.weather[0].id < days[date].weather.id) {
            days[date].weather = item.weather[0];
          }
          
          // Update precipitation probability if higher
          if (item.pop > days[date].pop) days[date].pop = item.pop;
        }
      });
      
      setForecast(Object.values(days).slice(1, 4)); // Next 3 days
      
      setCity(weatherData.name);
      setShowSuggestions(false);
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCity = (suggestion) => {
    setCity(suggestion.name);
    setShowSuggestions(false);
    fetchWeatherByCoords(suggestion.lat, suggestion.lon);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!city.trim()) {
      setError('Por favor ingresa una ciudad');
      return;
    }
    
    // If there are suggestions and user submits, use the first suggestion
    if (suggestions.length > 0) {
      fetchWeatherByCoords(suggestions[0].lat, suggestions[0].lon);
    } else {
      searchCityAndFetchWeather();
    }
  };

  const searchCityAndFetchWeather = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get coordinates from city name
      const geoResponse = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${API_KEY}`
      );
      
      if (!geoResponse.ok) {
        throw new Error('Error al buscar la ubicación');
      }
      
      const geoData = await geoResponse.json();
      
      if (!geoData.length) {
        throw new Error('Ciudad no encontrada');
      }
      
      const { lat, lon } = geoData[0];
      fetchWeatherByCoords(lat, lon);
    } catch (err) {
      setError('Error: ' + err.message);
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
  };

  const formatHour = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const getWeatherIcon = (iconCode) => {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  };

  const toggleDarkMode = () => setDarkMode(!darkMode);
  const toggleLocation = () => setUseLocation(!useLocation);

  return (
    <div className={`weather-app ${darkMode ? 'dark-mode' : ''}`}>
      <header>
        <div className="logo">
          <MapPin size={32} />
          <span>ClimApp</span>
        </div>
        
        <form onSubmit={handleSubmit} className="search-form">
          <div className="search-container">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Buscar ciudad..."
              aria-label="Buscar ciudad"
              onFocus={() => city.length >= 3 && setSuggestions(suggestions)}
            />
            <button type="submit" className="search-button" aria-label="Buscar">
              <Search size={18} />
            </button>
            
            {showSuggestions && (
              <div className="suggestions-dropdown">
                {suggestions.map((suggestion, index) => (
                  <div 
                    key={index}
                    className="suggestion-item"
                    onClick={() => handleSelectCity(suggestion)}
                  >
                    <span>{suggestion.name}</span>
                    {suggestion.state && <span>, {suggestion.state}</span>}
                    <span className="country-code">{suggestion.country}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
        
        <div className="controls">
          <button 
            className={`location-button ${useLocation ? 'active' : ''}`} 
            onClick={toggleLocation}
            aria-label="Usar ubicación actual"
            title="Usar ubicación actual"
          >
            <MapPin size={20} />
          </button>
          
          <button 
            className="theme-button" 
            onClick={toggleDarkMode}
            aria-label={darkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            title={darkMode ? "Modo claro" : "Modo oscuro"}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Cargando datos meteorológicos...</p>
        </div>
      )}

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      {weather && (
        <div className="content">
          <div className="current-weather">
            <div className="weather-main">
              <div className="weather-info">
                <h2>{weather.name}, {weather.sys.country}</h2>
                <div className="temp-container">
                  <img 
                    src={getWeatherIcon(weather.weather[0].icon)} 
                    alt={weather.weather[0].description}
                    className="weather-icon"
                  />
                  <div className="temperature">
                    <span className="temp-value">{Math.round(weather.main.temp)}</span>
                    <span className="temp-unit">°C</span>
                  </div>
                </div>
                <p className="weather-description">{weather.weather[0].description}</p>
              </div>
              
              <div className="weather-details">
                <div className="detail">
                  <Thermometer size={18} />
                  <span>Sensación: {Math.round(weather.main.feels_like)}°C</span>
                </div>
                <div className="detail">
                  <Wind size={18} />
                  <span>Viento: {Math.round(weather.wind.speed * 3.6)} km/h</span>
                </div>
                <div className="detail">
                  <Droplets size={18} />
                  <span>Humedad: {weather.main.humidity}%</span>
                </div>
                <div className="detail">
                  <Umbrella size={18} />
                  <span>Presión: {weather.main.pressure} hPa</span>
                </div>
              </div>
            </div>
          </div>

          {hourlyForecast && (
            <div className="hourly-forecast">
              <h3>Próximas horas</h3>
              <div className="forecast-scroll">
                {hourlyForecast.map((hour, index) => (
                  <div className="forecast-card hour-card" key={index}>
                    <span className="forecast-time">{formatHour(hour.dt)}</span>
                    <img 
                      src={getWeatherIcon(hour.weather[0].icon)} 
                      alt={hour.weather[0].description}
                      className="forecast-icon"
                    />
                    <span className="forecast-temp">{Math.round(hour.main.temp)}°C</span>
                    <div className="forecast-detail">
                      <Droplets size={12} />
                      <span>{hour.main.humidity}%</span>
                    </div>
                    <div className="forecast-detail">
                      <Umbrella size={12} />
                      <span>{Math.round(hour.pop * 100)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {forecast && (
            <div className="daily-forecast">
              <h3>Próximos días</h3>
              <div className="daily-cards">
                {forecast.map((day, index) => (
                  <div className="forecast-card day-card" key={index}>
                    <span className="forecast-date">{formatDate(day.dt)}</span>
                    <div className="forecast-temp-range">
                      <span className="max">{Math.round(day.temp.max)}°</span>
                      <span className="separator">|</span>
                      <span className="min">{Math.round(day.temp.min)}°</span>
                    </div>
                    <img 
                      src={getWeatherIcon(day.weather.icon)} 
                      alt={day.weather.description}
                      className="forecast-icon"
                    />
                    <p className="forecast-description">{day.weather.description}</p>
                    <div className="daily-details">
                      <div className="forecast-detail">
                        <Umbrella size={14} />
                        <span>{Math.round(day.pop * 100)}%</span>
                      </div>
                      <div className="forecast-detail">
                        <Wind size={14} />
                        <span>{Math.round(day.wind_speed * 3.6)} km/h</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <footer>
        <p>© 2025 On move weather | Datos proporcionados por OpenWeather</p>
      </footer>
    </div>
  );
};

export default Weather