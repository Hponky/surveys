// src/services/api.ts
import { useFetch, type UseFetchOptions } from '@vueuse/core'
import { ref } from 'vue';

interface QuestionData {
  text: string
  type: string
  options?: string[]
  required?: boolean
}

interface ResponseData {
  answers: Record<string, string | string[]>
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  questions: QuestionData[];
  responses: ResponseData[];
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

interface ApiFetchOptions extends UseFetchOptions {
  method?: HttpMethod
  body?: BodyInit | null
  headers?: HeadersInit
}

// ¡ACCIÓN CRÍTICA! Pega la URL base de tu API aquí
const API_BASE_URL = 'https://x8f8ptgn7j.execute-api.us-east-1.amazonaws.com';

// Este es un "factory" para crear una instancia pre-configurada de useFetch.
// Esto evita repetir la configuración en cada llamada.
const createApiFetch = <T>(endpoint: string, options: ApiFetchOptions = {}) => {
  const fullUrl = `${API_BASE_URL}${endpoint}`;
  
  return useFetch<T>(fullUrl, {
    async afterFetch(ctx) {
      if (!ctx.response.ok) {
        throw new Error(`HTTP error ${ctx.response.status}: ${ctx.response.statusText}`);
      }
      return ctx;
    },
    method: options.method || 'GET',
    body: options.body,
    headers: options.headers,
    ...options
  }).json<T>()
}

// --- Definimos nuestro composable principal para la API de Encuestas ---

export function useSurveyApi() {
  // OBTENER todas las encuestas (lo necesitaremos para el dashboard)
  // Nota: Aún no hemos creado este endpoint en el backend. Lo haremos después.
  const getAllSurveys = () => {
    // immediate: false significa que la petición no se lanzará hasta que llamemos al método .execute()
    return createApiFetch<Survey[]>(`/surveys`, { immediate: false });
  }

  // OBTENER una encuesta específica por su ID
  const getSurvey = (surveyId: string) => {
    // En este caso, la petición se lanza inmediatamente al llamar a getSurvey(id).
    return createApiFetch<Survey>(`/surveys/${surveyId}`);
  }

  interface SurveyData {
    title: string
    description: string
  }

  const createSurvey = (data: SurveyData) => {
    return createApiFetch<Survey>('/surveys', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
  
  const addQuestion = (surveyId: string, questionData: QuestionData) => {
    return createApiFetch<Survey>(`/surveys/${surveyId}/questions`, {
      method: 'POST',
      body: JSON.stringify(questionData),
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
  
  const submitResponse = (surveyId: string, responseData: ResponseData) => {
    return createApiFetch<any>(`/surveys/${surveyId}/responses`, { // Tipo 'any' temporalmente
      method: 'POST',
      body: JSON.stringify(responseData),
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  return { 
    getAllSurveys,
    getSurvey, 
    createSurvey, 
    addQuestion, 
    submitResponse 
  };
}