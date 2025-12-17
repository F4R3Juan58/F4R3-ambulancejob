player = {}
distressCalls = {}

RegisterNetEvent("F4R3-ambulancejob:updateDeathStatus", function(death)
    local data = {}
    data.target = source
    data.status = death.isDead
    data.killedBy = death?.weapon or false

    updateStatus(data)
end)

RegisterNetEvent("F4R3-ambulancejob:revivePlayer", function(data)
    if not hasJob(source, Config.EmsJobs) or not source or source < 1 then return end

    local sourcePed = GetPlayerPed(source)
    local targetPed = GetPlayerPed(data.targetServerId)

    if data.targetServerId < 1 or #(GetEntityCoords(sourcePed) - GetEntityCoords(targetPed)) > 4.0 then
        print(source .. ' probile modder')
    else
        local dataToSend = {}
        dataToSend.revive = true

        TriggerClientEvent('F4R3-ambulancejob:healPlayer', tonumber(data.targetServerId), dataToSend)
    end
end)

RegisterNetEvent("F4R3-ambulancejob:healPlayer", function(data)
    if not hasJob(source, Config.EmsJobs) or not source or source < 1 then return end


    local sourcePed = GetPlayerPed(source)
    local targetPed = GetPlayerPed(data.targetServerId)

    if data.targetServerId < 1 or #(GetEntityCoords(sourcePed) - GetEntityCoords(targetPed)) > 4.0 then
        return print(source .. ' probile modder')
    end


    if data.injury then
        TriggerClientEvent('F4R3-ambulancejob:healPlayer', tonumber(data.targetServerId), data)
    else
        data.anim = "medic"
        TriggerClientEvent("F4R3-ambulancejob:playHealAnim", source, data)
        data.anim = "dead"
        TriggerClientEvent("F4R3-ambulancejob:playHealAnim", data.targetServerId, data)
    end
end)

RegisterNetEvent("F4R3-ambulancejob:createDistressCall", function(data)
    if not source or source < 1 then return end
    distressCalls[#distressCalls + 1] = {
        msg = data.msg,
        gps = data.gps,
        location = data.location,
        name = getPlayerName(source)
    }

    local players = GetPlayers()

    for i = 1, #players do
        local id = tonumber(players[i])

        if hasJob(id, Config.EmsJobs) then
            TriggerClientEvent("F4R3-ambulancejob:createDistressCall", id, getPlayerName(source))
        end
    end
end)

RegisterNetEvent("F4R3-ambulancejob:callCompleted", function(call)
    for i = #distressCalls, 1, -1 do
        if distressCalls[i].gps == call.gps and distressCalls[i].msg == call.msg then
            table.remove(distressCalls, i)
            break
        end
    end
end)

RegisterNetEvent("F4R3-ambulancejob:removAddItem", function(data)
    if data.toggle then
        exports.ox_inventory:RemoveItem(source, data.item, data.quantity)
    else
        exports.ox_inventory:AddItem(source, data.item, data.quantity)
    end
end)

RegisterNetEvent("F4R3-ambulancejob:useItem", function(data)
    if not hasJob(source, Config.EmsJobs) then return end

    local item = exports.ox_inventory:GetSlotWithItem(source, data.item)
    local slot = item.slot

    exports.ox_inventory:SetDurability(source, slot, item.metadata?.durability and (item.metadata?.durability - data.value) or (100 - data.value))
end)

RegisterNetEvent("F4R3-ambulancejob:removeInventory", function()
    if player[source].isDead and Config.RemoveItemsOnRespawn then
        exports.ox_inventory:ClearInventory(source)
    end
end)

RegisterNetEvent("F4R3-ambulancejob:putOnStretcher", function(data)
    if not player[data.target].isDead then return end
    TriggerClientEvent("F4R3-ambulancejob:putOnStretcher", data.target, data.toggle)
end)

RegisterNetEvent("F4R3-ambulancejob:togglePatientFromVehicle", function(data)
    print(data.target)
    if not player[data.target].isDead then return end

    TriggerClientEvent("F4R3-ambulancejob:togglePatientFromVehicle", data.target, data.vehicle)
end)

lib.callback.register('F4R3-ambulancejob:getDeathStatus', function(source, target)
    return player[target] and player[target] or getDeathStatus(target or source)
end)

lib.callback.register('F4R3-ambulancejob:getData', function(source, target)
    local data = {}
    data.injuries = Player(target).state.injuries or false
    data.status = getDeathStatus(target or source) or Player(target).state.dead
    data.killedBy = player[target]?.killedBy or false

    return data
end)

lib.callback.register('F4R3-ambulancejob:getDistressCalls', function(source)
    return distressCalls
end)

lib.callback.register('F4R3-ambulancejob:openMedicalBag', function(source)
    exports.ox_inventory:RegisterStash("medicalBag_" .. source, "Medical Bag", 10, 50 * 1000)

    return "medicalBag_" .. source
end)
lib.callback.register('F4R3-ambulancejob:getItem', function(source, name)
    local item = exports.ox_inventory:GetSlotWithItem(source, name)

    return item
end)

lib.callback.register('F4R3-ambulancejob:getMedicsOniline', function(source)
    local count = 0
    local players = GetPlayers()

    for i = 1, #players do
        local id = tonumber(players[i])

        if hasJob(id, Config.EmsJobs) then
            count += 1
        end
    end
    return count
end)

exports.ox_inventory:registerHook('swapItems', function(payload)
    if string.find(payload.toInventory, "medicalBag_") then
        if payload.fromSlot.name == Config.MedicBagItem then return false end
    end
end, {})

AddEventHandler('onServerResourceStart', function(resourceName)
    if resourceName == GetCurrentResourceName() then
        for index, hospital in pairs(Config.Hospitals) do
            local cfg = hospital

            for id, stash in pairs(cfg.stash) do
                exports.ox_inventory:RegisterStash(id, stash.label, stash.slots, stash.weight * 1000, cfg.stash.shared and true or nil)
            end

            for id, pharmacy in pairs(cfg.pharmacy) do
                exports.ox_inventory:RegisterShop(id, {
                    name = pharmacy.label,
                    inventory = pharmacy.items,
                })
            end
        end
    end
end)


lib.versionCheck('F4R3-ambulancejob/F4R3-ambulancejob')
