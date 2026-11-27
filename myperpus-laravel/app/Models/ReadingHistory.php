<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReadingHistory extends Model
{
    protected $table = 'reading_history';
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'book_id',
        'title',
        'cover',
        'authors',
        'last_read_at',
        'read_count',
    ];

    protected function casts(): array
    {
        return [
            'book_id' => 'integer',
            'read_count' => 'integer',
            'last_read_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
