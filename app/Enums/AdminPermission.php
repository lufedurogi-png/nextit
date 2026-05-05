<?php

namespace App\Enums;

enum AdminPermission: string
{
    case VIEW_PRODUCTS = 'view products';
    case CREATE_PRODUCTS = 'create products';
    case EDIT_PRODUCTS = 'edit products';
    case DELETE_PRODUCTS = 'delete products';
    case VIEW_PROFILE = 'view profile';
    case EDIT_PROFILE = 'edit profile';
    case VIEW_ORDERS = 'view orders';
    case CREATE_ORDERS = 'create orders';
    case CANCEL_ORDERS = 'cancel orders';
    case VIEW_DASHBOARD = 'view dashboard';
    case MANAGE_USERS = 'manage users';

    public function label(): string
    {
        return match ($this) {
            self::VIEW_PRODUCTS => 'Ver productos',
            self::CREATE_PRODUCTS => 'Crear productos',
            self::EDIT_PRODUCTS => 'Editar productos',
            self::DELETE_PRODUCTS => 'Eliminar productos',
            self::VIEW_PROFILE => 'Ver perfil',
            self::EDIT_PROFILE => 'Editar perfil',
            self::VIEW_ORDERS => 'Ver órdenes',
            self::CREATE_ORDERS => 'Crear órdenes',
            self::CANCEL_ORDERS => 'Cancelar órdenes',
            self::VIEW_DASHBOARD => 'Ver panel',
            self::MANAGE_USERS => 'Gestionar usuarios',
        };
    }

    public function group(): string
    {
        return match ($this) {
            self::VIEW_PRODUCTS, self::CREATE_PRODUCTS, self::EDIT_PRODUCTS, self::DELETE_PRODUCTS => 'Productos',
            self::VIEW_PROFILE, self::EDIT_PROFILE => 'Perfil',
            self::VIEW_ORDERS, self::CREATE_ORDERS, self::CANCEL_ORDERS => 'Órdenes',
            self::VIEW_DASHBOARD, self::MANAGE_USERS => 'Administración',
        };
    }

    /**
     * Permisos base por rol en BD (`users.role`), alineado con Api-viejo / PermissionEnum::forRole.
     *
     * @return list<string>
     */
    public static function defaultValuesForDbRole(string $role): array
    {
        return match ($role) {
            'admin' => array_map(fn (self $c) => $c->value, self::cases()),
            'vendedor' => [
                self::VIEW_PRODUCTS->value,
                self::VIEW_PROFILE->value,
                self::EDIT_PROFILE->value,
                self::VIEW_ORDERS->value,
                self::CREATE_ORDERS->value,
            ],
            default => [
                self::VIEW_PRODUCTS->value,
                self::VIEW_PROFILE->value,
                self::EDIT_PROFILE->value,
                self::VIEW_ORDERS->value,
                self::CREATE_ORDERS->value,
            ],
        };
    }
}
