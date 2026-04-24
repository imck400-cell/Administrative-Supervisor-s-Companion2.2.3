const fs = require('fs');

const permMapping = {
  'DailyReportsPage': 'dailyFollowUp',
  'ViolationsPage': 'studentAffairs',
  'StudentsReportsPage': 'studentAffairs',
  'StaffFollowUpPage': 'adminFollowUp',
  'ProfilePage': 'schoolProfile',
  'SpecialReportsPage': 'specialReports',
  'SubstitutionPage': 'substitutions',
  'AccessCodesModal': 'userManagement',
  'UserEditModal': 'userManagement',
  'DataManagementModal': 'dataModal', // No disable
  'CaseStudyModal': 'caseStudyModal',
  'ComprehensiveIndicatorsModal': 'comprehensiveIndicators',
  'IssuesAndSolutionsModal': 'issuesModal',
  'TrainingCoursesModal': 'trainingCourses'
};

const componentsWithReadOnly = [
  'app/ReportsPage.tsx',
  'app/StaffFollowUpPage.tsx',
  'app/ProfilePage.tsx',
  'app/SpecialReportsPage.tsx',
  'app/SubstitutionPage.tsx',
  'components/AccessCodesModal.tsx',
  'components/UserEditModal.tsx',
  'components/DataManagementModal.tsx',
  'components/CaseStudyModal.tsx',
  'components/ComprehensiveIndicatorsModal.tsx',
  'components/IssuesAndSolutionsModal.tsx',
  'components/TrainingCoursesModal.tsx'
];

componentsWithReadOnly.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  for (const [compName, perm] of Object.entries(permMapping)) {
    if (perm === 'dataModal') continue; // Not updating this one
    
    // We just replace the very first occurance of `const isReadOnly = currentUser?.permissions?.readOnly === true;`
    // that sequentially follows the component name in the file.
    
    const compIndex = content.indexOf(compName);
    if (compIndex !== -1) {
      const searchStr = 'const isReadOnly = currentUser?.permissions?.readOnly === true;';
      const readOnlyIndex = content.indexOf(searchStr, compIndex);
      if (readOnlyIndex !== -1) {
        // Also ensure another component hasn't started in between (basic check)
        const replaceStr = `const isReadOnly = currentUser?.permissions?.readOnly === true || (Array.isArray(currentUser?.permissions?.${perm}) && currentUser.permissions.${perm}.includes('disable'));`;
        content = content.substring(0, readOnlyIndex) + replaceStr + content.substring(readOnlyIndex + searchStr.length);
      }
    }
  }
  
  fs.writeFileSync(file, content);
});
console.log("Updated isReadOnly logic in components.");
