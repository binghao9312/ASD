import { useState, useEffect } from 'react';
import { ListChecks, Plus, Save, Trash2, CheckSquare, Square } from 'lucide-react';
import { type FormField, getFormFields, saveFormFields } from '../../services/settings';

export function AdminForm() {
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFields();
  }, []);

  const loadFields = async () => {
    setLoading(true);
    const data = await getFormFields();
    setFields(data);
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      await saveFormFields(fields);
      alert('儲存成功');
    } catch (err) {
      alert('儲存失敗');
    }
  };

  const addField = () => {
    const newId = `field_${Date.now()}`;
    setFields([...fields, {
      id: newId,
      label: '新檢查項目',
      enabled: true,
      requiresRemark: false
    }]);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const deleteField = (id: string) => {
    if (confirm('確定要刪除此檢查項目嗎？')) {
      setFields(fields.filter(f => f.id !== id));
    }
  };

  if (loading) return <div className="text-center py-10">載入中...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <ListChecks className="w-5 h-5" /> 表單設定
        </h2>
        <div className="flex gap-2">
          <button onClick={addField} className="btn-secondary py-1.5 px-3 text-sm h-auto w-auto">
            <Plus className="w-4 h-4 mr-1" /> 新增
          </button>
          <button onClick={handleSave} className="btn-primary py-1.5 px-3 text-sm h-auto w-auto">
            <Save className="w-4 h-4 mr-1" /> 儲存設定
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {fields.map(field => (
          <div key={field.id} className={`glass-card p-4 flex flex-col gap-2 ${!field.enabled ? 'opacity-60' : ''}`}>
            <div className="flex justify-between items-center">
              <input
                type="text"
                value={field.label}
                onChange={(e) => updateField(field.id, { label: e.target.value })}
                className="input-styled py-1.5 text-sm font-bold w-1/2"
                placeholder="例如：座位是否已乾淨"
              />
              <button onClick={() => deleteField(field.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
                <button type="button" onClick={() => updateField(field.id, { enabled: !field.enabled })} className="text-primary-600">
                  {field.enabled ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                </button>
                <span>啟用此項目</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
                <button type="button" onClick={() => updateField(field.id, { requiresRemark: !field.requiresRemark })} className="text-primary-600">
                  {field.requiresRemark ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                </button>
                <span>勾選時必須填寫備註</span>
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
