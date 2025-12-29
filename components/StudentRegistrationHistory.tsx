import React, { useState, useMemo } from 'react';
import { History, ChevronRight, User, Mail, Phone, ArrowLeft, GraduationCap, Award, BookOpen, Clock, CheckCircle2 } from 'lucide-react';

const DUMMY_COURSE_DETAILS = [
    { 
        code: 'CSE101', 
        title: 'Introduction to Computer Science', 
        section: 'A', 
        credit: '3.0',
        grade: 'A+',
        gpa: '4.00', 
        attend: '92%',
        teacher: {
            name: 'Dr. Md. Ismail Hossain',
            designation: 'Associate Professor',
            email: 'ismail.cse@diu.edu.bd',
            mobile: '01711223344',
            photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
        }
    },
    { 
        code: 'CSE102', 
        title: 'Discrete Mathematics', 
        section: 'B', 
        credit: '3.0',
        grade: 'A',
        gpa: '3.75', 
        attend: '85%',
        teacher: {
            name: 'Ms. Fahmida Sultana',
            designation: 'Assistant Professor',
            email: 'fahmida.cse@diu.edu.bd',
            mobile: '01811223344',
            photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
        }
    },
    { 
        code: 'ENG101', 
        title: 'English Composition', 
        section: 'C1', 
        credit: '2.0',
        grade: 'A-',
        gpa: '3.50', 
        attend: '100%',
        teacher: {
            name: 'John Doe',
            designation: 'Senior Lecturer',
            email: 'john.doe@diu.edu.bd',
            mobile: '01911223344',
            photo: ''
        }
    },
    { 
        code: 'MAT101', 
        title: 'Calculus I', 
        section: 'D', 
        credit: '3.0',
        grade: 'B+',
        gpa: '3.25', 
        attend: '80%',
        teacher: {
            name: 'Dr. Sarah Smith',
            designation: 'Professor',
            email: 'sarah.mat@diu.edu.bd',
            mobile: '01511223344',
            photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
        }
    },
];

interface RegistrationHistoryProps {
    historyData: any[];
}

