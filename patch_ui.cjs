const fs = require('fs');

// AdminLuggages.tsx
let adminLuggages = fs.readFileSync('src/pages/admin/AdminLuggages.tsx', 'utf8');

// Insert useMemo if not present
if (!adminLuggages.includes('useMemo')) {
  adminLuggages = adminLuggages.replace(
    "import { useState, useEffect } from 'react';",
    "import { useState, useEffect, useMemo } from 'react';"
  );
}

const statsCode = `
  const buildingStats = useMemo(() => {
    const stats = {
      '毅志': { total: 704, checkedBeds: new Set() },
      '弘德': { total: 320, checkedBeds: new Set() },
      '慧樓': { total: 240, checkedBeds: new Set() }
    };
    luggages.forEach(l => {
      if (stats[l.building] && l.ownerId) {
        stats[l.building].checkedBeds.add(l.ownerId);
      }
    });
    return stats;
  }, [luggages]);
`;

if (!adminLuggages.includes('buildingStats')) {
  adminLuggages = adminLuggages.replace(
    "const [luggages, setLuggages] = useState<LuggageRecord[]>([]);",
    "const [luggages, setLuggages] = useState<LuggageRecord[]>([]);\n" + statsCode
  );
}

const uiCode = `
        {/* === 各棟進度條區塊 === */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {Object.entries(buildingStats).map(([b, stat]) => {
            const percent = Math.min(100, Math.round((stat.checkedBeds.size / stat.total) * 100));
            return (
              <div key={b} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  <span>{b}</span>
                  <span className={percent >= 100 ? "text-green-600" : ""}>{stat.checkedBeds.size} / {stat.total}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div className={\`h-full rounded-full transition-all duration-500 \${percent === 100 ? 'bg-green-500' : 'bg-primary-500'}\`} style={{ width: \`\${Math.max(3, percent)}%\` }} />
                </div>
              </div>
            );
          })}
        </div>
`;

if (!adminLuggages.includes('各棟進度條區塊')) {
  adminLuggages = adminLuggages.replace(
    '<div className="space-y-3">',
    uiCode + '\n        <div className="space-y-3">'
  );
}
fs.writeFileSync('src/pages/admin/AdminLuggages.tsx', adminLuggages);

console.log("Patched AdminLuggages.tsx");

