

let today = new Date();
let currentMonth = today.getMonth();
let currentYear = today.getFullYear();
let lastReminderDate = localStorage.getItem("lastReminderDate");
let holidays={}
let events ={}
let weatherCache={}
let lastWeatherFetchDate=null
let selectedCell = null;

function getWeatherIcon(condition) {
  const c = (condition || '').toLowerCase();
  if (c.includes('rain') || c.includes('drizzle')) return 'cloud-rain';
  if (c.includes('cloud')) return 'cloud';
  if (c.includes('clear') || c.includes('sun')) return 'sun';
  if (c.includes('snow')) return 'cloud-snow';
  if (c.includes('thunder') || c.includes('storm')) return 'cloud-lightning';
  return 'cloud';
}

function refreshIcons() {
  if (typeof lucide !== 'undefined') lucide.createIcons();
  if (window.ThemeManager) ThemeManager.refreshIcons();
}

function showBackdrop() {
  document.getElementById('sidebarBackdrop')?.classList.add('active');
}

function hideBackdrop() {
  document.getElementById('sidebarBackdrop')?.classList.remove('active');
}

async function loadWeather() {
  const todayStr = new Date().toISOString().split("T")[0];

  // Only fetch once per day
  if (lastWeatherFetchDate === todayStr && Object.keys(weatherCache).length > 0) {
    return; // already cached
  }

 const url = 'https://open-weather13.p.rapidapi.com/fivedaysforcast?latitude=19.0760&longitude=72.8777&lang=EN';
const options = {
	method: 'GET',
	headers: {
		'x-rapidapi-key': `${RAPIDAPI_KEY}`,
		'x-rapidapi-host': 'open-weather13.p.rapidapi.com',
		'Content-Type': 'application/json'
	}
};
	const response = await fetch(url, options);
	const data = await response.json();

  
  if (data.list && Array.isArray(data.list)) {
    data.list.forEach(entry => {
      const dateStr = entry.dt_txt.split(" ")[0]; // YYYY-MM-DD
      const timeStr = entry.dt_txt.split(" ")[1].slice(0,5); // HH:MM
      if (!weatherCache[dateStr]) {
        weatherCache[dateStr] = [];
      }
      weatherCache[dateStr].push({
        time: timeStr,
        temp: (entry.main.temp-273.15).toFixed(1),
        condition: entry.weather[0].main
      });
    });
  }
localStorage.setItem("weatherCache", JSON.stringify(weatherCache));
localStorage.setItem("lastWeatherFetchDate", todayStr);
  lastWeatherFetchDate = todayStr;
}

async function loadHolidays(year) {
  // Check if we already have holidays for this year
  const savedHolidays = localStorage.getItem(`holidays_${year}`);
  if (savedHolidays) {
    holidays = JSON.parse(savedHolidays);
    return; // ✅ use cached data
  }

  // If not cached, fetch fresh data
  const url = `https://calendarific.com/api/v2/holidays?&api_key=${CALENDARIFIC_KEY}&country=IN&year=${year}`;
  const res = await fetch(url);
  const data = await res.json();
  holidays = {};

  if (data.response && Array.isArray(data.response.holidays)) {
    data.response.holidays.forEach(h => {
      const dateStr = h.date.iso;
      if (!holidays[dateStr]) {
        holidays[dateStr] = [];
      }
      holidays[dateStr].push({
        name: h.name,
        description: h.description,
        type: h.type,
        primary_type: h.primary_type
      });
    });

    //  Save only this year's holidays
    localStorage.setItem(`holidays_${year}`, JSON.stringify(holidays));

    //  Optional: clear previous year to avoid localStorage bloat
    for (let i = 2000; i <= 2100; i++) { // adjust range as needed
      if (i !== year) {
        localStorage.removeItem(`holidays_${i}`);
      }
    }
  } else {
    console.error("Holiday API error:", data);
  }
}

