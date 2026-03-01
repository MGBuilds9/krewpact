'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface Tag {
  id: string
  name: string
  color: string
}

interface TagFilterBarProps {
  selectedTagIds: string[]
  onTagFilterChange: (tagIds: string[]) => void
}

export function TagFilterBar({ selectedTagIds, onTagFilterChange }: TagFilterBarProps) {
  const [tags, setTags] = useState<Tag[]>([])

  useEffect(() => {
    fetch('/api/crm/tags')
      .then(r => r.json())
      .then(res => setTags(res.data ?? []))
      .catch(() => {})
  }, [])

  function toggleTag(tagId: string) {
    if (selectedTagIds.includes(tagId)) {
      onTagFilterChange(selectedTagIds.filter(id => id !== tagId))
    } else {
      onTagFilterChange([...selectedTagIds, tagId])
    }
  }

  if (tags.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map(tag => {
        const isSelected = selectedTagIds.includes(tag.id)
        return (
          <button
            key={tag.id}
            onClick={() => toggleTag(tag.id)}
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-all border"
            style={
              isSelected
                ? { backgroundColor: tag.color, color: '#fff', borderColor: tag.color }
                : { backgroundColor: 'transparent', color: tag.color, borderColor: tag.color }
            }
          >
            {tag.name}
          </button>
        )
      })}

      {selectedTagIds.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground"
          onClick={() => onTagFilterChange([])}
        >
          Clear filters
        </Button>
      )}
    </div>
  )
}
