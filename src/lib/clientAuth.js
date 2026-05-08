/**
 * Usuario válido para el área cliente (login, registro, app social, tienda como cliente).
 * Los administradores deben usar /admin-login y rutas /admin-*.
 */
export function isClienteUser(user) {
    return !!user && user.role !== 'admin'
}
