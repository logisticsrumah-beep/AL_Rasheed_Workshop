import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { EquipmentList } from './components/FleetList';
import { RepairRequestView } from './components/RepairRequestView';
import { HistoryView } from './components/HistoryView';

import type { Equipment, Workshop, RepairRequest, User } from './types';
import { WrenchScrewdriverIcon, TruckIcon, BuildingStorefrontIcon, SearchIcon } from './components/Icons';
import { PendingRequestsList } from './components/PendingRequestsList';
import { WorkshopList } from './components/WorkshopList';
import { CompletedRequestsList } from './components/CompletedRequestsList';
import { JobCard } from './components/JobCard';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';

import { useLanguage } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useData } from './context/DataContext';
import { useTranslation } from './hooks/useTranslation';
import { LoginScreen } from './components/LoginScreen';
import { AdminPanel } from './components/AdminPanel';
import { Settings } from './components/Settings';
import { ChangePasswordModal } from './components/ChangePasswordModal';

import { getAllData, createRecord, updateRecord, deleteRecord } from './services/googleSheetService';
const SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL;
type View = 'dashboard' | 'fleet' | 'request' | 'history' | 'pending' | 'workshops' | 'completed' | 'admin' | 'settings';

const AppContent: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('dashboard');

  const [lastJobCardNumber, setLastJobCardNumber] = useState<number>(262000);

  const [searchJobCardId, setSearchJobCardId] = useState('');
  const [foundRequest, setFoundRequest] = useState<RepairRequest | null>(null);
  const [equipmentToDelete, setEquipmentToDelete] = useState<Equipment | null>(null);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);


  const { language } = useLanguage();
  const { t } = useTranslation();
  const { users, setUsers } = useAuth();
  const {
    equipments,
    workshops,
    repairRequests,
    loading,
    error,
    createData,
    updateData,
    deleteData,
  } = useData();



  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  const handleJobCardSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchJobCardId.trim()) return;

    const request = repairRequests.find(r => r.id === searchJobCardId.trim());

    if (request) {
        setFoundRequest(request);
    } else {
        alert(t('alert_jobCardNotFound', { jobCardId: searchJobCardId }));
    }
    setSearchJobCardId('');
  };

  const requestDeleteEquipment = (equipmentId: string) => {
    const equipment = equipments.find(v => v.id === equipmentId);
    if (equipment) {
      setEquipmentToDelete(equipment);
    }
  };

  const confirmDeleteEquipment = async () => {
    if (!equipmentToDelete) return;
    try {
      await deleteData('Equipments', equipmentToDelete.id);
      alert(t('alert_equipmentDeleted', { equipmentNumber: equipmentToDelete.equipmentNumber }));
      setEquipmentToDelete(null); // Close modal
    } catch (error) {
      console.error('Failed to delete equipment:', error);
      alert('Failed to delete equipment.');
    }
  };

  const cancelDeleteEquipment = () => {
    setEquipmentToDelete(null);
  };

  const handleCreateWorkshop = async (workshop: Omit<Workshop, 'id'>) => {
    const newWorkshop = { ...workshop, id: crypto.randomUUID() };
    await createData('Workshops', newWorkshop);
  };

  const handleCreateEquipment = async (equipment: Omit<Equipment, 'id'>) => {
    if (equipments.some(e => e.serialNumber === equipment.serialNumber)) {
       alert(t('alert_serialExists'));
       throw new Error('Serial number exists');
    }
    const newEquipment: Equipment = { ...equipment, id: crypto.randomUUID() };
    return await createData('Equipments', newEquipment);
  };

  const handleUpdateRequest = async (updatedRequest: RepairRequest) => {
    const payload = {
      ...updatedRequest,
      faults: JSON.stringify(updatedRequest.faults),
    };
    await updateData('RepairRequests', payload);
  };


  const renderView = () => {
    switch (activeView) {
      case 'fleet':
        return <EquipmentList equipments={equipments} addEquipment={handleCreateEquipment} deleteEquipment={requestDeleteEquipment} updateEquipment={(equipment) => updateData('Equipments', equipment)} />;
      case 'request':
        return <RepairRequestView 
            equipments={equipments} 
            workshops={workshops} 
            repairRequests={repairRequests}
            lastJobCardNumber={lastJobCardNumber}
            setLastJobCardNumber={setLastJobCardNumber}
            onAddEquipment={handleCreateEquipment}
            onAddWorkshop={handleCreateWorkshop}
        />;
      case 'history':
        return <HistoryView equipments={equipments} workshops={workshops} repairRequests={repairRequests} onUpdateRequest={handleUpdateRequest} />;
      case 'pending':
        return <PendingRequestsList repairRequests={repairRequests.filter(r => r.status === 'Pending')} onUpdateRequest={handleUpdateRequest} equipments={equipments} workshops={workshops} />;
      case 'completed':
        return <CompletedRequestsList repairRequests={repairRequests.filter(r => r.status === 'Completed')} equipments={equipments} workshops={workshops} />;
      case 'workshops':
        return <WorkshopList workshops={workshops} onAddWorkshop={handleCreateWorkshop} repairRequests={repairRequests} equipments={equipments} onUpdateWorkshop={(workshop) => updateData('Workshops', workshop)} onDeleteWorkshop={(id) => deleteData('Workshops', id)} />;
      case 'admin':
        return <AdminPanel users={users} setUsers={setUsers} />;
      case 'settings':
        return <Settings />;
      case 'dashboard':
      default:
        const pendingRequests = repairRequests.filter(r => r.status === 'Pending').length;
        const completedRequests = repairRequests.filter(r => r.status === 'Completed').length;

        if (isLoading) {
            return (
                <div className="p-8 text-center">
                    <h1 className="text-4xl font-bold text-gray-800 mb-6">Loading Data...</h1>
                    <p>Please wait while we fetch the latest information from your workshop records.</p>
                </div>
            );
        }

        return (
            <div className="p-8">
                <h1 className="text-4xl font-bold text-gray-800 mb-6">{t('dashboard_title')}</h1>

                <div className="mb-8 bg-white p-6 rounded-xl shadow-md">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4">{t('dashboard_findJobCard')}</h2>
                    <form onSubmit={handleJobCardSearch} className="flex items-center space-x-2">
                    <input 
                        type="search" 
                        placeholder={t('dashboard_searchPlaceholder')}
                        value={searchJobCardId} 
                        onChange={(e) => setSearchJobCardId(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                    />
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center shrink-0">
                        <SearchIcon className="h-5 w-5 me-2" />
                        {t('search')}
                    </button>
                    </form>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <button onClick={() => setActiveView('fleet')} className="bg-white p-6 rounded-xl shadow-md flex items-center space-x-4 w-full text-start hover:bg-gray-50 transition">
                        <div className="bg-blue-100 p-3 rounded-full">
                            <TruckIcon className="h-8 w-8 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm">{t('dashboard_totalEquipment')}</p>
                            <p className="text-2xl font-bold text-gray-800">{equipments.length}</p>
                        </div>
                    </button>
                    <button onClick={() => setActiveView('pending')} className="bg-white p-6 rounded-xl shadow-md flex items-center space-x-4 w-full text-start hover:bg-gray-50 transition">
                        <div className="bg-yellow-100 p-3 rounded-full">
                            <WrenchScrewdriverIcon className="h-8 w-8 text-yellow-500" />
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm">{t('dashboard_pendingRequests')}</p>
                            <p className="text-2xl font-bold text-gray-800">{pendingRequests}</p>
                        </div>
                    </button>
                     <button onClick={() => setActiveView('completed')} className="bg-white p-6 rounded-xl shadow-md flex items-center space-x-4 w-full text-start hover:bg-gray-50 transition">
                        <div className="bg-green-100 p-3 rounded-full">
                            <WrenchScrewdriverIcon className="h-8 w-8 text-green-500" />
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm">{t('dashboard_completedRequests')}</p>
                            <p className="text-2xl font-bold text-gray-800">{completedRequests}</p>
                        </div>
                    </button>
                    <button onClick={() => setActiveView('workshops')} className="bg-white p-6 rounded-xl shadow-md flex items-center space-x-4 w-full text-start hover:bg-gray-50 transition">
                        <div className="bg-indigo-100 p-3 rounded-full">
                            <BuildingStorefrontIcon className="h-8 w-8 text-indigo-500" />
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm">{t('dashboard_totalWorkshops')}</p>
                            <p className="text-2xl font-bold text-gray-800">{workshops.length}</p>
                        </div>
                    </button>
                </div>
            </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView} 
        onChangePasswordClick={() => setIsChangePasswordModalOpen(true)}
      />
      <main className="flex-1 overflow-y-auto">
        {renderView()}
      </main>
      {foundRequest && (
        <JobCard 
            request={foundRequest}
            equipment={equipments.find(v => v.id === foundRequest.equipmentId)!}
            workshops={workshops}
            onClose={() => setFoundRequest(null)}
        />
      )}
      {equipmentToDelete && (
        <DeleteConfirmationModal
          equipment={equipmentToDelete}
          onConfirm={confirmDeleteEquipment}
          onCancel={cancelDeleteEquipment}
          associatedRequestsCount={repairRequests.filter(r => r.equipmentId === equipmentToDelete.id).length}
        />
      )}
      {isChangePasswordModalOpen && (
        <ChangePasswordModal onClose={() => setIsChangePasswordModalOpen(false)} />
      )}
    </div>
  );
};




const App: React.FC = () => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><p>Loading authentication...</p></div>;
  }

  if (!currentUser) {
    return <LoginScreen />;
  }

  return <AppContent />;
};

export default App;