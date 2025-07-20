// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView
    },
    {
      // La ruta para editar una encuesta existente
      path: '/survey/edit/:id',
      name: 'survey-edit',
      component: () => import('../views/SurveyEditorView.vue'),
      props: true // Pasa el :id como una prop al componente
    },
    {
      // La ruta para crear una nueva encuesta
      path: '/survey/new',
      name: 'survey-new',
      component: () => import('../views/SurveyEditorView.vue'),
      props: { id: undefined } // Asegurar que la prop 'id' sea undefined para la creación
    },
    {
      // La ruta pública para responder una encuesta
      path: '/survey/:id',
      name: 'survey-take',
      component: () => import('../views/SurveyTakerView.vue'),
      props: true,
      beforeEnter: (to, from, next) => {
        if (to.params.id === 'new') {
          next({ name: 'survey-new' });
        } else if (to.params.id === 'edit') {
          // Esto es un caso de borde, ya que /survey/edit/:id debería capturarlo.
          // Pero para mayor robustez, si por alguna razón llega aquí, redirigimos.
          next({ name: 'NotFound' }); // O a una página de error más específica
        } else {
          next();
        }
      }
    },
    {
      // La ruta para ver los resultados de una encuesta
      path: '/survey/results/:id',
      name: 'survey-results',
      component: () => import('../views/ResultsView.vue'),
      props: true
    },
    { 
      path: '/:pathMatch(.*)*', 
      name: 'NotFound',
      component: () => import('../views/NotFoundView.vue')
    }
  ]
})

export default router