const EMOJIS = [
  '😊', '🤩', '😎', '🤗', '😇',
  '🦊', '🐱', '🐼', '🐨', '🐯',
  '🐸', '🦁', '🐮', '🐷', '🐰',
  '👑', '🎩', '⚔️', '🏹', '🎭',
  '🌟', '🔥', '💎', '🍀', '🎪',
]

interface EmojiPickerProps {
  selected: string
  onSelect: (emoji: string) => void
}

export default function EmojiPicker({ selected, onSelect }: EmojiPickerProps) {
  return (
    <div>
      <p className="text-sm text-gray-500 mb-3 text-center">选择一个头像</p>
      <div className="grid grid-cols-5 gap-2">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSelect(emoji)}
            className={`w-12 h-12 sm:w-14 sm:h-14 text-2xl rounded-xl flex items-center justify-center
              transition-all duration-200 border-2
              ${selected === emoji
                ? 'border-yellow-400 bg-yellow-50 scale-110 shadow-sm'
                : 'border-transparent bg-gray-50 hover:bg-gray-100 hover:scale-105'
              }`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
