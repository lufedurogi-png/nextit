<?php

use App\Http\Controllers\Api\AdminBackupController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AdminFranchiseCatalogController;
use App\Http\Controllers\Api\AdminMetodoPagoController;
use App\Http\Controllers\Api\AdminPlanProController;
use App\Http\Controllers\Api\AdminPlanProIndefiniteController;
use App\Http\Controllers\Api\AdminPlanPromotionalFeedbackController;
use App\Http\Controllers\Api\AdminPlanRevenueController;
use App\Http\Controllers\Api\AdminScanUsageController;
use App\Http\Controllers\Api\AdminStatsController;
use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\CollectionController;
use App\Http\Controllers\Api\CollectionItemController;
use App\Http\Controllers\Api\CollectionScanController;
use App\Http\Controllers\Api\CollectorGroupController;
use App\Http\Controllers\Api\FeedPostController;
use App\Http\Controllers\Api\FranchiseController;
use App\Http\Controllers\Api\FriendshipController;
use App\Http\Controllers\Api\GoogleAuthController;
use App\Http\Controllers\Api\ListingController;
use App\Http\Controllers\Api\MetodoPagoController;
use App\Http\Controllers\Api\PlanMercadoPagoController;
use App\Http\Controllers\Api\PlanPayPalController;
use App\Http\Controllers\Api\PlanPromocionalController;
use App\Http\Controllers\Api\PlanPromotionalFeedbackController;
use App\Http\Controllers\Api\PlanSubscriptionController;
use App\Http\Controllers\Api\PlanTarjetaController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\SocialController;
use App\Http\Controllers\Api\StoryController;
use App\Http\Controllers\Api\UploadController;
use App\Http\Controllers\Api\UserSearchController;
use Illuminate\Support\Facades\Route;

