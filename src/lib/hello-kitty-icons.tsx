/**
 * Hello Kitty Icon Replacements
 * Cute emoji-based icons that replace regular icons in Hello Kitty mode
 */

export const helloKittyIcons = {
  // Navigation icons
  'home': '🏠',
  'dashboard': '📊',
  'settings': '⚙️',
  'user': '👤',
  'users': '👥',
  'bell': '🔔',
  'search': '🔍',
  'menu': '📋',
  'layout-dashboard': '📊',
  'activity': '💓',
  'bar-chart': '📊',
  'pie-chart': '🥧',

  // Network icons
  'wifi': '📡',
  'network': '🌐',
  'server': '💻',
  'cloud': '☁️',
  'signal': '📶',
  'router': '📡',
  'antenna': '📡',
  'globe': '🌐',

  // Status icons
  'check': '✅',
  'check-circle': '✅',
  'check-square': '☑️',
  'x': '❌',
  'x-circle': '❌',
  'alert': '⚠️',
  'alert-triangle': '⚠️',
  'alert-circle': '⚠️',
  'info': 'ℹ️',
  'heart': '💖',
  'star': '⭐',
  'zap': '⚡',
  'flame': '🔥',

  // Action icons
  'edit': '✏️',
  'pencil': '✏️',
  'delete': '🗑️',
  'trash': '🗑️',
  'trash-2': '🗑️',
  'add': '➕',
  'plus': '➕',
  'plus-circle': '➕',
  'remove': '➖',
  'minus': '➖',
  'minus-circle': '➖',
  'save': '💾',
  'download': '⬇️',
  'upload': '⬆️',
  'refresh': '🔄',
  'refresh-cw': '🔄',
  'rotate-cw': '🔄',
  'copy': '📋',
  'clipboard': '📋',
  'scissors': '✂️',
  'share': '📤',
  'share-2': '📤',

  // UI icons
  'chevron-right': '▶️',
  'chevron-left': '◀️',
  'chevron-up': '🔼',
  'chevron-down': '🔽',
  'arrow-right': '→',
  'arrow-left': '←',
  'arrow-up': '↑',
  'arrow-down': '↓',
  'move': '🔀',
  'maximize': '⬜',
  'minimize': '⬇️',
  'eye': '👁️',
  'eye-off': '🙈',

  // Communication
  'mail': '✉️',
  'message-circle': '💬',
  'message-square': '💬',
  'send': '📤',
  'inbox': '📥',
  'at-sign': '@',

  // File & Folder
  'file': '📄',
  'file-text': '📄',
  'folder': '📁',
  'folder-open': '📂',
  'image': '🖼️',
  'book': '📖',
  'bookmark': '🔖',

  // Time & Calendar
  'clock': '🕐',
  'calendar': '📅',
  'timer': '⏱️',
  'stopwatch': '⏱️',

  // Tools & Settings
  'tool': '🔧',
  'wrench': '🔧',
  'hammer': '🔨',
  'sliders': '🎚️',
  'filter': '🔍',
  'power': '🔌',
  'battery': '🔋',
  'key': '🔑',
  'lock': '🔒',
  'unlock': '🔓',
  'shield': '🛡️',

  // Media & Audio
  'play': '▶️',
  'pause': '⏸️',
  'stop': '⏹️',
  'skip-forward': '⏭️',
  'skip-back': '⏮️',
  'volume': '🔊',
  'volume-2': '🔊',
  'volume-x': '🔇',
  'music': '🎵',
  'mic': '🎤',
  'video': '🎬',
  'camera': '📷',

  // Weather & Nature
  'sun': '☀️',
  'moon': '🌙',
  'cloud-rain': '🌧️',
  'cloud-snow': '❄️',
  'wind': '💨',
  'droplet': '💧',
  'umbrella': '☔',

  // Fun extras - Kawaii theme!
  'sparkles': '✨',
  'bow': '🎀',
  'kitty': '😺',
  'cat': '🐱',
  'pink-heart': '💕',
  'gift': '🎁',
  'cake': '🎂',
  'flower': '🌸',
  'blossom': '🌸',
  'rainbow': '🌈',
  'butterfly': '🦋',
  'cherry-blossom': '🌸',
  'candy': '🍬',
  'lollipop': '🍭',
  'ice-cream': '🍦',
  'donut': '🍩',
  'cookie': '🍪',
  'cupcake': '🧁',
  'strawberry': '🍓',
  'cherry': '🍒',
  'balloon': '🎈',
  'confetti': '🎊',
  'ribbon': '🎀',
  'crown': '👑',
  'gem': '💎',
  'ring': '💍',
};

export function getHelloKittyIcon(iconName: string): string {
  return helloKittyIcons[iconName as keyof typeof helloKittyIcons] || iconName;
}

export function isHelloKittyMode(): boolean {
  return document.documentElement.classList.contains('theme-hello-kitty');
}
