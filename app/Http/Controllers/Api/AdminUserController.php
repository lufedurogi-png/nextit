<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AdminUserManagementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminUserController extends Controller
{
    public function __construct(
        protected AdminUserManagementService $users
    ) {}

    public function getTypesUser(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->users->typesUser(),
        ]);
    }

    public function getPermissions(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->users->permissionsCatalog(),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $data = $this->users->listUsers(
            $request->query('search'),
            $request->query('role'),
            $request->query('permission')
        );

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:230'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'password' => AdminUserManagementService::passwordRules(),
            'type' => ['required', 'integer', Rule::in([1, 2, 3])],
            'adminPassword' => ['required', 'string'],
        ]);

        $user = $this->users->createUser($validated);

        return response()->json([
            'success' => true,
            'message' => 'Usuario registrado correctamente',
            'data' => $this->users->serializeUser($user),
        ], 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate(AdminUserManagementService::updateUserRules($user));

        $user = $this->users->updateUser($user, $validated);

        return response()->json([
            'success' => true,
            'message' => 'Usuario actualizado correctamente',
            'data' => $this->users->serializeUser($user),
        ]);
    }

    public function setRole(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'tipoUsuario' => ['required', 'integer', Rule::in([1, 2, 3])],
            'adminPassword' => ['required', 'string'],
        ]);

        $this->users->validateAdminPassword($validated['adminPassword']);

        $user = $this->users->setRoleFromTipo($user, (int) $validated['tipoUsuario']);

        return response()->json([
            'success' => true,
            'message' => 'Rol asignado correctamente',
            'data' => $this->users->serializeUser($user),
        ]);
    }

    public function removeRole(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'role' => ['required', 'string', Rule::in(['admin', 'customer', 'seller'])],
            'adminPassword' => ['required', 'string'],
        ]);

        $this->users->validateAdminPassword($validated['adminPassword']);

        $user = $this->users->removeLogicalRole($user, $validated['role']);

        return response()->json([
            'success' => true,
            'message' => 'Rol quitado correctamente',
            'data' => $this->users->serializeUser($user),
        ]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'adminPassword' => ['required', 'string'],
        ]);

        $this->users->validateAdminPassword($validated['adminPassword']);

        $this->users->deleteUser($user);

        return response()->json([
            'success' => true,
            'message' => 'Usuario eliminado correctamente',
        ]);
    }

    public function resetPassword(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'password' => AdminUserManagementService::passwordRules(),
            'adminPassword' => ['required', 'string'],
        ]);

        $this->users->validateAdminPassword($validated['adminPassword']);

        $this->users->resetPassword($user, $validated['password']);

        return response()->json([
            'success' => true,
            'message' => 'Contraseña actualizada correctamente',
        ]);
    }

    public function grantPermission(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'permission' => ['required', 'string'],
            'adminPassword' => ['required', 'string'],
        ]);

        $this->users->validateAdminPassword($validated['adminPassword']);

        $user = $this->users->grantPermission($user, $validated['permission']);

        return response()->json([
            'success' => true,
            'message' => 'Permiso concedido',
            'data' => $this->users->serializeUser($user),
        ]);
    }

    public function revokePermission(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'permission' => ['required', 'string'],
            'adminPassword' => ['required', 'string'],
        ]);

        $this->users->validateAdminPassword($validated['adminPassword']);

        $user = $this->users->revokePermission($user, $validated['permission']);

        return response()->json([
            'success' => true,
            'message' => 'Permiso revocado',
            'data' => $this->users->serializeUser($user),
        ]);
    }
}
