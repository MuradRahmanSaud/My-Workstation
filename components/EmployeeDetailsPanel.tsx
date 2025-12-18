
import React, { useState, useEffect } from 'react';
import { DiuEmployeeRow } from '../types';
import { X, User, Phone, Mail, MapPin, Globe, Linkedin, Facebook, Copy, Check, Briefcase, Hash, Pencil, Save, Undo2, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { SearchableSelect, MultiSearchableSelect } from './EditEntryModal';
import { submitSheetData, normalizeId } from '../services/sheetService';
import { SHEET_NAMES, REF_SHEET_ID } from '../constants';

interface EmployeeDetailsPanelProps {
    employee: DiuEmployeeRow;
    onClose: () => void;
    onUpdate: (data: DiuEmployeeRow) => void;
    fieldOptions?: Record<string, string[]>;
}

const getImageUrl = (link: string | undefined) => {
    if (!link) return '';
    const cleanLink = link.trim();
    
    // Google Drive direct link conversion
    if (cleanLink.includes('drive.google.com') || cleanLink.includes('docs.google.com')) {
        const idMatch = cleanLink.match(/\/d\/([^/]+)/) || cleanLink.match(/id=([^&]+)/);
        if (idMatch && idMatch[1]) {
            return `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
        }
    }
    
    // If it's a standard web link or anything else, return as is
    return cleanLink;
};

export const EmployeeDetailsPanel: React.FC<EmployeeDetailsPanelProps> = ({ employee, onClose, onUpdate, fieldOptions }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [formData, setFormData] = useState<any>({});

    useEffect(() => {
        // Reset editing state when employee selection changes
        setIsEditing(false);
        setFormData(employee || {});
    }, [employee]);

    const handleCopy = (text: string, field: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 1500);
    };

    const handleEditChange = (key: string, value: string) => {
        setFormData((prev: any) => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        // Optimistic Update
        onUpdate(formData);
        setIsEditing(false);

        // Background API Call
        (async () => {
            try {
                let result = await submitSheetData(
                    'update', 
                    SHEET_NAMES.EMPLOYEE, 
                    formData, 
                    'Employee ID', 
                    employee['Employee ID'].trim(), 
                    REF_SHEET_ID
                );

                // Fallback: If not found, attempt to ADD it
                const errorMsg = (result.message || result.error || '').toLowerCase();
                if (result.result === 'error' && (errorMsg.includes('not found') || errorMsg.includes('no match'))) {
                    result = await submitSheetData(
                        'add', 
                        SHEET_NAMES.EMPLOYEE, 
                        formData, 
                        'Employee ID', 
                        employee['Employee ID'].trim(), 
                        REF_SHEET_ID,
                        { insertMethod: 'first_empty' }
                    );
                }

                if (result.result !== 'success') {
                    console.error("Background Save Failed:", result.message);
                    alert("Failed to save changes to Google Sheet: " + (result.message || 'Unknown error'));
                }
            } catch (e) {
                console.error("Background Save Error:", e);
                alert("Network error while saving to Google Sheet.");
            }
        })();
    };

    const handleCancelEdit = () => {
        setFormData(employee);
        setIsEditing(false);
    };

    const adminDesig = employee['Administrative Designation'];
    const academicDesig = employee['Academic Designation'];
    const imgUrl = getImageUrl(employee.Photo);

    // Handle backdrop click to close on mobile
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        /* Root Container: Fixed Modal on Mobile, Static Flex Item on Desktop */
        <div 
            onClick={handleBackdropClick}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-0 md:p-0 md:static md:z-auto md:bg-transparent md:backdrop-blur-none md:flex md:h-full md:w-[320px] lg:w-[350px] shrink-0 transition-all duration-300 animate-in fade-in"
        >
            {/* 
                Mobile: Fixed 90vw width and 90vh height
                Desktop: Full height with rounded-xl corners and border on all sides to look like a card.
            */}
            <div className="w-[90vw] h-[90vh] md:w-full md:h-full md:max-w-none md:max-h-none bg-white rounded-2xl md:rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.15)] md:shadow-[0_0_20px_rgba(0,0,0,0.08)] flex flex-col overflow-hidden md:border md:border-gray-200 font-sans transform transition-all animate-in zoom-in-95 duration-200 md:animate-none">
                
                {/* Header */}
                <div className="px-5 py-4 border-b border-gray-100 bg-white shrink-0 relative flex items-center justify-between">
                    <h3 className="text-base md:text-sm font-bold text-gray-800 uppercase tracking-wide">
                        {isEditing ? 'Edit Employee' : 'Employee Details'}
                    </h3>
                    <div className="flex items-center space-x-1">
                        {isEditing ? (
                            <>
                                <button 
                                    onClick={handleSave}
                                    className="p-2 md:p-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-full transition-colors"
                                    title="Save Changes"
                                >
                                    <Save className="w-5 h-5 md:w-4 md:h-4" />
                                </button>
                                <button 
                                    onClick={handleCancelEdit}
                                    className="p-2 md:p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-full transition-colors"
                                    title="Cancel"
                                >
                                    <Undo2 className="w-5 h-5 md:w-4 md:h-4" />
                                </button>
                            </>
                        ) : (
                            <button 
                                onClick={() => setIsEditing(true)}
                                className="p-2 md:p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-full text-gray-500 transition-colors"
                                title="Edit Employee"
                            >
                                <Pencil className="w-5 h-5 md:w-4 md:h-4" />
                            </button>
                        )}
                        <button 
                            onClick={onClose}
                            className="p-2 md:p-1.5 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                            title="Close"
                        >
                            <X className="w-6 h-6 md:w-5 md:h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-4 space-y-4 thin-scrollbar bg-slate-50/50">
                    
                    {isEditing ? (
                        <div className="space-y-3 pt-1">
                            {/* Group: Basic Info */}
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm space-y-2">
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-1 mb-1">Basic Information</h4>
                                
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">Name</label>
                                    <input
                                        type="text"
                                        value={formData['Employee Name'] || ''}
                                        onChange={(e) => handleEditChange('Employee Name', e.target.value)}
                                        className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none transition-all"
                                        placeholder="Employee Name"
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <div className="flex-1 min-w-0">
                                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">Department</label>
                                        <SearchableSelect
                                            value={formData['Department'] || ''}
                                            onChange={(val) => handleEditChange('Department', val)}
                                            options={fieldOptions?.['Department'] || []}
                                            placeholder="Dept"
                                        />
                                    </div>
                                    <div className="w-[35%] min-w-[100px]">
                                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">Status</label>
                                        <SearchableSelect
                                            value={formData['Status'] || 'Active'}
                                            onChange={(val) => handleEditChange('Status', val)}
                                            options={fieldOptions?.['Status'] || ['Active', 'Inactive', 'On Leave']}
                                            placeholder="Status"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">Group</label>
                                    <MultiSearchableSelect
                                        value={formData['Group Name'] || ''}
                                        onChange={(val) => handleEditChange('Group Name', val)}
                                        options={fieldOptions?.['Group Name'] || []}
                                        placeholder="Groups"
                                    />
                                </div>
                            </div>

                            {/* Group: Designation */}
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm space-y-2">
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-1 mb-1">Designation</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase truncate">Administrative</label>
                                        <SearchableSelect
                                            value={formData['Administrative Designation'] || ''}
                                            onChange={(val) => handleEditChange('Administrative Designation', val)}
                                            options={fieldOptions?.['Administrative Designation'] || []}
                                            placeholder="Admin Role"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase truncate">Academic</label>
                                        <SearchableSelect
                                            value={formData['Academic Designation'] || ''}
                                            onChange={(val) => handleEditChange('Academic Designation', val)}
                                            options={fieldOptions?.['Academic Designation'] || []}
                                            placeholder="Acad Role"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Group: Contact */}
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm space-y-2">
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-1 mb-1">Contact Details</h4>
                                
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">Email</label>
                                    <input
                                        type="text"
                                        value={formData['E-mail'] || ''}
                                        onChange={(e) => handleEditChange('E-mail', e.target.value)}
                                        className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none transition-all"
                                        placeholder="Email Address"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">Mobile</label>
                                        <input
                                            type="text"
                                            value={formData['Mobile'] || ''}
                                            onChange={(e) => handleEditChange('Mobile', e.target.value)}
                                            className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none transition-all"
                                            placeholder="Mobile"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">IP / Ext</label>
                                        <input
                                            type="text"
                                            value={formData['IP-Ext'] || ''}
                                            onChange={(e) => handleEditChange('IP-Ext', e.target.value)}
                                            className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none transition-all"
                                            placeholder="Extension"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Group: Profile & Social */}
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm space-y-2">
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-1 mb-1">Profile & Social</h4>
                                
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">Photo URL</label>
                                    <input
                                        type="text"
                                        value={formData['Photo'] || ''}
                                        onChange={(e) => handleEditChange('Photo', e.target.value)}
                                        className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none transition-all"
                                        placeholder="Google Drive or Web Image Link"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">Facebook</label>
                                        <input
                                            type="text"
                                            value={formData['Facebook'] || ''}
                                            onChange={(e) => handleEditChange('Facebook', e.target.value)}
                                            className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none transition-all"
                                            placeholder="Username/URL"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">LinkedIn</label>
                                        <input
                                            type="text"
                                            value={formData['Linkedin'] || ''}
                                            onChange={(e) => handleEditChange('Linkedin', e.target.value)}
                                            className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none transition-all"
                                            placeholder="Username/URL"
                                        />
                                    </div>
                                </div>
                            </div>

                        </div>
                    ) : (
                        <>
                            {/* Profile Header */}
                            <div className="flex flex-col items-center text-center">
                                <div className="w-32 h-32 md:w-24 md:h-24 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gray-100 mb-4 relative group ring-1 ring-gray-200">
                                    {imgUrl ? (
                                        <img 
                                            src={imgUrl} 
                                            alt={employee['Employee Name']} 
                                            className="w-full h-full object-cover" 
                                            referrerPolicy="no-referrer"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = 'none';
                                                target.nextElementSibling?.classList.remove('hidden');
                                            }}
                                        />
                                    ) : null}
                                    <div className={`w-full h-full flex items-center justify-center text-gray-300 ${imgUrl ? 'hidden' : ''}`}>
                                        <User className="w-16 h-16 md:w-10 md:h-10" />
                                    </div>
                                </div>
                                <h2 className="text-2xl md:text-xl font-bold text-gray-900 leading-tight mb-2 px-2">{employee['Employee Name']}</h2>
                                
                                <div className="space-y-1 w-full px-2">
                                    {adminDesig && (
                                        <p className="text-lg md:text-sm text-blue-600 font-bold leading-tight">{adminDesig}</p>
                                    )}
                                    {academicDesig && (
                                        <p className={`text-lg md:text-sm leading-tight ${adminDesig ? 'text-gray-600 font-medium' : 'text-blue-600 font-bold'}`}>
                                            {academicDesig}
                                        </p>
                                    )}
                                </div>

                                <div className="mt-4 inline-flex items-center px-3 py-1.5 md:px-2.5 md:py-1 rounded text-sm md:text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200 uppercase tracking-wider">
                                    {employee['Group Name'] || 'Employee'}
                                </div>
                            </div>

                            {/* Info Groups */}
                            <div className="space-y-4 md:space-y-3">
                                
                                {/* Basic Info */}
                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:p-4">
                                    <div className="space-y-4 md:space-y-3">
                                        <div className="flex items-start group">
                                            <Briefcase className="w-6 h-6 md:w-4 md:h-4 text-gray-400 mt-1 md:mt-0.5 mr-4 md:mr-3 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs md:text-[10px] text-gray-500 uppercase font-bold tracking-wide">Department</p>
                                                <p className="text-lg md:text-sm font-medium text-gray-800 leading-tight mt-1 md:mt-0.5">{employee.Department || '-'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start group">
                                            <Hash className="w-6 h-6 md:w-4 md:h-4 text-gray-400 mt-1 md:mt-0.5 mr-4 md:mr-3 shrink-0" />
                                            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleCopy(employee['Employee ID'], 'id')}>
                                                <p className="text-xs md:text-[10px] text-gray-500 uppercase font-bold tracking-wide flex items-center">
                                                    ID
                                                    {copiedField === 'id' && <Check className="w-4 h-4 md:w-3 md:h-3 ml-1 text-green-600" />}
                                                </p>
                                                <p className="text-lg md:text-sm font-mono font-medium text-gray-800 mt-1 md:mt-0.5">{employee['Employee ID']}</p>
                                            </div>
                                            <button 
                                                onClick={() => handleCopy(employee['Employee ID'], 'id')}
                                                className="p-1 text-gray-300 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Copy className="w-5 h-5 md:w-4 md:h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Contact Info */}
                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:p-4">
                                    <h4 className="text-sm md:text-xs font-bold text-gray-900 mb-4 md:mb-3 pb-2 border-b border-gray-100">Contact Information</h4>
                                    <div className="space-y-5 md:space-y-4">
                                        <div className="flex items-start group">
                                            <a 
                                                href={employee.Mobile ? `tel:${employee.Mobile}` : undefined}
                                                className={`flex items-start flex-1 min-w-0 mr-2 ${employee.Mobile ? 'hover:opacity-70 transition-opacity cursor-pointer' : ''}`}
                                            >
                                                <Phone className="w-6 h-6 md:w-4 md:h-4 text-blue-500 mt-1 md:mt-0.5 mr-4 md:mr-3 shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs md:text-[10px] text-gray-500 uppercase font-bold tracking-wide">Mobile</p>
                                                    <p className="text-lg md:text-sm font-medium text-gray-800 mt-1 md:mt-0.5">{employee.Mobile || '-'}</p>
                                                </div>
                                            </a>
                                            <button 
                                                onClick={() => handleCopy(employee.Mobile, 'mobile')}
                                                className="p-1 text-gray-300 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                                                title="Copy Mobile"
                                            >
                                                {copiedField === 'mobile' ? <Check className="w-5 h-5 md:w-4 md:h-4 text-green-600" /> : <Copy className="w-5 h-5 md:w-4 md:h-4" />}
                                            </button>
                                        </div>

                                        <div className="flex items-start group">
                                            <a 
                                                href={employee['E-mail'] ? `mailto:${employee['E-mail']}` : undefined}
                                                className={`flex items-start flex-1 min-w-0 mr-2 ${employee['E-mail'] ? 'hover:opacity-70 transition-opacity cursor-pointer' : ''}`}
                                            >
                                                <Mail className="w-6 h-6 md:w-4 md:h-4 text-orange-500 mt-1 md:mt-0.5 mr-4 md:mr-3 shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs md:text-[10px] text-gray-500 uppercase font-bold tracking-wide">Email</p>
                                                    <p className="text-lg md:text-sm font-medium text-gray-800 break-all mt-1 md:mt-0.5">{employee['E-mail'] || '-'}</p>
                                                </div>
                                            </a>
                                            <button 
                                                onClick={() => handleCopy(employee['E-mail'], 'email')}
                                                className="p-1 text-gray-300 hover:text-orange-600 transition-colors opacity-0 group-hover:opacity-100"
                                                title="Copy Email"
                                            >
                                                {copiedField === 'email' ? <Check className="w-5 h-5 md:w-4 md:h-4 text-green-600" /> : <Copy className="w-5 h-5 md:w-4 md:h-4" />}
                                            </button>
                                        </div>

                                        <div className="flex items-start">
                                            <Globe className="w-6 h-6 md:w-4 md:h-4 text-purple-500 mt-1 md:mt-0.5 mr-4 md:mr-3 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs md:text-[10px] text-gray-500 uppercase font-bold tracking-wide">IP Extension</p>
                                                <p className="text-lg md:text-sm font-mono font-medium text-gray-800 mt-1 md:mt-0.5">{employee['IP-Ext'] || '-'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Socials */}
                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:p-4">
                                    <h4 className="text-sm md:text-xs font-bold text-gray-900 mb-4 md:mb-3 pb-2 border-b border-gray-100">Social & Assets</h4>
                                    <div className="flex flex-col space-y-3 md:space-y-2">
                                        {employee.Linkedin && (
                                            <a href={employee.Linkedin} target="_blank" rel="noreferrer" className="flex items-center text-sm md:text-xs text-gray-600 hover:text-blue-700 hover:bg-blue-50 p-2.5 md:p-2 rounded-lg transition-colors group border border-transparent hover:border-blue-100">
                                                <Linkedin className="w-5 h-5 md:w-4 md:h-4 text-blue-700 mr-3" />
                                                <span className="truncate flex-1 font-medium">{employee.Linkedin.replace(/^https?:\/\/(www\.)?/, '')}</span>
                                                <ArrowUpRight className="w-4 h-4 md:w-3.5 md:h-3.5 opacity-30 group-hover:opacity-100 transition-opacity" />
                                            </a>
                                        )}
                                        {employee.Facebook && (
                                            <a href={employee.Facebook} target="_blank" rel="noreferrer" className="flex items-center text-sm md:text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 p-2.5 md:p-2 rounded-lg transition-colors group border border-transparent hover:border-blue-100">
                                                <Facebook className="w-5 h-5 md:w-4 md:h-4 text-blue-600 mr-3" />
                                                <span className="truncate flex-1 font-medium">{employee.Facebook.replace(/^https?:\/\/(www\.)?/, '')}</span>
                                                <ArrowUpRight className="w-4 h-4 md:w-3.5 md:h-3.5 opacity-30 group-hover:opacity-100 transition-opacity" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const ArrowUpRight = ({ className }: { className?: string }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="24" height="24" viewBox="0 0 24 24" 
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
        className={className}
    >
        <path d="M7 17L17 7" />
        <path d="M7 7h10v10" />
    </svg>
);
