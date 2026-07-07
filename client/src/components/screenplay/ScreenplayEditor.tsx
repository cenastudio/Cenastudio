import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import {
  ScriptElement,
  ScriptElementType,
  ScriptMetadata,
  createElement,
  SCREENPLAY_FORMAT,
  createEmptyScript,
} from '@/lib/types/script';
import { exportToPDF, downloadFountain, calculateStats } from '@/lib/screenplay/export';
import { FileDown, Settings, BarChart3, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface ScreenplayEditorProps {
  projectId?: number;
  initialContent?: ScriptElement[];
  onSave?: (elements: ScriptElement[]) => void;
}

export default function ScreenplayEditor({
  projectId,
  initialContent = [],
  onSave,
}: ScreenplayEditorProps) {
  const [elements, setElements] = useState<ScriptElement[]>(
    initialContent.length > 0
      ? initialContent
      : [createElement('transition', 'FADE IN:')]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [metadata, setMetadata] = useState<ScriptMetadata>({
    title: 'Untitled Script',
    author: '',
    draftNumber: 1,
    draftDate: new Date(),
  });
  const editorRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  // Calculate stats
  const stats = calculateStats(elements);

  // Focus on active element
  useEffect(() => {
    const activeRef = editorRefs.current[activeIndex];
    if (activeRef) {
      activeRef.focus();
      // Move cursor to end
      activeRef.selectionStart = activeRef.value.length;
      activeRef.selectionEnd = activeRef.value.length;
    }
  }, [activeIndex]);

  // Handle content change
  const handleChange = (index: number, content: string) => {
    const newElements = [...elements];
    newElements[index] = { ...newElements[index], content };
    setElements(newElements);

    if (onSave) {
      onSave(newElements);
    }
  };

  // Handle element type change
  const handleTypeChange = (index: number, type: ScriptElementType) => {
    const newElements = [...elements];
    newElements[index] = { ...newElements[index], type };
    setElements(newElements);
  };

  // Add new element after current
  const addElement = (index: number, type: ScriptElementType) => {
    const newElements = [...elements];
    newElements.splice(index + 1, 0, createElement(type));
    setElements(newElements);
    setActiveIndex(index + 1);
  };

  // Delete element
  const deleteElement = (index: number) => {
    if (elements.length === 1) return; // Keep at least one element

    const newElements = elements.filter((_, i) => i !== index);
    setElements(newElements);
    setActiveIndex(Math.max(0, index - 1));
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>, index: number) => {
    const element = elements[index];

    // TAB - Next element type
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const types: ScriptElementType[] = ['scene_heading', 'action', 'character', 'dialogue', 'transition'];
      const currentIndex = types.indexOf(element.type);
      const nextType = types[(currentIndex + 1) % types.length];
      handleTypeChange(index, nextType);
      return;
    }

    // SHIFT+TAB - Previous element type
    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      const types: ScriptElementType[] = ['scene_heading', 'action', 'character', 'dialogue', 'transition'];
      const currentIndex = types.indexOf(element.type);
      const prevType = types[(currentIndex - 1 + types.length) % types.length];
      handleTypeChange(index, prevType);
      return;
    }

    // ENTER - New line (same or next logical type)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();

      let nextType: ScriptElementType = element.type;

      // Logical flow
      if (element.type === 'scene_heading') nextType = 'action';
      if (element.type === 'action') nextType = 'action';
      if (element.type === 'character') nextType = 'dialogue';
      if (element.type === 'dialogue') nextType = 'character';
      if (element.type === 'transition') nextType = 'scene_heading';

      addElement(index, nextType);
      return;
    }

    // ALT+1 - Scene Heading
    if (e.altKey && e.key === '1') {
      e.preventDefault();
      handleTypeChange(index, 'scene_heading');
      return;
    }

    // ALT+2 - Action
    if (e.altKey && e.key === '2') {
      e.preventDefault();
      handleTypeChange(index, 'action');
      return;
    }

    // ALT+3 - Character
    if (e.altKey && e.key === '3') {
      e.preventDefault();
      handleTypeChange(index, 'character');
      return;
    }

    // ALT+4 - Dialogue
    if (e.altKey && e.key === '4') {
      e.preventDefault();
      handleTypeChange(index, 'dialogue');
      return;
    }

    // ALT+6 - Transition
    if (e.altKey && e.key === '6') {
      e.preventDefault();
      handleTypeChange(index, 'transition');
      return;
    }

    // BACKSPACE on empty element - delete
    if (e.key === 'Backspace' && element.content === '' && elements.length > 1) {
      e.preventDefault();
      deleteElement(index);
      return;
    }

    // UP/DOWN arrows - navigate between elements
    if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault();
      setActiveIndex(index - 1);
      return;
    }

    if (e.key === 'ArrowDown' && index < elements.length - 1) {
      e.preventDefault();
      setActiveIndex(index + 1);
      return;
    }
  };

  // Get CSS classes for element type
  const getElementClasses = (type: ScriptElementType): string => {
    const format = SCREENPLAY_FORMAT[type];
    const baseClasses = 'screenplay-element resize-none border-none outline-none bg-transparent';

    const indentClass = `ml-[${format.indent * 4}px]`;
    const widthClass = `max-w-[${format.width * 10}px]`;
    const uppercaseClass = format.uppercase ? 'uppercase' : '';
    const italicClass = format.italic ? 'italic' : '';
    const alignClass = format.alignRight ? 'text-right' : '';

    return `${baseClasses} ${indentClass} ${widthClass} ${uppercaseClass} ${italicClass} ${alignClass}`;
  };

  // Get placeholder text
  const getPlaceholder = (type: ScriptElementType): string => {
    switch (type) {
      case 'scene_heading':
        return 'INT. LOCATION - DAY';
      case 'action':
        return 'Describe the action...';
      case 'character':
        return 'CHARACTER NAME';
      case 'dialogue':
        return 'What the character says...';
      case 'parenthetical':
        return '(how they say it)';
      case 'transition':
        return 'CUT TO:';
      case 'shot':
        return 'CLOSE ON';
      case 'note':
        return 'Production note...';
      default:
        return '';
    }
  };

  // Handle PDF export
  const handleExportPDF = async () => {
    try {
      await exportToPDF(elements, metadata);
      toast.success('PDF exported successfully!');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    }
  };

  // Handle Fountain export
  const handleExportFountain = () => {
    try {
      downloadFountain(elements, metadata);
      toast.success('Fountain file downloaded!');
    } catch (error) {
      console.error('Fountain export error:', error);
      toast.error('Failed to export Fountain');
    }
  };

  return (
    <div className="screenplay-editor h-full flex flex-col bg-frame-black">
      {/* Toolbar */}
      <div className="border-b border-frame-gray-3 bg-frame-gray-1 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-frame-white">Screenplay Editor</h2>
          <span className="text-xs text-frame-gray-light font-mono">Draft 1</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStats(!showStats)}
            className="px-4 py-2 border border-frame-gray-3 hover:border-frame-orange text-frame-white text-sm flex items-center gap-2 transition"
          >
            <BarChart3 className="w-4 h-4" />
            Stats ({stats.pageCount}p • {stats.estimatedTime}min)
          </button>

          <button
            onClick={handleExportPDF}
            className="px-4 py-2 border border-frame-gray-3 hover:border-frame-orange text-frame-white text-sm flex items-center gap-2 transition"
          >
            <FileDown className="w-4 h-4" />
            Export PDF
          </button>

          <button
            onClick={handleExportFountain}
            className="p-2 border border-frame-gray-3 hover:border-frame-orange text-frame-white transition"
            title="Export Fountain"
          >
            <FileText className="w-4 h-4" />
          </button>

          <button
            className="p-2 border border-frame-gray-3 hover:border-frame-orange text-frame-white transition"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto bg-white shadow-2xl min-h-[11in] p-16">
          {/* Script Title Page (optional, hidden for now) */}

          {/* Script Content */}
          <div className="screenplay-content font-mono text-sm leading-relaxed space-y-2">
            {elements.map((element, index) => (
              <motion.div
                key={element.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`screenplay-line ${
                  index === activeIndex ? 'active' : ''
                }`}
              >
                <textarea
                  ref={(el) => { editorRefs.current[index] = el; }}
                  value={element.content}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  onFocus={() => setActiveIndex(index)}
                  placeholder={getPlaceholder(element.type)}
                  className={`${getElementClasses(element.type)} w-full text-black placeholder:text-gray-400`}
                  rows={1}
                  style={{
                    minHeight: '1.5em',
                    height: 'auto',
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = target.scrollHeight + 'px';
                  }}
                />

                {/* Element type indicator (on hover) */}
                {index === activeIndex && (
                  <div className="text-xs text-gray-400 mt-1">
                    {element.type.replace('_', ' ')} • TAB to cycle • ALT+1-6 for type
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Help (bottom) */}
      <div className="border-t border-frame-gray-3 bg-frame-gray-1 p-2 text-xs text-frame-gray-light font-mono flex gap-6">
        <span><kbd>TAB</kbd> Next type</span>
        <span><kbd>⏎</kbd> New line</span>
        <span><kbd>ALT+1</kbd> Scene</span>
        <span><kbd>ALT+2</kbd> Action</span>
        <span><kbd>ALT+3</kbd> Character</span>
        <span><kbd>ALT+4</kbd> Dialogue</span>
        <span><kbd>ALT+6</kbd> Transition</span>
      </div>
    </div>
  );
}
