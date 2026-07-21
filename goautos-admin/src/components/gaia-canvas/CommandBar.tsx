import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Send, Loader2, Sparkles } from 'lucide-react';

interface CommandBarProps {
  onSend: (msg: string) => void;
  isProcessing: boolean;
}

export function CommandBar({ onSend, isProcessing }: CommandBarProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isProcessing) return;
    onSend(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="px-3 md:px-5 py-3 shrink-0">
      <div className="max-w-3xl mx-auto">
        <div className="relative bg-white rounded-2xl shadow-xl shadow-gray-200/40 border border-gray-200/80 focus-within:border-primary/40 focus-within:shadow-primary/10 transition-all duration-300">
          <div className="flex items-center gap-2 px-4 py-2.5">
            <Sparkles className="w-4 h-4 text-slate-300 shrink-0" />
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pide lo que necesites..."
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none disabled:opacity-50"
              disabled={isProcessing}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isProcessing}
              className="w-10 h-10 rounded-xl bg-gradient-to-r from-primary to-cyan-500 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-primary/30 hover:scale-105 active:scale-95 transition-all duration-200 shrink-0"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
