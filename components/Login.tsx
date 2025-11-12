import React from 'react';
import { useAuth } from '../context/AuthContext';
import { GoogleIcon } from './icons/GoogleIcon';

export const Login: React.FC = () => {
    const { loginWithGoogle } = useAuth();
    
    return (
        <div className="h-screen w-screen bg-brand-indigo text-white flex flex-col items-center justify-center p-4 animate-fade-in">
            <div className="text-center">
                <h1 className="text-5xl font-bold font-display mb-2">Mindstream</h1>
                <p className="text-xl text-gray-300 mb-12">Your thoughts. Finally understood.</p>

                <div className="flex flex-col items-center">
                    <button
                        onClick={loginWithGoogle}
                        className="bg-white text-black font-bold py-3 px-6 rounded-lg hover:bg-gray-200 transition-all duration-300 shadow-lg flex items-center gap-3 mx-auto"
                    >
                        <GoogleIcon className="w-6 h-6" />
                        Continue with Google
                    </button>
                </div>
            </div>
            <footer className="absolute bottom-6 text-center text-gray-500 text-sm">
                <p>By continuing, you agree to our terms of service.</p>
            </footer>
        </div>
    );
};