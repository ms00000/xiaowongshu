import React from 'react';
import { DictionaryResult } from '../types';

interface ResultCardProps {
  data: DictionaryResult;
  imageUrl: string | null;
  onPlayAudioWord: () => void;
  onPlayAudioSentence: () => void;
  onRefreshImage: () => void;
  isLoadingAudioWord: boolean;
  isLoadingAudioSentence: boolean;
  isImageLoading: boolean;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  data,
  imageUrl,
  onPlayAudioWord,
  onPlayAudioSentence,
  onRefreshImage,
  isLoadingAudioWord,
  isLoadingAudioSentence,
  isImageLoading
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in mb-12">
      {/* Text Content */}
      <div className="bg-white rounded-3xl shadow-xl border border-amber-100 overflow-hidden flex flex-col relative">
        {/* Decorative yellow element */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-300 rounded-bl-[100px] opacity-20 -z-0"></div>

        <div className="p-8 flex-grow z-10">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="text-5xl font-bold text-slate-800 tracking-tight">{data.word}</h2>
            <span className="text-lg text-slate-500 font-medium">{data.romaji}</span>
          </div>
          
          <div className="flex items-center gap-3 mb-8">
            <span className="text-xl text-amber-600 font-medium bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
              {data.reading}
            </span>
            <button
              onClick={onPlayAudioWord}
              disabled={isLoadingAudioWord}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 hover:bg-amber-300 hover:text-amber-900 text-slate-600 transition-all disabled:opacity-50 focus:outline-none"
              title="Play Pronunciation"
            >
              {isLoadingAudioWord ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>
          </div>

          <div className="space-y-6">
            <div className="group">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Japanese Definition</h3>
              <p className="text-lg text-slate-700 leading-relaxed border-l-4 border-slate-200 pl-4 group-hover:border-amber-400 transition-colors">
                {data.definition_jp}
              </p>
            </div>

            <div className="group">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Chinese Definition</h3>
              <p className="serif-cn text-lg text-slate-700 leading-relaxed border-l-4 border-slate-200 pl-4 group-hover:border-pink-400 transition-colors">
                {data.definition_cn}
              </p>
            </div>
            
             <div className="bg-amber-50/50 rounded-2xl p-5 mt-6 border border-amber-100/50">
               <div className="flex justify-between items-center mb-3">
                 <h3 className="text-xs font-bold text-amber-600/60 uppercase tracking-wider">Example</h3>
                 <button 
                   onClick={onPlayAudioSentence}
                   disabled={isLoadingAudioSentence}
                   className="text-amber-600 hover:text-amber-800 text-sm flex items-center gap-1 disabled:opacity-50"
                 >
                   {isLoadingAudioSentence ? (
                     <span className="animate-pulse">Loading audio...</span>
                   ) : (
                     <>
                       <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                       <span>Read Aloud</span>
                     </>
                   )}
                 </button>
               </div>
              <p className="text-slate-800 font-medium mb-2 text-lg leading-7">{data.example_jp}</p>
              <p className="text-slate-500 text-base serif-cn italic">{data.example_cn}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Content */}
      <div className="flex flex-col h-full">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden h-full min-h-[300px] flex flex-col relative group">
          <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-slate-500 uppercase tracking-wider shadow-sm">
             AI Visualization
          </div>
          
          {/* Refresh Button */}
          {imageUrl && !isImageLoading && (
            <button 
              onClick={onRefreshImage}
              className="absolute top-4 right-4 z-10 bg-white/90 hover:bg-amber-100 text-slate-500 hover:text-amber-700 p-2 rounded-full shadow-sm transition-all active:scale-95"
              title="Regenerate Image"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}

          {isImageLoading ? (
             <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
               <div className="text-center">
                 <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mb-3"></div>
                 <p className="text-amber-600/70 text-sm animate-pulse font-medium">Drawing...</p>
               </div>
             </div>
          ) : imageUrl ? (
            <div className="h-full w-full bg-slate-100 relative overflow-hidden">
               <img 
                 src={imageUrl} 
                 alt={`AI generation of ${data.word}`} 
                 className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
               />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center bg-slate-50 text-slate-400">
              <span className="text-sm">Image not available</span>
            </div>
          )}
          
          {!isImageLoading && imageUrl && (
             <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-white text-sm font-medium opacity-90">Generated via Imagen</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};