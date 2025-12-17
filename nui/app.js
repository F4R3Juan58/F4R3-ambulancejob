const body = document.getElementById('body');
const hud = document.getElementById('hud');
const pulse = document.getElementById('pulse');
const bleeding = document.getElementById('bleeding');
const shock = document.getElementById('shock');
const shockPill = document.getElementById('shock-pill');
const status = document.getElementById('status');
const statusPill = document.getElementById('status-pill');
const injuries = document.getElementById('injuries');
const interactions = document.getElementById('interactions');
const routes = document.getElementById('routes');
const points = document.getElementById('points');
const rank = document.getElementById('rank');
const closeButton = document.getElementById('close');
const toast = document.getElementById('shock-toast');
const analyzeButton = document.getElementById('analyze');
const analysisCard = document.getElementById('analysis-card');
const analysisState = document.getElementById('analysis-state');
const analysisName = document.getElementById('analysis-name');
const analysisMeta = document.getElementById('analysis-meta');

const MAX_HEALTH = 200;
const toneClasses = ['stable', 'moderate', 'critical', 'info', 'muted'];

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

function setPulse(value) {
    pulse.textContent = `${value} bpm`;
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
    applyTone(shockPill, isShock ? 'critical' : 'info', shock.textContent);
    toast.classList.toggle('hidden', !isShock);
}

function setInjuries(list) {
    injuries.innerHTML = '';
    list.forEach((entry) => {
        const li = document.createElement('li');
        li.className = 'card';
        li.innerHTML = `<span class="badge">${entry.severity}</span> ${entry.label}`;
        injuries.appendChild(li);
    });
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

function setRank(data) {
    if (!data) {
        rank.textContent = 'Fuera de servicio médico';
        return;
    }
    rank.textContent = `${data.label} · ${data.description}`;
}

function renderAnalysis(result) {
    analysisCard.classList.remove('stable', 'moderate', 'critical', 'muted');

    if (!result || !result.found) {
        analysisCard.classList.add('muted');
        applyTone(analysisState, 'muted', 'Sin análisis');
        analysisName.textContent = result && result.message ? result.message : 'Esperando paciente';
        analysisMeta.textContent = 'Pulso -- bpm · 0%';
        return;
    }

    analysisCard.classList.add(result.classification);
    applyTone(analysisState, result.classification, result.state);
    analysisName.textContent = `Analizando: ${result.name}`;
    analysisMeta.textContent = `Pulso ${result.pulse} bpm · ${result.percent}%`;
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
            setCondition(data.health || 0);
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
