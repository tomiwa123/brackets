
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
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/90 backdrop-blur-md z-[60]"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 m-auto w-full max-w-md h-fit bg-black border-2 border-orange-500/50 rounded-2xl p-6 z-[70] shadow-[0_0_50px_rgba(249,115,22,0.3)] max-h-[90vh] overflow-y-auto custom-scrollbar"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-600 uppercase tracking-wider transform -skew-x-6">
                                Settings
                            </h2>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Model Selection */}
                            <div className="space-y-4 p-4 bg-gray-900/50 rounded-xl border border-white/10">
                                <label className="text-sm font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2">
                                    <Bot className="w-4 h-4" /> AI Model
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setProvider('gemini')}
                                        className={`p - 3 rounded - lg border transition - all flex flex - col items - center gap - 2 ${provider === 'gemini'
                                                ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                                                : 'bg-black border-white/10 text-slate-500 hover:bg-white/5'
                                            } `}
                                    >
                                        <span className="font-bold">Gemini</span>
                                        <span className="text-[10px] uppercase opacity-70">Fast & Free</span>
                                    </button>
                                    <button
                                        onClick={() => setProvider('openai')}
                                        className={`p - 3 rounded - lg border transition - all flex flex - col items - center gap - 2 ${provider === 'openai'
                                                ? 'bg-green-500/20 border-green-500 text-green-400'
                                                : 'bg-black border-white/10 text-slate-500 hover:bg-white/5'
                                            } `}
                                    >
                                        <span className="font-bold">GPT-4o</span>
                                        <span className="text-[10px] uppercase opacity-70">High Quality</span>
                                    </button>
                                </div>
                            </div>

                            {/* API Keys */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                                        {provider === 'gemini' ? 'Gemini API Key' : 'OpenAI API Key'}
                                    </label>
                                    <div className="relative">
                                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <input
                                            type="password"
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            placeholder={`Enter ${provider === 'gemini' ? 'Gemini' : 'OpenAI'} Key`}
                                            className="w-full pl-10 pr-4 py-3 bg-black border border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-white placeholder-slate-600 transition-all"
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        Keys are stored locally in your browser.
                                    </p>
                                </div>

                                <div className="h-px bg-white/10 my-4" />

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                        <Search className="w-4 h-4" /> Google Search (Optional)
                                    </label>
                                    <div className="space-y-3">
                                        <input
                                            type="password"
                                            value={googleKey}
                                            onChange={(e) => setGoogleKey(e.target.value)}
                                            placeholder="Google Custom Search API Key"
                                            className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-white placeholder-slate-600 transition-all"
                                        />
                                        <input
                                            type="text"
                                            value={googleCx}
                                            onChange={(e) => setGoogleCx(e.target.value)}
                                            placeholder="Search Engine ID (cx)"
                                            className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-white placeholder-slate-600 transition-all"
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        Enable "Real Images" instead of AI generation.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8">
                            <button
                                onClick={handleSave}
                                className="w-full py-3 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:bg-orange-400 transition-colors flex items-center justify-center gap-2"
                            >
                                <Save className="w-5 h-5" />
                                Done
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
