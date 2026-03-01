'use client'

interface Tag {
  id: string
  name: string
  color: string
}

interface TagBadgeProps {
  tag: Tag
  onRemove?: (tagId: string) => void
}

export function TagBadge({ tag, onRemove }: TagBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: tag.color }}
    >
      {tag.name}
      {onRemove && (
        <button
          onClick={() => onRemove(tag.id)}
          className="ml-0.5 rounded-full hover:bg-white/20 transition-colors leading-none"
          aria-label={`Remove tag ${tag.name}`}
        >
          ×
        </button>
      )}
    </span>
  )
}
