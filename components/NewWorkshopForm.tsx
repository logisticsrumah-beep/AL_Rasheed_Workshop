import React, { useState, useEffect } from 'react';
import type { Workshop } from '../types';
import { XMarkIcon } from './Icons';
import { useTranslation } from '../hooks/useTranslation';

interface NewWorkshopFormProps {
  onClose: () => void;
  onAddWorkshop: (workshop: Omit<Workshop, 'id'>) => void;
  onUpdateWorkshop: (workshop: Workshop) => void;
  workshopToEdit: Workshop | null;
}

export const NewWorkshopForm: React.FC<NewWorkshopFormProps> = ({ onClose, onAddWorkshop, onUpdateWorkshop, workshopToEdit }) => {
  const isEditMode = workshopToEdit !== null;
  const { t } = useTranslation();

  const [subName, setSubName] = useState('');
  const [foremanName, setForemanName] = useState('');

  useEffect(() => {
    if (isEditMode) {
      setSubName(workshopToEdit.subName);
      setForemanName(workshopToEdit.foreman);
    }
  }, [workshopToEdit, isEditMode]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!subName.trim()) {
      alert(t('alert_enterWorkshopName'));
      return;
    }

    if (!foremanName.trim()) {
        alert(t('alert_enterForemanName'));
        return;
    }
    
    const workshopData = { subName: subName.trim(), foreman: foremanName.trim() };

    if (isEditMode) {
        onUpdateWorkshop({ ...workshopData, id: workshopToEdit.id });
    } else {
        onAddWorkshop(workshopData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-lg relative animate-fade-in-up">
        <button onClick={onClose} className="absolute top-4 end-4 text-gray-400 hover:text-gray-600">
          <XMarkIcon className="h-6 w-6" />
        </button>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">{isEditMode ? t('editWorkshop') : t('addNewWorkshop')}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
           <div>
            <label htmlFor="workshopName" className="block text-sm font-medium text-gray-700">{t('workshopName')}</label>
            <input
              type="text"
              id="workshopName"
              value={subName}
              onChange={(e) => setSubName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder={t('workshopNamePlaceholder')}
              required
            />
          </div>
           <div>
            <label htmlFor="foremanName" className="block text-sm font-medium text-gray-700">{t('foremanName')}</label>
            <input
              type="text"
              id="foremanName"
              value={foremanName}
              onChange={(e) => setForemanName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder={t('foremanNamePlaceholder')}
              required
            />
          </div>
          <div className="flex justify-end pt-4">
            <button type="button" onClick={onClose} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg me-2 hover:bg-gray-300">{t('cancel')}</button>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">{isEditMode ? t('updateWorkshop') : t('addWorkshop')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
