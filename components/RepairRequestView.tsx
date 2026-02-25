import React, { useState } from 'react';
import type { Equipment, Workshop, RepairRequest, Fault } from '../types';
import { NewEquipmentForm } from './NewVehicleForm';
import { NewWorkshopForm } from './NewWorkshopForm';
import { JobCard } from './JobCard';
import { DuplicateRequestModal } from './DuplicateRequestModal';
import { PlusIcon, TrashIcon } from './Icons';
import { useTranslation } from '../hooks/useTranslation';
import { createRecord, updateRecord } from '../services/googleSheetService';

interface RepairRequestViewProps {
  equipments: Equipment[];
  workshops: Workshop[];
  repairRequests: RepairRequest[];
  lastJobCardNumber: number;
  setLastJobCardNumber: React.Dispatch<React.SetStateAction<number>>;
  onAddEquipment: (equipment: Omit<Equipment, 'id'>) => Promise<Equipment | void>;
  onAddWorkshop: (workshop: Omit<Workshop, 'id'>) => Promise<void>;
}

export const RepairRequestView: React.FC<RepairRequestViewProps> = ({ equipments, workshops, repairRequests, lastJobCardNumber, setLastJobCardNumber, onAddEquipment, onAddWorkshop }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [mileage, setMileage] = useState('');
  const [purpose, setPurpose] = useState<'Repairing' | 'preparing for work' | 'General Checking' | 'Other'>('Repairing');
  const [faults, setFaults] = useState<Fault[]>([{ id: crypto.randomUUID(), description: '', workshopId: '', mechanicName: '' }]);
  
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [showWorkshopModal, setShowWorkshopModal] = useState(false);
  const [jobCardRequest, setJobCardRequest] = useState<RepairRequest | null>(null);

  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [pendingRequestForDupCheck, setPendingRequestForDupCheck] = useState<RepairRequest | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  
  const { t } = useTranslation();

  const handleAddFault = () => {
    if (faults.length < 10) {
      setFaults([...faults, { id: crypto.randomUUID(), description: '', workshopId: '', mechanicName: '' }]);
    }
  };

  const handleRemoveFault = (id: string) => {
    if (faults.length > 1) {
      setFaults(faults.filter(fault => fault.id !== id));
    }
  };

  const handleFaultFieldChange = (id: string, field: 'description' | 'workshopId' | 'mechanicName', value: string) => {
    if (field === 'workshopId' && value === 'addNew') {
        setShowWorkshopModal(true);
        return;
    }
    setFaults(faults.map(fault => fault.id === id ? { ...fault, [field]: value } : fault));
  };
  
  const handleAddEquipment = async (equipment: Omit<Equipment, 'id'>) => {
    try {
      const newEquipment = await onAddEquipment(equipment);
      if (newEquipment) {
        setSelectedEquipmentId(newEquipment.id);
        setShowEquipmentModal(false);
        alert(t('alert_newEquipmentAdded'));
      }
    } catch (error) {
      // Error is already alerted in the parent component
      console.error(error);
    }
  };
  
  const handleAddWorkshop = async (workshop: Omit<Workshop, 'id'>) => {
    try {
      await onAddWorkshop(workshop);
      setShowWorkshopModal(false);
      alert(t('alert_workshopAdded'));
    } catch (error) {
      console.error(error);
    }
  };
  
  const resetForm = () => {
    setSelectedEquipmentId('');
    setSearchQuery('');
    setDriverName('');
    setMileage('');
    setPurpose('Repairing');
    setFaults([{ id: crypto.randomUUID(), description: '', workshopId: '', mechanicName: '' }]);
    setEditingRequestId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEquipmentId) {
      alert(t('alert_selectEquipment'));
      return;
    }
    if (!driverName.trim()) {
      alert(t('alert_enterDriverName'));
      return;
    }

    const faultsWithDescription = faults.filter(f => f.description.trim());

    if (faultsWithDescription.length === 0) {
      alert(t('alert_addFault'));
      return;
    }

    const hasMissingWorkshop = faultsWithDescription.some(f => !f.workshopId);
    if (hasMissingWorkshop) {
      alert(t('alert_selectWorkshopForEachFault'));
      return;
    }

    const validFaults = faultsWithDescription;
    
    if (editingRequestId) {
        const updatedRequestData = {
            driverName,
            purpose,
            mileage,
            faults: validFaults,
        };
        const originalRequest = repairRequests.find(r => r.id === editingRequestId);
        if (originalRequest) {
            const updatedRequest = { ...originalRequest, ...updatedRequestData, workshopId: updatedRequestData.faults[0]?.workshopId || originalRequest.workshopId };
            const payload = { ...updatedRequest, faults: JSON.stringify(updatedRequest.faults) };
            updateRecord(payload, 'RepairRequests')
                .then(() => {
                    alert(t('alert_jobCardUpdated', { jobCardId: editingRequestId }));
                    setJobCardRequest(updatedRequest);
                    resetForm();
                })
                .catch(error => {
                    console.error("Failed to update repair request:", error);
                    alert('Failed to save the updated request to Google Sheet.');
                });
        }
    } else {
        const newJobCardNumber = lastJobCardNumber + 1;
        setLastJobCardNumber(newJobCardNumber);

        const now = new Date();
        const newRequest: RepairRequest = {
          id: String(newJobCardNumber),
          equipmentId: selectedEquipmentId,
          driverName,
          mileage,
          purpose,
          faults: validFaults,
          dateIn: now.toLocaleDateString(),
          timeIn: now.toLocaleTimeString(),
          status: 'Pending',
          workshopId: validFaults[0]?.workshopId || '',
        };
        
        const payload = { ...newRequest, faults: JSON.stringify(newRequest.faults) };
        createRecord(payload, 'RepairRequests')
          .then(() => {
            alert(t('alert_jobCardCreated', { jobCardId: newJobCardNumber }));
            setJobCardRequest(newRequest);
            resetForm();
          })
          .catch(error => {
            console.error("Failed to create repair request:", error);
            alert('Failed to save the new request to Google Sheet.');
            // Rollback the job card number if the save fails
            setLastJobCardNumber(prev => prev - 1);
          });
    }
  };
  
  const searchResults = equipments.filter(e =>
        e.equipmentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.serialNumber.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const handleSelectEquipment = (equipmentId: string) => {
    const pendingRequests = repairRequests.filter(r => r.equipmentId === equipmentId && r.status === 'Pending');
    if (pendingRequests.length > 0) {
        setPendingRequestForDupCheck(pendingRequests[0]);
        setShowDuplicateModal(true);
    } else {
        setSelectedEquipmentId(equipmentId);
        setSearchQuery('');
    }
    setIsSearchFocused(false);
  };

  const handleCreateNewRequest = () => {
    if (pendingRequestForDupCheck) {
        setSelectedEquipmentId(pendingRequestForDupCheck.equipmentId);
    }
    setShowDuplicateModal(false);
    setPendingRequestForDupCheck(null);
    setSearchQuery('');
  };

  const handleAddFaultToExisting = () => {
    if (pendingRequestForDupCheck) {
        setEditingRequestId(pendingRequestForDupCheck.id);
        setSelectedEquipmentId(pendingRequestForDupCheck.equipmentId);
        setDriverName(pendingRequestForDupCheck.driverName);
        setPurpose(pendingRequestForDupCheck.purpose);
        setFaults(pendingRequestForDupCheck.faults);
        setMileage(pendingRequestForDupCheck.mileage || '');
    }
    setShowDuplicateModal(false);
    setPendingRequestForDupCheck(null);
    setSearchQuery('');
  };

  const selectedEquipment = equipments.find(e => e.id === selectedEquipmentId);

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-gray-800 mb-6">{t('newRepairRequest')}</h1>

      {jobCardRequest && selectedEquipment && (
        <JobCard 
            request={jobCardRequest} 
            equipment={selectedEquipment}
            workshops={workshops}
            onClose={() => setJobCardRequest(null)}
        />
      )}

      {showDuplicateModal && pendingRequestForDupCheck && (
        <DuplicateRequestModal
            request={pendingRequestForDupCheck}
            equipment={equipments.find(e => e.id === pendingRequestForDupCheck.equipmentId)!}
            onClose={() => setShowDuplicateModal(false)}
            onCreateNew={handleCreateNewRequest}
            onAddFault={handleAddFaultToExisting}
        />
       )}


      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-md space-y-8">
        
        <div className="border-b pb-8">
            {!selectedEquipment ? (
                <div>
                    <h2 className="text-xl font-semibold text-gray-700 mb-4">{t('step1_findEquipment')}</h2>
                    <div className="relative">
                        <label htmlFor="equipmentSearch" className="block text-sm font-medium text-gray-700">{t('searchByEquipmentOrSerial')}</label>
                        <input
                            type="text"
                            id="equipmentSearch"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => setIsSearchFocused(true)}
                            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                            placeholder={t('searchPlaceholder_eqOrSerial')}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                        />
                        {isSearchFocused && (
                             <div className="absolute top-full start-0 w-full bg-white border border-gray-300 rounded-b-md shadow-lg z-10 max-h-60 overflow-y-auto">
                                {searchResults.length > 0 ? (
                                    searchResults.map(equipment => (
                                        <div 
                                            key={equipment.id} 
                                            onClick={() => handleSelectEquipment(equipment.id)}
                                            className="p-3 border-b hover:bg-blue-50 cursor-pointer"
                                        >
                                            <p className="font-semibold">{equipment.equipmentNumber} ({t(equipment.equipmentType)})</p>
                                            <p className="text-sm text-gray-500">{equipment.serialNumber}</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-3 text-center text-gray-500">
                                        {t('noEquipmentFound')}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                     <div className="text-center mt-4">
                        <button type="button" onClick={() => setShowEquipmentModal(true)} className="text-sm text-blue-600 hover:underline font-semibold">
                            {t('cantFindEquipmentLink')}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-lg text-gray-800">{t('step1_selectedEquipment')}</h3>
                        <button type="button" onClick={resetForm} className="text-sm text-blue-600 hover:underline font-semibold">{t('changeEquipment')}</button>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 text-sm">
                        <p><strong className="w-32 inline-block">{t('type')}:</strong> {t(selectedEquipment.equipmentType)}</p>
                        <p><strong className="w-32 inline-block">{t('equipmentNumber')}:</strong> {selectedEquipment.equipmentNumber}</p>
                        <p><strong className="w-32 inline-block">{t('make')}/{t('model')}:</strong> {selectedEquipment.make} / {selectedEquipment.modelNumber}</p>
                        <p><strong className="w-32 inline-block">{t('serialNumber')}:</strong> {selectedEquipment.serialNumber}</p>
                    </div>
                </div>
            )}
        </div>

        {selectedEquipment && (
            <>
                <div className="border-b pb-8">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4">{t('step2_repairAndOperatorInfo')}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label htmlFor="driverName" className="block text-sm font-medium text-gray-700">{t('complainerOperatorName')}</label>
                            <input type="text" id="driverName" value={driverName} onChange={e => setDriverName(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                        </div>
                        <div>
                            <label htmlFor="mileage" className="block text-sm font-medium text-gray-700">{t('mileage')}</label>
                            <input type="text" id="mileage" value={mileage} onChange={e => setMileage(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" placeholder={t('mileagePlaceholder')}/>
                        </div>
                        <div>
                            <label htmlFor="purpose" className="block text-sm font-medium text-gray-700">{t('purposeOfEntry')}</label>
                            <select id="purpose" value={purpose} onChange={e => setPurpose(e.target.value as 'Repairing' | 'preparing for work' | 'General Checking' | 'Other')} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                                <option value="Repairing">{t('purpose_repairing')}</option>
                                <option value="preparing for work">{t('purpose_preparing')}</option>
                                <option value="General Checking">{t('purpose_checking')}</option>
                                <option value="Other">{t('purpose_other')}</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div>
                     <h2 className="text-xl font-semibold text-gray-700 mb-4">{t('step3_faultsReported')}</h2>
                     <div className="space-y-3">
                        <div className="grid grid-cols-[auto_1fr_1fr_2fr_auto] gap-x-3 text-xs font-medium text-gray-500 px-2">
                            <span>#</span>
                            <span>{t('workshop')}</span>
                            <span>{t('mechanicName')}</span>
                            <span>{t('faultDescription')}</span>
                        </div>
                        {faults.map((fault, index) => (
                            <div key={fault.id} className="grid grid-cols-[auto_1fr_1fr_2fr_auto] items-center gap-x-3">
                               <span className="text-gray-500 text-center">{index + 1}.</span>
                               <select value={fault.workshopId} onChange={(e) => handleFaultFieldChange(fault.id, 'workshopId', e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-sm">
                                    <option value="">{t('selectWorkshop')}</option>
                                    {workshops.map(w => <option key={w.id} value={w.id}>{w.subName}</option>)}
                                    <option value="addNew">{t('addNew')}</option>
                               </select>
                               <input 
                                    type="text" 
                                    value={fault.mechanicName || ''} 
                                    onChange={e => handleFaultFieldChange(fault.id, 'mechanicName', e.target.value)} 
                                    placeholder={t('mechanicName')} 
                                    className="block w-full p-2 border border-gray-300 rounded-md"
                                />
                               <input type="text" value={fault.description} onChange={e => handleFaultFieldChange(fault.id, 'description', e.target.value)} placeholder={t('faultDescriptionPlaceholder')} className="block w-full p-2 border border-gray-300 rounded-md"/>
                               <button type="button" onClick={() => handleRemoveFault(fault.id)} disabled={faults.length <= 1} className="p-2 text-red-500 rounded-full hover:bg-red-100 disabled:text-gray-300 disabled:hover:bg-transparent">
                                   <TrashIcon className="h-5 w-5" />
                               </button>
                            </div>
                        ))}
                     </div>
                     {faults.length < 10 && (
                         <button type="button" onClick={handleAddFault} className="mt-4 flex items-center text-sm text-blue-600 hover:text-blue-800">
                            <PlusIcon className="h-4 w-4 me-1" /> {t('addFault')}
                         </button>
                     )}
                </div>
                
                <div className="flex justify-end pt-4">
                    <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400" disabled={!selectedEquipmentId || !driverName}>
                        {editingRequestId ? t('updateAndPrintJobCard') : t('saveAndPrintJobCard')}
                    </button>
                </div>
            </>
        )}
      </form>
      
      {showEquipmentModal && <NewEquipmentForm onClose={() => setShowEquipmentModal(false)} onAddEquipment={handleAddEquipment} onUpdateEquipment={() => {}} equipmentToEdit={null} />}
      {showWorkshopModal && <NewWorkshopForm onClose={() => setShowWorkshopModal(false)} onAddWorkshop={handleAddWorkshop} onUpdateWorkshop={() => {}} workshopToEdit={null} />}
    </div>
  );
};
