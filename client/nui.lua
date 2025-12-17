local QBCore = exports['qb-core']:GetCoreObject()

local hudVisible = false
local cursorInHud = false
local function notifyBleed()
    if not isDead and tonumber(isBleeding) > 0 then
        QBCore.Functions.Notify(Lang:t('info.bleed_alert', { bleedstate = Config.BleedingStates[tonumber(isBleeding)].label }), 'error')
    end
end

local function syncInjuries()
    injured = {}
    for part, data in pairs(BodyParts) do
        if data.isDamaged and data.severity > 0 then
            injured[#injured + 1] = {
                part = part,
                label = data.label,
                severity = data.severity,
            }
        end
    end
    TriggerServerEvent('hospital:server:SyncInjuries', {
        limbs = BodyParts,
        isBleeding = tonumber(isBleeding)
    })
end

local function reduceBleeding(level)
    if not isBleeding or isBleeding <= 0 then return end
    isBleeding = math.max(0, isBleeding - level)
    notifyBleed()
    syncInjuries()
end

local function healAmount(value)
    local ped = PlayerPedId()
    local maxHealth = math.max(100, GetEntityMaxHealth(ped))
    SetEntityHealth(ped, math.min(maxHealth, GetEntityHealth(ped) + value))
end

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

local function softenInjury()
    for part, data in pairs(BodyParts) do
        if data.isDamaged and data.severity > 0 then
            data.severity = math.max(0, data.severity - 1)
            if data.severity == 0 then
                data.isDamaged = false
            end
            break
        end
    end
    syncInjuries()
end

local function applyToolEffect(item)
    local ped = PlayerPedId()
    local maxHealth = math.max(100, GetEntityMaxHealth(ped))

    if item == 'defibrillator' then
        if not isDead then
            return { success = false, message = 'Solo puedes usar el desfibrilador con un paciente inconsciente.' }
        end

        local pos = GetEntityCoords(ped, true)
        NetworkResurrectLocalPlayer(pos.x, pos.y, pos.z, GetEntityHeading(ped), true, false)
        isDead = false
        SetEntityInvincible(ped, false)
        SetLaststand(false)
        TriggerServerEvent('hospital:server:SetDeathStatus', false)
        TriggerServerEvent('hospital:server:SetLaststandStatus', false)
        local revivedHealth = math.max(1, math.floor(maxHealth * 0.01))
        SetEntityHealth(ped, revivedHealth)
        ClearPedBloodDamage(ped)
        notifyBleed()
        syncInjuries()
        return { success = true, message = 'Paciente reanimado al mínimo. Continúa el tratamiento.' }
    end

    if isDead then
        return { success = false, message = 'El paciente está inconsciente. Usa primero el desfibrilador.' }
    end

    if item == 'bandage' then
        healAmount(12)
        reduceBleeding(1)
        return { success = true, message = 'Vendaje aplicado y hemorragia reducida.' }
    elseif item == 'burncream' then
        healAmount(8)
        StopEntityFire(ped)
        return { success = true, message = 'La crema alivia la zona quemada.' }
    elseif item == 'suturekit' then
        healAmount(15)
        reduceBleeding(2)
        softenInjury()
        return { success = true, message = 'Sutura completada. Las heridas dejan de sangrar.' }
    elseif item == 'tweezers' then
        softenInjury()
        healAmount(5)
        return { success = true, message = 'Fragmentos retirados, la zona queda más limpia.' }
    elseif item == 'icepack' then
        healAmount(6)
        if onPainKillers then
            PainKillerLoop(1)
        end
        return { success = true, message = 'El frío reduce la inflamación y estabiliza el pulso.' }
    end

    return { success = false, message = 'Herramienta no reconocida.' }
end

RegisterNUICallback('applyTreatment', function(data, cb)
    local item = data and data.item
    if not item then
        cb({ success = false, message = 'No se especificó el tratamiento.' })
        return
    end

    if not QBCore.Functions.HasItem(item) then
        cb({ success = false, message = 'Ya no tienes este artículo en tu inventario.' })
        return
    end

    local result = applyToolEffect(item)
    if result and result.success then
        TriggerServerEvent('hospital:server:ConsumeTreatmentItem', item)
        TriggerEvent('hospital:client:RefreshHud')
    end
    cb(result or { success = false, message = 'No se pudo aplicar el tratamiento.' })
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
