<?php

namespace App\Services;

use App\Enums\AdminPermission;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AdminUserManagementService
{
    public function typesUser(): array
    {
        return [
            ['id' => 1, 'label' => 'Administrador'],
            ['id' => 2, 'label' => 'Cliente'],
            ['id' => 3, 'label' => 'Vendedor'],
        ];
    }

    public function permissionsCatalog(): array
    {
        return array_map(fn (AdminPermission $p) => [
            'value' => $p->value,
            'label' => $p->label(),
            'group' => $p->group(),
        ], AdminPermission::cases());
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listUsers(?string $search, ?string $roleFilter, ?string $permissionFilter): array
    {
        $query = User::query()->orderBy('id');

        if ($search !== null && $search !== '') {
            $term = '%'.addcslashes($search, '%_\\').'%';
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', $term)
                    ->orWhere('email', 'like', $term);
            });
        }

        $dbRole = $this->normalizeFilterRole($roleFilter);
        if ($dbRole !== null) {
            $query->where('role', $dbRole);
        }

        $users = $query->get();

        if ($permissionFilter !== null && $permissionFilter !== '') {
            $users = $users->filter(function (User $u) use ($permissionFilter) {
                return in_array($permissionFilter, $this->effectivePermissions($u), true);
            })->values();
        }

        return $users->map(fn (User $u) => $this->serializeUser($u))->all();
    }

    public function validateAdminPassword(string $password): void
    {
        $this->assertAdminPassword($password);
    }

    public function createUser(array $validated): User
    {
        $this->assertAdminPassword($validated['adminPassword']);

        return DB::transaction(function () use ($validated) {
            $role = $this->tipoToRole((int) $validated['type']);

            return User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => $validated['password'],
                'role' => $role,
                'extra_permissions' => [],
                'revoked_permissions' => [],
            ]);
        });
    }

    public function updateUser(User $target, array $validated): User
    {
        $this->assertAdminPassword($validated['adminPassword']);

        if (isset($validated['name'])) {
            $target->name = $validated['name'];
        }
        if (isset($validated['email'])) {
            $target->email = $validated['email'];
        }
        $target->save();

        return $target->fresh();
    }

    public function setRoleFromTipo(User $target, int $tipoUsuario): User
    {
        $newRole = $this->tipoToRole($tipoUsuario);

        if ($target->role === $newRole) {
            throw ValidationException::withMessages([
                'tipoUsuario' => ['El usuario ya tiene ese rol.'],
            ]);
        }

        if ($target->id === Auth::id() && $target->role === 'admin' && $newRole !== 'admin') {
            throw ValidationException::withMessages([
                'tipoUsuario' => ['No puedes quitarte tu propio rol de administrador.'],
            ]);
        }

        $this->ensureAnotherAdminExists($target, $newRole);

        $target->role = $newRole;
        $target->revoked_permissions = [];
        $target->save();

        return $target->fresh();
    }

    /**
     * Quita el rol indicado (estilo Spatie: admin / customer / seller) bajando a cliente si aplica.
     */
    public function removeLogicalRole(User $target, string $roleName): User
    {
        $current = $this->roleToLegacyRoleName($target->role);
        if ($current !== strtolower($roleName)) {
            throw ValidationException::withMessages([
                'role' => ['El usuario no tiene ese rol.'],
            ]);
        }

        if ($target->id === Auth::id() && $current === 'admin') {
            throw ValidationException::withMessages([
                'role' => ['No puedes quitarte tu propio rol de administrador.'],
            ]);
        }

        $this->ensureAnotherAdminExists($target, 'cliente');

        $target->role = 'cliente';
        $target->revoked_permissions = [];
        $target->save();

        return $target->fresh();
    }

    public function deleteUser(User $target): void
    {
        if ($target->id === Auth::id()) {
            throw ValidationException::withMessages([
                'general' => ['No puedes eliminarte a ti mismo.'],
            ]);
        }

        if ($target->role === 'admin' && $this->adminCount() <= 1) {
            throw ValidationException::withMessages([
                'general' => ['Debe existir al menos un administrador.'],
            ]);
        }

        $target->tokens()->delete();
        $target->delete();
    }

    public function resetPassword(User $target, string $password): void
    {
        $target->password = $password;
        $target->save();
        $target->tokens()->delete();
    }

    public function grantPermission(User $target, string $permission): User
    {
        if (! AdminPermission::tryFrom($permission)) {
            throw ValidationException::withMessages([
                'permission' => ['Permiso no válido.'],
            ]);
        }

        $defaults = AdminPermission::defaultValuesForDbRole($target->role);
        $extra = $this->extraPermissions($target);
        $revoked = $this->revokedPermissions($target);

        if (in_array($permission, $this->computeEffective($defaults, $extra, $revoked), true)) {
            throw ValidationException::withMessages([
                'permission' => ['El usuario ya tiene ese permiso.'],
            ]);
        }

        $newRevoked = array_values(array_diff($revoked, [$permission]));
        $newExtra = $extra;

        if (in_array($permission, $this->computeEffective($defaults, $newExtra, $newRevoked), true)) {
            $target->revoked_permissions = $newRevoked;
            $target->save();

            return $target->fresh();
        }

        $newExtra[] = $permission;
        $target->extra_permissions = array_values(array_unique($newExtra));
        $target->revoked_permissions = $newRevoked;
        $target->save();

        return $target->fresh();
    }

    public function revokePermission(User $target, string $permission): User
    {
        if (! AdminPermission::tryFrom($permission)) {
            throw ValidationException::withMessages([
                'permission' => ['Permiso no válido.'],
            ]);
        }

        $defaults = AdminPermission::defaultValuesForDbRole($target->role);
        $extra = $this->extraPermissions($target);
        $revoked = $this->revokedPermissions($target);

        if (! in_array($permission, $this->computeEffective($defaults, $extra, $revoked), true)) {
            throw ValidationException::withMessages([
                'permission' => ['El usuario no tiene ese permiso.'],
            ]);
        }

        $newExtra = array_values(array_filter($extra, fn (string $p) => $p !== $permission));
        $newRevoked = $revoked;

        if (in_array($permission, $this->computeEffective($defaults, $newExtra, $newRevoked), true)) {
            $newRevoked = array_values(array_unique([...$newRevoked, $permission]));
        }

        $target->extra_permissions = $newExtra;
        $target->revoked_permissions = $newRevoked;
        $target->save();

        return $target->fresh();
    }

    /**
     * @return array<string, mixed>
     */
    public function serializeUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'tipo' => $this->roleToTipo($user->role),
            'email_verified_at' => $user->email_verified_at?->toIso8601String(),
            'roles' => [$this->roleToLegacyRoleName($user->role)],
            'permissions' => $this->effectivePermissions($user),
        ];
    }

    public static function passwordRules(): array
    {
        return [
            'required',
            'string',
            'confirmed',
            Password::min(8)->letters()->mixedCase()->numbers()->symbols(),
        ];
    }

    public static function updateUserRules(User $target): array
    {
        return [
            'adminPassword' => ['required', 'string'],
            'name' => ['sometimes', 'string', 'max:230'],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users', 'email')->ignore($target->id)],
        ];
    }

    private function assertAdminPassword(string $password): void
    {
        $admin = Auth::user();
        if (! $admin instanceof User || $admin->role !== 'admin') {
            abort(403, 'No autorizado.');
        }

        if (! Hash::check($password, $admin->password)) {
            throw ValidationException::withMessages([
                'adminPassword' => ['Contraseña de confirmación incorrecta'],
            ]);
        }
    }

    private function adminCount(): int
    {
        return User::query()->where('role', 'admin')->count();
    }

    private function ensureAnotherAdminExists(User $target, string $newRole): void
    {
        if ($target->role !== 'admin' || $newRole === 'admin') {
            return;
        }

        $others = User::query()->where('role', 'admin')->where('id', '!=', $target->id)->count();
        if ($others < 1) {
            throw ValidationException::withMessages([
                'tipoUsuario' => ['Debe existir al menos otro administrador antes de cambiar este rol.'],
            ]);
        }
    }

    /**
     * Permisos efectivos (como Api-viejo con Spatie `getAllPermissions()`): (base del rol ∪ extras) sin revocados.
     *
     * @return list<string>
     */
    private function effectivePermissions(User $user): array
    {
        $defaults = AdminPermission::defaultValuesForDbRole($user->role);

        return $this->computeEffective($defaults, $this->extraPermissions($user), $this->revokedPermissions($user));
    }

    /**
     * @param  list<string>  $defaults
     * @param  list<string>  $extra
     * @param  list<string>  $revoked
     * @return list<string>
     */
    private function computeEffective(array $defaults, array $extra, array $revoked): array
    {
        $merged = array_unique(array_merge($defaults, $extra));
        $out = array_values(array_filter($merged, fn (string $p) => ! in_array($p, $revoked, true)));
        sort($out);

        return $out;
    }

    /**
     * @return list<string>
     */
    private function extraPermissions(User $user): array
    {
        $p = $user->extra_permissions;
        if (! is_array($p)) {
            return [];
        }

        return array_values(array_filter($p, fn ($v) => is_string($v)));
    }

    /**
     * @return list<string>
     */
    private function revokedPermissions(User $user): array
    {
        $p = $user->revoked_permissions;
        if (! is_array($p)) {
            return [];
        }

        return array_values(array_filter($p, fn ($v) => is_string($v)));
    }

    private function roleToTipo(string $role): int
    {
        return match ($role) {
            'admin' => 1,
            'vendedor' => 3,
            default => 2,
        };
    }

    private function tipoToRole(int $tipo): string
    {
        return match ($tipo) {
            1 => 'admin',
            3 => 'vendedor',
            default => 'cliente',
        };
    }

    private function roleToLegacyRoleName(string $role): string
    {
        return match ($role) {
            'admin' => 'admin',
            'vendedor' => 'seller',
            default => 'customer',
        };
    }

    private function normalizeFilterRole(?string $roleFilter): ?string
    {
        if ($roleFilter === null || $roleFilter === '') {
            return null;
        }

        $r = strtolower($roleFilter);

        return match ($r) {
            'admin' => 'admin',
            'customer', 'cliente' => 'cliente',
            'seller', 'vendedor' => 'vendedor',
            default => null,
        };
    }
}
