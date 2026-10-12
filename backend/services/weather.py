import os
import re
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
CACHE_SECONDS = 600
DEFAULT_FORECAST_DAYS = 7
MAX_FORECAST_DAYS = 7
HOURLY_HOURS = 24


def _load_env():
    # Always read backend/.env so a server started outside that folder still works,
    # and so edits to .env are picked up without a full process restart.
    load_dotenv(ENV_PATH, override=True)


def _parse_coordinate(value, kind):
    """Accept plain decimals or values like '41.84° N' / '112.13° W'."""
    if value is None:
        return None

    text = str(value).strip()
    if not text:
        return None

    hemisphere = None
    match = re.search(r"\b([NnSsEeWw])\b", text)
    if match:
        hemisphere = match.group(1).upper()
        text = text[: match.start()] + text[match.end() :]

    text = (
        text.replace("°", " ")
        .replace(",", ".")
        .strip()
    )
    text = re.sub(r"[^0-9.+-]", "", text)

    if not text:
        raise ValueError(f"Could not parse WEATHER_{kind.upper()} from .env")

    number = float(text)

    if hemisphere in {"S", "W"}:
        number = -abs(number)
    elif hemisphere in {"N", "E"}:
        number = abs(number)

    if kind == "lat" and not -90 <= number <= 90:
        raise ValueError("WEATHER_LAT must be between -90 and 90")
    if kind == "lon" and not -180 <= number <= 180:
        raise ValueError("WEATHER_LON must be between -180 and 180")

    return number

WEATHER_CODES = {
    0: "Clear sky",
    1: "Mostly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Freezing fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Heavy drizzle",
    56: "Freezing drizzle",
    57: "Heavy freezing drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    66: "Freezing rain",
    67: "Heavy freezing rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Light showers",
    81: "Showers",
    82: "Violent showers",
    85: "Snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    99: "Severe thunderstorm with hail",
}

_cache = {"data": None, "fetched_at": 0.0}


def _condition(code):
    return WEATHER_CODES.get(code, "Unknown")


def _forecast_days():
    try:
        days = int(os.getenv("WEATHER_FORECAST_DAYS", DEFAULT_FORECAST_DAYS))
    except ValueError:
        days = DEFAULT_FORECAST_DAYS

    return max(1, min(days, MAX_FORECAST_DAYS))


def get_weather():
    _load_env()

    if _cache["data"] and time.time() - _cache["fetched_at"] < CACHE_SECONDS:
        return _cache["data"]

    lat = _parse_coordinate(os.getenv("WEATHER_LAT"), "lat")
    lon = _parse_coordinate(os.getenv("WEATHER_LON"), "lon")

    if lat is None or lon is None:
        raise ValueError(
            f"WEATHER_LAT and WEATHER_LON must be set in {ENV_PATH}"
        )

    units = os.getenv("WEATHER_UNITS", "fahrenheit").lower()
    imperial = units == "fahrenheit"
    days = _forecast_days()

    params = {
        "latitude": lat,
        "longitude": lon,
        "timezone": os.getenv("WEATHER_TIMEZONE", "auto"),
        "temperature_unit": "fahrenheit" if imperial else "celsius",
        "wind_speed_unit": "mph" if imperial else "kmh",
        "precipitation_unit": "inch" if imperial else "mm",
        "current": ",".join([
            "temperature_2m",
            "apparent_temperature",
            "relative_humidity_2m",
            "weather_code",
            "wind_speed_10m",
            "wind_direction_10m",
            "precipitation",
            "is_day",
        ]),
        "hourly": ",".join([
            "temperature_2m",
            "precipitation_probability",
            "precipitation",
            "weather_code",
        ]),
        "daily": ",".join([
            "temperature_2m_max",
            "temperature_2m_min",
            "precipitation_sum",
            "precipitation_probability_max",
            "weather_code",
            "sunrise",
            "sunset",
        ]),
        "forecast_days": days,
        "forecast_hours": HOURLY_HOURS,
    }

    response = requests.get(FORECAST_URL, params=params, timeout=5)
    response.raise_for_status()

    data = response.json()
    current = data["current"]
    daily = data["daily"]
    hourly = data["hourly"]
    code = current["weather_code"]
    precip_units = "in" if imperial else "mm"

    daily_forecast = []
    for index, date in enumerate(daily["time"]):
        day_code = daily["weather_code"][index]
        daily_forecast.append({
            "date": date,
            "high": daily["temperature_2m_max"][index],
            "low": daily["temperature_2m_min"][index],
            "precipitation": daily["precipitation_sum"][index],
            "precip_probability": daily["precipitation_probability_max"][index],
            "condition": _condition(day_code),
            "condition_code": day_code,
            "sunrise": daily["sunrise"][index],
            "sunset": daily["sunset"][index],
        })

    hourly_forecast = []
    for index, stamp in enumerate(hourly["time"][:HOURLY_HOURS]):
        hour_code = hourly["weather_code"][index]
        hourly_forecast.append({
            "time": stamp,
            "temperature": hourly["temperature_2m"][index],
            "precipitation": hourly["precipitation"][index],
            "precip_probability": hourly["precipitation_probability"][index],
            "condition": _condition(hour_code),
            "condition_code": hour_code,
        })

    weather = {
        "location": os.getenv("WEATHER_LOCATION_NAME", "Home"),
        "temperature": current["temperature_2m"],
        "feels_like": current["apparent_temperature"],
        "units": "F" if imperial else "C",
        "condition": _condition(code),
        "condition_code": code,
        "is_day": bool(current["is_day"]),
        "humidity": current["relative_humidity_2m"],
        "wind_speed": current["wind_speed_10m"],
        "wind_units": "mph" if imperial else "km/h",
        "wind_direction": current["wind_direction_10m"],
        "precipitation": current["precipitation"],
        "precip_probability": daily_forecast[0]["precip_probability"] if daily_forecast else 0,
        "precip_today": daily_forecast[0]["precipitation"] if daily_forecast else 0,
        "precip_units": precip_units,
        "high": daily_forecast[0]["high"] if daily_forecast else current["temperature_2m"],
        "low": daily_forecast[0]["low"] if daily_forecast else current["temperature_2m"],
        "sunrise": daily_forecast[0]["sunrise"] if daily_forecast else None,
        "sunset": daily_forecast[0]["sunset"] if daily_forecast else None,
        "updated_at": current["time"],
        "forecast_days": days,
        "hourly": hourly_forecast,
        "daily": daily_forecast,
    }

    _cache["data"] = weather
    _cache["fetched_at"] = time.time()

    return weather
