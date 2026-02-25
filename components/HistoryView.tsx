import React, { useState } from 'react';
import type { Equipment, RepairRequest, Workshop } from '../types';
import { JobCard } from './JobCard';
import { PrinterIcon, WhatsappIcon, DownloadIcon } from './Icons';
import { downloadHistoryCSV } from '../utils/csvExport';
import { useTranslation } from '../hooks/useTranslation';
import { CompletionFormModal } from './CompletionFormModal';
import * as XLSX from 'xlsx';
import { translateText } from '../services/translationService';

interface HistoryViewProps {
  equipments: Equipment[];
  workshops: Workshop[];
  repairRequests: RepairRequest[];
  onUpdateRequest: (request: RepairRequest) => Promise<void>;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ equipments, workshops, repairRequests, onUpdateRequest }) => {
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [requestToPrint, setRequestToPrint] = useState<RepairRequest | null>(null);
  const [requestToShare, setRequestToShare] = useState<RepairRequest | null>(null);
  const [requestToComplete, setRequestToComplete] = useState<RepairRequest | null>(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedWorkshopId, setSelectedWorkshopId] = useState('');
  const { t } = useTranslation();
  const [translatedTexts, setTranslatedTexts] = useState<Record<string, string>>({});
  const [translating, setTranslating] = useState<string | null>(null);

  const handleSaveCompletion = async (completedRequest: RepairRequest) => {
    await onUpdateRequest(completedRequest);
    setRequestToComplete(null);
  };

  const handleShare = (request: RepairRequest) => {
    setRequestToShare(request);
  };
  
  const getEquipmentInfo = (equipmentId: string) => {
    const equipment = equipments.find(e => e.id === equipmentId);
    return equipment ? `${equipment.equipmentType} ${equipment.equipmentNumber}` : t('unknownEquipment');
  };

  const filteredRequests = repairRequests
    .filter(req => {
      if (selectedEquipmentId && req.equipmentId !== selectedEquipmentId) {
        return false;
      }
      if (selectedWorkshopId && req.workshopId !== selectedWorkshopId) {
        return false;
      }
      if (selectedMonth) {
        const reqMonth = new Date(req.dateIn).toISOString().slice(0, 7);
        if (reqMonth !== selectedMonth) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => new Date(b.dateIn).getTime() - new Date(a.dateIn).getTime());

  const handleDownloadExcel = () => {
    if (filteredRequests.length === 0) {
      alert(t('alert_noHistoryToDownload'));
      return;
    }

    const dataToExport = filteredRequests.map(req => {
      const equipment = equipments.find(e => e.id === req.equipmentId);
      const workshop = workshops.find(w => w.id === req.workshopId);
      return {
        [t('workshopName')]: workshop?.name || '',
        [t('equipment')]: equipment ? `${equipment.equipmentType} ${equipment.equipmentNumber}` : '',
        [t('dateIn')]: req.dateIn,
        [t('dateOut')]: req.dateOut || '',
        [t('workDone')]: req.workDone || '',
        [t('parts')]: req.partsUsed?.map(p => `${p.name} (x${p.quantity})`).join(', ') || '',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'History');
    XLSX.writeFile(workbook, 'workshop_history.xlsx');
  };

  return (
    <div className="p-8">
       <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold text-gray-800">{t('repairHistory')}</h1>
        <button
          onClick={handleDownloadExcel}
          className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-green-700 transition-colors"
        >
          <DownloadIcon className="h-5 w-5 me-2" />
          {t('downloadExcel')}
        </button>
      </div>
      
      {requestToPrint && (
        <JobCard 
            request={requestToPrint} 
            equipment={equipments.find(e => e.id === requestToPrint.equipmentId)!}
            workshops={workshops}
            onClose={() => setRequestToPrint(null)}
        />
      )}

      {requestToShare && (
        <JobCard 
            request={requestToShare} 
            equipment={equipments.find(e => e.id === requestToShare.equipmentId)!}
            workshops={workshops}
            onClose={() => setRequestToShare(null)}
            onShare={() => {}} 
        />
      )}

      {requestToComplete && (
        <CompletionFormModal
            request={requestToComplete}
            onClose={() => setRequestToComplete(null)}
            onSave={handleSaveCompletion}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label htmlFor="equipment-select" className="block text-sm font-medium text-gray-700 mb-1">{t('selectEquipmentToFilter')}</label>
          <select
            id="equipment-select"
            value={selectedEquipmentId}
            onChange={e => setSelectedEquipmentId(e.target.value)}
            className="block w-full p-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">{t('allEquipment')}</option>
            {equipments.map(e => (
              <option key={e.id} value={e.id}>
                {e.equipmentType}+{e.equipmentNumber}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="workshop-select" className="block text-sm font-medium text-gray-700 mb-1">{t('selectWorkshop')}</label>
          <select
            id="workshop-select"
            value={selectedWorkshopId}
            onChange={e => setSelectedWorkshopId(e.target.value)}
            className="block w-full p-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">{t('allWorkshops')}</option>
            {workshops.map(w => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="month-select" className="block text-sm font-medium text-gray-700 mb-1">{t('selectMonth')}</label>
          <input
            type="month"
            id="month-select"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="block w-full p-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredRequests.length > 0 ? (
          filteredRequests.map(req => (
            <div key={req.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-lg text-gray-800">
                    {!selectedEquipmentId && <span className="text-blue-600 font-semibold block mb-1">{getEquipmentInfo(req.equipmentId)}</span>}
                    {t('requestId')}: {req.id}
                  </p>
                  <p className="text-sm text-gray-500">{t('dateIn')}: {req.dateIn} at {req.timeIn}</p>
                </div>
                <div className="flex items-center space-x-4">
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                        req.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {t(req.status.toLowerCase() as 'pending' | 'completed')}
                    </span>
                </div>
              </div>
              <div className="mt-4 border-t pt-4">
                <p><span className="font-semibold">{t('purpose')}:</span> {t(`purpose_${req.purpose.toLowerCase().replace(/ /g, '_')}`)}</p>
                <p><span className="font-semibold">{t('driver')}:</span> {req.driverName}</p>
                <p className="font-semibold mt-2">{req.status === 'Completed' ? t('resolvedFaults') : t('faults')}:</p>
                <ul className="list-disc list-inside text-gray-600">
                  {req.faults.map(f => (
                    <li key={f.id}>
                      {f.description}
                      <button 
                        onClick={async () => {
                          setTranslating(f.id);
                          const translation = await translateText(f.description);
                          setTranslatedTexts(prev => ({ ...prev, [f.id]: translation }));
                          setTranslating(null);
                        }}
                        className="text-xs text-blue-500 ml-2"
                        disabled={translating === f.id}
                      >
                        {translating === f.id ? 'Translating...' : 'Translate'}
                      </button>
                      {translatedTexts[f.id] && <p className="text-sm text-gray-500">{translatedTexts[f.id]}</p>}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-between mt-4 border-t pt-4">
                <div className="flex items-center space-x-2">
                    <button onClick={() => setRequestToPrint(req)} className="flex items-center text-sm bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-300">
                        <PrinterIcon className="h-4 w-4 me-2" /> {t('pdfPrint')}
                    </button>
                    <button onClick={() => handleShare(req)} className="flex items-center text-sm bg-green-100 text-green-800 px-3 py-1.5 rounded-md hover:bg-green-200">
                        <WhatsappIcon className="h-4 w-4 me-2" /> {t('share')}
                    </button>
                </div>
                {req.status === 'Pending' ? (
                    <button onClick={() => setRequestToComplete(req)} className="bg-green-500 text-white px-3 py-1.5 rounded-md hover:bg-green-600 text-sm">
                      {t('markAsCompleted')}
                    </button>
                ) : (
                    <div>
                       <p className="text-sm text-gray-500">{t('completedOn')}: {req.dateOut} at {req.timeOut}</p>
                    </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10 bg-white rounded-lg shadow-md">
            <p className="text-gray-500">{selectedEquipmentId ? t('noHistoryForEquipment') : t('noRepairHistoryFound')}</p>
          </div>
        )}
      </div>
    </div>
  );
};