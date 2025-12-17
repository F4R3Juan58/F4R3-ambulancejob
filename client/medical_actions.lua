local QBCore = exports['qb-core']:GetCoreObject()

local function closestPlayer()
    local player, distance = QBCore.Functions.GetClosestPlayer()
    if player == -1 or distance > 3.0 then return nil end
    return GetPlayerServerId(player)
end

local function hasSkill(skill)
    local data = QBCore.Functions.GetPlayerData()
    if not data or not data.job then return false end
    local grade = data.job.grade.level or data.job.grade
    local rank = Config.MedicRanks[grade]
    if not rank or not rank.skills then return false end
    for _, entry in ipairs(rank.skills) do
        if entry == skill then return true end
    end
    return false
end

local function doProgress(action, label, time)
    local ped = PlayerPedId()
    QBCore.Functions.Progressbar(action, label, time, false, true, {
        disableMovement = true,
        disableCarMovement = true,
        disableMouse = false,
        disableCombat = true,
    }, {
        animDict = 'mini@cpr@char_a@cpr_str',
        anim = 'cpr_pumpchest',
        flags = 16,
    }, {}, {}, function()
        ClearPedTasks(ped)
    end, function()
        ClearPedTasks(ped)
        QBCore.Functions.Notify(Lang:t('error.canceled'), 'error')
    end)
end

RegisterCommand('medcpr', function()
    if not hasSkill('cpr') then
        return QBCore.Functions.Notify('Tu rango no permite RCP.', 'error')
    end
    local target = closestPlayer()
    if not target then
        return QBCore.Functions.Notify('No hay pacientes cerca.', 'error')
    end

    doProgress('med_cpr', 'Aplicando RCP', 8000)
    TriggerServerEvent('hospital:server:PerformCpr', target)
end, false)

RegisterCommand('medicar', function(_, args)
    local medType = args[1] or 'painkillers'
    if medType == 'shock' and not hasSkill('shock') then
        return QBCore.Functions.Notify('No estás habilitado para tratar shock.', 'error')
    end
    if medType == 'advanced' and not hasSkill('advanced_meds') then
        return QBCore.Functions.Notify('No tienes acceso a medicación avanzada.', 'error')
    end

    local target = closestPlayer()
    if not target then
        return QBCore.Functions.Notify('No hay pacientes cerca.', 'error')
    end

    doProgress('med_meds', 'Administrando medicación', 5000)
    TriggerServerEvent('hospital:server:ApplyMedication', target, medType)
end, false)

RegisterCommand('traslado', function(_, args)
    local index = tonumber(args[1] or '0')
    if not index or not Config.TransferRoutes[index] then
        return QBCore.Functions.Notify('Ruta no válida.', 'error')
    end
    TriggerEvent('hospital:client:MarkRoute', index)
end, false)

RegisterNetEvent('hospital:client:ReceiveCpr', function(medicName)
    QBCore.Functions.Notify(('RCP aplicada por %s'):format(medicName or 'EMS'), 'success')
    TriggerEvent('hospital:client:Revive')
end)

RegisterNetEvent('hospital:client:ReceiveMedication', function(medType)
    local ped = PlayerPedId()
    if medType == 'painkillers' then
        TriggerEvent('hospital:client:UsePainkillers')
    elseif medType == 'bandage' then
        TriggerEvent('hospital:client:UseBandage')
    elseif medType == 'shock' then
        SetEntityHealth(ped, math.min(200, GetEntityHealth(ped) + 25))
        if isBleeding and isBleeding > 0 then
            isBleeding = math.max(0, isBleeding - 2)
        end
    elseif medType == 'advanced' then
        TriggerEvent('hospital:client:HealInjuries', 'full')
    end
    TriggerEvent('hospital:client:RefreshHud')
end)
