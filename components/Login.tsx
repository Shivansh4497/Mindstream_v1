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
                    <p className="mt-4 text-sm text-gray-400 max-w-sm mx-auto leading-relaxed">
                        Mindstream connects your journals, habits, goals, and conversations to help you discover patterns you might otherwise miss.
                    </p>
                </div>

                <p className="text-xs text-brand-teal/80 mb-5 px-4 text-center">
                    Mindstream gets smarter as you use it. Even a few reflections each week help uncover meaningful patterns over time.
                </p>

                {/* Auth Buttons */}
                <div className="flex flex-col items-center gap-3 w-full">
                    {/* Primary: Try a Demo */}
                    <button
                        onClick={handleTryDemo}
                        disabled={isDemoLoading}
                        className="w-full bg-white/10 border border-white/20 text-white font-bold py-3.5 px-6 rounded-xl hover:bg-white/20 active:scale-[0.98] transition-all duration-300 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 backdrop-blur-md"
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

                {/* How Mindstream Works Preview Card */}
                <div className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-5 text-left backdrop-blur-sm">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 text-center">How Mindstream Works</h3>
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0">1</div>
                            <span className="text-sm text-gray-300">Capture your thoughts</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0">2</div>
                            <span className="text-sm text-gray-300">Connect your goals, habits, and reflections</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-brand-teal/20 flex items-center justify-center text-xs font-bold text-brand-teal shrink-0">3</div>
                            <span className="text-sm text-white font-medium">Discover patterns that help you grow</span>
                        </div>
                    </div>
                </div>
            </div>

            <footer className="absolute bottom-6 text-center text-gray-500 text-sm">
                <p>By continuing, you agree to our terms of service.</p>
            </footer>
        </div>
    );
};