import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import type { Equipment, Workshop, RepairRequest, User, Settings } from '../types';
import { getAllData, createRecord, updateRecord, deleteRecord } from '../services/googleSheetService';

interface DataContextType {
  equipments: Equipment[];
  workshops: Workshop[];
  repairRequests: RepairRequest[];
  users: User[];
  settings: Settings | null;
  loading: boolean;
  error: Error | null;
  refetchData: () => Promise<void>;
  createData: (sheetName: string, payload: any) => Promise<any>;
  updateData: (sheetName: string, payload: any) => Promise<any>;
  deleteData: (sheetName: string, id: string) => Promise<any>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [repairRequests, setRepairRequests] = useState<RepairRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllData();
      setEquipments(data.equipments || []);
      setWorkshops(data.workshops || []);
      const parsedRequests = (data.repairRequests || []).map((req: RepairRequest) => {
          try {
            const faults = typeof req.faults === 'string' ? JSON.parse(req.faults) : (req.faults || []);
            return { ...req, faults };
          } catch (e) {
            console.error(`Failed to parse faults for request ${req.id}:`, req.faults);
            return { ...req, faults: [] }; 
          }
        });
      setRepairRequests(parsedRequests);
      setUsers(data.users || []);
      setSettings(data.settings || null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch data'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createData = async (sheetName: string, payload: any) => {
    const result = await createRecord(payload, sheetName);
    await fetchData(); // Refetch all data to stay in sync
    return result;
  };

  const updateData = async (sheetName: string, payload: any) => {
    const result = await updateRecord(payload, sheetName);
    await fetchData();
    return result;
  };

  const deleteData = async (sheetName: string, id: string) => {
    const result = await deleteRecord(id, sheetName);
    await fetchData();
    return result;
  };

  const value = {
    equipments,
    workshops,
    repairRequests,
    users,
    settings,
    loading,
    error,
    refetchData: fetchData,
    createData,
    updateData,
    deleteData,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
