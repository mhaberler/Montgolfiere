import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";
import TabsPage from "../views/TabsPage.vue";

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    redirect: "/tabs/tab1",
  },
  {
    path: "/tabs/",
    component: TabsPage,
    children: [
      {
        path: "",
        redirect: "/tabs/tab1",
      },
      {
        path: "tab1",
        component: () => import("@/views/Tab1Page.vue"),
      },
      {
        path: "map",
        component: () => import("@/views/MapPage.vue"),
      },
      {
        path: "tab2",
        redirect: "/tabs/settings",
      },
      {
        path: "settings",
        component: () => import("@/views/SettingsPage.vue"),
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
