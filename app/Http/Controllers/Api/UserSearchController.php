<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class UserSearchController extends Controller
{
    public function __invoke(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        if (strlen($q) < 2) {
            return response()->json([]);
        }

        return User::query()
            ->where('id', '!=', $request->user()->id)
            ->where(function ($query) use ($q) {
                $query->where('name', 'like', '%'.$q.'%')
                    ->orWhere('email', 'like', '%'.$q.'%');
            })
            ->orderBy('name')
            ->limit(25)
            ->get(['id', 'name', 'email', 'avatar_path']);
    }
}
