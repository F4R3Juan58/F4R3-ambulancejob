local QBCore = exports['qb-core']:GetCoreObject()

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
