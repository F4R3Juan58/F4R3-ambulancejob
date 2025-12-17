const hud = document.getElementById('hud');
const pulse = document.getElementById('pulse');
const bleeding = document.getElementById('bleeding');
const shock = document.getElementById('shock');
const status = document.getElementById('status');
const injuries = document.getElementById('injuries');
const interactions = document.getElementById('interactions');
const routes = document.getElementById('routes');
const points = document.getElementById('points');
const rank = document.getElementById('rank');
const closeButton = document.getElementById('close');
const toast = document.getElementById('shock-toast');

function toggleHud(show) {
    hud.classList.toggle('hidden', !show);
}

function setPulse(value) {
    pulse.textContent = `${value} bpm`;
    status.textContent = value < 55 ? 'Inestable' : 'Estable';
}

function setBleeding(level) {
    if (!level || level === 0) {
        bleeding.textContent = 'Sin sangrado';
    } else {
        bleeding.textContent = `Nivel ${level}`;
    }
}

function setShock(isShock) {
    shock.textContent = isShock ? 'Shock' : 'Normal';
    shock.className = isShock ? 'text-danger' : 'text-success';
    toast.classList.toggle('hidden', !isShock);
}

function setInjuries(list) {
    injuries.innerHTML = '';
    list.forEach((entry) => {
        const li = document.createElement('li');
        li.textContent = `${entry.label} · severidad ${entry.severity}`;
        injuries.appendChild(li);
    });
}

function setInteractions(list) {
    interactions.innerHTML = '';
    list.forEach((label) => {
        const div = document.createElement('div');
        div.className = 'chip';
        div.textContent = label;
        interactions.appendChild(div);
    });
}

function setRoutes(list) {
    routes.innerHTML = '';
    list.forEach((route, index) => {
        const li = document.createElement('li');
        li.textContent = `${index + 1}. ${route.name}`;
        routes.appendChild(li);
    });
}

function setPoints(list) {
    points.innerHTML = '';
    list.forEach((poi) => {
        const li = document.createElement('li');
        li.textContent = poi.label;
        points.appendChild(li);
    });
}

function setRank(data) {
    if (!data) {
        rank.textContent = 'Fuera de servicio médico';
        return;
    }
    rank.textContent = `${data.label} · ${data.description}`;
}

window.addEventListener('message', (event) => {
    const { action, data, show, routes: routeData, points: poiData } = event.data;
    switch (action) {
        case 'toggleHud':
            toggleHud(show);
            if (routeData) setRoutes(routeData);
            if (poiData) setPoints(poiData);
            break;
        case 'updatePatient':
            if (!data) return;
            toggleHud(true);
            setPulse(data.pulse || 0);
            setBleeding(data.bleeding || 0);
            setShock(data.shock);
            setInjuries(data.injuries || []);
            setInteractions(data.interactions || []);
            setRoutes(data.routes || []);
            setPoints(data.points || []);
            setRank(data.rank);
            break;
        case 'shockWarning':
            setShock(true);
            break;
        default:
            break;
    }
});

closeButton.addEventListener('click', () => {
    fetch(`https://${GetParentResourceName()}/closeHud`, {
        method: 'POST',
        body: JSON.stringify({})
    });
});
