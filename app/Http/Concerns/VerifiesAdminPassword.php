<?php

namespace App\Http\Concerns;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

trait VerifiesAdminPassword
{
    protected function assertAdminPassword(Request $request): void
    {
        $request->validate([
            'admin_password' => 'required|string|max:255',
        ]);

        $user = $request->user();
        if (! $user || ! Hash::check($request->input('admin_password'), $user->password)) {
            throw ValidationException::withMessages([
                'admin_password' => ['La contraseña no coincide con la del administrador en sesión.'],
            ]);
        }
    }
}
