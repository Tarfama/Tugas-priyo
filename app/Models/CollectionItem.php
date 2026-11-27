<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CollectionItem extends Model
{
    public $timestamps = false;
    public $incrementing = false;

    protected $fillable = [
        'collection_id',
        'book_id',
        'title',
        'cover',
        'added_at',
    ];

    protected function casts(): array
    {
        return [
            'collection_id' => 'integer',
            'book_id' => 'integer',
            'added_at' => 'datetime',
        ];
    }

    public function collection(): BelongsTo
    {
        return $this->belongsTo(Collection::class);
    }
}
