import React, { useEffect, useCallback } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
  preventDefault?: boolean;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  preventDefault?: boolean;
}

export const useKeyboardShortcuts = (
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
) => {
  const { enabled = true, preventDefault = true } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Ignorar se o usuário estiver digitando em um input
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        return;
      }

      const matchingShortcut = shortcuts.find(shortcut => {
        const keyMatches = shortcut.key.toLowerCase() === event.key.toLowerCase();
        const ctrlMatches = (shortcut.ctrlKey ?? false) === event.ctrlKey;
        const altMatches = (shortcut.altKey ?? false) === event.altKey;
        const shiftMatches = (shortcut.shiftKey ?? false) === event.shiftKey;
        const metaMatches = (shortcut.metaKey ?? false) === event.metaKey;

        return keyMatches && ctrlMatches && altMatches && shiftMatches && metaMatches;
      });

      if (matchingShortcut) {
        if (matchingShortcut.preventDefault ?? preventDefault) {
          event.preventDefault();
        }
        matchingShortcut.action();
      }
    },
    [shortcuts, enabled, preventDefault]
  );

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [handleKeyDown, enabled]);

  return shortcuts;
};

// Hook específico para atalhos da aplicação de transcrição
export const useTranscriptionShortcuts = ({
  onTogglePlayPause,
  onToggleSettings,
  onToggleTheme,
  onSpeedUp,
  onSpeedDown,
  onSeekForward,
  onSeekBackward,
  onNewTranscription,
  onExportTranscription,
  enabled = true
}: {
  onTogglePlayPause?: () => void;
  onToggleSettings?: () => void;
  onToggleTheme?: () => void;
  onSpeedUp?: () => void;
  onSpeedDown?: () => void;
  onSeekForward?: () => void;
  onSeekBackward?: () => void;
  onNewTranscription?: () => void;
  onExportTranscription?: () => void;
  enabled?: boolean;
}) => {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: ' ',
      action: () => onTogglePlayPause?.(),
      description: 'Reproduzir/Pausar áudio'
    },
    {
      key: 's',
      ctrlKey: true,
      action: () => onExportTranscription?.(),
      description: 'Salvar/Exportar transcrição'
    },
    {
      key: 'n',
      ctrlKey: true,
      action: () => onNewTranscription?.(),
      description: 'Nova transcrição'
    },
    {
      key: ',',
      ctrlKey: true,
      action: () => onToggleSettings?.(),
      description: 'Abrir configurações'
    },
    {
      key: 't',
      ctrlKey: true,
      action: () => onToggleTheme?.(),
      description: 'Alternar tema'
    },
    {
      key: 'ArrowUp',
      action: () => onSpeedUp?.(),
      description: 'Aumentar velocidade de reprodução'
    },
    {
      key: 'ArrowDown',
      action: () => onSpeedDown?.(),
      description: 'Diminuir velocidade de reprodução'
    },
    {
      key: 'ArrowRight',
      action: () => onSeekForward?.(),
      description: 'Avançar 10 segundos'
    },
    {
      key: 'ArrowLeft',
      action: () => onSeekBackward?.(),
      description: 'Retroceder 10 segundos'
    },
    {
      key: 'f',
      action: () => onSeekForward?.(),
      description: 'Avançar (alternativo)'
    },
    {
      key: 'b',
      action: () => onSeekBackward?.(),
      description: 'Retroceder (alternativo)'
    }
  ];

  return useKeyboardShortcuts(shortcuts, { enabled });
};

// Componente para exibir os atalhos disponíveis
export const KeyboardShortcutsHelp: React.FC<{ shortcuts: KeyboardShortcut[] }> = ({ shortcuts }) => {
  const formatShortcut = (shortcut: KeyboardShortcut) => {
    const keys = [];
    if (shortcut.ctrlKey) keys.push('Ctrl');
    if (shortcut.altKey) keys.push('Alt');
    if (shortcut.shiftKey) keys.push('Shift');
    if (shortcut.metaKey) keys.push('Cmd');
    
    let keyName = shortcut.key;
    if (keyName === ' ') keyName = 'Espaço';
    if (keyName.startsWith('Arrow')) keyName = keyName.replace('Arrow', 'Seta ');
    
    keys.push(keyName);
    return keys.join(' + ');
  };

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold mb-4">Atalhos de Teclado</h3>
      <div className="grid gap-2">
        {shortcuts.map((shortcut, index) => (
          <div key={`shortcut-${index}`} className="flex justify-between items-center py-1">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {shortcut.description}
            </span>
            <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-800 rounded border">
              {formatShortcut(shortcut)}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  );
};