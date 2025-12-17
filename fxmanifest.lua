fx_version 'cerulean'
game 'gta5'
lua54 'yes'
author 'Kakarot'
description 'Player health, death, and wounding system with ems job'
version '1.2.4'

ui_page 'nui/index.html'

shared_scripts {
        '@qb-core/shared/locale.lua',
        'locales/en.lua',
        'locales/*.lua',
	'config.lua'
}

client_scripts {
	'client/main.lua',
        'client/wounding.lua',
        'client/laststand.lua',
        'client/job.lua',
        'client/dead.lua',
        'client/patient_state.lua',
        'client/nui.lua',
        'client/medical_actions.lua',
        '@PolyZone/client.lua',
        '@PolyZone/BoxZone.lua',
        '@PolyZone/ComboZone.lua'
}

server_scripts {
        '@oxmysql/lib/MySQL.lua',
        'server/main.lua'
}

files {
        'nui/index.html',
        'nui/styles.css',
        'nui/app.js'
}
