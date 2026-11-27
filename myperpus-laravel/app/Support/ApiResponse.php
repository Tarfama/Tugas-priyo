<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

trait ApiResponse
{
    protected function success(string $message, mixed $data = null, int $status = 200): JsonResponse
    {
        $payload = [
            'success' => true,
            'message' => $message,
        ];

        if ($data !== null) {
            $payload['data'] = $data;
        }

        return response()->json($payload, $status);
    }

    protected function error(string $message, int $status = 400, mixed $errors = null): JsonResponse
    {
        $payload = [
            'success' => false,
            'message' => $message,
        ];

        if ($errors !== null) {
            $payload['errors'] = $errors;
        }

        return response()->json($payload, $status);
    }

    protected function parsePagination(Request $request, int $defaultLimit = 10, int $maxLimit = 50): array
    {
        $page  = max(1, (int) $request->query('page', 1));
        $limit = (int) $request->query('limit', $defaultLimit);

        if ($limit < 1) {
            $limit = $defaultLimit;
        }
        if ($limit > $maxLimit) {
            $limit = $maxLimit;
        }

        $offset = ($page - 1) * $limit;

        return [$page, $limit, $offset];
    }

    protected function paginated(string $message, mixed $items, int $total, int $page, int $limit, array $extra = []): JsonResponse
    {
        $totalPages = (int) max(1, ceil($total / $limit));

        return response()->json(array_merge([
            'success' => true,
            'message' => $message,
            'data'    => $items,
            'pagination' => [
                'page'       => $page,
                'limit'      => $limit,
                'total'      => $total,
                'totalPages' => $totalPages,
                'hasNext'    => $page < $totalPages,
                'hasPrev'    => $page > 1,
            ],
        ], $extra), 200);
    }
}
