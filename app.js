const form = document.querySelector('form');
const input = document.querySelector('input');
const inputCheck = document.querySelector('.input-check');
const airportName = document.querySelector('.airport-name');
const results = document.querySelector('#results');


/* -----------------
FORM VALIDATION
----------------- */

input.addEventListener('input', async () => {
    const query = input.value.toUpperCase();
    input.value = query;
    inputCheck.style.display = 'inline';
    if (input.value.match(/[^A-Za-z]/)) {
        inputCheck.innerHTML = `<span class="form-invalid">❌ Please enter alphabet characters only.</span>`;
    } else if (input.value.length === 0) {
        inputCheck.style.display = 'none';
    } else if (!input.value.startsWith('K') && !input.value.startsWith('N') && !input.value.startsWith('P') && !input.value.startsWith('T')) {
        inputCheck.innerHTML = `<span class="form-invalid">❌ US ICAO airport codes begin with K, N, P, or T.</span>`;
    } else if (input.value.length === 4) {
        inputCheck.innerHTML = `<span class="form-typing">✏️ ${query} - Checking...</span>`;
        try {
            const airportName = await fetch(`https://cors.bridged.cc/https://api.aviationapi.com/v1/airports?apt=${query}`);
            const airportNameJSON = await airportName.json();
            generateAirportName(airportNameJSON[query][0].facility_name, airportNameJSON[query][0].city);
        } catch (err) {
            generateErrorInput(err);
        }
    } else {
        inputCheck.innerHTML = `<span class="form-typing">✏️ ${query}</span>`;
    }
});



/*------------------
DISPLAY AIRPORT NAME AND CITY
------------------*/

form.addEventListener('submit', async () => {
    const query = input.value.toUpperCase();
    airportName.innerHTML = '<p>Loading...</p>';
    try {
        const airportName = await fetch(`https://cors.bridged.cc/https://api.aviationapi.com/v1/airports?apt=${query}`);
        const airportNameJSON = await airportName.json();
        displayAirportName(airportNameJSON[query][0].facility_name, airportNameJSON[query][0].city);
    } catch (err) {
        hideAirportName(err);
    }
});



/* -----------------
FETCH METAR
----------------- */

form.addEventListener('submit', async (e) => {
    const query = input.value.toUpperCase();
    results.innerHTML = '<p>Loading...</p>';
    e.preventDefault();
    try {
        const metar = await fetch(`https://cors.bridged.cc/https://api.aviationapi.com/v1/weather/metar?apt=${query}`);
        const metarJSON = await metar.json();
        generateHTML(metarJSON[query]);
    } catch (err) {
        console.log(err);
        generateErrorSubmit(err);
    }
        
});



/* -----------------
HELPER FUNCTIONS
----------------- */

function generateAirportName(airport, city) {
    inputCheck.innerHTML = `<span class="form-valid">✔️ ${airport}, ${city}</span>`;
}

