import { api } from './api';

export async function testAPI() {
  try {
    const response = await api.get('/');
    console.log('API Test Success:', response.status);
    return true;
  } catch (error) {
    console.log('API Test Failed:', error.message);
    return false;
  }
}