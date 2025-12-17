local GetEntityCoords = GetEntityCoords
local PlayerPedId = PlayerPedId
local SetNewWaypoint = SetNewWaypoint
local SetNuiFocus = SetNuiFocus
local SendNUIMessage = SendNUIMessage
local RegisterNUICallback = RegisterNUICallback
local RegisterNetEvent = RegisterNetEvent
local CreateThread = CreateThread
local DisableAllControlActions = DisableAllControlActions
local TriggerEvent = TriggerEvent
local Wait = Wait
local vector3 = vector3
local lib = lib

local nuiMenus = {
    distress = {
        title = locale('nui_title_distress'),
        subtitle = 'Ars Ambulance Job',
        tabs = {
            { id = 'calls', label = locale('nui_tab_calls'), description = locale('nui_tab_calls_desc') },
            { id = 'services', label = locale('nui_tab_services'), description = locale('nui_tab_services_desc') },
        },
        defaultTab = 'calls'
    },
    patient = {
        title = locale('nui_title_patient'),
        subtitle = 'Ars Ambulance Job',
        tabs = {
            { id = 'patient', label = locale('nui_tab_patient'), description = locale('nui_tab_patient_desc') },
            { id = 'services', label = locale('nui_tab_services'), description = locale('nui_tab_services_desc') },
        },
        defaultTab = 'patient'
    }
}

local nuiState = {
    open = false,
    payload = nil,
    menu = nil
}

local function closePanel()
    nuiState.open = false
    nuiState.payload = nil
    nuiState.menu = nil

    SetNuiFocus(false, false)
    SendNUIMessage({ action = 'close' })
end

local function openPanel(menu, payload)
    local settings = nuiMenus[menu]
    if not settings then
        utils.debug('Missing menu for nui', menu)
        return
    end

    nuiState.open = true
    nuiState.payload = payload
    nuiState.menu = menu

    SetNuiFocus(true, true)
    SendNUIMessage({
        action = 'open',
        title = settings.title,
        subtitle = settings.subtitle,
        tabs = settings.tabs,
        activeTab = settings.defaultTab,
        payload = payload,
    })
end

local function buildDemoPayload()
    local coords = GetEntityCoords(cache.ped or PlayerPedId())

    return {
        calls = {
            {
                name = 'Paciente inconsciente',
                message = 'El ciudadano necesita ayuda urgente.',
                location = 'Pillbox Hill',
                coords = coords,
                time = 'Hace 2 minutos'
            },
            {
                name = 'Accidente tráfico',
                message = 'Varios heridos reportados en la vía.',
                location = 'Popular St',
                coords = coords + vector3(15.0, 0.0, 0.0),
                time = 'Hace 5 minutos'
            }
        },
        patient = {
            name = 'Paciente demostración',
            status = 'Estable',
            pulse = '86 bpm',
            pressure = '120/80',
        },
        services = {
            { title = locale('nui_service_gps'), description = locale('nui_service_gps_desc'), event = 'gps' },
            { title = locale('nui_service_notify'), description = locale('nui_service_notify_desc'), event = 'notify' },
        }
    }
end

RegisterNUICallback('close', function(_, cb)
    closePanel()
    cb({})
end)

RegisterNUICallback('selectCall', function(data, cb)
    local payload = nuiState.payload
    local index = data.index

    if payload and payload.calls and payload.calls[index + 1] then
        local call = payload.calls[index + 1]

        if call.coords then
            SetNewWaypoint(call.coords.x or call.coords[1], call.coords.y or call.coords[2])
            utils.showNotification(locale('nui_waypoint_set'))
        end
    end

    cb({})
end)

RegisterNUICallback('copyCall', function(data, cb)
    local payload = nuiState.payload
    local index = data.index

    if payload and payload.calls and payload.calls[index + 1] then
        local call = payload.calls[index + 1]
        local text = string.format('%s - %s', call.name or 'Llamada', call.message or '')

        lib.setClipboard(text)
        utils.showNotification(locale('nui_copied'))
    end

    cb({})
end)

RegisterNUICallback('triggerService', function(data, cb)
    local payload = nuiState.payload
    local index = data.index

    if payload and payload.services and payload.services[index + 1] then
        local service = payload.services[index + 1]

        if service.event == 'gps' then
            local coords = GetEntityCoords(cache.ped or PlayerPedId())
            SetNewWaypoint(coords.x, coords.y)
            utils.showNotification(locale('nui_waypoint_set'))
        elseif service.event == 'notify' then
            utils.showNotification(locale('nui_service_notify_feedback'))
        elseif service.event then
            TriggerEvent(service.event, service)
        end
    end

    cb({})
end)

RegisterNetEvent('F4R3-ambulancejob:openNui', function(menu, payload)
    openPanel(menu, payload)
end)

exports('openNui', openPanel)

RegisterCommand('emsnui', function()
    openPanel('distress', buildDemoPayload())
end)

CreateThread(function()
    while true do
        if nuiState.open then
            DisableAllControlActions(0)
            Wait(0)
        else
            Wait(250)
        end
    end
end)
