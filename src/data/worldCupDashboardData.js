export const WORLD_CUP_GROUPS = [
    {
        group: 'A',
        teams: ['Mexico', 'Estados Unidos', 'Canada', 'Nueva Zelanda'],
    },
    {
        group: 'B',
        teams: ['Argentina', 'Uruguay', 'Paraguay', 'Peru'],
    },
    {
        group: 'C',
        teams: ['Brasil', 'Colombia', 'Ecuador', 'Venezuela'],
    },
    {
        group: 'D',
        teams: ['Francia', 'Suiza', 'Austria', 'Noruega'],
    },
    {
        group: 'E',
        teams: ['Espana', 'Portugal', 'Marruecos', 'Turquia'],
    },
    {
        group: 'F',
        teams: ['Inglaterra', 'Belgica', 'Gales', 'Escocia'],
    },
    {
        group: 'G',
        teams: ['Alemania', 'Paises Bajos', 'Dinamarca', 'Polonia'],
    },
    {
        group: 'H',
        teams: ['Italia', 'Croacia', 'Serbia', 'Grecia'],
    },
    {
        group: 'I',
        teams: ['Japon', 'Corea del Sur', 'Australia', 'Iran'],
    },
    {
        group: 'J',
        teams: ['Senegal', 'Camerun', 'Ghana', 'Costa de Marfil'],
    },
    {
        group: 'K',
        teams: ['Nigeria', 'Tunez', 'Mali', 'Egipto'],
    },
    {
        group: 'L',
        teams: ['Arabia Saudita', 'Qatar', 'Emiratos Arabes', 'Jordania'],
    },
]

function buildCards(group, team, startId) {
    return Array.from({ length: 20 }, (_, i) => ({
        id: startId + i,
        imageUrl: '/Imagenes/carta_base.png',
        key: `${group}-${team}-${startId + i}`,
    }))
}

let nextCardId = 1
export const WORLD_CUP_DASHBOARD_DATA = WORLD_CUP_GROUPS.map(({ group, teams }) => {
    const mappedTeams = teams.map((teamName) => {
        const cards = buildCards(group, teamName, nextCardId)
        nextCardId += 20
        return {
            name: teamName,
            cards,
        }
    })
    return {
        group,
        teams: mappedTeams,
    }
})

export const TOTAL_WORLD_CUP_CARDS = WORLD_CUP_DASHBOARD_DATA.reduce(
    (acc, grp) => acc + grp.teams.reduce((sum, t) => sum + t.cards.length, 0),
    0
)
