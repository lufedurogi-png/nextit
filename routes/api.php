<?php

use App\Http\Controllers\Api\V1\Admin\AdminAuthController;
use App\Http\Controllers\Api\V1\Admin\AdminBackupController;
use App\Http\Controllers\Api\V1\Admin\AdminChatController;
use App\Http\Controllers\Api\V1\Admin\AdminCotizacionInvitadoController;
use App\Http\Controllers\Api\V1\Admin\AdminMargenVentaController;
use App\Http\Controllers\Api\V1\Admin\AdminMetodoPagoController;
use App\Http\Controllers\Api\V1\Admin\AdminStatsController;
use App\Http\Controllers\Api\V1\Admin\DesarrolladorAdminController;
use App\Http\Controllers\Api\V1\Admin\ManagerUserController;
use App\Http\Controllers\Api\V1\Admin\PedidoAdminController;
use App\Http\Controllers\Api\V1\Admin\ProductoManualAdminController;
use App\Http\Controllers\Api\V1\Admin\PromocionAdminController;
use App\Http\Controllers\Api\V1\Admin\PublicidadAdminController;
use App\Http\Controllers\Api\V1\Auth\AuthController as ApiAuthController;
use App\Http\Controllers\Api\V1\BusquedaController;
use App\Http\Controllers\Api\V1\CarritoController;
use App\Http\Controllers\Api\V1\Client\ClientController;
use App\Http\Controllers\Api\V1\ClienteChatController;
use App\Http\Controllers\Api\V1\CotizacionController;
use App\Http\Controllers\Api\V1\CotizacionInvitadoPublicController;
use App\Http\Controllers\Api\V1\DatoFacturacionController;
use App\Http\Controllers\Api\V1\DesarrolladorController;
use App\Http\Controllers\Api\V1\DireccionEnvioController;
use App\Http\Controllers\Api\V1\FavoritoController;
use App\Http\Controllers\Api\V1\MercadoPagoController;
use App\Http\Controllers\Api\V1\MetodoPagoController;
use App\Http\Controllers\Api\V1\PayPalController;
use App\Http\Controllers\Api\V1\PedidoController;
use App\Http\Controllers\Api\V1\ProductoController;
use App\Http\Controllers\Api\V1\PromocionController;
use App\Http\Controllers\Api\V1\PruebaPedidoController;
use App\Http\Controllers\Api\V1\PublicidadController;
use App\Http\Controllers\Api\V1\TarjetaGuardadaController;
use App\Http\Controllers\Api\V1\Ventas\VentasBusquedaController;
use App\Http\Controllers\Api\V1\Ventas\VentasAuthController;
use App\Http\Controllers\Api\V1\Ventas\VentasCalendarioTareaController;
use App\Http\Controllers\Api\V1\Ventas\VentasChatController;
use App\Http\Controllers\Api\V1\Ventas\VentasChatFichaController;
use App\Http\Controllers\Api\V1\Ventas\VentasCotizacionController;
use App\Http\Controllers\Api\V1\Ventas\VentasCorreoController;
use App\Http\Controllers\Api\V1\Ventas\VentasClientesController;
use App\Http\Controllers\Api\V1\Ventas\VentasPipelineController;
use App\Http\Controllers\Api\V1\Ventas\VentasReportesController;
use App\Http\Controllers\Spa\Auth\AuthController as SpaAuthController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::middleware('throttle:auth-credentials')->group(function () {
        // Admin auth (público - solo crea/admin login)
        Route::prefix('admin/auth')->group(function () {
            Route::post('/register', [AdminAuthController::class, 'register'])->name('admin.auth.register');
            Route::post('/token', [AdminAuthController::class, 'token'])->name('admin.auth.token');
        });

        // Ventas auth (público - solo vendedores)
        Route::prefix('ventas/auth')->group(function () {
            Route::post('/token', [VentasAuthController::class, 'token'])->name('ventas.auth.token');
        });

        // public routes here ------------------------
        // token
        Route::post('/auth/register', [ApiAuthController::class, 'register'])->name('auth.register')->middleware('guest');
        Route::post('/auth/token', [ApiAuthController::class, 'generateToken'])->name('auth.token')->middleware('guest');

        // cookie
        Route::prefix('spa')->group(function () {
            Route::post('/auth/register', [SpaAuthController::class, 'register'])->name('spa.auth.register')->middleware('guest');
            Route::post('/auth/login', [SpaAuthController::class, 'login'])->name('spa.auth.login')->middleware('guest');

        });
    });

    // Catálogo CVA (productos) - público
    Route::get('/productos/estado', [ProductoController::class, 'estado'])->name('productos.estado');
    Route::get('/productos/destacados', [ProductoController::class, 'destacados'])->name('productos.destacados');
    Route::get('/productos/ultimos', [ProductoController::class, 'ultimos'])->name('productos.ultimos');
    Route::get('/productos/por-claves', [ProductoController::class, 'porClaves'])->name('productos.porClaves');
    Route::get('/productos/recomendados', [ProductoController::class, 'recomendados'])->name('productos.recomendados');
    Route::get('/productos', [ProductoController::class, 'index'])->name('productos.index');
    Route::get('/productos/{clave}', [ProductoController::class, 'show'])->name('productos.show');
    Route::get('/catalogos/categorias-principales', [ProductoController::class, 'categoriasPrincipales'])->name('catalogos.categoriasPrincipales');
    Route::get('/catalogos/grupos', [ProductoController::class, 'grupos'])->name('catalogos.grupos');
    Route::get('/catalogos/subgrupos', [ProductoController::class, 'subgrupos'])->name('catalogos.subgrupos');
    Route::get('/catalogos/marcas', [ProductoController::class, 'marcas'])->name('catalogos.marcas');
    Route::get('/catalogos/filtros-dinamicos', [ProductoController::class, 'filtrosDinamicos'])->name('catalogos.filtrosDinamicos');

    // Búsqueda + registro de búsqueda/productos mostrados (público; limitar abuso por IP)
    Route::middleware('throttle:public-search')->group(function () {
        Route::get('/busqueda', [BusquedaController::class, 'index'])->name('busqueda.index');
    });
    Route::post('/busqueda/seleccion', [BusquedaController::class, 'registrarSeleccion'])
        ->middleware('throttle:anonymous-tracking')
        ->name('busqueda.seleccion');

    // Publicidad (carrusel) - público
    Route::get('/publicidad', [PublicidadController::class, 'index'])->name('publicidad.index');
    Route::get('/promociones/{slug}', [PromocionController::class, 'show'])
        ->where('slug', '[a-z0-9\-]+')
        ->name('promociones.show');
    Route::get('/desarrolladores', [DesarrolladorController::class, 'index'])->name('desarrolladores.index');

    // Cotización sin cuenta: envío por correo + registro para administración
    Route::post('/cotizaciones-invitado', [CotizacionInvitadoPublicController::class, 'store'])
        ->middleware('throttle:20,1')
        ->name('cotizaciones-invitado.store');

    Route::post('/mercadopago/webhook', [MercadoPagoController::class, 'webhook'])
        ->name('mercadopago.webhook');
    // -------------------------------------------------------------

    // protected routes here
    Route::middleware('auth:sanctum')->group(function () {
        // API Routes---------------------------
        Route::get('/auth/profile', [ApiAuthController::class, 'profile'])->middleware(['permission:view profile'])->name('auth.profile');

        Route::post('/auth/revoke-tokens', [ApiAuthController::class, 'revokeTokens'])->name('auth.revoke.tokens');

        Route::put('/auth/profile/update', [ApiAuthController::class, 'updateProfile'])->middleware(['permission:edit profile'])->name('auth.profile.update');

        Route::put('/auth/password', [ApiAuthController::class, 'changePassword'])->middleware(['permission:edit profile'])->name('auth.password.update');

        // Ventas (vendedores): calendario / pendientes
        Route::middleware('role:seller')->prefix('ventas')->name('ventas.')->group(function () {
            Route::get('/calendario/tareas', [VentasCalendarioTareaController::class, 'index'])->name('calendario.tareas.index');
            Route::post('/calendario/tareas', [VentasCalendarioTareaController::class, 'store'])->name('calendario.tareas.store');
            Route::put('/calendario/tareas/{id}', [VentasCalendarioTareaController::class, 'update'])->name('calendario.tareas.update');
            Route::delete('/calendario/tareas/{id}', [VentasCalendarioTareaController::class, 'destroy'])->name('calendario.tareas.destroy');

            Route::get('/cotizaciones/reglas-precio', [VentasCotizacionController::class, 'reglasPrecio'])->name('cotizaciones.reglas-precio');
            Route::get('/reportes/resumen', [VentasReportesController::class, 'resumen'])->name('reportes.resumen');
            Route::get('/busqueda', [VentasBusquedaController::class, 'index'])->name('busqueda.index');
            Route::get('/pipeline/resumen', [VentasPipelineController::class, 'resumen'])->name('pipeline.resumen');
            Route::get('/pipeline', [VentasPipelineController::class, 'index'])->name('pipeline.index');
            Route::get('/pipeline/{id}', [VentasPipelineController::class, 'show'])->name('pipeline.show');
            Route::put('/pipeline/{id}', [VentasPipelineController::class, 'update'])->name('pipeline.update');
            Route::get('/clientes/crm', [VentasClientesController::class, 'indexCrm'])->name('clientes.crm.index');
            Route::get('/clientes/tienda', [VentasClientesController::class, 'indexTienda'])->name('clientes.tienda.index');
            Route::get('/clientes/crm/cotizaciones', [VentasClientesController::class, 'indexCrmCotizaciones'])->name('clientes.crm.cotizaciones.index');
            Route::get('/clientes/crm/cotizaciones/{id}', [VentasClientesController::class, 'showCrmCotizacion'])->name('clientes.crm.cotizaciones.show');
            Route::get('/cotizaciones/clientes', [VentasCotizacionController::class, 'searchClientes'])->name('cotizaciones.clientes');
            Route::get('/cotizaciones', [VentasCotizacionController::class, 'index'])->name('cotizaciones.index');
            Route::post('/cotizaciones', [VentasCotizacionController::class, 'store'])->name('cotizaciones.store');
            Route::put('/cotizaciones/{id}', [VentasCotizacionController::class, 'update'])->name('cotizaciones.update');
            Route::delete('/cotizaciones/{id}', [VentasCotizacionController::class, 'destroy'])->name('cotizaciones.destroy');

            Route::get('/correos/historial', [VentasCorreoController::class, 'indexHistorial'])->name('correos.historial.index');
            Route::get('/correos/historial/{id}', [VentasCorreoController::class, 'showHistorial'])->name('correos.historial.show');
            Route::delete('/correos/historial/{id}', [VentasCorreoController::class, 'destroyHistorial'])->name('correos.historial.destroy');
            Route::get('/correos/grupos', [VentasCorreoController::class, 'indexGrupos'])->name('correos.grupos.index');
            Route::post('/correos/grupos', [VentasCorreoController::class, 'storeGrupo'])->name('correos.grupos.store');
            Route::put('/correos/grupos/{id}', [VentasCorreoController::class, 'updateGrupo'])->name('correos.grupos.update');
            Route::delete('/correos/grupos/{id}', [VentasCorreoController::class, 'destroyGrupo'])->name('correos.grupos.destroy');
            Route::get('/correos/destinatarios', [VentasCorreoController::class, 'indexDestinatarios'])->name('correos.destinatarios.index');
            Route::post('/correos/destinatarios', [VentasCorreoController::class, 'storeDestinatario'])->name('correos.destinatarios.store');
            Route::delete('/correos/destinatarios/{id}', [VentasCorreoController::class, 'destroyDestinatario'])->name('correos.destinatarios.destroy');
            Route::post('/correos/enviar', [VentasCorreoController::class, 'send'])
                ->middleware('throttle:20,1')
                ->name('correos.enviar');

            Route::get('/chat/clientes', [VentasChatController::class, 'indexClientes'])->name('chat.clientes.index');
            Route::get('/chat/clientes/{userId}', [VentasChatController::class, 'show'])->name('chat.clientes.show');
            Route::get('/chat/clientes/{userId}/ficha', [VentasChatFichaController::class, 'showCliente'])->name('chat.clientes.ficha.cliente');
            Route::get('/chat/clientes/{userId}/comentarios', [VentasChatFichaController::class, 'indexComentarios'])->name('chat.clientes.comentarios.index');
            Route::post('/chat/clientes/{userId}/comentarios', [VentasChatFichaController::class, 'storeComentario'])->name('chat.clientes.comentarios.store');
            Route::get('/chat/clientes/{userId}/pedidos', [VentasChatFichaController::class, 'indexPedidos'])->name('chat.clientes.pedidos.index');
            Route::get('/chat/clientes/{userId}/pedidos/{pedidoId}', [VentasChatFichaController::class, 'showPedido'])->name('chat.clientes.pedidos.show');
            Route::get('/chat/clientes/{userId}/pedidos/{pedidoId}/pdf', [VentasChatFichaController::class, 'downloadPedidoPdf'])->name('chat.clientes.pedidos.pdf');
            Route::get('/chat/clientes/{userId}/cotizaciones/tienda/{id}/pdf', [VentasChatFichaController::class, 'downloadCotizacionTiendaPdf'])->name('chat.clientes.cotizaciones.tienda.pdf');
            Route::get('/chat/clientes/{userId}/cotizaciones/{tipo}/{id}', [VentasChatFichaController::class, 'showCotizacion'])->name('chat.clientes.cotizaciones.show');
            Route::get('/chat/clientes/{userId}/cotizaciones', [VentasChatFichaController::class, 'indexCotizaciones'])->name('chat.clientes.cotizaciones.index');
            Route::post('/chat/clientes/{userId}/mensajes', [VentasChatController::class, 'store'])->name('chat.clientes.mensajes.store');
            Route::put('/chat/mensajes/{id}', [VentasChatController::class, 'update'])->name('chat.mensajes.update');
            Route::delete('/chat/mensajes/{id}', [VentasChatController::class, 'destroy'])->name('chat.mensajes.destroy');
        });

        // SPA Routes - COOKIES ----------------------
        Route::prefix('spa')->group(function () {

            Route::post('/auth/logout', [SpaAuthController::class, 'logout'])->name('spa.auth.logout');

            Route::put('/auth/profile/update', [SpaAuthController::class, 'updateProfile'])->middleware(['permission:edit profile'])->name('spa.auth.profile.update');
        });

        Route::middleware('role:customer')->group(function () {
            // GENERAL ROUTES FOR AUTHENTICATED USERS HERE --------------------------
            Route::post('/user/client/register', [ClientController::class, 'registerClientByAuthUser'])->name('user.client.register');
            Route::get('/user/client/my', [ClientController::class, 'getClientAuth'])->name('user.client.my');
            Route::put('/user/client/update/my', [ClientController::class, 'update'])->name('user.client.update.my');

            Route::get('/pedidos', [PedidoController::class, 'index'])->middleware(['permission:view orders'])->name('pedidos.index');
            Route::get('/pedidos/papelera', [PedidoController::class, 'papelera'])->middleware(['permission:view orders'])->name('pedidos.papelera');
            Route::get('/pedidos/{id}', [PedidoController::class, 'show'])->middleware(['permission:view orders'])->name('pedidos.show');
            Route::get('/pedidos/{id}/pdf', [PedidoController::class, 'downloadPdf'])->middleware(['permission:view orders'])->name('pedidos.pdf');
            Route::delete('/pedidos/{id}', [PedidoController::class, 'destroy'])->middleware(['permission:view orders'])->name('pedidos.destroy');
            Route::post('/pedidos/{id}/restore', [PedidoController::class, 'restore'])->middleware(['permission:view orders'])->name('pedidos.restore');

            Route::post('/prueba-pedido', [PruebaPedidoController::class, 'store'])->middleware(['permission:view orders'])->name('prueba.pedido.store');

            Route::get('/carrito', [CarritoController::class, 'index'])->name('carrito.index');
            Route::post('/carrito', [CarritoController::class, 'store'])->name('carrito.store');
            Route::post('/carrito/sync', [CarritoController::class, 'sync'])->name('carrito.sync');
            Route::delete('/carrito/items/{clave}', [CarritoController::class, 'destroy'])->name('carrito.destroy');
            Route::post('/carrito/cotizar-envio', [CarritoController::class, 'cotizarEnvio'])->name('carrito.cotizar-envio');
            Route::post('/carrito/checkout', [CarritoController::class, 'checkout'])->name('carrito.checkout');

            Route::post('/paypal/orders', [PayPalController::class, 'createOrder'])->name('paypal.orders.create');
            Route::post('/paypal/orders/capture', [PayPalController::class, 'capture'])->name('paypal.orders.capture');

            Route::post('/mercadopago/preferences', [MercadoPagoController::class, 'createPreference'])->name('mercadopago.preferences.create');
            Route::post('/mercadopago/payments/confirm', [MercadoPagoController::class, 'confirm'])->name('mercadopago.payments.confirm');
            Route::get('/metodos-pago', [MetodoPagoController::class, 'index'])->name('metodos-pago.index');

            Route::get('/favoritos', [FavoritoController::class, 'index'])->name('favoritos.index');
            Route::post('/favoritos', [FavoritoController::class, 'store'])->name('favoritos.store');
            Route::delete('/favoritos/items/{clave}', [FavoritoController::class, 'destroy'])->name('favoritos.destroy');

            Route::get('/direcciones-envio', [DireccionEnvioController::class, 'index'])->name('direcciones-envio.index');
            Route::post('/direcciones-envio', [DireccionEnvioController::class, 'store'])->name('direcciones-envio.store');
            Route::put('/direcciones-envio/{id}', [DireccionEnvioController::class, 'update'])->name('direcciones-envio.update');
            Route::delete('/direcciones-envio/{id}', [DireccionEnvioController::class, 'destroy'])->name('direcciones-envio.destroy');

            Route::get('/datos-facturacion', [DatoFacturacionController::class, 'index'])->name('datos-facturacion.index');
            Route::post('/datos-facturacion', [DatoFacturacionController::class, 'store'])->name('datos-facturacion.store');
            Route::put('/datos-facturacion/{id}', [DatoFacturacionController::class, 'update'])->name('datos-facturacion.update');
            Route::delete('/datos-facturacion/{id}', [DatoFacturacionController::class, 'destroy'])->name('datos-facturacion.destroy');

            Route::get('/cotizaciones', [CotizacionController::class, 'index'])->name('cotizaciones.index');
            Route::post('/cotizaciones', [CotizacionController::class, 'store'])->name('cotizaciones.store');
            Route::get('/cotizaciones/papelera', [CotizacionController::class, 'papelera'])->name('cotizaciones.papelera');
            Route::get('/cotizaciones/{id}', [CotizacionController::class, 'show'])->name('cotizaciones.show');
            Route::get('/cotizaciones/{id}/pdf', [CotizacionController::class, 'downloadPdf'])->name('cotizaciones.pdf');
            Route::put('/cotizaciones/{id}', [CotizacionController::class, 'update'])->name('cotizaciones.update');
            Route::delete('/cotizaciones/{id}', [CotizacionController::class, 'destroy'])->name('cotizaciones.destroy');
            Route::post('/cotizaciones/{id}/restore', [CotizacionController::class, 'restore'])->name('cotizaciones.restore');

            Route::get('/tarjetas-guardadas', [TarjetaGuardadaController::class, 'index'])->name('tarjetas-guardadas.index');
            Route::post('/tarjetas-guardadas', [TarjetaGuardadaController::class, 'store'])->name('tarjetas-guardadas.store');
            Route::put('/tarjetas-guardadas/{id}', [TarjetaGuardadaController::class, 'update'])->name('tarjetas-guardadas.update');
            Route::delete('/tarjetas-guardadas/{id}', [TarjetaGuardadaController::class, 'destroy'])->name('tarjetas-guardadas.destroy');

            Route::get('/chat-mensajes', [ClienteChatController::class, 'index'])->name('chat.mensajes.index');
            Route::post('/chat-mensajes', [ClienteChatController::class, 'store'])->name('chat.mensajes.store');
            Route::put('/chat-mensajes/{id}', [ClienteChatController::class, 'update'])->name('chat.mensajes.update');
            Route::delete('/chat-mensajes/{id}', [ClienteChatController::class, 'destroy'])->name('chat.mensajes.destroy');
        });

        // Admin: lecturas y chat compartidos con vendedores; gestión sensible solo administrador
        Route::prefix('admin')->name('admin.')->group(function () {
            Route::middleware('role:admin|seller')->group(function () {
                Route::get('/stats/categorias-mas-vistas', [AdminStatsController::class, 'categoriasMasVistas'])->name('stats.categorias');
                Route::get('/stats/clientes-por-mes', [AdminStatsController::class, 'clientesPorMes'])->name('stats.clientes');
                Route::get('/stats/actividad-usuarios', [AdminStatsController::class, 'actividadUsuarios'])->name('stats.actividad');
                Route::get('/stats/actividad-eventos', [AdminStatsController::class, 'actividadEventos'])->name('stats.actividad.eventos');
                Route::get('/stats/catalogo-resumen', [AdminStatsController::class, 'catalogoResumen'])->name('stats.catalogo.resumen');

                Route::get('/publicidad', [PublicidadAdminController::class, 'index'])->name('publicidad.admin.index');

                Route::get('/promociones', [PromocionAdminController::class, 'index'])->name('promociones.admin.index');
                Route::get('/promociones/{id}', [PromocionAdminController::class, 'show'])->name('promociones.admin.show');

                Route::get('/desarrolladores', [DesarrolladorAdminController::class, 'index'])->name('desarrolladores.admin.index');

                Route::get('/productos-manuales', [ProductoManualAdminController::class, 'index'])->name('productos-manuales.index');
                Route::get('/productos-manuales/grupos', [ProductoManualAdminController::class, 'gruposDistintos'])->name('productos-manuales.grupos');
                Route::get('/productos-manuales/marcas', [ProductoManualAdminController::class, 'marcasDistintas'])->name('productos-manuales.marcas');
                Route::get('/productos-manuales/{id}', [ProductoManualAdminController::class, 'show'])->name('productos-manuales.show');

                Route::get('/pedidos', [PedidoAdminController::class, 'index'])->name('pedidos.admin.index');
                Route::get('/pedidos/{id}/pdf', [PedidoAdminController::class, 'downloadPdf'])->name('pedidos.admin.pdf');
                Route::get('/pedidos/{id}', [PedidoAdminController::class, 'show'])->name('pedidos.admin.show');

                Route::get('/margen-venta', [AdminMargenVentaController::class, 'show'])->name('margen-venta.show');
                Route::get('/metodos-pago', [AdminMetodoPagoController::class, 'index'])->name('metodos-pago.admin.index');

                Route::get('/cotizaciones-invitado/emails', [AdminCotizacionInvitadoController::class, 'emailsDistinct'])->name('cotizaciones-invitado.admin.emails');
                Route::get('/cotizaciones-invitado', [AdminCotizacionInvitadoController::class, 'index'])->name('cotizaciones-invitado.admin.index');
                Route::get('/cotizaciones-invitado/{id}', [AdminCotizacionInvitadoController::class, 'show'])->name('cotizaciones-invitado.admin.show');
                Route::get('/cotizaciones-invitado/{id}/pdf', [AdminCotizacionInvitadoController::class, 'downloadPdf'])->name('cotizaciones-invitado.admin.pdf');

                Route::get('/chat/clientes', [AdminChatController::class, 'indexClientes'])->name('chat.clientes.index');
                Route::get('/chat/clientes/{userId}', [AdminChatController::class, 'show'])->name('chat.clientes.show');
                Route::post('/chat/clientes/{userId}/mensajes', [AdminChatController::class, 'store'])->name('chat.clientes.mensajes.store');
                Route::put('/chat/mensajes/{id}', [AdminChatController::class, 'update'])->name('chat.mensajes.update');
                Route::delete('/chat/mensajes/{id}', [AdminChatController::class, 'destroy'])->name('chat.mensajes.destroy');
            });

            Route::middleware('role:admin')->group(function () {
                Route::get('/tipos-usuario', [ManagerUserController::class, 'getTypesUser'])->name('tipos-usuario');
                Route::get('/permisos', [ManagerUserController::class, 'getPermissions'])->name('permisos');

                Route::get('/usuarios', [ManagerUserController::class, 'index'])->name('usuarios.index');
                Route::post('/usuarios', [ManagerUserController::class, 'store'])->name('usuarios.store');
                Route::put('/usuarios/{usuarioId}', [ManagerUserController::class, 'update'])->name('usuarios.update');
                Route::delete('/usuarios/{usuarioId}', [ManagerUserController::class, 'destroy'])->name('usuarios.destroy');
                Route::put('/usuarios/{usuarioId}/rol', [ManagerUserController::class, 'setRole'])->name('usuarios.rol');
                Route::delete('/usuarios/{usuarioId}/rol', [ManagerUserController::class, 'removeRole'])->name('usuarios.rol.destroy');
                Route::put('/usuarios/{usuarioId}/password', [ManagerUserController::class, 'resetPassword'])->name('usuarios.password');
                Route::post('/usuarios/{usuarioId}/permisos', [ManagerUserController::class, 'grantPermission'])->name('usuarios.permisos.grant');
                Route::post('/usuarios/{usuarioId}/permisos/revocar', [ManagerUserController::class, 'revokePermission'])->name('usuarios.permisos.revoke');

                Route::patch('/publicidad/carrusel', [PublicidadAdminController::class, 'updateCarrusel'])->name('publicidad.admin.carrusel');
                Route::post('/publicidad', [PublicidadAdminController::class, 'store'])->name('publicidad.admin.store');
                Route::delete('/publicidad/{id}', [PublicidadAdminController::class, 'destroy'])->name('publicidad.admin.destroy');

                Route::post('/promociones', [PromocionAdminController::class, 'store'])->name('promociones.admin.store');
                Route::put('/promociones/{id}', [PromocionAdminController::class, 'update'])->name('promociones.admin.update');
                Route::delete('/promociones/{id}', [PromocionAdminController::class, 'destroy'])->name('promociones.admin.destroy');
                Route::post('/promociones/{id}/items', [PromocionAdminController::class, 'agregarItem'])->name('promociones.admin.items.add');
                Route::post('/promociones/{id}/quitar-item', [PromocionAdminController::class, 'quitarItem'])->name('promociones.admin.items.remove');
                Route::post('/desarrolladores', [DesarrolladorAdminController::class, 'store'])->name('desarrolladores.admin.store');
                Route::put('/desarrolladores/{id}', [DesarrolladorAdminController::class, 'update'])->name('desarrolladores.admin.update');
                Route::delete('/desarrolladores/{id}', [DesarrolladorAdminController::class, 'destroy'])->name('desarrolladores.admin.destroy');

                Route::post('/productos-manuales', [ProductoManualAdminController::class, 'store'])->name('productos-manuales.store');
                Route::put('/productos-manuales/{id}', [ProductoManualAdminController::class, 'update'])->name('productos-manuales.update');
                Route::delete('/productos-manuales/{id}', [ProductoManualAdminController::class, 'destroy'])->name('productos-manuales.destroy');
                Route::post('/productos-manuales/{id}/anular', [ProductoManualAdminController::class, 'toggleAnulado'])->name('productos-manuales.toggle-anulado');

                Route::patch('/pedidos/{id}/estatus', [PedidoAdminController::class, 'updateEstatusPedido'])->name('pedidos.admin.estatus');

                Route::put('/margen-venta', [AdminMargenVentaController::class, 'update'])->name('margen-venta.update');
                Route::post('/margen-venta/reset', [AdminMargenVentaController::class, 'reset'])->name('margen-venta.reset');
                Route::put('/metodos-pago/{codigo}', [AdminMetodoPagoController::class, 'update'])->name('metodos-pago.admin.update');

                Route::get('/backup/preview-export', [AdminBackupController::class, 'previewExport'])->name('backup.preview');
                Route::post('/backup/export', [AdminBackupController::class, 'export'])->name('backup.export');
                Route::post('/backup/import', [AdminBackupController::class, 'import'])->name('backup.import');
            });
        });

    });
});
