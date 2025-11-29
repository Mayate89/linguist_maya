import React, { useState, useEffect } from 'react';
import {
  Settings,
  BookOpen,
  FileText,
  ArrowRight,
  Type,
  Sparkles,
  Languages,
  RotateCcw,
  Clock,
  Trash2,
  ChevronRight,
} from 'lucide-react';

// --- System Prompt for Gemini ---
const SYSTEM_PROMPT = `
You are a linguistic expert backend. 
Analyze the user's provided English text. 
Break it down into sentence objects.
Return ONLY a valid JSON array. Do not use Markdown code blocks.

JSON Structure:
[
  {
    "id": 1,
    "en": "English sentence.",
    "cn": "Chinese translation.",
    "chunks": [
      { "text": "English", "type": "normal" }, 
      { "text": "sentence", "type": "vocab" } 
    ],
    "note": "Optional linguistic note."
  }
]

Chunk Types: 
- "vocab" (difficult words, highlight Green)
- "phrase" (idioms/collocations, highlight Yellow)
- "transition" (logic connectors, highlight Blue)
- "normal" (rest of text)
`;

const App = () => {
  // --- State ---
  const [apiKey, setApiKey] = useState(
    localStorage.getItem('gemini_api_key') || ''
  );
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('home');
  const [content, setContent] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  // Library State (New!)
  const [history, setHistory] = useState([]);

  // Settings
  const [fontSize, setFontSize] = useState(18);
  const [containerWidth, setContainerWidth] = useState(90);
  const [learnMode, setLearnMode] = useState('bilingual');

  // --- Initialization ---
  useEffect(() => {
    // Load history from local storage on boot
    const savedHistory = localStorage.getItem('lf_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  // --- Actions ---

  const saveKey = (val) => {
    setApiKey(val);
    localStorage.setItem('gemini_api_key', val);
  };

  const saveToHistory = (text, processedData) => {
    const newRecord = {
      id: Date.now(), // timestamp as ID
      title: text.slice(0, 50) + (text.length > 50 ? '...' : ''), // Preview title
      date: new Date().toLocaleDateString(),
      data: processedData,
    };

    const updatedHistory = [newRecord, ...history];
    setHistory(updatedHistory);
    localStorage.setItem('lf_history', JSON.stringify(updatedHistory));
  };

  const deleteHistoryItem = (id, e) => {
    e.stopPropagation(); // Prevent clicking the card
    const updated = history.filter((item) => item.id !== id);
    setHistory(updated);
    localStorage.setItem('lf_history', JSON.stringify(updated));
  };

  const loadLesson = (record) => {
    setContent(record.data);
    setCurrentScreen('reader');
  };
  const handleProcess = async () => {
    if (!apiKey) {
      alert('Please enter your Google Gemini API Key first!');
      return;
    }
    if (!inputText.trim()) return;

    setIsProcessing(true);
    setErrorMsg('');

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  { text: SYSTEM_PROMPT + '\n\nUser Text:\n' + inputText },
                ],
              },
            ],
            // --- 新增配置：请求更大的输出配额 ---
            generationConfig: {
              maxOutputTokens: 8192, // 允许生成更长的文本
              temperature: 0.2, // 让回答更稳定，减少格式错误
            },
          }),
        }
      );

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      // 增加安全检查，防止 data 结构不存在
      if (
        !data.candidates ||
        !data.candidates[0] ||
        !data.candidates[0].content
      ) {
        throw new Error(
          'AI response was blocked or empty. Try a shorter text.'
        );
      }

      let rawText = data.candidates[0].content.parts[0].text;
      rawText = rawText
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      const parsedContent = JSON.parse(rawText);

      setContent(parsedContent);
      saveToHistory(inputText, parsedContent);

      setCurrentScreen('reader');
      setInputText('');
    } catch (err) {
      console.error(err);
      // 优化报错提示
      if (err.message.includes('JSON')) {
        setErrorMsg(
          'Text too long for one-shot analysis. Try splitting it into 2 parts!'
        );
      } else {
        setErrorMsg('Error: ' + err.message);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Render Helpers ---
  const renderChunk = (chunk, index) => {
    let baseClass =
      'inline-block transition-all duration-200 rounded px-1 mx-0.5 border ';
    let typeClass = 'border-transparent text-gray-800';

    if (chunk.type === 'vocab')
      typeClass = 'bg-green-100 text-green-800 font-semibold border-green-200';
    else if (chunk.type === 'phrase')
      typeClass = 'bg-amber-100 text-amber-800 font-medium border-amber-200';
    else if (chunk.type === 'transition')
      typeClass = 'bg-indigo-50 text-indigo-700 italic border-indigo-100';

    return (
      <span key={index} className={`${baseClass} ${typeClass}`}>
        {chunk.text}
      </span>
    );
  };

  // --- Screens ---

  const HomeScreen = () => (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-6 shadow-sm z-10">
        <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-2">
          <BookOpen className="text-indigo-600 fill-indigo-100" />
          LinguistFlow
        </h1>
        <p className="text-slate-500 text-sm mt-1 font-medium">
          Turn text into mastery.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* API Input */}
        {!apiKey && (
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-sm animate-pulse">
            <label className="block text-xs font-bold text-amber-600 uppercase mb-2">
              Setup Required
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => saveKey(e.target.value)}
              placeholder="Paste Google Gemini API Key..."
              className="w-full p-2 bg-white rounded-lg border border-amber-200 text-sm outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        )}

        {/* New Lesson Input */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Sparkles size={14} /> New Lesson
          </h2>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 min-h-[160px] flex flex-col focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
            <textarea
              className="flex-1 w-full bg-transparent border-none focus:ring-0 resize-none text-slate-600 text-base leading-relaxed placeholder:text-slate-300"
              placeholder="Paste article here..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            ></textarea>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100">
              {errorMsg}
            </div>
          )}

          <button
            onClick={handleProcess}
            disabled={isProcessing || !inputText || !apiKey}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed active:scale-95 transition-all text-white rounded-xl font-bold text-lg shadow-xl shadow-indigo-100 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2 animate-pulse">
                Analyzing...
              </span>
            ) : (
              <>
                Generate Lesson <ArrowRight size={20} />
              </>
            )}
          </button>
        </div>

        {/* History Library */}
        <div className="space-y-4 pb-12">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Clock size={14} /> Library ({history.length})
          </h2>

          {history.length === 0 ? (
            <div className="text-center py-10 text-slate-300 text-sm">
              No lessons yet. Create one above!
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => loadLesson(item)}
                  className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm active:scale-98 transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex-1 pr-4">
                    <h3 className="font-bold text-slate-700 text-sm line-clamp-1 mb-1">
                      {item.title || 'Untitled Lesson'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {item.date} • {item.data.length} sentences
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => deleteHistoryItem(item.id, e)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                    <ChevronRight size={18} className="text-slate-300" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const ReaderScreen = () => (
    <div className="flex flex-col h-full bg-white">
      {/* Navbar */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex items-center justify-between safe-area-top">
        <button
          onClick={() => setCurrentScreen('home')}
          className="p-2 -ml-2 text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1 font-bold text-sm"
        >
          <ArrowRight className="rotate-180" size={20} />
          Library
        </button>

        {/* Mode Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-lg">
          {['immersion', 'bilingual', 'recall'].map((mode) => (
            <button
              key={mode}
              onClick={() => setLearnMode(mode)}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                learnMode === mode
                  ? 'bg-white shadow-sm text-indigo-600'
                  : 'text-slate-400'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-slate-50/50">
        <div
          className="mx-auto bg-white min-h-full shadow-sm transition-all duration-300"
          style={{ width: `${containerWidth}%`, maxWidth: '800px' }}
        >
          <div className="p-6 space-y-8 pb-32 pt-8">
            {content.map((item, idx) => (
              <div
                key={idx}
                className="group border-b border-slate-100 pb-6 last:border-0"
              >
                {/* English Area */}
                <div
                  className={`transition-all duration-500 ease-in-out leading-loose text-slate-800
                    ${
                      learnMode === 'recall'
                        ? 'blur-md select-none opacity-20 hover:blur-0 hover:opacity-100 cursor-pointer'
                        : ''
                    }
                  `}
                  style={{ fontSize: `${fontSize}px` }}
                >
                  {learnMode === 'recall' && (
                    <div className="absolute left-0 w-full text-center text-xs font-bold text-indigo-300 uppercase tracking-widest pointer-events-none -mt-6">
                      Tap to Reveal
                    </div>
                  )}
                  {item.chunks.map((chunk, cIdx) => renderChunk(chunk, cIdx))}
                </div>

                {/* Chinese & Note Area */}
                {(learnMode === 'bilingual' || learnMode === 'recall') && (
                  <div
                    className={`mt-4 pl-3 border-l-4 transition-all duration-300 ${
                      learnMode === 'recall'
                        ? 'border-indigo-500 bg-indigo-50/50 p-3 rounded-r-lg'
                        : 'border-slate-200'
                    }`}
                  >
                    <p
                      className={`text-slate-600 ${
                        learnMode === 'recall' ? 'font-bold text-lg' : 'text-sm'
                      }`}
                    >
                      {item.cn}
                    </p>
                    {learnMode === 'bilingual' && item.note && (
                      <p className="text-xs text-slate-400 mt-2 font-mono flex items-start gap-1">
                        <Sparkles size={12} className="mt-0.5 flex-shrink-0" />{' '}
                        {item.note}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Settings Footer */}
      <div className="bg-white border-t border-slate-200 px-6 py-6 pb-8 safe-area-bottom">
        <div className="flex items-center gap-4 mb-4">
          <Type size={18} className="text-slate-300" />
          <input
            type="range"
            min="14"
            max="28"
            value={fontSize}
            onChange={(e) => setFontSize(e.target.value)}
            className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <span className="text-xs font-mono text-slate-400 w-8">
            {fontSize}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-slate-300 w-5">W</span>
          <input
            type="range"
            min="80"
            max="100"
            value={containerWidth}
            onChange={(e) => setContainerWidth(e.target.value)}
            className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <span className="text-xs font-mono text-slate-400 w-8">
            {containerWidth}%
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen w-full bg-slate-50 sm:bg-slate-200 flex items-center justify-center font-sans text-slate-900">
      <div className="w-full h-full sm:w-[400px] sm:h-[850px] bg-white sm:rounded-[2.5rem] overflow-hidden sm:shadow-2xl sm:border-[8px] sm:border-slate-800 relative">
        {currentScreen === 'home' ? <HomeScreen /> : <ReaderScreen />}
      </div>
    </div>
  );
};

export default App;
