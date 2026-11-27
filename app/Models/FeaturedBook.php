<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FeaturedBook extends Model
{
    protected $primaryKey = 'book_id';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'book_id',
        'title',
        'cover',
        'authors',
        'note',
        'sort_order',
        'created_by',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'book_id' => 'integer',
            'sort_order' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
