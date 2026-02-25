export interface Equipment {
  id: string;
  equipmentType: string;
  equipmentNumber: string;
  make: string;
  modelNumber: string;
  serialNumber: string;
  branchLocation: string;
}

export interface Workshop {
  id: string;
  subName: string;
  foreman: string;
  mechanic?: string;
}

export interface Fault {
  id:string;
  description: string;
  workshopId: string;
  mechanicName?: string;
  workDone?: string;
  partsUsed?: { id: string; name: string; quantity: string }[];
}

export interface RepairRequest {
  id: string;
  equipmentId: string;
  driverName: string;
  mileage?: string;
  purpose: 'Repairing' | 'preparing for work' | 'General Checking' | 'Other';
  faults: Fault[];
  dateIn: string;
  timeIn: string;
  dateOut?: string;
  timeOut?: string;
  status: 'Pending' | 'Completed';
  workshopId?: string;
}

export interface User {
  id: string; // This will be the username
  password: string;
  role: 'admin' | 'user';
  status: 'pending' | 'active';
}

export interface Settings {
  jobCardStartNumber?: number;
}