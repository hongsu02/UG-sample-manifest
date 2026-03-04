import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/store';
import { Loader2 } from 'lucide-react';

export default function Auth() {
    // mode can be 'login', 'register', or 'reset'
    const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const { user } = useAuthStore();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            // Wait for password recovery to settle so user isn't immediately bounced to dashboard
            if (!window.location.hash.includes('type=recovery') && !window.location.hash.includes('access_token=')) {
                navigate('/dashboard');
            }
        }
    }, [user, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            if (mode === 'login') {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (signInError) throw signInError;
            } else if (mode === 'register') {
                const { data, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (signUpError) throw signUpError;

                if (data.user && !data.session) {
                    setSuccessMessage('Registration successful! Please check your email to confirm your account.');
                } else if (data.session) {
                    navigate('/dashboard');
                }
            } else if (mode === 'reset') {
                const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}${window.location.pathname}`
                });
                if (resetError) throw resetError;

                setSuccessMessage('Password reset instructions have been sent to your email.');
                setMode('login'); // Option to switch back to login
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                <div>
                    <div className="flex justify-center">
                        <img
                            src="https://www.psomagen.com/hs-fs/hubfs/Psomagen_Logo_Horz-Nov-16-2021-06-28-39-09-PM.png"
                            alt="Psomagen Logo"
                            className="h-10 object-contain"
                        />
                    </div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
                        {mode === 'login' && 'Sign in to your account'}
                        {mode === 'register' && 'Create a new account'}
                        {mode === 'reset' && 'Reset your password'}
                    </h2>
                    <p className="mt-2 text-center text-sm text-slate-600">
                        Psomagen Ultima Genomics Order Portal
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative text-sm">
                            {error}
                        </div>
                    )}
                    {successMessage && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative text-sm">
                            {successMessage}
                        </div>
                    )}

                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="email-address" className="sr-only">Email address</label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                required
                                className={`appearance-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 focus:outline-none focus:ring-[#0A3D91] focus:border-[#0A3D91] focus:z-10 sm:text-sm ${mode === 'reset' ? 'rounded-md' : 'rounded-t-md'
                                    }`}
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        {mode !== 'reset' && (
                            <div>
                                <label htmlFor="password" className="sr-only">Password</label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-b-md focus:outline-none focus:ring-[#0A3D91] focus:border-[#0A3D91] focus:z-10 sm:text-sm"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    {mode === 'login' && (
                        <div className="flex items-center justify-end mt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setMode('reset');
                                    setError(null);
                                    setSuccessMessage(null);
                                }}
                                className="text-sm font-medium text-[#0A3D91] hover:text-blue-800"
                            >
                                Forgot your password?
                            </button>
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#0A3D91] hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0A3D91] disabled:opacity-70"
                        >
                            {loading && <Loader2 className="animate-spin mr-2 h-5 w-5" />}
                            {mode === 'login' && 'Sign In'}
                            {mode === 'register' && 'Sign Up'}
                            {mode === 'reset' && 'Send Reset Link'}
                        </button>
                    </div>

                    <div className="text-center flex flex-col items-center gap-2">
                        {mode === 'reset' ? (
                            <button
                                type="button"
                                className="text-[#0A3D91] hover:text-blue-800 text-sm font-medium bg-transparent border-none cursor-pointer"
                                onClick={() => {
                                    setMode('login');
                                    setError(null);
                                    setSuccessMessage(null);
                                }}
                            >
                                Back to sign in
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="text-[#0A3D91] hover:text-blue-800 text-sm font-medium bg-transparent border-none cursor-pointer"
                                onClick={() => {
                                    setMode(mode === 'login' ? 'register' : 'login');
                                    setError(null);
                                    setSuccessMessage(null);
                                }}
                            >
                                {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
