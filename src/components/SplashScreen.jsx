import React from 'react';

export default function SplashScreen() {
    return (
        <div className="fixed inset-0 bg-gray-900 flex flex-col items-center justify-center z-50">
            {/* Add your logo here */}
            <div >
                <img src='logo.jpg' className="w-50 h-50 mb-8 bg-white rounded-full flex items-center justify-center" />
            </div>

            <h1 className="text-3xl font-bold text-white mb-8">SQLite Master</h1>

            <div className="space-y-4 text-center">
                <a
                    href="https://www.facebook.com/fuxdevsinc2"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-blue-400 hover:text-blue-300"
                >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    <span>Follow us on Facebook</span>
                </a>

                <a
                    href="https://www.youtube.com/@fuxdevs-devjl"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-red-500 hover:text-red-400"
                >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                    <span>Subscribe to our YouTube</span>
                </a>
            </div>
        </div>
    );
}