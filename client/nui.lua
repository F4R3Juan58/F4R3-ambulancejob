local QBCore = exports['qb-core']:GetCoreObject()

local hudVisible = false
local cursorInHud = false

local function setHudFocus(state)
    hudVisible = state
    SetNuiFocus(state, state)
    SetNuiFocusKeepInput(state)
    if state then
        SetCursorLocation(0.5, 0.5)
    else
        cursorInHud = false
    end
end

local function openHud()
    TriggerEvent('hospital:client:ToggleMedicalHud', true)
end

local function closeHud()
    TriggerEvent('hospital:client:ToggleMedicalHud', false)
end

RegisterNetEvent('hospital:client:RefreshHud', function()
    local state = exports['F4R3-ambulancejob']:GetMedicalState()
    if state then
        SendNUIMessage({ action = 'updatePatient', data = state })
    end
end)

RegisterNUICallback('closeHud', function(_, cb)
    closeHud()
    cb('ok')
end)

RegisterNUICallback('hudHover', function(data, cb)
    cursorInHud = data and data.inside or false
    cb('ok')
end)

RegisterNUICallback('analyzeClosest', function(_, cb)
    local player, distance = QBCore.Functions.GetClosestPlayer()
    if player == -1 or distance > 3.0 then
        cb({ found = false, message = 'No hay pacientes cerca.' })
        return
    end

    local ped = GetPlayerPed(player)
    local health = GetEntityHealth(ped)
    local maxHealth = math.max(1, GetEntityMaxHealth(ped))
    local percent = math.floor((health / maxHealth) * 100)
    local classification = 'stable'
    local state = 'Estable'

    if percent < 25 then
        classification = 'critical'
        state = 'Grave'
    elseif percent < 75 then
        classification = 'moderate'
        state = 'Moderado'
    end

    local pulse = math.max(50, math.floor(45 + (percent / 100) * 55))

    cb({
        found = true,
        name = GetPlayerName(player),
        percent = percent,
        state = state,
        pulse = pulse,
        classification = classification
    })
end)

RegisterCommand('abrirhud', function()
    openHud()
    QBCore.Functions.Notify('HUD médico abierto', 'success')
end, false)

RegisterCommand('cerrarhud', function()
    closeHud()
    QBCore.Functions.Notify('HUD médico cerrado', 'primary')
end, false)

RegisterNetEvent('hospital:client:ShowShockWarning', function()
    SendNUIMessage({ action = 'shockWarning' })
end)

RegisterNetEvent('hospital:client:MarkRoute', function(routeIndex)
    local route = Config.TransferRoutes[routeIndex]
    if not route then return end
    SetNewWaypoint(route.to.x, route.to.y)
    QBCore.Functions.Notify(('Ruta de traslado: %s'):format(route.name), 'primary')
end)

-- Keep the HUD in sync with movement state
CreateThread(function()
    while true do
        Wait(1000)
        if isBleeding and isBleeding >= 3 then
            TriggerEvent('hospital:client:ShowShockWarning')
        end
    end
end)

AddEventHandler('hospital:client:ToggleMedicalHud', function(toggle)
    setHudFocus(toggle)
end)

CreateThread(function()
    while true do
        if hudVisible then
            if cursorInHud then
                DisableControlAction(0, 1, true) -- Look left/right
                DisableControlAction(0, 2, true) -- Look up/down
                DisableControlAction(0, 24, true) -- Attack
                DisableControlAction(0, 25, true) -- Aim
            end
            Wait(0)
        else
            Wait(500)
        end
    end
end)