export const StudentRegistrationHistory: React.FC<RegistrationHistoryProps> = ({ historyData }) => {
    const [expandedSem, setExpandedSem] = useState<string | null>(null);
    const [selectedCourse, setSelectedCourse] = useState<any | null>(null);

    // Calculate average attendance from dummy data
    const avgAttendance = useMemo(() => {
        const total = DUMMY_COURSE_DETAILS.reduce((acc, curr) => {
            const val = parseInt(curr.attend.replace('%', ''), 10);
            return acc + (isNaN(val) ? 0 : val);
        }, 0);
        return (total / DUMMY_COURSE_DETAILS.length).toFixed(1);
    }, []);

    const handleCourseClick = (course: any) => {
        setSelectedCourse(course);
    };

    const handleBackToList = () => {
        setSelectedCourse(null);
    };

    return (
        <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden flex flex-col h-full relative">
            {/* Main Header */}
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
                <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest flex items-center">
                    <History className="w-3.5 h-3.5 mr-1.5 text-blue-600" /> Registration History
                </h4>
            </div>

            {/* Course Details Panel Overlay */}
            <div className={`absolute inset-0 z-50 bg-white flex flex-col transition-transform duration-300 transform ${selectedCourse ? 'translate-y-0' : 'translate-y-full'}`}>
                {selectedCourse && (
                    <>
                        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center shrink-0">
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-black text-slate-900 leading-tight truncate">{selectedCourse.title}</h3>
                                <div className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">Course Details</div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-5 thin-scrollbar">
                            {/* Metadata Grid */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-blue-50/50 p-2 rounded border border-blue-100 flex flex-col items-center">
                                    <span className="text-[8px] font-black text-blue-400 uppercase tracking-tighter mb-1">Code</span>
                                    <span className="text-[11px] font-bold text-blue-800">{selectedCourse.code}</span>
                                </div>
                                <div className="bg-slate-50 p-2 rounded border border-slate-200 flex flex-col items-center">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-1">Section</span>
                                    <span className="text-[11px] font-bold text-slate-800">{selectedCourse.section}</span>
                                </div>
                                <div className="bg-slate-50 p-2 rounded border border-slate-200 flex flex-col items-center">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-1">Credit</span>
                                    <span className="text-[11px] font-bold text-slate-800">{selectedCourse.credit}</span>
                                </div>
                                <div className="bg-emerald-50/50 p-2 rounded border border-emerald-100 flex flex-col items-center">
                                    <span className="text-[8px] font-black text-emerald-400 uppercase tracking-tighter mb-1">Grade</span>
                                    <span className="text-[11px] font-bold text-emerald-800">{selectedCourse.grade}</span>
                                </div>
                                <div className="bg-emerald-50/50 p-2 rounded border border-emerald-100 flex flex-col items-center">
                                    <span className="text-[8px] font-black text-emerald-400 uppercase tracking-tighter mb-1">GPA</span>
                                    <span className="text-[11px] font-bold text-emerald-800">{selectedCourse.gpa}</span>
                                </div>
                                <div className="bg-purple-50/50 p-2 rounded border border-purple-100 flex flex-col items-center">
                                    <span className="text-[8px] font-black text-purple-400 uppercase tracking-tighter mb-1">Attendance</span>
                                    <span className="text-[11px] font-bold text-purple-800">{selectedCourse.attend}</span>
                                </div>
                            </div>

                            {/* Teacher Info Card */}
                            <div className="space-y-2">
                                <div className="flex items-center space-x-2 text-slate-400 border-b border-slate-100 pb-1.5 mb-2">
                                    <User className="w-3 h-3" />
                                    <h4 className="text-[9px] font-black uppercase tracking-widest">Course Teacher</h4>
                                </div>
                                <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm flex items-start space-x-4">
                                    <div className="w-14 h-14 rounded-full bg-slate-100 border-2 border-white shadow-sm ring-1 ring-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                                        {selectedCourse.teacher.photo ? (
                                            <img src={selectedCourse.teacher.photo} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-6 h-6 text-slate-300" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-bold text-slate-900 leading-tight mb-1">{selectedCourse.teacher.name}</h4>
                                        <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-tight mb-3">{selectedCourse.teacher.designation}</p>
                                        
                                        <div className="space-y-1.5">
                                            <div className="flex items-center text-[10px] text-slate-600">
                                                <Mail className="w-3 h-3 mr-2 text-slate-400" />
                                                <span className="truncate">{selectedCourse.teacher.email}</span>
                                            </div>
                                            <div className="flex items-center text-[10px] text-slate-600">
                                                <Phone className="w-3 h-3 mr-2 text-slate-400" />
                                                <span>{selectedCourse.teacher.mobile}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Action */}
                        <div className="p-4 border-t border-slate-100 bg-white shrink-0">
                            <button 
                                onClick={handleBackToList}
                                className="w-full py-2.5 text-[10px] font-black text-white uppercase tracking-widest bg-blue-600 border border-blue-700 rounded-lg hover:bg-blue-700 active:scale-[0.98] shadow-md hover:shadow-lg transition-all flex items-center justify-center"
                            >
                                <ArrowLeft className="w-3.5 h-3.5 mr-2" /> Back to History
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Registration Table */}
            <div className="flex-1 overflow-y-auto thin-scrollbar relative bg-white">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-700 sticky top-0 z-20 shadow-sm">
                        <tr>
                            <th className="px-3 py-2 text-[9px] font-black text-white uppercase border-r border-slate-600">Semester</th>
                            <th className="px-2 py-2 text-[9px] font-black text-white uppercase border-r border-slate-600 text-center">Cr. T</th>
                            <th className="px-2 py-2 text-[9px] font-black text-white uppercase border-r border-slate-600 text-center">Cr. C</th>
                            <th className="px-2 py-2 text-[9px] font-black text-white uppercase border-r border-slate-600 text-center">SGPA</th>
                            <th className="px-2 py-2 text-[9px] font-black text-white uppercase text-center">Avg. Atten</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {historyData.map(row => {
                            const isExpanded = expandedSem === row.semester;
                            const isReg = row.isRegistered;
                            
                            return (
                                <React.Fragment key={row.semester}>
                                    <tr 
                                        onClick={() => isReg && setExpandedSem(isExpanded ? null : row.semester)} 
                                        className={`transition-colors h-[32px] ${isReg ? 'hover:bg-blue-50/40 cursor-pointer' : 'bg-red-50/20'}`}
                                    >
                                        <td className={`px-3 py-1.5 text-[11px] font-bold border-r border-slate-50 flex items-center ${isReg ? 'text-blue-700' : 'text-red-500'}`}>
                                            {isReg && <ChevronRight className={`w-3 h-3 mr-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />}
                                            {!isReg && <div className="w-3 h-3 mr-1" />}
                                            {row.semester}
                                        </td>
                                        <td className="px-2 py-1.5 text-[11px] text-center border-r border-slate-50 font-medium text-gray-700">
                                            {isReg ? (row.taken || '-') : '0'}
                                        </td>
                                        <td className="px-2 py-1.5 text-[11px] text-center border-r border-slate-50 font-medium text-gray-700">
                                            {isReg ? (row.complete || '-') : '0'}
                                        </td>
                                        <td className="px-2 py-1.5 text-[11px] text-center border-r border-slate-50 font-bold text-blue-600">
                                            {isReg ? row.sgpa : '0'}
                                        </td>
                                        <td className="px-2 py-1.5 text-[11px] text-center font-bold text-emerald-600">
                                            {isReg ? `${avgAttendance}%` : '0%'}
                                        </td>
                                    </tr>
                                    {isReg && isExpanded && (
                                        <tr>
                                            <td colSpan={5} className="p-0 bg-white">
                                                <div className="p-2 border-b border-blue-100 bg-slate-50/50">
                                                    <table className="w-full text-left border-collapse bg-white rounded border border-slate-200 overflow-hidden shadow-sm text-[10px]">
                                                        <thead className="bg-slate-100 text-[9px] font-bold text-slate-500">
                                                            <tr>
                                                                <th className="px-2 py-1 border-r border-slate-200">Code</th>
                                                                <th className="px-2 py-1 border-r border-slate-200">Title</th>
                                                                <th className="px-2 py-1 border-r border-slate-200 text-center">GPA</th>
                                                                <th className="px-2 py-1 text-center">Attend</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {DUMMY_COURSE_DETAILS.map((course, cIdx) => (
                                                                <tr 
                                                                    key={cIdx} 
                                                                    onClick={(e) => { e.stopPropagation(); handleCourseClick(course); }}
                                                                    className="hover:bg-blue-50 cursor-pointer active:bg-blue-100 transition-colors"
                                                                >
                                                                    <td className="px-2 py-1 font-bold text-blue-600 border-r border-slate-100">{course.code}</td>
                                                                    <td className="px-2 py-1 text-slate-700 border-r border-slate-100 truncate max-w-[120px]">{course.title}</td>
                                                                    <td className="px-2 py-1 text-center font-black text-emerald-600 border-r border-slate-100">{course.gpa}</td>
                                                                    <td className="px-2 py-1 text-center text-slate-500">{course.attend}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                        {historyData.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-10 text-center text-[11px] text-gray-400 italic">
                                    No registration history found in the system.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};