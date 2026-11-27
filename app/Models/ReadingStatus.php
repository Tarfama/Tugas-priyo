<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReadingStatus extends Model
{
    protected $table = 'reading_status';
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'book_id',
        'title',
        'cover',
        'status',
        'updated_at',
    ];

    protected function casts(): array
    {
        return [
            'book_id' => 'integer',
            'updated_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
