
let today = new Date();
let currentMonth = today.getMonth();
let currentYear = today.getFullYear();
let lastReminderDate = localStorage.getItem("lastReminderDate");
let holidays={}
let events ={}
let weatherCache={}
let lastWeatherFetchDate=null
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

    //  Save only this year’s holidays
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
      if (i === 0 && j < firstDay) {
        cell.textContent = "";
      } else if (date > daysInMonth) {
        cell.textContent = "";
      } else {
        let dayNumber =date
        cell.textContent = date;
         let dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(dayNumber).padStart(2,"0")}`;

        // Highlight today
        if (dayNumber === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
          cell.classList.add("table-primary");
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
    cell.classList.add("table-danger"); // red
  } else if (hasObservance) {
    cell.classList.add("table-success"); // green
  }
}
 cell.style.cursor = "pointer";
  cell.addEventListener("click", () => {
    showSidebar(holidays[dateStr] || [], dateStr);
  });
if (events[dateStr] && events[dateStr].length > 0) {
  const firstWord = events[dateStr][0].description.split(" ")[0];
  const bullet = document.createElement("div");
  bullet.textContent = `• ${firstWord}`;
  bullet.style.backgroundColor = "blue";
  bullet.style.color = "white";
  bullet.style.fontSize = "0.7em";
  bullet.style.borderRadius = "3px";
  bullet.style.marginTop = "2px";
  cell.appendChild(bullet);
}
        date++;
      }
      row.appendChild(cell);
    }
    calendarBody.appendChild(row);
  }
}

function showSidebar(holidayArray, dateStr) {
  let html = `<p><strong>Date: ${dateStr}</strong></p>`;

  if (holidayArray.length > 0) {
    holidayArray.forEach(h => {
      html += `
        <p><strong>${h.name}</strong></p>
        <p>${h.description}</p>
        <p><em>Type: ${h.type.join(", ")}</em></p>
        <hr>
      `;
    });
  } else {
    html += `<p>No holidays on this date.</p>`;
  }

  // Show existing events
  if (events[dateStr]) {
    html += `<h5>Events:</h5>`;
    events[dateStr].forEach(e => {
      html += `
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span>• ${e.description}</span>
          <button class="btn btn-sm btn-danger" onclick="removeEvent('${dateStr}', '${e.description}')">Delete</button>
        </div>
      `;
    });
  }

  // Show weather forecast
  const weatherData = getWeatherForDate(dateStr);
  if (weatherData) {
    html += `<h5>Weather Forecast:</h5>`;
    weatherData.forEach(w => {
      html += `
        <div>
          <span>${w.time} → ${w.temp}°C, ${w.condition}</span>
        </div>
      `;
    });
  } else {
    html += `<p>No weather forecast available.</p>`;
  }

  document.getElementById("holidayInfo").innerHTML = html;
  document.getElementById("eventDate").value = dateStr;
  document.getElementById("sidebar").classList.add("active");
    document.querySelector(".container").classList.add("sidebar-open");
}
function showAllEventsSidebar() {
  const monthName = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ][currentMonth];
  document.getElementById("eventsMonthYear").textContent = `${monthName} ${currentYear}`;

  let html = "";
  for (const dateStr in events) {
    const [year, month] = dateStr.split("-");
    if (parseInt(year) === currentYear && parseInt(month) === currentMonth + 1) {
      html += `<h5>${dateStr}</h5>`;
      events[dateStr].forEach(e => {
        html += `<p>• ${e.description}</p>`;
      });
      html += "<hr>";
    }
  }

  if (!html) html = "<p>No events this month.</p>";

  document.getElementById("allEventsList").innerHTML = html;
  document.getElementById("allEventsSidebar").classList.add("active");
  document.querySelector(".container").classList.add("sidebar-open");
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
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
    await loadHolidays(currentYear);
  }
  generateCalendar(currentYear, currentMonth);
}

async function goToNextMonth() {
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
    showSidebar(events[dateStr] || [], dateStr);
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
}
function closeAllEventsSidebar() {
  document.getElementById("allEventsSidebar").classList.remove("active");
  document.querySelector(".container").classList.remove("sidebar-open");
}

document.getElementById("allEventsBtn").addEventListener("click", showAllEventsSidebar);
document.getElementById("closeAllEventsSidebar").addEventListener("click", closeAllEventsSidebar);
document.getElementById("prevBtn").addEventListener("click", goToPreviousMonth);
document.getElementById("nextBtn").addEventListener("click", goToNextMonth);
document.getElementById("closeSidebar").addEventListener("click", closeSidebar);
document.getElementById("addEventBtn").addEventListener("click", () => {
  const dateStr = document.getElementById("eventDate").value;
  const desc = document.getElementById("eventDesc").value.trim();
  if (dateStr && desc) {
    addEvent(dateStr, desc);
    document.getElementById("eventDesc").value = ""; // clear field
  }
});
document.getElementById("removeEventBtn").addEventListener("click", () => {
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
