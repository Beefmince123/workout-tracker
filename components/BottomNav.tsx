'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Dumbbell, User } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;
  const activeColor = 'text-blue-500';
  const inactiveColor = 'text-gray-500';

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 border-t border-gray-800 px-4 py-2 max-w-md mx-auto">
      <div className="flex justify-around items-center h-20">
        {/* Home */}
        <Link
          href="/"
          className={`flex flex-col items-center gap-1 flex-1 py-2 transition-colors ${
            isActive('/') ? activeColor : inactiveColor
          }`}
        >
          <Home size={24} strokeWidth={isActive('/') ? 2.5 : 1.6} />
          <span className={`text-xs font-600 ${isActive('/') ? 'font-700' : 'font-600'}`}>
            Home
          </span>
        </Link>

        {/* Workout */}
        <Link
          href="/workout"
          className={`flex flex-col items-center gap-1 flex-1 py-2 transition-colors ${
            isActive('/workout') ? activeColor : inactiveColor
          }`}
        >
          <Dumbbell size={24} strokeWidth={isActive('/workout') ? 2.5 : 1.6} />
          <span className={`text-xs font-600 ${isActive('/workout') ? 'font-700' : 'font-600'}`}>
            Workout
          </span>
        </Link>

        {/* Profile */}
        <Link
          href="/profile"
          className={`flex flex-col items-center gap-1 flex-1 py-2 transition-colors ${
            isActive('/profile') ? activeColor : inactiveColor
          }`}
        >
          <User size={24} strokeWidth={isActive('/profile') ? 2.5 : 1.6} />
          <span className={`text-xs font-600 ${isActive('/profile') ? 'font-700' : 'font-600'}`}>
            Profile
          </span>
        </Link>
      </div>
    </div>
  );
}
