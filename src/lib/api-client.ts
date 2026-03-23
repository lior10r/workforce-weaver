// API Client for workforce backend
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface ApiError {
  error: string;
  message?: string;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage on init
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken() {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // For cookies
    });

    // Handle 401 - unauthorized
    if (response.status === 401) {
      this.setToken(null);
      // Dispatch event for auth context to handle
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      throw new Error('Session expired. Please log in again.');
    }

    const data = await response.json();

    if (!response.ok) {
      const error = data as ApiError;
      throw new Error(error.error || error.message || 'API request failed');
    }

    return data as T;
  }

  // Auth endpoints
  async login(username: string, password: string) {
    const data = await this.request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
  }

  async getCurrentUser() {
    return this.request<{ user: User; linkedEmployee: Employee | null }>('/auth/me');
  }

  async register(userData: { username: string; password: string; name: string; role?: string; employeeId?: number }) {
    return this.request<{ user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getUsers() {
    return this.request<User[]>('/auth/users');
  }

  async updateUser(id: string, userData: Partial<User & { password?: string }>) {
    return this.request<{ user: User }>(`/auth/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id: string) {
    return this.request<{ message: string }>(`/auth/users/${id}`, {
      method: 'DELETE',
    });
  }

  // Workforce data endpoints
  async getEmployees() {
    return this.request<Employee[]>('/employees');
  }

  async createEmployee(employee: Omit<Employee, 'id'> & { id?: number }) {
    return this.request<Employee>('/employees', {
      method: 'POST',
      body: JSON.stringify(employee),
    });
  }

  async updateEmployee(id: number, employee: Partial<Employee>) {
    return this.request<Employee>(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(employee),
    });
  }

  async deleteEmployee(id: number) {
    return this.request<{ message: string }>(`/employees/${id}`, {
      method: 'DELETE',
    });
  }

  async bulkUpdateEmployees(employees: Employee[]) {
    return this.request<{ message: string; count: number }>('/employees/bulk', {
      method: 'POST',
      body: JSON.stringify({ employees }),
    });
  }

  // Events
  async getEvents() {
    return this.request<WorkforceEvent[]>('/events');
  }

  async createEvent(event: Omit<WorkforceEvent, 'id'> & { id?: number }) {
    return this.request<WorkforceEvent>('/events', {
      method: 'POST',
      body: JSON.stringify(event),
    });
  }

  async updateEvent(id: number, event: Partial<WorkforceEvent>) {
    return this.request<WorkforceEvent>(`/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(event),
    });
  }

  async deleteEvent(id: number) {
    return this.request<{ message: string }>(`/events/${id}`, {
      method: 'DELETE',
    });
  }

  async bulkUpdateEvents(events: WorkforceEvent[]) {
    return this.request<{ message: string; count: number }>('/events/bulk', {
      method: 'POST',
      body: JSON.stringify({ events }),
    });
  }

  // Hierarchy
  async getHierarchy() {
    return this.request<HierarchyStructure>('/hierarchy');
  }

  async updateHierarchy(hierarchy: HierarchyStructure) {
    return this.request<{ message: string }>('/hierarchy', {
      method: 'PUT',
      body: JSON.stringify({ hierarchy }),
    });
  }

  // Team structures
  async getTeamStructures() {
    return this.request<TeamStructure[]>('/team-structures');
  }

  async updateTeamStructures(teamStructures: TeamStructure[]) {
    return this.request<{ message: string }>('/team-structures', {
      method: 'PUT',
      body: JSON.stringify({ teamStructures }),
    });
  }

  // Scenarios
  async getScenarios() {
    return this.request<Scenario[]>('/scenarios');
  }

  async updateScenarios(scenarios: Scenario[]) {
    return this.request<{ message: string }>('/scenarios', {
      method: 'PUT',
      body: JSON.stringify({ scenarios }),
    });
  }

  // Bulk data operations
  async getAllData() {
    return this.request<{
      employees: Employee[];
      events: WorkforceEvent[];
      hierarchy: HierarchyStructure;
      teamStructures: TeamStructure[];
      scenarios: Scenario[];
    }>('/data');
  }

  async updateAllData(data: {
    employees?: Employee[];
    events?: WorkforceEvent[];
    hierarchy?: HierarchyStructure;
    teamStructures?: TeamStructure[];
    scenarios?: Scenario[];
  }) {
    return this.request<{ message: string }>('/data', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Health check
  async healthCheck() {
    return this.request<{ status: string; timestamp: string }>('/health');
  }

  // Labels
  async getLabels() {
    return this.request<Label[]>('/labels');
  }

  async createLabel(data: { name: string; color?: string }) {
    return this.request<Label>('/labels', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteLabel(id: number) {
    return this.request<{ message: string }>(`/labels/${id}`, {
      method: 'DELETE',
    });
  }

  // Employee Notes
  async getEmployeeNotes(employeeId: number) {
    return this.request<EmployeeNote[]>(`/employees/${employeeId}/notes`);
  }

  async createEmployeeNote(employeeId: number, content: string) {
    return this.request<EmployeeNote>(`/employees/${employeeId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async updateNote(noteId: number, content: string) {
    return this.request<EmployeeNote>(`/notes/${noteId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  }

  async deleteNote(noteId: number) {
    return this.request<{ message: string }>(`/notes/${noteId}`, {
      method: 'DELETE',
    });
  }
}

// Types (re-export from workforce-data for convenience)
import type { 
  Employee, 
  WorkforceEvent, 
  TeamStructure, 
  Scenario,
  HierarchyStructure,
  Label
} from './workforce-data';

export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'manager' | 'viewer';
  employeeId: number | null;
  createdAt: string;
}

// Export singleton instance
export const apiClient = new ApiClient();

export type { Employee, WorkforceEvent, TeamStructure, Scenario, HierarchyStructure, Label };
