import { createRouter, createWebHashHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import Assets from '../views/Assets.vue'
import Characters from '../views/Characters.vue'
import Scenes from '../views/Scenes.vue'

const routes = [
  { path: '/', name: 'Dashboard', component: Dashboard },
  { path: '/assets', name: 'Assets', component: Assets },
  { path: '/characters', name: 'Characters', component: Characters },
  { path: '/scenes', name: 'Scenes', component: Scenes },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes
})
