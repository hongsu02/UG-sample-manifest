import { Outlet, Link, useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard, Settings } from 'lucide-react';
import { useAuthStore } from '../lib/store';
import { supabase } from '../lib/supabase';

export default function Layout() {
    const { user, profile } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center">
                                <Link to="/dashboard" className="text-xl font-bold text-[#0A3D91] flex items-center gap-3">
                                    <img src="https://www.psomagen.com/hs-fs/hubfs/Psomagen_Logo_Horz-Nov-16-2021-06-28-39-09-PM.png" alt="Psomagen Logo" className="h-7 object-contain" />
                                    <span className="text-slate-800 border-l-2 border-slate-300 pl-3">UG Order Portal</span>
                                </Link>
                            </div>
                            <nav className="ml-6 flex items-center space-x-4">
                                <Link to="/dashboard" className="text-slate-600 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2">
                                    <LayoutDashboard size={18} />
                                    Dashboard
                                </Link>
                                {profile?.role === 'admin' && (
                                    <Link to="/admin" className="text-slate-600 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2">
                                        <Settings size={18} />
                                        Admin
                                    </Link>
                                )}
                            </nav>
                        </div>

                        <div className="flex items-center gap-4">
                            <span className="text-sm text-slate-500 hidden sm:block">
                                {profile?.full_name || user?.email}
                            </span>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 text-slate-500 hover:text-red-600 px-3 py-2 text-sm font-medium transition-colors"
                            >
                                <LogOut size={18} />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Outlet />
            </main>

            <footer className="bg-white border-t border-slate-200 mt-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <p className="text-center text-sm text-slate-500">
                        &copy; {new Date().getFullYear()} Psomagen. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}
