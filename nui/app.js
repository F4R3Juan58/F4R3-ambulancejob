const body = document.getElementById('body');
const hud = document.getElementById('hud');
const pulse = document.getElementById('pulse');
const bleeding = document.getElementById('bleeding');
const shock = document.getElementById('shock');
const shockPill = document.getElementById('shock-pill');
const status = document.getElementById('status');
const statusPill = document.getElementById('status-pill');
const patientName = document.getElementById('patient-name');
const patientNote = document.getElementById('patient-note');
const injuries = document.getElementById('injuries');
const interactions = document.getElementById('interactions');
const routes = document.getElementById('routes');
const points = document.getElementById('points');
const evacMap = document.getElementById('evac-map');
const rank = document.getElementById('rank');
const closeButton = document.getElementById('close');
const toast = document.getElementById('shock-toast');
const analyzeButton = document.getElementById('analyze');

const MAX_HEALTH = 200;
const toneClasses = ['stable', 'moderate', 'critical', 'info', 'muted'];
let activePatientMode = 'self';
let lastSelfSnapshot = null;

function toggleHud(show) {
    hud.classList.toggle('hidden', !show);
    body.classList.toggle('hidden', !show);
    
}

function applyTone(element, tone, label) {
    toneClasses.forEach((klass) => element.classList.remove(klass));
    element.classList.add(tone);
    if (label) {
        element.textContent = label;
    }
}

function classifyByPercent(percent) {
    if (percent < 25) return { label: 'Grave', tone: 'critical' };
    if (percent < 75) return { label: 'Moderado', tone: 'moderate' };
    return { label: 'Estable', tone: 'stable' };
}

function setCondition(healthValue) {
    const percent = Math.min(100, Math.max(0, Math.round((healthValue / MAX_HEALTH) * 100)));
    const classification = classifyByPercent(percent);
    status.textContent = classification.label;
    applyTone(statusPill, classification.tone, classification.label);
}

function setConditionPercent(percent) {
    const normalized = Math.min(100, Math.max(0, Math.round(percent)));
    const classification = classifyByPercent(normalized);
    status.textContent = classification.label;
    applyTone(statusPill, classification.tone, classification.label);
}

function setPulse(value) {
    pulse.textContent = `${value} bpm`;
}

function setBleeding(level) {
    if (typeof level === 'string') {
        bleeding.textContent = level;
        return;
    }

    if (!level || level === 0) {
        bleeding.textContent = 'Sin sangrado';
    } else {
        bleeding.textContent = `Nivel ${level}`;
    }
}

function setShock(isShock) {
    shock.textContent = isShock ? 'Shock' : 'Normal';
    applyTone(shockPill, isShock ? 'critical' : 'info', shock.textContent);
    toast.classList.toggle('hidden', !isShock);
}

function setPatientIdentity(name, note) {
    patientName.textContent = name || 'Paciente';
    patientNote.textContent = note || '';
}

function setInteractions(list) {
    interactions.innerHTML = '';
    if (!list || list.length === 0) {
        const span = document.createElement('span');
        span.className = 'muted-text';
        span.textContent = 'Sin herramientas disponibles';
        interactions.appendChild(span);
        return;
    }

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
        li.className = 'card';
        li.textContent = `${index + 1}. ${route.name}`;
        routes.appendChild(li);
    });

    renderEvacMap(list);
}

function setPoints(list) {
    points.innerHTML = '';
    list.forEach((poi) => {
        const li = document.createElement('li');
        li.className = 'card';
        li.textContent = poi.label;
        points.appendChild(li);
    });
}

function renderEvacMap(list) {
    if (!evacMap) return;
    evacMap.innerHTML = '';

    if (!list || list.length === 0) {
        const empty = document.createElement('span');
        empty.className = 'muted-text';
        empty.textContent = 'Sin puntos de evacuación.';
        evacMap.appendChild(empty);
        return;
    }

    const coords = [];
    list.forEach((route) => {
        if (route.from) coords.push(route.from);
        if (route.to) coords.push(route.to);
    });

    if (coords.length === 0) {
        const empty = document.createElement('span');
        empty.className = 'muted-text';
        empty.textContent = 'No hay ubicaciones para mostrar en el mapa.';
        evacMap.appendChild(empty);
        return;
    }

    const minX = Math.min(...coords.map((c) => c.x));
    const maxX = Math.max(...coords.map((c) => c.x));
    const minY = Math.min(...coords.map((c) => c.y));
    const maxY = Math.max(...coords.map((c) => c.y));

    const rangeX = Math.max(1, maxX - minX);
    const rangeY = Math.max(1, maxY - minY);

    list.forEach((route, index) => {
        ['from', 'to'].forEach((key, idx) => {
            const point = route[key];
            if (!point) return;

            const xPercent = ((point.x - minX) / rangeX) * 100;
            const yPercent = ((maxY - point.y) / rangeY) * 100;

            const marker = document.createElement('div');
            marker.className = `map-marker ${idx === 0 ? 'origin' : 'destination'}`;
            marker.style.left = `${xPercent}%`;
            marker.style.top = `${yPercent}%`;
            marker.title = `${route.name} (${idx === 0 ? 'Salida' : 'Destino'})`;

            const label = document.createElement('span');
            label.textContent = `${index + 1}${idx === 0 ? 'A' : 'B'}`;
            marker.appendChild(label);
            evacMap.appendChild(marker);
        });
    });
}

function setRank(data) {
    if (!data) {
        rank.textContent = 'Fuera de servicio médico';
        return;
    }
    rank.textContent = `${data.label} · ${data.description}`;
}

function renderSelfSnapshot(data) {
    activePatientMode = 'self';
    lastSelfSnapshot = data;

    setPatientIdentity('Propietario', 'Monitoreando tus signos vitales.');
    setCondition(data.health || 0);
    setPulse(data.pulse || 0);
    setBleeding(data.bleeding || 0);
    setShock(data.shock);
}

function renderAnalysis(result) {
    if (!result || !result.found) {
        activePatientMode = 'self';
        setPatientIdentity('Propietario', result && result.message ? result.message : 'Esperando paciente.');
        if (lastSelfSnapshot) {
            renderSelfSnapshot(lastSelfSnapshot);
        }
        return;
    }

    activePatientMode = 'analysis';
    setPatientIdentity(result.name || 'Paciente', 'Mostrando signos vitales analizados.');
    setConditionPercent(result.percent || 0);
    setPulse(result.pulse || 0);
    setBleeding(result.bleedingLabel || 'Sin datos de sangrado');
    setShock(result.classification === 'critical');
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
            lastSelfSnapshot = data;
            if (activePatientMode === 'self') {
                renderSelfSnapshot(data);
            }
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

function notifyHover(inside) {
    fetch(`https://${GetParentResourceName()}/hudHover`, {
        method: 'POST',
        body: JSON.stringify({ inside })
    });
}

hud.addEventListener('mouseenter', () => notifyHover(true));
hud.addEventListener('mouseleave', () => notifyHover(false));

async function analyzePatient() {
    try {
        const response = await fetch(`https://${GetParentResourceName()}/analyzeClosest`, {
            method: 'POST',
            body: JSON.stringify({})
        });
        const result = await response.json();
        renderAnalysis(result);
    } catch (error) {
        renderAnalysis({ found: false, message: 'No se pudo analizar al paciente.' });
    }
}

function closeHud() {
    fetch(`https://${GetParentResourceName()}/closeHud`, {
        method: 'POST',
        body: JSON.stringify({})
    });
}

closeButton.addEventListener('click', closeHud);
analyzeButton.addEventListener('click', analyzePatient);
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeHud();
    }
});