function generateCalendar(year, month) {
  const monthYear = document.getElementById("monthYear");
  const calendarBody = document.getElementById("calendarBody");
  calendarBody.innerHTML = "";
  selectedCell = null;

  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];
  monthYear.textContent = `${months[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let date = 1;
  for (let i = 0; i < 6; i++) { // up to 6 weeks
    let row = document.createElement("tr");

    for (let j = 0; j < 7; j++) {
      let cell = document.createElement("td");
      cell.setAttribute("role", "gridcell");
      if (i === 0 && j < firstDay) {
        cell.textContent = "";
      } else if (date > daysInMonth) {
        cell.textContent = "";
      } else {
        let dayNumber = date;
        let dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(dayNumber).padStart(2,"0")}`;

        const daySpan = document.createElement("span");
        daySpan.className = "day-number";
        daySpan.textContent = dayNumber;
        cell.appendChild(daySpan);

        // Build aria-label
        let ariaParts = [dateStr];
        if (holidays[dateStr]) ariaParts.push(holidays[dateStr].map(h => h.name).join(', '));
        if (events[dateStr]) ariaParts.push(events[dateStr].map(e => e.description).join(', '));
        cell.setAttribute("aria-label", ariaParts.join('. '));

        // Highlight today
        if (dayNumber === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
          cell.classList.add("day-today");
        }
        if (holidays[dateStr]) {
          const hasNationalOrRestricted = holidays[dateStr].some(h =>
            (h.type && h.type.includes("National holiday")) ||
            (h.type && h.type.includes("Restricted holiday")) ||
            (h.primary_type && (h.primary_type === "National holiday" || h.primary_type === "Restricted Holiday"))
          );

          const hasObservance = holidays[dateStr].some(h =>
            (h.type && h.type.includes("Observance")) ||
            (h.primary_type && h.primary_type === "Observance")
          );

          if (hasNationalOrRestricted) {
            cell.classList.add("day-holiday-national");
          } else if (hasObservance) {
            cell.classList.add("day-holiday-observance");
          }
        }
        cell.style.cursor = "pointer";
        cell.addEventListener("click", () => {
          if (selectedCell) selectedCell.classList.remove("day-selected");
          cell.classList.add("day-selected");
          selectedCell = cell;
          showSidebar(holidays[dateStr] || [], dateStr);
        });
        if (events[dateStr] && events[dateStr].length > 0) {
          const firstWord = events[dateStr][0].description.split(" ")[0];
          const badge = document.createElement("div");
          badge.className = "event-badge";
          badge.textContent = firstWord;
          cell.appendChild(badge);
        }
        date++;
      }
      row.appendChild(cell);
    }
    calendarBody.appendChild(row);
  }
  refreshIcons();
}

function showSidebar(holidayArray, dateStr) {
  closeAllEventsSidebar();
  window.SoundManager?.play('sidebarOpen');

  let html = `<div class="info-card">
    <div class="info-card-header"><i data-lucide="calendar"></i> Date</div>
    <div class="info-card-body"><strong>${dateStr}</strong></div>
  </div>`;

  if (holidayArray.length > 0) {
    holidayArray.forEach(h => {
      const isNational = (h.type && h.type.includes("National holiday")) ||
        (h.type && h.type.includes("Restricted holiday")) ||
        (h.primary_type && (h.primary_type === "National holiday" || h.primary_type === "Restricted Holiday"));
      const badgeClass = isNational ? 'national' : 'observance';
      html += `
        <div class="info-card">
          <div class="info-card-header"><i data-lucide="flag"></i> ${h.name}</div>
          <div class="info-card-body">${h.description}</div>
          <span class="holiday-badge ${badgeClass}">${h.type.join(", ")}</span>
        </div>
      `;
    });
  } else {
    html += `<div class="info-card">
      <div class="info-card-body">No holidays on this date.</div>
    </div>`;
  }

  // Show existing events
  if (events[dateStr]) {
    html += `<div class="section-divider"></div>
      <div class="info-card">
        <div class="info-card-header"><i data-lucide="sparkles"></i> Events</div>`;
    events[dateStr].forEach(e => {
      html += `
        <div class="event-item">
          <span class="event-item-text"><span class="event-badge">${e.description}</span></span>
          <button class="btn btn-sm btn-danger" onclick="removeEvent('${dateStr}', '${e.description.replace(/'/g, "\\'")}')">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      `;
    });
    html += `</div>`;
  }

  // Show weather forecast
  const weatherData = getWeatherForDate(dateStr);
  if (weatherData) {
    html += `<div class="section-divider"></div>
      <div class="info-card">
        <div class="info-card-header"><i data-lucide="cloud"></i> Weather Forecast</div>`;
    weatherData.forEach(w => {
      const icon = getWeatherIcon(w.condition);
      html += `
        <div class="weather-row">
          <i data-lucide="${icon}"></i>
          <span>${w.time} → ${w.temp}°C, ${w.condition}</span>
        </div>
      `;
    });
    html += `</div>`;
  } else {
    html += `<div class="info-card">
      <div class="info-card-body">No weather forecast available.</div>
    </div>`;
  }

  document.getElementById("holidayInfo").innerHTML = html;
  document.getElementById("eventDate").value = dateStr;
  document.getElementById("sidebar").classList.add("active");
  document.querySelector(".container").classList.add("sidebar-open");
  showBackdrop();
  refreshIcons();
}

