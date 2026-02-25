import React, { useState } from 'react';
import type { Equipment } from '../types';
import { NewEquipmentForm } from './NewVehicleForm';
import { PlusIcon, PencilIcon, TrashIcon, WhatsappIcon } from './Icons';
import { useTranslation } from '../hooks/useTranslation';

interface EquipmentListProps {
  equipments: Equipment[];
  addEquipment: (equipment: Omit<Equipment, 'id'>) => Promise<Equipment | void>;
  deleteEquipment: (equipmentId: string) => void;
  updateEquipment: (equipment: Equipment) => Promise<void>;
}

export const EquipmentList: React.FC<EquipmentListProps> = ({ equipments, addEquipment, deleteEquipment, updateEquipment }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const { t } = useTranslation();

  const handleAddEquipment = async (equipment: Omit<Equipment, 'id'>) => {
    try {
      await addEquipment(equipment);
      handleCloseModal();
    } catch (error) {
      // Error is already alerted in the parent component
      console.error(error);
    }
  };
  
  const handleUpdateEquipment = async (updatedEquipment: Equipment) => {
    try {
      await updateEquipment(updatedEquipment);
      handleCloseModal();
    } catch (error) {
      console.error('Failed to update equipment:', error);
      alert(t('alert_equipmentUpdateFailed'));
    }
  };

  const handleEditClick = (equipment: Equipment) => {
    setEditingEquipment(equipment);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEquipment(null);
  };
  
  const handleShareEquipment = (equipment: Equipment) => {
    const details = [
      `*${t('equipmentDetails')}*`,
      `${t('type')}: ${t(equipment.equipmentType)}`,
      `${t('equipmentNumber')}: ${equipment.equipmentNumber}`,
      `${t('make')}: ${equipment.make}`,
      `${t('model')}: ${equipment.modelNumber}`,
      `${t('serialNumber')}: ${equipment.serialNumber}`,
      `${t('location')}: ${equipment.branchLocation}`
    ].join('\n');

    const encodedMessage = encodeURIComponent(details);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold text-gray-800">{t('equipmentList')}</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5 me-2" />
          {t('addNewEquipment')}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">{t('type')}</th>
              <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">{t('equipmentNumber')}</th>
              <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">{t('make')}</th>
              <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">{t('model')}</th>
              <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">{t('serialNumber')}</th>
              <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">{t('location')}</th>
              <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {equipments.length > 0 ? (
                equipments.map(equipment => (
                <tr key={equipment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t(equipment.equipmentType)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{equipment.equipmentNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{equipment.make}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{equipment.modelNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{equipment.serialNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{equipment.branchLocation}</td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                        <button onClick={() => handleEditClick(equipment)} className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-100 rounded-full" title={t('editEquipment')}>
                            <PencilIcon className="h-5 w-5"/>
                        </button>
                        <button onClick={() => handleShareEquipment(equipment)} className="p-2 text-green-600 hover:text-green-900 hover:bg-green-100 rounded-full" title={t('shareViaWhatsApp')}>
                            <WhatsappIcon className="h-5 w-5"/>
                        </button>
                        <button onClick={() => deleteEquipment(equipment.id)} className="p-2 text-red-600 hover:text-red-900 hover:bg-red-100 rounded-full" title={t('deleteEquipment')}>
                            <TrashIcon className="h-5 w-5"/>
                        </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
                <tr>
                    <td colSpan={7} className="text-center py-10 text-gray-500">{t('noEquipmentFound')}</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <NewEquipmentForm
          onClose={handleCloseModal}
          onAddEquipment={handleAddEquipment}
          onUpdateEquipment={handleUpdateEquipment}
          equipmentToEdit={editingEquipment}
        />
      )}
    </div>
  );
};
