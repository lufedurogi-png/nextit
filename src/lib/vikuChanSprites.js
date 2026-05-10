/**
 * Rutas de sprites Viku2 (pixel art). Referencia de poses para ajustar animaciones:
 * 01 saludo · 02 bienvenida · 03 tablet · 04 pantalla flotante · 05 pensando · 06 alerta
 * 07 aplauso · 08 neutra · 09 molesta · 10 guiño pulgar · 11 perfil UI · 12 menú iconos
 * 13 iconos UI · 14 anillo carga · 15 correo · 16 campana notif · 17 corazón like · 18 componer (+)
 * 19 compartir · 20 subir foto · 21 buscar · 22 datos · 23 correr lupa · 24 salto
 * 25–26 carrera · 27 música · 28–30 parapente (no usar en carrusel aleatorio)
 * 31–42 vida / idle · 37 celebración · 38 magia izq · 39 neutra · 40 saludo
 * 43 teletransporte (transición de sitio) · 44 manos atrás · 45 confetti · 46 magia · 48 despedida
 */
export function vikuSpriteUrl(index) {
    const n = Math.max(1, Math.min(48, Number(index) || 1))
    return `/Imagenes/viku2/viku2-${String(n).padStart(2, '0')}.png`
}

/** Carrera / pasos (pies distintos); el arte mira hacia la izquierda → al ir a la derecha se invierte con scaleX(-1). */
export const VIKU_WALK_CYCLE = [23, 24, 25, 26]

/** Sprites para carrusel “con vida” (sin parapente 28–30 ni poses de interrupción ni sueño/teleport). */
export const VIKU_PATROL_INDICES = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 20, 21, 22, 23, 24, 25, 26, 27, 31, 32, 33, 34, 35, 37, 38, 39, 40, 41, 42, 44, 45, 46, 47, 48,
]

/** Carrusel cuando está quieta en la plataforma (sin frames de carrera mezclados con el paseo). */
export const VIKU_PATROL_IDLE_INDICES = VIKU_PATROL_INDICES.filter((n) => !VIKU_WALK_CYCLE.includes(n))

export const VIKU_INTERRUPT_SPRITES = {
    notification: 16,
    like: 17,
    compose: 18,
    share: 19,
}

export const VIKU_TELEPORT_SPRITE = 43
export const VIKU_SLEEP_SPRITE = 36
