// src/client/sky-gradient.js
var gradients = [
  { hour: 0, colors: ["#00000c", "#00000c"], brightness: "dark" },
  { hour: 4, colors: ["#20202c", "#515175"], brightness: "dark" },
  { hour: 6, colors: ["#4a4969", "#cd82a0"], brightness: "dark" },
  { hour: 8, colors: ["#82addb", "#ebb2b1"], brightness: "light" },
  { hour: 11, colors: ["#9be2fe", "#67d1fb"], brightness: "light" },
  { hour: 12, colors: ["#90dffe", "#38a3d1"], brightness: "light" },
  { hour: 16, colors: ["#2473ab", "#5b7983"], brightness: "dark" },
  { hour: 17, colors: ["#1c4f82", "#d8a24c"], brightness: "dark" },
  { hour: 18.5, colors: ["#163C52", "#B7490F"], brightness: "dark" },
  { hour: 19, colors: ["#00000c", "#150800"], brightness: "dark" },
  { hour: 24, colors: ["#00000c", "#00000c"], brightness: "dark" }
];
var periodOverrides = {};
function setSkyTheme(theme) {
  if (!Array.isArray(theme?.gradients) || theme.gradients.length === 0) return false;
  gradients = theme.gradients.map((point) => ({ hour: Number(point.hour), colors: point.colors?.slice(0, 2), brightness: point.brightness })).filter((point) => Number.isFinite(point.hour) && point.colors?.length === 2 && point.colors.every(Boolean)).sort((a, b) => a.hour - b.hour);
  periodOverrides = theme.periodOverrides ?? {};
  return gradients.length > 0;
}
function skyThemeFor({ timeString, weatherString = "", periodString = "" }) {
  if (gradients.length === 0) return { background: "linear-gradient(#555, #222)", brightness: "dark", period: "\u672A\u77E5" };
  const decimalHour = parseTimeToDecimal(timeString);
  const badWeather = /雨|雪|阴|雷/.test(weatherString);
  if (decimalHour != null) {
    const period2 = periodString || derivePeriod(decimalHour);
    if (badWeather) {
      const themes = {
        \u591C\u665A: { colors: ["#1a1a1a", "#0a0a0a"], brightness: "dark" },
        \u9EC4\u660F: { colors: ["#3a3a5a", "#2a2a3a"], brightness: "dark" },
        \u65E5\u843D: { colors: ["#3a3a5a", "#2a2a3a"], brightness: "dark" },
        \u65E5\u51FA: { colors: ["#3a3a5a", "#2a2a3a"], brightness: "dark" },
        \u9ECE\u660E: { colors: ["#3a3a5a", "#2a2a3a"], brightness: "dark" },
        \u6E05\u6668: { colors: ["#3a3a5a", "#2a2a3a"], brightness: "dark" },
        \u767D\u5929: { colors: ["#6c757d", "#495057"], brightness: "dark" }
      };
      return themeResult(themes[period2] ?? themes.\u767D\u5929, period2);
    }
    const hour = (decimalHour % 24 + 24) % 24;
    const extended = [...gradients];
    const first = gradients[0];
    if (first.hour === 0 && !gradients.some((point) => point.hour === 24)) extended.push({ ...first, hour: 24 });
    let start = extended.at(-1) ?? first;
    let end = start;
    for (let index = 0; index < extended.length - 1; index++) {
      if (hour >= extended[index].hour && hour < extended[index + 1].hour) {
        start = extended[index];
        end = extended[index + 1];
        break;
      }
    }
    const span = end.hour - start.hour;
    const factor = span > 0 ? (hour - start.hour) / span : 0;
    return {
      background: `linear-gradient(160deg, ${mix(start.colors[0], end.colors[0], factor)}, ${mix(start.colors[1], end.colors[1], factor)})`,
      brightness: start.brightness,
      period: period2
    };
  }
  const period = periodString || "\u767D\u5929";
  const override = periodOverrides[period] ?? (badWeather ? periodOverrides.\u9ED8\u8BA4\u6076\u52A3\u5929\u6C14 : null);
  if (override) return themeResult(override, period);
  return themeResult(gradients.find((point) => point.hour === 12) ?? gradients[0], period);
}
function skyCssAt(hour, minute = 0, weatherString = "", periodString = "") {
  return skyThemeFor({ timeString: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`, weatherString, periodString }).background;
}
function themeResult(theme, period) {
  return { background: `linear-gradient(160deg, ${theme.colors[0]}, ${theme.colors[1]})`, brightness: theme.brightness, period };
}
function parseTimeToDecimal(value) {
  if (!value) return null;
  const match = String(value).match(/(\d{1,2}):(\d{2})/);
  if (match) return Number(match[1]) + Number(match[2]) / 60;
  const periods = {
    \u5B50\u65F6: 23.5,
    \u4E11\u65F6: 1.5,
    \u5BC5\u65F6: 3.5,
    \u536F\u65F6: 5.5,
    \u8FB0\u65F6: 7.5,
    \u5DF3\u65F6: 9.5,
    \u5348\u65F6: 11.5,
    \u672A\u65F6: 13.5,
    \u7533\u65F6: 15.5,
    \u9149\u65F6: 17.5,
    \u620C\u65F6: 19.5,
    \u4EA5\u65F6: 21.5,
    \u5348\u591C: 0,
    \u6DF1\u591C: 2,
    \u9ECE\u660E: 5,
    \u6E05\u6668: 6,
    \u65E5\u51FA: 6.5,
    \u65E9\u4E0A: 8,
    \u4E0A\u5348: 10,
    \u4E2D\u5348: 12,
    \u6B63\u5348: 12,
    \u4E0B\u5348: 15,
    \u9EC4\u660F: 18,
    \u65E5\u843D: 18.5,
    \u508D\u665A: 19,
    \u665A\u4E0A: 21,
    \u591C\u665A: 22,
    \u767D\u5929: 12
  };
  for (const [period, hour] of Object.entries(periods)) if (String(value).includes(period)) return hour;
  return null;
}
function derivePeriod(hour) {
  if (hour >= 22 || hour < 4) return "\u591C\u665A";
  if (hour < 6) return "\u65E5\u51FA";
  if (hour < 9) return "\u6E05\u6668";
  if (hour < 17) return "\u767D\u5929";
  if (hour < 19) return "\u9EC4\u660F";
  return "\u591C\u665A";
}
function mix(first, second, factor) {
  const a = hex(first), b = hex(second);
  return `#${a.map((channel, index) => Math.round(channel + factor * (b[index] - channel)).toString(16).padStart(2, "0")).join("")}`;
}
function hex(value) {
  const raw = value.replace("#", "");
  return [0, 2, 4].map((index) => Number.parseInt(raw.slice(index, index + 2), 16));
}

// src/client/clouds-3d.js
function createClouds3dFX(target, cloudUrl) {
  let viewport = null, world = null, bases = [], layers = [], raf = 0, elapsed = 0, last = 0, density = { count: 1, wind: 1 };
  const css2 = document.createElement("style");
  css2.textContent = `#clouds-viewport{position:absolute;inset:0;overflow:hidden;perspective:1000px;z-index:0;pointer-events:none;transform:translateZ(0);backface-visibility:hidden}#clouds-world{position:absolute;left:50%;top:50%;width:512px;height:512px;margin:-256px;transform-style:preserve-3d}#clouds-world div{transform-style:preserve-3d}.cloudBase{position:absolute;left:256px;top:256px;width:20px;height:20px;margin:-10px;transform-style:preserve-3d}.cloudLayer{position:absolute;left:50%;top:50%;width:256px;height:256px;margin:-128px;background:url('${cloudUrl}') center/contain no-repeat;backface-visibility:hidden;transform-style:flat;will-change:transform,filter;transition:filter 7s ease-in-out}`;
  document.head.append(css2);
  function frame(now) {
    if (!viewport) return;
    const dt = last ? Math.min((now - last) / 1e3, 0.05) : 0.016;
    last = now;
    elapsed += dt;
    const wind = Math.max(0, Number(density.wind) || 0), speed = 5 * (0.55 + wind * 0.45), freq = 0.05 + wind * 0.015, amp = 0.7 + wind * 0.15;
    for (const b of bases) {
      let x = +b.dataset.x + elapsed * +b.dataset.d * speed;
      while (x > 980) x -= 1960;
      const y = +b.dataset.y + Math.sin(elapsed * freq + +b.dataset.p) * +b.dataset.a * amp;
      b.style.transform = `translateX(${x}px) translateY(${y}px) translateZ(${b.dataset.z}px)`;
    }
    raf = requestAnimationFrame(frame);
  }
  function generate(next = density) {
    density = next;
    world.replaceChildren();
    bases = [];
    layers = [];
    const count = Math.min(36, Math.max(6, Math.floor((density.count >= 3 ? 8 : 10) * density.count)));
    for (let i = 0; i < count; i++) {
      const b = document.createElement("div");
      b.className = "cloudBase";
      Object.assign(b.dataset, { x: 900 - Math.random() * 1800, y: 420 - Math.random() * 840, z: 320 - Math.random() * 640, d: 0.8 + Math.random() * 1.6, p: Math.random() * Math.PI * 2, a: 1 + Math.random() * 2.5 });
      world.append(b);
      bases.push(b);
      const n = density.count >= 3 ? 2 + Math.round(Math.random()) : 3 + Math.round(Math.random() * 2);
      for (let j = 0; j < n; j++) {
        const c = document.createElement("div"), x = (256 - Math.random() * 512) * 0.2, y = (256 - Math.random() * 512) * 0.2, z = 100 - Math.random() * 200, a = Math.random() * 360, s = 0.5 + Math.random();
        c.className = "cloudLayer";
        c.style.opacity = String(0.6 + Math.random() * 0.4);
        Object.assign(c.dataset, { x, y, z, a, s });
        c.style.transform = `translateX(${x}px) translateY(${y}px) translateZ(${z}px) rotateZ(${a}deg) scale(${s})`;
        b.append(c);
        layers.push(c);
      }
    }
  }
  return { activate(options = {}) {
    const next = options.density || density;
    if (viewport) {
      if (next.count !== density.count || next.wind !== density.wind) generate(next);
      return;
    }
    viewport = document.createElement("div");
    viewport.id = "clouds-viewport";
    world = document.createElement("div");
    world.id = "clouds-world";
    viewport.append(world);
    target.append(viewport);
    generate(next);
    raf = requestAnimationFrame(frame);
  }, setColor(filter) {
    layers.forEach((x) => x.style.filter = filter);
  }, deactivate() {
    cancelAnimationFrame(raf);
    viewport?.remove();
    viewport = null;
    world = null;
    bases = [];
    layers = [];
    elapsed = last = 0;
  }, dispose() {
    cancelAnimationFrame(raf);
    viewport?.remove();
    css2.remove();
  } };
}

// src/client/weather-classifier.js
function classifyWeather(weather = "") {
  const value = String(weather);
  const rain = value.includes("\u96E8") && !/无雨|停雨|雨停|不下雨/.test(value) && !value.includes("\u96EA");
  const snow = value.includes("\u96EA");
  const storm = value.includes("\u96F7");
  const fog = value.includes("\u96FE");
  const cloudy = value.includes("\u4E91") && !value.includes("\u65E0\u4E91") || value.includes("\u9634") || rain || snow || storm;
  const wind = /风|大风|狂风|暴风/.test(value);
  return { rain, snow, storm, fog, cloudy, wind, clear: value.includes("\u6674") && !cloudy && !fog };
}

// src/client/weather-renderer.js
function createWeatherRenderer({ backgroundLayer, foregroundLayer, clouds }) {
  let particleInterval = 0;
  let lightningTimeout = 0;
  let milkyWayTimeout = 0;
  let windInterval = 0;
  let currentParticle = "";
  const timeouts = /* @__PURE__ */ new Set();
  function schedule(callback, delay) {
    const id = window.setTimeout(() => {
      timeouts.delete(id);
      callback();
    }, delay);
    timeouts.add(id);
    return id;
  }
  function cancelTimeout(id) {
    window.clearTimeout(id);
    timeouts.delete(id);
  }
  function update({ weatherString = "", periodString = "", seasonString = "", enabled = true, highPerformance = true }) {
    const flags = classifyWeather(weatherString);
    const density = weatherDensity(weatherString);
    const night = periodString.includes("\u591C");
    const goodWeather = !/[雨雪雷]/.test(weatherString);
    const milkyWay = night && goodWeather && weatherString.includes("\u94F6\u6CB3");
    const stars = night && goodWeather && weatherString.includes("\u661F") && !milkyWay;
    const fireflies = night && weatherString.includes("\u8424\u706B");
    if (enabled && highPerformance && flags.cloudy) {
      clouds.activate({ density, period: periodString, weather: weatherString });
      clouds.setColor(cloudFilter(periodString, weatherString));
    } else clouds.deactivate();
    manageStatic(backgroundLayer, "star", enabled && stars, 96, createStar);
    manageMilkyWay(enabled && highPerformance && milkyWay);
    manageStatic(foregroundLayer, "firefly", enabled && fireflies, Math.max(8, Math.round(12 * density.count)), createFirefly);
    manageStatic(foregroundLayer, "fog-layer", enabled && flags.fog, 5, createFog);
    manageParticles(enabled ? flags.rain ? "rain" : flags.snow ? "snow" : "" : "", density);
    manageWind(enabled && density.wind > 0 && (flags.rain || !flags.snow && !flags.cloudy), density.wind, seasonString);
    manageLightning(enabled && flags.storm);
  }
  function manageParticles(type, density) {
    if (currentParticle === type && particleInterval) return;
    clearInterval(particleInterval);
    particleInterval = 0;
    currentParticle = type;
    foregroundLayer.querySelectorAll(".particle-wrapper,.leaf").forEach((node) => node.remove());
    if (!type) return;
    const targetCount = Math.round(type === "rain" ? 18 + density.count * 16 : 24 + density.count * 18);
    const interval = Math.max(120, (type === "rain" ? 260 : 220) / density.speed);
    const generate = () => {
      const count = foregroundLayer.querySelectorAll(`.particle-${type}`).length;
      const batch = Math.max(1, Math.min(8, Math.ceil(targetCount / 6)));
      for (let index = count; index < Math.min(targetCount, count + batch); index++) foregroundLayer.append(createParticle(type, density, schedule));
    };
    generate();
    particleInterval = window.setInterval(generate, interval);
  }
  function manageStatic(target, className, visible, count, creator) {
    const existing = target.querySelectorAll(`:scope > .${className}`);
    if (!visible) {
      existing.forEach((node) => node.remove());
      return;
    }
    if (existing.length > 0) return;
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < count; index++) fragment.append(creator());
    target.append(fragment);
  }
  function manageMilkyWay(visible) {
    const existing = backgroundLayer.querySelector(":scope > .milky-way-container");
    if (!visible) {
      cancelTimeout(milkyWayTimeout);
      milkyWayTimeout = 0;
      existing?.remove();
      return;
    }
    if (existing) return;
    const container = createMilkyWay();
    backgroundLayer.append(container);
    milkyWayTimeout = schedule(() => {
      container.classList.add("fading-out");
      schedule(() => container.remove(), 3e3);
    }, 15e3);
  }
  function manageWind(active, strength) {
    if (!active) {
      clearInterval(windInterval);
      windInterval = 0;
      foregroundLayer.style.removeProperty("--tw-gust-x");
      return;
    }
    if (windInterval) return;
    const pulse = () => {
      const gust = Math.max(0.35, strength) * (0.55 + Math.random() * 0.9);
      foregroundLayer.style.setProperty("--tw-gust-x", `${gust * 12}vw`);
      schedule(() => foregroundLayer.style.setProperty("--tw-gust-x", "0vw"), 900);
    };
    pulse();
    windInterval = window.setInterval(pulse, 2200);
  }
  function manageLightning(active) {
    cancelTimeout(lightningTimeout);
    lightningTimeout = 0;
    foregroundLayer.querySelectorAll(".effect-thunder,.lightning-strike-svg").forEach((node) => node.remove());
    foregroundLayer.classList.remove("lightning-flash");
    if (!active) return;
    foregroundLayer.append(Object.assign(document.createElement("div"), { className: "effect-thunder" }));
    const strike = () => {
      createLightningStrike(foregroundLayer, schedule);
      lightningTimeout = schedule(strike, 25e3 + Math.random() * 5e3);
    };
    strike();
  }
  function clear() {
    clearInterval(particleInterval);
    clearInterval(windInterval);
    for (const id of timeouts) window.clearTimeout(id);
    timeouts.clear();
    particleInterval = lightningTimeout = milkyWayTimeout = windInterval = 0;
    currentParticle = "";
    backgroundLayer.replaceChildren();
    foregroundLayer.replaceChildren();
    foregroundLayer.classList.remove("lightning-flash");
    foregroundLayer.style.removeProperty("--tw-gust-x");
    clouds.deactivate();
  }
  return { update, clear };
}
function cloudFilter(period, weather) {
  if (/雨|雷|暴/.test(weather)) return period.includes("\u591C") ? "brightness(.15) contrast(1.3) grayscale(.8)" : "brightness(.6) contrast(.9) saturate(.7) grayscale(.4)";
  if (weather.includes("\u96EA")) return "brightness(.8) contrast(.9) grayscale(.3)";
  if (weather.includes("\u9634")) return "brightness(.7) contrast(.9) grayscale(.4)";
  if (period.includes("\u591C")) return "brightness(.25) contrast(1.2) grayscale(.7)";
  if (/日出|日落|清晨/.test(period)) return "sepia(.6) hue-rotate(-30deg) saturate(1.6) brightness(.9)";
  if (period.includes("\u9EC4\u660F")) return "brightness(.5) contrast(1) saturate(.9) grayscale(.4)";
  return "brightness(1)";
}
function weatherDensity(weatherString = "") {
  const density = { count: 1, speed: 1, wind: -1 };
  if (/暴|阴/.test(weatherString)) Object.assign(density, { count: 5, speed: 2 });
  else if (/大|强|多云/.test(weatherString)) Object.assign(density, { count: 3, speed: 1.5 });
  else if (weatherString.includes("\u4E2D")) Object.assign(density, { count: 2, speed: 1 });
  else if (/小|微|少云/.test(weatherString)) Object.assign(density, { count: 0.5, speed: 0.8 });
  else if (weatherString.includes("\u65E0\u4E91")) Object.assign(density, { count: 0, speed: 0 });
  if (weatherString.includes("\u98CE")) density.wind = /狂|暴/.test(weatherString) ? 2 : /大|强/.test(weatherString) ? 1.5 : 0.8;
  return density;
}
function createParticle(type, density, schedule) {
  const windy = density.wind > 0;
  const wrapper = document.createElement("i");
  wrapper.className = `particle-wrapper particle-${type}`;
  wrapper.style.left = windy ? `${Math.random() * 150 - 50}%` : `${Math.random() * 110 - 5}%`;
  const durationSeconds = type === "rain" ? (0.4 + Math.random() * 0.4) / density.speed : (10 + Math.random() * 10) / density.speed;
  wrapper.style.animationDuration = `${durationSeconds}s`;
  wrapper.style.animationDelay = `-${Math.random() * durationSeconds}s`;
  wrapper.style.setProperty("--tw-curve-a", (0.18 + Math.random() * 0.52).toFixed(3));
  wrapper.style.setProperty("--tw-curve-b", (0.12 + Math.random() * 0.46).toFixed(3));
  wrapper.style.setProperty("--tw-curve-c", (0.08 + Math.random() * 0.34).toFixed(3));
  if (type === "rain") {
    const drop = document.createElement("i");
    drop.className = `raindrop${windy ? density.wind >= 1.5 ? " slanted-strong" : " slanted-light" : ""}`;
    drop.style.opacity = String(Math.random() * 0.6 + 0.2);
    drop.style.transform = windy ? `rotate(${density.wind >= 1.5 ? -25 : -15}deg)` : "rotate(0deg)";
    wrapper.classList.toggle("angled-strong", density.wind >= 1.5);
    wrapper.classList.toggle("angled-light", windy && density.wind < 1.5);
    wrapper.append(drop);
  } else {
    const flake = document.createElement("i");
    const size = `${2 + Math.random() * 3}px`;
    flake.className = "snowflake";
    flake.style.cssText = `width:${size};height:${size};opacity:${0.5 + Math.random() * 0.5}`;
    wrapper.classList.toggle("snow-drift-strong", density.wind >= 1.5);
    wrapper.classList.toggle("snow-drift-light", windy && density.wind < 1.5);
    wrapper.append(flake);
  }
  const duration = durationSeconds * 1e3 + 250;
  wrapper.addEventListener("animationend", (event) => {
    if (event.target === wrapper) wrapper.remove();
  }, { once: true });
  schedule(() => wrapper.remove(), duration);
  return wrapper;
}
function createStar() {
  const colors = ["#280F36", "#632B6C", "#BE6590", "#FFC1A0", "#FE9C7F"];
  const random = Math.random();
  const star = document.createElement("i");
  star.className = `star${random >= 0.4 ? " blink" : ""}`;
  const size = random < 0.6 ? 0.5 + Math.random() * 1.5 : random < 0.8 ? 2 + Math.random() : 1 + Math.random();
  star.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 100}%;width:${size}px;height:${size}px;animation-duration:${2 + Math.random() * 6}s;animation-delay:${Math.random() * 6}s;opacity:${0.4 + Math.random() * 0.6}`;
  if (random >= 0.8) {
    const color = colors[Math.floor(Math.random() * colors.length)];
    star.style.backgroundColor = color;
    star.style.boxShadow = `0 0 6px 1px ${colors[Math.floor(Math.random() * colors.length)]}`;
  }
  return star;
}
function createFirefly() {
  const node = document.createElement("i");
  const size = 2 + Math.random() * 2;
  node.className = "firefly";
  node.style.cssText = `width:${size}px;height:${size}px;left:${Math.random() * 100}%;top:${Math.random() * 100}%;animation-duration:${4 + Math.random() * 4}s;animation-delay:${Math.random() * 8}s`;
  return node;
}
function createFog() {
  const node = document.createElement("i");
  node.className = "fog-layer";
  node.style.cssText = `animation-duration:${20 + Math.random() * 15}s;animation-delay:${Math.random() * 5}s;opacity:${Math.random() * 0.2 + 0.1}`;
  return node;
}
function createMilkyWay() {
  const container = document.createElement("div");
  container.className = "milky-way-container";
  const stars = document.createElement("div");
  stars.className = "stars";
  const cross = document.createElement("div");
  cross.className = "stars-cross";
  const auxiliary = document.createElement("div");
  auxiliary.className = "stars-cross-aux";
  for (let index = 0; index < 420; index++) stars.append(createMilkyStar(Math.floor(Math.random() * 3)));
  for (let index = 0; index < 90; index++) stars.append(createMilkyStar(3 + Math.floor(Math.random() * 2)));
  for (let index = 0; index < 54; index++) cross.append(createNebula(), createMilkyStar(1, true));
  for (let index = 0; index < 20; index++) auxiliary.append(createNebula(), createMilkyStar(2, true));
  container.append(stars, cross, auxiliary);
  return container;
}
function createMilkyStar(size, colored = false) {
  const colors = ["#280F36", "#632B6C", "#BE6590", "#FFC1A0", "#FE9C7F"];
  const node = document.createElement("i");
  node.className = `star star-${size}${Math.random() < 0.08 ? " blink" : ""}`;
  node.style.cssText = `top:${Math.random() * 100}%;left:${Math.random() * 100}%;animation-duration:${2 + Math.random() * 8}s`;
  if (colored) {
    node.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    node.style.boxShadow = `0 0 6px 1px ${colors[Math.floor(Math.random() * colors.length)]}`;
  }
  return node;
}
function createNebula() {
  const colors = ["#280F36", "#632B6C", "#BE6590", "#FFC1A0", "#FE9C7F"];
  const node = document.createElement("i");
  node.className = "nebula-milky-way";
  node.style.cssText = `top:${Math.random() * 100}%;left:${Math.random() * 100}%;background-color:${colors[Math.floor(Math.random() * colors.length)]}`;
  return node;
}
function createLightningStrike(container, schedule) {
  container.classList.add("lightning-flash");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "lightning-strike-svg");
  svg.setAttribute("viewBox", `0 0 ${container.clientWidth || innerWidth} ${container.clientHeight || innerHeight}`);
  svg.setAttribute("style", "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:6");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("class", "lightning-strike-path");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "rgba(255,255,255,.85)");
  const width = container.clientWidth || innerWidth;
  const height = container.clientHeight || innerHeight;
  let x = width * 0.2 + Math.random() * width * 0.6;
  let points = `M${x},0`;
  for (let index = 0; index < 10; index++) {
    x += Math.random() * height * 0.15 - height * 0.075;
    points += ` L${x},${height / 10 * (index + 1)}`;
  }
  path.setAttribute("d", points);
  path.style.strokeWidth = `${1 + Math.random()}px`;
  svg.append(path);
  container.append(svg);
  schedule(() => {
    svg.remove();
    container.classList.remove("lightning-flash");
  }, 500);
}

// src/client/panel-view.tsx
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";

// src/world-state.js
var COMPONENTS = /* @__PURE__ */ new Set(["world", "place", "scene", "worldTime", "calendar", "background", "weather"]);
var WEATHER_KINDS = /* @__PURE__ */ new Set(["clear", "rain", "snow", "storm", "fog", "custom"]);
var UNSAFE_KEYS = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
function validateWorldRoot(root) {
  if (isRecord(root) && Object.hasOwn(root, "schemaVersion")) throw new Error("The World legacy State requires preview and explicit upgrade before use");
  if (!isRecord(root) || !isRecord(root.entities) || Object.keys(root).some((key) => key !== "entities") || !isJsonValue(root)) throw new Error("The World State root is invalid");
  for (const [id, entity] of Object.entries(root.entities)) {
    if (!isRecord(entity) || !nonEmpty(id) || UNSAFE_KEYS.has(id) || !isRecord(entity.components) || Object.keys(entity).some((key) => key !== "components")) throw new Error(`The World entity must contain only components: ${id}`);
    for (const [component, value] of Object.entries(entity.components)) {
      if (!COMPONENTS.has(component)) throw new Error(`The World component is unsupported: ${component}`);
      validateComponent(component, value);
      if (component === "world" && id !== "world") throw new Error("The World current scene belongs to the fixed world entity");
    }
  }
  const world = root.entities.world;
  if (!world || !world.components.world) throw new Error("The World fixed world entity is missing");
  const requireComponent = (id, component) => {
    if (!Object.hasOwn(root.entities, id) || !root.entities[id].components[component]) throw new Error(`The World ${component} reference is missing: ${id}`);
    return root.entities[id].components[component];
  };
  if (world.components.world.currentSceneId !== void 0) requireComponent(world.components.world.currentSceneId, "scene");
  const calendars = /* @__PURE__ */ new Map();
  for (const [id, entity] of Object.entries(root.entities)) {
    const calendar = entity.components.calendar;
    if (calendar) {
      if (calendars.has(calendar.id)) throw new Error(`The World calendar id is duplicated: ${calendar.id}`);
      calendars.set(calendar.id, calendar);
    }
    const place = entity.components.place;
    if (place?.parentPlaceId !== void 0) {
      const ancestors = /* @__PURE__ */ new Set([id]);
      let parent = place.parentPlaceId;
      while (parent !== void 0) {
        if (ancestors.has(parent)) throw new Error(`The World place hierarchy is cyclic: ${id}`);
        ancestors.add(parent);
        parent = requireComponent(parent, "place").parentPlaceId;
      }
    }
    for (const connection of place?.connections ?? []) requireComponent(connection.toPlaceId, "place");
    if (entity.components.scene?.placeId !== void 0) requireComponent(entity.components.scene.placeId, "place");
  }
  for (const entity of Object.values(root.entities)) {
    const time = entity.components.worldTime?.value;
    if (!time) continue;
    const calendar = calendars.get(time.calendarId);
    if (!calendar) throw new Error(`The World calendar reference is missing: ${time.calendarId}`);
    const month = calendar.months[time.month - 1];
    if (!month || time.day > month.days) throw new Error("The World date is outside its calendar");
  }
  return root;
}
function validateComponent(component, value) {
  if (!isRecord(value) || Object.hasOwn(value, "version")) throw new Error(`The World component is invalid: ${component}`);
  if (component === "world") {
    optionalString(value, "currentSceneId");
  } else if (component === "place" || component === "scene") {
    if (!nonEmpty(value.name)) throw new Error(`The World ${component} name is required`);
    optionalString(value, "description", true);
    if (value.resources !== void 0) {
      if (!Array.isArray(value.resources)) throw new Error("The World resources must be an array");
      value.resources.forEach(validateResource);
    }
    if (component === "scene") {
      optionalString(value, "placeId");
      if (value.participantEntityIds !== void 0 && (!Array.isArray(value.participantEntityIds) || !value.participantEntityIds.every(nonEmpty))) throw new Error("The World participants are invalid");
    } else {
      optionalString(value, "parentPlaceId");
      if (value.connections !== void 0 && (!Array.isArray(value.connections) || value.connections.some(
        (connection) => !isRecord(connection) || !nonEmpty(connection.toPlaceId) || !["adjacent", "contains", "exits", "custom"].includes(connection.relation) || connection.label !== void 0 && typeof connection.label !== "string" || connection.bidirectional !== void 0 && typeof connection.bidirectional !== "boolean"
      ))) throw new Error("The World place connections are invalid");
      if (value.position !== void 0 && (!isRecord(value.position) || !Number.isFinite(value.position.x) || !Number.isFinite(value.position.y) || value.position.z !== void 0 && !Number.isFinite(value.position.z) || value.position.space !== void 0 && typeof value.position.space !== "string")) throw new Error("The World place position is invalid");
      if (value.facts !== void 0 && (!isRecord(value.facts) || Object.values(value.facts).some((fact) => fact !== null && !["string", "number", "boolean"].includes(typeof fact)))) throw new Error("The World place facts are invalid");
    }
  } else if (component === "worldTime") {
    const time = value.value;
    if (!isRecord(time) || !nonEmpty(time.calendarId) || !Number.isInteger(time.year) || !Number.isInteger(time.month) || time.month < 1 || !Number.isInteger(time.day) || time.day < 1 || !integerBetween(time.hour, 0, 23) || !integerBetween(time.minute, 0, 59) || time.second !== void 0 && !integerBetween(time.second, 0, 59) || time.millisecond !== void 0 && !integerBetween(time.millisecond, 0, 999)) throw new Error("The World time component is invalid");
    optionalString(value, "timeZone");
    if (value.paused !== void 0 && typeof value.paused !== "boolean") throw new Error("The World time paused flag is invalid");
  } else if (component === "calendar") {
    if (!nonEmpty(value.id) || !nonEmpty(value.name) || !Array.isArray(value.months) || !value.months.length || value.months.some((month) => !isRecord(month) || !nonEmpty(month.id) || !nonEmpty(month.name) || !Number.isInteger(month.days) || month.days < 1) || new Set(value.months.map((month) => month.id)).size !== value.months.length) throw new Error("The World calendar component is invalid");
    if (value.weekdays !== void 0 && (!Array.isArray(value.weekdays) || !value.weekdays.length || value.weekdays.some((day) => !isRecord(day) || !nonEmpty(day.id) || !nonEmpty(day.name)) || new Set(value.weekdays.map((day) => day.id)).size !== value.weekdays.length)) throw new Error("The World calendar weekdays are invalid");
    if (value.weekStartsOn !== void 0 && (!value.weekdays || !integerBetween(value.weekStartsOn, 0, value.weekdays.length - 1))) throw new Error("The World week start is invalid");
    if (value.eras !== void 0 && (!Array.isArray(value.eras) || value.eras.some((era) => !isRecord(era) || !nonEmpty(era.id) || !nonEmpty(era.name) || !Number.isInteger(era.startsAtYear)))) throw new Error("The World calendar eras are invalid");
  } else if (component === "weather") {
    if (!WEATHER_KINDS.has(value.kind) || value.intensity !== void 0 && (!Number.isFinite(value.intensity) || value.intensity < 0 || value.intensity > 1)) throw new Error("The World weather component is invalid");
    optionalString(value, "label", true);
    optionalString(value, "startedAt");
  } else if (component === "background") {
    if (!nonEmpty(value.id) || !nonEmpty(value.name) || typeof value.description !== "string" || !nonEmpty(value.source)) throw new Error("The World background component is invalid");
    validateResource(value.asset);
    if (value.asset.kind !== "asset" || value.asset.role !== "background") throw new Error("The World background must reference a background Asset");
    validateAvailability(value.availability);
  }
}
function validateResource(value) {
  if (!isRecord(value) || !nonEmpty(value.id) || !["asset", "prompt-resource"].includes(value.kind) || !["image", "audio", "map", "background", "other"].includes(value.role)) throw new Error("The World resource reference is invalid");
  optionalString(value, "label", true);
  validateAvailability(value.availability);
}
function validateAvailability(value) {
  if (!isRecord(value) || !["available", "missing", "revoked"].includes(value.status)) throw new Error("The World resource availability is invalid");
  if (value.status !== "available" && !nonEmpty(value.observedAt)) throw new Error("The World unavailable resource requires an observation time");
  optionalString(value, "reason", true);
}
function projectCurrentWorld(snapshot) {
  validateWorldRoot(snapshot);
  const world = snapshot.entities.world;
  const sceneId = world.components.world.currentSceneId;
  const scene = sceneId === void 0 ? void 0 : snapshot.entities[sceneId];
  const placeId = scene?.components.scene?.placeId;
  return {
    world: { id: "world", ...world },
    scene: scene === void 0 ? void 0 : { id: sceneId, ...scene },
    place: placeId === void 0 ? void 0 : { id: placeId, ...snapshot.entities[placeId] },
    time: world.components.worldTime,
    weather: scene?.components.weather ?? world.components.weather,
    background: scene?.components.background ?? world.components.background
  };
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}
function optionalString(value, field, allowEmpty = false) {
  if (value[field] !== void 0 && (typeof value[field] !== "string" || !allowEmpty && !nonEmpty(value[field]))) throw new Error(`The World ${field} is invalid`);
}
function integerBetween(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}
function isJsonValue(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  return isRecord(value) && Object.values(value).every(isJsonValue);
}

// src/client/world-presentation.ts
var weatherLabels = { clear: "\u6674", rain: "\u96E8", snow: "\u96EA", storm: "\u96F7\u96E8", fog: "\u96FE", custom: "\u81EA\u5B9A\u4E49\u5929\u6C14" };
function describeWorldWeather(root) {
  const current = root ? projectCurrentWorld(root) : void 0;
  const weather = current?.weather;
  const time = current?.time?.value;
  const label = weather?.label || (weather ? weatherLabels[weather.kind] : "\u5929\u6C14\u672A\u77E5");
  const token = weather ? weatherLabels[weather.kind] : "";
  const weatherString = !weather ? "" : weather.kind === "custom" || label.includes(token) ? label : `${token} ${label}`;
  const period = !time ? "" : time.hour >= 22 || time.hour < 4 ? "\u591C\u665A" : time.hour < 6 ? "\u65E5\u51FA" : time.hour < 9 ? "\u6E05\u6668" : time.hour < 17 ? "\u767D\u5929" : time.hour < 19 ? "\u9EC4\u660F" : "\u591C\u665A";
  const flags = classifyWeather(weatherString);
  const knownWeather = Boolean(weather && (weather.kind !== "custom" || flags.cloudy || flags.fog || flags.clear || /星|银河|萤火/.test(weatherString)));
  const kind = !knownWeather ? "unknown" : flags.storm ? "storm" : flags.rain ? "rain" : flags.snow ? "snow" : flags.cloudy || flags.fog ? "cloudy" : period.includes("\u591C") ? "night" : "clear";
  return {
    kind,
    weatherString,
    period,
    subtitle: `${period || "\u65F6\u95F4\u672A\u77E5"} \xB7 ${label}`,
    time: time ? `${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}` : "--:--",
    date: time ? `${time.year} / ${time.month} / ${time.day}` : "\u65E5\u671F\u672A\u77E5",
    sky: time && knownWeather ? skyCssAt(time.hour, time.minute, weatherString, period) : void 0
  };
}

// src/client/panel-view.tsx
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
var css = `
:host{display:block;position:relative;min-height:100%;font:14px/1.45 system-ui,sans-serif;color:#e8ecff;pointer-events:none}*{box-sizing:border-box}.tw-panel{pointer-events:auto;position:absolute;top:60px;right:20px;width:min(450px,calc(100% - 40px));height:60vh;min-width:280px;min-height:200px;display:flex;flex-direction:column;overflow:hidden;border:1px solid #ffffff3d;border-radius:12px;background:color-mix(in srgb,var(--tw-panel-sky) 38%,transparent);box-shadow:0 5px 25px #0008;backdrop-filter:blur(18px) saturate(130%);transition:box-shadow .2s ease}.tw-panel.no-glass{backdrop-filter:none;background:color-mix(in srgb,var(--tw-panel-sky) 70%,transparent)}.tw-panel::before{content:"";position:absolute;inset:0;background:var(--tw-panel-sky);opacity:.08;pointer-events:none}.tw-head,.tw-tabs,.tw-content{position:relative;z-index:1}.tw-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 15px;background:color-mix(in srgb,var(--tw-panel-sky) 24%,transparent);border-bottom:1px solid #ffffff33;cursor:move;user-select:none;flex-shrink:0}.tw-brand{display:flex;align-items:center;gap:10px;min-width:0}.tw-icon{width:42px;height:42px;display:grid;place-items:center;border-radius:11px;background:color-mix(in srgb,var(--tw-panel-sky) 46%,#000);transition:.3s;overflow:hidden}.tw-icon.weather-clear{background:linear-gradient(160deg,#f6c453,#c8792c)}.tw-icon.weather-cloudy{background:linear-gradient(160deg,#7f8c8d,#344052)}.tw-icon.weather-rain{background:linear-gradient(160deg,#526d9a,#1e2d48)}.tw-icon.weather-snow{background:linear-gradient(160deg,#b8d7ef,#58759a)}.tw-icon.weather-storm{background:linear-gradient(160deg,#4a637f,#182235)}.tw-icon.weather-night{background:linear-gradient(160deg,#273c75,#111936)}.tw-title{font-weight:700}.tw-subtitle{font-size:11px;color:#aeb9d8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tw-close{width:30px;height:30px;border:0;border-radius:4px;background:transparent;color:inherit;font-size:24px;line-height:1;cursor:pointer;transition:transform .2s}.tw-close:hover{background:#0003;transform:scale(1.15) rotate(90deg)}.tw-tabs{display:flex;gap:5px;padding:5px;background:color-mix(in srgb,var(--tw-panel-sky) 18%,transparent);border-bottom:1px solid #ffffff33;flex-shrink:0}.tw-tab{flex:1;border:0;border-radius:6px;padding:8px;background:transparent;color:#aeb9d8;font-weight:700;cursor:pointer}.tw-tab.active,.tw-tab:hover{background:#00000026;color:#fff}.tw-content{flex:1;min-height:0;position:relative}.tw-pane{position:absolute;inset:0;overflow-y:auto;padding:15px;display:none;opacity:0;transform:translateY(10px);transition:opacity .3s ease,transform .3s ease;pointer-events:none;touch-action:pan-y}.tw-pane.active{display:block;opacity:1;transform:translateY(0);pointer-events:auto}.tw-grid{display:grid;gap:10px}.tw-card{padding:12px;border:1px solid #ffffff33;border-radius:8px;background:color-mix(in srgb,var(--tw-panel-sky) 24%,transparent)}.tw-hero{display:grid;grid-template-columns:74px 1fr;gap:12px;align-items:center}.tw-weather{width:68px;height:68px;display:grid;place-items:center;border-radius:18px;background:color-mix(in srgb,var(--tw-panel-sky) 30%,transparent)}.tw-time{font-size:30px;font-weight:750}.tw-meta{color:#d2d8e8;font-size:12px}.tw-row{display:flex;justify-content:space-between;gap:10px;align-items:center}.tw-form{display:grid;grid-template-columns:1fr 1fr auto;gap:7px}.tw-form input,.tw-form button{min-height:34px;border:1px solid #ffffff4d;border-radius:7px;background:#080d1b99;color:inherit;padding:6px 9px;font:inherit}.tw-actions{display:flex;flex-wrap:wrap;gap:7px}.tw-action{border:1px solid #ffffff4d;border-radius:7px;padding:7px 9px;background:#ffffff0d;color:inherit;cursor:pointer}.tw-list{display:grid;gap:7px}.tw-list-item{padding:9px;border-radius:7px;background:color-mix(in srgb,var(--tw-panel-sky) 20%,transparent);border-left:3px solid #7c9cff}.tw-location-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px}.tw-location{position:relative;min-height:80px;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:12px;border:1px solid transparent;border-radius:8px;background:color-mix(in srgb,var(--tw-panel-sky) 30%,transparent);color:#fff;text-align:center;transition:transform .3s,box-shadow .3s}.tw-location:hover{transform:translateY(-5px);border-color:#8c9fb8;box-shadow:0 8px 20px #00000059}.tw-switch{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;border-top:1px solid #ffffff33}.tw-switch:first-of-type{border-top:0}.tw-switch input{accent-color:#668fff}.tw-resize{position:absolute;right:0;bottom:0;width:16px;height:16px;cursor:nwse-resize;z-index:10;background:linear-gradient(135deg,transparent 40%,#ffffff4d 40% 60%,transparent 60%),linear-gradient(135deg,transparent 70%,#ffffff4d 70%)}.tw-weather-icon{position:relative;display:inline-block;width:2.5em;height:2.5em;font-size:.5em;color:#e8ecff}.tw-weather-icon .cloud{position:absolute;z-index:1;top:50%;left:50%;width:3.6875em;height:3.6875em;margin:-1.84375em;background:#e2e8f0;border-radius:50%;box-shadow:-2.1875em .6875em 0 -.6875em #e2e8f0,2.0625em .9375em 0 -.9375em #e2e8f0,0 0 0 .375em #fff,-2.1875em .6875em 0 -.3125em #fff,2.0625em .9375em 0 -.5625em #fff}.tw-weather-icon .cloud:after{content:"";position:absolute;bottom:0;left:-.5em;width:4.5625em;height:1em;background:#e2e8f0;box-shadow:0 .4375em 0 -.0625em #fff}.tw-weather-icon .cloud:nth-child(2){z-index:0;background:#fff;opacity:.3;transform:scale(.5) translate(6em,-3em);animation:tw-cloud 4s linear infinite}.tw-weather-icon .sun{position:absolute;top:50%;left:50%;width:2.5em;height:2.5em;margin:-1.25em;border-radius:50%;box-shadow:0 0 0 .375em #fff;animation:tw-spin 12s infinite linear;color:#f7ed47}.tw-weather-icon .rays{position:absolute;top:-2em;left:50%;width:.375em;height:1.125em;margin-left:-.1875em;background:#fff;border-radius:.25em;box-shadow:0 5.375em #fff}.tw-weather-icon .rays:before,.tw-weather-icon .rays:after{content:"";position:absolute;top:0;left:0;width:.375em;height:1.125em;transform:rotate(60deg);transform-origin:50% 3.25em;background:#fff;border-radius:.25em;box-shadow:0 5.375em #fff}.tw-weather-icon .rays:before{transform:rotate(120deg)}.tw-weather-icon .rain,.tw-weather-icon .lightning,.tw-weather-icon .snow{position:absolute;z-index:2;top:50%;left:50%;width:3.75em;height:3.75em;margin:.375em 0 0 -2em}.tw-weather-icon .rain:after{content:"";position:absolute;top:50%;left:50%;width:1.125em;height:1.125em;margin:-1em 0 0 -.25em;background:#0cf;border-radius:100% 0 60% 50% / 60% 0 100% 50%;box-shadow:.625em .875em 0 -.125em #ffffff33,-.875em 1.125em 0 -.125em #ffffff33,-1.375em -.125em 0 #ffffff33;transform:rotate(-28deg);animation:tw-rain 3s linear infinite}.tw-weather-icon .bolt{position:absolute;top:50%;left:50%;margin:-.25em 0 0 -.125em;color:#fff;opacity:.3;animation:tw-lightning 2s linear infinite}.tw-weather-icon .bolt:before,.tw-weather-icon .bolt:after{content:"";position:absolute;z-index:2;top:50%;left:50%;margin:-1.625em 0 0 -1.0125em;border-top:1.25em solid transparent;border-right:.75em solid;border-bottom:.75em solid;border-left:.5em solid transparent;transform:skewX(-10deg)}.tw-weather-icon .bolt:after{margin:-.25em 0 0 -.25em;border-top:.75em solid;border-right:.5em solid transparent;border-bottom:1.25em solid transparent;border-left:.75em solid}.tw-weather-icon .flake:before,.tw-weather-icon .flake:after{content:"\\2744";position:absolute;top:50%;left:50%;margin:-1.025em 0 0 -1.0125em;color:#fff;opacity:.35;animation:tw-spin 8s linear infinite reverse}.tw-weather-icon .flake:after{margin:.125em 0 0 -1em;font-size:1.5em;animation:tw-spin 14s linear infinite}.night-moon .sun{background:#f0e68c;box-shadow:inset .65em -.35em 0 .1em #273c75,0 0 0 .375em #f0e68c88;animation:none}.night-moon .sun:after{content:"";position:absolute;inset:-1.5em;background:radial-gradient(circle at 20% 20%,#fff 0 1px,transparent 2px,transparent 100%);opacity:.8}@keyframes tw-spin{to{transform:rotate(360deg)}}@keyframes tw-cloud{0%{opacity:0}50%{opacity:.3}100%{opacity:0;transform:scale(.5) translate(-200%,-3em)}}@keyframes tw-rain{0%,100%{opacity:.35}50%{opacity:1}}@keyframes tw-lightning{45%,55%{opacity:.2}50%{opacity:1;color:#0cf}}
@media(max-width:600px){.tw-panel{top:8px;right:8px;width:calc(100% - 16px);height:calc(100% - 16px)}.tw-form{grid-template-columns:1fr}.tw-hero{grid-template-columns:60px 1fr}}
`;
var stLayoutCss = `
.tw-state{min-height:100%}.tw-notice{text-align:center;color:#aeb9d8;padding:48px 12px}.tw-status{text-align:center;padding:0 0 6px}.ws-details{display:grid;grid-template-columns:3.75em 1fr auto;align-items:center;gap:15px;padding:10px 15px;color:#e8ecff}.ws-weather-display{width:3.75em;height:3.75em;display:grid;place-items:center}.ws-time-display{display:flex;flex-direction:column;line-height:1}.ws-time-main{font-size:50px;font-weight:300;letter-spacing:0}.ws-time-main span{font-size:22px}.ws-time-secondary{margin-top:5px;color:#aeb9d8}.ws-right{display:flex;flex-direction:column;align-items:flex-end;justify-content:center;gap:4px;text-align:right}.ws-summary{font-size:18px;font-weight:600}.ws-date{font-size:14px;color:#aeb9d8}.ws-content-inner{padding:0 15px 15px}.ws-separator{border:0;height:1px;margin:8px 0;background:#ffffff33}.ws-secondary-info{display:flex;flex-wrap:wrap;gap:8px}.ws-info-block{display:flex;align-items:center;gap:8px;flex-grow:1;padding:8px 15px;border:1px solid #ffffff33;border-radius:20px;background:#0003;font-size:13px}.ws-info-block .ws-label{font-weight:700;color:#aeb9d8;white-space:nowrap}.ws-info-block .ws-value{font-size:90%;word-break:break-word}.ws-scene-block{display:block;width:100%;margin-top:8px}.ws-scene-block .ws-value{display:block;margin-top:4px;white-space:pre-wrap}.tw-state-stats{margin-top:12px}.tw-state-stats.tw-card{background:color-mix(in srgb,var(--tw-panel-sky) 20%,transparent)}.tw-map{min-height:100%}.locations_container{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px}.location_card{position:relative;min-height:80px;padding:12px;border:1px solid transparent;border-radius:8px;background:#3a3f47;color:#fff;cursor:pointer;text-align:center}.location_name{font-weight:700}.location_echo{position:absolute;top:4px;right:6px;font-size:12px;color:#cbd5e1}.map_action_area{display:flex;justify-content:center;padding-top:15px;margin-top:15px;border-top:1px solid #ffffff33}.go_button{padding:8px 25px;border:0;border-radius:30px;background:#738c82;color:#fff}.go_button.disabled{opacity:.5;background:#4a5568}.settings-item{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #ffffff33}.settings-item-text{flex:1}.settings-item-text h4{margin:0 0 4px;font-size:1em}.settings-item-text p{margin:0;color:#aeb9d8;font-size:.85em}.theme-list{display:flex;flex-direction:column;gap:12px;padding-bottom:15px}.theme-card{padding:12px;border:2px solid transparent;border-radius:8px;background:#0003}.theme-actions{display:flex;gap:8px;margin-top:10px}.theme-actions button{flex:1;padding:8px;border:0;border-radius:6px;background:#4a5568;color:#fff;cursor:pointer}.toggle-switch{position:relative;width:50px;height:28px}.toggle-switch input{opacity:0;width:0;height:0}.toggle-switch label{position:absolute;inset:0;border-radius:28px;background:#888;cursor:pointer}.toggle-switch label:before{content:"";position:absolute;left:4px;bottom:4px;width:20px;height:20px;border-radius:50%;background:#fff;transition:.2s}.toggle-switch input:checked+label{background:#2196f3}.toggle-switch input:checked+label:before{transform:translateX(22px)}`;
var stSettingsCss = `.tw-settings-pane>.tw-grid{gap:0}.tw-settings-pane .tw-card{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border:0;border-bottom:1px solid #ffffff33;border-radius:0;background:transparent}.tw-settings-pane .settings-item-text{flex:1;min-width:180px}.tw-settings-pane .settings-item-text h4{margin:0 0 4px;font-size:15px;letter-spacing:.01em}.tw-settings-pane .settings-item-text p{line-height:1.4}.tw-settings-pane .tw-card>.settings-item-text{padding-bottom:4px}.tw-settings-pane .tw-form,.tw-settings-pane .tw-actions,.tw-settings-pane .tw-range{flex-basis:100%}.tw-settings-pane .tw-switch{width:100%;min-height:42px;padding:8px 0}.tw-settings-pane .settings-slider{width:150px;accent-color:#8fb3ff}.tw-settings-pane .settings-select{min-height:32px;border:1px solid #ffffff45;border-radius:7px;background:#080d1b99;color:inherit;padding:5px 8px}.tw-settings-pane .tw-extra-settings{display:grid;gap:0}.tw-settings-pane .tw-extra-settings small{display:block;margin-top:3px;color:#aeb9d8;font-size:12px}.tw-settings-pane .tw-extra-settings .tw-switch:first-child{border-top:0}`;
var stControlsCss = `.tw-settings-pane .settings-item{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #ffffff33}.tw-settings-pane .settings-item small{display:block;margin-top:3px;color:#aeb9d8;font-size:.85em}.settings-slider{width:150px;accent-color:#668fff}.settings-select{min-height:32px;padding:5px 8px;border:1px solid #ffffff4d;border-radius:6px;background:#080d1b99;color:inherit;font:inherit}.tw-weather-scroller-container{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:8px;padding:8px 4px;border:1px solid #ffffff2b;border-radius:8px;background:#00000024}.tw-weather-scroller-column{min-width:0;max-height:146px;overflow:auto;scrollbar-width:thin}.tw-weather-scroller-list{display:grid;gap:3px;margin:0;padding:0;list-style:none}.tw-weather-scroller-item{width:100%;padding:7px 4px;border:0;border-radius:6px;background:transparent;color:inherit;font:inherit;font-size:12px;cursor:pointer}.tw-weather-scroller-item:hover,.tw-weather-scroller-item:focus-visible{background:#ffffff18}.tw-weather-scroller-item.selected{background:#ffffff24;box-shadow:inset 0 0 0 1px #a0c4ff;color:#fff}.tw-weather-scroller-item:active{background:#ffffff2b;transform:scale(.98)}`;
var stMotionCss = `.tw-panel{max-width:50vw;animation:tw-panel-in .24s ease-out}.tw-content{overflow:visible}.tw-pane{display:block;opacity:0;visibility:hidden;transform:translateY(10px);transition:opacity .3s ease,transform .3s ease,visibility 0s linear .3s}.tw-pane.active{opacity:1;visibility:visible;transform:translateY(0);transition-delay:0s}.tw-pane::-webkit-scrollbar{width:8px}.tw-pane::-webkit-scrollbar-track{background:transparent}.tw-pane::-webkit-scrollbar-thumb{border-radius:8px;background:#ffffff35}.tw-pane::-webkit-scrollbar-thumb:hover{background:#ffffff55}.tw-head:active{cursor:grabbing}.tw-tab{font-size:14px}.tw-panel button:focus-visible,.tw-panel input:focus-visible{outline:2px solid #8fb3ff;outline-offset:2px}.tw-header-tabs{display:flex;flex:0 0 auto;gap:3px;padding:0;background:transparent;border:0}.tw-header-tabs .tw-tab{flex:0 0 auto;padding:4px 7px;font-size:12px}.tw-header-tabs .tw-tab.active{background:rgba(255,255,255,.16)}.tw-head .tw-brand{display:flex;flex:1;min-width:0;gap:10px}.tw-head .tw-brand>div:last-child{min-width:0}.tw-head>.tw-close{flex:0 0 30px}.tw-head{min-height:62px}.tw-title,.tw-subtitle{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ws-time-interact,.ws-weather-interact{cursor:pointer;border-radius:8px;transition:background .2s,transform .2s}.ws-time-interact:hover,.ws-weather-interact:hover{background:#ffffff12;transform:translateY(-1px)}.tw-quick-editor{position:absolute;left:15px;right:15px;top:12px;z-index:8;padding:11px 12px;border:1px solid #ffffff45;border-radius:9px;background:color-mix(in srgb,var(--tw-panel-sky) 70%,#101827);box-shadow:0 10px 26px #0008;backdrop-filter:blur(14px)}.tw-editor-close{border:0;background:transparent;color:inherit;font-size:20px;cursor:pointer}.sub_locations_container{margin-top:10px;padding:12px;border-radius:8px;background:#00000026}.sub_location{min-height:70px;background:color-mix(in srgb,var(--tw-panel-sky) 26%,transparent)}.tw-switch input{appearance:none;width:46px;height:24px;margin:0;border:1px solid #ffffff45;border-radius:999px;background:#00000045;position:relative;cursor:pointer;transition:background .2s,border-color .2s}.tw-switch input::before{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#eef3ff;box-shadow:0 1px 3px #0007;transition:transform .2s}.tw-switch input:checked{background:#668fff;border-color:#9eb8ff}.tw-switch input:checked::before{transform:translateX(22px)}.location_card{background:color-mix(in srgb,var(--tw-panel-sky) 28%,transparent);border-color:#ffffff26;transition:background .2s,border-color .2s,transform .2s,box-shadow .2s}.location_card:hover{background:color-mix(in srgb,var(--tw-panel-sky) 42%,transparent)}.location_card.selected{border-color:#a0c4ff;box-shadow:0 0 12px #a0c4ff;background:color-mix(in srgb,var(--tw-panel-sky) 48%,transparent)}.location_card:active{transform:scale(.98)}.location_card.has-bg{overflow:hidden;text-shadow:1px 1px 3px #000d;background-size:cover;background-position:center}.location_card.has-bg::before{content:"";position:absolute;inset:0;background:#0008;border-radius:8px;transition:background .2s}.location_card.has-bg:hover::before{background:#0004}.location_card>*{position:relative;z-index:1}.travel_time{position:absolute;top:4px;left:6px;font-size:10px;color:#ddd;background:#0008;padding:1px 4px;border-radius:4px}.characters_list{margin-top:5px;font-size:10px;color:#d7deee;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.go_button{position:relative;overflow:hidden}.go_button::after,.location_card::after{content:"";position:absolute;inset:50%;border-radius:50%;background:#ffffff55;transform:translate(-50%,-50%) scale(0);pointer-events:none}.go_button:active::after,.location_card:active::after{animation:tw-ripple .42s ease-out}.tw-close{transition:background .2s,transform .2s,opacity .2s}.tw-close:hover{opacity:1}.tw-close:active{transform:scale(.9)}@media(max-width:420px){.tw-panel{max-width:calc(100vw - 16px)}.ws-details{grid-template-columns:3.75em 1fr;gap:10px}.ws-weather-interact{grid-column:2;align-items:flex-start}.ws-right{align-items:flex-start;text-align:left}.tw-content .tw-pane{padding:12px}.locations_container{grid-template-columns:1fr}.tw-quick-editor{left:12px;right:12px}}@keyframes tw-ripple{to{inset:-120%;opacity:0}}@keyframes tw-panel-in{from{opacity:0;transform:translateY(-6px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}`;
var stLayersCss = `.tw-theme-layers{position:absolute;inset:0;z-index:0;overflow:hidden;border-radius:12px;pointer-events:none}.tw-bg-layer-1,.tw-bg-layer-2{position:absolute;inset:0;background:var(--tw-panel-sky);background-size:200% 200%;opacity:.34;transition:opacity 9s ease-in-out}.tw-bg-layer-2{opacity:0}.tw-fx-container-local{position:absolute;inset:0;z-index:2;overflow:hidden;border-radius:12px;pointer-events:none}.tw-head,.tw-tabs,.tw-content,.tw-resize{z-index:3}.tw-panel::before{opacity:0}.tw-panel{background:rgba(0,0,0,.12)}.tw-panel.no-glass{background:rgba(0,0,0,.42)}`;
var contextCss = `
.tw-context{display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px 12px;font-size:12px}
.tw-context dt{color:#aeb9d8}.tw-context dd{margin:0;overflow-wrap:anywhere}
.tw-panel{max-width:calc(100% - 16px);max-height:calc(100% - 76px)}
.tw-settings-pane .settings-item{flex-wrap:wrap}.tw-settings-pane select{max-width:100%}
.location_name,.ws-summary,.ws-date{overflow-wrap:anywhere}
.tw-panel select:focus-visible{outline:2px solid #8fb3ff;outline-offset:2px}
@media(max-width:600px){.tw-panel{max-height:calc(100% - 16px)}}
`;
function mountTheWorldPanel(root, context, options) {
  const reactRoot = createRoot(root);
  reactRoot.render(/* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("style", { children: css + stLayoutCss + stSettingsCss + stControlsCss + stMotionCss + stLayersCss + contextCss }),
    /* @__PURE__ */ jsx(WorldPanel, { context, options })
  ] }));
  return { dispose: () => reactRoot.unmount() };
}
function WorldPanel(props) {
  const [tab, setTab] = useState("state");
  const view = useSyncExternalStore(props.options.subscribe, props.options.getSnapshot);
  const { result, status } = view;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [glass, setGlass] = useState(true);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const [size, setSize] = useState({ width: 450, height: 720 });
  const panelRef = useRef(null);
  const gesture = useRef(void 0);
  const weather = describeWorldWeather(result?.state.theWorld);
  const layoutStyle = position.left ? { left: position.left, top: position.top, right: "auto", width: size.width, height: size.height } : { width: size.width, height: size.height };
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("the-world:panel-layout") || "null");
      if (saved) {
        setPosition({ left: saved.left, top: saved.top });
        setSize({ width: saved.width, height: saved.height });
      }
    } catch {
    }
  }, []);
  const saveLayout = (nextPosition = position, nextSize = size) => {
    try {
      localStorage.setItem("the-world:panel-layout", JSON.stringify({ ...nextPosition, ...nextSize }));
    } catch {
    }
  };
  useEffect(() => () => gesture.current?.(), []);
  async function changePreference(operation) {
    setBusy(true);
    setError("");
    try {
      await operation();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  }
  return /* @__PURE__ */ jsxs("section", { ref: panelRef, className: `tw-panel${glass ? "" : " no-glass"}`, style: { ...layoutStyle, "--tw-panel-sky": weather.sky ?? "#343a40" }, children: [
    /* @__PURE__ */ jsxs("div", { className: "tw-theme-layers", "aria-hidden": "true", children: [
      /* @__PURE__ */ jsx("div", { className: "tw-bg-layer-1" }),
      /* @__PURE__ */ jsx("div", { className: "tw-bg-layer-2" })
    ] }),
    /* @__PURE__ */ jsxs("header", { className: "tw-head tw-header", onPointerDown: (event) => {
      gesture.current?.();
      gesture.current = beginDrag(event, panelRef.current, saveLayout, setPosition);
    }, children: [
      /* @__PURE__ */ jsxs("div", { className: "tw-brand", children: [
        /* @__PURE__ */ jsx("nav", { className: "tw-tabs tw-header-tabs", "aria-label": "The World", children: [["state", "\u573A\u666F"], ["map", "\u5730\u56FE"], ["settings", "\u8BBE\u7F6E"]].map(([id, label]) => /* @__PURE__ */ jsx("button", { className: `tw-tab tw-tab-link${tab === id ? " active" : ""}`, type: "button", onPointerDown: (event) => event.stopPropagation(), onClick: () => setTab(id), children: label }, id)) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { className: "tw-title", children: "\u4E16\u754C\u4EEA\u8868\u76D8" }),
          /* @__PURE__ */ jsx("div", { className: "tw-subtitle", children: weather.subtitle })
        ] })
      ] }),
      /* @__PURE__ */ jsx("button", { className: "tw-close", type: "button", "aria-label": "\u5173\u95ED", onPointerDown: (event) => event.stopPropagation(), onClick: () => props.context.close(), children: "\xD7" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "tw-content", children: [
      /* @__PURE__ */ jsx("div", { className: `tw-pane${tab === "state" ? " active" : ""}`, children: /* @__PURE__ */ jsx(StatePane, { result, status, weather }) }),
      /* @__PURE__ */ jsx("div", { className: `tw-pane${tab === "map" ? " active" : ""}`, children: /* @__PURE__ */ jsx(MapPane, { result }) }),
      /* @__PURE__ */ jsxs("div", { className: `tw-pane tw-settings-pane${tab === "settings" ? " active" : ""}`, children: [
        /* @__PURE__ */ jsxs("dl", { className: "tw-context", children: [
          /* @__PURE__ */ jsx("dt", { children: "Timeline" }),
          /* @__PURE__ */ jsx("dd", { children: props.context.target.timelineId }),
          /* @__PURE__ */ jsx("dt", { children: "Branch" }),
          /* @__PURE__ */ jsx("dd", { children: props.context.target.branchId })
        ] }),
        /* @__PURE__ */ jsxs("label", { className: "settings-item", children: [
          /* @__PURE__ */ jsx("span", { children: "\u5929\u8272\u4E3B\u9898" }),
          /* @__PURE__ */ jsxs("select", { className: "settings-select", disabled: busy, value: view.themeId, onChange: (event) => {
            void changePreference(() => props.options.setTheme(event.target.value));
          }, children: [
            /* @__PURE__ */ jsx("option", { value: "default", children: "\u851A\u84DD\u5929\u7A7A" }),
            /* @__PURE__ */ jsx("option", { value: "legacy", children: "\u7ECF\u5178\u5929\u8272" }),
            /* @__PURE__ */ jsx("option", { value: "eternal_night", children: "\u6C38\u6052\u591C\u5E55" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("label", { className: "tw-switch", children: [
          /* @__PURE__ */ jsx("span", { children: "\u6545\u4E8B\u5929\u6C14\u6548\u679C" }),
          /* @__PURE__ */ jsx("input", { type: "checkbox", disabled: busy, checked: view.weatherEffectsEnabled, onChange: (event) => {
            void changePreference(() => props.options.setWeatherEffectsEnabled(event.target.checked));
          } })
        ] }),
        /* @__PURE__ */ jsxs("label", { className: "tw-switch", children: [
          /* @__PURE__ */ jsx("span", { children: "\u9762\u677F\u6BDB\u73BB\u7483" }),
          /* @__PURE__ */ jsx("input", { type: "checkbox", checked: glass, onChange: (event) => setGlass(event.target.checked) })
        ] }),
        /* @__PURE__ */ jsx("button", { className: "tw-action", type: "button", onClick: () => {
          const position2 = { left: 0, top: 0 };
          const size2 = { width: 450, height: 720 };
          setPosition(position2);
          setSize(size2);
          saveLayout(position2, size2);
        }, children: "\u91CD\u7F6E\u9762\u677F\u4F4D\u7F6E" }),
        error ? /* @__PURE__ */ jsx("p", { role: "alert", children: error }) : null
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "tw-resize tw-resize-handle", onPointerDown: (event) => {
      gesture.current?.();
      gesture.current = beginResize(event, panelRef.current, position, setSize, saveLayout);
    } })
  ] });
}
function beginDrag(event, panel, saveLayout, setPosition) {
  if (!panel || event.target.closest("button")) return;
  event.preventDefault();
  const rect = panel.getBoundingClientRect();
  const start = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
  let latest = { left: start.left, top: start.top };
  const move = (next) => {
    const margin = 16;
    const maxLeft = Math.max(margin, window.innerWidth - panel.offsetWidth - margin);
    const maxTop = Math.max(margin, window.innerHeight - panel.offsetHeight - margin);
    latest = { left: Math.min(maxLeft, Math.max(margin, start.left + next.clientX - start.x)), top: Math.min(maxTop, Math.max(margin, start.top + next.clientY - start.y)) };
    panel.style.left = `${latest.left}px`;
    panel.style.top = `${latest.top}px`;
  };
  const cancel = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", end);
    window.removeEventListener("pointercancel", end);
  };
  const end = () => {
    cancel();
    panel.style.left = `${latest.left}px`;
    panel.style.top = `${latest.top}px`;
    setPosition(latest);
    saveLayout(latest);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);
  window.addEventListener("pointercancel", end, { once: true });
  return cancel;
}
function beginResize(event, panel, position, setSize, saveLayout) {
  if (!panel) return;
  event.preventDefault();
  event.stopPropagation();
  const start = { x: event.clientX, y: event.clientY, width: panel.offsetWidth, height: panel.offsetHeight };
  const move = (next) => {
    const size = { width: Math.max(280, start.width + next.clientX - start.x), height: Math.max(320, start.height + next.clientY - start.y) };
    setSize(size);
    saveLayout(position, size);
  };
  const end = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", end);
    window.removeEventListener("pointercancel", end);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end, { once: true });
  window.addEventListener("pointercancel", end, { once: true });
  return end;
}
function StatePane(props) {
  if (!props.result) return /* @__PURE__ */ jsx("p", { className: "tw-notice", role: "status", children: props.status });
  const entities = Object.entries(props.result.state.theWorld.entities);
  const current = projectCurrentWorld(props.result.state.theWorld);
  const scene = current.scene;
  return /* @__PURE__ */ jsxs("div", { className: "tw-state", children: [
    props.status ? /* @__PURE__ */ jsx("div", { className: "tw-meta tw-status", role: "status", children: props.status }) : null,
    /* @__PURE__ */ jsxs("div", { className: "ws-details", children: [
      /* @__PURE__ */ jsx("div", { className: "ws-weather-display", children: weatherIcon(props.weather.kind) }),
      /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsxs("div", { className: "ws-time-display", children: [
        /* @__PURE__ */ jsxs("div", { className: "ws-time-main", children: [
          props.weather.time.slice(0, 2),
          /* @__PURE__ */ jsxs("span", { children: [
            ":",
            props.weather.time.slice(3)
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "ws-time-secondary", children: /* @__PURE__ */ jsx("div", { className: "ws-date-full", children: props.weather.date }) })
      ] }) }),
      /* @__PURE__ */ jsxs("div", { className: "ws-right", children: [
        /* @__PURE__ */ jsx("div", { className: "ws-summary", children: props.weather.subtitle.split(" \xB7 ")[0] }),
        /* @__PURE__ */ jsx("div", { className: "ws-date", children: props.weather.subtitle.split(" \xB7 ")[1] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "ws-content-inner", children: [
      /* @__PURE__ */ jsx("hr", { className: "ws-separator" }),
      /* @__PURE__ */ jsxs("div", { className: "ws-secondary-info", children: [
        /* @__PURE__ */ jsxs("div", { className: "ws-info-block", children: [
          /* @__PURE__ */ jsx("span", { className: "ws-label", children: "\u65F6\u95F4:" }),
          /* @__PURE__ */ jsx("span", { className: "ws-value", children: props.weather.time })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "ws-info-block", children: [
          /* @__PURE__ */ jsx("span", { className: "ws-label", children: "\u5730\u70B9:" }),
          /* @__PURE__ */ jsx("span", { className: "ws-value", children: current.place?.components.place?.name ?? "\u672A\u77E5" })
        ] })
      ] }),
      scene?.components.scene?.description ? /* @__PURE__ */ jsxs("div", { className: "ws-info-block ws-scene-block", children: [
        /* @__PURE__ */ jsx("span", { className: "ws-label", children: "\u573A\u666F:" }),
        /* @__PURE__ */ jsx("div", { className: "ws-value", children: scene.components.scene.description })
      ] }) : null,
      /* @__PURE__ */ jsxs("dl", { className: "tw-context", children: [
        /* @__PURE__ */ jsx("dt", { children: "\u5B9E\u4F53" }),
        /* @__PURE__ */ jsx("dd", { children: entities.length }),
        /* @__PURE__ */ jsx("dt", { children: "Revision" }),
        /* @__PURE__ */ jsx("dd", { children: props.result.revisionId })
      ] })
    ] })
  ] });
}
function MapPane(props) {
  const [selected, setSelected] = useState(null);
  const entries = Object.entries(props.result?.state?.theWorld?.entities || {}).filter((entry) => Boolean(entry[1]?.components?.place));
  const mains = entries.filter(([, entity]) => !entity.components.place.parentPlaceId);
  const children = entries.filter(([, entity]) => entity.components.place.parentPlaceId);
  const selectedPlace = entries.find(([id]) => id === selected)?.[1].components.place;
  return entries.length ? /* @__PURE__ */ jsxs("div", { className: "tw-map", children: [
    /* @__PURE__ */ jsx("div", { className: "locations_container main_locations", children: mains.map(([id, entity]) => /* @__PURE__ */ jsx(LocationCard, { id, place: entity.components.place, main: true, selected: selected === id, onSelect: setSelected }, id)) }),
    mains.map(([mainId, mainEntity]) => {
      const mainName = mainEntity.components.place.name || mainId;
      const nested = children.filter(([, child]) => child.components.place.parentPlaceId === mainId);
      return nested.length ? /* @__PURE__ */ jsx("div", { className: "locations_container sub_locations_container", "data-main": mainName, children: nested.map(([id, entity]) => /* @__PURE__ */ jsx(LocationCard, { id, place: entity.components.place, selected: selected === id, onSelect: setSelected }, id)) }, `sub-${mainId}`) : null;
    }),
    selectedPlace?.description ? /* @__PURE__ */ jsx("p", { children: selectedPlace.description }) : null
  ] }) : /* @__PURE__ */ jsx("p", { className: "tw-notice", children: "\u5F53\u524D\u8FD8\u6CA1\u6709\u5730\u70B9\u6570\u636E\u3002" });
}
function LocationCard(props) {
  return /* @__PURE__ */ jsx("button", { className: `location_card${props.main ? " main_location" : " sub_location"}${props.selected ? " selected" : ""}`, type: "button", "aria-pressed": props.selected, onClick: () => props.onSelect(props.id), children: /* @__PURE__ */ jsx("span", { className: "location_name", children: props.place.name }) });
}
function weatherIcon(kind) {
  if (kind === "unknown") return /* @__PURE__ */ jsx("span", { "aria-label": "\u5929\u6C14\u672A\u77E5", children: "?" });
  if (kind === "clear") return /* @__PURE__ */ jsx("span", { className: "tw-weather-icon", children: /* @__PURE__ */ jsx("span", { className: "icon sunny", children: /* @__PURE__ */ jsx("span", { className: "sun", children: /* @__PURE__ */ jsx("span", { className: "rays" }) }) }) });
  if (kind === "night") return /* @__PURE__ */ jsx("span", { className: "tw-weather-icon", children: /* @__PURE__ */ jsx("span", { className: "icon sunny night-moon", children: /* @__PURE__ */ jsx("span", { className: "sun" }) }) });
  if (kind === "rain") return /* @__PURE__ */ jsx("span", { className: "tw-weather-icon", children: /* @__PURE__ */ jsxs("span", { className: "icon rainy", children: [
    /* @__PURE__ */ jsx("span", { className: "cloud" }),
    /* @__PURE__ */ jsx("span", { className: "rain" })
  ] }) });
  if (kind === "sun-shower") return /* @__PURE__ */ jsx("span", { className: "tw-weather-icon", children: /* @__PURE__ */ jsxs("span", { className: "icon sun-shower", children: [
    /* @__PURE__ */ jsx("span", { className: "cloud" }),
    /* @__PURE__ */ jsx("span", { className: "sun", children: /* @__PURE__ */ jsx("span", { className: "rays" }) }),
    /* @__PURE__ */ jsx("span", { className: "rain" })
  ] }) });
  if (kind === "snow") return /* @__PURE__ */ jsx("span", { className: "tw-weather-icon", children: /* @__PURE__ */ jsxs("span", { className: "icon flurries", children: [
    /* @__PURE__ */ jsx("span", { className: "cloud" }),
    /* @__PURE__ */ jsxs("span", { className: "snow", children: [
      /* @__PURE__ */ jsx("span", { className: "flake" }),
      /* @__PURE__ */ jsx("span", { className: "flake" })
    ] })
  ] }) });
  if (kind === "storm") return /* @__PURE__ */ jsx("span", { className: "tw-weather-icon", children: /* @__PURE__ */ jsxs("span", { className: "icon thunder-storm", children: [
    /* @__PURE__ */ jsx("span", { className: "cloud" }),
    /* @__PURE__ */ jsxs("span", { className: "lightning", children: [
      /* @__PURE__ */ jsx("span", { className: "bolt" }),
      /* @__PURE__ */ jsx("span", { className: "bolt" })
    ] })
  ] }) });
  return /* @__PURE__ */ jsx("span", { className: "tw-weather-icon", children: /* @__PURE__ */ jsxs("span", { className: "icon cloudy", children: [
    /* @__PURE__ */ jsx("span", { className: "cloud" }),
    /* @__PURE__ */ jsx("span", { className: "cloud" })
  ] }) });
}

// src/client/original/toggle_button_base.css
var toggle_button_base_default = "/**\n * The World - Base Panel & UI Styles\n */\n\n#the_world-toggle-btn {\n    position: fixed;\n    top: 10px;\n    right: 10px;\n    width: 50px; /* Adjusted for new icon size */\n    height: 50px; /* Adjusted for new icon size */\n    background-color: rgba(30, 35, 45, .85);\n    color: #fff;\n    border-radius: 25%; /* Changed from 50% to look like an app icon */\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    /* font-size: 20px; Removed emoji-specific style */\n    cursor: move;\n    z-index: 9998;\n    border: 1px solid #4a5568;\n    -webkit-user-select: none;\n    user-select: none;\n    transition: transform .3s ease-in-out, box-shadow .3s ease-in-out; /* Added box-shadow transition */\n    overflow: hidden; /* Contain animations */\n}\n#the_world-toggle-btn:hover {\n    transform: scale(1.1)\n}\n\n/* NEW: Background layers for toggle button animation */\n#the_world-toggle-btn .tw-bg-layer-1,\n#the_world-toggle-btn .tw-bg-layer-2 {\n    position: absolute;\n    top: 0;\n    left: 0;\n    width: 100%;\n    height: 100%;\n    opacity: 0;\n    transition: opacity 9s ease-in-out;\n    background-size: cover;\n    background-position: center;\n}\n";

// src/client/original/toggle_button_effects.css
var toggle_button_effects_default = "/**\n * The World - Dynamic Toggle Button Effects\n * Adapted and scaled from the prototype in index.tsx\n */\n\n#the_world-toggle-btn.weather-sunny,\n#the_world-toggle-btn.weather-cloudy,\n#the_world-toggle-btn.weather-rainy,\n#the_world-toggle-btn.weather-snowy,\n#the_world-toggle-btn.weather-thunderstorm,\n#the_world-toggle-btn.weather-night-clear,\n#the_world-toggle-btn.weather-night-cloudy,\n#the_world-toggle-btn.weather-rainy-night,\n#the_world-toggle-btn.weather-sunrise-sunset,\n#the_world-toggle-btn.weather-sakura,\n#the_world-toggle-btn.weather-fireflies {\n    font-size: 5px; /* Base for em units to scale down from 13px */\n}\n\n/* --- Sunny (Day) --- */\n#the_world-toggle-btn.weather-sunny {\n    background: linear-gradient(160deg, #87CEEB, #ADD8E6);\n    box-shadow: 0 0 15px rgba(135, 206, 235, 0.6);\n}\n#the_world-toggle-btn .sun {\n    position: absolute;\n    top: 50%;\n    left: 50%;\n    transform: translate(-50%, -50%);\n    width: 4.5em; /* 50px -> 4.5em */\n    height: 4.5em;\n    border-radius: 100%;\n    background: linear-gradient(to bottom left, #FFD700, #FFA500);\n    box-shadow: 0 0 15px rgba(255, 215, 0, 0.8);\n    animation: sun-pulse 3s infinite linear;\n}\n\n/* --- CLOUDS --- */\n#the_world-toggle-btn.weather-cloudy,\n#the_world-toggle-btn.weather-rainy,\n#the_world-toggle-btn.weather-snowy,\n#the_world-toggle-btn.weather-thunderstorm {\n    background: linear-gradient(160deg, #7f8c8d, #95a5a6);\n    box-shadow: 0 0 15px rgba(127, 140, 141, 0.6);\n}\n\n#the_world-toggle-btn .cloud {\n    position: absolute;\n    width: 13.5em;\n    height: 10.5em;\n    filter: drop-shadow(1px 2px 2px rgba(0,0,0,0.15));\n    animation-timing-function: linear;\n    animation-iteration-count: infinite;\n    left: 50%;\n    transform: translateX(-50%);\n}\n\n#the_world-toggle-btn .cloud::before {\n    content: '';\n    position: absolute;\n    top: 3.5em;\n    left: 50%;\n    width: 6.25em;\n    height: 6.25em;\n    border-radius: 50%;\n    transform: translateX(-50%);\n    box-shadow: -4.0625em -0.9375em 0 0, 4.0625em -0.625em 0 0.3125em, -8.125em 0em 0 -0.3125em, 8.4375em 0.3125em 0 0, 0em -1.5625em 0 -0.625em, -5.9375em -0.3125em 0 -0.9375em, 5.9375em -0.125em 0 -0.5em;\n}\n\n/* Scaled down cloud positions */\n#the_world-toggle-btn .cloud-back { top: -25px; animation-duration: 28s; transform: scale(0.6) translateX(-70%); opacity: 0.5; z-index: 1; animation-name: cloud-move-back; animation-delay: -14s; }\n#the_world-toggle-btn .cloud-back::before { color: #d5d5d5; background-color: #d5d5d5; }\n\n#the_world-toggle-btn .cloud-mid { top: -28px; animation-duration: 22s; animation-direction: alternate-reverse; transform: scale(0.75) translateX(-60%); opacity: 0.75; z-index: 2; animation-name: cloud-move-mid; animation-delay: -7s; }\n#the_world-toggle-btn .cloud-mid::before { color: #e6e6e6; background-color: #e6e6e6; }\n\n#the_world-toggle-btn .cloud-front { top: -32px; animation-duration: 18s; z-index: 3; transform: translateX(-50%) translateY(-10px); animation-name: cloud-move-front; }\n#the_world-toggle-btn .cloud-front::before { color: #f1f1f1; background-color: #f1f1f1; }\n\n#the_world-toggle-btn.weather-thunderstorm .cloud-back::before { color: #2c3e50; background-color: #2c3e50; }\n#the_world-toggle-btn.weather-thunderstorm .cloud-mid::before { color: #34495e; background-color: #34495e; }\n#the_world-toggle-btn.weather-thunderstorm .cloud-front::before { color: #4a637f; background-color: #4a637f; }\n\n#the_world-toggle-btn.weather-night-cloudy .cloud-back::before, #the_world-toggle-btn.weather-rainy-night .cloud-back::before { color: #282c34; background-color: #282c34; }\n#the_world-toggle-btn.weather-night-cloudy .cloud-mid::before, #the_world-toggle-btn.weather-rainy-night .cloud-mid::before { color: #2c3e50; background-color: #2c3e50; }\n#the_world-toggle-btn.weather-night-cloudy .cloud-front::before, #the_world-toggle-btn.weather-rainy-night .cloud-front::before { color: #34495e; background-color: #34495e; }\n\n/* --- Rainy Particles (Scoped) --- */\n#the_world-toggle-btn.weather-rainy ul, #the_world-toggle-btn.weather-thunderstorm ul, #the_world-toggle-btn.weather-rainy-night ul {\n    position: absolute; top: 25px; left: 0; width: 100%; z-index: 1; padding: 0; margin: 0;\n}\n#the_world-toggle-btn.weather-rainy li, #the_world-toggle-btn.weather-thunderstorm li, #the_world-toggle-btn.weather-rainy-night li {\n    position: absolute; list-style: none; width: 1px; height: 5px;\n    border-radius: 0.5px; background-color: #bdc3c7; opacity: 0;\n    animation: fall-small 1.5s infinite linear; transform: rotate(15deg);\n}\n#the_world-toggle-btn.weather-rainy-night li { background-color: #ecf0f1; }\n/* Shared Nth child for rain/thunder */\n#the_world-toggle-btn.weather-rainy li:nth-child(1), #the_world-toggle-btn.weather-thunderstorm li:nth-child(1), #the_world-toggle-btn.weather-rainy-night li:nth-child(1) { left: 80%; animation-delay: 0s; }\n#the_world-toggle-btn.weather-rainy li:nth-child(2), #the_world-toggle-btn.weather-thunderstorm li:nth-child(2), #the_world-toggle-btn.weather-rainy-night li:nth-child(2) { left: 60%; animation-delay: 0.3s; }\n#the_world-toggle-btn.weather-rainy li:nth-child(3), #the_world-toggle-btn.weather-thunderstorm li:nth-child(3), #the_world-toggle-btn.weather-rainy-night li:nth-child(3) { left: 70%; animation-delay: 0.6s; }\n#the_world-toggle-btn.weather-rainy li:nth-child(4), #the_world-toggle-btn.weather-thunderstorm li:nth-child(4), #the_world-toggle-btn.weather-rainy-night li:nth-child(4) { left: 45%; animation-delay: 1s; }\n#the_world-toggle-btn.weather-rainy li:nth-child(5), #the_world-toggle-btn.weather-thunderstorm li:nth-child(5), #the_world-toggle-btn.weather-rainy-night li:nth-child(5) { left: 35%; animation-delay: 0.2s; }\n\n\n/* --- Snowy --- */\n#the_world-toggle-btn.weather-snowy .snowe { position: absolute; top: 65%; left: 50%; transform: translateX(-50%); width: 15px; height: 15px; border-radius: 50%; background-color: #f1f1f1; z-index: 4;}\n#the_world-toggle-btn.weather-snowy .snowex { position: absolute; top: 52%; left: 50%; transform: translateX(-50%); width: 10px; height: 10px; border-radius: 50%; background-color: #e0e0e0; z-index: 5;}\n#the_world-toggle-btn.weather-snowy .stick { position: absolute; top: 68%; left: calc(50% - 7px); width: 1.5px; height: 8px; transform: rotate(-45deg); background-color: #8B4513; z-index: 3;}\n#the_world-toggle-btn.weather-snowy .stick2 { position: absolute; top: 68%; left: calc(50% + 6px); width: 1.5px; height: 8px; transform: rotate(45deg); background-color: #8B4513; z-index: 3;}\n\n#the_world-toggle-btn.weather-snowy ul { z-index: 5; position: relative; padding:0; margin:0; }\n#the_world-toggle-btn.weather-snowy li {\n    position: absolute; list-style: none; width: 3px; height: 3px; border-radius: 100%;\n    background-color: #fff; box-shadow: 0 0 5px #fff;\n    animation: fall-small 3.5s infinite linear; opacity: 0;\n}\n#the_world-toggle-btn.weather-snowy li:nth-child(1) { top: 0%; left: 100%; }\n#the_world-toggle-btn.weather-snowy li:nth-child(2) { top: 5%; left: 90%; animation-delay: -0.5s;}\n#the_world-toggle-btn.weather-snowy li:nth-child(3) { top: -10%; left: 80%; animation-delay: -2s; }\n#the_world-toggle-btn.weather-snowy li:nth-child(4) { top: 10%; left: 100%; animation-delay: -2s; }\n#the_world-toggle-btn.weather-snowy li:nth-child(5) { top: 20%; left: 80%; animation-delay: -0.5s; }\n#the_world-toggle-btn.weather-snowy li:nth-child(6) { top: 35%; left: 70%; animation-delay: -1s; }\n#the_world-toggle-btn.weather-snowy li:nth-child(7) { top: 23%; left: 60%; animation-delay: -0.8s; }\n#the_world-toggle-btn.weather-snowy li:nth-child(8) { top: 5%; left: 70%; animation-delay: -1.2s; }\n\n/* --- Night (Clear) --- */\n#the_world-toggle-btn.weather-night-clear, #the_world-toggle-btn.weather-night-cloudy, #the_world-toggle-btn.weather-rainy-night {\n    background: linear-gradient(160deg, #192a56, #273c75);\n    box-shadow: 0 0 15px rgba(39, 60, 117, 0.6);\n}\n#the_world-toggle-btn .moon {\n    position: absolute; top: 15%; left: 65%;\n    width: 2em; height: 2em; border-radius: 100%;\n    background: #f1c40f; box-shadow: 0 0 10px #f1c40f;\n}\n#the_world-toggle-btn.weather-night-clear ul { position: relative; width: 100%; height: 100%; padding: 0; margin: 0;}\n#the_world-toggle-btn.weather-night-clear li { position: absolute; list-style: none; background-color: #fff; }\n#the_world-toggle-btn.weather-night-clear li:not(:nth-child(5)) { width: 2px; height: 2px; border-radius: 100%; }\n/* Star Positioning Fix */\n#the_world-toggle-btn.weather-night-clear li:nth-child(1) { top: 30%; left: 65%; animation: twinkle 2s infinite; }\n#the_world-toggle-btn.weather-night-clear li:nth-child(2) { top: 35%; left: 53%; animation: twinkle 2.5s infinite; }\n#the_world-toggle-btn.weather-night-clear li:nth-child(3) { top: 20%; left: 25%; animation: twinkle 3s infinite; }\n#the_world-toggle-btn.weather-night-clear li:nth-child(4) { top: 5%; left: 50%; }\n#the_world-toggle-btn.weather-night-clear li:nth-child(5) { /* meteor */\n    opacity: 0; top: 20%; left: 55%; width: 1px; height: 8px;\n    transform: rotate(45deg); animation: meteor-small 2.5s infinite linear;\n}\n\n/* --- Thunderstorm --- */\n#the_world-toggle-btn.weather-thunderstorm {\n    background: linear-gradient(160deg, #34495e, #2c3e50);\n    box-shadow: 0 0 15px rgba(44, 62, 80, 0.6);\n}\n.lightning-strike-svg {\n    position: absolute; top: 20px; left: 0; width: 100%; height: calc(100% - 20px);\n    z-index: 4; pointer-events: none;\n}\n.lightning-strike-path {\n    fill: none; stroke: white; stroke-width: 1.5px; animation: lightning-fade 0.5s ease-out forwards;\n}\n#the_world-toggle-btn.lightning-flash .cloud { animation: cloud-flash 0.5s ease-out; }\n\n/* --- Night Cloudy --- */\n#the_world-toggle-btn.weather-night-cloudy .moon { z-index: 1; animation: hide-moon 12s infinite ease-in-out; }\n\n/* --- Sunrise/Sunset --- */\n#the_world-toggle-btn.weather-sunrise-sunset {\n    background: linear-gradient(to top, #ff7e5f, #feb47b);\n    box-shadow: 0 0 15px rgba(255, 126, 95, 0.6);\n}\n#the_world-toggle-btn .horizon-line {\n    position: absolute; width: 150%; height: 100%; left: -25%; border-radius: 50%; z-index: 2;\n}\n#the_world-toggle-btn .horizon-1 { bottom: -80%; background: #e55d4b; opacity: 0.7; }\n#the_world-toggle-btn .horizon-2 { bottom: -85%; background: #c34a36; opacity: 0.9; }\n#the_world-toggle-btn .horizon-3 { bottom: -90%; background: #a13d2d; opacity: 1; }\n#the_world-toggle-btn .sun-disk {\n    position: absolute; left: 50%; transform: translateX(-50%);\n    width: 2em; height: 2em; border-radius: 100%;\n    background: #f1c40f; box-shadow: 0 0 10px #f1c40f;\n    z-index: 1; animation: sunrise-small 8s infinite ease-in-out;\n}\n\n/* --- Sakura --- */\n#the_world-toggle-btn.weather-sakura {\n    background: linear-gradient(160deg, #FFC0CB, #FFB6C1);\n    box-shadow: 0 0 15px rgba(255, 182, 193, 0.6);\n}\n#the_world-toggle-btn.weather-sakura li {\n    position: absolute; list-style: none; width: 4px; height: 4px; border-radius: 50%;\n    background-color: #FFC0CB; box-shadow: 0 0 2px #fff, 0 0 5px #fff;\n    animation: sakura-fall-small 5s infinite linear; opacity: 0;\n}\n\n/* --- Fireflies --- */\n#the_world-toggle-btn.weather-fireflies {\n    background: linear-gradient(160deg, #192a56, #273c75);\n    box-shadow: 0 0 15px rgba(39, 60, 117, 0.6);\n}\n#the_world-toggle-btn.weather-fireflies li {\n    position: absolute; list-style: none; width: 2px; height: 2px; border-radius: 50%;\n    background-color: #D4FF9D; animation: firefly-wander-small 8s infinite ease-in-out;\n}\n#the_world-toggle-btn.weather-fireflies li:nth-child(1) { top: 20%; left: 80%; animation-delay: 0s; }\n#the_world-toggle-btn.weather-fireflies li:nth-child(2) { top: 40%; left: 20%; animation-delay: -2s; }\n#the_world-toggle-btn.weather-fireflies li:nth-child(3) { top: 60%; left: 60%; animation-delay: -5s; }\n#the_world-toggle-btn.weather-fireflies li:nth-child(4) { top: 80%; left: 30%; animation-delay: -3s; }\n#the_world-toggle-btn.weather-fireflies li:nth-child(5) { top: 50%; left: 90%; animation-delay: -7s; }\n\n\n/* --- Animations (Reused and Scaled) --- */\n@keyframes sun-pulse { 50% { transform: translate(-50%, -50%) scale(1.05); } }\n@keyframes cloud-move-front { 0% { margin-left: -20%; } 50% { margin-left: 20%; } 100% { margin-left: -20%; } }\n@keyframes cloud-move-mid { 0% { margin-left: -15%; } 50% { margin-left: 15%; } 100% { margin-left: -15%; } }\n@keyframes cloud-move-back { 0% { margin-left: -10%; } 50% { margin-left: 10%; } 100% { margin-left: -10%; } }\n@keyframes lightning-fade { from { opacity: 1; } to { opacity: 0; } }\n@keyframes cloud-flash { 0%, 100% { filter: brightness(1); } 5% { filter: brightness(1.8); } 15% { filter: brightness(1); } }\n@keyframes twinkle { 50% { transform: scale(1.2); opacity: 0.5; } }\n@keyframes hide-moon { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }\n/* Scaled Down Animations */\n@keyframes fall-small {\n    10% { opacity: 0.8; }\n    50% { opacity: 1; transform: translate(-5px, 20px) rotate(15deg); }\n    100% { transform: translate(-10px, 50px) rotate(15deg); opacity: 0; }\n}\n@keyframes meteor-small { 10% { opacity: 1; } 80% { left: 10%; top: 75%; opacity: 0; } }\n@keyframes sunrise-small { 0%, 100% { bottom: -20%; opacity: 0.5; } 50% { bottom: 25%; opacity: 1; } }\n@keyframes sakura-fall-small {\n    0% { transform: translate(0, 0) rotateZ(0deg); opacity: 0; }\n    10% { opacity: 1; }\n    100% { transform: translate(-8px, 60px) rotateZ(360deg); opacity: 0; }\n}\n@keyframes firefly-wander-small {\n    0% { transform: translate(0,0); box-shadow: 0 0 4px #D4FF9D; opacity: 0.5; }\n    25% { transform: translate(6px, 8px); }\n    50% { transform: translate(-4px, -6px); box-shadow: 0 0 6px #D4FF9D; opacity: 1; }\n    75% { transform: translate(2px, -4px); }\n    100% { transform: translate(0,0); box-shadow: 0 0 4px #D4FF9D; opacity: 0.5; }\n}\n";

// src/client/toggle-button.js
function toggleButtonScene(weather, period) {
  const clouds = '<div class="cloud cloud-back"></div><div class="cloud cloud-mid"></div><div class="cloud cloud-front"></div>';
  const particles = (count) => `<ul>${"<li></li>".repeat(count)}</ul>`;
  if (weather.includes("\u96F7")) return ["weather-thunderstorm", clouds + particles(5)];
  if (weather.includes("\u96E8")) return [period.includes("\u591C") ? "weather-rainy-night" : "weather-rainy", clouds + particles(5)];
  if (weather.includes("\u96EA")) return ["weather-snowy", clouds + '<span class="snowe"></span><span class="snowex"></span><span class="stick"></span><span class="stick2"></span>' + particles(8)];
  if (weather.includes("\u4E91") || weather.includes("\u9634")) {
    return period.includes("\u591C") ? ["weather-night-cloudy", '<span class="moon"></span>' + clouds] : ["weather-cloudy", clouds];
  }
  if (period.includes("\u65E5\u51FA") || period.includes("\u65E5\u843D")) return ["weather-sunrise-sunset", '<div class="horizon-line horizon-1"></div><div class="horizon-line horizon-2"></div><div class="horizon-line horizon-3"></div><div class="sun-disk"></div>'];
  if (weather.includes("\u6674") || weather.includes("\u661F\u7A7A")) {
    return period.includes("\u591C") ? ["weather-night-clear", '<span class="moon"></span>' + particles(5)] : ["weather-sunny", '<span class="sun"></span>'];
  }
  if (weather.includes("\u6A31")) return ["weather-sakura", particles(8)];
  if (weather.includes("\u8424\u706B")) return ["weather-fireflies", particles(5)];
  return ["default", ""];
}
function createToggleButtons(doc = document) {
  const instances = /* @__PURE__ */ new Map();
  let current;
  function paint(instance) {
    if (!current) return;
    const [weatherClass, html] = toggleButtonScene(current.weather, current.period);
    const { button, layers } = instance;
    if (instance.weatherClass !== weatherClass) {
      for (const child of [...button.childNodes]) if (!layers.includes(child)) child.remove();
      button.className = `has-ripple ${weatherClass === "default" ? "" : weatherClass}`;
      button.style.fontSize = weatherClass === "default" ? "20px" : "5px";
      if (html) button.insertAdjacentHTML("beforeend", html);
      instance.weatherClass = weatherClass;
    }
    if (instance.background !== current.background) {
      const next = 1 - instance.active;
      layers[next].style.background = current.background;
      layers[next].style.opacity = "1";
      layers[instance.active].style.opacity = "0";
      instance.active = next;
      instance.background = current.background;
    }
  }
  function reconcile() {
    for (const [host] of instances) if (!host.isConnected) instances.delete(host);
    for (const host of doc.querySelectorAll("[data-the-world-toggle]")) {
      if (instances.has(host)) continue;
      const root = host.shadowRoot ?? host.attachShadow({ mode: "open" });
      const style = doc.createElement("style");
      style.textContent = `${toggle_button_base_default}
${toggle_button_effects_default}
:host{display:block;position:absolute;inset:0;width:40px;height:40px;overflow:hidden;pointer-events:none}#the_world-toggle-btn{position:absolute;inset:0;top:auto;right:auto;width:40px;height:40px;z-index:auto;cursor:inherit;box-sizing:border-box;border-radius:50%;overflow:hidden}`;
      const button = doc.createElement("div");
      button.id = "the_world-toggle-btn";
      const layers = [1, 2].map((n) => {
        const layer = doc.createElement("div");
        layer.className = `tw-bg-layer-${n}`;
        layer.style.opacity = n === 1 ? "1" : "0";
        button.append(layer);
        return layer;
      });
      root.replaceChildren(style, button);
      const instance = { button, layers, active: 0 };
      instances.set(host, instance);
      paint(instance);
    }
  }
  const observer = new MutationObserver(reconcile);
  observer.observe(doc.body, { childList: true, subtree: true });
  reconcile();
  return {
    update(weather, period, background) {
      current = { weather, period, background };
      for (const instance of instances.values()) paint(instance);
    },
    dispose() {
      observer.disconnect();
      for (const host of instances.keys()) host.shadowRoot.replaceChildren();
      instances.clear();
    }
  };
}

// src/client/index.js
function activate(context) {
  context.signal.throwIfAborted();
  const target = context.timeline.target;
  if (!target) throw new Error("The World requires an adopted Timeline context");
  const resourceUrl = (path) => context.files.url(path);
  const themeIds = /* @__PURE__ */ new Set(["default", "eternal_night", "legacy"]);
  const toggleButtons = createToggleButtons();
  const stageHost = document.querySelector('[data-loom-component="shell-background-layer"]');
  const backgroundLayer = document.createElement("div");
  backgroundLayer.dataset.theWorldFxLayerBg = "true";
  const foregroundLayer = document.createElement("div");
  foregroundLayer.dataset.theWorldFxLayer = "true";
  for (const layer of [backgroundLayer, foregroundLayer]) {
    layer.style.cssText = `position:${stageHost ? "absolute" : "fixed"};inset:0;pointer-events:none;overflow:hidden;`;
  }
  backgroundLayer.style.zIndex = "0";
  foregroundLayer.style.zIndex = "2";
  (stageHost ?? document.body).append(backgroundLayer, foregroundLayer);
  const clouds = createClouds3dFX(backgroundLayer, resourceUrl("assets/images/cloud.png"));
  const weatherRenderer = createWeatherRenderer({ backgroundLayer, foregroundLayer, clouds });
  const particleStyle = document.createElement("style");
  document.head.append(particleStyle);
  const listeners = /* @__PURE__ */ new Set();
  let view = { status: "\u6B63\u5728\u8BFB\u53D6\u4E16\u754C\u72B6\u6001", weatherEffectsEnabled: true, themeId: "default" };
  let themeRequest = 0;
  let configRequest = 0;
  let wallpaper;
  let disposed = false;
  const handles = [];
  function publish(patch) {
    if (disposed || context.signal.aborted) return;
    view = { ...view, ...patch };
    for (const listener of listeners) listener();
  }
  function releaseWallpaper() {
    if (!wallpaper) return;
    const root = document.documentElement;
    if (root.getAttribute("data-loom-preview-background") === "the-world" && root.style.getPropertyValue("--loom-preview-wallpaper") === wallpaper.applied) {
      if (wallpaper.previous) root.style.setProperty("--loom-preview-wallpaper", wallpaper.previous);
      else root.style.removeProperty("--loom-preview-wallpaper");
      if (wallpaper.attribute === null) root.removeAttribute("data-loom-preview-background");
      else root.setAttribute("data-loom-preview-background", wallpaper.attribute);
    }
    wallpaper = void 0;
  }
  function renderWeather() {
    if (disposed || context.signal.aborted) return;
    const weather = describeWorldWeather(view.result?.state.theWorld);
    toggleButtons.update(weather.weatherString, weather.period, weather.sky ?? "transparent");
    if (!weather.sky || !view.weatherEffectsEnabled) {
      releaseWallpaper();
      weatherRenderer.clear();
      return;
    }
    const root = document.documentElement;
    wallpaper ??= {
      previous: root.style.getPropertyValue("--loom-preview-wallpaper"),
      attribute: root.getAttribute("data-loom-preview-background")
    };
    root.style.setProperty("--loom-preview-wallpaper", weather.sky);
    wallpaper.applied = root.style.getPropertyValue("--loom-preview-wallpaper");
    root.setAttribute("data-loom-preview-background", "the-world");
    weatherRenderer.update({ weatherString: weather.weatherString, periodString: weather.period });
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    context.signal.removeEventListener("abort", dispose);
    for (const handle of handles.splice(0).reverse()) void handle.dispose();
    listeners.clear();
    toggleButtons.dispose();
    weatherRenderer.clear();
    clouds.dispose();
    backgroundLayer.remove();
    foregroundLayer.remove();
    particleStyle.remove();
    releaseWallpaper();
  }
  context.signal.addEventListener("abort", dispose, { once: true });
  function applyConfig(entries) {
    if (disposed || context.signal.aborted) return;
    configRequest += 1;
    const effects = entries.find((entry) => entry.key === "weather-effects-enabled")?.value;
    publish({ weatherEffectsEnabled: typeof effects === "boolean" ? effects : true });
    renderWeather();
  }
  const initialConfigRequest = configRequest;
  void context.configs.list({ scope: { kind: "global" } }).then((entries) => {
    if (configRequest === initialConfigRequest) applyConfig(entries);
  }, (error) => {
    if (!disposed && !context.signal.aborted) context.logger.error("The World settings could not be loaded", { error: String(error) });
  });
  void fetch(resourceUrl("resources/original/weather_effects.css"), { signal: context.signal }).then((response) => {
    if (!response.ok) throw new Error(`Weather effects resource request failed: ${response.status}`);
    return response.text();
  }).then((css2) => {
    if (!disposed && !context.signal.aborted) particleStyle.textContent = css2;
  }).catch((error) => {
    if (!disposed && !context.signal.aborted) context.logger.warn("The World weather effects could not be loaded", { error: String(error) });
  });
  try {
    handles.push(context.configs.subscribe({ scope: { kind: "global" } }, applyConfig));
    handles.push(context.state.subscribe(target, (snapshot) => {
      const root = snapshot.value.theWorld;
      if (root === void 0) {
        publish({ result: void 0, status: "\u5F53\u524D\u5206\u652F\u5C1A\u672A\u521D\u59CB\u5316 The World" });
      } else {
        validateWorldRoot(root);
        publish({ result: { revisionId: snapshot.revisionId, state: { theWorld: root } }, status: "" });
      }
      renderWeather();
    }, (error) => {
      publish({ result: void 0, status: `\u8BFB\u53D6\u5931\u8D25\uFF1A${error.message}` });
      renderWeather();
    }));
    handles.push(context.renderers.register({
      id: "official.the-world.debugger",
      name: "The World \u8C03\u8BD5\u53F0",
      surface: "shell.focus-surface",
      instanceScope: "workspace",
      adapter: "shadow",
      fallback: "hidden"
    }, {
      mount(root, rendererContext) {
        return mountTheWorldPanel(root, { target, close: rendererContext.close }, {
          getSnapshot: () => view,
          subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
          },
          async setWeatherEffectsEnabled(enabled) {
            context.signal.throwIfAborted();
            const entry = await context.configs.upsert({ scope: { kind: "global" }, key: "weather-effects-enabled", value: enabled });
            applyConfig([entry]);
          },
          async setTheme(themeId) {
            if (!themeIds.has(themeId)) throw new Error("Unknown The World sky theme");
            const sequence = ++themeRequest;
            const response = await fetch(resourceUrl(`resources/themes/sky/${themeId}.json`), { signal: context.signal });
            if (!response.ok) throw new Error(`Theme resource request failed: ${response.status}`);
            const theme = await response.json();
            if (disposed || context.signal.aborted || sequence !== themeRequest) return;
            setSkyTheme(theme);
            publish({ themeId });
            renderWeather();
          }
        });
      }
    }));
    handles.push(context.commands.register("official.the-world.open-panel", () => {
      context.renderers.open("official.the-world.debugger", { replace: true });
    }));
  } catch (error) {
    dispose();
    throw error;
  }
  return { dispose };
}
var index_default = { activate };
export {
  activate,
  index_default as default
};
