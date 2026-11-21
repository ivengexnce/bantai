import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// In Android Emulator, 10.0.2.2 maps to host machine localhost.
// On physical devices, replace with your local WiFi IP address (e.g. 192.168.1.x:4000).
export const API_BASE = Platform.OS === 'android'
  ? 'http://10.0.2.2:4000/api'
  : 'http://localhost:4000/api';

export class MobileApi {
  static async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('bantai_token');
    } catch {
      return null;
    }
  }

  static async setToken(token: string | null): Promise<void> {
    try {
      if (token) await AsyncStorage.setItem('bantai_token', token);
      else await AsyncStorage.removeItem('bantai_token');
    } catch (err) {
      console.error('AsyncStorage error:', err);
    }
  }

  static async request(endpoint: string, options: RequestInit = {}) {
    const token = await this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || `HTTP error ${res.status}`);
    }
    return data.data;
  }
}
