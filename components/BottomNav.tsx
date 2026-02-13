import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Home, Zap, Menu } from 'lucide-react';

interface BottomNavProps {
    onBack: () => void;
    onHome: () => void;
    onQuickAccess: () => void;
    onToggleMenu: () => void;
    activeView: string;
}

const BottomNav: React.FC<BottomNavProps> = ({
    onBack,
    onHome,
    onQuickAccess,
    onToggleMenu,
    activeView
}) => {
    return (
        <motion.div
            initial={{ y: 150, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed bottom-0 left-0 right-0 z-[100] w-full flex justify-center pb-4"
        >
            <div
                className="rounded-[40px] px-6 py-3 flex items-center justify-center gap-4"
                style={{
                    background: 'hsl(9, 30%, 18%)',
                    boxShadow: '0 15px 30px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)',
                }}
            >
                {/* Back Button */}
                <button
                    onClick={onBack}
                    className="group relative rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95"
                    style={{
                        width: '60px',
                        height: '60px',
                        background: '#f1f2f6',
                    }}
                >
                    <ChevronRight size={24} className="text-gray-700 group-hover:text-gray-900 transition-colors" />
                </button>

                {/* Home Button */}
                <button
                    onClick={onHome}
                    className="group relative rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95"
                    style={{
                        width: '60px',
                        height: '60px',
                        background: activeView === 'dashboard' ? 'hsl(9, 80%, 60%)' : '#f1f2f6',
                        boxShadow: activeView === 'dashboard'
                            ? '0 4px 0 hsl(9, 80%, 40%), 0 15px 25px hsl(9, 80%, 50%)'
                            : 'none',
                        transform: activeView === 'dashboard' ? 'translateY(-8px)' : 'translateY(0)',
                    }}
                >
                    <Home
                        size={24}
                        strokeWidth={2.5}
                        className={activeView === 'dashboard' ? 'text-white' : 'text-gray-700 group-hover:text-gray-900 transition-colors'}
                    />
                </button>

                {/* Quick Access Button */}
                <button
                    onClick={onQuickAccess}
                    className="group relative rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95"
                    style={{
                        width: '60px',
                        height: '60px',
                        background: '#f1f2f6',
                    }}
                >
                    <Zap size={24} className="text-gray-700 group-hover:text-amber-500 transition-colors" />
                </button>

                {/* Menu Button */}
                <button
                    onClick={onToggleMenu}
                    className="group relative rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95"
                    style={{
                        width: '60px',
                        height: '60px',
                        background: '#f1f2f6',
                    }}
                >
                    <Menu size={24} className="text-gray-700 group-hover:text-emerald-500 transition-all group-hover:rotate-90" />
                </button>
            </div>
        </motion.div>
    );
};

export default BottomNav;