function showAllEventsSidebar() {
  closeSidebar();
  window.SoundManager?.play('sidebarOpen');

  const monthName = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ][currentMonth];
  document.getElementById("eventsMonthYear").textContent = `${monthName} ${currentYear}`;

  let html = "";
  for (const dateStr in events) {
    const [year, month] = dateStr.split("-");
    if (parseInt(year) === currentYear && parseInt(month) === currentMonth + 1) {
      html += `<div class="all-events-date"><i data-lucide="calendar"></i> ${dateStr}</div>`;
      events[dateStr].forEach(e => {
        html += `<div class="info-card"><span class="event-badge">${e.description}</span></div>`;
      });
    }
  }

  if (!html) {
    html = `<div class="empty-state">
      <i data-lucide="calendar-x"></i>
      <p>No events this month.</p>
    </div>`;
  }

  document.getElementById("allEventsList").innerHTML = html;
  document.getElementById("allEventsSidebar").classList.add("active");
  document.querySelector(".container").classList.add("sidebar-open");
  showBackdrop();
  refreshIcons();
}


function getDailyAverageWeather(dateStr) {
  const weatherData = weatherCache[dateStr];
  if (!weatherData || weatherData.length === 0) return null;

  // Average temperature
  const avgTemp = (
    weatherData.reduce((sum, w) => sum + parseFloat(w.temp), 0) / weatherData.length
  ).toFixed(1);

  // Most frequent condition
  const conditionCounts = {};
  weatherData.forEach(w => {
    conditionCounts[w.condition] = (conditionCounts[w.condition] || 0) + 1;
  });
  const dominantCondition = Object.keys(conditionCounts).reduce((a, b) =>
    conditionCounts[a] > conditionCounts[b] ? a : b
  );

  return { avgTemp, dominantCondition };
}

function getWeatherForDate(dateStr) {
  return weatherCache[dateStr] || null;
}

async function goToPreviousMonth() {
  window.SoundManager?.play('click');
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
    await loadHolidays(currentYear);
  }
  generateCalendar(currentYear, currentMonth);
}

async function goToNextMonth() {
  window.SoundManager?.play('click');
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
    await loadHolidays(currentYear);
  }
  generateCalendar(currentYear, currentMonth);
}
function addEvent(dateStr, description) {
  if (!events[dateStr]) {
    events[dateStr] = [];
  }
  events[dateStr].push({ description, notify: true });
  localStorage.setItem('events', JSON.stringify(events)); // persist
  generateCalendar(currentYear, currentMonth);
  window.SoundManager?.play('success');
  alert(`Event added: ${description} on ${dateStr}`);
}

