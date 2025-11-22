import React, { useState, useCallback, useRef, useEffect } from 'react';
import { fetchDictionaryDefinition, generateWordImage, generateSpeech, extractTextFromImage, generateDailyStory } from './services/geminiService';
import { DictionaryState, WordHistoryItem, DictionaryResult, ViewMode, UserProfile } from './types';
import { ResultCard } from './components/ResultCard';
import { decodeBase64, decodeAudioData, playBuffer } from './utils/audioUtils';
import { exportHistoryToCSV } from './utils/csvUtils';

const App: React.FC = () => {
  // --- State ---
  const [query, setQuery] = useState('');
  const [view, setView] = useState<ViewMode>(ViewMode.SEARCH);
  const [user, setUser] = useState<UserProfile | null>(null);
  
  const [state, setState] = useState<DictionaryState>({
    data: null,
    imageUrl: null,
    isLoadingText: false,
    isLoadingImage: false,
    isLoadingAudioWord: false,
    isLoadingAudioSentence: false,
    isAnalyzingImage: false,
    isGeneratingStory: false,
    error: null,
    history: [],
    dailyStory: null
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Effects ---

  // Load history from local storage on mount (Simulation of cloud sync)
  useEffect(() => {
    const savedHistory = localStorage.getItem('lyb_history');
    const savedUser = localStorage.getItem('lyb_user');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setState(prev => ({ ...prev, history: parsed }));
      } catch (e) { console.error("Failed to load history"); }
    }
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) { console.error("Failed to load user"); }
    }
  }, []);

  // Save history whenever it changes
  useEffect(() => {
    localStorage.setItem('lyb_history', JSON.stringify(state.history));
  }, [state.history]);

  // --- Handlers ---

  const handleLogin = () => {
    // Mock Google Login
    const mockUser: UserProfile = {
      name: "Explorer",
      email: "explorer@example.com",
      photoURL: "https://ui-avatars.com/api/?name=Explorer&background=f59e0b&color=fff"
    };
    setUser(mockUser);
    localStorage.setItem('lyb_user', JSON.stringify(mockUser));
    alert("Logged in successfully! Your vocabulary will be saved locally.");
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('lyb_user');
    setView(ViewMode.SEARCH);
  };

  const addToHistory = useCallback((result: DictionaryResult) => {
    setState(prev => {
      // Avoid duplicates
      if (prev.history.some(item => item.word === result.word)) return prev;
      
      const newItem: WordHistoryItem = {
        id: Date.now().toString(),
        word: result.word,
        reading: result.reading,
        definition: result.definition_cn,
        definition_jp: result.definition_jp,
        example_jp: result.example_jp,
        example_cn: result.example_cn,
        timestamp: Date.now()
      };
      return {
        ...prev,
        history: [newItem, ...prev.history]
      };
    });
  }, []);

  const handleSearch = async (e?: React.FormEvent, overrideQuery?: string) => {
    if (e) e.preventDefault();
    const searchTerm = overrideQuery || query;
    if (!searchTerm.trim()) return;

    setView(ViewMode.SEARCH); // Ensure we are on search page
    setState(prev => ({
      ...prev,
      isLoadingText: true,
      isLoadingImage: true,
      error: null,
      data: null,
      imageUrl: null
    }));

    try {
      // 1. Fetch text definition
      const definition = await fetchDictionaryDefinition(searchTerm);
      
      setQuery(definition.word);
      setState(prev => ({ ...prev, data: definition, isLoadingText: false }));
      
      addToHistory(definition);

      // 2. Fetch image
      generateImage(definition.word, definition.definition_cn);

    } catch (error) {
      console.error(error);
      setState(prev => ({
        ...prev,
        error: "Failed to find the word. Please try again.",
        isLoadingText: false,
        isLoadingImage: false
      }));
    }
  };

  const generateImage = async (word: string, def: string) => {
    try {
      const imageUrl = await generateWordImage(word, def);
      setState(prev => ({ ...prev, imageUrl, isLoadingImage: false }));
    } catch (imgError) {
      console.error("Image generation failed", imgError);
      setState(prev => ({ ...prev, isLoadingImage: false }));
    }
  };

  const handleRegenerateImage = () => {
    if (!state.data) return;
    setState(prev => ({ ...prev, isLoadingImage: true, imageUrl: null }));
    generateImage(state.data.word, state.data.definition_cn);
  };

  const handlePlayAudio = useCallback(async (text: string, type: 'word' | 'sentence') => {
    const loadingKey = type === 'word' ? 'isLoadingAudioWord' : 'isLoadingAudioSentence';
    
    if (state[loadingKey]) return;
    setState(prev => ({ ...prev, [loadingKey]: true }));

    try {
      const base64Audio = await generateSpeech(text);
      const audioBytes = decodeBase64(base64Audio);
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass({ sampleRate: 24000 });
      const audioBuffer = await decodeAudioData(audioBytes, audioCtx, 24000);
      playBuffer(audioBuffer, audioCtx);
    } catch (error) {
      console.error("Audio playback failed", error);
    } finally {
      setState(prev => ({ ...prev, [loadingKey]: false }));
    }
  }, [state]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setState(prev => ({ ...prev, isAnalyzingImage: true, error: null }));
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64String = (reader.result as string).split(',')[1];
        try {
          const extractedText = await extractTextFromImage(base64String);
          if (extractedText) {
            setQuery(extractedText);
            handleSearch(undefined, extractedText);
          } else { throw new Error("No text found"); }
        } catch (err) { setState(prev => ({ ...prev, error: "Could not read text from image." })); } 
        finally { setState(prev => ({ ...prev, isAnalyzingImage: false })); }
      };
      reader.readAsDataURL(file);
    } catch (err) { setState(prev => ({ ...prev, isAnalyzingImage: false })); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerateStory = async () => {
    if (state.history.length === 0 || state.isGeneratingStory) return;
    setState(prev => ({ ...prev, isGeneratingStory: true, dailyStory: null }));
    try {
      const story = await generateDailyStory(state.history.slice(0, 10)); // Limit to last 10 words
      setState(prev => ({ ...prev, dailyStory: story, isGeneratingStory: false }));
    } catch (error) {
      setState(prev => ({ ...prev, error: "Failed to generate story.", isGeneratingStory: false }));
    }
  };

  // --- Render Helpers ---
  
  const renderHeader = () => (
    <header className="pt-8 pb-6 px-4 bg-amber-300 rounded-b-[2.5rem] shadow-sm mb-8 relative z-30">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Logo */}
        <div 
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition" 
          onClick={() => setView(ViewMode.SEARCH)}
        >
          <span className="text-4xl drop-shadow-md">📒</span>
          <div>
            <h1 className="text-3xl font-black text-amber-950 tracking-tight font-serif leading-none">
              小黄书
            </h1>
            <p className="text-amber-800/60 text-[10px] font-bold tracking-widest uppercase">Little Yellow Book</p>
          </div>
        </div>

        {/* Nav Actions */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setView(ViewMode.WORDBOOK)}
            className={`px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 transition-all ${
              view === ViewMode.WORDBOOK 
                ? 'bg-amber-950 text-amber-100 shadow-md' 
                : 'bg-white/30 text-amber-900 hover:bg-white/50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            Wordbook
            <span className="bg-amber-500 text-white text-[10px] px-1.5 rounded-full">
              {state.history.length}
            </span>
          </button>

          {!user ? (
            <button 
              onClick={handleLogin}
              className="flex items-center gap-2 bg-white text-slate-600 px-4 py-2 rounded-full font-bold text-sm shadow-sm hover:bg-slate-50 transition-all"
            >
               <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/></svg>
               Login
            </button>
          ) : (
             <div className="flex items-center gap-2 bg-amber-400/30 pr-1 pl-1 py-1 rounded-full">
               <img src={user.photoURL} alt={user.name} className="w-8 h-8 rounded-full border border-white" />
               <button onClick={handleLogout} className="text-xs font-bold text-amber-900 pr-3 hover:text-red-600">
                 Exit
               </button>
             </div>
          )}
        </div>
      </div>
    </header>
  );

  const renderSearchView = () => (
    <div className="animate-fade-in">
      {/* Search Box */}
      <div className="max-w-2xl mx-auto px-4 mb-12 relative z-20">
        <form onSubmit={(e) => handleSearch(e)} className="relative group">
          <div className="absolute -inset-1 bg-amber-400 rounded-2xl blur opacity-40 group-hover:opacity-70 transition duration-200"></div>
          <div className="relative flex bg-white rounded-2xl shadow-xl ring-1 ring-black/5 overflow-hidden p-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type Japanese or Chinese..."
              className="flex-grow px-4 py-3 text-lg text-slate-800 placeholder:text-slate-400 focus:outline-none bg-transparent"
            />
            <div className="flex items-center gap-2 border-l border-slate-100 pl-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={state.isAnalyzingImage}
                className="p-3 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
              >
                {state.isAnalyzingImage ? (
                  <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                )}
              </button>
              <button
                type="submit"
                disabled={state.isLoadingText || state.isAnalyzingImage}
                className="px-6 py-3 bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold rounded-xl transition-colors flex items-center gap-2"
              >
                {state.isLoadingText ? <div className="w-5 h-5 border-2 border-amber-900/30 border-t-amber-900 rounded-full animate-spin"></div> : <span>Search</span>}
              </button>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleImageUpload}/>
          </div>
        </form>
      </div>

      {/* Results */}
      <main className="container mx-auto px-4 max-w-4xl">
        {state.error && <div className="bg-red-50 text-red-600 px-6 py-4 rounded-xl border border-red-100 text-center mb-8">{state.error}</div>}
        
        {state.isLoadingText && !state.data && (
           <div className="flex flex-col items-center justify-center py-20 opacity-60">
             <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mb-6"></div>
             <p className="text-slate-500 animate-pulse font-medium">Consulting the Little Yellow Book...</p>
          </div>
        )}

        {state.data && (
          <ResultCard
            data={state.data}
            imageUrl={state.imageUrl}
            onPlayAudioWord={() => state.data && handlePlayAudio(state.data.word, 'word')}
            onPlayAudioSentence={() => state.data && handlePlayAudio(state.data.example_jp, 'sentence')}
            onRefreshImage={handleRegenerateImage}
            isLoadingAudioWord={state.isLoadingAudioWord}
            isLoadingAudioSentence={state.isLoadingAudioSentence}
            isImageLoading={state.isLoadingImage}
          />
        )}

        {!state.data && !state.isLoadingText && !state.error && (
           <div className="text-center py-12">
             <div className="inline-block p-6 rounded-full bg-white shadow-sm border border-amber-50 mb-4 transform rotate-3">
                <span className="text-5xl opacity-50 grayscale">🐣</span>
             </div>
             <p className="text-amber-900/40 text-lg font-medium">Start your journey by searching or uploading.</p>
          </div>
        )}
      </main>
    </div>
  );

  const renderWordbookView = () => (
    <div className="container mx-auto px-4 max-w-4xl animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">My Wordbook</h2>
          <p className="text-slate-500">Memorized {state.history.length} words</p>
        </div>
        <div className="flex gap-2">
           <button
             onClick={() => exportHistoryToCSV(state.history)}
             disabled={state.history.length === 0}
             className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 disabled:opacity-50"
           >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
             Export CSV
           </button>
           <button 
             onClick={handleGenerateStory}
             disabled={state.isGeneratingStory || state.history.length < 1}
             className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-md shadow-amber-500/30 flex items-center gap-2 disabled:opacity-50"
           >
              {state.isGeneratingStory ? 'Thinking...' : '✨ Create Story'}
           </button>
        </div>
      </div>

      {/* Generated Story Section */}
      {(state.dailyStory || state.isGeneratingStory) && (
         <div className="bg-white rounded-3xl p-8 border border-amber-200 shadow-lg relative overflow-hidden mb-10">
           <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-300 via-orange-300 to-amber-300"></div>
           <h4 className="font-bold text-slate-400 uppercase text-xs tracking-wider mb-4">AI Generated Scenario</h4>
           
           {state.isGeneratingStory ? (
             <div className="py-8 text-center animate-pulse">
               <div className="text-amber-500 text-xl">✨ Wringing out some creativity...</div>
             </div>
           ) : (
             <div className="animate-fade-in">
               <div className="prose prose-slate max-w-none whitespace-pre-wrap font-medium text-slate-700 leading-loose">
                 {state.dailyStory}
               </div>
               <div className="mt-6 flex justify-end">
                 <button 
                  onClick={() => handlePlayAudio(state.dailyStory || "", 'sentence')}
                  className="text-amber-600 hover:text-amber-800 text-sm flex items-center gap-2 font-bold"
                 >
                   <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                   Listen to Story
                 </button>
               </div>
             </div>
           )}
        </div>
      )}

      {/* List */}
      <div className="grid grid-cols-1 gap-4">
        {state.history.length === 0 ? (
          <div className="text-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl">
            <p>No words saved yet.</p>
          </div>
        ) : (
          state.history.map((item, idx) => (
            <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-amber-200 transition-all group flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div className="flex-grow">
                 <div className="flex items-baseline gap-3 mb-1">
                    <h3 className="text-2xl font-bold text-slate-800">{item.word}</h3>
                    <span className="text-amber-600 font-medium">{item.reading}</span>
                 </div>
                 <p className="text-slate-600 text-sm mb-2">{item.definition}</p>
                 <div className="bg-slate-50 p-2 rounded-lg text-xs text-slate-500 italic">
                   {item.example_jp}
                 </div>
               </div>
               <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => { setQuery(item.word); setView(ViewMode.SEARCH); handleSearch(undefined, item.word); }}
                    className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg"
                    title="View Details"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  </button>
                  <button 
                    onClick={() => handlePlayAudio(item.word, 'word')}
                    className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg"
                    title="Play Audio"
                  >
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                  </button>
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-amber-50 pb-20 font-sans">
      {renderHeader()}
      
      {view === ViewMode.SEARCH 
        ? renderSearchView() 
        : renderWordbookView()
      }

      <footer className="text-center py-8 text-amber-900/30 text-xs mt-auto">
        <p>Powered by Google Gemini & Imagen</p>
      </footer>
    </div>
  );
};

export default App;