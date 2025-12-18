
import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';

export const SettingsView: React.FC = () => {
    return (
        <div className="p-4 md:p-8 h-full overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <SettingsIcon className="w-6 h-6 mr-2 text-gray-600" />
                Settings
            </h2>

            <div className="grid gap-6 max-w-5xl">
                
                {/* App Config Section */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Application Preferences</h3>
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                        <span className="text-sm font-medium">Compact Mode</span>
                        <div className="w-10 h-5 bg-blue-600 rounded-full relative cursor-pointer">
                            <div className="w-3 h-3 bg-white rounded-full absolute right-1 top-1"></div>
                        </div>
                    </div>
                </div>
                
            </div>
        </div>
    );
};