function removeEvent(dateStr, description) {
  if (events[dateStr]) {
    events[dateStr] = events[dateStr].filter(e => e.description !== description);
    if (events[dateStr].length === 0) {
      delete events[dateStr];
    }
    localStorage.setItem('events', JSON.stringify(events)); // persist
    generateCalendar(currentYear, currentMonth);
    showSidebar(holidays[dateStr] || [], dateStr);
  }
}

// On startup
const savedEvents = localStorage.getItem('events');
if (savedEvents) {
  events = JSON.parse(savedEvents);
}

function checkReminders() {
  const todayStr = today.toISOString().split("T")[0];
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  // Prevent duplicate alerts on same day
  if (lastReminderDate === todayStr) return;

  [todayStr, tomorrowStr].forEach(dateStr => {
    if (events[dateStr]) {
      events[dateStr].forEach(e => {
        if (e.notify) {
          let message = `Reminder: ${e.description} on ${dateStr}`;
          const avgWeather = getDailyAverageWeather(dateStr);
          if (avgWeather) {
            message += ` | Avg: ${avgWeather.avgTemp}°C, ${avgWeather.dominantCondition}`;
          }
          window.SoundManager?.play('reminder');
          alert(message);
        }
      });
    }
  });

  // Mark reminders as shown for today
  localStorage.setItem("lastReminderDate", todayStr);
  lastReminderDate = todayStr;
}

function closeSidebar() {
  document.getElementById("sidebar").classList.remove("active");
  document.querySelector(".container").classList.remove("sidebar-open");
  if (!document.getElementById("allEventsSidebar").classList.contains("active")) {
    hideBackdrop();
  }
  if (selectedCell) {
    selectedCell.classList.remove("day-selected");
    selectedCell = null;
  }
}
function closeAllEventsSidebar() {
  document.getElementById("allEventsSidebar").classList.remove("active");
  document.querySelector(".container").classList.remove("sidebar-open");
  if (!document.getElementById("sidebar").classList.contains("active")) {
    hideBackdrop();
  }
}

document.getElementById("sidebarBackdrop")?.addEventListener("click", () => {
  closeSidebar();
  closeAllEventsSidebar();
});

document.getElementById("allEventsBtn").addEventListener("click", showAllEventsSidebar);
document.getElementById("closeAllEventsSidebar").addEventListener("click", () => {
  window.SoundManager?.play('click');
  closeAllEventsSidebar();
});
document.getElementById("prevBtn").addEventListener("click", goToPreviousMonth);
document.getElementById("nextBtn").addEventListener("click", goToNextMonth);
document.getElementById("closeSidebar").addEventListener("click", () => {
  window.SoundManager?.play('click');
  closeSidebar();
});
document.getElementById("addEventBtn").addEventListener("click", () => {
  window.SoundManager?.play('click');
  const dateStr = document.getElementById("eventDate").value;
  const desc = document.getElementById("eventDesc").value.trim();
  if (dateStr && desc) {
    addEvent(dateStr, desc);
    document.getElementById("eventDesc").value = ""; // clear field
  }
});
document.getElementById("removeEventBtn").addEventListener("click", () => {
  window.SoundManager?.play('click');
  const dateStr = document.getElementById("eventDate").value;
  const desc = document.getElementById("eventDesc").value.trim();
  if (dateStr && desc) {
    removeEvent(dateStr, desc);
    document.getElementById("eventDesc").value = ""; // clear field
  }
});


(async () => {
  await loadHolidays(currentYear);

  // Restore cache if available
  const todayStr = new Date().toISOString().split("T")[0];
  const savedWeatherCache = localStorage.getItem("weatherCache");
  const savedWeatherDate = localStorage.getItem("lastWeatherFetchDate");

  if (savedWeatherCache && savedWeatherDate === todayStr) {
    weatherCache = JSON.parse(savedWeatherCache);
    lastWeatherFetchDate = savedWeatherDate;
  } else {
    await loadWeather();
  }

  generateCalendar(currentYear, currentMonth);
  checkReminders();
})();