Route::get('/plan/catalog', [PlanSubscriptionController::class, 'catalog']);
Route::post('/mercadopago/plan/webhook', [PlanMercadoPagoController::class, 'webhook']);

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/google/register', [GoogleAuthController::class, 'register']);
Route::post('/auth/google/login', [GoogleAuthController::class, 'login']);
Route::post('/auth/admin-login', [AuthController::class, 'adminLogin']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::get('/admin/home', [AdminController::class, 'home'])
        ->middleware('admin.role');

    Route::middleware('admin.role')->prefix('admin')->group(function () {
        Route::get('/stats/actividad-usuarios', [AdminStatsController::class, 'actividadUsuarios']);
        Route::get('/stats/actividad-eventos', [AdminStatsController::class, 'actividadEventos']);

        Route::get('/tipos-usuario', [AdminUserController::class, 'getTypesUser']);
        Route::get('/permisos', [AdminUserController::class, 'getPermissions']);
        Route::get('/usuarios', [AdminUserController::class, 'index']);
        Route::post('/usuarios', [AdminUserController::class, 'store']);
        Route::put('/usuarios/{user}', [AdminUserController::class, 'update']);
        Route::delete('/usuarios/{user}', [AdminUserController::class, 'destroy']);
        Route::put('/usuarios/{user}/rol', [AdminUserController::class, 'setRole']);
        Route::delete('/usuarios/{user}/rol', [AdminUserController::class, 'removeRole']);
        Route::put('/usuarios/{user}/password', [AdminUserController::class, 'resetPassword']);
        Route::post('/usuarios/{user}/permisos', [AdminUserController::class, 'grantPermission']);
        Route::post('/usuarios/{user}/permisos/revocar', [AdminUserController::class, 'revokePermission']);

        Route::get('/backup/preview-export', [AdminBackupController::class, 'previewExport']);
        Route::post('/backup/export', [AdminBackupController::class, 'export']);
        Route::post('/backup/import', [AdminBackupController::class, 'import']);

        Route::post('/catalogo-franquicias/export', [AdminFranchiseCatalogController::class, 'export']);
        Route::post('/catalogo-franquicias/import', [AdminFranchiseCatalogController::class, 'import']);
        Route::patch('/catalogo-franquicias/franquicias/{franchise}', [AdminFranchiseCatalogController::class, 'updateFranchise']);
        Route::delete('/catalogo-franquicias/franquicias/{franchise}', [AdminFranchiseCatalogController::class, 'destroyFranchise']);

        Route::get('/metodos-pago', [AdminMetodoPagoController::class, 'index']);
        Route::put('/metodos-pago/{codigo}', [AdminMetodoPagoController::class, 'update']);

        Route::get('/plan-pro', [AdminPlanProController::class, 'show']);
        Route::put('/plan-pro', [AdminPlanProController::class, 'update']);
        Route::get('/plan-pro/usuarios-activos', [AdminPlanProController::class, 'usersWithActivePlan']);

        Route::get('/plan-pagos/resumen-mes', [AdminPlanRevenueController::class, 'currentMonth']);
        Route::get('/plan-pagos/informes', [AdminPlanRevenueController::class, 'reportsIndex']);

        Route::get('/plan-promo/comentarios', [AdminPlanPromotionalFeedbackController::class, 'index']);

        Route::get('/plan-pro/indefinidos/buscar', [AdminPlanProIndefiniteController::class, 'search']);
        Route::get('/plan-pro/indefinidos', [AdminPlanProIndefiniteController::class, 'indefiniteList']);
        Route::post('/plan-pro/usuarios/{user}/indefinido', [AdminPlanProIndefiniteController::class, 'grant'])->whereNumber('user');
        Route::post('/plan-pro/usuarios/{user}/indefinido/pausar', [AdminPlanProIndefiniteController::class, 'pause'])->whereNumber('user');
        Route::post('/plan-pro/usuarios/{user}/indefinido/reanudar', [AdminPlanProIndefiniteController::class, 'resume'])->whereNumber('user');
        Route::post('/plan-pro/usuarios/{user}/indefinido/quitar', [AdminPlanProIndefiniteController::class, 'remove'])->whereNumber('user');

        Route::get('/scan-usage/overview', [AdminScanUsageController::class, 'overview']);
        Route::get('/scan-usage/history', [AdminScanUsageController::class, 'yearlyHistory']);
        Route::get('/scan-usage/users', [AdminScanUsageController::class, 'usersMonthly']);
        Route::patch('/scan-usage/users/{user}/scanner', [AdminScanUsageController::class, 'setUserScannerState']);
    });

    Route::get('/metodos-pago', [MetodoPagoController::class, 'index']);
    Route::get('/plan/subscription', [PlanSubscriptionController::class, 'subscription']);
    Route::post('/plan/subscription/cancel', [PlanSubscriptionController::class, 'cancel']);
    Route::post('/plan/subscription/resume', [PlanSubscriptionController::class, 'resume']);
    Route::post('/plan/mercadopago/preferences', [PlanMercadoPagoController::class, 'createPreference']);
    Route::post('/plan/mercadopago/payments/confirm', [PlanMercadoPagoController::class, 'confirm']);
    Route::post('/plan/paypal/orders', [PlanPayPalController::class, 'createOrder']);
    Route::post('/plan/paypal/orders/capture', [PlanPayPalController::class, 'capture']);
    Route::post('/plan/tarjeta/checkout', [PlanTarjetaController::class, 'checkout']);
    Route::post('/plan/promocional/checkout', [PlanPromocionalController::class, 'checkout']);
    Route::post('/plan/promocional/feedback', [PlanPromotionalFeedbackController::class, 'store']);

    Route::get('/feed', [FeedPostController::class, 'index']);
    Route::get('/feed/tab-preference', [FeedPostController::class, 'getTabPreference']);
    Route::put('/feed/tab-preference', [FeedPostController::class, 'setTabPreference']);
    Route::get('/feed/highlights', [FeedPostController::class, 'highlights']);
    Route::get('/stories', [StoryController::class, 'index']);
    Route::post('/stories', [StoryController::class, 'store']);
    Route::get('/stories/{story}', [StoryController::class, 'show'])->whereNumber('story');
    Route::patch('/stories/{story}', [StoryController::class, 'update'])->whereNumber('story');
    Route::delete('/stories/{story}', [StoryController::class, 'destroy'])->whereNumber('story');
    Route::get('/feed/saved/list', [SocialController::class, 'savedPosts']);
    Route::post('/feed', [FeedPostController::class, 'store']);
    Route::patch('/feed/{userFeedPost}', [FeedPostController::class, 'update'])->whereNumber('userFeedPost');
    Route::delete('/feed/{userFeedPost}', [FeedPostController::class, 'destroy'])->whereNumber('userFeedPost');
    Route::post('/feed/{userFeedPost}/react', [FeedPostController::class, 'react'])->whereNumber('userFeedPost');
    Route::post('/feed/{userFeedPost}/comments', [SocialController::class, 'addComment'])->whereNumber('userFeedPost');
    Route::patch('/feed/comments/{comment}', [SocialController::class, 'updateComment'])->whereNumber('comment');
    Route::delete('/feed/comments/{comment}', [SocialController::class, 'destroyComment'])->whereNumber('comment');
    Route::post('/feed/comments/{comment}/react', [SocialController::class, 'reactComment'])->whereNumber('comment');
    Route::post('/feed/{userFeedPost}/share', [SocialController::class, 'sharePost'])->whereNumber('userFeedPost');
    Route::post('/feed/{userFeedPost}/save', [SocialController::class, 'savePost'])->whereNumber('userFeedPost');
    Route::delete('/feed/{userFeedPost}/save', [SocialController::class, 'unsavePost'])->whereNumber('userFeedPost');
    Route::get('/social/discovery', [SocialController::class, 'discovery']);
    Route::get('/search/global', [SocialController::class, 'globalSearch']);
    Route::post('/users/{user}/follow', [SocialController::class, 'follow'])->whereNumber('user');
    Route::delete('/users/{user}/follow', [SocialController::class, 'unfollow'])->whereNumber('user');
    Route::get('/notifications', [SocialController::class, 'notifications']);
    Route::post('/notifications/read-all', [SocialController::class, 'markNotificationsRead']);
    Route::post('/notifications/{notification}/read', [SocialController::class, 'markNotificationRead'])->whereNumber('notification');

    Route::get('/users/search', UserSearchController::class);

    Route::patch('/profile', [ProfileController::class, 'update']);
    Route::get('/profile/{user}', [ProfileController::class, 'show'])->whereNumber('user');
    Route::get('/profile/{user}/posts', [ProfileController::class, 'feedPostsByUser'])->whereNumber('user');
    Route::post('/profile/media', [ProfileController::class, 'uploadMedia']);
    Route::get('/profile/posts', [ProfileController::class, 'feedPosts']);

    Route::post('/friendships/request/{user}', [FriendshipController::class, 'sendRequest'])->whereNumber('user');
    Route::post('/friendships/{friendship}/respond', [FriendshipController::class, 'respond'])->whereNumber('friendship');
    Route::get('/friendships/requests', [FriendshipController::class, 'myRequests']);
    Route::get('/friendships/users/{user}', [FriendshipController::class, 'friendsOfUser'])->whereNumber('user');
    Route::get('/friendships/status/{user}', [FriendshipController::class, 'statusWithUser'])->whereNumber('user');
    Route::delete('/friendships/users/{user}', [FriendshipController::class, 'removeFriendship'])->whereNumber('user');
    Route::post('/uploads', [UploadController::class, 'store']);

    Route::apiResource('collections', CollectionController::class);

    Route::get('/franchises', [FranchiseController::class, 'index']);
    Route::post('/collections/{collection}/scan', [CollectionScanController::class, 'scan']);

    Route::get('/collections/{collection}/items', [CollectionItemController::class, 'index']);
    Route::post('/collections/{collection}/items', [CollectionItemController::class, 'store']);
    Route::patch('/collections/{collection}/items/{item}', [CollectionItemController::class, 'update']);
    Route::delete('/collections/{collection}/items/{item}', [CollectionItemController::class, 'destroy']);

    Route::get('/groups', [CollectorGroupController::class, 'index']);
    Route::post('/groups', [CollectorGroupController::class, 'store']);
    Route::get('/groups/{collector_group}', [CollectorGroupController::class, 'show']);
    Route::patch('/groups/{collector_group}', [CollectorGroupController::class, 'update']);
    Route::delete('/groups/{collector_group}', [CollectorGroupController::class, 'destroy']);
    Route::post('/groups/{collector_group}/join', [CollectorGroupController::class, 'join']);
    Route::delete('/groups/{collector_group}/leave', [CollectorGroupController::class, 'leave']);
    Route::patch('/groups/{collector_group}/members/{member}', [CollectorGroupController::class, 'setMemberRole']);
    Route::delete('/groups/{collector_group}/members/{member}', [CollectorGroupController::class, 'removeMember']);
    Route::post('/groups/{collector_group}/posts', [CollectorGroupController::class, 'storePost']);
    Route::patch('/groups/{collector_group}/posts/{post}', [CollectorGroupController::class, 'updatePost']);
    Route::delete('/groups/{collector_group}/posts/{post}', [CollectorGroupController::class, 'destroyPost']);
    Route::post('/groups/{collector_group}/posts/{post}/comments', [CollectorGroupController::class, 'storeComment']);
    Route::post('/groups/{collector_group}/posts/{post}/react', [CollectorGroupController::class, 'reactPost']);
    Route::post('/groups/{collector_group}/posts/{post}/comments/{comment}/react', [CollectorGroupController::class, 'reactComment']);
    Route::patch('/groups/{collector_group}/posts/{post}/comments/{comment}', [CollectorGroupController::class, 'updateComment']);
    Route::delete('/groups/{collector_group}/posts/{post}/comments/{comment}', [CollectorGroupController::class, 'destroyComment']);

    Route::get('/listings', [ListingController::class, 'index']);
    Route::get('/listings/mine', [ListingController::class, 'mine']);
    Route::get('/listings/{listing}', [ListingController::class, 'show'])->whereNumber('listing');
    Route::post('/listings', [ListingController::class, 'store']);
    Route::patch('/listings/{listing}', [ListingController::class, 'update'])->whereNumber('listing');
    Route::delete('/listings/{listing}', [ListingController::class, 'destroy'])->whereNumber('listing');
    Route::get('/listings/{listing}/chats', [ChatController::class, 'listingChats'])->whereNumber('listing');
    Route::post('/listings/{listing}/contact', [ChatController::class, 'startForListing'])->whereNumber('listing');

    Route::get('/chats', [ChatController::class, 'index']);
    Route::post('/chats/direct', [ChatController::class, 'startDirect']);
    Route::get('/chats/{chat}/messages', [ChatController::class, 'messages']);
    Route::post('/chats/{chat}/messages', [ChatController::class, 'send']);
    Route::patch('/chats/{chat}/messages/{message}', [ChatController::class, 'updateMessage']);
    Route::delete('/chats/{chat}/messages/{message}', [ChatController::class, 'destroyMessage']);
    Route::delete('/chats/{chat}', [ChatController::class, 'destroy'])->whereNumber('chat');
});
