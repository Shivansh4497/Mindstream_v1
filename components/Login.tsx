import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GoogleIcon } from './icons/GoogleIcon';
import { Sparkles, FlaskConical } from 'lucide-react';

export const Login: React.FC = () => {
    const { loginWithGoogle, loginAsDemo } = useAuth();
    const [isDemoLoading, setIsDemoLoading] = useState(false);

    const handleTryDemo = async () => {
        setIsDemoLoading(true);
        try {
            await loginAsDemo();
        } catch (error) {
            console.error('Failed to start demo:', error);
            setIsDemoLoading(false);
        }
    };

    return (
        <div className="h-screen w-screen bg-brand-indigo text-white flex flex-col items-center justify-center p-4 animate-fade-in">
            <div className="text-center max-w-sm w-full">
                {/* Logo & Tagline */}
                <div className="mb-10">
                    <div className="flex items-center justify-center gap-2 mb-3">
                        <img src="/mindstream-logo.svg" alt="Mindstream" className="w-12 h-12" />
                        <h1 className="text-5xl font-bold font-display">Mindstream</h1>
                    </div>
                    <p className="text-xl text-gray-300">Your thoughts. Finally understood.</p>
                </div>

                {/* Auth Buttons */}
                <div className="flex flex-col items-center gap-3 w-full">
                    {/* Primary: Try a Demo */}
                    <button
                        onClick={handleTryDemo}
                        disabled={isDemoLoading}
                        className="w-full bg-brand-teal text-white font-bold py-3.5 px-6 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all duration-300 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isDemoLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Setting up demo...
                            </>
                        ) : (
                            <>
                                <FlaskConical className="w-4 h-4" />
                                Try a Demo
                            </>
                        )}
                    </button>
                    <p className="text-xs text-gray-400 mt-1">
                        No account needed · See the AI in action
                    </p>

                    {/* Divider */}
                    <div className="flex items-center gap-3 w-full my-2">
                        <div className="flex-1 h-px bg-white/10" />
                        <span className="text-xs text-gray-500 uppercase tracking-wider">OR</span>
                        <div className="flex-1 h-px bg-white/10" />
                    </div>

                    {/* Secondary: Google Sign In */}
                    <button
                        onClick={loginWithGoogle}
                        className="w-full bg-transparent text-white font-bold py-3.5 px-6 rounded-xl border border-white/20 hover:bg-white/5 hover:border-white/30 transition-all duration-300 shadow-md flex items-center justify-center gap-3"
                    >
                        <GoogleIcon className="w-5 h-5" />
                        Continue with Google
                    </button>
                </div>

                {/* Feature Highlights */}
                <div className="mt-10 grid grid-cols-3 gap-4 text-center">
                    <div className="flex flex-col items-center gap-1.5">
                        <Sparkles className="w-5 h-5 text-brand-teal" />
                        <span className="text-xs text-gray-400">AI Insights</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                        <svg className="w-5 h-5 text-brand-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                        </svg>
                        <span className="text-xs text-gray-400">Journaling</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                        <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                        </svg>
                        <span className="text-xs text-gray-400">Habit Tracking</span>
                    </div>
                </div>
            </div>

            <footer className="absolute bottom-6 text-center text-gray-500 text-sm">
                <p>By continuing, you agree to our terms of service.</p>
            </footer>
        </div>
    );
};