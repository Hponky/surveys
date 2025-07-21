// src/services/api.ts
import { useFetch, type UseFetchOptions, type UseFetchReturn } from '@vueuse/core'
import { ref, computed, unref, type Ref, type ComputedRef } from 'vue';
import type { UnwrapRef } from '@vue/reactivity';

export interface Question {
  questionId: string;
  text: string;
  type: 'MULTIPLE_CHOICE' | 'OPEN_TEXT';
  options?: string[];
  required?: boolean;
}

export interface QuestionPayload {
  text: string;
  type: 'MULTIPLE_CHOICE' | 'OPEN_TEXT';
  options?: string[];
  required?: boolean;
}

export interface ResponseData {
  answers: Record<string, string | string[]>
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  responses: ResponseData[];
  createdAt: string; // Añadido para el dashboard
  status: 'CREATED' | 'PUBLISHED' | 'CLOSED'; // Añadido para el dashboard
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export interface ApiFetchOptions extends UseFetchOptions {
  body?: (() => BodyInit | null | undefined) | BodyInit | null | undefined;
  headers?: HeadersInit;
}

interface ResponseContext {
  response: Response;
}

export interface ApiFetchExtension {
  options: {
    headers?: HeadersInit;
  };
  responseHeaders: Ref<Headers | undefined>;
  onResponse: (handler: (ctx: ResponseContext) => void) => void;
}

export type EnhancedUseFetchReturn<T> = UseFetchReturn<T> & ApiFetchExtension;

export const API_BASE_URL = 'https://x8f8ptgn7j.execute-api.us-east-1.amazonaws.com';

// Factory para crear instancias pre-configuradas de useFetch
const createApiFetch = <T>(
  endpoint: string | Ref<string> | ComputedRef<string>,
  method: HttpMethod,
  options: Omit<ApiFetchOptions, 'method'> = {}
): EnhancedUseFetchReturn<T> => {
  const url = computed(() => `${API_BASE_URL}${unref(endpoint)}`);

  const fetchOptions: UseFetchOptions = {
    async afterFetch(ctx) {
      console.debug('[API] Request details:', {
        url: ctx.response.url,
        status: ctx.response.status,
        method,
        headers: options.headers,
        body: typeof options.body === 'function' ? options.body() : options.body
      });

      if (!ctx.response.ok) {
        const errorData = await ctx.response.json().catch(() => ({}));
        throw new Error(
          JSON.stringify({
            status: ctx.response.status,
            statusText: ctx.response.statusText,
            url: ctx.response.url,
            ...(errorData.message ? { message: errorData.message } : {}),
            ...(errorData.errors ? { errors: errorData.errors } : {})
          })
        );
      }
      return ctx;
    },
    body: typeof options.body === 'function' ? options.body() : options.body,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options,
  };

  let fetchInstance: UseFetchReturn<T>;

  switch (method) {
    case 'POST': fetchInstance = useFetch<T>(url, fetchOptions).post(); break;
    case 'PUT': fetchInstance = useFetch<T>(url, fetchOptions).put(); break;
    case 'DELETE': fetchInstance = useFetch<T>(url, fetchOptions).delete(); break;
    case 'PATCH': fetchInstance = useFetch<T>(url, fetchOptions).patch(); break;
    case 'GET':
    default: fetchInstance = useFetch<T>(url, fetchOptions).get(); break;
  }

  const extension: ApiFetchExtension = {
    options: {
      headers: options.headers
    },
    responseHeaders: ref<Headers>(),
    onResponse: (handler) => {
      fetchInstance.onFetchResponse((response) => {
        extension.responseHeaders.value = response.headers;
        handler({ response });
      });
    }
  };

  return Object.assign(fetchInstance.json<T>(), extension);
}

// Única implementación de useSurveyApi
export function useSurveyApi() {
  // Obtener todas las encuestas (para dashboard)
  const getAllSurveys = () => {
    return createApiFetch<Survey[]>(`/surveys`, 'GET', { immediate: false });
  }

  // Obtener encuesta específica por ID
  const getSurvey = (surveyId: Ref<string> | ComputedRef<string>) => {
    return createApiFetch<Survey>(computed(() => `/surveys/${unref(surveyId)}`), 'GET', { immediate: false });
  }

  interface SurveyData {
    title: string
    description: string
  }

  const createSurvey = (surveyData: Ref<SurveyData | null>) => {
    return createApiFetch<Survey>('/surveys', 'POST', {
      headers: {
        'Content-Type': 'application/json'
      },
      body: () => (surveyData.value ? JSON.stringify(surveyData.value) : null),
      immediate: false
    });
  }

  const addQuestion = (surveyId: Ref<string> | ComputedRef<string>, questionData: QuestionPayload) => {
    return createApiFetch<Question>(computed(() => `/surveys/${unref(surveyId)}/questions`), 'POST', {
      body: JSON.stringify(questionData),
      headers: {
        'Content-Type': 'application/json'
      },
      immediate: false
    })
  }

  const submitResponse = (surveyId: string, responseData: ResponseData) => {
    return createApiFetch<any>(`/surveys/${surveyId}/responses`, 'POST', {
      body: JSON.stringify(responseData),
      headers: {
        'Content-Type': 'application/json'
      },
      immediate: false
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