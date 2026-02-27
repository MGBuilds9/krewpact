'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { TagBadge } from './TagBadge'
import { Plus } from 'lucide-react'

interface Tag {
  id: string
  name: string
  color: string
}

interface TagSelectorProps {
  entityType: 'lead' | 'contact' | 'account' | 'opportunity'
  entityId: string
  existingTags: Tag[]
  onTagsChanged?: () => void
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#64748b', '#0f172a',
]

export function TagSelector({ entityType, entityId, existingTags, onTagsChanged }: TagSelectorProps) {
  const [appliedTags, setAppliedTags] = useState<Tag[]>(existingTags)
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[5])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/crm/tags')
      .then(r => r.json())
      .then(res => setAvailableTags(res.data ?? []))
      .catch(() => {})
  }, [])

  const appliedIds = new Set(appliedTags.map(t => t.id))
  const filteredTags = availableTags.filter(
    t => !appliedIds.has(t.id) && t.name.toLowerCase().includes(search.toLowerCase())
  )

  async function applyTag(tag: Tag) {
    setLoading(true)
    try {
      await fetch('/api/crm/entity-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_type: entityType, entity_id: entityId, tag_id: tag.id }),
      })
      setAppliedTags(prev => [...prev, tag])
      onTagsChanged?.()
    } finally {
      setLoading(false)
    }
  }

  async function removeTag(tagId: string) {
    try {
      await fetch(
        `/api/crm/entity-tags?entity_type=${entityType}&entity_id=${entityId}&tag_id=${tagId}`,
        { method: 'DELETE' }
      )
      setAppliedTags(prev => prev.filter(t => t.id !== tagId))
      onTagsChanged?.()
    } catch {}
  }

  async function createAndApplyTag() {
    if (!newTagName.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/crm/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
      })
      const tag: Tag = await res.json()
      setAvailableTags(prev => [...prev, tag])
      await applyTag(tag)
      setNewTagName('')
      setCreating(false)
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {appliedTags.map(tag => (
        <TagBadge key={tag.id} tag={tag} onRemove={removeTag} />
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
            <Plus className="h-3 w-3 mr-1" />
            Add tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-60 p-2" align="start">
          <Input
            placeholder="Search tags..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-7 text-xs mb-2"
          />

          <div className="max-h-40 overflow-y-auto space-y-0.5">
            {filteredTags.length === 0 && (
              <p className="text-xs text-muted-foreground px-2 py-1">No tags found</p>
            )}
            {filteredTags.map(tag => (
              <button
                key={tag.id}
                onClick={() => { applyTag(tag); setOpen(false) }}
                disabled={loading}
                className="w-full flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-muted transition-colors text-left"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.name}
              </button>
            ))}
          </div>

          <div className="border-t mt-2 pt-2">
            {!creating ? (
              <button
                onClick={() => setCreating(true)}
                className="w-full flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
              >
                <Plus className="h-3 w-3" />
                Create new tag
              </button>
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder="Tag name"
                  value={newTagName}
                  onChange={e => setNewTagName(e.target.value)}
                  className="h-7 text-xs"
                  autoFocus
                />
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Color</Label>
                  <div className="flex flex-wrap gap-1">
                    {PRESET_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewTagColor(color)}
                        className="h-5 w-5 rounded-full border-2 transition-transform hover:scale-110"
                        style={{
                          backgroundColor: color,
                          borderColor: newTagColor === color ? '#000' : 'transparent',
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" className="h-6 text-xs flex-1" onClick={createAndApplyTag} disabled={loading || !newTagName.trim()}>
                    Create
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setCreating(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
