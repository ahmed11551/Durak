import React from 'react';
interface ComplianceModalProps {
  user: any;
  onClose: () => void;
  onAccepted: (documentType: string) => void;
}
export const ComplianceModal: React.FC<ComplianceModalProps> = ({ user, onClose, onAccepted }) => {
  const [documentType, setDocumentType] = React.useState<'offer' | 'rules' | 'privacy' | 'aml'>('offer');
  const [accepted, setAccepted] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const handleAccept = async () => {
    if (!accepted) return;
    setLoading(true);
    await onAccepted(documentType);
    setLoading(false);
  };
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div>
            <h2 className="text-lg font-black text-slate-100">Комплаенс & Юридические документы</h2>
            <p className="text-xs text-slate-400">Обязательно перед использованием платформы</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-xl">✕</button>
        </div>
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-2 gap-2">
            {(['offer','rules','privacy','aml'] as const).map((tab) => (
              <button key={tab} onClick={() => setDocumentType(tab)} className={`px-3 py-2 text-xs font-bold rounded-xl border ${documentType === tab ? 'bg-amber-500/10 border-amber-500 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-300'}`}>
                {tab === 'offer' ? 'Публичная оферта' : tab === 'rules' ? 'Правила игры' : tab === 'privacy' ? 'Политика конфиденциальности' : 'AML/KYC'}
              </button>
            ))}
          </div>
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs text-slate-300 space-y-2">
            {documentType === 'offer' && (
              <>
                <div className="font-bold text-slate-100">Публичная оферта</div>
                <div>Игра носит развлекательный характер. Запрещено лицам младше 18 лет. Платформа оставляет за собой право изменять правила без предварительного уведомления.</div>
              </>
            )}
            {documentType === 'rules' && (
              <>
                <div className="font-bold text-slate-100">Правила игры</div>
                <div>Запрещены сговоры, читерство, мультиаккаунтинг. За нарушение — блокировка без возврата средств.</div>
              </>
            )}
            {documentType === 'privacy' && (
              <>
                <div className="font-bold text-slate-100">Политика конфиденциальности</div>
                <div>Данные обрабатываются согласно 152-ФЗ. Мы не передаём третьим лицам без вашего согласия. Декларации составляются пользователем самостоятельно.</div>
              </>
            )}
            {documentType === 'aml' && (
              <>
                <div className="font-bold text-slate-100">AML/KYC</div>
                <div>Для выводов от 30 000 ₽ требуется верификация. Подозрительные операции блокируются антифрод-системой.</div>
              </>
            )}
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
            Я прочитал(а) и принимаю условия документа
          </label>
          <div className="flex justify-end">
            <button onClick={handleAccept} disabled={!accepted || loading} className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 text-white font-bold text-xs rounded-xl">
              {loading ? 'Сохраняю...' : 'Подтвердить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
