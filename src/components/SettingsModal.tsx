
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Key, Search, Bot } from 'lucide-react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const [apiKey, setApiKey] = useState('');
    const [provider, setProvider] = useState<'gemini' | 'openai'>('gemini');
    const [googleKey, setGoogleKey] = useState('');
    const [googleCx, setGoogleCx] = useState('');

    useEffect(() => {
        const storedKey = localStorage.getItem('llm_api_key');
        const storedProvider = localStorage.getItem('llm_provider') as 'gemini' | 'openai';
        const storedGoogleKey = localStorage.getItem('google_search_key');
        const storedGoogleCx = localStorage.getItem('google_search_cx');

        if (storedKey) setApiKey(storedKey);
        if (storedProvider) setProvider(storedProvider);
        if (storedGoogleKey) setGoogleKey(storedGoogleKey);
        if (storedGoogleCx) setGoogleCx(storedGoogleCx);
    }, [isOpen]);

    const handleSave = () => {
        const trimmedKey = apiKey.trim();
        const trimmedGoogleKey = googleKey.trim();
        const trimmedGoogleCx = googleCx.trim();

        localStorage.setItem('llm_api_key', trimmedKey);
        localStorage.setItem('llm_provider', provider);
        localStorage.setItem('google_search_key', trimmedGoogleKey);
        localStorage.setItem('google_search_cx', trimmedGoogleCx);

        setApiKey(trimmedKey);
        setGoogleKey(trimmedGoogleKey);
        setGoogleCx(trimmedGoogleCx);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 text-left">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-2xl bg-[#0f172a] border-2 border-slate-700/50 rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col max-h-[85vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex justify-between items-start px-[4rem] py-8 border-b border-white/5 bg-black/20 shrink-0">
                            <div>
                                <h2 className="text-3xl font-black italic text-white uppercase tracking-wider flex items-center gap-3">
                                    <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-transparent bg-clip-text">Game Settings</span>
                                </h2>
                                <p className="text-slate-400 text-sm mt-2 font-medium">Configure AI providers and integration keys</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-3 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white group"
                            >
                                <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="overflow-y-auto custom-scrollbar flex-1">
                            <div className="px-[4rem] py-10 space-y-10">
                                {/* Model Selection */}
                                <div className="space-y-6">
                                    <label className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                        <Bot className="w-4 h-4 text-orange-400" /> AI Provider
                                    </label>
                                    <div className="grid grid-cols-2 gap-6">
                                        <button
                                            onClick={() => setProvider('gemini')}
                                            className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 relative overflow-hidden group ${provider === 'gemini'
                                                ? 'bg-orange-500/10 border-orange-500 text-orange-400 ring-4 ring-orange-500/10'
                                                : 'bg-black/30 border-white/5 text-slate-400 hover:bg-white/5 hover:border-white/10'
                                                }`}
                                        >
                                            <div className="flex flex-col items-center gap-2 relative z-10 w-full">
                                                <div className="font-black text-2xl tracking-tight">Gemini</div>
                                                <div className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full ${provider === 'gemini' ? 'bg-orange-500 text-black' : 'bg-white/10 text-slate-300'
                                                    }`}>Fast & Free</div>
                                            </div>
                                            {provider === 'gemini' && (
                                                <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/20 via-transparent to-transparent pointer-events-none" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => setProvider('openai')}
                                            className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 relative overflow-hidden group ${provider === 'openai'
                                                ? 'bg-green-500/10 border-green-500 text-green-400 ring-4 ring-green-500/10'
                                                : 'bg-black/30 border-white/5 text-slate-400 hover:bg-white/5 hover:border-white/10'
                                                }`}
                                        >
                                            <div className="flex flex-col items-center gap-2 relative z-10 w-full">
                                                <div className="font-black text-2xl tracking-tight">GPT-4o</div>
                                                <div className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full ${provider === 'openai' ? 'bg-green-500 text-black' : 'bg-white/10 text-slate-300'
                                                    }`}>High Quality</div>
                                            </div>
                                            {provider === 'openai' && (
                                                <div className="absolute inset-0 bg-gradient-to-tr from-green-500/20 via-transparent to-transparent pointer-events-none" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="h-px bg-white/5 w-full" />

                                {/* API Keys */}
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <label className="text-sm font-bold text-slate-300 uppercase tracking-widest block">
                                            {provider === 'gemini' ? 'Gemini API Key' : 'OpenAI API Key'}
                                        </label>
                                        <div className="relative group">
                                            <Key className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-orange-400 transition-colors" />
                                            <input
                                                type="password"
                                                value={apiKey}
                                                onChange={(e) => setApiKey(e.target.value)}
                                                placeholder={`Paste your ${provider === 'gemini' ? 'Gemini' : 'OpenAI'} API Key here`}
                                                className="w-full pl-14 pr-6 py-5 bg-black/40 border-2 border-white/10 rounded-2xl focus:border-orange-500 outline-none text-white placeholder-slate-600 transition-all font-mono text-base shadow-inner"
                                            />
                                        </div>
                                        <p className="text-xs text-slate-500 pl-2 font-medium">
                                            Your key is stored locally in your browser and never sent to our servers.
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                                <Search className="w-4 h-4 text-blue-400" /> Google Search
                                            </label>
                                            <span className="text-slate-500 text-xs font-medium uppercase tracking-wide bg-white/5 px-2 py-1 rounded">Optional</span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <input
                                                type="password"
                                                value={googleKey}
                                                onChange={(e) => setGoogleKey(e.target.value)}
                                                placeholder="Google Custom Search API Key"
                                                className="w-full px-5 py-4 bg-black/40 border-2 border-white/10 rounded-2xl focus:border-blue-500 outline-none text-white placeholder-slate-600 transition-all font-mono text-sm"
                                            />
                                            <input
                                                type="text"
                                                value={googleCx}
                                                onChange={(e) => setGoogleCx(e.target.value)}
                                                placeholder="Search Engine ID (cx)"
                                                className="w-full px-5 py-4 bg-black/40 border-2 border-white/10 rounded-2xl focus:border-blue-500 outline-none text-white placeholder-slate-600 transition-all font-mono text-sm"
                                            />
                                        </div>
                                        <p className="text-xs text-slate-500 pl-2 font-medium">
                                            Required only if you want real images instead of AI-generated content.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-[4rem] py-7 border-t border-white/5 bg-black/20 flex justify-end shrink-0">
                            <button
                                onClick={handleSave}
                                className="px-10 py-4 bg-white hover:bg-orange-50 text-black font-black uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center gap-3 text-lg"
                            >
                                <Save className="w-5 h-5" />
                                Save Settings
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
