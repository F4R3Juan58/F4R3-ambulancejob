local QBCore = exports['qb-core']:GetCoreObject()

local playerData = QBCore.Functions.GetPlayerData()
local hudEnabled = false
local lastSnapshot = nil
MedicalState = {
    pulse = 0,
    health = 0,
    bleeding = 0,
    shock = false,
    rank = nil,
    injuries = {},
    interactions = {},
    routes = Config.TransferRoutes,
    points = Config.PointsOfInterest
}

local function hasSkill(skill)
    if not playerData or not playerData.job then return false end
    local grade = playerData.job.grade.level or playerData.job.grade
    local rank = Config.MedicRanks[grade]
    if not rank or not rank.skills then return false end

    for _, entry in ipairs(rank.skills) do
        if entry == skill then
            return true
        end
    end

    return false
end

local function buildInteractionBadges()
    local items = {
        hasSkill('cpr') and 'RCP disponible' or nil,
        hasSkill('pain_management') and 'Medicación ligera' or nil,
        hasSkill('shock') and 'Protocolo de shock' or nil,
        hasSkill('advanced_meds') and 'Farmacia avanzada' or nil
    }

    local badges = {}
    for _, label in ipairs(items) do
        if label then
            badges[#badges + 1] = label
        end
    end

    return badges
end

local function buildItemTools()
    local tools = {}
    local definitions = {
        { id = 'bandage', label = 'Vendas', description = 'Detén hemorragias leves y estabiliza heridas.' },
        { id = 'defibrillator', label = 'Desfibrilador', description = 'Solo para pacientes inconscientes.' },
        { id = 'burncream', label = 'Crema para quemaduras', description = 'Calma las quemaduras y mejora la recuperación.' },
        { id = 'suturekit', label = 'Kit de suturas', description = 'Cierra heridas profundas para frenar el sangrado.' },
        { id = 'tweezers', label = 'Pinzas', description = 'Extrae fragmentos y reduce el daño en extremidades.' },
        { id = 'icepack', label = 'Compresa fría', description = 'Reduce inflamación y estabiliza el pulso.' }
    }

    for _, entry in ipairs(definitions) do
        if QBCore.Functions.HasItem(entry.id) then
            tools[#tools + 1] = entry
        end
    end

    return tools
end

local function buildInteractions(snapshot)
    snapshot.interactions = {
        badges = buildInteractionBadges(),
        tools = buildItemTools()
    }
end

local function collectInjuries()
    local list = {}
    for _, part in pairs(BodyParts) do
        if part.isDamaged and part.severity and part.severity > 0 then
            list[#list + 1] = {
                label = part.label,
                severity = part.severity
            }
        end
    end

    if isBleeding and isBleeding > 0 then
        list[#list + 1] = {
            label = Lang:t('states.bleed'),
            severity = isBleeding
        }
    end

    if #list == 0 then
        list[1] = { label = Lang:t('info.healthy'), severity = 0 }
    end

    return list
end

local function calculatePulse(ped)
    local health = GetEntityHealth(ped)
    local maxHealth = GetEntityMaxHealth(ped)
    local pulse = 55 + math.floor((health / maxHealth) * 45)

    if isBleeding and isBleeding > 0 then
        pulse = pulse + (isBleeding * 4)
    end

    if onPainKillers then
        pulse = pulse - 5
    end

    return math.max(45, math.min(pulse, 160))
end

local function getShockState(ped)
    local health = GetEntityHealth(ped)
    local severeBleed = isBleeding and isBleeding >= 3
    local lowHealth = health < 90
    return severeBleed or lowHealth
end

local function buildRank()
    if not playerData or not playerData.job then return nil end
    local grade = playerData.job.grade.level or playerData.job.grade
    local rank = Config.MedicRanks[grade]
    if not rank then return nil end

    return {
        label = rank.label,
        description = rank.description,
        grade = grade,
    }
end

local function snapshotState()
    local ped = PlayerPedId()
    local snapshot = {
        pulse = calculatePulse(ped),
        health = GetEntityHealth(ped),
        bleeding = isBleeding or 0,
        shock = getShockState(ped),
        injuries = collectInjuries(),
        rank = buildRank(),
        routes = Config.TransferRoutes,
        points = Config.PointsOfInterest,
        interactions = {}
    }

    buildInteractions(snapshot)
    MedicalState = snapshot
    return snapshot
end

local function pushHud()
    if not hudEnabled then return end
    local snapshot = snapshotState()
    if not snapshot then return end
    SendNUIMessage({
        action = 'updatePatient',
        data = snapshot
    })
end

RegisterNetEvent('hospital:client:ToggleMedicalHud', function(toggle)
    hudEnabled = toggle
    SendNUIMessage({
        action = 'toggleHud',
        show = hudEnabled,
        routes = Config.TransferRoutes,
        points = Config.PointsOfInterest
    })
    if hudEnabled then
        pushHud()
    end
end)

RegisterNetEvent('QBCore:Client:OnPlayerLoaded', function()
    playerData = QBCore.Functions.GetPlayerData()
end)

RegisterNetEvent('QBCore:Player:SetPlayerData', function(data)
    playerData = data
    if hudEnabled then
        pushHud()
    end
end)

CreateThread(function()
    while true do
        Wait(2000)
        if hudEnabled then
            pushHud()
        end
    end
end)

RegisterCommand('medhud', function()
    hudEnabled = not hudEnabled
    TriggerEvent('hospital:client:ToggleMedicalHud', hudEnabled)
    QBCore.Functions.Notify(hudEnabled and 'HUD médico activo' or 'HUD médico oculto', hudEnabled and 'success' or 'primary')
end, false)

RegisterKeyMapping('medhud', 'Mostrar panel médico', 'keyboard', 'F7')

exports('GetMedicalState', function()
    lastSnapshot = snapshotState()
    return lastSnapshot
end)