function generateHTML(data) {
    let skyCondition = [];
    let time = data.time_of_obs.replace('T', ' at ').replace('Z', ' Zulu (UTC)');
    let gust, windDir;
    const gustExists = data.raw.match(/G\d+KT/);

    if (data.raw.includes('VRB')) {
        windDir = 'Variable'
    } else if (data.raw.includes('00000KT')) {
        windDir = 'Not Applicable (Calm)'
    } else if (data.raw.match(/\d{3}V\d{3}/)) {
        let windVarChar = data.raw.match(/\d{3}V\d{3}/)[0];
        windDir = `${data.wind} Degrees, variable from ${windVarChar[0]}${windVarChar[1]}${windVarChar[2]} to ${windVarChar[4]}${windVarChar[5]}${windVarChar[6]} Degrees`;
    } else {
        windDir = `${data.wind} Degrees`;
    }

    if (gustExists) {
        if (gustExists[0][1] === '0') {
        gust = `Gusting to ${gustExists[0][2]}`;
        } else {
        gust = `Gusting to ${gustExists[0][1]}${gustExists[0][2]}`; 
        }
    } else {
        gust = '';
    }

    if (data.sky_conditions[0].coverage === "CLR") {
        skyCondition = ['Clear'];
    } else {
        for (let i = 0; i < data.sky_conditions.length; i++) {
            let base = data.sky_conditions[i].base_agl;
            let coverage = data.sky_conditions[i].coverage;
            let condition = `${base} AGL${coverage}`;
            skyCondition.push(condition);
        }
    }
    
    input.value = '';
    inputCheck.style.display = 'none';

    results.innerHTML = `
        <div id="raw-metar">
            <h4>${addSpan()}</h4>
        </div>
        <div id="decoded-metar">
            <p class="station-id">Airport ID: ${data.station_id}</p>
            <p class="time">Time of Observation: ${time}</p>
            <p class="wind">Wind Direction / Speed: ${windDir} / ${data.wind_vel} ${gust} Knots</p>
            <p class="visibility">Visibility: ${data.visibility} Statute Miles</p>
            <p class="sky-condition">Sky Condition: ${skyCondition.join(' - ').replace(/FEW/g, " Few").replace(/SCT/g, " Scattered").replace(/BKN/g, " Broken").replace(/OVC/g, " Overcast")}</p>
            <p class="temp-dewpoint">Temperature / Dewpoint: ${data.temp}°C / ${data.dewpoint}°C</p>
            <p class="altimeter-setting">Altimeter Setting: ${data.alt_hg} inHg (${data.alt_mb} mb)</p>
        </div>
    `;

    function addSpan() {
        const windSpace = data.raw.match(/(\d{5}|VRB\d{2})G?\d?\d?KT(.?\d{3}V\d{3})?/g).join(' ');
        const windNoSpace = data.raw.match(/(\d{5}|VRB\d{2})G?\d?\d?KT(.?\d{3}V\d{3})?/g).join().replace(' ', '-');
        const skyConditionSpace = data.raw.match(/(CLR|FEW|SCT|BKN|OVC)(\d?){3}/g).join(' ');
        const skyConditionNoSpace = data.raw.match(/(CLR|FEW|SCT|BKN|OVC)(\d?){3}/g).join('-').toString();
        let metarItems = data.raw.replace(windSpace, windNoSpace).replace(skyConditionSpace, skyConditionNoSpace).split(' ');
        console.log(metarItems);
        for (let i = 0; i < metarItems.length ; i++) {
            if (metarItems[i] === data.station_id) {
                metarItems[i] = `<span class="station-id">${metarItems[i]}</span>`;
            } else if (metarItems[i].match(/\d{6}Z/)) {
                metarItems[i] = `<span class="time">${metarItems[i]}</span>`;
            } else if (metarItems[i].match(/(\d{5}|VRB\d{2})G?\d?\d?KT(.?\d{3}V\d{3})?/g)) {
                metarItems[i] = `<span class="wind">${metarItems[i].replace(/-/g, ' ')}</span>`;
            } else if (metarItems[i].match(/\d+SM/)) {
                metarItems[i] = `<span class="visibility">${metarItems[i]}</span>`;
            } else if (metarItems[i].startsWith('CLR') || metarItems[i].startsWith('FEW') || metarItems[i].startsWith('SCT') || metarItems[i].startsWith('BKN') || metarItems[i].startsWith('OVC')) {
                metarItems[i] = `<span class="sky-condition">${metarItems[i].replace(/-/g,' ')}</span>`;
            } else if (metarItems[i].match(/^M?\d{2}\/M?\d{2}$/)) {
                metarItems[i] = `<span class="temp-dewpoint">${metarItems[i]}</span>`;
            } else if (metarItems[i].match(/A\d{4}/)) {
                metarItems[i] = `<span class="altimeter-setting">${metarItems[i]}</span>`;
            } else {
            metarItems[i] = `<span>${metarItems[i]}</span>`;
            }
        }
        return metarItems.join(' ');
    }
}

function displayAirportName(airport, city) {
    airportName.innerHTML = `<p>${airport}, ${city}</p>`;
}

function hideAirportName() {
    airportName.innerHTML = ``;
}

function generateErrorInput(err) {
    if (err.toString().includes('facility_name')) {
        inputCheck.innerHTML = `<span class="form-invalid">❌ ${input.value.toUpperCase()} does not match any US ICAO airport code.</span>`;
    } else {
        inputCheck.innerHTML = `<span class="form-invalid">❌ Unable to validate - ${err}</span>`;
    }
}

function generateErrorSubmit(err) {
    if (input.value.length === 0) {
        inputCheck.style.display = 'inline';
        inputCheck.innerHTML = `<span class="form-invalid">☝️ Please enter an airport.</span>`;
    }

    if (err.toString().includes('Failed to fetch')) {
        results.innerHTML = `<p id="error-msg">⚠️ ${err}</p>`;
    } else {
        results.innerHTML = `<p id="error-msg">⚠️ No METAR found for ${input.value}.</p>`;
    }
}



/* -----------------
HIGHLIGHT ON HOVER
----------------- */

results.addEventListener('mouseover', highlight);

results.addEventListener('mouseout', removeHighlight);

function highlight(e) {
    let hoverTarget = document.getElementsByClassName(e.target.className);
    for (let i = 0; i < hoverTarget.length; i++) {
        hoverTarget[i].classList.add('active');
    }
}

function removeHighlight() {
        let hasActive = document.querySelectorAll('.active');
        for (let i = 0; i < hasActive.length; i++) {
            hasActive[i].classList.remove('active');
        }
}



/*--------------------
STICK LABEL
-------------------*/

results.addEventListener('click', addLabel);

function addLabel(e) {
    let labelTarget = document.getElementsByClassName(e.target.className.split(' ')[0]);
    labelTarget[0].classList.add('label-sticker');
    labelTarget[1].classList.add('label-bold');

    let removeLabelFromSpan = document.querySelectorAll(`#raw-metar span:not(.${e.target.className.split(' ')[0]})`);
    let removeLabelFromP = document.querySelectorAll(`#decoded-metar p:not(.${e.target.className.split(' ')[0]})`);
    for (let i = 0; i < removeLabelFromSpan.length; i++) {
        removeLabelFromSpan[i].classList.remove('label-sticker');
    }
    for (let i = 0; i < removeLabelFromP.length; i++) {
        removeLabelFromP[i].classList.remove('label-bold');
    }
}