import type { Equipment, Workshop, RepairRequest, User } from '../types';

const SCRIPT_URL = import.meta.env.VITE_SHEETDB_URL;

export const getAllData = async () => {
  const response = await fetch(`${SCRIPT_URL}?action=getAllData`);
  if (!response.ok) {
    throw new Error('Failed to fetch data from Google Sheet.');
  }
  const data = await response.json();
  return data;
};

const postData = async (action: string, payload: any, sheetName: string) => {
  const response = await fetch(SCRIPT_URL, {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, payload, sheetName }),
  });
  if (!response.ok) {
    throw new Error(`Failed to ${action} data in ${sheetName}.`);
  }
  return await response.json();
};

export const createRecord = (payload: any, sheetName: string) => postData('CREATE', payload, sheetName);
export const updateRecord = (payload: any, sheetName: string) => postData('UPDATE', payload, sheetName);
export const deleteRecord = (id: string, sheetName: string) => postData('DELETE', { id }, sheetName);
