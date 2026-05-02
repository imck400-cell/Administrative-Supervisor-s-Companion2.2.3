const fs = require('fs');
let code = fs.readFileSync('components/CaseStudyModal.tsx', 'utf8');

const lines = code.split('\n');
const newLines = [];

for (let i = 0; i < lines.length; i++) {
  if (i >= 893 && i <= 1007) {
    // 894 is 893 zero-indexed, 1008 is 1007
    if (i === 893) {
      newLines.push(`                ) : (
                  <div className="space-y-6">
                    {filteredLogs.length === 0 ? (
                      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-12 text-center text-slate-400 font-bold">
                        لا توجد دراسات حالة مسجلة تطابق بحثك.
                      </div>
                    ) : filteredLogs.map((log) => {
                       return (
                         <div key={log.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative">
                           {/* Header / Student Info Table */}
                           <div className="bg-slate-50 p-6 border-b border-slate-200">
                             <div className="flex flex-wrap justify-between items-start mb-6 gap-4">
                               <div>
                                 <h3 className="text-xl font-black text-slate-800 mb-1 flex items-center gap-2">
                                   <User size={20} className="text-blue-500" />
                                   {log.studentName}
                                 </h3>
                                 <p className="text-sm font-bold text-slate-500 flex items-center gap-2">
                                   <Calendar size={14} />
                                   {new Date(log.timestamp).toLocaleDateString('ar-SA')} - المدخل: {log.userName}
                                 </p>
                               </div>
                               <div className="flex gap-2">
                                 <button 
                                   onClick={() => window.open(\`https://wa.me/?text=\${generateWhatsAppText(log)}\`, '_blank')}
                                   className="px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-xl transition-colors font-bold flex items-center gap-2 text-sm shadow-sm border border-green-200"
                                 >
                                    <Share2 size={16} /> إرسال للمتابعة
                                 </button>
                                 {(currentUser?.role === 'admin' || currentUser?.id === log.userId) && (
                                   <button 
                                     onClick={() => handleDelete(log.id)}
                                     className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-colors shadow-sm border border-red-200"
                                     title="حذف"
                                   >
                                      <Trash2 size={18} />
                                   </button>
                                 )}
                               </div>
                             </div>
                             
                             <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm font-bold bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                               <div>
                                 <span className="block text-slate-400 text-xs mb-1">النوع</span>
                                 <span className="text-slate-700">{log.studentGender || '-'}</span>
                               </div>
                               <div>
                                 <span className="block text-slate-400 text-xs mb-1">الصف / الشعبة</span>
                                 <span className="text-slate-700">{log.studentGrade || '-'} / {log.studentSection || '-'}</span>
                               </div>
                               <div>
                                  <span className="block text-slate-400 text-xs mb-1">السكن</span>
                                  <span className="text-slate-700">{log.studentAddress || '-'}</span>
                               </div>
                               <div>
                                  <span className="block text-slate-400 text-xs mb-1">ولي الأمر (العمل)</span>
                                  <span className="text-slate-700">{log.guardianName || '-'} {log.studentWork ? \`(\${log.studentWork})\` : ''}</span>
                               </div>
                               <div>
                                  <span className="block text-slate-400 text-xs mb-1">هاتف ولي الأمر</span>
                                  <span className="text-slate-700 dir-ltr inline-block">{log.guardianPhone || '-'}</span>
                               </div>
                             </div>
                           </div>
                           
                           {/* Body / Evaluator and Criteria */}
                           <div className="p-0 overflow-x-auto">
                             <table className="w-full text-right text-sm">
                               <tbody className="divide-y divide-slate-100">
                                 <tr className="bg-blue-50/50">
                                    <th className="w-1/3 min-w-[200px] p-6 text-slate-600 font-black border-l border-slate-200 align-top max-w-[250px]">صفة المقيم</th>
                                    <td className="p-6 font-black text-blue-700 align-top text-base">
                                      {log.roleName} {log.subject ? \`(\${log.subject})\` : ''}
                                    </td>
                                 </tr>
                                 
                                 {Object.keys(log.formData || {}).filter(k=>k.endsWith('_text')).map(textKey => {
                                    const mainKey = textKey.replace('_text', '');
                                    const rating = log.formData[\`\${mainKey}_rating\`];
                                    const text = log.formData[textKey];
                                    const label = ALL_FIELDS_MAP[mainKey] || mainKey;
                                    return (
                                      <tr key={mainKey} className="hover:bg-slate-50 transition-colors">
                                        <th className="w-1/3 min-w-[200px] p-6 align-top font-black text-slate-700 border-l border-slate-200 leading-relaxed max-w-[250px]">
                                          {label}
                                        </th>
                                        <td className="p-6 align-top">
                                          {rating && (
                                            <div className="mb-3">
                                              <span className={\`text-xs font-black px-3 py-1.5 rounded-xl \${RATINGS.find(r=>r.id===rating)?.color || 'bg-slate-500'} text-white shadow-sm inline-block\`}>
                                                {rating}
                                              </span>
                                            </div>
                                          )}
                                          <p className="text-slate-600 font-bold leading-relaxed whitespace-pre-wrap">{text}</p>
                                        </td>
                                      </tr>
                                    )
                                 })}
                       
                                 {log.additionalDetails && (
                                    <tr className="bg-indigo-50/30">
                                      <th className="w-1/3 min-w-[200px] p-6 align-top font-black text-indigo-900 border-l border-indigo-100 max-w-[250px]">
                                        تفاصيل إضافية / إجراءات مخصصة
                                      </th>
                                      <td className="p-6 align-top text-indigo-800 font-bold whitespace-pre-wrap leading-relaxed">
                                        {log.additionalDetails}
                                      </td>
                                    </tr>
                                 )}
                               </tbody>
                             </table>
                           </div>
                         </div>
                       );
                    })}
                  </div>
                )}`);
    } else {
      // skip lines 894-1007
    }
  } else {
    newLines.push(lines[i]);
  }
}

fs.writeFileSync('components/CaseStudyModal.tsx', newLines.join('\n'), 'utf8');
console.log("Replaced using lines array");
