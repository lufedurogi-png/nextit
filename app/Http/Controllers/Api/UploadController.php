<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class UploadController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', 'max:12288'],
        ]);

        $path = $request->file('file')->store('uploads', 'public');
        $url = Storage::disk('public')->url($path);

        return response()->json([
            'path' => $path,
            'url' => $url,
        ], 201);
    }
}
