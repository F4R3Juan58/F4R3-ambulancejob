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
const toolGrid = document.getElementById('tool-grid');
const toolHint = document.getElementById('tool-hint');
const routes = document.getElementById('routes');
const points = document.getElementById('points');
const evacMap = document.getElementById('evac-map');
const rank = document.getElementById('rank');
const closeButton = document.getElementById('close');
const toast = document.getElementById('shock-toast');
const analyzeButton = document.getElementById('analyze');
const minigame = document.getElementById('minigame');
const minigameTitle = document.getElementById('minigame-title');
const minigameDescription = document.getElementById('minigame-description');
const minigameResult = document.getElementById('minigame-result');
const minigameStage = document.querySelector('.minigame-stage');
const minigameCursor = document.querySelector('.minigame-stage .cursor');
const minigameTarget = document.querySelector('.minigame-stage .target');
const minigameAction = document.getElementById('minigame-action');
const minigameClose = document.getElementById('minigame-close');

const MAX_HEALTH = 200;
const toneClasses = ['stable', 'moderate', 'critical', 'info', 'muted'];
let activePatientMode = 'self';
let lastSelfSnapshot = null;
let cursorInterval = null;
let currentTool = null;
let cursorDirection = 1;
let cursorPosition = 0;

const toolCopy = {
    bandage: {
        label: 'Vendas',
        description: 'Detén sangrados leves manteniendo el pulso estable.',
    },
    defibrillator: {
        label: 'Desfibrilador',
        description: 'Solo disponible si el paciente está inconsciente.',
    },
    burncream: {
        label: 'Crema para quemaduras',
        description: 'Calma y evita daños adicionales de quemaduras.',
    },
    suturekit: {
        label: 'Kit de suturas',
        description: 'Cierra heridas profundas y frena hemorragias.',
    },
    tweezers: {
        label: 'Pinzas',
        description: 'Extrae fragmentos incrustados para reducir el daño.',
    },
    icepack: {
        label: 'Compresa fría',
        description: 'Baja la inflamación y mejora la circulación.',
    },
};

function toggleHud(show) {
    hud.classList.toggle('hidden', !show);
    body.classList.toggle('hidden', !show);
    if (!show) {
        hideMinigame();
    }

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

function setInteractions(payload) {
    const badges = Array.isArray(payload) ? payload : payload?.badges || [];
    const tools = Array.isArray(payload) ? [] : payload?.tools || [];

    interactions.innerHTML = '';
    toolGrid.innerHTML = '';

    if (badges.length === 0) {
        const span = document.createElement('span');
        span.className = 'muted-text';
        span.textContent = 'Sin habilidades adicionales';
        interactions.appendChild(span);
    } else {
        badges.forEach((label) => {
            const div = document.createElement('div');
            div.className = 'chip';
            div.textContent = label;
            interactions.appendChild(div);
        });
    }

    if (toolHint) {
        toolHint.textContent = tools.length === 0
            ? 'No tienes kits médicos disponibles.'
            : 'Selecciona una herramienta para iniciar su minijuego.';
    }

    if (tools.length === 0) {
        const empty = document.createElement('span');
        empty.className = 'muted-text';
        empty.textContent = 'No tienes kits médicos en tu inventario.';
        toolGrid.appendChild(empty);
        return;
    }

    tools.forEach((tool) => {
        const card = document.createElement('div');
        card.className = 'tool-card';

        const title = document.createElement('h5');
        title.textContent = tool.label || toolCopy[tool.id]?.label || tool.id;
        card.appendChild(title);

        const desc = document.createElement('p');
        desc.className = 'muted-text';
        desc.textContent = tool.description || toolCopy[tool.id]?.description || 'Sin descripción';
        card.appendChild(desc);

        const actions = document.createElement('div');
        actions.className = 'tool-actions';

        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = 'Minijuego';
        actions.appendChild(badge);

        const btn = document.createElement('button');
        btn.className = 'primary';
        btn.textContent = 'Usar';
        btn.addEventListener('click', () => startMinigame(tool.id));
        actions.appendChild(btn);

        card.appendChild(actions);
        toolGrid.appendChild(card);
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

function stopCursor() {
    if (cursorInterval) {
        clearInterval(cursorInterval);
        cursorInterval = null;
    }
}

function hideMinigame() {
    stopCursor();
    minigame.classList.add('hidden');
    minigameResult.textContent = '';
    currentTool = null;
}

function startCursor(speed = 0.9) {
    stopCursor();
    cursorDirection = 1;
    cursorPosition = 0;
    cursorInterval = setInterval(() => {
        cursorPosition += cursorDirection * speed;
        if (cursorPosition >= 100 || cursorPosition <= 0) {
            cursorDirection *= -1;
            cursorPosition = Math.max(0, Math.min(100, cursorPosition));
        }
        minigameCursor.style.left = `${cursorPosition}%`;
    }, 16);
}

function drawTargetWindow(difficulty = 18) {
    const start = Math.random() * (100 - difficulty);
    minigameTarget.style.left = `${start}%`;
    minigameTarget.style.width = `${difficulty}%`;
    return { start, end: start + difficulty };
}

let activeTarget = { start: 40, end: 58 };

function startMinigame(toolId) {
    if (!toolId) return;
    currentTool = toolId;
    minigame.classList.remove('hidden');
    minigameTitle.textContent = toolCopy[toolId]?.label || 'Herramienta médica';
    minigameDescription.textContent = toolCopy[toolId]?.description || 'Realiza la acción en el momento adecuado.';
    minigameResult.textContent = 'Pulsa detener cuando el marcador esté en la zona verde.';
    activeTarget = drawTargetWindow(toolId === 'defibrillator' ? 24 : 18);
    startCursor(toolId === 'defibrillator' ? 0.7 : 1);
}

async function resolveMinigame() {
    if (!currentTool) return;
    stopCursor();
    const success = cursorPosition >= activeTarget.start && cursorPosition <= activeTarget.end;
    if (!success) {
        minigameResult.textContent = 'Fallo. Intenta de nuevo estabilizando tus manos.';
        startCursor();
        return;
    }

    minigameResult.textContent = 'Aplicando tratamiento...';
    try {
        const response = await fetch(`https://${GetParentResourceName()}/applyTreatment`, {
            method: 'POST',
            body: JSON.stringify({ item: currentTool })
        });
        const result = await response.json();
        minigameResult.textContent = result?.message || (result?.success ? 'Tratamiento aplicado.' : 'No se pudo aplicar.');
        if (result?.success) {
            setTimeout(hideMinigame, 1200);
        } else {
            startCursor();
        }
    } catch (error) {
        minigameResult.textContent = 'No se pudo comunicar con el panel médico.';
        startCursor();
    }
}

minigameAction.addEventListener('click', resolveMinigame);
minigameClose.addEventListener('click', hideMinigame);
